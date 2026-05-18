import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const MOCK_PETS = {
    'mock_milo': { id: 'mock_milo', name: 'Milo', breed: 'Mixed', age_years: 2, species: 'Dog', weight_kg: 12, bio: 'Calm & Loving puppy. Very playful and loves treats.', avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIYDqvNenCMOIcovCc3-8JiqPFIFVMge8QT3kBMGgY00RFtQZz36_5xeoOW6u0MeSzrPwrScDyyg5-PmQsx0vDvS33gAEL7AofIxjdu2mkHYU3JR6laFwWrOF-E9R5GDlnQPOBWNtOfKufF4lhgc4Dwztk2BpH4JSL_NInA1FCEUwfhpqx9AKWHdhOoGlYnSN3rtBpm1mrdIVYyiV4T5xAXLW--qQXHJOKiNqx3S0y0vDyaF70Yd0s8d8OeXirjFs5OhSGas3ruxiK', owner_id: 'mock_owner1', owner_first_name: 'John', owner_last_name: 'Doe' },
    'mock_luna': { id: 'mock_luna', name: 'Luna', breed: 'Tuxedo', age_years: 0.5, species: 'Cat', weight_kg: 3, bio: 'Energetic and curious kitten. Always exploring.', avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1HTaaBQPg3n_nYf7w6etlvKrVwf6dxEoFOZAPH95jlQc0X8myrLHYV0YL5Tjo0PUsuMLUWa_wz6B-FWk6aw_x0e2Y7Gt3afAJ-B-ZQbm9wvnJhqYFndgXfVSblSmxeC_6YPpgL9xIOClSCE8MnmBWbd-JVD25BfeKNsA2ALnh4F-E4L3LurtCfYQ7drMMb8AFlDhQhAgC_K1MwBGFKPVHsC4M8MgOQETv_vWP2OkI26iXeggtM98IefRiHj22amdfkyzpMNZEBBXd', owner_id: 'mock_owner2', owner_first_name: 'Sarah', owner_last_name: 'Smith' },
    'mock_charlie': { id: 'mock_charlie', name: 'Charlie', breed: 'Beagle', age_years: 3, species: 'Dog', weight_kg: 15, bio: 'Loves long walks and sniffing everything in sight.', avatar_url: 'https://images.unsplash.com/photo-1537151608804-ea6f117c7608?w=400', owner_id: 'mock_owner3', owner_first_name: 'Mike', owner_last_name: 'Johnson' },
    'mock_bella': { id: 'mock_bella', name: 'Bella', breed: 'Domestic Shorthair', age_years: 1, species: 'Cat', weight_kg: 4, bio: 'Sweet, cuddly, and loves to nap in sunbeams.', avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', owner_id: 'mock_owner4', owner_first_name: 'Emily', owner_last_name: 'Davis' }
};

const PetProfile = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const petId = searchParams.get('id') || searchParams.get('pet');

    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chatStatus, setChatStatus] = useState(null);
    const [adoptStatus, setAdoptStatus] = useState(null);
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        const loadPet = async () => {
            if (!petId) { setLoading(false); return; }

            const mockPetKey = petId.toLowerCase();
            // Map common names to mock IDs if necessary
            const idToUse = ['milo', 'luna', 'charlie', 'bella'].includes(mockPetKey) ? `mock_${mockPetKey}` : petId;

            if (MOCK_PETS[idToUse]) {
                setPet(MOCK_PETS[idToUse]);
                setLoading(false);
            } else {
                try {
                    const res = await axios.get(`${API_BASE}/pets/${petId}`);
                    setPet(res.data.pet);
                } catch (error) {
                    console.error("Failed to load pet", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        loadPet();
    }, [petId]);

    useEffect(() => {
        const checkStatuses = async () => {
            if (!pet || !token || String(pet.owner_id).startsWith('mock_')) return;
            
            try {
                const headers = { Authorization: `Bearer ${token}` };
                
                // Check Chat
                const chatRes = await axios.get(`${API_BASE}/chat/status?receiver_id=${pet.owner_id}`, { headers });
                setChatStatus(chatRes.data.status);

                // Check Adopt
                const adoptRes = await axios.get(`${API_BASE}/chat/status?receiver_id=${pet.owner_id}&pet_id=${pet.id}`, { headers });
                setAdoptStatus(adoptRes.data.status);
            } catch (error) {
                console.error("Failed to check status", error);
            }
        };

        if (pet && user && user.id !== pet.owner_id) {
            checkStatuses();
        }
    }, [pet, token, user]);

    const handleChatRequest = async () => {
        if (!user) { toast.error('Please login first'); navigate('/login'); return; }
        if (isRequesting) return;

        if (String(pet.owner_id).startsWith('mock_')) {
            toast.success('Mock chat request sent!');
            setChatStatus('pending');
            return;
        }

        setIsRequesting(true);
        try {
            await axios.post(`${API_BASE}/chat/request`, { receiver_id: pet.owner_id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Chat request sent!');
            setChatStatus('pending');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send request');
        } finally {
            setIsRequesting(false);
        }
    };

    const handleAdoptRequest = async () => {
        if (!user) { toast.error('Please login first'); navigate('/login'); return; }
        if (isRequesting) return;

        if (String(pet.owner_id).startsWith('mock_')) {
            toast.success('Mock adoption request sent!');
            setAdoptStatus('pending');
            return;
        }

        setIsRequesting(true);
        try {
            await axios.post(`${API_BASE}/chat/request`, { 
                receiver_id: pet.owner_id,
                pet_id: pet.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Adoption application submitted!');
            setAdoptStatus('pending');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit application');
        } finally {
            setIsRequesting(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading pet profile...</div>;
    }

    if (!pet) {
        return (
            <div className="text-center py-20">
                <span className="material-symbols-outlined text-5xl text-slate-300 block mb-4">pets</span>
                <h2 className="text-xl font-bold text-slate-800">Pet Not Found</h2>
                <p className="text-slate-500 mt-2 mb-6">We couldn't find the pet you're looking for.</p>
                <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Go Back</button>
            </div>
        );
    }

    const isOwner = user && user.id === pet.owner_id;

    return (
        <div className="bg-slate-50 min-h-screen py-12 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-8">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="md:w-1/2 h-80 md:h-auto relative">
                        <img src={pet.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'} alt={pet.name} className="w-full h-full object-cover" />
                        <div className={`absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold shadow-sm ${pet.species?.toLowerCase() === 'cat' ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {pet.species || 'Pet'}
                        </div>
                    </div>
                    
                    {/* Details */}
                    <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-between">
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{pet.name}</h1>
                            <p className="text-slate-500 text-lg mb-6">{pet.breed || 'Mixed'} • {pet.age_years ? `${pet.age_years} Years` : 'Age Unknown'}</p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="flex items-center gap-3 sm:gap-4 bg-blue-50/50 p-3 sm:p-4 rounded-2xl border border-blue-100/50">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">category</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-blue-500/80 font-bold uppercase tracking-wider mb-0.5">Species</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.species}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 bg-amber-50/50 p-3 sm:p-4 rounded-2xl border border-amber-100/50">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">pets</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mb-0.5">Breed</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.breed || 'Mixed'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 bg-emerald-50/50 p-3 sm:p-4 rounded-2xl border border-emerald-100/50">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">cake</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider mb-0.5">Age</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.age_years ? `${pet.age_years} yrs` : 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 bg-purple-50/50 p-3 sm:p-4 rounded-2xl border border-purple-100/50">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">scale</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-purple-500/80 font-bold uppercase tracking-wider mb-0.5">Weight</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.weight_kg ? `${pet.weight_kg} kg` : '--'}</p>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-3">About me</h3>
                            <p className="text-slate-600 leading-relaxed">{pet.bio || 'No bio provided.'}</p>
                        </div>

                        {!isOwner && (
                            <div className="mt-8 border-t border-slate-100 pt-8">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Meet the Owner</h3>
                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <Link to={`/owner-profile?id=${pet.owner_id}`} className="flex items-center gap-4 group cursor-pointer">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl overflow-hidden shadow-sm group-hover:ring-2 group-hover:ring-blue-600 transition-all">
                                            {pet.owner_first_name ? pet.owner_first_name[0].toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{pet.owner_first_name} {pet.owner_last_name}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> View Profile</p>
                                        </div>
                                    </Link>
                                    
                                    {chatStatus === 'pending' ? (
                                        <button disabled className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-not-allowed">
                                            <span className="material-symbols-outlined text-[18px]">schedule</span> Pending
                                        </button>
                                    ) : chatStatus === 'accepted' ? (
                                        <button onClick={() => navigate(`/messages?user=${pet.owner_id}`)} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">chat</span> Open Chat
                                        </button>
                                    ) : (
                                        <button onClick={handleChatRequest} disabled={isRequesting} className="bg-white border border-slate-200 hover:border-blue-600 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50">
                                            <span className="material-symbols-outlined text-[18px]">{isRequesting ? 'sync' : 'chat'}</span>
                                            {isRequesting ? 'Sending...' : 'Message'}
                                        </button>
                                    )}
                                </div>

                                <div className="mt-8">
                                    {adoptStatus === 'pending' ? (
                                        <button disabled className="w-full bg-slate-100 text-slate-400 py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                                            <span className="material-symbols-outlined text-[20px]">schedule</span> Application Pending
                                        </button>
                                    ) : adoptStatus === 'accepted' ? (
                                        <button disabled className="w-full bg-emerald-100 text-emerald-700 py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                                            <span className="material-symbols-outlined text-[20px]">check_circle</span> Application Accepted
                                        </button>
                                    ) : (
                                        <button onClick={handleAdoptRequest} disabled={isRequesting} className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50">
                                            <span className="material-symbols-outlined text-[20px]">{isRequesting ? 'sync' : 'volunteer_activism'}</span>
                                            {isRequesting ? 'Processing...' : `Adopt ${pet.name}`}
                                        </button>
                                    )}
                                    <p className="text-center text-xs text-slate-400 mt-4">Adoption process is managed securely by PetPulse.</p>
                                </div>
                            </div>
                        )}
                        {isOwner && (
                             <div className="mt-8 border-t border-slate-100 pt-8 text-center">
                                 <p className="text-slate-500 font-bold">This is your pet profile.</p>
                                 <button onClick={() => navigate('/edit-profile')} className="mt-4 border border-slate-200 px-6 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors">Edit Pet Details</button>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PetProfile;
