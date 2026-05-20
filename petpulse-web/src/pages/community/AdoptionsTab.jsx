import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

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
                        <span className="flex items-center gap-1.5 text-indigo-600 font-semibold bg-indigo-50 px-3 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            {myApplications.length} My Applications
                        </span>
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
                        const appStatus = getApplicationStatus(pet.id);
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
                                        <button
                                            onClick={() => navigate(`/manage-pet?id=${pet.id}`)}
                                            className="w-full border-2 border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">settings</span>
                                            Manage Listing
                                        </button>
                                    ) : appStatus ? (
                                        <div className="w-full text-center py-2.5">
                                            <StatusBadge status={appStatus} />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleOpenApplyModal(pet)}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">favorite</span>
                                            Apply to Adopt
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== LIST PET FOR ADOPTION MODAL ===== */}
            {showListModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowListModal(false)}>
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
                                                className="w-14 h-14 rounded-xl object-cover border border-slate-200"
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
                </div>
            )}

            {/* ===== APPLY TO ADOPT MODAL ===== */}
            {showApplyModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowApplyModal(null)}>
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
                </div>
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
