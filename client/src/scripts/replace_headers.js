import fs from 'fs';
import path from 'path';

const pagesDir = 'g:/Mewoo/client/src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Regex to match from <header ...> to </header>
    const headerRegex = /<header[\s\S]*?<\/header>/i;
    
    // Replacement string
    const replacement = `<div id="app-navbar"></div>\n<script src="../components/navbar.js"></script>`;
    
    // Replace if header exists
    if (headerRegex.test(content)) {
        content = content.replace(headerRegex, replacement);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`No <header> found in ${file}`);
    }
});
