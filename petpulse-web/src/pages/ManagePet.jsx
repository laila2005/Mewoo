import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BackButton from '../components/common/BackButton';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

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
    const [vaccinations, setVaccinations] = useState([]);
    const [vaxForm, setVaxForm] = useState({ vaccine_name: '', given_at: '', due_at: '' });
    const [addingVax, setAddingVax] = useState(false);

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

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }

        const toastId = toast.loading('Uploading avatar...');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'PetPluse');
            formData.append('folder', 'petpulse/pets');

            const cloudRes = await axios.post(`${API_BASE}/upload/cloudinary`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const secureUrl = cloudRes.data.secure_url;

            setPet(prev => ({
                ...prev,
                avatar_url: secureUrl
            }));
            toast.success('Avatar uploaded successfully!', { id: toastId });
        } catch (error) {
            console.error("Avatar upload failed:", error);
            toast.error('Failed to upload avatar.', { id: toastId });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: pet.name,
                species: pet.species,
                breed: pet.breed || null,
                age_years: pet.age_years || null,
                weight_kg: pet.weight_kg || null,
                bio: pet.bio || null,
                is_adoptable: pet.is_adoptable,
                is_mating: pet.is_mating,
                avatar_url: pet.avatar_url || null
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

    const loadVaccinations = async () => {
        if (!petId || petId === 'new' || !token) return;
        try {
            const res = await axios.get(`${API_BASE}/pets/${petId}/vaccinations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVaccinations(res.data.vaccinations || []);
        } catch (error) {
            console.warn('Could not load vaccinations', error?.message);
        }
    };

    useEffect(() => { loadVaccinations(); /* eslint-disable-next-line */ }, [petId, token]);

    const handleAddVaccination = async (e) => {
        e.preventDefault();
        if (!vaxForm.vaccine_name.trim()) { toast.error('Enter a vaccine or treatment name.'); return; }
        setAddingVax(true);
        try {
            await axios.post(`${API_BASE}/pets/${petId}/vaccinations`, {
                vaccine_name: vaxForm.vaccine_name.trim(),
                given_at: vaxForm.given_at || null,
                due_at: vaxForm.due_at || null,
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Saved — you'll get a reminder before it's due.");
            setVaxForm({ vaccine_name: '', given_at: '', due_at: '' });
            loadVaccinations();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Could not save vaccination.');
        } finally {
            setAddingVax(false);
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
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] pt-4 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                
                <BackButton className="mb-8" label="Back to Profile" to="/profile" />

                <div className="flex items-center gap-6 mb-8">
                    <div onClick={() => document.getElementById('petAvatarInput').click()} className="relative group cursor-pointer">
                        <img 
                            src={pet.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=d4e3ff&color=005da7`} 
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-slate-100 transition-opacity group-hover:opacity-80"
                            alt={pet.name} 
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">photo_camera</span>
                        </div>
                    </div>
                    <input 
                        id="petAvatarInput" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload} 
                    />
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{petId === 'new' ? 'Create Pet Profile' : `Manage ${pet.name}`}</h1>
                        <p className="text-slate-500 mt-1">{petId === 'new' ? 'Add your furry friend to the PetPluse community.' : 'Update details, toggles, and privacy for this pet.'}</p>
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

                        {/* Vaccinations & Deworming — real records that feed reminders */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600">vaccines</span>
                                Vaccinations & Deworming
                            </h2>
                            <p className="text-xs text-slate-500 mb-5">Log a shot or treatment and PetPluse will remind you (in-app + email) before the next one is due.</p>

                            {petId === 'new' ? (
                                <div className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-4">Save the pet profile first, then you can add vaccination dates here.</div>
                            ) : (
                                <>
                                    {vaccinations.length > 0 ? (
                                        <ul className="space-y-2 mb-5">
                                            {vaccinations.map(v => {
                                                const due = v.due_at ? new Date(v.due_at) : null;
                                                const overdue = due && due < new Date();
                                                const soon = due && !overdue && (due - new Date()) < 14 * 86400000;
                                                return (
                                                    <li key={v.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{v.vaccine_name}</p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {v.given_at ? `Given ${new Date(v.given_at).toLocaleDateString()} · ` : ''}Due {due ? due.toLocaleDateString() : '—'}
                                                            </p>
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : soon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {overdue ? 'Overdue' : soon ? 'Due soon' : 'On track'}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-400 mb-5">No vaccinations logged yet.</p>
                                    )}

                                    <form onSubmit={handleAddVaccination} className="space-y-3 border-t border-slate-100 pt-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Vaccine / treatment</label>
                                            <input list="vax-presets" value={vaxForm.vaccine_name} onChange={e => setVaxForm(f => ({ ...f, vaccine_name: e.target.value }))} placeholder="e.g. Rabies, Parvovirus, Deworming" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none transition-all" />
                                            <datalist id="vax-presets">
                                                <option value="Rabies" /><option value="Parvovirus" /><option value="Distemper" /><option value="Bordetella" /><option value="Deworming" /><option value="Flea & Tick" />
                                            </datalist>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Date given</label>
                                                <input type="date" value={vaxForm.given_at} onChange={e => setVaxForm(f => ({ ...f, given_at: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Next due <span className="text-slate-400 font-normal">(optional)</span></label>
                                                <input type="date" value={vaxForm.due_at} onChange={e => setVaxForm(f => ({ ...f, due_at: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none" />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400">Leave “next due” blank and we’ll set it automatically (deworming +3 months, vaccines +1 year).</p>
                                        <div className="flex justify-end">
                                            <button type="submit" disabled={addingVax} className="bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
                                                <span className="material-symbols-outlined text-[18px]">{addingVax ? 'sync' : 'add'}</span>
                                                {addingVax ? 'Saving…' : 'Add record'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
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
