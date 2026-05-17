const fs = require('fs');
let c = fs.readFileSync('client/src/pages/profile.html', 'utf8');

c = c.replace(
    /<div class="flex justify-between items-center mb-2">[\s\S]*?<span class="text-xs text-white\/80">Next Goal: Super Parent<\/span>[\s\S]*?<span class="text-xs font-bold text-primary-fixed">75%<\/span>[\s\S]*?<\/div>[\s\S]*?<div class="w-full bg-white\/10 h-1.5 rounded-full overflow-hidden">[\s\S]*?<div class="bg-primary-fixed w-\[75%\] h-full"><\/div>[\s\S]*?<\/div>/,
    `<div class="flex justify-between items-center mb-2">
                                    <span id="nextGoalText" class="text-xs text-white/80">Next Goal: Super Parent</span>
                                    <span id="goalPercentage" class="text-xs font-bold text-primary-fixed">0%</span>
                                </div>
                                <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div id="goalProgressBar" class="bg-primary-fixed h-full transition-all duration-1000 ease-out" style="width: 0%"></div>
                                </div>`
);

fs.writeFileSync('client/src/pages/profile.html', c);
