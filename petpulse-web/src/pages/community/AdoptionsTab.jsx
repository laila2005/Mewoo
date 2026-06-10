import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const truncateText = (str, maxLength) => {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};

const capitalizeText = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const AdoptionsTab = ({ searchQuery }) => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [pets, setPets] = useState([]);
    const [myPets, setMyPets] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showListModal, setShowListModal] = useState(false);
    const [showApplyModal, setShowApplyModal] = useState(null); // pet object
    const [submitting, setSubmitting] = useState(false);
    const [showMyAppsModal, setShowMyAppsModal] = useState(false);
    const [selectedAppForView, setSelectedAppForView] = useState(null);

    // Adoption Story Sharing states
    const [selectedSharePet, setSelectedSharePet] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [cardTheme, setCardTheme] = useState('blue');
    const [customQuote, setCustomQuote] = useState('');
    const [customContact, setCustomContact] = useState('');

    useEffect(() => {
        if (selectedSharePet) {
            setCardTheme('blue');
            setCustomQuote(selectedSharePet.adoption_description || 'Looking for a warm, loving home and family to call my own. Please apply or share! ✨');
            setCustomContact('mewoo.pet/adopt');
        }
    }, [selectedSharePet]);

    // Portal body scroll lock
    useEffect(() => {
        if (selectedSharePet || showApplyModal || showListModal || showMyAppsModal || selectedAppForView) {
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
    }, [selectedSharePet, showApplyModal, showListModal, showMyAppsModal, selectedAppForView]);

    const handleSimulateDownload = async (petName) => {
        const cardElement = document.getElementById('adoption-card-canvas');
        if (!cardElement) {
            toast.error('Failed to locate the Adoption Story Card rendering container.');
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
            link.download = `${petName.replace(/\s+/g, '_')}_adoption_story_poster.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setDownloadProgress(100);
            setTimeout(() => {
                setIsDownloading(false);
                toast.success(`${petName}'s Adoption Story poster downloaded to your device! 🐾`);
            }, 400);

        } catch (error) {
            console.error('Failed to generate adoption story canvas:', error);
            toast.error('Failed to generate high-resolution card. Please try again.');
            setIsDownloading(false);
        }
    };

    const handleCopyShareLink = (petId) => {
        const shareUrl = `${window.location.origin}/community?tab=adoption&petId=${petId}`;
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        toast.success('Adoption Story link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // Apply form
    const [applyForm, setApplyForm] = useState({
        applicant_name: '',
        applicant_phone: '',
        applicant_message: '',
        pet_experience: '',
        housing_type: 'apartment',
    });

    useEffect(() => {
        fetchAdoptablePets();
        if (token) fetchMyApplications();
    }, [token]);

    const fetchAdoptablePets = async () => {
        try {
            const res = await axios.get(`${API_BASE}/pets/adoptable`);
            setPets(res.data.pets || []);
        } catch (err) {
            console.error('Failed to fetch adoptable pets:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyApplications = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/adoptions/my-applications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyApplications(res.data.applications || []);
        } catch (err) {
            console.error('Failed to fetch my applications:', err);
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

    const handleOpenListModal = () => {
        if (!user) { toast.error('Please log in first'); navigate('/login'); return; }
        fetchMyPets();
        setShowListModal(true);
    };

    const handleToggleAdoptable = async (pet) => {
        try {
            await axios.put(`${API_BASE}/pets/${pet.id}`, {
                is_adoptable: !pet.is_adoptable
            }, { headers: { Authorization: `Bearer ${token}` } });

            setMyPets(prev => prev.map(p => p.id === pet.id ? { ...p, is_adoptable: !p.is_adoptable } : p));
            toast.success(pet.is_adoptable ? `${pet.name} removed from adoption board` : `${pet.name} listed for adoption!`);
            fetchAdoptablePets();
        } catch (err) {
            toast.error('Failed to update pet');
        }
    };

    const handleOpenApplyModal = (pet) => {
        if (!user) { toast.error('Please log in to apply'); navigate('/login'); return; }
        setApplyForm({
            applicant_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            applicant_phone: '',
            applicant_message: '',
            pet_experience: '',
            housing_type: 'apartment',
        });
        setShowApplyModal(pet);
    };

    const handleSubmitApplication = async (e) => {
        e.preventDefault();
        if (!applyForm.applicant_name.trim()) { toast.error('Please enter your name'); return; }
        setSubmitting(true);
        try {
            await axios.post(`${API_BASE}/adoptions/apply`, {
                pet_id: showApplyModal.id,
                ...applyForm,
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success('Application submitted! The owner will be notified.');
            setShowApplyModal(null);
            fetchMyApplications();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const getApplicationStatus = (petId) => {
        const app = myApplications.find(a => a.pet_id === petId);
        return app ? app.status : null;
    };

    const getApplicationRecord = (petId) => {
        return myApplications.find(a => a.pet_id === petId);
    };

    const filtered = pets.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) ||
               (p.breed || '').toLowerCase().includes(q) ||
               (p.species || '').toLowerCase().includes(q);
    });

    const SkeletonCard = () => (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="h-56 bg-slate-200" />
            <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
        </div>
    );

    const StatusBadge = ({ status }) => {
        if (status === 'approved') return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">Approved ✓</span>;
        if (status === 'rejected') return <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">Not Selected</span>;
        return <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase animate-pulse">Pending</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-blue-600 text-[28px]">volunteer_activism</span>
                    </div>
                    <div>
                        <h3 className="text-blue-900 font-bold text-lg">Adoption Center</h3>
                        <p className="text-blue-700 text-sm hidden sm:block">Give a loving home to pets in need.</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenListModal}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-500/20 text-sm whitespace-nowrap active:scale-95 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    List Pet for Adoption
                </button>
            </div>

            {/* Stats */}
            {!loading && (
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[16px]">pets</span>
                        {pets.length} Available
                    </span>
                    {myApplications.length > 0 && (
                        <button 
                            onClick={() => setShowMyAppsModal(true)}
                            className="flex items-center gap-1.5 text-indigo-600 font-semibold bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-3 py-1.5 rounded-full transition-all border border-indigo-100/50"
                        >
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            {myApplications.length} My Applications
                        </button>
                    )}
                </div>
            )}

            {/* Pet Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-blue-300 text-[40px]">search_off</span>
                    </div>
                    <h4 className="font-bold text-slate-700 text-lg mb-1">No pets available for adoption</h4>
                    <p className="text-slate-500 text-sm mb-6">Be the first to list a pet that needs a loving home.</p>
                    <button onClick={handleOpenListModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all active:scale-95 shadow-sm shadow-blue-500/20">
                        List Pet for Adoption
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(pet => {
                        const appRecord = getApplicationRecord(pet.id);
                        const appStatus = appRecord ? appRecord.status : null;
                        const isOwnPet = user && pet.owner_id === user.id;
                        return (
                            <div key={pet.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                                <div className="h-56 bg-slate-100 relative overflow-hidden">
                                    <img
                                        src={pet.avatar_url || `https://ui-avatars.com/api/?name=${pet.name}&background=dbeafe&color=2563eb&size=400`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        alt={pet.name}
                                    />
                                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                        {pet.species || 'Pet'}
                                    </span>
                                    {pet.gender && (
                                        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full">
                                            {pet.gender === 'male' ? '♂ Male' : pet.gender === 'female' ? '♀ Female' : pet.gender}
                                        </span>
                                    )}
                                </div>
                                <div className="p-5">
                                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{pet.name}</h4>
                                    <p className="text-sm text-slate-500 font-medium mb-1">
                                        {pet.breed || 'Mixed'} {pet.age_years ? `· ${pet.age_years} yr${pet.age_years !== 1 ? 's' : ''}` : ''}
                                    </p>

                                    {pet.location && (
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span> {pet.location}
                                        </p>
                                    )}

                                    {pet.adoption_description && (
                                        <p className="text-sm text-slate-600 mt-1 mb-3 line-clamp-2">{pet.adoption_description}</p>
                                    )}

                                    {pet.adoption_fee > 0 && (
                                        <p className="text-sm font-bold text-blue-600 mb-3">
                                            Adoption Fee: {pet.adoption_fee} EGP
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    {isOwnPet ? (
                                        <div className="w-full flex flex-col gap-2">
                                            <button
                                                onClick={() => navigate(`/manage-pet?id=${pet.id}`)}
                                                className="w-full border-2 border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">settings</span>
                                                Manage Listing
                                            </button>
                                            <button
                                                onClick={() => setSelectedSharePet(pet)}
                                                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-indigo-100 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">share</span>
                                                Share Adoption Story
                                            </button>
                                        </div>
                                    ) : appStatus ? (
                                        <div className="w-full flex flex-col gap-2">
                                            <button
                                                onClick={() => {
                                                    const record = getApplicationRecord(pet.id);
                                                    if (record) {
                                                        setSelectedAppForView(record);
                                                    }
                                                }}
                                                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl transition-all border border-slate-100 hover:border-indigo-100 flex flex-col items-center justify-center gap-1 group/status cursor-pointer active:scale-[0.98]"
                                            >
                                                <span className="text-[10px] font-bold text-slate-400 group-hover/status:text-indigo-600 transition-colors uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[13px]">visibility</span> Click to View Details
                                                </span>
                                                <StatusBadge status={appStatus} />
                                            </button>
                                            {appStatus === 'rejected' && appRecord && appRecord.rejection_reason && (
                                                <div className="px-3 py-2 bg-red-50/50 border border-red-100 rounded-xl text-center">
                                                    <p className="text-[9px] text-red-500 font-extrabold uppercase mb-0.5 tracking-wider">Reason:</p>
                                                    <p className="text-xs font-semibold text-slate-600 leading-normal italic">
                                                        "{appRecord.rejection_reason}"
                                                    </p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setSelectedSharePet(pet)}
                                                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-indigo-100 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">share</span>
                                                Share Adoption Story
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full flex flex-col gap-2">
                                            <button
                                                onClick={() => handleOpenApplyModal(pet)}
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">favorite</span>
                                                Apply to Adopt
                                            </button>
                                            <button
                                                onClick={() => setSelectedSharePet(pet)}
                                                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-indigo-100 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">share</span>
                                                Share Adoption Story
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== LIST PET FOR ADOPTION MODAL ===== */}
            {showListModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-10 sm:p-14" onClick={() => setShowListModal(false)}>
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600">add_circle</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">List for Adoption</h3>
                                    <p className="text-xs text-slate-500">Select a pet to list on the adoption board</p>
                                </div>
                            </div>
                            <button onClick={() => setShowListModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6">
                            {myPets.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-slate-300 text-[40px] mb-2 block">pets</span>
                                    <p className="text-slate-500 text-sm mb-4">You haven't added any pets yet.</p>
                                    <button onClick={() => { setShowListModal(false); navigate('/manage-pet?id=new'); }} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-xl text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
                                        Add Your First Pet
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {myPets.map(pet => (
                                        <div key={pet.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                            <img
                                                src={pet.avatar_url || `https://ui-avatars.com/api/?name=${pet.name}&background=dbeafe&color=2563eb`}
                                                className="w-14 h-14 rounded-xl object-cover border-slate-200"
                                                alt={pet.name}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-sm">{pet.name}</h4>
                                                <p className="text-xs text-slate-500">{pet.breed || 'Mixed'} · {pet.species}</p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleAdoptable(pet)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                                    pet.is_adoptable
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-600'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20'
                                                }`}
                                            >
                                                {pet.is_adoptable ? '✓ Listed' : 'List'}
                                            </button>
                                        </div>
                                    ))}
                                    <div className="pt-3 border-t border-slate-100">
                                        <button onClick={() => { setShowListModal(false); navigate('/manage-pet?id=new'); }} className="w-full border-2 border-dashed border-slate-300 text-slate-500 font-semibold py-3 rounded-xl text-sm hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">add</span>
                                            Add a New Pet
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== APPLY TO ADOPT MODAL ===== */}
            {showApplyModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-10 sm:p-14" onClick={() => setShowApplyModal(null)}>
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        {/* Header with pet info */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-10 px-6 py-5 text-white">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-lg">Adoption Application</h3>
                                <button onClick={() => setShowApplyModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                                <img
                                    src={showApplyModal.avatar_url || `https://ui-avatars.com/api/?name=${showApplyModal.name}&background=dbeafe&color=2563eb`}
                                    className="w-12 h-12 rounded-lg object-cover"
                                    alt={showApplyModal.name}
                                />
                                <div>
                                    <p className="font-bold">{showApplyModal.name}</p>
                                    <p className="text-sm text-white/80">{showApplyModal.breed || 'Mixed'} · {showApplyModal.species}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitApplication} className="p-6 space-y-5">
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Your Full Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={applyForm.applicant_name}
                                    onChange={(e) => setApplyForm({ ...applyForm, applicant_name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Phone Number</label>
                                <input
                                    type="tel"
                                    value={applyForm.applicant_phone}
                                    onChange={(e) => setApplyForm({ ...applyForm, applicant_phone: e.target.value })}
                                    placeholder="e.g. +20 100 123 4567"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Why do you want to adopt {showApplyModal.name}?</label>
                                <textarea
                                    value={applyForm.applicant_message}
                                    onChange={(e) => setApplyForm({ ...applyForm, applicant_message: e.target.value })}
                                    placeholder="Tell the owner about your home, family, and why you'd be a great match..."
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Pet Experience</label>
                                <textarea
                                    value={applyForm.pet_experience}
                                    onChange={(e) => setApplyForm({ ...applyForm, pet_experience: e.target.value })}
                                    placeholder="Have you owned pets before? If so, describe your experience..."
                                    rows={2}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Housing Type</label>
                                <select
                                    value={applyForm.housing_type}
                                    onChange={(e) => setApplyForm({ ...applyForm, housing_type: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                >
                                    <option value="apartment">Apartment</option>
                                    <option value="house">House with yard</option>
                                    <option value="villa">Villa</option>
                                    <option value="farm">Farm / Rural</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Submit Application
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-slate-400">The pet owner will review your application and contact you.</p>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== PREMIUM GLASSMORPHIC ADOPTION STORY MODAL ===== */}
            {selectedSharePet && (() => {
                const getThemeClasses = () => {
                    switch (cardTheme) {
                        case 'rose':
                            return {
                                bg: 'from-[#db2777] via-[#f43f5e] to-[#4c0519] shadow-[0_20px_50px_rgba(244,63,94,0.35)]',
                                accentText: 'text-rose-200 font-extrabold',
                                accentBg: 'bg-rose-500/40 border-rose-300/30',
                                subText: 'text-rose-100/90',
                                border: 'border-white/25',
                                glow: 'bg-pink-300/10 bg-rose-500/10'
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
                                accentText: 'text-slate-300 font-extrabold',
                                accentBg: 'bg-slate-500/40 border-slate-300/30',
                                subText: 'text-slate-200/90',
                                border: 'border-white/25',
                                glow: 'bg-slate-300/10 bg-slate-500/10'
                            };
                        case 'blue':
                        default:
                            return {
                                bg: 'from-[#1e40af] via-[#3b82f6] to-[#1e1b4b] shadow-[0_20px_50px_rgba(59,130,246,0.3)]',
                                accentText: 'text-blue-200 font-extrabold',
                                accentBg: 'bg-blue-500/40 border-blue-300/30',
                                subText: 'text-blue-100/90',
                                border: 'border-white/25',
                                glow: 'bg-blue-300/10 bg-indigo-500/10'
                            };
                    }
                };

                const theme = getThemeClasses();

                return createPortal(
                    <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-14 bg-slate-900/70 backdrop-blur-md animate-fade-in" onClick={() => setSelectedSharePet(null)}>
                        <div 
                            className="bg-white/85 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-slide-up relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-indigo-100/50 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white/50">
                                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600 animate-pulse">volunteer_activism</span> 
                                    Share Adoption Story Poster
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
                                    id="adoption-card-canvas" 
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
                                            🐾 HELP FIND A HOME
                                        </span>
                                        <span className={`backdrop-blur-md text-[10px] font-extrabold px-3 py-1.5 rounded-full border flex items-center gap-1.5 shadow-sm text-white ${theme.accentBg}`} style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
                                            Urgent Adopt <span className="animate-pulse text-white">💖</span>
                                        </span>
                                    </div>
 
                                    {/* Pet Profile layout */}
                                    <div className="flex items-center gap-5 z-10 w-full">
                                        <div className="relative shrink-0 flex items-center justify-center p-[3px] rounded-full bg-white/20 shadow-xl border border-white/15">
                                            <img 
                                                src={selectedSharePet.avatar_url || `https://ui-avatars.com/api/?name=${selectedSharePet.name}&background=dbeafe&color=2563eb`} 
                                                className="w-20 h-20 rounded-full object-cover border-2 border-white"
                                                alt={selectedSharePet.name} 
                                                crossOrigin="anonymous"
                                            />
                                            {selectedSharePet.gender && (
                                                <span className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-lg border border-white/90 ${selectedSharePet.gender === 'male' ? 'bg-gradient-to-r from-blue-400 to-indigo-600 text-white' : 'bg-gradient-to-r from-pink-400 to-rose-600 text-white'}`}>
                                                    {selectedSharePet.gender === 'male' ? '♂' : '♀'}
                                                </span>
                                            )}
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
                                                    {selectedSharePet.age_years ? `🎂 ${selectedSharePet.age_years} Years` : '🎂 Unknown'}
                                                </span>
                                                <span className="bg-white/10 h-6 flex items-center justify-center px-2.5 rounded-full text-[10px] font-black text-white border border-white/15 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                                                    🐾 {selectedSharePet.species}
                                                </span>
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
                                                {customQuote || 'Looking for a warm, loving home and family to call my own. Please apply or share! ✨'}
                                            </p>
                                        </div>
                                    </div>
 
                                    {/* Brand Footer & QR Code */}
                                    <div className="flex items-center justify-between border-t border-white/15 pt-4 z-10 w-full">
                                        <div className="text-left flex flex-col justify-center flex-none w-[200px]">
                                            <p className="text-[8px] font-black uppercase text-white/80 tracking-widest leading-normal">Scan Code to Apply</p>
                                            <p className="text-[12px] font-black tracking-wider text-white mt-1 uppercase leading-normal">
                                                {truncateText(customContact || 'mewoo.pet/adopt', 24)}
                                            </p>
                                        </div>
                                        
                                        {/* Dynamic deep-linked QR Code */}
                                        <div className="bg-white p-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center shrink-0 hover:scale-[1.05] active:scale-[0.95] transition-all duration-300">
                                            <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/community?tab=adoption&petId=${selectedSharePet.id}&utm_source=adoption_card&utm_medium=qr`)}&color=0f172a`}
                                                alt="Adoption QR Code"
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
                                                { id: 'blue', name: 'Ocean Blue', bg: 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400' },
                                                { id: 'rose', name: 'Sunset Rose', bg: 'bg-gradient-to-r from-pink-500 to-rose-600 border-pink-400' },
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
                                            placeholder="Write a custom description..."
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
                                            placeholder="mewoo.pet/adopt"
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
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs transition-all shadow-md shadow-indigo-500/10 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDownloading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Generating HD Poster... {downloadProgress}%</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px]">download</span>
                                                <span>Download Story Poster HD</span>
                                            </>
                                        )}
                                    </button>

                                    <button 
                                        onClick={() => handleCopyShareLink(selectedSharePet.id)}
                                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-3.5 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        <span>{copiedLink ? 'Copied Link!' : 'Copy Instagram Story / WhatsApp Adoption Post Link'}</span>
                                    </button>
                                    
                                    <p className="text-center text-[10px] text-slate-400 font-medium pt-2">
                                        Tip: Adoption posts drive 4.5x more click-through rate when shared on local Egyptian pet-friendly communities!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                );
            })()}

            {/* ===== MY APPLICATIONS LIST MODAL ===== */}
            {showMyAppsModal && createPortal(
                <div 
                    className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-10 sm:p-14" 
                    onClick={() => setShowMyAppsModal(false)}
                >
                    <div 
                        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto shadow-2xl animate-slide-up" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-indigo-600">description</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">My Applications</h3>
                                    <p className="text-xs text-slate-500">Track and review your submitted adoption requests</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMyAppsModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-3">
                            {myApplications.length === 0 ? (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-slate-300 text-[40px] mb-2 block">description</span>
                                    <p className="text-slate-500 text-sm font-semibold">You haven't applied for any pets yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {myApplications.map(app => (
                                        <div 
                                            key={app.id} 
                                            onClick={() => {
                                                setSelectedAppForView(app);
                                                setShowMyAppsModal(false);
                                            }}
                                            className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-150 bg-slate-50/55 hover:bg-indigo-50/20 hover:border-indigo-100 transition-all cursor-pointer group/item active:scale-[0.98]"
                                        >
                                            <img
                                                src={app.avatar_url || `https://ui-avatars.com/api/?name=${app.pet_name}&background=dbeafe&color=2563eb`}
                                                className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                                                alt={app.pet_name}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 group-hover/item:text-indigo-600 transition-colors">
                                                    {app.pet_name}
                                                    <span className="material-symbols-outlined text-[14px] text-slate-400 font-bold opacity-0 group-hover/item:opacity-100 transition-opacity">open_in_new</span>
                                                </h4>
                                                <p className="text-xs text-slate-500 font-semibold">{app.breed || 'Mixed'} · {app.species}</p>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-end gap-1">
                                                <StatusBadge status={app.status} />
                                                <span className="text-[9px] text-slate-400 font-bold">{new Date(app.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== DETAILED APPLICATION PREVIEW MODAL ===== */}
            {selectedAppForView && createPortal(
                <div 
                    className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-10 sm:p-14" 
                    onClick={() => setSelectedAppForView(null)}
                >
                    <div 
                        className="bg-white/95 backdrop-blur-md border border-slate-200/50 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-slide-up" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white relative">
                            <button 
                                onClick={() => setSelectedAppForView(null)} 
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                            <div className="flex items-center gap-4 mt-2">
                                <img
                                    src={selectedAppForView.avatar_url || `https://ui-avatars.com/api/?name=${selectedAppForView.pet_name}&background=dbeafe&color=2563eb`}
                                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/25 shadow-md"
                                    alt={selectedAppForView.pet_name}
                                />
                                <div>
                                    <h3 className="font-black text-xl leading-tight">{selectedAppForView.pet_name}</h3>
                                    <p className="text-sm text-blue-100 font-bold mt-0.5">{selectedAppForView.breed || 'Mixed'} · {selectedAppForView.species}</p>
                                    <div className="mt-2.5">
                                        <StatusBadge status={selectedAppForView.status} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Application Content Details */}
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] bg-white">
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Housing Environment</p>
                                    <p className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-blue-500">home</span>
                                        {selectedAppForView.housing_type || 'Apartment'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Reported By Owner</p>
                                    <p className="text-xs font-extrabold text-slate-800 truncate flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-indigo-500">person</span>
                                        {selectedAppForView.owner_first_name} {selectedAppForView.owner_last_name}
                                    </p>
                                </div>
                            </div>

                            {/* Submitted Details */}
                            <div className="space-y-4">
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Applicant Name</p>
                                        <p className="text-sm font-extrabold text-slate-800">{selectedAppForView.applicant_name}</p>
                                    </div>
                                    {selectedAppForView.applicant_phone && (
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Contact Phone</p>
                                            <p className="text-sm font-bold text-slate-700 font-mono">{selectedAppForView.applicant_phone}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedAppForView.applicant_message && (
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Why you want to adopt</p>
                                        <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 italic">
                                            "{selectedAppForView.applicant_message}"
                                        </p>
                                    </div>
                                )}

                                {selectedAppForView.pet_experience && (
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Your Pet Experience</p>
                                        <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                            {selectedAppForView.pet_experience}
                                        </p>
                                    </div>
                                )}

                                {/* Status specific coordinates (Rejection Reason or coordination) */}
                                {selectedAppForView.status === 'rejected' && selectedAppForView.rejection_reason && (
                                    <div className="bg-red-50/60 p-4 rounded-2xl border border-red-100 space-y-1">
                                        <p className="text-[10px] text-red-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">report</span> Rejection Feedback
                                        </p>
                                        <p className="text-xs font-semibold text-slate-600 leading-normal italic">
                                            "{selectedAppForView.rejection_reason}"
                                        </p>
                                    </div>
                                )}

                                {selectedAppForView.status === 'approved' && (
                                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-2.5">
                                        <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[15px] animate-pulse">celebration</span> Application Pre-Approved!
                                        </p>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                            Congratulations! The owner has pre-approved your application. Click below to coordinate meeting arrangements and pick up times.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Control Panel */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                            <button 
                                onClick={() => setSelectedAppForView(null)}
                                className="flex-1 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-[0.98]"
                            >
                                Close Details
                            </button>
                            {selectedAppForView.status === 'approved' && (
                                <button 
                                    onClick={() => {
                                        setSelectedAppForView(null);
                                        navigate(`/messages`);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-500/10 active:scale-[0.98] flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[15px]">chat</span>
                                    Coordinate Pick Up
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.3s ease-out; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            `}</style>
        </div>
    );
};

export default AdoptionsTab;
