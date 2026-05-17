const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../client/src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

let count = 0;
for (const file of files) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('href="user.html#premiumServices"')) {
        // Replace in Navigation and Footer
        content = content.replace(/href="user\.html#premiumServices"/g, 'href="explore.html"');
        fs.writeFileSync(filePath, content);
        console.log(`Updated links in ${file}`);
        count++;
    }
}

console.log(`Updated ${count} files.`);
