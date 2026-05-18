import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const AdoptionsTab = ({ searchQuery }) => {
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdoptions = async () => {
            try {
                const res = await axios.get(`${API_BASE}/pets/adoptable`);
                setPets(res.data.pets || []);
            } catch (error) {
                console.error("Failed to fetch adoptable pets", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAdoptions();
    }, []);

    const filtered = pets.filter(p => 
        !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.breed && p.breed.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
                <div>
                    <h3 className="text-emerald-800 font-bold text-lg mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined">volunteer_activism</span> Adoption Center
                    </h3>
                    <p className="text-emerald-700 text-sm hidden sm:block">Find your new best friend from our shelter partners.</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading adoptable pets...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">pets</span>
                    <p className="text-slate-600 font-semibold mb-1">No pets found</p>
                    <p className="text-sm text-slate-400">We couldn't find any adoptable pets matching your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(p => (
                        <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                            <Link to={`/pet-profile?id=${p.id}`} className="h-48 relative cursor-pointer block overflow-hidden group">
                                <img 
                                    src={p.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    alt={p.name} 
                                />
                                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-emerald-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                    {p.species}
                                </span>
                            </Link>
                            <div className="p-5 flex flex-col flex-1">
                                <h4 className="font-bold text-slate-800 text-lg mb-1">{p.name}</h4>
                                <p className="text-sm font-medium text-slate-500 mb-4">{p.breed || 'Mixed'} • {p.age_years || '?'} yrs</p>
                                <div className="mt-auto">
                                    <Link to={`/pet-profile?id=${p.id}`} className="block text-center w-full bg-emerald-50 text-emerald-700 font-bold py-2.5 rounded-xl text-sm hover:bg-emerald-100 transition-colors">
                                        View & Adopt
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdoptionsTab;
