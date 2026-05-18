const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../client/src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

const tailwindConfig = `    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
    <link href="../css/index.css" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: "#005da7",
                        "primary-fixed": "#d4e3ff",
                        "primary-container": "#2976c7",
                        "on-primary": "#ffffff",
                        secondary: "#196a59",
                        "secondary-fixed": "#a6f1db",
                        "secondary-container": "#a3eed8",
                        tertiary: "#7b5508",
                        "tertiary-fixed": "#ffdeae",
                        "surface-container-low": "#f1f4f3",
                        "surface-container-lowest": "#ffffff",
                        "outline-variant": "#c1c7d3",
                        "on-surface-variant": "#414751",
                        "on-surface": "#181c1c",
                    },
                    fontFamily: {
                        "display-lg": ["Plus Jakarta Sans"],
                        "label-bold": ["Plus Jakarta Sans"],
                        "body-base": ["Plus Jakarta Sans"],
                        "headline-md": ["Plus Jakarta Sans"]
                    }
                }
            }
        }
    </script>`;

const unifiedHeader = `<header class="bg-white/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 border-b border-slate-100 shadow-[0_8px_30px_rgb(74,144,226,0.08)]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4 sm:gap-6 lg:gap-8">
            <a href="user.html" class="inline-flex items-center gap-2 flex-shrink-0">
                <img src="../assets/images/logoo.png" alt="PetPulse logo" class="h-10 w-10 object-contain" />
                <span class="text-lg font-bold tracking-tight text-blue-600">PetPulse</span>
            </a>
            <nav class="hidden md:flex items-center justify-center gap-4 lg:gap-8 flex-1">
                <a class="text-slate-600 font-medium hover:text-blue-500 transition-all text-sm lg:text-base" href="user.html">Home</a>
                <a class="text-slate-600 font-medium hover:text-blue-500 transition-all text-sm lg:text-base" href="marketplace.html">Marketplace</a>
                <a class="text-slate-600 font-medium hover:text-blue-500 transition-all text-sm lg:text-base" href="user.html#premiumServices">Services</a>
                <a class="text-slate-600 font-medium hover:text-blue-500 transition-all text-sm lg:text-base" href="community.html">Community</a>
                <a class="text-slate-600 font-medium hover:text-blue-500 transition-all text-sm lg:text-base" href="contact.html">Contact Us</a>
            </nav>
            <div class="flex items-center gap-1 sm:gap-2 md:gap-3">
                <div id="authButtonsContainer" class="flex items-center gap-1 sm:gap-2">
                    <button onclick="window.location.href='login.html'" class="text-slate-600 font-medium px-2 sm:px-3 py-2 text-xs sm:text-sm hover:text-blue-600 transition-all rounded-lg hover:bg-slate-50">Log In</button>
                    <button onclick="window.location.href='signup.html'" class="bg-primary text-on-primary font-semibold px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-full shadow-sm hover:bg-primary/90 transition-all">Sign Up</button>
                </div>
                <div id="profileContainer" class="hidden items-center gap-2 sm:gap-3">
                    <a href="profile.html" class="block flex-shrink-0">
                        <img id="profileImg" src="" class="w-8 h-8 rounded-full border-2 border-primary object-cover cursor-pointer hover:opacity-80 transition-opacity">
                    </a>
                    <div class="hidden xl:flex flex-col gap-0">
                        <span class="text-slate-600 font-semibold text-xs">Welcome</span>
                        <span id="userNameDisplay" class="text-slate-600 font-medium text-xs">User</span>
                    </div>
                    <button onclick="logout()" class="text-slate-600 font-medium px-2 py-2 hover:text-blue-600 transition-all text-xs rounded-lg hover:bg-slate-50">Logout</button>
                </div>
            </div>
        </div>
    </header>`;

const unifiedFooter = `<footer class="bg-slate-50 border-t border-slate-200 w-full mt-auto py-8 sm:py-12">
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
                </ul>
            </div>
            <div>
                <h4 class="font-bold text-slate-900 mb-4 text-sm sm:text-base">Join the Pack</h4>
                <p class="text-slate-500 text-xs sm:text-sm mb-4">Get pet tips and updates directly in your inbox.</p>
                <div class="flex gap-2">
                    <input class="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none" placeholder="Your email" type="email">
                    <button class="bg-primary text-white px-3 py-2 rounded-lg"><span class="material-symbols-outlined text-lg">send</span></button>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-200 text-center">
            <p class="text-slate-500 text-sm">© 2026 PetPulse. Compassionate Care for Every Companion.</p>
        </div>
    </footer>`;

// Target files for full redesign
const targetFiles = ['contact.html', 'trainers.html', 'vet-booking.html', 'marketplace.html', 'pet-shops.html', 'community.html', 'explore.html'];

for (const file of targetFiles) {
    let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');

    // 1. Replace Tailwind config
    content = content.replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss\.com.*?"[^>]*><\/script>[\s\S]*?(?:<\/script>|<style>)/, tailwindConfig + '\n    <style>');
    if (!content.includes(tailwindConfig)) {
        // If it didn't have one, just inject it before </head>
        content = content.replace('</head>', tailwindConfig + '\n</head>');
    }

    // 2. Replace Header
    // The header might be <header ...> or <nav ...>
    content = content.replace(/<header[^>]*class="[^"]*fixed top-0[^"]*"[^>]*>[\s\S]*?<\/header>/, unifiedHeader);
    content = content.replace(/<!-- Top Navigation -->[\s\S]*?<\/header>/, unifiedHeader);
    content = content.replace(/<nav[^>]*class="[^"]*sticky top-0[^"]*"[^>]*>[\s\S]*?<\/nav>/, unifiedHeader);

    // 3. Replace Footer
    content = content.replace(/<footer[\s\S]*?<\/footer>/, unifiedFooter);

    // 4. Ensure app.js is loaded
    if (!content.includes('utils/app.js')) {
        content = content.replace('</body>', '    <script src="../utils/app.js"></script>\n    <script>document.addEventListener("DOMContentLoaded", updateNavbar);</script>\n</body>');
    }

    fs.writeFileSync(path.join(pagesDir, file), content);
    console.log('Processed', file);
}

console.log('Done!');
