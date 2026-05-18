import React from 'react';

const LostFoundTab = ({ searchQuery }) => {
    // Mock data based on the HTML
    const lostPets = [
        { id: 1, name: 'Charlie', breed: 'Beagle', status: 'LOST', location: 'Last seen near Al Rehab City', image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400' }
    ];

    const filtered = lostPets.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.breed.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
                <div>
                    <h3 className="text-amber-800 font-bold text-lg mb-1">Lost & Found Pets</h3>
                    <p className="text-amber-700 text-sm hidden sm:block">Help reunite pets with their families in your area.</p>
                </div>
                <button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm shadow-amber-500/30 text-sm whitespace-nowrap active:scale-95">
                    Report Lost Pet
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map(pet => (
                    <div key={pet.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="h-48 bg-slate-100 relative">
                            <img src={pet.image} className="w-full h-full object-cover" alt={pet.name} />
                            <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{pet.status}</span>
                        </div>
                        <div className="p-5">
                            <h4 className="font-bold text-slate-800 text-lg mb-1">{pet.name} ({pet.breed})</h4>
                            <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">location_on</span> {pet.location}
                            </p>
                            <button className="w-full border-2 border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors">
                                I saw this pet
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LostFoundTab;
