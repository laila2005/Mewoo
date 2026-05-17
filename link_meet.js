const fs = require('fs');
let c = fs.readFileSync('client/src/pages/user.html', 'utf8');

c = c.replace('<button class="w-full py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-on-primary transition-colors text-xs sm:text-sm" style="">Meet Milo</button>', '<button onclick="window.location.href=\\\'pet-profile.html?pet=milo\\\'" class="w-full py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-on-primary transition-colors text-xs sm:text-sm" style="">Meet Milo</button>');

c = c.replace('<button class="w-full py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-on-primary transition-colors text-xs sm:text-sm" style="">Meet Luna</button>', '<button onclick="window.location.href=\\\'pet-profile.html?pet=luna\\\'" class="w-full py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-on-primary transition-colors text-xs sm:text-sm" style="">Meet Luna</button>');

fs.writeFileSync('client/src/pages/user.html', c);
