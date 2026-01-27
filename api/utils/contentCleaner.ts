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
        return this.polishMarkdown(markdown);
    }

    /**
     * Removes noise from the Markdown text (Footers, excessive newlines, etc.)
     * This uses your existing logic, but simplified since HTML tags are already gone.
     */
    private static polishMarkdown(text: string): string {
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
