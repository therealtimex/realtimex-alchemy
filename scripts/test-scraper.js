
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const url = 'https://x.com/hwchase17/status/2013787742585659498';

async function testScraper() {
    try {
        console.log(`Fetching ${url}...`);
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000
        });

        const dom = new JSDOM(data, { url });
        const doc = dom.window.document;
        const reader = new Readability(doc);
        const article = reader.parse();

        console.log('--- Readability Result ---');
        console.log('Title:', article?.title);
        console.log('Text Length:', article?.textContent?.length || 0);
        console.log('Text Preview:', article?.textContent?.substring(0, 100).trim());

        // Metadata Logic
        const getMeta = (name) => 
            doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
            doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
            doc.querySelector(`meta[property="og:${name}"]`)?.getAttribute('content') ||
            doc.querySelector(`meta[name="twitter:${name}"]`)?.getAttribute('content');

        const metaDesc = getMeta('description');
        
        console.log('\n--- Metadata Result (Fallback) ---');
        console.log('Meta Description:', metaDesc);

        let finalContent = article?.textContent || '';
        if (finalContent.length < 200 && metaDesc) {
            console.log('\n[Logic] Content too short. Using Metadata fallback.');
            finalContent = metaDesc;
        }

        console.log('\n--- Final Content to LLM ---');
        console.log(finalContent);

    } catch (err) {
        console.error('Error:', err.message);
    }
}

testScraper();
