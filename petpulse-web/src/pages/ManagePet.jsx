import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const ManagePet = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const petId = searchParams.get('id');

    const [pet, setPet] = useState({
        name: '',
        species: 'Dog',
        breed: '',
        age_years: '',
        weight_kg: '',
        bio: '',
        is_adoptable: false,
        is_mating: false,
        avatar_url: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!petId) {
            toast.error('No pet specified.');
            navigate('/profile');
            return;
        }
        if (!token) return;

        if (petId === 'new') {
            setLoading(false);
            return;
        }

        const fetchPet = async () => {
            try {
                const res = await axios.get(`${API_BASE}/pets/${petId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.pet) {
                    setPet({
                        ...res.data.pet,
                        age_years: res.data.pet.age_years || '',
                        weight_kg: res.data.pet.weight_kg || '',
                        bio: res.data.pet.bio || '',
                        is_adoptable: !!res.data.pet.is_adoptable,
                        is_mating: !!res.data.pet.is_mating
                    });
                }
            } catch (error) {
                console.error("Failed to load pet", error);
                toast.error('Error loading pet data.');
                navigate('/profile');
            } finally {
                setLoading(false);
            }
        };

        fetchPet();
    }, [petId, token, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPet(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: pet.name,
                species: pet.species,
                breed: pet.breed,
                age_years: pet.age_years || null,
                weight_kg: pet.weight_kg || null,
                bio: pet.bio,
                is_adoptable: pet.is_adoptable,
                is_mating: pet.is_mating
            };
            
            if (petId === 'new') {
                await axios.post(`${API_BASE}/pets`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Pet created successfully!');
                navigate('/profile');
            } else {
                await axios.put(`${API_BASE}/pets/${petId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Pet updated successfully!');
            }
        } catch (error) {
            toast.error(petId === 'new' ? 'Failed to create pet.' : 'Failed to update pet.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you absolutely sure you want to delete this pet profile? This cannot be undone.')) return;
        
        try {
            await axios.delete(`${API_BASE}/pets/${petId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Pet deleted.');
            navigate('/profile');
        } catch (error) {
            toast.error('Failed to delete pet.');
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading Pet Data...</div>;
    }

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] pt-12 pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                
                <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-8">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to Profile
                </button>

                <div className="flex items-center gap-6 mb-8">
                    <div className="relative group cursor-pointer">
                        <img 
                            src={pet.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=d4e3ff&color=005da7`} 
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-slate-100 transition-opacity group-hover:opacity-80"
                            alt={pet.name} 
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">photo_camera</span>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{petId === 'new' ? 'Create Pet Profile' : `Manage ${pet.name}`}</h1>
                        <p className="text-slate-500 mt-1">{petId === 'new' ? 'Add your furry friend to the PetPulse community.' : 'Update details, toggles, and privacy for this pet.'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Details Form */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">edit_document</span>
                                General Details
                            </h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Pet Name *</label>
                                    <input name="name" value={pet.name} onChange={handleChange} type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Species *</label>
                                        <select name="species" value={pet.species} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all">
                                            <option value="Dog">Dog</option>
                                            <option value="Cat">Cat</option>
                                            <option value="Bird">Bird</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Breed</label>
                                        <input name="breed" value={pet.breed} onChange={handleChange} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Age (Years)</label>
                                        <input name="age_years" value={pet.age_years} onChange={handleChange} type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Weight (kg)</label>
                                        <input name="weight_kg" value={pet.weight_kg} onChange={handleChange} type="number" min="0" step="0.1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Pet Bio</label>
                                    <textarea name="bio" value={pet.bio} onChange={handleChange} rows="4" placeholder="Tell the community about your pet..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none"></textarea>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button type="submit" disabled={saving} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span> 
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Settings & Danger Zone */}
                    <div className="space-y-6">
                        {/* Toggles */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600">public</span>
                                Visibility Toggles
                            </h2>
                            
                            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                                <div>
                                    <p className="font-bold text-sm text-slate-800">Up for Adoption</p>
                                    <p className="text-[11px] text-slate-500 mt-1">List this pet on the adoption board.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_adoptable" checked={pet.is_adoptable} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-sm text-slate-800">Available for Mating</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Show on the breeding matching list.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_mating" checked={pet.is_mating} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        {petId !== 'new' && (
                            <div className="bg-red-50 rounded-2xl p-6 border border-red-100 shadow-sm">
                                <h2 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined">warning</span>
                                    Danger Zone
                                </h2>
                                <p className="text-sm text-red-600 mb-5">Once you delete a pet, there is no going back. Please be certain.</p>
                                <button onClick={handleDelete} className="w-full bg-white border-2 border-red-200 text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex justify-center items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">delete_forever</span> Delete Pet Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagePet;
