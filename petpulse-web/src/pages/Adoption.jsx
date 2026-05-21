import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Adoption = () => {
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPets = async () => {
            try {
                const res = await axios.get(`${API_BASE}/pets/adoptable`);
                setPets(res.data.pets || []);
            } catch (err) {
                console.error('Failed to fetch adoptable pets:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPets();
    }, []);

    const filteredPets = pets.filter(pet => {
        const matchesType = filterType === 'All' || pet.species === filterType;
        const matchesSearch = !searchQuery || (pet.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (pet.breed || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleAdoptClick = (petId) => {
        if (!user) {
            toast.error('Please log in to adopt.');
            navigate('/login');
            return;
        }
        navigate(`/pet-profile?id=${petId}`);
    };

    const adoptionSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "PetPulse Pet Adoption Network",
        "description": "Give a rescue dog, cat, or bird a forever home. Connect with shelter rescue services in Egypt.",
        "url": "https://petpulse-web.vercel.app/adoption"
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <SEO 
                title="Adopt a Pet & Save Lives"
                description="Browse adoptable dogs, puppies, cats, kittens, and other pets in Cairo and Giza. Direct matching with foster homes and local Egyptian animal shelters."
                keywords="adopt dog cairo, adopt cat egypt, rescue puppies cairo, pet rehoming egypt, shelter matching, petpulse"
                schema={adoptionSchema}
            />
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
                                    <img src={pet.avatar_url || `https://ui-avatars.com/api/?name=${pet.name}&background=dbeafe&color=2563eb&size=400`} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-slate-700 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px] text-emerald-500">vaccines</span> Vaccinated
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-12">
                                        <h2 className="text-2xl font-bold text-white mb-1">{pet.name}</h2>
                                        <p className="text-white/90 text-sm font-medium">{pet.breed || 'Mixed Breed'}</p>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="grid grid-cols-3 gap-2 mb-6">
                                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Age</p>
                                            <p className="text-sm font-bold text-slate-700">{pet.age_years !== null ? `${pet.age_years} yrs` : 'Unknown'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Gender</p>
                                            <p className="text-sm font-bold text-slate-700 capitalize">{pet.gender || 'Unknown'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                                            <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Weight</p>
                                            <p className="text-sm font-bold text-slate-700">{pet.weight_kg ? `${pet.weight_kg} kg` : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">{pet.bio || pet.adoption_description || 'No description provided.'}</p>
                                    
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                                            <span className="text-sm font-medium">{pet.location || 'Egypt'}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAdoptClick(pet.id)}
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
