import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const PetMatchTab = ({ searchQuery }) => {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // Tabs: 'explore', 'incoming', 'outgoing'
    const [activeTab, setActiveTab] = useState('explore');
    
    // Data states
    const [matingPets, setMatingPets] = useState([]);
    const [myPets, setMyPets] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [speciesFilter, setSpeciesFilter] = useState('all');

    // Modals
    const [showListModal, setShowListModal] = useState(false);
    const [showProposeModal, setShowProposeModal] = useState(null); // stores the target pet object

    // Form states
    const [listMode, setListMode] = useState('select'); // 'select' or 'register'
    const [selectedPetId, setSelectedPetId] = useState('');
    const [listExistingForm, setListExistingForm] = useState({
        gender: 'male',
        location: '',
        bio: ''
    });
    const [registerNewForm, setRegisterNewForm] = useState({
        name: '',
        species: 'Dog',
        breed: '',
        age_years: '',
        weight_kg: '',
        gender: 'male',
        location: '',
        bio: '',
        avatar_url: ''
    });
    const [proposalForm, setProposalForm] = useState({
        applicant_pet_id: '',
        message: ''
    });

    const [submitting, setSubmitting] = useState(false);

    // Mating Card Sharing states
    const [selectedSharePet, setSelectedSharePet] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const handleSimulateDownload = (petName) => {
        setIsDownloading(true);
        setDownloadProgress(0);
        const interval = setInterval(() => {
            setDownloadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsDownloading(false);
                        toast.success(`${petName}'s Mating Resume Card downloaded to your device! 🐾`);
                    }, 500);
                    return 100;
                }
                return prev + 10;
            });
        }, 120);
    };

    const handleCopyShareLink = (petId) => {
        const shareUrl = `${window.location.origin}/community?tab=mating&petId=${petId}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        toast.success('Mating Resume Card link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    useEffect(() => {
        fetchMatingPets();
        if (token) {
            fetchIncomingRequests();
            fetchOutgoingRequests();
            fetchMyPets();
        }
    }, [token]);

    const fetchMatingPets = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/pets/mating`);
            setMatingPets(res.data.pets || []);
        } catch (err) {
            console.error('Failed to fetch mating pets:', err);
            toast.error('Failed to load mating profiles');
        } finally {
            setLoading(false);
        }
    };

    const fetchIncomingRequests = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/mating/incoming`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIncomingRequests(res.data.requests || []);
        } catch (err) {
            console.error('Failed to fetch incoming proposals:', err);
        }
    };

    const fetchOutgoingRequests = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/mating/outgoing`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOutgoingRequests(res.data.requests || []);
        } catch (err) {
            console.error('Failed to fetch outgoing proposals:', err);
        }
    };

    const fetchMyPets = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/pets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyPets(res.data.pets || []);
        } catch (err) {
            console.error('Failed to fetch my pets:', err);
        }
    };

    // Check if user is logged in
    const requireLogin = (action) => {
        if (!user) {
            toast.error(`Please log in to ${action}`);
            navigate('/login');
            return false;
        }
        return true;
    };

    // Open Listing Modal
    const handleOpenListModal = () => {
        if (!requireLogin('list a pet')) return;
        fetchMyPets();
        setShowListModal(true);
    };

    // Toggle mating status of an existing pet
    const handleListExistingPet = async (e) => {
        e.preventDefault();
        if (!selectedPetId) {
            toast.error('Please select a pet to list');
            return;
        }
        if (!listExistingForm.location) {
            toast.error('Location is required');
            return;
        }

        try {
            setSubmitting(true);
            await axios.put(`${API_BASE}/pets/${selectedPetId}`, {
                is_mating: true,
                gender: listExistingForm.gender,
                location: listExistingForm.location,
                bio: listExistingForm.bio
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Pet listed for mating successfully!');
            setShowListModal(false);
            setSelectedPetId('');
            setListExistingForm({ gender: 'male', location: '', bio: '' });
            fetchMatingPets();
            fetchMyPets();
        } catch (err) {
            console.error('Failed to list existing pet:', err);
            toast.error(err.response?.data?.error || 'Failed to list pet');
        } finally {
            setSubmitting(false);
        }
    };

    // Register a new pet directly with is_mating = true
    const handleRegisterNewPet = async (e) => {
        e.preventDefault();
        const { name, breed, age_years, location } = registerNewForm;
        if (!name || !breed || !age_years || !location) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            setSubmitting(true);
            const petPayload = {
                ...registerNewForm,
                age_years: parseFloat(registerNewForm.age_years),
                weight_kg: registerNewForm.weight_kg ? parseFloat(registerNewForm.weight_kg) : null,
                is_mating: true,
                is_adoptable: false,
                avatar_url: registerNewForm.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'
            };

            await axios.post(`${API_BASE}/pets`, petPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('New pet registered and listed for mating!');
            setShowListModal(false);
            setRegisterNewForm({
                name: '', species: 'Dog', breed: '', age_years: '', weight_kg: '',
                gender: 'male', location: '', bio: '', avatar_url: ''
            });
            fetchMatingPets();
            fetchMyPets();
        } catch (err) {
            console.error('Failed to register new pet:', err);
            toast.error(err.response?.data?.error || 'Failed to register pet');
        } finally {
            setSubmitting(false);
        }
    };

    // Open Propose Modal
    const handleOpenProposeModal = (pet) => {
        if (!requireLogin('propose a mating match')) return;
        if (pet.owner_id === user.id) {
            toast.error('This is your own pet!');
            return;
        }

        // Determine compatible applicant pets
        // Same species, opposite gender
        const targetSpecies = pet.species.toLowerCase();
        const targetGender = pet.gender?.toLowerCase() || '';
        const oppositeGender = targetGender === 'male' ? 'female' : 'male';

        const compatiblePets = myPets.filter(p => 
            p.species?.toLowerCase() === targetSpecies &&
            p.gender?.toLowerCase() === oppositeGender
        );

        setProposalForm({
            applicant_pet_id: compatiblePets[0]?.id || '',
            message: ''
        });

        setShowProposeModal(pet);
    };

    // Submit Proposal
    const handleSendProposal = async (e) => {
        e.preventDefault();
        if (!proposalForm.applicant_pet_id) {
            toast.error('Please select one of your pets for the mating match');
            return;
        }

        try {
            setSubmitting(true);
            await axios.post(`${API_BASE}/mating/request`, {
                pet_id: showProposeModal.id,
                applicant_pet_id: proposalForm.applicant_pet_id,
                message: proposalForm.message
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Mating proposal sent successfully!');
            setShowProposeModal(null);
            fetchOutgoingRequests();
        } catch (err) {
            console.error('Failed to send proposal:', err);
            toast.error(err.response?.data?.error || 'Failed to send proposal');
        } finally {
            setSubmitting(false);
        }
    };

    // Accept / Decline Proposal
    const handleUpdateProposalStatus = async (requestId, status) => {
        try {
            const verb = status === 'approved' ? 'accept' : 'decline';
            const confirmAction = window.confirm(`Are you sure you want to ${verb} this proposal?`);
            if (!confirmAction) return;

            const res = await axios.put(`${API_BASE}/mating/request/${requestId}/status`, {
                status
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Proposal ${status} successfully!`);
            fetchIncomingRequests();
            
            // If approved, trigger chat request reload
            if (status === 'approved') {
                fetchOutgoingRequests();
            }
        } catch (err) {
            console.error('Failed to update proposal status:', err);
            toast.error('Failed to update status');
        }
    };

    // Chat with user
    const handleStartChat = (partnerId, firstName, lastName, profilePic, petName) => {
        const fullName = `${firstName} ${lastName}`;
        const initialMsg = `Hi! Our mating request has been approved! Let's arrange details here for our pets' matchmaking. 🐾`;
        
        navigate('/messages', {
            state: {
                chatUser: {
                    id: partnerId,
                    name: fullName,
                    avatar: profilePic
                },
                initialMessage: initialMsg
            }
        });
    };

    // Species filters
    const filteredMatingPets = matingPets.filter(pet => {
        // Search filter
        const matchesSearch = !searchQuery || 
            pet.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            pet.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (pet.location && pet.location.toLowerCase().includes(searchQuery.toLowerCase()));

        // Species filter
        if (speciesFilter === 'dogs') {
            return matchesSearch && pet.species.toLowerCase() === 'dog';
        }
        if (speciesFilter === 'cats') {
            return matchesSearch && pet.species.toLowerCase() === 'cat';
        }
        return matchesSearch;
    });

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-500/20 text-white border border-rose-400/20 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute left-1/3 top-10 w-24 h-24 bg-pink-400/20 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="text-center sm:text-left z-10">
                    <h2 className="text-2xl sm:text-3xl font-black mb-2 flex items-center justify-center sm:justify-start gap-2">
                        <span className="material-symbols-outlined text-[32px] text-pink-100 animate-pulse">favorite</span>
                        Mating Center
                    </h2>
                    <p className="text-rose-100/90 text-sm max-w-md font-medium">
                        Connect with verified pet owners for professional mating matches. Build premium profiles and secure matches.
                    </p>
                </div>
                <button 
                    onClick={handleOpenListModal}
                    className="bg-white text-rose-600 hover:bg-rose-50 font-extrabold py-3.5 px-7 rounded-2xl transition-all shadow-lg shadow-black/10 text-sm active:scale-95 flex items-center gap-2 hover:-translate-y-0.5 duration-200 z-10 shrink-0"
                >
                    <span className="material-symbols-outlined font-bold text-[18px]">add_circle</span>
                    List Your Pet
                </button>
            </div>

            {/* Mating tabs navigation */}
            <div className="flex border-b border-slate-200 gap-6">
                <button 
                    onClick={() => setActiveTab('explore')}
                    className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'explore' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                    Explore Mates
                </button>
                {token && (
                    <>
                        <button 
                            onClick={() => setActiveTab('incoming')}
                            className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 relative ${activeTab === 'incoming' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                            Incoming Proposals
                            {incomingRequests.filter(r => r.status === 'pending').length > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                                    {incomingRequests.filter(r => r.status === 'pending').length}
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={() => setActiveTab('outgoing')}
                            className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'outgoing' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            My Sent Proposals
                        </button>
                    </>
                )}
            </div>

            {/* 1. EXPLORE TAB */}
            {activeTab === 'explore' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button 
                            onClick={() => setSpeciesFilter('all')}
                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 ${speciesFilter === 'all' ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            All Species
                        </button>
                        <button 
                            onClick={() => setSpeciesFilter('dogs')}
                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1 ${speciesFilter === 'dogs' ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            🐶 Dogs Only
                        </button>
                        <button 
                            onClick={() => setSpeciesFilter('cats')}
                            className={`px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1 ${speciesFilter === 'cats' ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            🐱 Cats Only
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                            <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
                            <span className="text-sm font-semibold text-slate-500">Loading mating profiles...</span>
                        </div>
                    ) : filteredMatingPets.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
                            <span className="material-symbols-outlined text-[64px] text-rose-200 mb-3">pets</span>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">No Mating Profiles Found</h4>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">
                                We couldn't find any pets matching your criteria. Be the first to list a pet for mating!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMatingPets.map(pet => (
                                <div key={pet.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative">
                                    <div className="h-56 relative overflow-hidden">
                                        <img src={pet.avatar_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={pet.name} />
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        
                                        {/* Species icon indicator */}
                                        <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-rose-600 text-xs font-black px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">favorite</span>
                                            {pet.species === 'Dog' ? '🐶 Dog' : pet.species === 'Cat' ? '🐱 Cat' : pet.species}
                                        </span>
                                        
                                        {/* Gender Badge */}
                                        <span className={`absolute top-4 right-4 text-xs font-black px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 ${pet.gender === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'}`}>
                                            {pet.gender === 'male' ? '♂️ Male' : '♀️ Female'}
                                        </span>

                                        <div className="absolute bottom-4 left-4 right-4 text-white">
                                            <h4 className="font-black text-xl leading-tight">{pet.name}, {pet.age_years} yrs</h4>
                                            <div className="flex items-center gap-1 text-slate-200 text-xs mt-1 font-semibold">
                                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                {pet.location || 'Cairo, Egypt'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-5 flex flex-col flex-1">
                                        {/* Owner Info Bar */}
                                        <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                            <img 
                                                src={pet.owner_profile_pic || `https://ui-avatars.com/api/?name=${pet.owner_first_name}+${pet.owner_last_name}&background=ffe4e6&color=e11d48`} 
                                                className="w-7 h-7 rounded-full object-cover border border-white shadow-sm"
                                                alt="Owner"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Listed by Owner</p>
                                                <p className="text-xs font-extrabold text-slate-700 truncate">{pet.owner_first_name} {pet.owner_last_name}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4 text-xs bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                            <div>
                                                <span className="block text-slate-400 font-bold mb-0.5">Breed</span>
                                                <span className="font-extrabold text-slate-700 truncate block">{pet.breed || 'Mixed'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 font-bold mb-0.5">Weight</span>
                                                <span className="font-extrabold text-slate-700 block">{pet.weight_kg ? `${pet.weight_kg} kg` : 'N/A'}</span>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-500 mb-5 leading-relaxed line-clamp-3 italic">
                                            "{pet.bio || 'No description provided.'}"
                                        </p>

                                        {/* Button */}
                                        {user && pet.owner_id === user.id ? (
                                            <div className="w-full mt-auto flex flex-col gap-2">
                                                <div className="w-full bg-slate-100 text-slate-500 font-extrabold py-3 rounded-2xl text-center text-xs border border-slate-200">
                                                    Your Own Pet Profile
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedSharePet(pet)}
                                                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold py-3 rounded-2xl text-xs transition-all duration-300 border border-rose-100 flex items-center justify-center gap-1.5 active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">share</span>
                                                    Share Mating Card
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full mt-auto flex flex-col gap-2">
                                                <button 
                                                    onClick={() => handleOpenProposeModal(pet)}
                                                    className="w-full bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 active:scale-95 font-extrabold py-3 rounded-2xl text-xs transition-all duration-300 border border-rose-100 flex items-center justify-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">favorite</span>
                                                    Propose Mating Match
                                                </button>
                                                
                                                <button 
                                                    onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('open-chatbot-mating', { detail: { pet } }));
                                                    }}
                                                    className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-lg hover:shadow-pink-500/20 active:scale-95 font-extrabold py-3 rounded-2xl text-xs transition-all duration-300 flex items-center justify-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                                                    🤖 Try Agentic AI Match
                                                </button>

                                                <button 
                                                    onClick={() => setSelectedSharePet(pet)}
                                                    className="w-full bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 font-extrabold py-3 rounded-2xl text-xs transition-all duration-300 border border-slate-200 flex items-center justify-center gap-1.5 active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">share</span>
                                                    Share Mating Card
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 2. INCOMING PROPOSALS */}
            {activeTab === 'incoming' && (
                <div className="space-y-6">
                    {incomingRequests.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                            <span className="material-symbols-outlined text-[64px] text-slate-200 mb-3">mark_email_unread</span>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">No Mating Proposals Received</h4>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">
                                You haven't received any mating proposals for your pets yet. Make sure your profiles are detailed and appealing!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {incomingRequests.map(req => (
                                <div key={req.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                    {/* Mating Card Grid */}
                                    <div className="flex flex-col lg:flex-row items-center gap-6">
                                        
                                        {/* Matchmaker visual: Target Pet & Applicant Pet */}
                                        <div className="flex items-center justify-center gap-4 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100/50 w-full lg:w-auto">
                                            <div className="text-center">
                                                <img src={req.target_pet_avatar} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 mx-auto shadow-sm" alt={req.target_pet_name} />
                                                <span className="block text-[11px] font-extrabold text-slate-700 mt-1">{req.target_pet_name}</span>
                                                <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-full block w-max mx-auto mt-0.5">Yours</span>
                                            </div>
                                            
                                            <div className="flex flex-col items-center">
                                                <span className="material-symbols-outlined text-rose-400 text-[28px] animate-pulse">favorite</span>
                                                <span className="text-[10px] font-black text-rose-500 mt-0.5 uppercase tracking-wider">Match?</span>
                                            </div>

                                            <div className="text-center">
                                                <img src={req.applicant_pet_avatar} className="w-14 h-14 rounded-full object-cover border-2 border-rose-200 mx-auto shadow-sm" alt={req.applicant_pet_name} />
                                                <span className="block text-[11px] font-extrabold text-rose-600 mt-1">{req.applicant_pet_name}</span>
                                                <span className="text-[9px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-full block w-max mx-auto mt-0.5">Proposed</span>
                                            </div>
                                        </div>

                                        {/* Applicant and Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <img src={req.applicant_avatar || `https://ui-avatars.com/api/?name=${req.applicant_first_name}+${req.applicant_last_name}&background=ffe4e6&color=e11d48`} className="w-6 h-6 rounded-full object-cover shadow-sm" alt="Applicant" />
                                                <span className="text-xs font-extrabold text-slate-700">{req.applicant_first_name} {req.applicant_last_name} proposes:</span>
                                            </div>
                                            
                                            <h5 className="font-extrabold text-slate-800 text-base mb-1">
                                                {req.applicant_pet_name} ({req.applicant_pet_breed || 'Mixed'}, {req.applicant_pet_age} yrs, {req.applicant_pet_gender})
                                            </h5>
                                            
                                            <div className="flex flex-wrap gap-2 text-[10px] mb-3">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Weight: {req.applicant_pet_weight ? `${req.applicant_pet_weight} kg` : 'N/A'}</span>
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Location: {req.applicant_pet_location || 'Egypt'}</span>
                                            </div>

                                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl italic text-xs text-slate-600 mb-2">
                                                "{req.message || 'No custom proposal message.'}"
                                            </div>
                                            {req.applicant_pet_bio && (
                                                <div className="text-[10px] text-slate-400">
                                                    <strong>About Applicant Pet:</strong> {req.applicant_pet_bio}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 w-full lg:w-auto flex flex-row lg:flex-col gap-2 justify-end">
                                            {req.status === 'pending' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateProposalStatus(req.id, 'approved')}
                                                        className="flex-1 lg:flex-initial bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateProposalStatus(req.id, 'rejected')}
                                                        className="flex-1 lg:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-2.5 px-5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                                                        Decline
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-right w-full">
                                                    <span className={`inline-flex items-center gap-1 font-bold text-xs px-3.5 py-1.5 rounded-full ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{req.status === 'approved' ? 'check_circle' : 'cancel'}</span>
                                                        {req.status === 'approved' ? 'Approved 💖' : 'Declined'}
                                                    </span>
                                                    {req.status === 'approved' && (
                                                        <button 
                                                            onClick={() => handleStartChat(req.applicant_id, req.applicant_first_name, req.applicant_last_name, req.applicant_avatar, req.applicant_pet_name)}
                                                            className="w-full mt-2 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 font-extrabold py-2 px-4 rounded-xl text-xs transition-all border border-rose-100 flex items-center justify-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">chat</span>
                                                            Chat with Applicant
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 3. OUTGOING PROPOSALS */}
            {activeTab === 'outgoing' && (
                <div className="space-y-6">
                    {outgoingRequests.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                            <span className="material-symbols-outlined text-[64px] text-slate-200 mb-3">volunteer_activism</span>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">No Mating Proposals Sent</h4>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">
                                You haven't sent any mating proposals yet. Explore mating profiles and propose matches to connect!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {outgoingRequests.map(req => (
                                <div key={req.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex flex-col lg:flex-row items-center gap-6">
                                        
                                        {/* Matchmaker Visual */}
                                        <div className="flex items-center justify-center gap-4 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100/50 w-full lg:w-auto">
                                            <div className="text-center">
                                                <img src={req.applicant_pet_avatar} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 mx-auto shadow-sm" alt={req.applicant_pet_name} />
                                                <span className="block text-[11px] font-extrabold text-slate-700 mt-1">{req.applicant_pet_name}</span>
                                                <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-full block w-max mx-auto mt-0.5">Yours</span>
                                            </div>
                                            
                                            <div className="flex flex-col items-center">
                                                <span className="material-symbols-outlined text-rose-400 text-[28px] animate-pulse">favorite</span>
                                                <span className="text-[10px] font-black text-rose-500 mt-0.5 uppercase tracking-wider">Match?</span>
                                            </div>

                                            <div className="text-center">
                                                <img src={req.target_pet_avatar} className="w-14 h-14 rounded-full object-cover border-2 border-rose-200 mx-auto shadow-sm" alt={req.target_pet_name} />
                                                <span className="block text-[11px] font-extrabold text-rose-600 mt-1">{req.target_pet_name}</span>
                                                <span className="text-[9px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-full block w-max mx-auto mt-0.5">Proposed Mate</span>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <img src={req.owner_avatar || `https://ui-avatars.com/api/?name=${req.owner_first_name}+${req.owner_last_name}&background=ffe4e6&color=e11d48`} className="w-6 h-6 rounded-full object-cover shadow-sm" alt="Owner" />
                                                <span className="text-xs font-extrabold text-slate-700">Proposed to {req.owner_first_name} {req.owner_last_name}'s pet:</span>
                                            </div>
                                            
                                            <h5 className="font-extrabold text-slate-800 text-base mb-1">
                                                {req.target_pet_name} ({req.target_pet_breed || 'Mixed'}, {req.target_pet_gender}, location: {req.target_pet_location || 'Cairo'})
                                            </h5>

                                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl italic text-xs text-slate-600 mb-2">
                                                "Proposal message: {req.message || 'No custom proposal message.'}"
                                            </div>
                                        </div>

                                        {/* Status / Chat */}
                                        <div className="shrink-0 w-full lg:w-auto text-right">
                                            <div className="mb-2">
                                                <span className={`inline-flex items-center gap-1 font-bold text-xs px-3.5 py-1.5 rounded-full ${
                                                    req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                    req.status === 'rejected' ? 'bg-slate-100 text-slate-500' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        {req.status === 'approved' ? 'check_circle' : req.status === 'rejected' ? 'cancel' : 'pending'}
                                                    </span>
                                                    {req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Declined' : 'Pending Review'}
                                                </span>
                                            </div>

                                            {req.status === 'approved' && (
                                                <button 
                                                    onClick={() => handleStartChat(req.owner_id, req.owner_first_name, req.owner_last_name, req.owner_avatar, req.target_pet_name)}
                                                    className="w-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">chat</span>
                                                    Chat with Owner
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* LIST PET MODAL */}
            {showListModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">add_circle</span> 
                                List Pet for Mating
                            </h3>
                            <button onClick={() => setShowListModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Selection header for existing / new */}
                        <div className="bg-slate-50 p-2 border-b border-slate-100 flex gap-2">
                            <button 
                                onClick={() => setListMode('select')}
                                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${listMode === 'select' ? 'bg-white text-rose-600 shadow-sm border border-rose-100' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Select My Pet
                            </button>
                            <button 
                                onClick={() => setListMode('register')}
                                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${listMode === 'register' ? 'bg-white text-rose-600 shadow-sm border border-rose-100' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                Register New Pet
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {/* Option 1: Select Existing */}
                            {listMode === 'select' && (
                                <form id="listExistingForm" onSubmit={handleListExistingPet} className="space-y-4">
                                    {myPets.filter(p => !p.is_mating).length === 0 ? (
                                        <div className="py-6 text-center">
                                            <p className="text-slate-500 text-sm font-medium mb-3">You don't have any unlisted pets registered.</p>
                                            <button 
                                                type="button"
                                                onClick={() => setListMode('register')}
                                                className="text-rose-600 font-bold text-xs bg-rose-50 px-4 py-2 rounded-lg hover:bg-rose-100"
                                            >
                                                Register a new pet instead
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Choose Pet *</label>
                                                <select 
                                                    value={selectedPetId} 
                                                    onChange={e => setSelectedPetId(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                                    required
                                                >
                                                    <option value="">-- Choose registered pet --</option>
                                                    {myPets.filter(p => !p.is_mating).map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Gender *</label>
                                                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1">
                                                        <button type="button" onClick={() => setListExistingForm({...listExistingForm, gender: 'male'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${listExistingForm.gender === 'male' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>♂️ Male</button>
                                                        <button type="button" onClick={() => setListExistingForm({...listExistingForm, gender: 'female'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${listExistingForm.gender === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>♀️ Female</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Location *</label>
                                                    <input required value={listExistingForm.location} onChange={e => setListExistingForm({...listExistingForm, location: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="e.g. Heliopolis, Cairo" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Mating bio / What are you seeking? *</label>
                                                <textarea required value={listExistingForm.bio} onChange={e => setListExistingForm({...listExistingForm, bio: e.target.value})} rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none" placeholder="Provide breeding history, health updates, pedigree details..."></textarea>
                                            </div>
                                        </>
                                    )}
                                </form>
                            )}

                            {/* Option 2: Register New */}
                            {listMode === 'register' && (
                                <form id="registerNewForm" onSubmit={handleRegisterNewPet} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Pet Name *</label>
                                            <input required value={registerNewForm.name} onChange={e => setRegisterNewForm({...registerNewForm, name: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="e.g. Leo" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Species *</label>
                                            <select 
                                                value={registerNewForm.species} 
                                                onChange={e => setRegisterNewForm({...registerNewForm, species: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            >
                                                <option value="Dog">🐶 Dog</option>
                                                <option value="Cat">🐱 Cat</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Breed *</label>
                                            <input required value={registerNewForm.breed} onChange={e => setRegisterNewForm({...registerNewForm, breed: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="e.g. Persian" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Gender *</label>
                                            <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1">
                                                <button type="button" onClick={() => setRegisterNewForm({...registerNewForm, gender: 'male'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${registerNewForm.gender === 'male' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>♂️ Male</button>
                                                <button type="button" onClick={() => setRegisterNewForm({...registerNewForm, gender: 'female'})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${registerNewForm.gender === 'female' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>♀️ Female</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Age (Years) *</label>
                                            <input required value={registerNewForm.age_years} onChange={e => setRegisterNewForm({...registerNewForm, age_years: e.target.value})} type="number" step="0.1" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="e.g. 2.5" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Weight (kg)</label>
                                            <input value={registerNewForm.weight_kg} onChange={e => setRegisterNewForm({...registerNewForm, weight_kg: e.target.value})} type="number" step="0.1" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="e.g. 7.5" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Location *</label>
                                            <input required value={registerNewForm.location} onChange={e => setRegisterNewForm({...registerNewForm, location: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="e.g. Heliopolis, Cairo" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Avatar Image URL</label>
                                        <input value={registerNewForm.avatar_url} onChange={e => setRegisterNewForm({...registerNewForm, avatar_url: e.target.value})} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="https://images.unsplash.com/..." />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">About/Mating Biography *</label>
                                        <textarea required value={registerNewForm.bio} onChange={e => setRegisterNewForm({...registerNewForm, bio: e.target.value})} rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none" placeholder="Friendly temperament, certified pedigree pedigree, seek companion..."></textarea>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setShowListModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
                            {listMode === 'select' ? (
                                <button 
                                    type="submit" 
                                    form="listExistingForm" 
                                    disabled={submitting || myPets.filter(p => !p.is_mating).length === 0}
                                    className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md shadow-rose-500/10 transition-colors flex items-center gap-1"
                                >
                                    {submitting ? 'Posting...' : 'Post Mating Profile'}
                                </button>
                            ) : (
                                <button 
                                    type="submit" 
                                    form="registerNewForm" 
                                    disabled={submitting}
                                    className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md shadow-rose-500/10 transition-colors flex items-center gap-1"
                                >
                                    {submitting ? 'Registering...' : 'Register & Post Profile'}
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* PROPOSE MATING MATCH MODAL */}
            {showProposeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">favorite</span> 
                                Propose Mating Match
                            </h3>
                            <button onClick={() => setShowProposeModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3">
                                <img src={showProposeModal.avatar_url} className="w-12 h-12 rounded-full object-cover border border-rose-200 shadow-sm" alt={showProposeModal.name} />
                                <div>
                                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Target Mate</span>
                                    <p className="font-extrabold text-sm text-slate-800">{showProposeModal.name} ({showProposeModal.breed}, {showProposeModal.gender})</p>
                                </div>
                            </div>

                            {/* Check compatibilities */}
                            {(() => {
                                const targetSpecies = showProposeModal.species.toLowerCase();
                                const targetGender = showProposeModal.gender?.toLowerCase() || '';
                                const oppositeGender = targetGender === 'male' ? 'female' : 'male';
                                
                                const compatiblePets = myPets.filter(p => 
                                    p.species?.toLowerCase() === targetSpecies &&
                                    p.gender?.toLowerCase() === oppositeGender
                                );

                                if (compatiblePets.length === 0) {
                                    return (
                                        <div className="py-4 text-center text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                                            <span className="material-symbols-outlined text-amber-500 text-[32px] mb-1">warning</span>
                                            <p className="text-xs font-bold text-slate-700">No Compatible Pets Registered</p>
                                            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                                                Matchmaking requires you to have a pet of the same species ({showProposeModal.species}) and opposite gender ({oppositeGender === 'male' ? 'Male ♂️' : 'Female ♀️'}).
                                            </p>
                                            <button 
                                                onClick={() => { setShowProposeModal(null); setShowListModal(true); setListMode('register'); }}
                                                className="mt-3 bg-white border border-slate-200 text-slate-700 font-extrabold py-2 px-4 rounded-xl text-xs hover:bg-slate-100 transition-colors shadow-sm"
                                            >
                                                Register Compatible Pet
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                    <form id="proposalForm" onSubmit={handleSendProposal} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Select one of your pets *</label>
                                            <select 
                                                value={proposalForm.applicant_pet_id} 
                                                onChange={e => setProposalForm({...proposalForm, applicant_pet_id: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                                required
                                            >
                                                <option value="">-- Select compatible pet --</option>
                                                {compatiblePets.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.breed || 'Mixed'}, {p.gender})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Message to owner ({showProposeModal.owner_first_name}) *</label>
                                            <textarea 
                                                required 
                                                value={proposalForm.message} 
                                                onChange={e => setProposalForm({...proposalForm, message: e.target.value})}
                                                rows="4" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                                placeholder={`Introduce your pet, explain why they would be a great mate, and propose a meet...`}
                                            ></textarea>
                                        </div>
                                    </form>
                                );
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setShowProposeModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button 
                                type="submit" 
                                form="proposalForm" 
                                disabled={submitting || !proposalForm.applicant_pet_id}
                                className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md shadow-rose-500/10 transition-all flex items-center gap-1"
                            >
                                {submitting ? 'Sending...' : 'Send Proposal'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* 4. PREMIUM GLASSMORPHIC PET MATING CARD MODAL */}
            {selectedSharePet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in" onClick={() => setSelectedSharePet(null)}>
                    <div 
                        className="bg-white/85 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-slide-up relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-rose-100/50 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white/50">
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500 animate-pulse">favorite</span> 
                                Share Mating Resume Card
                            </h3>
                            <button 
                                onClick={() => setSelectedSharePet(null)} 
                                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col items-center">
                            
                            {/* PREMIUM PREVIEW CARD CANVAS */}
                            <div className="w-full bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 rounded-3xl p-6 shadow-xl shadow-rose-500/20 text-white relative overflow-hidden flex flex-col gap-4 border border-rose-400/20 max-w-sm">
                                
                                {/* Background Patterns */}
                                <div className="absolute -right-16 -bottom-16 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                                <div className="absolute left-1/4 top-10 w-28 h-28 bg-pink-400/20 rounded-full blur-xl pointer-events-none"></div>
                                
                                {/* Header badge */}
                                <div className="flex justify-between items-center z-10">
                                    <span className="bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-white/10 flex items-center gap-1">
                                        🐾 MEWOO MATCH
                                    </span>
                                    <span className="text-pink-100 text-xs font-bold italic">Ready to Mate ❤️</span>
                                </div>

                                {/* Pet Profile layout */}
                                <div className="flex items-center gap-4 z-10 mt-2">
                                    <div className="relative shrink-0">
                                        <img 
                                            src={selectedSharePet.avatar_url} 
                                            className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-md"
                                            alt={selectedSharePet.name} 
                                        />
                                        <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md ${selectedSharePet.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                            {selectedSharePet.gender === 'male' ? '♂' : '♀'}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-2xl font-black tracking-tight truncate">{selectedSharePet.name}</h4>
                                        <p className="text-rose-100 text-xs font-extrabold truncate">{selectedSharePet.breed || 'Mixed Breed'}</p>
                                        <p className="text-white/80 text-[10px] font-bold mt-0.5">{selectedSharePet.age_years} Years Old · {selectedSharePet.weight_kg ? `${selectedSharePet.weight_kg} kg` : 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Details block */}
                                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-xs space-y-2 z-10">
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-rose-100">
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> Location</span>
                                        <span className="text-white font-extrabold">{selectedSharePet.location || 'Cairo, Egypt'}</span>
                                    </div>
                                    <p className="text-[11px] text-white/90 italic leading-relaxed border-t border-white/5 pt-2">
                                        "{selectedSharePet.bio || 'Looking for a lovely matching companion. Reach out to arrange details! ✨'}"
                                    </p>
                                </div>

                                {/* Brand Footer & Mock QR Code */}
                                <div className="flex items-center justify-between border-t border-white/10 pt-4 z-10 mt-2">
                                    <div className="text-left">
                                        <p className="text-[9px] font-black uppercase text-rose-200 tracking-wider">Scan code to match</p>
                                        <p className="text-xs font-black text-white">petpulse.me/match</p>
                                    </div>
                                    
                                    {/* Direct SVG Mock QR Code */}
                                    <div className="bg-white p-1.5 rounded-xl shadow-md shrink-0">
                                        <svg width="42" height="42" viewBox="0 0 100 100" className="text-slate-800">
                                            {/* Outer Corners */}
                                            <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                                            <rect x="5" y="5" width="20" height="20" fill="white" />
                                            <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                                            
                                            <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                                            <rect x="75" y="5" width="20" height="20" fill="white" />
                                            <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                                            
                                            <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                                            <rect x="5" y="75" width="20" height="20" fill="white" />
                                            <rect x="10" y="80" width="10" height="10" fill="currentColor" />
                                            
                                            {/* Random QR Pixels */}
                                            <rect x="40" y="5" width="10" height="10" fill="currentColor" />
                                            <rect x="55" y="15" width="10" height="10" fill="currentColor" />
                                            <rect x="45" y="35" width="10" height="10" fill="currentColor" />
                                            <rect x="35" y="55" width="10" height="10" fill="currentColor" />
                                            <rect x="55" y="55" width="10" height="10" fill="currentColor" />
                                            <rect x="85" y="45" width="10" height="10" fill="currentColor" />
                                            <rect x="75" y="85" width="10" height="10" fill="currentColor" />
                                            <rect x="45" y="75" width="10" height="10" fill="currentColor" />
                                            
                                            {/* Logo paw emblem inside QR center */}
                                            <circle cx="50" cy="50" r="14" fill="white" />
                                            <circle cx="50" cy="50" r="10" fill="#e11d48" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* SHARE OPTIONS & TOOLS PANEL */}
                            <div className="w-full space-y-3">
                                <button 
                                    onClick={() => handleSimulateDownload(selectedSharePet.name)}
                                    disabled={isDownloading}
                                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs transition-all shadow-md shadow-rose-500/10 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isDownloading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Generating High-Res Card... {downloadProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[18px]">download</span>
                                            <span>Simulate HD Card Download</span>
                                        </>
                                    )}
                                </button>

                                <button 
                                    onClick={() => handleCopyShareLink(selectedSharePet.id)}
                                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-3.5 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                    <span>{copiedLink ? 'Copied Link!' : 'Copy Instagram / WhatsApp Story Link'}</span>
                                </button>
                                
                                <p className="text-center text-[10px] text-slate-400 font-medium pt-2">
                                    Tip: Share to Cairo Pet Mating circles to discover high-quality breeding companions immediately.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default PetMatchTab;
