import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const truncateText = (str, maxLength) => {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};

const capitalizeText = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

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
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);

    // Mating Card Sharing states
    const [selectedSharePet, setSelectedSharePet] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [cardTheme, setCardTheme] = useState('rose');
    const [customQuote, setCustomQuote] = useState('');
    const [customContact, setCustomContact] = useState('');

    useEffect(() => {
        if (selectedSharePet) {
            setCardTheme('rose');
            setCustomQuote(selectedSharePet.bio || 'Looking for a lovely matching companion. Reach out to arrange details! ✨');
            setCustomContact('mewoo.pet/match');
        }
    }, [selectedSharePet]);
    const [imageErrors, setImageErrors] = useState({});

    // Portal body scroll lock
    useEffect(() => {
        if (selectedSharePet || showProposeModal || showListModal) {
            document.body.classList.add('overflow-hidden');
            document.documentElement.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
            document.documentElement.classList.remove('overflow-hidden');
        }
        return () => {
            document.body.classList.remove('overflow-hidden');
            document.documentElement.classList.remove('overflow-hidden');
        };
    }, [selectedSharePet, showProposeModal, showListModal]);

    const handleSimulateDownload = async (petName) => {
        const cardElement = document.getElementById('mating-card-canvas');
        if (!cardElement) {
            toast.error('Failed to locate the Mating Resume Card rendering container.');
            return;
        }

        setIsDownloading(true);
        setDownloadProgress(20);

        try {
            setDownloadProgress(40);
            
            // Wait slightly for the DOM & dynamic QR image to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 300));
            
            setDownloadProgress(60);
            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                scale: 2.5, // Ultra HD high-res card canvas export
                backgroundColor: null,
                logging: false
            });

            setDownloadProgress(85);
            const imgData = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.href = imgData;
            link.download = `${petName.replace(/\s+/g, '_')}_mating_resume_card.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setDownloadProgress(100);
            setTimeout(() => {
                setIsDownloading(false);
                toast.success(`${petName}'s Mating Resume Card downloaded to your device! 🐾`);
            }, 400);

        } catch (error) {
            console.error('Failed to generate resume card canvas:', error);
            toast.error('Failed to generate high-resolution card. Please try again.');
            setIsDownloading(false);
        }
    };

    const handleCopyShareLink = (petId) => {
        const shareUrl = `${window.location.origin}/owner-profile?id=${selectedSharePet.owner_id || selectedSharePet.user_id}&pet=${selectedSharePet.id}&utm_source=mating_card&utm_medium=link`;
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
                avatar_url: registerNewForm.avatar_url || (registerNewForm.species?.toLowerCase() === 'cat'
                    ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600'
                    : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600')
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

    // Upload & Dropzone Handlers
    const uploadFile = async (file) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }

        try {
            setUploadingPhoto(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'PetPulse');
            formData.append('folder', 'petpulse/pets');

            const cloudRes = await axios.post(`${API_BASE}/upload/cloudinary`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const secureUrl = cloudRes.data.secure_url;

            setRegisterNewForm(prev => ({
                ...prev,
                avatar_url: secureUrl
            }));
            toast.success('Photo uploaded successfully! 📸');
        } catch (error) {
            console.error("Photo upload failed:", error);
            toast.error('Failed to upload photo.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        await uploadFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            await uploadFile(file);
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
            <div className="flex border-b border-slate-200 gap-4 sm:gap-6 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap">
                <button 
                    onClick={() => setActiveTab('explore')}
                    className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${activeTab === 'explore' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                    Explore Mates
                </button>
                {token && (
                    <>
                        <button 
                            onClick={() => setActiveTab('incoming')}
                            className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 relative flex-shrink-0 whitespace-nowrap ${activeTab === 'incoming' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
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
                            className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ${activeTab === 'outgoing' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {filteredMatingPets.map(pet => (
                                <div key={pet.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative">
                                    <div className="h-56 relative rounded-t-[22px] overflow-hidden">
                                        {(() => {
                                            const isCat = pet.species && pet.species.toLowerCase() === 'cat';
                                            const isDog = pet.species && pet.species.toLowerCase() === 'dog';
                                            const hasInvalidAvatar = !pet.avatar_url || 
                                                (typeof pet.avatar_url === 'string' && 
                                                 (!pet.avatar_url.startsWith('http') && !pet.avatar_url.startsWith('/') && !pet.avatar_url.startsWith('data:')) ||
                                                 pet.avatar_url.includes('1543466835-00a7907e9de1') || 
                                                 pet.avatar_url.includes('1514888286974-6c03e2ca1dba')
                                                );

                                            return (hasInvalidAvatar || imageErrors[pet.id]) ? (
                                                <div className={`w-full h-full relative flex items-center justify-center overflow-hidden transition-all duration-500 ${
                                                    isCat 
                                                        ? 'bg-gradient-to-tr from-violet-600/90 via-purple-500/85 to-pink-500/80' 
                                                        : isDog 
                                                            ? 'bg-gradient-to-tr from-amber-500 via-orange-500/90 to-rose-500/80'
                                                            : 'bg-gradient-to-tr from-emerald-600/90 via-teal-500/85 to-cyan-500/80'
                                                }`}>
                                                    {/* Glowing ambient decorative elements */}
                                                    <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/15 blur-xl animate-pulse"></div>
                                                    <div className="absolute -left-10 -top-10 w-28 h-28 rounded-full bg-white/15 blur-lg"></div>
                                                    
                                                    {/* Floating subtle particle indicators */}
                                                    <div className="absolute inset-0 opacity-25 pointer-events-none">
                                                        <span className="material-symbols-outlined absolute top-6 left-12 text-white text-[16px] animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '3.5s' }}>pets</span>
                                                        <span className="material-symbols-outlined absolute bottom-8 right-16 text-white text-[20px] animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '4.5s' }}>favorite</span>
                                                        <span className="material-symbols-outlined absolute top-12 right-12 text-white text-[14px] animate-pulse">sparkles</span>
                                                    </div>

                                                    {/* Center avatar/species graphic */}
                                                    <div className="flex flex-col items-center justify-center text-center relative z-10 p-4 transition-transform duration-500 group-hover:scale-105">
                                                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg relative group-hover:rotate-6 transition-all duration-300">
                                                            <span className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] select-none">
                                                                {isCat ? '🐱' : isDog ? '🐶' : '🐾'}
                                                            </span>
                                                        </div>
                                                        <span className="mt-3 text-[9px] font-black tracking-widest uppercase text-white/95 bg-white/15 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full shadow-inner">
                                                            Mating Resume
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={pet.avatar_url} 
                                                    onError={() => {
                                                        setImageErrors(prev => ({ ...prev, [pet.id]: true }));
                                                    }}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                    alt={pet.name} 
                                                />
                                            );
                                        })()}
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        
                                        {/* Species icon indicator */}
                                        <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-rose-600 text-xs font-black px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">favorite</span>
                                            {pet.species?.toLowerCase() === 'dog' ? '🐶 Dog' : pet.species?.toLowerCase() === 'cat' ? '🐱 Cat' : pet.species}
                                        </span>
                                        
                                        {/* Badges Container - Gender & Sleek Share Button */}
                                        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                                            <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-full shadow-md flex items-center gap-1 ${pet.gender === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'}`}>
                                                {pet.gender === 'male' ? '♂️ Male' : '♀️ Female'}
                                            </span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSharePet(pet);
                                                }}
                                                className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:bg-white hover:text-rose-600 shadow-md flex items-center justify-center transition-all duration-300 active:scale-90 border border-slate-100/50"
                                                title="Share Profile Card"
                                            >
                                                <span className="material-symbols-outlined text-[15px] font-bold">share</span>
                                            </button>
                                        </div>

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

                                                           {user && pet.owner_id === user.id ? (
                                            <div className="w-full mt-auto">
                                                {/* Active Clickable Your Profile Button */}
                                                <button 
                                                    onClick={() => navigate(`/pet-profile?id=${pet.id}`)}
                                                    className="w-full h-10 bg-rose-50/60 text-rose-600 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-500/10 active:scale-95 font-extrabold rounded-xl text-xs transition-all duration-300 border border-rose-100 flex items-center justify-center gap-1 px-3 whitespace-nowrap"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">person</span>
                                                    Your Profile
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-full mt-auto flex items-center gap-1.5 relative">
                                                {/* 1. Primary Action: Propose Match */}
                                                <button 
                                                    onClick={() => handleOpenProposeModal(pet)}
                                                    className="flex-1 h-10 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-500/10 active:scale-95 font-extrabold rounded-xl text-xs transition-all duration-300 border border-rose-100 flex items-center justify-center gap-1 px-3 whitespace-nowrap"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">favorite</span>
                                                    Propose Match
                                                </button>
                                                
                                                {/* 2. Secondary AI Action: Try Agentic AI Match */}
                                                <button 
                                                    onClick={() => {
                                                        window.dispatchEvent(new CustomEvent('open-chatbot-mating', { detail: { pet } }));
                                                    }}
                                                    className="w-10 h-10 shrink-0 bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-lg hover:shadow-pink-500/20 active:scale-95 rounded-xl transition-all duration-300 flex items-center justify-center relative group/ai"
                                                >
                                                    {/* Glow pulsing ring for premium vibe */}
                                                    <div className="absolute inset-0 rounded-xl bg-pink-500/30 animate-ping opacity-75 group-hover/ai:opacity-0 transition-opacity duration-300 pointer-events-none"></div>
                                                    
                                                    <span className="material-symbols-outlined text-[18px] relative z-10">smart_toy</span>
                                                    
                                                    {/* Custom pure CSS glassmorphic tooltip */}
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900/95 text-[10px] font-bold text-white rounded-lg shadow-xl opacity-0 translate-y-1 pointer-events-none group-hover/ai:opacity-100 group-hover/ai:translate-y-0 transition-all duration-200 whitespace-nowrap z-50">
                                                        Try Agentic AI Match
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95"></div>
                                                    </div>
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
            {showListModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-14 bg-slate-950/70 backdrop-blur-md animate-fade-in">
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

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                            {listMode === 'select' ? (
                                <form id="selectPetForm" onSubmit={handleListExistingPet} className="space-y-4">
                                    {myPets.filter(p => !matingPets.some(mp => mp.pet_id === p.id)).length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-slate-500 font-semibold mb-2">No unlisted pets found</p>
                                            <button 
                                                type="button"
                                                onClick={() => setListMode('register')}
                                                className="text-xs font-black text-rose-500 hover:text-rose-600"
                                            >
                                                Register a new one instead &rarr;
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Select Pet *</label>
                                                <select 
                                                    required
                                                    value={selectedPetId}
                                                    onChange={e => setSelectedPetId(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                                >
                                                    <option value="">-- Choose one of your registered pets --</option>
                                                    {myPets.filter(p => !matingPets.some(mp => mp.pet_id === p.id)).map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.breed || 'Mixed'}, {p.gender})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Location (Cairo District) *</label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={listExistingForm.location}
                                                    onChange={e => setListExistingForm({...listExistingForm, location: e.target.value})}
                                                    placeholder="e.g. Maadi, Zamalek, New Cairo" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Breeding Bio/Description *</label>
                                                <textarea 
                                                    required 
                                                    value={listExistingForm.bio}
                                                    onChange={e => setListExistingForm({...listExistingForm, bio: e.target.value})}
                                                    rows="3" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                                    placeholder="Introduce your companion! Mention achievements, certifications, health checks, or preferences..."
                                                ></textarea>
                                            </div>
                                        </>
                                    )}
                                </form>
                            ) : (
                                <form id="registerNewForm" onSubmit={handleRegisterNewPet} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Pet Name *</label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={registerNewForm.name}
                                                onChange={e => setRegisterNewForm({...registerNewForm, name: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Species *</label>
                                            <select 
                                                required
                                                value={registerNewForm.species}
                                                onChange={e => setRegisterNewForm({...registerNewForm, species: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            >
                                                <option value="dog">Dog</option>
                                                <option value="cat">Cat</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Breed *</label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={registerNewForm.breed}
                                                onChange={e => setRegisterNewForm({...registerNewForm, breed: e.target.value})}
                                                placeholder="e.g. German Shepherd, Persian"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Gender *</label>
                                            <select 
                                                required
                                                value={registerNewForm.gender}
                                                onChange={e => setRegisterNewForm({...registerNewForm, gender: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Age (Years) *</label>
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                required 
                                                value={registerNewForm.age_years}
                                                onChange={e => setRegisterNewForm({...registerNewForm, age_years: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Weight (kg)</label>
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                value={registerNewForm.weight_kg}
                                                onChange={e => setRegisterNewForm({...registerNewForm, weight_kg: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Cairo District/Location *</label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={registerNewForm.location}
                                            onChange={e => setRegisterNewForm({...registerNewForm, location: e.target.value})}
                                            placeholder="e.g. Zamalek, Heliopolis, Maadi"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Breeding Bio/Description *</label>
                                        <textarea 
                                            required 
                                            value={registerNewForm.bio}
                                            onChange={e => setRegisterNewForm({...registerNewForm, bio: e.target.value})}
                                            rows="3" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                            placeholder="Introduce your companion! Mention achievements, health, certificates..."
                                        ></textarea>
                                    </div>

                                    {/* Premium Drag and Drop Photo Uploader */}
                                    <div className="space-y-3">
                                        <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">
                                            Pet Profile Photo *
                                        </label>
                                        
                                        {/* Hidden real input for native HTML5 required validation */}
                                        <input 
                                            type="text" 
                                            required 
                                            value={registerNewForm.avatar_url} 
                                            onChange={() => {}} // dummy handler to avoid read-only React warnings
                                            className="sr-only h-0 w-0 absolute" 
                                        />

                                        {registerNewForm.avatar_url ? (
                                            /* Successful Upload State with high-fidelity preview */
                                            <div className="relative group rounded-2xl overflow-hidden border border-slate-200/80 shadow-md bg-slate-50 transition-all duration-300">
                                                <div className="h-48 w-full relative overflow-hidden flex items-center justify-center">
                                                    <img 
                                                        src={registerNewForm.avatar_url} 
                                                        alt="Pet Preview" 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                                        <button 
                                                            type="button"
                                                            onClick={() => document.getElementById('petPhotoUploadBtn').click()}
                                                            className="bg-white/95 backdrop-blur-sm text-slate-800 hover:bg-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px] font-bold">photo_camera</span>
                                                            Change Photo
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setRegisterNewForm(prev => ({ ...prev, avatar_url: '' }))}
                                                            className="bg-rose-600/95 backdrop-blur-sm text-white hover:bg-rose-600 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Drag & Drop Zone */
                                            <div 
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                onClick={() => document.getElementById('petPhotoUploadBtn').click()}
                                                className={`relative h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
                                                    isDragging 
                                                        ? 'border-rose-500 bg-rose-50/50 text-rose-600 scale-[1.01] shadow-inner shadow-rose-500/5' 
                                                        : 'border-slate-300 bg-slate-50 hover:bg-rose-50/20 hover:border-rose-300 hover:shadow-sm text-slate-500'
                                                }`}
                                            >
                                                {uploadingPhoto ? (
                                                    /* Loading Spinner Overlay */
                                                    <div className="flex flex-col items-center justify-center space-y-3">
                                                        <div className="w-9 h-9 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
                                                        <p className="text-xs font-black text-rose-600 tracking-wide animate-pulse">Uploading photo to Mewoo cloud... 📸</p>
                                                    </div>
                                                ) : (
                                                    /* Dropzone Content */
                                                    <div className="space-y-2 flex flex-col items-center">
                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-rose-500 group-hover:scale-110 transition-transform duration-300 border border-slate-100">
                                                            <span className="material-symbols-outlined text-[28px] font-bold">cloud_upload</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-700 tracking-wide">
                                                                Drag & drop your pet's photo here, or <span className="text-rose-500 hover:text-rose-600 underline">browse</span>
                                                            </p>
                                                            <p className="text-[10px] font-semibold text-slate-400 mt-1">
                                                                Supports JPG, JPEG, PNG up to 5MB
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <input 
                                            id="petPhotoUploadBtn"
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                        />

                                        {/* Premium Expandable URL fallback accordion */}
                                        <div className="border border-slate-100 rounded-xl overflow-hidden mt-2 bg-slate-50/50">
                                            <button 
                                                type="button"
                                                onClick={() => setShowUrlInput(prev => !prev)}
                                                className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[15px]">link</span>
                                                    Or Paste Image URL Instead
                                                </span>
                                                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${showUrlInput ? 'rotate-180' : ''}`}>
                                                    expand_more
                                                </span>
                                            </button>
                                            
                                            {showUrlInput && (
                                                <div className="px-4 pb-3 pt-1 border-t border-slate-100 animate-slide-down">
                                                    <input 
                                                        type="url" 
                                                        value={registerNewForm.avatar_url}
                                                        onChange={e => setRegisterNewForm({...registerNewForm, avatar_url: e.target.value})}
                                                        placeholder="e.g. https://images.unsplash.com/photo-..."
                                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-slate-400 font-medium"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowListModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
                            {listMode === 'select' ? (
                                <button 
                                    type="submit" 
                                    form="selectPetForm" 
                                    disabled={submitting || !selectedPetId}
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
                </div>,
                document.body
            )}

            {/* PROPOSE MATING MATCH MODAL */}
            {showProposeModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-14 bg-slate-950/70 backdrop-blur-md animate-fade-in">
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

                            {(() => {
                                const compatiblePets = myPets.filter(p => 
                                    p.species === showProposeModal.species
                                );

                                if (compatiblePets.length === 0) {
                                    return (
                                        <div className="py-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                                            <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">info</span>
                                            <p className="text-slate-500 text-xs font-semibold">You don't have any registered pets of the same species to propose.</p>
                                            <button 
                                                type="button" 
                                                onClick={() => { setShowProposeModal(null); setShowListModal(true); setListMode('register'); }}
                                                className="text-xs font-black text-rose-500 hover:text-rose-600 mt-2 block mx-auto"
                                            >
                                                Register a compatible pet &rarr;
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                    <form id="proposalForm" onSubmit={handleSendProposal} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wider">Select your applicant pet *</label>
                                            <select 
                                                required 
                                                value={proposalForm.applicant_pet_id}
                                                onChange={e => setProposalForm({...proposalForm, applicant_pet_id: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                            >
                                                <option value="">-- Select compatible pet --</option>
                                                {compatiblePets.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.breed || 'Mixed'}, {p.gender})</option>
                                                ))}
                                            </select>
                                            
                                            {proposalForm.applicant_pet_id && (() => {
                                                const selectedApplicant = compatiblePets.find(p => p.id === proposalForm.applicant_pet_id);
                                                if (selectedApplicant && selectedApplicant.gender === showProposeModal.gender) {
                                                    return (
                                                        <div className="mt-2 text-amber-600 text-[10px] font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-start gap-2">
                                                            <span className="material-symbols-outlined text-[16px]">warning</span>
                                                            <span className="leading-tight">Note: Both pets are {showProposeModal.gender}. The owner might prefer an opposite-gender mate.</span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
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
                </div>,
                document.body
            )}

            {/* 4. PREMIUM GLASSMORPHIC PET MATING CARD MODAL */}
            {selectedSharePet && (() => {
                const getThemeClasses = () => {
                    switch (cardTheme) {
                        case 'blue':
                            return {
                                bg: 'from-[#1e40af] via-[#3b82f6] to-[#1e1b4b] shadow-[0_20px_50px_rgba(59,130,246,0.3)]',
                                accentText: 'text-blue-200 font-extrabold',
                                accentBg: 'bg-blue-500/40 border-blue-300/30',
                                subText: 'text-blue-100/90',
                                border: 'border-white/25',
                                glow: 'bg-blue-300/10 bg-indigo-500/10'
                            };
                        case 'emerald':
                            return {
                                bg: 'from-[#065f46] via-[#10b981] to-[#022c22] shadow-[0_20px_50px_rgba(16,185,129,0.35)]',
                                accentText: 'text-emerald-200 font-extrabold',
                                accentBg: 'bg-emerald-500/40 border-emerald-300/30',
                                subText: 'text-emerald-100/90',
                                border: 'border-white/25',
                                glow: 'bg-teal-300/10 bg-emerald-500/10'
                            };
                        case 'purple':
                            return {
                                bg: 'from-[#6b21a8] via-[#a855f7] to-[#2e1065] shadow-[0_20px_50px_rgba(168,85,247,0.35)]',
                                accentText: 'text-purple-200 font-extrabold',
                                accentBg: 'bg-purple-500/40 border-purple-300/30',
                                subText: 'text-purple-100/90',
                                border: 'border-white/25',
                                glow: 'bg-fuchsia-300/10 bg-purple-500/10'
                            };
                        case 'dark':
                            return {
                                bg: 'from-[#1e293b] via-[#334155] to-[#0f172a] shadow-[0_20px_50px_rgba(51,65,85,0.35)]',
                                accentText: 'text-slate-350 font-extrabold',
                                accentBg: 'bg-slate-500/40 border-slate-300/30',
                                subText: 'text-slate-200/90',
                                border: 'border-white/25',
                                glow: 'bg-slate-300/10 bg-slate-500/10'
                            };
                        case 'rose':
                        default:
                            return {
                                bg: 'from-[#ff2a5f] via-[#e20a3b] to-[#7a0023] shadow-[0_20px_50px_rgba(226,10,59,0.35)]',
                                accentText: 'text-rose-250 font-extrabold',
                                accentBg: 'bg-rose-500/40 border-rose-300/30',
                                subText: 'text-rose-100/90',
                                border: 'border-white/25',
                                glow: 'bg-pink-300/10 bg-rose-500/10'
                            };
                    }
                };

                const theme = getThemeClasses();

                return createPortal(
                    <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-14 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={() => setSelectedSharePet(null)}>
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
                            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 flex flex-col items-center">
                                
                                {/* PREMIUM PREVIEW CARD CANVAS */}
                                <div 
                                    id="mating-card-canvas" 
                                    className={`w-[360px] min-w-[360px] bg-gradient-to-br ${theme.bg} rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col gap-6 border ${theme.border}`}
                                    style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                                >
                                    {/* Background Patterns & Glowing Accents */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none z-10"></div>
                                    <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                    <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                    
                                    {/* Header badge */}
                                    <div className="flex justify-between items-center z-10">
                                        <span className="bg-white/15 backdrop-blur-lg text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full border border-white/25 flex items-center gap-1.5 shadow-sm text-white" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
                                            🐾 MEWOO MATCH
                                        </span>
                                        <span className={`backdrop-blur-md text-[10px] font-extrabold px-3 py-1.5 rounded-full border flex items-center gap-1.5 shadow-sm text-white ${theme.accentBg}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
                                            Ready to Mate <span className="animate-pulse text-white">❤️</span>
                                        </span>
                                    </div>
 
                                    {/* Pet Profile layout */}
                                    <div className="flex items-center gap-5 z-10 w-full">
                                        <div className="relative shrink-0 flex items-center justify-center p-[3px] rounded-full bg-white/20 shadow-xl border border-white/15">
                                            <img 
                                                src={selectedSharePet.avatar_url} 
                                                className="w-20 h-20 rounded-full object-cover border-2 border-white"
                                                alt={selectedSharePet.name} 
                                                crossOrigin="anonymous"
                                            />
                                            <span className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg border border-white/90 ${selectedSharePet.gender === 'male' ? 'bg-gradient-to-r from-blue-400 to-indigo-600 text-white' : 'bg-gradient-to-r from-pink-400 to-rose-600 text-white'}`}>
                                                {selectedSharePet.gender === 'male' ? '♂' : '♀'}
                                            </span>
                                        </div>
                                        <div className="flex-none w-[205px] text-left">
                                            <h4 className="text-2xl font-black tracking-normal text-white leading-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] pr-1" style={{ letterSpacing: '0.02em' }}>{truncateText(capitalizeText(selectedSharePet.name), 14)}</h4>
                                            <p className={`${theme.subText} text-xs font-bold mt-1 flex items-center gap-1.5`}>
                                                {/* Vector SVG Paw Icon */}
                                                <svg className="w-3.5 h-3.5 fill-current opacity-100 inline-block shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3.5 3 4.5 1-.99 3-2.5 3-4.5 0-1.66-1.34-3-3-3zm-4.5-2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm9 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-9.75-5.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm10.5 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z" />
                                                </svg>
                                                <span>{truncateText(capitalizeText(selectedSharePet.breed || 'Mixed Breed'), 18)}</span>
                                            </p>
                                            
                                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                <span className="bg-white/10 h-6 flex items-center justify-center px-2.5 rounded-full text-[10px] font-black text-white border border-white/15 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                                                    🎂 {selectedSharePet.age_years} Years
                                                </span>
                                                {selectedSharePet.weight_kg && (
                                                    <span className="bg-white/10 h-6 flex items-center justify-center px-2.5 rounded-full text-[10px] font-black text-white border border-white/15 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                                                        ⚖️ {selectedSharePet.weight_kg} kg
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
 
                                    {/* Details block */}
                                    <div className="bg-white/10 border border-white/20 rounded-[24px] p-5 space-y-4 z-10 shadow-[0_8px_32px_rgba(0,0,0,0.08)]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                            <span className={`flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase ${theme.accentText}`}>
                                                {/* Vector SVG Pin Icon */}
                                                <svg className="w-3.5 h-3.5 fill-none stroke-current inline-block shrink-0" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"></path>
                                                </svg>
                                                LOCATION
                                            </span>
                                            <span className="bg-white/15 border border-white/20 h-7 flex items-center justify-center px-3.5 rounded-full text-white font-black text-[10px] tracking-wide shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.22)' }}>
                                                {truncateText(capitalizeText(selectedSharePet.location || 'Cairo, Egypt'), 18)}
                                            </span>
                                        </div>
                                        
                                        <div className="relative pt-1 text-left">
                                            {/* Vector SVG Quote Icon */}
                                            <svg className="w-6 h-6 text-white/20 absolute -top-2.5 -left-1.5 inline-block shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
                                            </svg>
                                            <p className="text-[11.5px] text-white leading-relaxed pl-5 italic font-medium tracking-wide">
                                                {customQuote || 'Looking for a lovely matching companion. Reach out to arrange details! ✨'}
                                            </p>
                                        </div>
                                    </div>
 
                                    {/* Brand Footer & QR Code */}
                                    <div className="flex items-center justify-between border-t border-white/15 pt-4 z-10 w-full">
                                        <div className="text-left flex flex-col justify-center flex-none w-[200px]">
                                            <p className="text-[8px] font-black uppercase text-white/80 tracking-widest leading-normal">Scan Code to Match</p>
                                            <p className="text-[12px] font-black tracking-wider text-white mt-1 uppercase leading-normal">
                                                {truncateText(customContact || 'mewoo.pet/match', 24)}
                                            </p>
                                        </div>
                                        
                                        {/* Dynamic deep-linked QR Code */}
                                        <div className="bg-white p-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center shrink-0 hover:scale-[1.05] active:scale-[0.95] transition-all duration-300">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/owner-profile?id=${selectedSharePet.owner_id || selectedSharePet.user_id}&pet=${selectedSharePet.id}&utm_source=mating_card&utm_medium=qr`)}&color=0f172a`} 
                                                alt="Mating Deep QR" 
                                                className="w-[48px] h-[48px] rounded-lg" 
                                                crossOrigin="anonymous"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* PREMIUM CARD DESIGN CUSTOMIZER */}
                                <div className="w-full bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block">Customize Card Design</h4>
                                    
                                    {/* Color Themes */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500">Poster Color Theme</label>
                                        <div className="flex gap-3">
                                            {[
                                                { id: 'rose', name: 'Sunset Rose', bg: 'bg-gradient-to-r from-pink-500 to-rose-600 border-pink-400' },
                                                { id: 'blue', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400' },
                                                { id: 'emerald', name: 'Emerald Nature', bg: 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-400' },
                                                { id: 'purple', name: 'Luxury Purple', bg: 'bg-gradient-to-r from-purple-600 to-indigo-700 border-purple-400' },
                                                { id: 'dark', name: 'Dark Cyber', bg: 'bg-gradient-to-r from-slate-700 to-slate-900 border-slate-500' }
                                            ].map((themeItem) => (
                                                <button
                                                    key={themeItem.id}
                                                    onClick={() => setCardTheme(themeItem.id)}
                                                    className={`w-8 h-8 rounded-full ${themeItem.bg} border-2 transition-all ${cardTheme === themeItem.id ? 'scale-110 shadow-md ring-2 ring-blue-500/20' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                                                    title={themeItem.name}
                                                ></button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Edit Quote Description */}
                                    <div className="space-y-1.5 pt-1">
                                        <label htmlFor="custom-quote-input" className="text-[11px] font-bold text-slate-500 flex justify-between">
                                            <span>Personalized Bio / Quote</span>
                                            <span className="text-[9px] text-slate-400 font-medium">Live Preview</span>
                                        </label>
                                        <textarea
                                            id="custom-quote-input"
                                            rows="2"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all shadow-inner"
                                            placeholder="Write a custom bio..."
                                            value={customQuote}
                                            onChange={(e) => setCustomQuote(e.target.value)}
                                        ></textarea>
                                    </div>

                                    {/* Custom Contact Link / Handle */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="custom-contact-input" className="text-[11px] font-bold text-slate-500 flex justify-between">
                                            <span>Contact / Footer Handle</span>
                                            <span className="text-[9px] text-slate-400 font-medium">e.g. Phone or Instagram</span>
                                        </label>
                                        <input
                                            id="custom-contact-input"
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                                            placeholder="mewoo.pet/match"
                                            value={customContact}
                                            onChange={(e) => setCustomContact(e.target.value)}
                                        />
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
                                                <span>Generating HD Card... {downloadProgress}%</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px]">download</span>
                                                <span>Download Mating Poster HD</span>
                                            </>
                                        )}
                                    </button>

                                    <button 
                                        onClick={() => handleCopyShareLink(selectedSharePet.id)}
                                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-3.5 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        <span>{copiedLink ? 'Copied Link!' : 'Copy Instagram Story / WhatsApp Mating Post Link'}</span>
                                    </button>
                                    
                                    <p className="text-center text-[10px] text-slate-400 font-medium pt-2">
                                        Tip: Share to Cairo Pet Mating circles to discover high-quality breeding companions immediately.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                );
            })()}
        </div>
    );
};

export default PetMatchTab;
