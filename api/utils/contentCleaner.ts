import { DOMSanitizer } from './DOMSanitizer.js';
import TurndownService from 'turndown';

export class ContentCleaner {
    // Configure Turndown to keep the structure LLMs like
    private static turndownService = new TurndownService({
        headingStyle: 'atx', // Use # for headings
        codeBlockStyle: 'fenced', // Use ``` for code
        hr: '---',
        bulletListMarker: '-'
    });

    static {
        // Custom Rule: Remove images that are likely tracking pixels or spacers
        this.turndownService.addRule('remove-irrelevant-images', {
            filter: 'img',
            replacement: function (content, node) {
                const alt = (node as HTMLElement).getAttribute('alt') || '';
                const src = (node as HTMLElement).getAttribute('src') || '';
                // Keep if it has alt text or looks like a real content image
                if (alt.length > 5 || src.includes('article') || src.includes('upload')) {
                    return `![${alt}](${src})`;
                }
                return ''; // Drop empty/tiny images
            }
        });

        // Custom Rule: Remove code blocks entirely (they pollute LLM analysis)
        this.turndownService.addRule('remove-code-blocks', {
            filter: ['pre', 'code'],
            replacement: function () {
                return ''; // Drop all code content
            }
        });

        // Custom Rule: Remove script/style that might have survived
        this.turndownService.addRule('remove-scripts', {
            filter: ['script', 'style', 'noscript'],
            replacement: function () {
                return '';
            }
        });
    }

    static cleanEmailBody(text: string): string {
        return this.cleanContent(text);
    }

    /**
     * The Main Pipeline: Raw HTML -> Clean HTML -> Markdown -> Clean Text
     */
    static cleanContent(rawHtml: string): string {
        if (!rawHtml) return "";

        console.log(`[ContentCleaner] Input Start: ${rawHtml.substring(0, 100).replace(/\n/g, '\\n')}`);

        // 1. JSDOM & Readability (The heavy lifting)
        // Returns clean HTML (<p>Text</p>)
        const cleanHtml = DOMSanitizer.sanitizeHtml(rawHtml);

        // 2. Convert HTML to Markdown
        // This preserves Links [Text](url) and Headings (# Title)
        let markdown = this.turndownService.turndown(cleanHtml);

        // 3. Post-Processing (Text cleanup)
        const polished = this.polishMarkdown(markdown);

        // 4. Sanitize LLM Special Tokens (prevent prompt injection)
        return this.sanitizeLLMTokens(polished);
    }

    /**
     * Sanitize LLM special tokens to prevent prompt injection attacks
     */
    private static sanitizeLLMTokens(text: string): string {
        // OpenAI/GPT tokens
        text = text.replace(/<\|/g, '< |');
        text = text.replace(/\|>/g, '| >');

        // Llama/Mistral tokens
        text = text.replace(/\[INST\]/gi, '[ INST ]');
        text = text.replace(/\[\/INST\]/gi, '[ /INST ]');
        text = text.replace(/<<SYS>>/gi, '<< SYS >>');
        text = text.replace(/<<\/SYS>>/gi, '<< /SYS >>');

        // Claude tokens
        text = text.replace(/Human:/gi, 'Human :');
        text = text.replace(/Assistant:/gi, 'Assistant :');

        // Generic instruction markers
        text = text.replace(/###\s*(Instruction|System|User|Assistant)/gi, '### $1');

        return text;
    }

    /**
     * Removes noise from the Markdown text (Footers, excessive newlines, machine code, etc.)
     * This uses your existing logic, but simplified since HTML tags are already gone.
     */
    private static polishMarkdown(text: string): string {
        // 0. Pre-clean: Remove obvious machine code patterns before line processing
        text = this.stripMachineCode(text);

        // 1. Remove excessive newlines
        text = text.replace(/\n{3,}/g, '\n\n');

        // 2. Remove "link rot" (Links with no text)
        text = text.replace(/\[\s*\]\(.*?\)/g, '');

        // 3. Split into lines for Footer/Noise detection
        const lines = text.split('\n');
        const cleanedLines: string[] = [];

        // Re-use your existing Noise Patterns (truncated for brevity - keep your full list!)
        const noisePatterns = [
            /view in browser/i, /unsubscribe/i, /privacy policy/i,
            /©\s*\d{4}/i, /all rights reserved/i
        ];

        let linkStreak = 0;

        for (let line of lines) {
            let trimmed = line.trim();
            if (!trimmed) {
                cleanedLines.push("");
                continue;
            }

            // Skip lines that look like machine code / gibberish
            if (this.isMachineCodeLine(trimmed)) {
                continue;
            }

            // Check for noise lines
            let isNoise = false;
            // Only check short lines for noise patterns to avoid false positives in body text
            if (trimmed.length < 150) {
                for (const pattern of noisePatterns) {
                    if (pattern.test(trimmed)) {
                        isNoise = true;
                        break;
                    }
                }
            }
            if (isNoise) continue;

            // Heuristic: If we see 5+ lines in a row that are JUST links, it's likely a footer nav
            const isLink = /^\[.*\]\(.*\)$/.test(trimmed) || /^[*\-•]\s*\[.*\]\(.*\)$/.test(trimmed);
            if (isLink) {
                linkStreak++;
            } else {
                linkStreak = 0;
            }

            // If we are deep in a link streak (footer), stop adding them
            if (linkStreak > 5) continue;

            cleanedLines.push(line);
        }

        return cleanedLines.join('\n').trim();
    }

    /**
     * Detect if a line looks like machine code / minified JS / CSS / gibberish.
     * This is the LINE-LEVEL filter for anything that survived the bulk regex sweep.
     */
    private static isMachineCodeLine(line: string): boolean {
        // Skip very short lines (could be legitimate single words)
        if (line.length < 15) return false;

        // ============================================================
        // HIGH CONFIDENCE: These patterns are ALWAYS machine code
        // ============================================================

        // CSS selectors with properties
        if (/^[#.][a-zA-Z_][\w-]*\s*\{/.test(line)) return true;
        if (/@media\s*[\[(]/.test(line)) return true;
        if (/@keyframes\s/.test(line)) return true;
        if (/@font-face/.test(line)) return true;

        // CSS property patterns (3+ properties in a line)
        if ((line.match(/[a-z-]+:\s*[^;]+;/g) || []).length >= 2) return true;

        // JSON object/array starts
        if (/^\s*\{"[a-zA-Z]/.test(line)) return true;
        if (/^\s*\[\{"/.test(line)) return true;
        if (/"[a-zA-Z_]+"\s*:\s*[\[{"]/.test(line) && line.includes(',')) return true;

        // JavaScript patterns
        if (/\bfunction\s*\w*\s*\(/.test(line)) return true;
        if (/=>\s*\{/.test(line)) return true;
        if (/\b(var|let|const)\s+\w+\s*=/.test(line)) return true;
        if (/\bmodule\.exports\b|\brequire\s*\(|\bimport\s+.*\s+from\b/i.test(line)) return true;
        if (/__webpack_|__esModule|__NEXT_|__NUXT_/i.test(line)) return true;

        // ============================================================
        // HEURISTIC: Statistical detection of code-like content
        // ============================================================

        // High density of special characters (typical of minified code)
        const specialChars = (line.match(/[{}();=<>[\]$&|!?:,]/g) || []).length;
        const specialRatio = specialChars / line.length;
        if (specialRatio > 0.12 && line.length > 40) return true;

        // Low word count relative to length (code has few spaces)
        const words = line.split(/\s+/).filter(w => w.length > 0);
        const avgWordLength = line.length / Math.max(words.length, 1);
        if (avgWordLength > 25 && line.length > 50) return true;

        // Very long lines without natural sentence structure
        if (line.length > 100 && words.length < 5) return true;

        // Camel/snake case variable patterns (multiple in one line)
        if ((line.match(/[a-z][A-Z]|_[a-z]/g) || []).length > 5) return true;

        // ============================================================
        // SPECIFIC PATTERN DETECTION
        // ============================================================

        // Base64 encoded data
        if (/[A-Za-z0-9+/]{40,}={0,2}/.test(line) && !/ /.test(line.replace(/[A-Za-z0-9+/=]/g, ''))) return true;

        // Hex strings (hashes, encoded data)
        if (/[0-9a-f]{24,}/i.test(line) && !/http/i.test(line)) return true;

        // Multiple hex color codes
        if ((line.match(/#[0-9a-f]{3,8}\b/gi) || []).length > 2) return true;

        // URL-encoded content
        if ((line.match(/%[0-9a-f]{2}/gi) || []).length > 3) return true;

        // Looks like a path or selector chain
        if (/^[.#]?[\w-]+([.#>+~\s]+[\w-]+){3,}/.test(line)) return true;

        // Repeated bracket patterns (common in serialized data)
        if ((line.match(/[\[\]{}]/g) || []).length > 6) return true;

        return false;
    }

    /**
     * Strip obvious machine code blocks from the text before line processing.
     * This is the FINAL REGEX SWEEP - catches SPA data dumps that survive DOM parsing.
     */
    private static stripMachineCode(text: string): string {
        // ============================================================
        // PHASE 1: JSON/State Dumps (GitHub, Next.js, React hydration)
        // ============================================================

        // Large JSON objects (50+ chars) - these are always app state, never content
        text = text.replace(/\{[^{}]{50,}\}/g, '');

        // JSON arrays with objects inside
        text = text.replace(/\[[^\[\]]*\{[^{}]*\}[^\[\]]*\]/g, '');

        // Specific SPA state patterns (GitHub, Next.js, Nuxt, etc.)
        text = text.replace(/\{"locale":[^}]+\}/g, '');
        text = text.replace(/\{"featureFlags":[^}]+\}/g, '');
        text = text.replace(/\{"props":[^}]+\}/g, '');
        text = text.replace(/\{"pageProps":[^}]+\}/g, '');
        text = text.replace(/\{"query":[^}]+\}/g, '');
        text = text.replace(/\{"buildId":[^}]+\}/g, '');
        text = text.replace(/__NEXT_DATA__[^<]*/gi, '');
        text = text.replace(/__NUXT__[^<]*/gi, '');
        text = text.replace(/window\.__[A-Z_]+__\s*=\s*[^;]+;?/gi, '');

        // React/hydration state
        text = text.replace(/\{"type":\s*"[^"]+",\s*"props":[^}]+\}/g, '');
        text = text.replace(/data-reactroot[^>]*/gi, '');

        // ============================================================
        // PHASE 2: CSS Rules (Twitter, SPA inline styles)
        // ============================================================

        // CSS selectors with rules: #id {...}, .class {...}, element {...}
        text = text.replace(/#[a-zA-Z_][\w-]*\s*\{[^}]*\}/g, '');
        text = text.replace(/\.[a-zA-Z_][\w-]*\s*\{[^}]*\}/g, '');
        text = text.replace(/[a-z]+\s*\{[^}]*:[^}]*\}/gi, '');

        // @media queries (can be multi-line)
        text = text.replace(/@media[^{]*\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/gi, '');

        // @keyframes animations
        text = text.replace(/@keyframes[^{]*\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/gi, '');

        // @font-face rules
        text = text.replace(/@font-face\s*\{[^}]*\}/gi, '');

        // @import and @charset
        text = text.replace(/@import\s+[^;]+;/gi, '');
        text = text.replace(/@charset\s+[^;]+;/gi, '');

        // CSS custom properties (--var-name: value)
        text = text.replace(/--[\w-]+:\s*[^;]+;/g, '');

        // Inline CSS property dumps (color: #fff; margin: 0; ...)
        text = text.replace(/([a-z-]+:\s*[^;]+;\s*){3,}/gi, '');

        // CSS !important declarations
        text = text.replace(/[a-z-]+:\s*[^;]*!important[^;]*;/gi, '');

        // ============================================================
        // PHASE 3: JavaScript Artifacts
        // ============================================================

        // Function calls and declarations
        text = text.replace(/function\s*\w*\s*\([^)]*\)\s*\{[^}]*\}/g, '');
        text = text.replace(/\([^)]*\)\s*=>\s*\{[^}]*\}/g, '');
        text = text.replace(/\w+\s*\([^)]*\)\s*\{[^}]*\}/g, '');

        // Variable declarations
        text = text.replace(/(var|let|const)\s+\w+\s*=\s*[^;]+;/g, '');

        // Module patterns
        text = text.replace(/module\.exports\s*=\s*[^;]+;?/gi, '');
        text = text.replace(/exports\.\w+\s*=\s*[^;]+;?/gi, '');
        text = text.replace(/require\s*\([^)]+\)/gi, '');
        text = text.replace(/import\s+.*\s+from\s+['"][^'"]+['"]/gi, '');

        // Webpack/bundler artifacts
        text = text.replace(/__webpack_\w+__/gi, '');
        text = text.replace(/__esModule/gi, '');
        text = text.replace(/webpackChunk\w*/gi, '');

        // ============================================================
        // PHASE 4: Data URIs and Binary
        // ============================================================

        // Base64 data URIs
        text = text.replace(/data:[a-z]+\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/gi, '');

        // Long hex strings (often hashes or encoded data)
        text = text.replace(/[0-9a-f]{32,}/gi, '');

        // SVG path data
        text = text.replace(/d="M[0-9\s,.-]+"/gi, '');
        text = text.replace(/d='M[0-9\s,.-]+'/gi, '');

        // ============================================================
        // PHASE 5: Framework-Specific Noise
        // ============================================================

        // Tailwind/CSS class chains (3+ classes in a row)
        text = text.replace(/\b(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky)(\s+(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|items-|justify-|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-|w-|h-|min-|max-|text-|bg-|border-|rounded-|shadow-|opacity-|z-|gap-|space-)[a-z0-9-]*){2,}/gi, '');

        // Comments (JS and CSS)
        text = text.replace(/\/\*[\s\S]*?\*\//g, '');
        text = text.replace(/\/\/[^\n]*/g, '');

        // HTML entities that shouldn't be in clean text
        text = text.replace(/&[a-z]+;/gi, ' ');
        text = text.replace(/&#\d+;/g, ' ');

        // ============================================================
        // PHASE 6: Final Cleanup
        // ============================================================

        // Multiple spaces/newlines created by removals
        text = text.replace(/[ \t]{2,}/g, ' ');
        text = text.replace(/\n{3,}/g, '\n\n');

        // Lines that are now just punctuation or whitespace
        text = text.replace(/^\s*[{}()[\];,]+\s*$/gm, '');

        return text;
    }

    static isGatedContent(text: string): boolean {
        const gatedPatterns = [
            /subscribe to read/i,
            /log in to continue/i,
            /create an account to read/i,
            /you have reached your limit/i,
            /available to subscribers only/i
        ];
        return gatedPatterns.some(pattern => pattern.test(text));
    }
}
