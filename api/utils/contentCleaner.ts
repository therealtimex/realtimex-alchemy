export class ContentCleaner {
    /**
     * Cleans email body by removing noise, quoted replies, and footers.
     * optimized for LLM processing.
     */
    static cleanEmailBody(text: string): string {
        return this.cleanContent(text);
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
        text = text.replace(/(?:window\.)?WIZ_global_data\s*=\s*\{[\s\S]*?\};/gi, '');
        text = text.replace(/(?:window\.)?__INITIAL_STATE__\s*=\s*\{[\s\S]*?\};/gi, '');
        text = text.replace(/(?:window\.)?_N_E\s*=\s*\{[\s\S]*?\};?/gi, '');

        // Strip any remaining large script-like or CSS-like blocks that might have escaped tags
        text = text.replace(/\{[^{}]*(?:background-color|font-family|margin|display|padding|color|width|height|position|opacity|border|z-index|transition|transform)[^{}]*\}/gi, '');

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
            /terms of service/i,
            /unsubscribe/i
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
            if (lineStripped.length < 100) {
                for (const pattern of noisePatterns) {
                    if (pattern.test(lineStripped)) {
                        isNoise = true;
                        break;
                    }
                }
            }
            if (isNoise) continue;

            cleanedLines.push(line);
        }

        // Reassemble
        text = cleanedLines.join('\n');

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
     */
    static sanitizeHtml(html: string): string {
        if (!html) return "";

        let clean = html;

        // 1. Remove Script, Style, and Noscript tags (The most important step)
        clean = clean.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "");
        clean = clean.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "");
        clean = clean.replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gm, "");

        // 2. Remove Schema.org JSON-LD blocks
        clean = clean.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");

        // 3. Remove Semantic Boilerplate (Headers, Footers, Nav, Sidebars)
        clean = clean.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/gi, "");
        clean = clean.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gi, "");
        clean = clean.replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gi, "");
        clean = clean.replace(/<aside\b[^>]*>([\s\S]*?)<\/aside>/gi, "");

        // 4. Remove elements with common UI-related IDs/Classes (Sidebars, Menus, etc.)
        // This is a heuristic-based regex targeting <div> or <section> or <ul> that look like boilerplate
        const uiPatterns = [
            'sidebar', 'menu', 'nav', 'footer', 'header', 'cookie',
            'advertisement', 'banner', 'widget', 'social-share',
            'related-posts', 'newsletter-signup'
        ];

        for (const pattern of uiPatterns) {
            const regex = new RegExp(`<[^>]+(?:id|class)=["'][^"']*${pattern}[^"']*["'][^>]*>([\\s\\S]*?)</[^>]+>`, 'gi');
            clean = clean.replace(regex, "");
        }

        return clean;
    }
}
