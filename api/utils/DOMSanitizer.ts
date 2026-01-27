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
                'meta', 'link', 'head' // We only want body content
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
                // Return Clean HTML with structure preserved (not textContent)
                return article.content;
            }

            // 4. Fallback: Manual Cleaning (If Readability fails)
            // Remove UI Noise
            const noiseSelectors = [
                'header', 'footer', 'nav', 'aside', 'form',
                '[role="alert"]', '[role="banner"]', '[role="dialog"]',
                '.ad', '.ads', '.advertisement', '.social-share', '#cookie-banner'
            ];
            noiseSelectors.forEach(selector => {
                try {
                    doc.querySelectorAll(selector).forEach(el => el.remove());
                } catch (e) {
                    // Ignore selector errors
                }
            });

            // Return whatever is left in the body as HTML
            return doc.body.innerHTML;

        } catch (error) {
            console.error('[DOMSanitizer] Parsing failed, falling back to regex strip', error);
            // Emergency fallback: Strip script/style manually, return text
            return html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
        }
    }
}
