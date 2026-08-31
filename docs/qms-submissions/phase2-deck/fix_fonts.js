import fs from 'fs';

const filePath = 'g:\\Mewoo\\docs\\qms-submissions\\phase2-deck\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

// Increase font sizes in the pipeline slide CSS

// .st8 styles
content = content.replace(/\.st8 \.n8\{.*?font-size:\.58rem;/g, match => match.replace('.58rem', '.85rem'));
content = content.replace(/\.st8 b\{.*?font-size:1\.06rem;/g, match => match.replace('1.06rem', '1.35rem'));
content = content.replace(/\.st8 p\{.*?font-size:\.82rem;/g, match => match.replace('.82rem', '1.05rem'));
content = content.replace(/\.st8 em\{.*?font-size:\.55rem;/g, match => match.replace('.55rem', '.8rem'));

// #ratio cap
content = content.replace(/#ratio \.cap\{.*?font-size:\.68rem;/g, match => match.replace('.68rem', '.9rem'));

// .cst styles (Cost comparison)
content = content.replace(/\.cst \.lk\{.*?font-size:\.58rem;/g, match => match.replace('.58rem', '.85rem'));
content = content.replace(/\.cst \.lv\{.*?font-size:\.82rem;/g, match => match.replace('.82rem', '1.1rem'));
content = content.replace(/\.cst \.lnote\{.*?font-size:\.9rem;/g, match => match.replace('.9rem', '1.15rem'));

// .gd styles (Guards on right)
content = content.replace(/\.gd\{.*?font-size:\.92rem;/g, match => match.replace('.92rem', '1.15rem'));

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully increased font sizes for the pipeline slide!");
