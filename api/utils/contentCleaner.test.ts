import { ContentCleaner } from './contentCleaner.js';

/**
 * Example usage and test cases for ContentCleaner
 */

// Example 1: Clean HTML email
const htmlEmail = `
<html>
<head><style>.header { color: blue; }</style></head>
<body>
    <h1>Important Update</h1>
    <p>Hello Team,</p>
    <p>We have an important announcement about the new feature release.</p>
    <br>
    <p>Key points:</p>
    <ul>
        <li>Feature A is now live</li>
        <li>Feature B coming next week</li>
    </ul>
    <p>Best regards,<br>John</p>
    <p>--</p>
    <p>Sent from my iPhone</p>
    <p><a href="https://example.com/unsubscribe">Unsubscribe</a></p>
</body>
</html>
`;

console.log('=== Example 1: HTML Email ===');
console.log(ContentCleaner.cleanEmailBody(htmlEmail));
console.log('\n');

// Example 2: Plain text with quoted reply
const quotedEmail = `
Hi Sarah,

Thanks for your email. I agree with your proposal.

Let's schedule a meeting next week.

Best,
Mike

> On Jan 20, 2026, at 10:30 AM, Sarah Johnson <sarah@example.com> wrote:
> 
> Hi Mike,
> 
> I wanted to discuss the project timeline.
> 
> Best regards,
> Sarah
`;

console.log('=== Example 2: Quoted Reply ===');
console.log(ContentCleaner.cleanEmailBody(quotedEmail));
console.log('\n');

// Example 3: Email with noise patterns
const noisyEmail = `
Important Security Alert

Your account requires immediate attention.

Please review the attached document.

Click here to view in browser
Privacy Policy | Terms of Service | Unsubscribe
© 2026 Company Inc. All rights reserved.
Legal Notice: This email is confidential.
`;

console.log('=== Example 3: Noisy Email ===');
console.log(ContentCleaner.cleanEmailBody(noisyEmail));
console.log('\n');

// Example 4: HTML with links and images
const richHtmlEmail = `
<html>
<body>
    <h2>Weekly Newsletter</h2>
    <p>Check out our latest <a href="https://blog.example.com/post">blog post</a>!</p>
    <img src="https://example.com/banner.jpg" alt="Banner Image">
    <p>Visit our <a href="https://example.com">website</a> for more info.</p>
</body>
</html>
`;

console.log('=== Example 4: Rich HTML ===');
console.log(ContentCleaner.cleanEmailBody(richHtmlEmail));
console.log('\n');

// Example 5: Empty or minimal content
const minimalEmail = '';

console.log('=== Example 5: Empty Content ===');
console.log(ContentCleaner.cleanEmailBody(minimalEmail));
console.log('\n');

// Example 6: Content with LLM special tokens (should be sanitized)
const llmTokenEmail = `
Hello <|assistant|>,

This is a test message with special tokens [INST] that should be sanitized [/INST].

Best regards
`;

console.log('=== Example 6: LLM Special Tokens ===');
console.log(ContentCleaner.cleanEmailBody(llmTokenEmail));
