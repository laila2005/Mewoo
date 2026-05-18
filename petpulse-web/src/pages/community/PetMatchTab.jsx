import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PetMatchTab = ({ searchQuery }) => {
    const navigate = useNavigate();
    const [matchPets, setMatchPets] = useState([
        { id: 1, name: 'Max', age: 3, gender: '♂️', breed: 'Golden Retriever', desc: 'Purebred Golden Retriever looking for a mate. Excellent health history, fully vaccinated, and extremely friendly temperament.', type: 'Mating', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400', badge: 'Health Verified' },
        { id: 2, name: 'Bella', age: 1, gender: '♀️', breed: 'Siberian Husky', desc: 'Beautiful Husky ready for adoption. Needs an active owner with a big backyard.', type: 'Adoption', image: 'https://images.unsplash.com/photo-1605568420116-b1de6ce6c096?w=400', badge: 'Vaccinated' }
    ]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPet, setNewPet] = useState({ name: '', age: '', gender: '♂️', breed: '', desc: '', type: 'Mating', image: '' });

    const handleCreateProfile = (e) => {
        e.preventDefault();
        if (!newPet.name || !newPet.breed || !newPet.desc) {
            toast.error("Please fill all required fields!");
            return;
        }

        const newEntry = {
            ...newPet,
            id: Date.now(),
            image: newPet.image || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400', // default fallback
            badge: 'Pending Review'
        };

        setMatchPets([newEntry, ...matchPets]);
        setIsModalOpen(false);
        setNewPet({ name: '', age: '', gender: '♂️', breed: '', desc: '', type: 'Mating', image: '' });
        toast.success("Pet profile created successfully!");
    };

    const handleConnect = (petName) => {
        toast.success(`Opening chat about ${petName}...`);
        navigate('/messages');
    };

    const filtered = matchPets.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.breed.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div>
                    <h3 className="text-pink-600 font-bold text-lg mb-1 flex items-center gap-2"><span className="material-symbols-outlined">favorite</span> Pet Match</h3>
                    <p className="text-pink-700/80 text-sm hidden sm:block">Safe mating connections & verified shelter adoptions.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm shadow-pink-500/30 text-sm whitespace-nowrap active:scale-95"
                >
                    Create Profile
                </button>
            </div>

            {/* Create Profile Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-white">
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-pink-500">add_circle</span> 
                                New Pet Profile
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="petProfileForm" onSubmit={handleCreateProfile} className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Pet Name *</label>
                                        <input required value={newPet.name} onChange={e => setNewPet({...newPet, name: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all" placeholder="e.g. Max" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Age (Years) *</label>
                                        <input required value={newPet.age} onChange={e => setNewPet({...newPet, age: e.target.value})} type="number" min="0" step="0.1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all" placeholder="e.g. 3" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Breed *</label>
                                        <input required value={newPet.breed} onChange={e => setNewPet({...newPet, breed: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all" placeholder="e.g. Golden Retriever" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Gender *</label>
                                        <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1">
                                            <button type="button" onClick={() => setNewPet({...newPet, gender: '♂️'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${newPet.gender === '♂️' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>♂️ Male</button>
                                            <button type="button" onClick={() => setNewPet({...newPet, gender: '♀️'})} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${newPet.gender === '♀️' ? 'bg-pink-100 text-pink-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>♀️ Female</button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Listing Type *</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input type="radio" name="listing_type" checked={newPet.type === 'Mating'} onChange={() => setNewPet({...newPet, type: 'Mating'})} className="peer sr-only" />
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-pink-500 peer-checked:bg-pink-500 transition-colors"></div>
                                                <div className="absolute w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Mating Profile</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input type="radio" name="listing_type" checked={newPet.type === 'Adoption'} onChange={() => setNewPet({...newPet, type: 'Adoption'})} className="peer sr-only" />
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-colors"></div>
                                                <div className="absolute w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">For Adoption</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Profile Image URL</label>
                                    <input value={newPet.image} onChange={e => setNewPet({...newPet, image: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all" placeholder="https://example.com/image.jpg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">About & Description *</label>
                                    <textarea required value={newPet.desc} onChange={e => setNewPet({...newPet, desc: e.target.value})} rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all resize-none" placeholder="Describe personality, health history, and what you are looking for..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button type="submit" form="petProfileForm" className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">publish</span> Post Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <button 
                                onClick={() => handleConnect(pet.name)}
                                className="w-full bg-pink-50 text-pink-600 font-bold py-2.5 rounded-xl text-sm hover:bg-pink-100 transition-colors mt-auto"
                            >
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
