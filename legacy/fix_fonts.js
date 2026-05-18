const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'client', 'src', 'pages');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('display=swap')) {
    // Replace specifically for Material Symbols Outlined
    content = content.replace(/(family=Material\+Symbols\+Outlined[^"'>]*)display=swap/g, '$1display=block');
    fs.writeFileSync(filePath, content);
  }
}
console.log('Done replacing display=swap with display=block for Material Symbols');
