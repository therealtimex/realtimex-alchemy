export class ContentCleaner {
    /**
     * Cleans email body by removing noise, quoted replies, and footers.
     * optimized for LLM processing.
     */
    static cleanEmailBody(text: string): string {
        return this.cleanContent(text);
    }

    /**
     * Detect if content is a login wall, paywall, or gated content
     * Returns true if the page appears to be blocking actual content
     */
    static isGatedContent(text: string): boolean {
        if (!text) return false;
        const lower = text.toLowerCase();

        // Login wall indicators
        const loginPatterns = [
            /you must log in/i,
            /please (log|sign) in/i,
            /login to continue/i,
            /sign in to (continue|view|access)/i,
            /create an account/i,
            /log into facebook/i,
            /log into twitter/i,
            /sign in with (google|apple|facebook)/i,
        ];

        // Paywall indicators
        const paywallPatterns = [
            /subscribe to (read|continue|access)/i,
            /this (article|content) is for (subscribers|members)/i,
            /become a (member|subscriber)/i,
            /unlock this (article|story)/i,
            /you('ve| have) reached your (free )?article limit/i,
            /premium content/i,
        ];

        const allPatterns = [...loginPatterns, ...paywallPatterns];
        let matchCount = 0;

        for (const pattern of allPatterns) {
            if (pattern.test(text)) {
                matchCount++;
                if (matchCount >= 2) return true; // Multiple indicators = high confidence
            }
        }

        // Also check for very short content with login-related words
        const wordCount = text.split(/\s+/).length;
        if (wordCount < 100 && matchCount >= 1) {
            return true;
        }

        return false;
    }

    /**
     * General purpose content cleaner optimized for LLM context.
     * Strips HTML, JS, CSS, and boilerplate noise.
     */
    static cleanContent(text: string): string {
        if (!text) return "";
        const originalText = text;

        // 1. Aggressive Tag & Block Removal (Pre-processing)
        // This handles cases where raw HTML or semi-processed text leaked through
        text = this.sanitizeHtml(text);

        // 2. Detect if content is actually HTML (for remaining tags)
        const isHtml = /<[a-z][\s\S]*>/i.test(text);

        if (isHtml) {
            // ... (rest of HTML handling remains similar but safer now)
            text = text.replace(/<br\s*\/?>/gi, '\n');
            text = text.replace(/<\/p>/gi, '\n\n');
            text = text.replace(/<p.*?>/gi, '');
            text = text.replace(/<h[1-6].*?>(.*?)<\/h[1-6]>/gsi, (match, p1) => `\n# ${p1}\n`);
            text = text.replace(/<li.*?>(.*?)<\/li>/gsi, (match, p1) => `\n- ${p1}`);
            text = text.replace(/<ul.*?>/gi, '');
            text = text.replace(/<\/ul>/gi, '\n');
            text = text.replace(/<a\s+(?:[^>]*?\s+)?href=\"([^\"]*)\"[^>]*>(.*?)<\/a>/gsi, (match, href, content) => `[${content}](${href})`);
            text = text.replace(/<img\s+(?:[^>]*?\s+)?src=\"([^\"]*)\"(?:[^>]*?\s+)?alt=\"([^\"]*)\"[^>]*>/gsi, (match, src, alt) => `![${alt}](${src})`);
            text = text.replace(/<[^>]+>/g, ' '); // Final Strip
        }

        // Entity decoding
        text = text.replace(/&nbsp;/gi, ' ');
        text = text.replace(/&amp;/gi, '&');
        text = text.replace(/&lt;/gi, '<');
        text = text.replace(/&gt;/gi, '>');
        text = text.replace(/&quot;/gi, '"');
        text = text.replace(/&#39;/gi, "'");

        // 3. Aggressive JS/CSS Block Removal (Token Bloat Fix)
        // Strip large JS objects like window.WIZ_global_data, JSON blocks, etc.
        const jsGlobalPatterns = [
            /(?:window\.)?WIZ_global_data\s*=\s*\{[\s\S]*?\};?/gi,
            /(?:window\.)?__INITIAL_STATE__\s*=\s*\{[\s\S]*?\};?/gi,
            /(?:window\.)?__NEXT_DATA__\s*=\s*\{[\s\S]*?\};?/gi,
            /(?:window\.)?__NUXT__\s*=\s*\{[\s\S]*?\};?/gi,
            /(?:window\.)?__PRELOADED_STATE__\s*=\s*\{[\s\S]*?\};?/gi,
            /(?:window\.)?_N_E\s*=\s*\{[\s\S]*?\};?/gi,
            /(?:window\.)?dataLayer\s*=\s*\[[\s\S]*?\];?/gi,
            /(?:window\.)?gtag\s*\([\s\S]*?\);?/gi,
        ];
        for (const pattern of jsGlobalPatterns) {
            text = text.replace(pattern, '');
        }

        // Strip any remaining large script-like or CSS-like blocks that might have escaped tags
        const cssProperties = [
            'background-color', 'background-image', 'font-family', 'font-size',
            'margin', 'margin-top', 'margin-bottom', 'padding', 'padding-top',
            'display', 'flex', 'grid', 'color', 'width', 'height', 'max-width',
            'position', 'opacity', 'border', 'border-radius', 'z-index',
            'transition', 'transform', 'overflow', 'cursor', 'visibility',
            'float', 'clear', 'box-shadow', 'text-align', 'line-height'
        ].join('|');
        text = text.replace(new RegExp(`\\{[^{}]*(?:${cssProperties})[^{}]*\\}`, 'gi'), '');

        // Remove minified JS-looking garbage (long strings of mixed alphanumeric/symbols with few spaces)
        text = text.replace(/[^\s]{100,}/g, ' ');

        const lines = text.split('\n');
        const cleanedLines: string[] = [];

        // Patterns that usually mark the START of a reply chain or a generic footer
        const truncationPatterns = [
            /^On .* wrote:$/i,
            /^From: .* <.*>$/i,
            /^-----Original Message-----$/i,
            /^________________________________$/i,
            /^Sent from my iPhone$/i,
            /^Sent from my Android$/i,
            /^Get Outlook for/i,
            /^--$/ // Standard signature separator
        ];

        // Patterns for lines that should be stripped but NOT truncate the whole email
        const noisePatterns = [
            /view in browser/i,
            /click here to view/i,
            /legal notice/i,
            /all rights reserved/i,
            /privacy policy/i,
            /privacy center/i,
            /terms of service/i,
            /terms and conditions/i,
            /cookie policy/i,
            /cookies policy/i,
            /unsubscribe/i,
            /©\s*\d{4}/i,                           // Copyright notices
            /meta\s*©/i,                            // Meta © 2026
            /\(c\)\s*\d{4}/i,                       // (c) 2024
            /^[*\-•]\s*\[.*\]\(.*\)$/,              // Bullet point that's just a link: * [Text](url)
            /ad choices/i,
            /advertise with us/i,
            /careers/i,
            /developers/i,
            /help center/i,
            /contact us/i,
            /about us/i,
            /sign up for facebook/i,
            /log into facebook/i,
            /create page/i,
        ];

        // Language selector patterns (lines that are just language names with links)
        const languagePatterns = [
            /^\[?(español|français|deutsch|italiano|português|中文|日本語|한국어|العربية|हिन्दी|русский)\]?\s*$/i,
            /^\*\s*\[?(english|spanish|french|german|chinese|japanese|korean|arabic)\]?(\s*\(.*\))?\s*$/i,
        ];

        for (let line of lines) {
            let lineStripped = line.trim();
            if (!lineStripped) {
                cleanedLines.push("");
                continue;
            }

            // 2. Quoted text removal (lines starting with >)
            if (lineStripped.startsWith('>')) {
                continue;
            }

            // 3. Truncation check: If we hit a reply header, we stop entirely
            let shouldTruncate = false;
            for (const pattern of truncationPatterns) {
                if (pattern.test(lineStripped)) {
                    shouldTruncate = true;
                    break;
                }
            }
            if (shouldTruncate) break;

            // 4. Noise check: Strip boilerplate lines
            let isNoise = false;
            if (lineStripped.length < 150) {
                // Check standard noise patterns
                for (const pattern of noisePatterns) {
                    if (pattern.test(lineStripped)) {
                        isNoise = true;
                        break;
                    }
                }

                // Check language selector patterns
                if (!isNoise) {
                    for (const pattern of languagePatterns) {
                        if (pattern.test(lineStripped)) {
                            isNoise = true;
                            break;
                        }
                    }
                }

                // Check if line is just a markdown link with short text (footer link)
                // Pattern: [Short Text](url) or * [Short Text](url)
                if (!isNoise && /^[*\-•]?\s*\[.{1,30}\]\([^)]+\)\s*$/.test(lineStripped)) {
                    isNoise = true;
                }

                // Check if line is just a bare link text in a list (like "Meta Pay", "Developers")
                // These are common in footer navigation
                if (!isNoise && /^[*\-•]\s*.{1,25}$/.test(lineStripped)) {
                    const footerLinkKeywords = [
                        'meta pay', 'meta store', 'meta quest', 'meta ai', 'ray-ban',
                        'messenger', 'instagram', 'threads', 'whatsapp', 'facebook lite',
                        'developers', 'careers', 'about', 'help', 'settings', 'activity log',
                        'advertise', 'create page', 'voting information', 'cookies',
                        'consumer health', 'video', 'sign up', 'log in'
                    ];
                    const lowerLine = lineStripped.toLowerCase();
                    for (const keyword of footerLinkKeywords) {
                        if (lowerLine.includes(keyword)) {
                            isNoise = true;
                            break;
                        }
                    }
                }
            }
            if (isNoise) continue;

            cleanedLines.push(line);
        }

        // Reassemble
        text = cleanedLines.join('\n');

        // Post-processing: Remove tracking pixels and empty image markdown
        text = text.replace(/!\[\]\([^)]*(?:pixel|beacon|tracking|1x1|\.gif)[^)]*\)/gi, '');
        text = text.replace(/!\[\s*\]\([^)]+\)/g, ''); // Empty alt text images

        // Remove empty link brackets like [](#) or [ ](#)
        text = text.replace(/\[\s*\]\([^)]*\)/g, '');

        // Remove lines that are just "#" (failed header extraction)
        text = text.replace(/^\s*#\s*$/gm, '');

        // Remove consecutive link-only lines (footer detection)
        // If we have 5+ lines in a row that are just links, remove them all
        const postLines = text.split('\n');
        const finalLines: string[] = [];
        let linkStreak = 0;
        let linkStreakStart = -1;

        for (let i = 0; i < postLines.length; i++) {
            const line = postLines[i].trim();
            const isLinkLine = /^\[.*\]\(.*\)$/.test(line) || /^[*\-•]\s*\[.*\]\(.*\)$/.test(line);

            if (isLinkLine) {
                if (linkStreak === 0) linkStreakStart = finalLines.length;
                linkStreak++;
            } else {
                if (linkStreak >= 5) {
                    // Remove the streak from finalLines
                    finalLines.splice(linkStreakStart, linkStreak);
                }
                linkStreak = 0;
                linkStreakStart = -1;
            }
            finalLines.push(postLines[i]);
        }

        // Handle streak at end of content
        if (linkStreak >= 5) {
            finalLines.splice(linkStreakStart, linkStreak);
        }

        text = finalLines.join('\n');

        // Collapse whitespace
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.replace(/[ \t]{2,}/g, ' ');

        // Safety Fallback: If cleaning stripped too much, return original text truncated
        if (text.trim().length < 20 && originalText.trim().length > 20) {
            return originalText.substring(0, 3000).trim();
        }

        // Sanitize LLM Special Tokens
        text = text.replace(/<\|/g, '< |');
        text = text.replace(/\|>/g, '| >');
        text = text.replace(/\[INST\]/gi, '[ INST ]');
        text = text.replace(/\[\/INST\]/gi, '[ /INST ]');

        return text.trim();
    }

    /**
     * Aggressively strips scripts, styles, and semantic boilerplate from HTML.
     * Note: Uses regex-based cleaning (not a full HTML parser), so some edge cases
     * with deeply nested identical tags may not be perfectly handled.
     */
    static sanitizeHtml(html: string): string {
        if (!html) return "";

        let clean = html;

        // 1. Remove Script tags (including JSON-LD, modules, etc.) - most important step
        // Run multiple passes to handle nested script scenarios
        let prevLength = 0;
        while (clean.length !== prevLength) {
            prevLength = clean.length;
            clean = clean.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
        }

        // 2. Remove Style and Noscript tags
        clean = clean.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
        clean = clean.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

        // 3. Remove inline styles and event handlers from remaining tags
        clean = clean.replace(/\s+style\s*=\s*["'][^"']*["']/gi, "");
        clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");

        // 4. Remove Semantic Boilerplate (Headers, Footers, Nav, Sidebars)
        // Run multiple passes for each to handle nesting
        const semanticTags = ['header', 'footer', 'nav', 'aside'];
        for (const tag of semanticTags) {
            prevLength = 0;
            while (clean.length !== prevLength) {
                prevLength = clean.length;
                clean = clean.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), "");
            }
        }

        // 5. Remove elements with common UI-related IDs/Classes
        // More conservative approach: only target specific container tags
        const uiPatterns = [
            'sidebar', 'menu', 'navigation', 'footer', 'header', 'cookie',
            'advertisement', 'ad-container', 'banner', 'widget', 'social-share',
            'related-posts', 'newsletter-signup', 'popup', 'modal', 'overlay',
            'comments', 'comment-section', 'share-buttons', 'breadcrumb'
        ];

        // Target div, section, aside, ul with these class/id patterns
        const containerTags = ['div', 'section', 'aside', 'ul', 'article'];
        for (const pattern of uiPatterns) {
            for (const tag of containerTags) {
                // Match opening tag with class/id containing the pattern, then content, then matching closing tag
                const regex = new RegExp(
                    `<${tag}\\b[^>]*(?:id|class)=["'][^"']*\\b${pattern}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/${tag}>`,
                    'gi'
                );
                clean = clean.replace(regex, "");
            }
        }

        // 6. Remove HTML comments (often contain template logic or debug info)
        clean = clean.replace(/<!--[\s\S]*?-->/g, "");

        // 7. Remove data-* attributes (reduce noise, often contain tracking/state)
        clean = clean.replace(/\s+data-[\w-]+\s*=\s*["'][^"']*["']/gi, "");

        return clean;
    }
}
