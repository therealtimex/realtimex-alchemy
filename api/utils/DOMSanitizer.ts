import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export class DOMSanitizer {
    /**
     * Sanitize HTML using proper DOM parsing (not regex).
     * RETURNS: Cleaned HTML string (not Markdown, not Plain Text).
     */
    static sanitizeHtml(html: string): string {
        if (!html) return "";

        try {
            // 1. Parse DOM
            const dom = new JSDOM(html, { url: "https://example.com" });
            const doc = dom.window.document;

            // 2. Pre-clean: Remove Toxic Tags immediately
            // We do this BEFORE Readability to ensure no scripts sneak in
            const toxicSelectors = [
                'script', 'style', 'noscript', 'svg', 'iframe', 'embed', 'object',
                'meta', 'link', 'head', // We only want body content
                'template', // JS templates often contain code
                'canvas', // Usually interactive/code-driven
                'video', 'audio', // Media elements without text content
                'map', 'area', // Image maps
                '[data-reactroot]', '[data-react-helmet]', // React hydration markers
                '[type="application/json"]', '[type="application/ld+json"]', // JSON data blocks
                '.hljs', '.highlight', '.codehilite', // Code highlighting containers
                'pre > code', // Code blocks inside pre tags
            ];
            let removedCount = 0;
            toxicSelectors.forEach(tag => {
                const elements = doc.querySelectorAll(tag);
                if (elements.length > 0) {
                    console.log(`[DOMSanitizer] Removing ${elements.length} <${tag}> tags`);
                    removedCount += elements.length;
                    elements.forEach(el => el.remove());
                }
            });
            console.log(`[DOMSanitizer] Removed ${removedCount} toxic elements total.`);

            // 3. Try Readability (Best for Articles)
            const reader = new Readability(doc);
            const article = reader.parse();

            if (article && article.content) {
                // Post-process Readability output to strip remaining noise
                return this.stripInlineNoise(article.content);
            }

            // 4. Fallback: Manual Cleaning (If Readability fails)
            // Remove UI Noise AND code-heavy elements
            const noiseSelectors = [
                'header', 'footer', 'nav', 'aside', 'form',
                '[role="alert"]', '[role="banner"]', '[role="dialog"]',
                '.ad', '.ads', '.advertisement', '.social-share', '#cookie-banner',
                // Code blocks and syntax highlighting
                'pre', 'code', '.code', '.highlight', '.hljs', '.codehilite',
                '.sourceCode', '.language-javascript', '.language-css',
                // React/Vue/Angular artifacts
                '[data-reactid]', '[ng-app]', '[v-cloak]',
                // Common framework noise
                '.sr-only', '.visually-hidden', '[aria-hidden="true"]',
                // Interactive elements without content value
                'button', 'input', 'select', 'textarea',
                // JSON data containers
                '[type="application/json"]', '[type="application/ld+json"]'
            ];
            noiseSelectors.forEach(selector => {
                try {
                    doc.querySelectorAll(selector).forEach(el => el.remove());
                } catch (e) {
                    // Ignore selector errors
                }
            });

            // Return whatever is left in the body as HTML (with inline noise stripped)
            return this.stripInlineNoise(doc.body.innerHTML);

        } catch (error) {
            console.error('[DOMSanitizer] Parsing failed, falling back to regex strip', error);
            // Emergency fallback: Strip script/style manually, return text
            return this.stripInlineNoise(
                html.replace(/<(script|style|pre|code)[^>]*>[\s\S]*?<\/\1>/gi, '')
            );
        }
    }

    /**
     * Strip inline styles, data attributes, and other noisy HTML attributes
     * that can pollute the final output with machine code artifacts.
     */
    private static stripInlineNoise(html: string): string {
        if (!html) return "";

        // 1. Remove inline style attributes (often contain CSS code)
        html = html.replace(/\s+style="[^"]*"/gi, '');
        html = html.replace(/\s+style='[^']*'/gi, '');

        // 2. Remove data-* attributes (often contain JSON/state)
        html = html.replace(/\s+data-[a-z0-9-]+="[^"]*"/gi, '');
        html = html.replace(/\s+data-[a-z0-9-]+='[^']*'/gi, '');

        // 3. Remove event handlers (onclick, onload, etc.)
        html = html.replace(/\s+on[a-z]+="[^"]*"/gi, '');
        html = html.replace(/\s+on[a-z]+='[^']*'/gi, '');

        // 4. Remove class attributes (often contain Tailwind/CSS framework noise)
        html = html.replace(/\s+class="[^"]*"/gi, '');
        html = html.replace(/\s+class='[^']*'/gi, '');

        // 5. Remove id attributes (usually not relevant for content)
        html = html.replace(/\s+id="[^"]*"/gi, '');
        html = html.replace(/\s+id='[^']*'/gi, '');

        // 6. Remove aria-* attributes
        html = html.replace(/\s+aria-[a-z-]+="[^"]*"/gi, '');

        // 7. Remove role attributes
        html = html.replace(/\s+role="[^"]*"/gi, '');

        // 8. Strip any remaining script/noscript content that might have slipped through
        html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
        html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
        html = html.replace(/<style[\s\S]*?<\/style>/gi, '');

        // 9. Strip SPA state dumps that might have leaked as text content
        // These patterns catch content that escapes when JSDOM hiccups on malformed HTML

        // Next.js/Nuxt hydration data
        html = html.replace(/__NEXT_DATA__[\s\S]*?(?=<|$)/gi, '');
        html = html.replace(/__NUXT__[\s\S]*?(?=<|$)/gi, '');
        html = html.replace(/window\.__[A-Z_]+__\s*=[\s\S]*?(?=<\/script|<|$)/gi, '');

        // Large JSON blobs (50+ chars between braces)
        html = html.replace(/\{[^<]{50,}?\}/g, '');

        // CSS rules that leaked as text
        html = html.replace(/#[a-zA-Z][\w-]*\s*\{[^}]+\}/g, '');
        html = html.replace(/\.[a-zA-Z][\w-]*\s*\{[^}]+\}/g, '');
        html = html.replace(/@media[^{]*\{[^{}]*(\{[^{}]*\})*[^{}]*\}/gi, '');
        html = html.replace(/@keyframes[^{]*\{[\s\S]*?\}\s*\}/gi, '');

        return html;
    }
}
