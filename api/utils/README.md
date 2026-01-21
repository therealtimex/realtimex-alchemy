# Content Cleaner Utility

## Overview

The `ContentCleaner` utility provides email and web content cleaning optimized for LLM processing. It removes noise, quoted replies, footers, and converts HTML to clean markdown-like text.

## Features

- **HTML to Markdown Conversion**: Converts HTML emails to clean, readable text
- **Quoted Reply Removal**: Strips out email reply chains (lines starting with `>`)
- **Footer Detection**: Removes common email footers and signatures
- **Noise Filtering**: Removes boilerplate text like "unsubscribe", "privacy policy", etc.
- **LLM Token Sanitization**: Escapes special tokens that could confuse LLMs
- **Smart Fallback**: Returns original content if cleaning removes too much

## Usage

### Basic Usage

```typescript
import { ContentCleaner } from './utils/contentCleaner.js';

const rawEmail = `
<html>
<body>
    <h1>Meeting Reminder</h1>
    <p>Don't forget our meeting tomorrow at 2 PM.</p>
    <p>Best regards,<br>John</p>
</body>
</html>
`;

const cleanedContent = ContentCleaner.cleanEmailBody(rawEmail);
console.log(cleanedContent);
// Output:
// # Meeting Reminder
// 
// Don't forget our meeting tomorrow at 2 PM.
// 
// Best regards,
// John
```

### Integration with AlchemistService

You can integrate the content cleaner into the `AlchemistService` to clean scraped web content before LLM analysis:

```typescript
import { ContentCleaner } from '../utils/contentCleaner.js';

// In scrapeContent method:
const textContent = ContentCleaner.cleanEmailBody(article?.textContent || '');
```

### Integration with Email Processing

For email processing workflows:

```typescript
import { ContentCleaner } from '../utils/contentCleaner.js';

async function processEmail(rawEmailContent: string) {
    // Clean the email content
    const cleanContent = ContentCleaner.cleanEmailBody(rawEmailContent);
    
    // Send to LLM for analysis
    const analysis = await analyzeWithLLM(cleanContent);
    
    return analysis;
}
```

## What Gets Removed

### Truncation Patterns (stops processing)
- `On ... wrote:` - Reply headers
- `From: ... <...>` - Forwarded message headers
- `-----Original Message-----` - Outlook reply markers
- `Sent from my iPhone/Android` - Mobile signatures
- `Get Outlook for` - Email client promotions
- `--` - Standard signature separator

### Noise Patterns (removed but continues)
- "view in browser"
- "click here to view"
- "legal notice"
- "all rights reserved"
- "privacy policy"
- "terms of service"
- "unsubscribe"

### HTML Elements
- `<script>` and `<style>` tags (completely removed)
- All HTML tags (converted to markdown or stripped)
- HTML entities (`&nbsp;`, `&amp;`, etc.)

### Special Characters
- LLM special tokens: `<|`, `|>`, `[INST]`, `[/INST]`

## Testing

Run the test examples:

```bash
cd realtimex-alchemy
npx tsx api/utils/contentCleaner.test.ts
```

## API Reference

### `ContentCleaner.cleanEmailBody(text: string): string`

Cleans email or web content for optimal LLM processing.

**Parameters:**
- `text` (string): Raw email or web content (HTML or plain text)

**Returns:**
- `string`: Cleaned content optimized for LLM context

**Example:**
```typescript
const cleaned = ContentCleaner.cleanEmailBody(rawHtmlEmail);
```

## Best Practices

1. **Always clean before LLM processing**: Raw HTML/email content wastes tokens and confuses LLMs
2. **Check the output**: The cleaner has a safety fallback that returns truncated original content if cleaning removes too much
3. **Combine with other preprocessing**: Use alongside other text normalization as needed
4. **Monitor token usage**: Cleaned content typically uses 50-70% fewer tokens

## Implementation Notes

- The cleaner is stateless and can be used concurrently
- HTML detection is automatic based on tag presence
- Whitespace is normalized (multiple newlines → 2, multiple spaces → 1)
- Original content is preserved if cleaning results in < 20 characters
- Maximum fallback length is 3000 characters

## Migration from email-automator

This implementation is directly ported from `email-automator` with identical functionality. If you're migrating code:

```typescript
// Before (email-automator)
import { ContentCleaner } from '../utils/contentCleaner.js';

// After (realtimex-alchemy)
import { ContentCleaner } from '../utils/contentCleaner.js';

// API is identical
const cleaned = ContentCleaner.cleanEmailBody(content);
```
