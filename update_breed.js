const fs = require('fs');

function updateFile(file) {
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace(/<input id="petBreed"[\s\S]*?\/>/, '<select id="petBreed" disabled class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer appearance-none"><option value="">Select species first</option></select>');
    fs.writeFileSync(file, c);
}

updateFile('client/src/pages/profile.html');
updateFile('client/src/pages/manage-pet.html');
