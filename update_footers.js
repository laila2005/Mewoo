const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'client', 'src', 'pages');

const unifiedFooter = `    <footer class="bg-slate-50 border-t border-slate-200 w-full mt-auto py-8 sm:py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 text-center sm:text-left mb-8">
            <div>
                <a href="user.html" class="inline-flex items-center gap-2 text-blue-600 mb-4 justify-center sm:justify-start">
                    <img src="../assets/images/logoo.png" alt="PetPulse logo" class="h-8 w-8 object-contain" />
                    <span class="text-xl font-bold tracking-tight">PetPulse</span>
                </a>
                <p class="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">Your one-stop destination for compassionate pet care, adoption, and community support.</p>
                <div class="flex justify-center sm:justify-start gap-4">
                    <a href="#" class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-200 shadow-sm"><span class="material-symbols-outlined text-sm">public</span></a>
                    <a href="contact.html" class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-200 shadow-sm"><span class="material-symbols-outlined text-sm">mail</span></a>
                    <a href="community.html" class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors border border-slate-200 shadow-sm"><span class="material-symbols-outlined text-sm">share</span></a>
                </div>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-4 text-sm sm:text-base">Quick Links</h4>
                <ul class="space-y-3">
                    <li><a class="text-slate-500 hover:text-blue-600 transition-all text-sm flex items-center gap-2 justify-center sm:justify-start" href="user.html#premiumServices"><span class="material-symbols-outlined text-[14px]">arrow_right</span> Services</a></li>
                    <li><a class="text-slate-500 hover:text-blue-600 transition-all text-sm flex items-center gap-2 justify-center sm:justify-start" href="community.html"><span class="material-symbols-outlined text-[14px]">arrow_right</span> Community</a></li>
                    <li><a class="text-slate-500 hover:text-blue-600 transition-all text-sm flex items-center gap-2 justify-center sm:justify-start" href="trainers.html"><span class="material-symbols-outlined text-[14px]">arrow_right</span> Professionals</a></li>
                </ul>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-4 text-sm sm:text-base">Support</h4>
                <ul class="space-y-3">
                    <li><a class="text-slate-500 hover:text-blue-600 transition-all text-sm flex items-center gap-2 justify-center sm:justify-start" href="contact.html"><span class="material-symbols-outlined text-[14px]">arrow_right</span> Contact Us</a></li>
                    <li><a class="text-slate-500 hover:text-blue-600 transition-all text-sm flex items-center gap-2 justify-center sm:justify-start" href="#"><span class="material-symbols-outlined text-[14px]">arrow_right</span> Privacy Policy</a></li>
                    <li><a class="text-slate-500 hover:text-blue-600 transition-all text-sm flex items-center gap-2 justify-center sm:justify-start" href="#"><span class="material-symbols-outlined text-[14px]">arrow_right</span> Terms of Service</a></li>
                </ul>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-4 text-sm sm:text-base">Join the Pack</h4>
                <p class="text-slate-500 text-xs sm:text-sm mb-4">Get pet tips and updates directly in your inbox.</p>
                <div class="flex gap-2">
                    <input class="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-600 focus:outline-none" placeholder="Your email" type="email">
                    <button class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"><span class="material-symbols-outlined text-lg">send</span></button>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-200 text-center">
            <p class="text-slate-500 text-sm">© 2026 PetPulse. Compassionate Care for Every Companion.</p>
        </div>
    </footer>`;

const footerRegex = /<footer[\s\S]*?<\/footer>/i;

fs.readdir(pagesDir, (err, files) => {
    if (err) return console.error(err);
    files.forEach(file => {
        if (!file.endsWith('.html')) return;
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (footerRegex.test(content)) {
            content = content.replace(footerRegex, unifiedFooter);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated footer in ' + file);
        } else {
            console.log('No footer found in ' + file + ', skipped.');
            const bodyRegex = /<\/body>/i;
            if (bodyRegex.test(content) && !['login.html'].includes(file)) {
                 content = content.replace(bodyRegex, unifiedFooter + '\n</body>');
                 fs.writeFileSync(filePath, content, 'utf8');
                 console.log('Added footer to ' + file);
            }
        }
    });
});
