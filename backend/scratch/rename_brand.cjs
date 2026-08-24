const fs = require('fs');
const path = require('path');

const DIRECTORY = 'g:\\Mewoo';
const IGNORE_DIRS = ['.git', 'node_modules', 'archive', '.claude', 'dist', '.vercel', 'exports', '.github'];
const ALLOWED_EXTS = ['.js', '.jsx', '.html', '.md', '.json', '.env', '.css', '.txt', '.sql'];

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat && stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                results = results.concat(walkDir(filePath));
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ALLOWED_EXTS.includes(ext) || file.startsWith('.env')) {
                if (!file.includes('package-lock')) {
                    results.push(filePath);
                }
            }
        }
    });
    return results;
}

const files = walkDir(DIRECTORY);
let modifiedCount = 0;

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        let originalContent = content;
        
        content = content.replace(/PetPulse/g, 'PetPluse');
        content = content.replace(/petpulse/g, 'petpluse');
        content = content.replace(/PETPULSE/g, 'PETPLUSE');
        
        if (content !== originalContent) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Updated: ${file}`);
            modifiedCount++;
        }
    } catch (err) {
        console.error(`Error reading ${file}:`, err);
    }
});

console.log(`\nSuccessfully updated ${modifiedCount} files.`);
