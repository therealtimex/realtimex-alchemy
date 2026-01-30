import fs from 'fs';

const path = 'src/components/AlchemistEngine.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize tags
// 1. Fix spaces after open bracket: < div -> <div, < /div -> </div
content = content.replace(/<\s+(\/?\w+)/g, '<$1');

// 2. Fix spaces before close bracket: div > -> div>
content = content.replace(/\s+>/g, '>');

// 3. Specific fix for closing tags with spaces inside: </ section > -> </section>
// Regex: </ followed by optional space, word, optional space, >
content = content.replace(/<\/\s*(\w+)\s*>/g, '</$1>');

// 4. Specific fix for opening tags with space after name: < section class... -> <section class...
// Regex: < followed by space, word -> <word
content = content.replace(/<\s+(\w+)/g, '<$1');

fs.writeFileSync(path, content);
console.log('Normalized AlchemistEngine.tsx with robust regex');
