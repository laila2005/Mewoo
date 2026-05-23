import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const PetHostingTab = ({ searchQuery }) => {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // Tabs inside Hosting: 'explore', 'dashboard', 'bookings'
    const [activeTab, setActiveTab] = useState('explore');
    
    // Data states
    const [hosts, setHosts] = useState([]);
    const [myHostProfile, setMyHostProfile] = useState(null);
    const [incomingBookings, setIncomingBookings] = useState([]);
    const [outgoingBookings, setOutgoingBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myPets, setMyPets] = useState([]);

    // Forms
    const [hostForm, setHostForm] = useState({
        is_available: false,
        hourly_rate: '',
        daily_rate: '',
        bio: '',
        max_pets: 1,
        accepted_pets: ['Dog', 'Cat']
    });

    const [submitting, setSubmitting] = useState(false);

    // Booking modal
    const [showBookModal, setShowBookModal] = useState(null); // stores host object
    const [bookForm, setBookForm] = useState({
        pet_id: '',
        start_date: '',
        end_date: ''
    });

    // Review Modal
    const [showReviewModal, setShowReviewModal] = useState(null); // stores booking object
    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        comment: ''
    });

    useEffect(() => {
        fetchHosts();
        if (token) {
            fetchMyHostProfile();
            fetchIncomingBookings();
            fetchOutgoingBookings();
            fetchMyPets();
        }
    }, [token]);

    // Portal body scroll lock
    useEffect(() => {
        if (showBookModal || showReviewModal) {
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
    }, [showBookModal, showReviewModal]);

    const fetchHosts = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/hosts`);
            setHosts(res.data.hosts || []);
        } catch (err) {
            console.error('Failed to fetch hosts:', err);
            toast.error('Failed to load hosts');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyHostProfile = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/hosts/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.profile) {
                setMyHostProfile(res.data.profile);
                setHostForm({
                    is_available: res.data.profile.is_available,
                    hourly_rate: res.data.profile.hourly_rate || '',
                    daily_rate: res.data.profile.daily_rate || '',
                    bio: res.data.profile.bio || '',
                    max_pets: res.data.profile.max_pets || 1,
                    accepted_pets: res.data.profile.accepted_pets || ['Dog', 'Cat']
                });
            }
        } catch (err) {
            console.error('Failed to fetch my host profile:', err);
        }
    };

    const fetchIncomingBookings = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/hosts/bookings/incoming`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIncomingBookings(res.data.bookings || []);
        } catch (err) {
            console.error('Failed to fetch incoming bookings:', err);
        }
    };

    const fetchOutgoingBookings = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/hosts/bookings/outgoing`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOutgoingBookings(res.data.bookings || []);
        } catch (err) {
            console.error('Failed to fetch outgoing bookings:', err);
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

    const requireLogin = (action) => {
        if (!user) {
            toast.error(`Please log in to ${action}`);
            navigate('/login');
            return false;
        }
        return true;
    };

    const handleSaveHostProfile = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const payload = { ...hostForm };
            if (payload.hourly_rate) payload.hourly_rate = parseFloat(payload.hourly_rate);
            if (payload.daily_rate) payload.daily_rate = parseFloat(payload.daily_rate);
            
            await axios.post(`${API_BASE}/hosts/profile`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Host profile updated successfully!');
            fetchMyHostProfile();
            fetchHosts(); // refresh hosts list
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setSubmitting(false);
        }
    };

    const calculateLivePrice = () => {
        if (!showBookModal) return 0;
        const { startDate, startTime, endDate, endTime } = bookForm;
        if (!startDate || !startTime || !endDate || !endTime) return 0;
        
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
        
        const hours = Math.abs(end - start) / 36e5;
        let totalPrice = 0;
        if (hours >= 24 && showBookModal.daily_rate) {
            totalPrice = Math.ceil(hours / 24) * parseFloat(showBookModal.daily_rate);
        } else if (showBookModal.hourly_rate) {
            totalPrice = Math.ceil(hours) * parseFloat(showBookModal.hourly_rate);
        } else if (showBookModal.daily_rate) {
            totalPrice = parseFloat(showBookModal.daily_rate);
        }
        return totalPrice;
    };

    const handleOpenBookModal = (host) => {
        if (!requireLogin('book a host')) return;
        if (host.user_id === user.id) {
            toast.error('You cannot book yourself');
            return;
        }
        setShowBookModal(host);
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const defaultStartDate = tomorrow.toISOString().split('T')[0];
        
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        const defaultEndDate = dayAfterTomorrow.toISOString().split('T')[0];

        setBookForm({ 
            pet_id: myPets[0]?.id || '', 
            startDate: defaultStartDate, 
            startTime: '09:00', 
            endDate: defaultEndDate, 
            endTime: '17:00' 
        });
    };

    const handleBookSubmit = async (e) => {
        e.preventDefault();
        const { pet_id, startDate, startTime, endDate, endTime } = bookForm;
        if (!pet_id || !startDate || !startTime || !endDate || !endTime) {
            return toast.error('Please fill all fields');
        }
        
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        if (end <= start) {
            return toast.error('End date must be after start date');
        }

        const totalPrice = calculateLivePrice();

        try {
            setSubmitting(true);
            await axios.post(`${API_BASE}/hosts/${showBookModal.user_id}/book`, {
                pet_id,
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                total_price: totalPrice
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Booking request sent successfully!');
            setShowBookModal(null);
            fetchOutgoingBookings();
            setActiveTab('bookings');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to send request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateBookingStatus = async (bookingId, status) => {
        try {
            const verb = status === 'approved' ? 'accept' : 'decline';
            if (!window.confirm(`Are you sure you want to ${verb} this booking?`)) return;

            await axios.put(`${API_BASE}/hosts/bookings/${bookingId}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Booking ${status} successfully!`);
            fetchIncomingBookings();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update booking status');
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await axios.post(`${API_BASE}/hosts/${showReviewModal.host_id}/reviews`, reviewForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Review submitted successfully!');
            setShowReviewModal(null);
            setReviewForm({ rating: 5, comment: '' });
            fetchHosts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    // Filters
    const filteredHosts = hosts.filter(host => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return host.first_name.toLowerCase().includes(q) || 
               host.last_name.toLowerCase().includes(q) ||
               (host.bio && host.bio.toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-purple-500/20 text-white border border-purple-400/20 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="text-center sm:text-left z-10">
                    <h2 className="text-2xl sm:text-3xl font-black mb-2 flex items-center justify-center sm:justify-start gap-2">
                        <span className="material-symbols-outlined text-[32px] text-purple-100">home</span>
                        Pet Hosting
                    </h2>
                    <p className="text-purple-100/90 text-sm max-w-md font-medium">
                        Find a loving temporary home for your pet, or become a host and earn money while spending time with pets!
                    </p>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-slate-200 gap-6 overflow-x-auto hide-scrollbar">
                <button onClick={() => setActiveTab('explore')} className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'explore' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Find a Host
                </button>
                {token && (
                    <>
                        <button onClick={() => setActiveTab('dashboard')} className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                            <span className="material-symbols-outlined text-[18px]">storefront</span>
                            Host Dashboard
                        </button>
                        <button onClick={() => setActiveTab('bookings')} className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'bookings' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                            <span className="material-symbols-outlined text-[18px]">book_online</span>
                            My Bookings
                            {incomingBookings.filter(b => b.status === 'pending').length > 0 && (
                                <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                                    {incomingBookings.filter(b => b.status === 'pending').length}
                                </span>
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* 1. EXPLORE TAB */}
            {activeTab === 'explore' && (
                <div className="space-y-6">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500 font-bold">Loading hosts...</div>
                    ) : filteredHosts.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
                            <span className="material-symbols-outlined text-[64px] text-purple-200 mb-3">sentiment_dissatisfied</span>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">No Hosts Found</h4>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">Be the first to become a pet host!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredHosts.map(host => (
                                <div key={host.user_id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group relative p-5">
                                    <div className="flex items-center gap-4 mb-4">
                                        <img src={host.avatar || `https://ui-avatars.com/api/?name=${host.first_name}+${host.last_name}&background=f3e8ff&color=9333ea`} className="w-16 h-16 rounded-full object-cover border-2 border-purple-100" alt={host.first_name} />
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{host.first_name} {host.last_name}</h4>
                                            <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                                                <span className="material-symbols-outlined text-[14px] text-amber-400" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                {parseFloat(host.average_rating).toFixed(1)} ({host.review_count} reviews)
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                                        <div>
                                            <span className="text-slate-400 font-bold block mb-1">Hourly</span>
                                            <span className="font-black text-purple-600">{host.hourly_rate ? `${host.hourly_rate} EGP` : 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold block mb-1">Daily</span>
                                            <span className="font-black text-purple-600">{host.daily_rate ? `${host.daily_rate} EGP` : 'N/A'}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-5 leading-relaxed line-clamp-3 italic flex-1">"{host.bio}"</p>
                                    <button 
                                        onClick={() => handleOpenBookModal(host)}
                                        className="w-full bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white font-black py-3 rounded-2xl text-xs transition-all border border-purple-100"
                                    >
                                        Request Booking
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 2. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <h3 className="font-black text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-500">storefront</span> Host Profile Settings
                    </h3>
                    <form onSubmit={handleSaveHostProfile} className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                            <div>
                                <h4 className="font-bold text-slate-800">Available for Hosting</h4>
                                <p className="text-xs text-slate-500">Turn this on to appear in the exploration list.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={hostForm.is_available} onChange={(e) => setHostForm({...hostForm, is_available: e.target.checked})} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                            </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Hourly Rate (EGP)</label>
                                <input type="number" min="50" max="5000" placeholder="e.g. 100" value={hostForm.hourly_rate} onChange={(e) => setHostForm({...hostForm, hourly_rate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Daily Rate (EGP)</label>
                                <input type="number" min="50" max="5000" placeholder="e.g. 500" value={hostForm.daily_rate} onChange={(e) => setHostForm({...hostForm, daily_rate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">About You (Bio)</label>
                            <textarea rows="4" placeholder="Describe your experience with pets, your home environment, etc." value={hostForm.bio} onChange={(e) => setHostForm({...hostForm, bio: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm resize-none"></textarea>
                        </div>
                        <button type="submit" disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50">
                            {submitting ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>
            )}

            {/* 3. BOOKINGS TAB */}
            {activeTab === 'bookings' && (
                <div className="space-y-8">
                    {/* Incoming Requests */}
                    <div>
                        <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-500">move_to_inbox</span> Incoming Requests
                        </h3>
                        {incomingBookings.length === 0 ? (
                            <p className="text-slate-400 text-sm italic p-6 bg-white rounded-2xl border border-slate-100">No requests yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {incomingBookings.map(b => (
                                    <div key={b.id} className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row gap-6 shadow-sm">
                                        <div className="flex gap-4 items-center shrink-0">
                                            <img src={b.owner_avatar || `https://ui-avatars.com/api/?name=${b.owner_first_name}+${b.owner_last_name}`} className="w-12 h-12 rounded-full border-2 border-slate-100" alt="Owner" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-400">Owner</p>
                                                <p className="font-bold text-slate-800">{b.owner_first_name} {b.owner_last_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-center shrink-0 bg-slate-50 px-4 py-2 rounded-xl">
                                            <img src={b.pet_avatar} className="w-10 h-10 rounded-full object-cover" alt="Pet" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-400">Pet to Host</p>
                                                <p className="font-bold text-slate-800">{b.pet_name} ({b.pet_species})</p>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-500 mb-1">
                                                <strong>From:</strong> {new Date(b.start_date).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                <strong>To:</strong> {new Date(b.end_date).toLocaleString()}
                                            </div>
                                            <div className="mt-2 font-black text-purple-600">Total: {parseFloat(b.total_price).toFixed(2)} EGP</div>
                                        </div>
                                        <div className="shrink-0 flex flex-col justify-center gap-2 min-w-[120px]">
                                            {b.status === 'pending' ? (
                                                <>
                                                    <button onClick={() => handleUpdateBookingStatus(b.id, 'approved')} className="bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs hover:bg-emerald-600 w-full">Approve</button>
                                                    <button onClick={() => handleUpdateBookingStatus(b.id, 'rejected')} className="bg-slate-100 text-slate-600 font-bold py-2 rounded-xl text-xs hover:bg-slate-200 w-full">Decline</button>
                                                </>
                                            ) : (
                                                <div className="text-center py-2 px-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs capitalize border border-slate-200">
                                                    {b.status}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Outgoing Requests */}
                    <div>
                        <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-500">outbox</span> My Sent Requests
                        </h3>
                        {outgoingBookings.length === 0 ? (
                            <p className="text-slate-400 text-sm italic p-6 bg-white rounded-2xl border border-slate-100">No sent requests.</p>
                        ) : (
                            <div className="space-y-4">
                                {outgoingBookings.map(b => (
                                    <div key={b.id} className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row gap-6 shadow-sm">
                                        <div className="flex gap-4 items-center shrink-0">
                                            <img src={b.host_avatar || `https://ui-avatars.com/api/?name=${b.host_first_name}+${b.host_last_name}`} className="w-12 h-12 rounded-full border-2 border-slate-100" alt="Host" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-400">Host</p>
                                                <p className="font-bold text-slate-800">{b.host_first_name} {b.host_last_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <div className="text-xs font-bold text-slate-700 mb-1">For Pet: <span className="text-purple-600">{b.pet_name}</span></div>
                                            <div className="text-[11px] text-slate-500 flex justify-between">
                                                <span>{new Date(b.start_date).toLocaleDateString()} - {new Date(b.end_date).toLocaleDateString()}</span>
                                                <span className="font-black text-slate-800">{parseFloat(b.total_price).toFixed(2)} EGP</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex flex-col justify-center gap-2 min-w-[120px] items-center">
                                            <div className={`px-3 py-1.5 rounded-full text-xs font-bold border capitalize ${
                                                b.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                                b.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}>
                                                {b.status}
                                            </div>
                                            {b.status === 'approved' && (
                                                <button onClick={() => setShowReviewModal(b)} className="text-xs font-bold text-purple-600 hover:underline">Leave Review</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Book Modal */}
            {showBookModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-10 sm:p-14 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBookModal(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-lg text-slate-800">Book {showBookModal.first_name}</h3>
                            <button onClick={() => setShowBookModal(null)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleBookSubmit} className="p-6 space-y-5">
                            {myPets.length === 0 ? (
                                <div className="text-center py-6">
                                    <span className="material-symbols-outlined text-[48px] text-rose-300 mb-2 animate-bounce">pets</span>
                                    <p className="text-sm text-rose-500 font-bold">You need to add a pet to your profile first!</p>
                                </div>
                            ) : (
                                <>
                                    {/* Select Pet */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">Select Pet to Host</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">pets</span>
                                            <select 
                                                required 
                                                value={bookForm.pet_id} 
                                                onChange={e => setBookForm({...bookForm, pet_id: e.target.value})} 
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                                            >
                                                {myPets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Drop-off Details */}
                                    <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                        <h4 className="text-[11px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">login</span>
                                            Drop-off Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">calendar_month</span>
                                                    <input 
                                                        required 
                                                        type="date" 
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={bookForm.startDate} 
                                                        onChange={e => setBookForm({...bookForm, startDate: e.target.value})} 
                                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500 transition-all duration-200" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">schedule</span>
                                                    <select 
                                                        required 
                                                        value={bookForm.startTime} 
                                                        onChange={e => setBookForm({...bookForm, startTime: e.target.value})} 
                                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                                                    >
                                                        {[
                                                            { value: '06:00', label: '06:00 AM' },
                                                            { value: '07:00', label: '07:00 AM' },
                                                            { value: '08:00', label: '08:00 AM' },
                                                            { value: '09:00', label: '09:00 AM' },
                                                            { value: '10:00', label: '10:00 AM' },
                                                            { value: '11:00', label: '11:00 AM' },
                                                            { value: '12:00', label: '12:00 PM (Noon)' },
                                                            { value: '13:00', label: '01:00 PM' },
                                                            { value: '14:00', label: '02:00 PM' },
                                                            { value: '15:00', label: '03:00 PM' },
                                                            { value: '16:00', label: '04:00 PM' },
                                                            { value: '17:00', label: '05:00 PM' },
                                                            { value: '18:00', label: '06:00 PM' },
                                                            { value: '19:00', label: '07:00 PM' },
                                                            { value: '20:00', label: '08:00 PM' },
                                                            { value: '21:00', label: '09:00 PM' },
                                                            { value: '22:00', label: '10:00 PM' }
                                                        ].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pick-up Details */}
                                    <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                        <h4 className="text-[11px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">logout</span>
                                            Pick-up Details
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">calendar_month</span>
                                                    <input 
                                                        required 
                                                        type="date" 
                                                        min={bookForm.startDate || new Date().toISOString().split('T')[0]}
                                                        value={bookForm.endDate} 
                                                        onChange={e => setBookForm({...bookForm, endDate: e.target.value})} 
                                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500 transition-all duration-200" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">schedule</span>
                                                    <select 
                                                        required 
                                                        value={bookForm.endTime} 
                                                        onChange={e => setBookForm({...bookForm, endTime: e.target.value})} 
                                                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                                                    >
                                                        {[
                                                            { value: '06:00', label: '06:00 AM' },
                                                            { value: '07:00', label: '07:00 AM' },
                                                            { value: '08:00', label: '08:00 AM' },
                                                            { value: '09:00', label: '09:00 AM' },
                                                            { value: '10:00', label: '10:00 AM' },
                                                            { value: '11:00', label: '11:00 AM' },
                                                            { value: '12:00', label: '12:00 PM (Noon)' },
                                                            { value: '13:00', label: '01:00 PM' },
                                                            { value: '14:00', label: '02:00 PM' },
                                                            { value: '15:00', label: '03:00 PM' },
                                                            { value: '16:00', label: '04:00 PM' },
                                                            { value: '17:00', label: '05:00 PM' },
                                                            { value: '18:00', label: '06:00 PM' },
                                                            { value: '19:00', label: '07:00 PM' },
                                                            { value: '20:00', label: '08:00 PM' },
                                                            { value: '21:00', label: '09:00 PM' },
                                                            { value: '22:00', label: '10:00 PM' }
                                                        ].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dynamic Pricing breakdown Card */}
                                    {(() => {
                                        const price = calculateLivePrice();
                                        const start = new Date(`${bookForm.startDate}T${bookForm.startTime}`);
                                        const end = new Date(`${bookForm.endDate}T${bookForm.endTime}`);
                                        const isValid = !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;

                                        if (!isValid) {
                                            return (
                                                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl flex items-center gap-2 text-rose-600 text-xs font-semibold">
                                                    <span className="material-symbols-outlined text-[18px]">warning</span>
                                                    <span>Please select a pick-up time after drop-off.</span>
                                                </div>
                                            );
                                        }

                                        const hours = Math.abs(end - start) / 36e5;
                                        const isDaily = hours >= 24;

                                        return (
                                            <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl space-y-2">
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                                    <span>Duration</span>
                                                    <span className="text-purple-600 font-extrabold">
                                                        {isDaily 
                                                            ? `${Math.ceil(hours / 24)} Day(s) (${Math.round(hours)} hrs)` 
                                                            : `${Math.ceil(hours)} Hour(s)`}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                                    <span>Rate Style</span>
                                                    <span>
                                                        {isDaily 
                                                            ? `${showBookModal.daily_rate} EGP / Day` 
                                                            : `${showBookModal.hourly_rate || showBookModal.daily_rate} EGP / Hr`}
                                                    </span>
                                                </div>
                                                <div className="border-t border-purple-100/50 pt-2 flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-700">Total Price</span>
                                                    <span className="text-base font-black text-purple-600">{price.toLocaleString()} EGP</span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <button 
                                        type="submit" 
                                        disabled={submitting || calculateLivePrice() === 0} 
                                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-3.5 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all disabled:shadow-none duration-200 mt-4 active:scale-95 text-xs tracking-wider uppercase"
                                    >
                                        {submitting ? 'Sending Request...' : 'Send Booking Request'}
                                    </button>
                                </>
                            )}
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Review Modal */}
            {showReviewModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] flex items-center justify-center p-10 sm:p-14 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReviewModal(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-lg text-slate-800">Leave a Review</h3>
                            <button onClick={() => setShowReviewModal(null)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 text-center">Rating (1-5)</label>
                                <div className="flex justify-center gap-2">
                                    {[1,2,3,4,5].map(num => (
                                        <span key={num} onClick={() => setReviewForm({...reviewForm, rating: num})} className={`material-symbols-outlined text-3xl cursor-pointer transition-colors ${num <= reviewForm.rating ? 'text-amber-400' : 'text-slate-200'}`} style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Comment</label>
                                <textarea required rows="3" value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm resize-none"></textarea>
                            </div>
                            <button type="submit" disabled={submitting} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl shadow-lg transition-all disabled:opacity-50">
                                Submit Review
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PetHostingTab;
