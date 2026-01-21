# Content Cleaner - Quick Start

## 5-Minute Integration Guide

### Step 1: Import the Cleaner

```typescript
import { ContentCleaner } from './utils/contentCleaner.js';
```

### Step 2: Clean Your Content

```typescript
// Before sending to LLM
const rawContent = "<html><body><h1>Hello</h1><p>World</p></body></html>";
const cleanContent = ContentCleaner.cleanEmailBody(rawContent);

// cleanContent = "# Hello\n\nWorld"
```

### Step 3: Use in Your Service

```typescript
async function analyzeWithLLM(rawHtml: string) {
    // Clean first
    const cleanText = ContentCleaner.cleanEmailBody(rawHtml);
    
    // Then analyze
    const response = await llm.chat.completions.create({
        messages: [{ role: 'user', content: cleanText }],
        model: 'gpt-4'
    });
    
    return response;
}
```

## Common Use Cases

### Web Scraping
```typescript
const scraped = await scrapeWebsite(url);
const cleaned = ContentCleaner.cleanEmailBody(scraped.html);
await analyzeLLM(cleaned); // 50-70% fewer tokens!
```

### Email Processing
```typescript
const email = await fetchEmail(emailId);
const cleaned = ContentCleaner.cleanEmailBody(email.body);
await categorizeEmail(cleaned);
```

### User Input
```typescript
app.post('/analyze', (req, res) => {
    const cleaned = ContentCleaner.cleanEmailBody(req.body.text);
    const result = await analyze(cleaned);
    res.json(result);
});
```

## What You Get

✅ **50-70% token reduction** on HTML content  
✅ **Cleaner LLM input** = better analysis  
✅ **Automatic HTML → Markdown** conversion  
✅ **Removes email noise** (footers, replies, unsubscribe links)  
✅ **Zero configuration** - just import and use  

## Test It

```bash
npx tsx api/utils/contentCleaner.test.ts
```

## Need More?

- Full docs: `api/utils/README.md`
- Integration guide: `docs-dev/CONTENT_CLEANER_INTEGRATION.md`
- Source: `api/utils/contentCleaner.ts`

---

**That's it!** Start cleaning your content in 3 lines of code. 🚀
