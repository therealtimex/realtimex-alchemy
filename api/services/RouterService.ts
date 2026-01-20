import axios from 'axios';
import puppeteer from 'puppeteer';
import TurndownService from 'turndown';
import { EventService } from './EventService.js';

export class RouterService {
    private turndown = new TurndownService();
    private events = EventService.getInstance();

    async extractContent(url: string): Promise<string> {
        this.events.emit({ type: 'router', message: `Attempting Tier 1 Extraction (Axios): ${url.substring(0, 30)}...` });

        try {
            // Tier 1: Fast Fetch
            const response = await axios.get(url, { timeout: 5000 });
            const html = response.data;
            const markdown = this.turndown.turndown(html);

            if (markdown.length > 500) {
                this.events.emit({ type: 'router', message: `Tier 1 Success (${markdown.length} chars)` });
                return markdown;
            }
        } catch (e) {
            this.events.emit({ type: 'router', message: `Tier 1 Failed, Falling back to Tier 2...` });
        }

        // Tier 2: Puppeteer
        this.events.emit({ type: 'router', message: `Attempting Tier 2 Extraction (Puppeteer)...` });
        try {
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            const content = await page.content();
            await browser.close();
            const markdown = this.turndown.turndown(content);
            this.events.emit({ type: 'router', message: `Tier 2 Success (${markdown.length} chars)` });
            return markdown;
        } catch (e: any) {
            this.events.emit({ type: 'router', message: `Tier 2 Failed: ${e.message}` });
            throw new Error(`Failed to extract content from ${url}`);
        }
    }
}
