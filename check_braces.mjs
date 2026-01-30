import fs from 'fs';

const path = 'src/components/AlchemistEngine.tsx';
const content = fs.readFileSync(path, 'utf8');

let open = 0;
let stack = [];
let line = 1;
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '\n') line++;

    if (inString) {
        if (char === stringChar && content[i - 1] !== '\\') inString = false;
        continue;
    }

    if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringChar = char;
        continue;
    }

    if (char === '{') {
        open++;
        stack.push(line);
    } else if (char === '}') {
        open--;
        if (open === 0) {
            // console.log(`Scope closed at line ${line}`);
        }
        if (open < 0) {
            console.log(`Extra } at line ${line}`);
            break;
        }
        stack.pop();
    }
}
// Log all zero points
console.log('Checking for early closure...');
open = 0;
line = 1;
inString = false;
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '\n') line++;

    if (inString) {
        if (char === stringChar && content[i - 1] !== '\\') inString = false;
        continue;
    }

    if (char === "'" || char === '"' || char === '`') {
        inString = true;
        stringChar = char;
        continue;
    }

    if (char === '{') {
        open++;
    } else if (char === '}') {
        open--;
        if (open === 0) {
            console.log(`Scope closed at line ${line}`);
        }
    }
}
