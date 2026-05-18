import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const MOCK_ADOPTIONS = [
    { id: 1, name: 'Luna', type: 'Cat', breed: 'Domestic Shorthair', age: '2 years', gender: 'Female', size: 'Medium', location: 'Maadi Shelter', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&q=80', description: 'Luna is a sweet and gentle soul who loves sunny windows and quiet afternoons. Fully vaccinated and spayed.', ownerId: 'mock_owner2' },
    { id: 2, name: 'Max', type: 'Dog', breed: 'Golden Retriever Mix', age: '10 months', gender: 'Male', size: 'Large', location: 'Heliopolis Rescue', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&q=80', description: 'High energy pup! Max needs an active family with a yard. He is great with kids and other dogs.', ownerId: 'mock_owner1' },
    { id: 3, name: 'Oliver', type: 'Cat', breed: 'Persian', age: '4 years', gender: 'Male', size: 'Small', location: 'Zamalek Paws', image: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500&q=80', description: 'Oliver is a majestic fluffball who prefers a calm, adult-only home. Needs regular grooming.', ownerId: 'mock_owner3' },
    { id: 4, name: 'Bella', type: 'Dog', breed: 'Beagle', age: '3 years', gender: 'Female', size: 'Medium', location: 'New Cairo Center', image: 'https://images.unsplash.com/photo-1537151608804-ea6f117c7608?w=500&q=80', description: 'Bella is very food motivated and already knows basic commands. Perfect companion for daily walks.', ownerId: 'mock_owner4' },
    { id: 5, name: 'Simba', type: 'Cat', breed: 'Ginger Tabby', age: '6 months', gender: 'Male', size: 'Small', location: 'Nasr City Fosters', image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500&q=80', description: 'Playful kitten! Simba is extremely affectionate and loves to cuddle at night.', ownerId: 'mock_owner2' },
    { id: 6, name: 'Rocky', type: 'Dog', breed: 'German Shepherd', age: '2 years', gender: 'Male', size: 'Large', location: 'Maadi Shelter', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&q=80', description: 'Loyal and protective. Rocky requires an experienced owner who can continue his obedience training.', ownerId: 'mock_owner1' }
];

const Adoption = () => {
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    const filteredPets = MOCK_ADOPTIONS.filter(pet => {
        const matchesType = filterType === 'All' || pet.type === filterType;
        const matchesSearch = pet.name.toLowerCase().includes(searchQuery.toLowerCase()) || pet.breed.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleAdoptClick = (ownerId) => {
        if (!user) {
            toast.error('Please log in to contact shelters.');
            navigate('/login');
            return;
        }
        navigate(`/owner-profile?id=${ownerId}`);
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-600 pt-32 pb-24 px-6 relative overflow-hidden">
                <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Find Your New Best Friend</h1>
                    <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">Give a rescue pet a second chance at love. Browse our network of local shelters and foster homes in Egypt.</p>
                    
                    {/* Search Bar */}
                    <div className="bg-white p-2 rounded-2xl flex max-w-2xl mx-auto shadow-xl">
                        <div className="flex-1 flex items-center px-4">
                            <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
                            <input 
                                type="text" 
                                placeholder="Search breeds or names..." 
                                className="w-full bg-transparent border-none focus:ring-0 outline-none py-3 text-slate-800"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <svg className="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
                </svg>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-12 -mt-10 relative z-20">
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-10 justify-center">
                    {['All', 'Dog', 'Cat'].map(type => (
                        <button 
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-8 py-3 rounded-full font-bold transition-all shadow-sm ${filterType === type ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        >
                            {type === 'All' ? 'All Pets' : `${type}s`}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {filteredPets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPets.map(pet => (
                            <div key={pet.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col">
                                <div className="relative h-64 overflow-hidden">
                                    <img src={pet.image} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-slate-700 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px] text-emerald-500">vaccines</span> Vaccinated
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-12">
                                        <h2 className="text-2xl font-bold text-white mb-1">{pet.name}</h2>
                                        <p className="text-white/90 text-sm font-medium">{pet.breed}</p>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="grid grid-cols-3 gap-2 mb-6">
                                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Age</p>
                                            <p className="text-sm font-bold text-slate-700">{pet.age}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Gender</p>
                                            <p className="text-sm font-bold text-slate-700">{pet.gender}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Size</p>
                                            <p className="text-sm font-bold text-slate-700">{pet.size}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">{pet.description}</p>
                                    
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                                            <span className="text-sm font-medium">{pet.location}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAdoptClick(pet.ownerId)}
                                            className="px-6 py-2.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl font-bold text-sm transition-colors"
                                        >
                                            Meet {pet.name}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">pets</span>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No pets found</h3>
                        <p className="text-slate-500">Try adjusting your filters or search terms.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Adoption;
