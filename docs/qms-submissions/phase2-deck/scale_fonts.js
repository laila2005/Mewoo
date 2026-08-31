import fs from 'fs';

const filePath = 'g:\\Mewoo\\docs\\qms-submissions\\phase2-deck\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

// Scale up all font-sizes smaller than 1.5rem by 1.3x for readability
content = content.replace(/font-size:\s*([0-9.]+)rem/g, (match, sizeStr) => {
    let size = parseFloat(sizeStr);
    if (size < 1.4) {
        size = (size * 1.35).toFixed(2);
        return `font-size:${size}rem`;
    }
    return match;
});

// Specifically target the very small mono text that might not use 'rem' if there are any (most use rem)
// Also increase the baseline sizing of body if there are absolute sizes
content = content.replace(/font-size:\s*([0-9]+)px/g, (match, sizeStr) => {
    let size = parseInt(sizeStr);
    if (size < 18) {
        size = Math.round(size * 1.35);
        return `font-size:${size}px`;
    }
    return match;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully scaled up all small fonts by 35%!");
