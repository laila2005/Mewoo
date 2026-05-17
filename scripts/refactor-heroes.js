const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../client/src/pages');

// 1. contact.html
let contact = fs.readFileSync(path.join(pagesDir, 'contact.html'), 'utf8');
contact = contact.replace(/<!-- Hero Section -->[\s\S]*?<\/section>/, `<!-- Hero Section with Premium Gradient -->
    <div class="relative pt-32 pb-36 px-4 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-blue-900 z-0"></div>
        <div class="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
        <div class="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
        <svg class="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
        </svg>
        <div class="max-w-4xl mx-auto text-center relative z-20">
            <h1 class="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">Let's start a <span class="text-secondary-fixed">conversation</span></h1>
            <p class="text-primary-fixed text-lg md:text-xl font-medium max-w-2xl mx-auto">Have questions about our pet services? Need help with your account? Our dedicated support team is here to ensure you and your furry friends have the best experience.</p>
        </div>
    </div>`);
fs.writeFileSync(path.join(pagesDir, 'contact.html'), contact);

// 2. trainers.html
let trainers = fs.readFileSync(path.join(pagesDir, 'trainers.html'), 'utf8');
trainers = trainers.replace(/<!-- Hero Section -->[\s\S]*?<\/header>/, `<!-- Hero with Dynamic Gradient -->
    <div class="relative pt-32 pb-36 px-4 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-blue-900 z-0"></div>
        <div class="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
        <div class="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
        <svg class="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
        </svg>
        <div class="max-w-5xl mx-auto relative z-20 text-center">
            <h1 class="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">Find the Best <span class="text-secondary-fixed">Trainers</span> Near You</h1>
            <p class="text-primary-fixed text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10">Connect with certified pet professionals who understand your furry friend's unique needs. From puppy basics to behavior correction.</p>
            <div class="bg-white/10 backdrop-blur-md p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto border border-white/20">
                <div class="flex-1 flex items-center px-4 gap-3 bg-white/90 rounded-xl border-l md:border-l-0">
                    <span class="material-symbols-outlined text-primary">location_on</span>
                    <input id="searchInput" onkeyup="filterTrainers()" class="w-full bg-transparent border-none focus:ring-0 py-4 font-body-base text-slate-800" placeholder="Search by name or specialty..." type="text"/>
                </div>
                <button onclick="filterTrainers()" class="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary-container hover:shadow-lg transition-all border border-white/30">Search Now</button>
            </div>
        </div>
    </div>`);
fs.writeFileSync(path.join(pagesDir, 'trainers.html'), trainers);

// 3. marketplace.html
let marketplace = fs.readFileSync(path.join(pagesDir, 'marketplace.html'), 'utf8');
marketplace = marketplace.replace(/<!-- Hero Section -->[\s\S]*?<\/header>/, `<!-- Hero with Dynamic Gradient -->
    <div class="relative pt-32 pb-36 px-4 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-blue-900 z-0"></div>
        <div class="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
        <div class="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
        <svg class="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
        </svg>
        <div class="max-w-5xl mx-auto relative z-20 text-center">
            <h1 class="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">Premium Pet <span class="text-secondary-fixed">Marketplace</span></h1>
            <p class="text-primary-fixed text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10">Discover high-quality food, toys, and accessories for your furry friends. Curated by experts, loved by pets.</p>
            <div class="bg-white/10 backdrop-blur-md p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto border border-white/20">
                <div class="flex-1 flex items-center px-4 gap-3 bg-white/90 rounded-xl border-l md:border-l-0">
                    <span class="material-symbols-outlined text-primary">search</span>
                    <input id="searchInput" onkeyup="filterProducts()" class="w-full bg-transparent border-none focus:ring-0 py-4 font-body-base text-slate-800" placeholder="Search for products, brands..." type="text"/>
                </div>
                <button onclick="filterProducts()" class="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary-container hover:shadow-lg transition-all border border-white/30">Search</button>
            </div>
        </div>
    </div>`);
fs.writeFileSync(path.join(pagesDir, 'marketplace.html'), marketplace);

// 4. explore.html
let explore = fs.readFileSync(path.join(pagesDir, 'explore.html'), 'utf8');
explore = explore.replace(/<header class="pt-32 pb-16 px-6 bg-gradient-to-b from-primary-fixed to-background">[\s\S]*?<\/header>/, `<!-- Hero with Dynamic Gradient -->
    <div class="relative pt-32 pb-36 px-4 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-blue-900 z-0"></div>
        <div class="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
        <div class="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
        <svg class="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
        </svg>
        <div class="max-w-5xl mx-auto relative z-20 text-center">
            <h1 class="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">Explore <span class="text-secondary-fixed">Local Care</span></h1>
            <p class="text-primary-fixed text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10">Discover the best pet care services in your neighborhood. From trusted veterinarians to luxury pet hotels.</p>
        </div>
    </div>`);
fs.writeFileSync(path.join(pagesDir, 'explore.html'), explore);

// 5. vet-booking.html
let vetBooking = fs.readFileSync(path.join(pagesDir, 'vet-booking.html'), 'utf8');
vetBooking = vetBooking.replace(/<!-- Hero Section -->[\s\S]*?<\/header>/, `<!-- Hero with Dynamic Gradient -->
    <div class="relative pt-32 pb-36 px-4 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-blue-900 z-0"></div>
        <div class="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
        <div class="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
        <svg class="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
        </svg>
        <div class="max-w-5xl mx-auto relative z-20 text-center">
            <h1 class="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">Expert Veterinary <span class="text-secondary-fixed">Care</span></h1>
            <p class="text-primary-fixed text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10">Connect with certified veterinary professionals for routine checkups, emergency care, and specialized treatments.</p>
            <div class="bg-white/10 backdrop-blur-md p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto border border-white/20">
                <div class="flex-1 flex items-center px-4 gap-3 bg-white/90 rounded-xl border-l md:border-l-0">
                    <span class="material-symbols-outlined text-primary">search</span>
                    <input id="searchInput" onkeyup="filterVets()" class="w-full bg-transparent border-none focus:ring-0 py-4 font-body-base text-slate-800" placeholder="Search by name, clinic, or specialty..." type="text"/>
                </div>
                <button onclick="filterVets()" class="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary-container hover:shadow-lg transition-all border border-white/30">Find a Vet</button>
            </div>
        </div>
    </div>`);
fs.writeFileSync(path.join(pagesDir, 'vet-booking.html'), vetBooking);

console.log("Heroes updated.");
