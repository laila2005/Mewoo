import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import BackButton from '../components/common/BackButton';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

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
    const [imageError, setImageError] = useState(false);

    // Adoption applications states for pet owners
    const [applications, setApplications] = useState([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [showMeetupModal, setShowMeetupModal] = useState(null);
    const [meetupForm, setMeetupForm] = useState({
        date: '',
        time: '',
        location: 'Maadi',
        customLocation: '',
        instructions: ''
    });

    const [showDeclineModal, setShowDeclineModal] = useState(null);
    const [declineReasonPreset, setDeclineReasonPreset] = useState('Your home environment or lifestyle is not a fit for this pet\'s specific requirements.');
    const [declineReasonCustom, setDeclineReasonCustom] = useState('');
    const [submittingDecline, setSubmittingDecline] = useState(false);

    const isOwner = user && pet && String(user.id) === String(pet.owner_id);

    const fetchApplications = async () => {
        if (!token || !petId || String(petId).startsWith('mock_')) return;
        try {
            setLoadingApps(true);
            const res = await axios.get(`${API_BASE}/adoptions/pet/${petId}/applications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApplications(res.data.applications || []);
        } catch (error) {
            console.error("Failed to load applications for pet", error);
        } finally {
            setLoadingApps(false);
        }
    };

    const handleUpdateApplicationStatus = async (appId, newStatus, rejectionReason = null) => {
        try {
            const payload = { status: newStatus };
            if (newStatus === 'rejected' && rejectionReason) {
                payload.rejection_reason = rejectionReason;
            }
            await axios.put(`${API_BASE}/adoptions/${appId}/status`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Application ${newStatus === 'approved' ? 'approved ✓' : 'declined'} successfully!`);
            fetchApplications();
        } catch (error) {
            console.error("Failed to update application status", error);
            toast.error(error.response?.data?.error || "Failed to update status");
        }
    };

    const handleStartChatFromProfile = async (applicantId, applicantFirstName, applicantLastName, applicantAvatar, petName, customMessage = null) => {
        if (!user) return;
        
        const messageToSend = customMessage || `Hi ${applicantFirstName}! I received your adoption application for ${petName}. 🐾 Let's coordinate here.`;
        
        try {
            await axios.post(`${API_BASE}/chat/request`, { receiver_id: applicantId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.log("Chat connection already exists or request already sent:", err);
        }

        navigate('/messages', {
            state: {
                chatUser: {
                    id: applicantId,
                    first_name: applicantFirstName,
                    last_name: applicantLastName,
                    profile_pic_url: applicantAvatar,
                    role: 'owner'
                },
                initialMessage: messageToSend
            }
        });
    };

    const handleScheduleMeetup = async (e) => {
        e.preventDefault();
        if (!showMeetupModal) return;
        
        const app = showMeetupModal;
        const meetingLocation = meetupForm.location === 'Custom' ? meetupForm.customLocation : meetupForm.location;
        
        if (!meetupForm.date || !meetupForm.time || !meetingLocation) {
            toast.error("Please fill in all meetup details");
            return;
        }

        const meetupMessage = `📅 *ADOPTION MEETUP PROPOSAL* 📅\n` +
            `Hello ${app.first_name}! I have reviewed your adoption request for ${pet.name} and would love to meet up. Here are the proposed details:\n\n` +
            `🗓️ *Date:* ${meetupForm.date}\n` +
            `⏰ *Time:* ${meetupForm.time}\n` +
            `📍 *Location:* ${meetingLocation}\n` +
            `${meetupForm.instructions ? `📝 *Instructions:* ${meetupForm.instructions}\n` : ''}\n` +
            `Let me know if this works for you! 🐾`;

        toast.success("Meetup plan generated! Directing you to chat to coordinate.");
        setShowMeetupModal(null);
        setMeetupForm({ date: '', time: '', location: 'Maadi', customLocation: '', instructions: '' });

        if (app.status === 'pending') {
            try {
                await axios.put(`${API_BASE}/adoptions/${app.id}/status`, { status: 'approved' }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Auto approval failed on meetup coordinate", err);
            }
        }

        handleStartChatFromProfile(app.applicant_id, app.first_name, app.last_name, app.profile_pic_url, pet.name, meetupMessage);
    };

    useEffect(() => {
        if (isOwner) {
            fetchApplications();
        }
    }, [isOwner, petId, token]);

    useEffect(() => {
        const loadPet = async () => {
            setImageError(false);
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

    const getPetAvatar = () => {
        if (!pet) return '';
        const isDogPlaceholder = pet.avatar_url && pet.avatar_url.includes('1543466835-00a7907e9de1');
        const hasPlaceholder = !pet.avatar_url || isDogPlaceholder;
        
        if (hasPlaceholder) {
            if (pet.species?.toLowerCase() === 'cat') {
                return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600';
            } else {
                return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600';
            }
        }
        return pet.avatar_url;
    };

    const getVaccinations = () => {
        if (!pet) return [];
        const species = pet.species?.toLowerCase() || 'dog';
        const currentYear = new Date().getFullYear();
        
        if (species === 'cat') {
            return [
                { name: 'FVRCP', status: 'Up to date', date: `Next: Sep ${currentYear + 1}` },
                { name: 'FeLV (Feline Leukemia)', status: 'Up to date', date: `Next: Nov ${currentYear + 1}` },
                { name: 'Rabies', status: 'Up to date', date: `Next: Jul ${currentYear + 2}` }
            ];
        } else if (species === 'dog') {
            return [
                { name: 'Rabies', status: 'Up to date', date: `Next: Oct ${currentYear + 1}` },
                { name: 'DHPP (Distemper/Parvo)', status: 'Up to date', date: `Next: Dec ${currentYear + 1}` },
                { name: 'Bordetella', status: 'Up to date', date: `Next: Aug ${currentYear + 1}` }
            ];
        } else {
            return [
                { name: 'Annual Wellness Exam', status: 'Up to date', date: `Next: Jun ${currentYear + 1}` },
                { name: 'Parasite Prevention', status: 'Up to date', date: `Next: Sep ${currentYear + 1}` }
            ];
        }
    };

    const getWeightHistory = () => {
        if (!pet) return { hasWeight: false, data: [] };
        const currentWeight = parseFloat(pet.weight_kg) || 0;
        
        const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonthIdx = new Date().getMonth();
        
        const months = [];
        for (let i = 4; i >= 0; i--) {
            const idx = (currentMonthIdx - i + 12) % 12;
            months.push(allMonths[idx]);
        }
        
        if (currentWeight === 0) {
            return { hasWeight: false, data: [] };
        }
        
        const data = [];
        const baseWeight = currentWeight * 0.85; 
        for (let i = 0; i < 5; i++) {
            const progress = i / 4; 
            const weightVal = baseWeight + (currentWeight - baseWeight) * progress * (1 - 0.03 * (4 - i));
            data.push({
                month: months[i],
                weight: parseFloat(Math.min(weightVal, currentWeight).toFixed(2)),
                heightPct: Math.round(50 + 40 * (i / 4))
            });
        }
        
        data[4].weight = currentWeight;
        data[4].heightPct = 90;
        
        return { hasWeight: true, data };
    };

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
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold">Loading pet profile…</p>
            </div>
        );
    }

    if (!pet) {
        // Distinguish "arrived here with no pet chosen" from "the requested pet couldn't be loaded".
        const noPetSelected = !petId;
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#f8faf9]">
                <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_15px_50px_rgba(0,0,0,0.05)] p-8 sm:p-10 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-5">
                        <span className="material-symbols-outlined text-blue-500 text-[40px]">
                            {noPetSelected ? 'pets' : 'search_off'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                        {noPetSelected ? 'No pet selected' : 'Pet not found'}
                    </h2>
                    <p className="text-slate-500 mt-2 leading-relaxed">
                        {noPetSelected
                            ? 'Choose a pet to see its profile — browse pets up for adoption or explore the community.'
                            : "We couldn't load this pet. It may have been removed, or the link is incorrect."}
                    </p>
                    <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate('/community')}
                            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl shadow-sm shadow-blue-600/20 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">pets</span> Browse Pets
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-5 py-3 rounded-2xl active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">home</span> Go Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#f8faf9] min-h-screen py-12 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                
                <BackButton className="mb-8" to="/community" />

                <div className="bg-white rounded-[32px] shadow-[0_15px_50px_rgba(0,0,0,0.03)] border border-slate-200/60 overflow-hidden flex flex-col md:flex-row">
                    {/* Image */}
                    {(() => {
                        const isCat = pet.species?.toLowerCase() === 'cat';
                        const isDog = pet.species?.toLowerCase() === 'dog';
                        const hasInvalidAvatar = !pet.avatar_url || 
                            (typeof pet.avatar_url === 'string' && 
                             (!pet.avatar_url.startsWith('http') && !pet.avatar_url.startsWith('/') && !pet.avatar_url.startsWith('data:')) ||
                             pet.avatar_url.includes('1543466835-00a7907e9de1') || 
                             pet.avatar_url.includes('1514888286974-6c03e2ca1dba')
                            );

                        return (hasInvalidAvatar || imageError) ? (
                            <div className={`md:w-1/2 min-h-[380px] md:min-h-[500px] relative overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 self-stretch transition-all ${
                                isCat 
                                    ? 'bg-gradient-to-tr from-violet-700 via-purple-600 to-pink-600' 
                                    : isDog
                                        ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-rose-500'
                                        : 'bg-gradient-to-tr from-emerald-700 via-teal-600 to-cyan-600'
                            }`}>
                                {/* Glowing ambient elements */}
                                <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl animate-pulse"></div>
                                <div className="absolute -left-16 -top-16 w-40 h-40 rounded-full bg-white/10 blur-xl"></div>
                                
                                {/* Decorative background icons */}
                                <div className="absolute inset-0 opacity-20 pointer-events-none">
                                    <span className="material-symbols-outlined absolute top-12 left-16 text-white text-[24px] animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '4s' }}>pets</span>
                                    <span className="material-symbols-outlined absolute bottom-16 right-20 text-white text-[28px] animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '5s' }}>favorite</span>
                                    <span className="material-symbols-outlined absolute top-20 right-16 text-white text-[20px] animate-pulse">sparkles</span>
                                </div>

                                {/* Center avatar graphic */}
                                <div className="flex flex-col items-center text-center relative z-10 p-6 transition-transform duration-500 hover:scale-105">
                                    <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-105 hover:rotate-3">
                                        <span className="text-6xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] select-none">
                                            {isCat ? '🐱' : isDog ? '🐶' : '🐾'}
                                        </span>
                                    </div>
                                    <h3 className="mt-4 text-white font-black text-xl tracking-tight filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">{pet.name}</h3>
                                    <span className="mt-2 text-[10px] font-black tracking-widest uppercase text-white/90 bg-white/10 backdrop-blur-sm border border-white/10 px-3.5 py-1.5 rounded-full shadow-inner">
                                        No Image Provided
                                    </span>
                                </div>

                                <div className={`absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold shadow-sm ${isCat ? 'text-emerald-600' : 'text-blue-600'}`}>
                                    {pet.species || 'Pet'}
                                </div>
                            </div>
                        ) : (
                            <div className="md:w-1/2 min-h-[380px] md:min-h-[500px] relative overflow-hidden flex items-center justify-center bg-slate-950 p-6 sm:p-8 self-stretch">
                                {/* Ambient blurred background representation of the pet image */}
                                <img 
                                    src={pet.avatar_url} 
                                    alt="" 
                                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
                                />
                                <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-md pointer-events-none"></div>

                                {/* Floating grid pattern */}
                                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

                                {/* The Actual uncropped and centered pet avatar/card */}
                                <img 
                                    src={pet.avatar_url} 
                                    onError={() => setImageError(true)}
                                    alt={pet.name} 
                                    className="relative z-10 max-h-[480px] w-auto max-w-[95%] object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 hover:scale-[1.01] hover:-rotate-0.5 transition-all duration-500" 
                                />

                                <div className={`absolute top-4 right-4 bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-xs font-extrabold shadow-sm text-white tracking-wide uppercase relative z-20`}>
                                    {pet.species || 'Pet'}
                                </div>
                            </div>
                        );
                    })()}
                    
                    {/* Details */}
                    <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-between">
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{pet.name}</h1>
                            <p className="text-slate-500 text-lg mb-6">{pet.breed || 'Mixed'} • {pet.age_years ? `${pet.age_years} Years` : 'Age Unknown'}</p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="flex items-center gap-3 sm:gap-4 bg-blue-50/50 p-3 sm:p-4 rounded-2xl border border-blue-100/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(37,99,235,0.05)]">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">category</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-blue-500/80 font-bold uppercase tracking-wider mb-0.5">Species</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.species}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 bg-amber-50/50 p-3 sm:p-4 rounded-2xl border border-amber-100/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(245,158,11,0.05)]">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">pets</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mb-0.5">Breed</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.breed || 'Mixed'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 bg-emerald-50/50 p-3 sm:p-4 rounded-2xl border border-emerald-100/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(16,185,129,0.05)]">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">cake</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider mb-0.5">Age</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.age_years ? `${pet.age_years} yrs` : 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 bg-purple-50/50 p-3 sm:p-4 rounded-2xl border border-purple-100/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(139,92,246,0.05)]">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">scale</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-purple-500/80 font-bold uppercase tracking-wider mb-0.5">Weight</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{pet.weight_kg ? `${pet.weight_kg} kg` : '--'}</p>
                                    </div>
                                </div>
                            </div>
 
                            {/* Digital Health Passport */}
                            <div className="mb-8 p-6 bg-slate-50 border border-slate-200/60 rounded-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
                                    <span className="material-symbols-outlined text-blue-600">health_and_safety</span>
                                    Digital Health Passport
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vaccinations</p>
                                            <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                                        </div>
                                        <div className="space-y-4">
                                            {getVaccinations().map((v, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{v.name}</p>
                                                        <p className="text-xs text-slate-500 font-medium">{v.status} • {v.date}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weight Tracker</p>
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Stable</span>
                                        </div>
                                        
                                        {(() => {
                                            const weightHistory = getWeightHistory();
                                            if (!weightHistory.hasWeight) {
                                                return (
                                                    <div className="flex flex-col items-center justify-center h-[96px] text-center pt-2">
                                                        <span className="material-symbols-outlined text-slate-300 text-2xl mb-1">scale</span>
                                                        <p className="text-[10px] font-bold text-slate-400 max-w-[140px] leading-tight">No weight recorded. Add one to track growth!</p>
                                                    </div>
                                                );
                                            }
 
                                            return (
                                                <>
                                                    <div className="flex items-end gap-1.5 h-[72px] w-full pt-4">
                                                        {weightHistory.data.map((w, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                style={{ height: `${w.heightPct}%` }}
                                                                className={`flex-1 rounded-t-md transition-colors relative group cursor-pointer ${
                                                                    idx === 4 
                                                                        ? 'bg-blue-500 shadow-sm' 
                                                                        : 'bg-slate-100 hover:bg-blue-100'
                                                                }`}
                                                            >
                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                                    {w.weight} kg
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between mt-2 text-[9px] text-slate-400 font-bold uppercase">
                                                        {weightHistory.data.map((w, idx) => (
                                                            <span 
                                                                key={idx} 
                                                                className={idx === 4 ? 'text-blue-600' : ''}
                                                            >
                                                                {w.month}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-3">About me</h3>
                            <p className="text-slate-600 leading-relaxed">{pet.bio || 'No bio provided.'}</p>
                        </div>

                        {!isOwner && (
                            <div className="mt-8 border-t border-slate-100 pt-8">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Meet the Owner</h3>
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-4 rounded-2xl shadow-sm">
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
                                        <button 
                                            onClick={handleAdoptRequest} 
                                            disabled={isRequesting} 
                                            className="w-full py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 disabled:from-slate-200 disabled:via-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-2xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.45)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 text-base"
                                        >
                                            <span className="material-symbols-outlined text-[22px]">{isRequesting ? 'sync' : 'volunteer_activism'}</span>
                                            <span>{isRequesting ? 'Processing...' : `Adopt ${pet.name}`}</span>
                                        </button>
                                    )}
                                    <p className="text-center text-xs text-slate-400 mt-4">Adoption process is managed securely by PetPulse.</p>
                                </div>
                            </div>
                        )}
                        {isOwner && (
                            <div className="mt-12 border-t border-slate-100 pt-10">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                                    <div className="text-left">
                                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-rose-500 text-[26px]">volunteer_activism</span>
                                            Incoming Adoption Applications
                                        </h2>
                                        <p className="text-xs text-slate-500 font-semibold mt-1">Review applicant profiles, initiate coordination chats, and schedule physical meet-and-greets.</p>
                                    </div>
                                    <button 
                                        onClick={() => navigate(`/manage-pet?id=${pet.id}`)}
                                        className="shrink-0 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-extrabold py-2.5 px-5 rounded-xl text-xs transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                        Edit Pet Profile
                                    </button>
                                </div>

                                {loadingApps ? (
                                    <div className="space-y-4">
                                        {[1, 2].map(n => (
                                            <div key={n} className="bg-white border border-slate-100 rounded-2xl p-6 animate-pulse flex flex-col gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                                                        <div className="h-3 bg-slate-200 rounded w-1/6"></div>
                                                    </div>
                                                </div>
                                                <div className="h-16 bg-slate-200 rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : applications.length === 0 ? (
                                    <div className="text-center py-12 px-6 bg-slate-50 border border-slate-150 border-dashed rounded-3xl">
                                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                                            <span className="material-symbols-outlined text-3xl">inbox</span>
                                        </div>
                                        <h3 className="font-extrabold text-slate-800 text-base">No Applications Yet</h3>
                                        <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
                                            Adoption requests for {pet.name} will show up here. Share your pet's profile to help them find a loving forever home!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {applications.map(app => (
                                            <div 
                                                key={app.id} 
                                                className="bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all rounded-3xl p-6 sm:p-8 flex flex-col gap-6"
                                            >
                                                {/* Header info */}
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <Link 
                                                            to={`/owner-profile?id=${app.applicant_id}`} 
                                                            target="_blank" 
                                                            className="w-14 h-14 rounded-full overflow-hidden border border-slate-100 shadow-sm flex-shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                                                            title="Inspect profile"
                                                        >
                                                            {app.profile_pic_url ? (
                                                                <img src={app.profile_pic_url} className="w-full h-full object-cover" alt={app.first_name} />
                                                            ) : (
                                                                <div className="w-full h-full bg-rose-50 text-rose-600 font-black text-xl flex items-center justify-center">
                                                                    {app.first_name[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                        </Link>
                                                        <div>
                                                            <Link 
                                                                to={`/owner-profile?id=${app.applicant_id}`} 
                                                                target="_blank"
                                                                className="font-black text-slate-900 hover:text-blue-600 transition-colors text-base flex items-center gap-1.5 group"
                                                                title="Inspect profile"
                                                            >
                                                                {app.first_name} {app.last_name}
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-blue-600 transition-colors">open_in_new</span>
                                                            </Link>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[13px]">schedule</span>
                                                                Applied {new Date(app.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <span className={`self-start sm:self-center inline-flex items-center gap-1 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border ${
                                                        app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/5' :
                                                        app.status === 'rejected' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100/70 animate-pulse-subtle'
                                                    }`}>
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            {app.status === 'approved' ? 'check_circle' : app.status === 'rejected' ? 'cancel' : 'pending'}
                                                        </span>
                                                        {app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Declined' : 'Pending Review'}
                                                    </span>
                                                </div>

                                                {/* Questionnaire answers */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100/50 text-left">
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pet Experience</p>
                                                        <p className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-blue-500 text-[18px]">verified_user</span>
                                                            {app.pet_experience || 'No previous pet experience listed'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Housing Environment</p>
                                                        <p className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-amber-500 text-[18px]">home</span>
                                                            {app.housing_type || 'No housing environment details provided'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Motivation Message */}
                                                {app.applicant_message && (
                                                    <div className="bg-rose-50/20 border border-rose-100/30 rounded-2xl p-5 text-left relative">
                                                        <span className="material-symbols-outlined absolute right-4 top-4 text-slate-200 text-3xl font-light select-none">format_quote</span>
                                                        <p className="text-[10px] text-rose-500/80 font-bold uppercase tracking-wider mb-1.5">Applicant Motivation Message</p>
                                                        <p className="text-sm text-slate-700 font-semibold italic relative z-10 leading-relaxed">
                                                            "{app.applicant_message}"
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Contact Details */}
                                                {app.applicant_phone && (
                                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1 text-left">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                                        Contact Phone: <span className="text-slate-800 font-extrabold select-all ml-0.5">{app.applicant_phone}</span>
                                                    </p>
                                                )}

                                                {/* Coordination Buttons */}
                                                <div className="border-t border-slate-100 pt-5 flex flex-wrap items-center justify-end gap-3">
                                                    <button 
                                                        onClick={() => handleStartChatFromProfile(app.applicant_id, app.first_name, app.last_name, app.profile_pic_url, pet.name)}
                                                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">chat</span>
                                                        Chat with {app.first_name}
                                                    </button>

                                                    {app.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleUpdateApplicationStatus(app.id, 'approved')}
                                                                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">check</span>
                                                                Approve Application
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setShowDeclineModal(app);
                                                                    setDeclineReasonPreset('Your home environment or lifestyle is not a fit for this pet\'s specific requirements.');
                                                                    setDeclineReasonCustom('');
                                                                }}
                                                                className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-slate-800 font-bold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                                Decline
                                                            </button>
                                                        </>
                                                    )}

                                                    {(app.status === 'pending' || app.status === 'approved') && (
                                                        <button 
                                                            onClick={() => setShowMeetupModal(app)}
                                                            className="flex-1 sm:flex-none bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black py-2.5 px-5 rounded-xl text-xs shadow-md shadow-rose-500/10 transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                                            Schedule Meetup &rarr;
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MEETUP COORDINATOR MODAL */}
            {showMeetupModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-14 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">calendar_month</span> 
                                Schedule Adoption Meetup
                            </h3>
                            <button onClick={() => setShowMeetupModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Description */}
                        <div className="p-6 bg-rose-50/30 border-b border-rose-100/20 text-left">
                            <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                                Propose a coordinated meetup time and location. Submitting this meetup plan will automatically approve their application and send a beautifully formatted proposal message directly to their private chat!
                            </p>
                        </div>

                        <form onSubmit={handleScheduleMeetup} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-left">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Meetup Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        min={new Date().toISOString().split('T')[0]}
                                        value={meetupForm.date}
                                        onChange={e => setMeetupForm({...meetupForm, date: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Meetup Time *</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={meetupForm.time}
                                        onChange={e => setMeetupForm({...meetupForm, time: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Cairo District/Location *</label>
                                <select 
                                    required
                                    value={meetupForm.location}
                                    onChange={e => setMeetupForm({...meetupForm, location: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-800"
                                >
                                    <option value="Maadi">Maadi (District Presets)</option>
                                    <option value="Zamalek">Zamalek (District Presets)</option>
                                    <option value="New Cairo / Tagamoa">New Cairo / Tagamoa (District Presets)</option>
                                    <option value="Heliopolis / Masr El Gedida">Heliopolis / Masr El Gedida (District Presets)</option>
                                    <option value="Sheikh Zayed">Sheikh Zayed (District Presets)</option>
                                    <option value="Custom">-- Custom Cairo Location --</option>
                                </select>
                            </div>

                            {meetupForm.location === 'Custom' && (
                                <div className="animate-fade-in">
                                    <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Specify Custom Location *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Al Rehab City Gate 1, Heliopolis Club"
                                        value={meetupForm.customLocation}
                                        onChange={e => setMeetupForm({...meetupForm, customLocation: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none text-slate-800"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Co-ordination Instructions (Optional)</label>
                                <textarea 
                                    value={meetupForm.instructions}
                                    onChange={e => setMeetupForm({...meetupForm, instructions: e.target.value})}
                                    rows="3" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none text-slate-800"
                                    placeholder="Mention anything they should bring, e.g. 'Bring a secure carrier box' or 'Let's meet near the main garden gate'..."
                                ></textarea>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowMeetupModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-150 transition-colors">Cancel</button>
                                <button 
                                    type="submit" 
                                    className="bg-rose-500 hover:bg-rose-600 active:scale-95 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md shadow-rose-500/10 transition-all flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                    Propose Meetup
                                </button>
                            </div>
                        </form>

                    </div>
                </div>,
                document.body
            )}

            {showDeclineModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-14 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-500">cancel</span> 
                                Decline Adoption Application
                            </h3>
                            <button onClick={() => setShowDeclineModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Description */}
                        <div className="p-6 bg-slate-50 border-b border-slate-100 text-left">
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                Please provide a constructive, supportive reason for declining {showDeclineModal.first_name}'s application to adopt {pet.name}. Your explanation will be shared with the applicant to help them understand the decision.
                            </p>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setSubmittingDecline(true);
                            try {
                                const finalReason = declineReasonPreset === 'Custom' 
                                    ? declineReasonCustom 
                                    : declineReasonPreset;
                                
                                await handleUpdateApplicationStatus(showDeclineModal.id, 'rejected', finalReason);
                                setShowDeclineModal(null);
                            } finally {
                                setSubmittingDecline(false);
                            }
                        }} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Select Rejection Reason Preset</label>
                                <select 
                                    required
                                    value={declineReasonPreset}
                                    onChange={e => setDeclineReasonPreset(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-500 outline-none font-bold text-slate-800"
                                >
                                    <option value="Your home environment or lifestyle is not a fit for this pet's specific requirements.">Environment mismatch (energy level/housing)</option>
                                    <option value="Another applicant who applied earlier was selected for this pet.">Another applicant was selected</option>
                                    <option value="Lack of matching experience for this pet's active energy levels or special training needs.">Pet experience mismatch</option>
                                    <option value="Custom">-- Custom Reason / Write own message --</option>
                                </select>
                            </div>

                            {declineReasonPreset === 'Custom' ? (
                                <div className="animate-fade-in">
                                    <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Write Custom Message *</label>
                                    <textarea 
                                        required 
                                        placeholder="Type a kind, constructive message explaining why their application was not accepted at this time..."
                                        value={declineReasonCustom}
                                        onChange={e => setDeclineReasonCustom(e.target.value)}
                                        rows="4"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-500 outline-none resize-none text-slate-800"
                                    ></textarea>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Message Preview:</p>
                                    <p className="text-xs text-slate-600 italic font-medium">"{declineReasonPreset}"</p>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowDeclineModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-150 transition-colors" disabled={submittingDecline}>Cancel</button>
                                <button 
                                    type="submit" 
                                    className="bg-red-500 hover:bg-red-600 active:scale-95 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md shadow-red-500/10 transition-all flex items-center gap-1.5"
                                    disabled={submittingDecline}
                                >
                                    {submittingDecline ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    )}
                                    Confirm Decline
                                </button>
                            </div>
                        </form>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PetProfile;
