import fs from 'fs';

const content = fs.readFileSync('src/components/AlchemistEngine.tsx', 'utf8');

let divOpen = 0;
let sectionOpen = 0;
let mainOpen = 0;

const lines = content.split('\n');
lines.forEach((line, i) => {
    // Basic regex (flawed but good enough for indentation based)
    const opensDiv = (line.match(/<div/g) || []).length;
    const closesDiv = (line.match(/<\/div>/g) || []).length;

    divOpen += opensDiv - closesDiv;

    const opensSection = (line.match(/<section/g) || []).length;
    const closesSection = (line.match(/<\/section>/g) || []).length;
    sectionOpen += opensSection - closesSection;

    const opensMain = (line.match(/<main/g) || []).length;
    const closesMain = (line.match(/<\/main>/g) || []).length;
    mainOpen += opensMain - closesMain;

    if (divOpen < 0) console.log(`Line ${i + 1}: Div open count dropped to ${divOpen}`);
    if (sectionOpen < 0) console.log(`Line ${i + 1}: Section open count dropped to ${sectionOpen}`);
    if (mainOpen < 0) console.log(`Line ${i + 1}: Main open count dropped to ${mainOpen}`);
});

console.log('Final counts:');
console.log('Div:', divOpen);
console.log('Section:', sectionOpen);
console.log('Main:', mainOpen);
