import axios from 'axios';
import puppeteer from 'puppeteer';
import TurndownService from 'turndown';
import { EventService } from './EventService.js';
import { ContentCleaner } from '../utils/contentCleaner.js';

export class RouterService {
    private turndown = new TurndownService();
    private events = EventService.getInstance();

    async extractContent(url: string): Promise<{ content: string, finalUrl: string }> {
        this.events.emit({ type: 'router', message: `Attempting Tier 1 Extraction (Axios): ${url.substring(0, 30)}...` });

        let finalUrl = url;

        try {
            // Tier 1: Fast Fetch
            const response = await axios.get(url, { timeout: 5000 });

            // Capture final URL after redirects
            if (response.request?.res?.responseUrl) {
                finalUrl = response.request.res.responseUrl;
            } else if (response.request?._redirectable?._currentUrl) {
                // Robust fallback for axios/node environment
                finalUrl = response.request._redirectable._currentUrl;
            } else if (response.config?.url && !response.config.url.includes('t.co')) {
                // Heuristic: If axios didn't capture responseUrl but config.url is different from input
                // and it's not the same shortener, it might be the final one.
                // But usually responseUrl is the reliable one.
            }

            const rawHtml = response.data;

            // Payload Hygiene: Sanitize HTML before Markdown conversion
            const sanitizedHtml = ContentCleaner.sanitizeHtml(rawHtml);
            const markdown = this.turndown.turndown(sanitizedHtml);

            if (markdown.length > 500) {
                this.events.emit({ type: 'router', message: `Tier 1 Success (${markdown.length} chars) -> ${finalUrl.substring(0, 30)}...` });
                return { content: markdown, finalUrl };
            }
        } catch (e) {
            this.events.emit({ type: 'router', message: `Tier 1 Failed, Falling back to Tier 2...` });
        }

        // Tier 2: Puppeteer
        this.events.emit({ type: 'router', message: `Attempting Tier 2 Extraction (Puppeteer)...` });
        try {
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });

            const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            // Capture final URL from page object
            finalUrl = page.url();

            const content = await page.content();
            const sanitizedHtml = ContentCleaner.sanitizeHtml(content);
            await browser.close();

            const markdown = this.turndown.turndown(sanitizedHtml);
            this.events.emit({ type: 'router', message: `Tier 2 Success (${markdown.length} chars) -> ${finalUrl.substring(0, 30)}...` });

            return { content: markdown, finalUrl };
        } catch (e: any) {
            this.events.emit({ type: 'router', message: `Tier 2 Failed: ${e.message}` });
            throw new Error(`Failed to extract content from ${url}`);
        }
    }
}
