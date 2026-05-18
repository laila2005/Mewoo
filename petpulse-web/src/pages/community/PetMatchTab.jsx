import React from 'react';

const PetMatchTab = ({ searchQuery }) => {
    // Mock data based on the HTML
    const matchPets = [
        { id: 1, name: 'Max', age: 3, gender: '♂️', breed: 'Golden Retriever', desc: 'Purebred Golden Retriever looking for a mate. Excellent health history, fully vaccinated, and extremely friendly temperament.', type: 'Mating', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400', badge: 'Health Verified' },
    ];

    const filtered = matchPets.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.breed.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div>
                    <h3 className="text-pink-600 font-bold text-lg mb-1 flex items-center gap-2"><span className="material-symbols-outlined">favorite</span> Pet Match</h3>
                    <p className="text-pink-700/80 text-sm hidden sm:block">Safe mating connections & verified shelter adoptions.</p>
                </div>
                <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm shadow-pink-500/30 text-sm whitespace-nowrap active:scale-95">
                    Create Profile
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                <button className="px-5 py-2 rounded-full bg-slate-800 text-white text-sm font-semibold whitespace-nowrap shadow-sm">All Profiles</button>
                <button className="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 whitespace-nowrap shadow-sm transition-colors">Mating (Dogs)</button>
                <button className="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 whitespace-nowrap shadow-sm transition-colors">Mating (Cats)</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map(pet => (
                    <div key={pet.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="h-48 relative overflow-hidden group">
                            <img src={pet.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={pet.breed} />
                            <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-pink-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">favorite</span> {pet.type}
                            </span>
                            {pet.badge && (
                                <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">verified</span> {pet.badge}
                                </span>
                            )}
                        </div>
                        <div className="p-5 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 text-lg">{pet.name}, {pet.age} yrs</h4>
                                <span className="text-xl">{pet.gender}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-600 mb-2">{pet.breed}</p>
                            <p className="text-sm text-slate-500 mb-5 leading-relaxed line-clamp-2">{pet.desc}</p>
                            <button className="w-full bg-pink-50 text-pink-600 font-bold py-2.5 rounded-xl text-sm hover:bg-pink-100 transition-colors mt-auto">
                                Connect with Owner
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PetMatchTab;
