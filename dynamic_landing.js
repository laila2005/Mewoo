const fs = require('fs');

let c = fs.readFileSync('client/src/pages/user.html', 'utf8');

// 1. Stats IDs
c = c.replace('30k+', '<span id="statPets">30k+</span>');
c = c.replace('0.7k+', '<span id="statVets">0.7k+</span>');
c = c.replace('9k+', '<span id="statAdoptions">9k+</span>');
c = c.replace('59%', '<span id="statReviews">59%</span>');

// 2. Adoption Container ID
// Find the div containing Milo and Luna
c = c.replace(/<h2 class="font-headline-md text-headline-md mb-2 sm:mb-3 text-2xl sm:text-3xl" style="">Available for Adoption<\/h2>[\s\S]*?<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">/, 
    `<h2 class="font-headline-md text-headline-md mb-2 sm:mb-3 text-2xl sm:text-3xl" style="">Available for Adoption</h2>
    <p class="text-on-surface-variant mb-6 sm:mb-10 text-sm sm:text-base" style="">Meet the newest residents looking for a family.</p>
    <a href="#" class="text-primary font-bold hover:underline mb-8 inline-block text-sm sm:text-base hidden sm:block" style="">View All ›</a>
    <div id="adoptableContainer" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">`
);

// 3. Vet Container ID
// Dr. Sarah Chen is inside a bg-primary-container div
c = c.replace(/<div class="bg-primary-container text-on-primary-container p-6 sm:p-8 rounded-xl flex flex-col justify-center items-center text-center">/, 
    `<div id="featuredVetContainer" class="bg-primary-container text-on-primary-container p-6 sm:p-8 rounded-xl flex flex-col justify-center items-center text-center">`
);

// 4. Community Posts Container ID
c = c.replace(/<div class="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">/, 
    `<div id="communityHighlightsContainer" class="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">`
);

// 5. Append JS Script at the end before </body>
const script = `
<script>
    async function initLandingPage() {
        try {
            // 1. Fetch Stats
            fetch('/api/public/stats').then(r => r.json()).then(data => {
                if(data.stats) {
                    document.getElementById('statPets').textContent = (data.stats.happyPets / 1000).toFixed(1) + 'k+';
                    document.getElementById('statVets').textContent = (data.stats.verifiedVets / 1000).toFixed(1) + 'k+';
                    document.getElementById('statAdoptions').textContent = (data.stats.successfulAdoptions / 1000).toFixed(1) + 'k+';
                    document.getElementById('statReviews').textContent = data.stats.positiveReviews + '%';
                }
            }).catch(e => console.error(e));

            // 2. Fetch Adoptable Pets
            fetch('/api/pets/adoptable').then(r => r.json()).then(data => {
                const container = document.getElementById('adoptableContainer');
                if(data.pets && data.pets.length > 0) {
                    // Replace the first 2 children with real data
                    const petsHtml = data.pets.slice(0, 2).map(pet => \`
                        <div class="group bg-white rounded-xl overflow-hidden ambient-shadow ambient-shadow-hover transition-all">
                            <div class="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
                            <img class="w-full h-full object-cover group-hover:scale-105 transition-duration-500" src="\${pet.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'}">
                            <span class="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/90 backdrop-blur px-2 sm:px-3 py-1 rounded-full text-xs font-bold \${pet.species === 'Dog' ? 'text-primary' : 'text-secondary'}">\${pet.species.toUpperCase()}</span>
                            </div>
                            <div class="p-4 sm:p-6">
                            <h4 class="font-bold text-base sm:text-lg mb-1">\${pet.name}</h4>
                            <p class="text-on-surface-variant text-xs sm:text-sm mb-3 sm:mb-4">\${pet.age_years || '?'} years • \${pet.breed}</p>
                            <button onclick="window.location.href='pet-profile.html?pet=\${pet.name.toLowerCase()}'" class="w-full py-2 border border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-on-primary transition-colors text-xs sm:text-sm">Meet \${pet.name}</button>
                            </div>
                        </div>
                    \`).join('');
                    
                    // Keep the vet card which is the 3rd child in the grid
                    const vetCard = container.lastElementChild.outerHTML;
                    container.innerHTML = petsHtml + vetCard;
                }
            }).catch(e => console.error(e));

            // 3. Fetch Featured Vet
            fetch('/api/providers').then(r => r.json()).then(data => {
                const container = document.getElementById('featuredVetContainer');
                if(data.providers && data.providers.length > 0) {
                    const vet = data.providers.find(p => p.type === 'Veterinarian') || data.providers[0];
                    container.innerHTML = \`
                        <div class="w-16 sm:w-20 h-16 sm:h-20 bg-white rounded-full mb-3 sm:mb-4 overflow-hidden border-4 border-primary/20">
                            <img class="w-full h-full object-cover" src="\${vet.profile_image_url || 'https://ui-avatars.com/api/?name=Vet'}">
                        </div>
                        <h4 class="font-bold text-base sm:text-lg">Dr. \${vet.user_first_name} \${vet.user_last_name}</h4>
                        <p class="text-xs sm:text-sm opacity-90 mb-3 sm:mb-4">\${vet.specialty || 'Veterinary Surgeon'}</p>
                        <span class="bg-white/20 px-2 sm:px-3 py-1 rounded-full text-xs font-medium mb-4 sm:mb-6">Online Now</span>
                        <button onclick="window.location.href='vet-booking.html'" class="bg-white text-primary px-4 sm:px-6 py-2 rounded-full font-bold text-xs sm:text-sm w-full">Quick Chat</button>
                    \`;
                }
            }).catch(e => console.error(e));

            // 4. Fetch Community Posts
            fetch('/api/community/posts').then(r => r.json()).then(data => {
                const container = document.getElementById('communityHighlightsContainer');
                if(data.posts && data.posts.length > 0) {
                    const postsHtml = data.posts.slice(0, 3).map(post => \`
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center gap-3 mb-4">
                                    <img src="\${post.profile_pic_url || 'https://ui-avatars.com/api/?name=' + post.first_name}" class="w-10 h-10 rounded-full object-cover">
                                    <div>
                                        <h4 class="font-bold text-sm">\${post.first_name} \${post.last_name}</h4>
                                        <p class="text-xs text-slate-500">\${new Date(post.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p class="text-sm text-slate-700 leading-relaxed mb-4">"\${post.content.substring(0, 100)}\${post.content.length > 100 ? '...' : ''}"</p>
                            </div>
                            <div class="flex items-center gap-4 text-slate-400 text-xs">
                                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">favorite</span> \${post.likes_count}</span>
                                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">chat_bubble</span> \${post.comments_count}</span>
                            </div>
                        </div>
                    \`).join('');
                    container.innerHTML = postsHtml;
                }
            }).catch(e => console.error(e));
        } catch(e) {
            console.error('Init error', e);
        }
    }
    document.addEventListener('DOMContentLoaded', initLandingPage);
</script>
</body>`;

c = c.replace(/<\/body>/, script);

fs.writeFileSync('client/src/pages/user.html', c);
