import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const LostFoundTab = ({ searchQuery }) => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [contactModal, setContactModal] = useState(null);
    const [viewReportModal, setViewReportModal] = useState(null);
    const fileInputRef = useRef(null);

    // Form state
    const [form, setForm] = useState({
        pet_name: '',
        species: 'Dog',
        breed: '',
        last_seen_location: '',
        description: '',
        contact_phone: '',
        contact_pref: 'both',
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [activePhoto, setActivePhoto] = useState(0);
    const MAX_PHOTOS = 6;

    // Anti-spam phone reveal — number is never in the list payload; revealed one at a time.
    const [revealedPhone, setRevealedPhone] = useState(null);
    const [revealing, setRevealing] = useState(false);

    // Community sightings ("what neighbours say")
    const [sightings, setSightings] = useState([]);
    const [sightingModal, setSightingModal] = useState(null); // the report being sighted
    const [sightingForm, setSightingForm] = useState({ note: '', location: '' });
    const [submittingSighting, setSubmittingSighting] = useState(false);

    // Reset the gallery's active photo whenever a report is opened.
    useEffect(() => { setActivePhoto(0); }, [viewReportModal]);
    // Forget any revealed number when the contact sheet opens/closes/switches report.
    useEffect(() => { setRevealedPhone(null); }, [contactModal]);
    // Load "what neighbours say" whenever a report detail opens.
    useEffect(() => {
        if (!viewReportModal?.id) { setSightings([]); return; }
        let live = true;
        axios.get(`${API_BASE}/lost-found/lost/${viewReportModal.id}/sightings`)
            .then(res => { if (live) setSightings(res.data.sightings || []); })
            .catch(() => { if (live) setSightings([]); });
        return () => { live = false; };
    }, [viewReportModal]);

    // "Found a pet?" — match a sighting against open lost reports
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [matchQuery, setMatchQuery] = useState({ species: 'Dog', breed: '', area: '', description: '' });
    const [matchResults, setMatchResults] = useState(null);
    const [matchLoading, setMatchLoading] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const runFindMatch = async () => {
        setMatchLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/lost-found/match`, matchQuery);
            setMatchResults(res.data.matches || []);
        } catch (err) {
            toast.error('Could not search for matches. Please try again.');
            setMatchResults([]);
        } finally {
            setMatchLoading(false);
        }
    };

    // Portal body scroll lock
    useEffect(() => {
        if (showModal || contactModal || viewReportModal || showMatchModal || sightingModal) {
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
    }, [showModal, contactModal, viewReportModal, showMatchModal]);

    const fetchReports = async () => {
        try {
            const res = await axios.get(`${API_BASE}/lost-found/lost`);
            setReports(res.data.reports || []);
        } catch (err) {
            console.error('Failed to fetch lost pets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        if (!user) {
            toast.error('Please log in to report a lost pet');
            navigate('/login');
            return;
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setForm({ pet_name: '', species: 'Dog', breed: '', last_seen_location: '', description: '', contact_phone: '', contact_pref: 'both' });
        setSelectedFiles([]);
        setPreviewUrls([]);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        const valid = files.filter(f => {
            if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} is over 5MB`); return false; }
            return true;
        });
        setSelectedFiles(prev => [...prev, ...valid].slice(0, MAX_PHOTOS));
        setPreviewUrls(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))].slice(0, MAX_PHOTOS));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.pet_name.trim() || !form.last_seen_location.trim()) {
            toast.error('Pet name and last seen location are required');
            return;
        }

        setSubmitting(true);
        try {
            const uploadedPhotos = [];
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'PetPulse');
                formData.append('folder', 'petpulse/lostfound');
                try {
                    const cloudRes = await axios.post(`${API_BASE}/upload/cloudinary`, formData, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (cloudRes.data.secure_url) uploadedPhotos.push(cloudRes.data.secure_url);
                } catch (cloudErr) {
                    toast.error('Failed to upload one of the images');
                    setSubmitting(false);
                    return;
                }
            }

            const payload = { ...form };
            if (uploadedPhotos.length) {
                payload.photos = uploadedPhotos;
                payload.image_url = uploadedPhotos[0]; // cover
            }

            await axios.post(`${API_BASE}/lost-found/lost`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Lost pet report submitted!');
            handleCloseModal();
            fetchReports();
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(err.response?.data?.error || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    // Start (or resume) an in-app conversation with the reporter — spam-gated by
    // the connection-request flow, so no number is exposed.
    const handleMessageReporter = async (report) => {
        if (!user) { toast.error('Please log in to message the owner'); navigate('/login'); return; }
        const reporterId = report?.reporter_id;
        if (!reporterId) { toast.error('This report has no in-app account to message.'); return; }
        if (reporterId === user.id) { toast('This is your own report.'); return; }
        try {
            await axios.post(`${API_BASE}/chat/request`, { receiver_id: reporterId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            // "already sent / already connected" is fine — just open the thread.
        }
        setContactModal(null);
        navigate(`/messages?user=${reporterId}`);
    };

    // Reveal the reporter's phone, one number at a time (server rate-limits + logs it).
    const handleRevealPhone = async (report) => {
        if (!user) { toast.error('Please log in to see the phone number'); navigate('/login'); return; }
        setRevealing(true);
        try {
            const res = await axios.post(`${API_BASE}/lost-found/lost/${report.id}/reveal-phone`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRevealedPhone(res.data.phone);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not reveal the phone number.');
        } finally {
            setRevealing(false);
        }
    };

    // Open the "I spotted this pet" form (closing the detail modal to avoid z-index stacking).
    const openSighting = (report) => {
        if (!user) { toast.error('Please log in to report a sighting'); navigate('/login'); return; }
        if (report?.reporter_id === user.id) { toast('This is your own report.'); return; }
        setViewReportModal(null);
        setContactModal(null);
        setSightingForm({ note: '', location: report?.last_seen_location || '' });
        setSightingModal(report);
    };

    const submitSighting = async () => {
        if (!sightingModal) return;
        setSubmittingSighting(true);
        try {
            const res = await axios.post(
                `${API_BASE}/lost-found/lost/${sightingModal.id}/sighting`,
                { note: sightingForm.note.trim() || undefined, location: sightingForm.location.trim() || undefined },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const newCount = res.data.count;
            // Reflect the new count in the list immediately.
            setReports(prev => prev.map(r => r.id === sightingModal.id ? { ...r, sighting_count: newCount } : r));
            toast.success('Thank you! The owner has been notified. 🐾');
            setSightingModal(null);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not send your sighting.');
        } finally {
            setSubmittingSighting(false);
        }
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const filtered = reports.filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (r.pet_name || '').toLowerCase().includes(q) ||
               (r.breed || '').toLowerCase().includes(q) ||
               (r.species || '').toLowerCase().includes(q) ||
               (r.last_seen_location || '').toLowerCase().includes(q);
    });

    const getStatusColor = (status) => {
        if (status === 'found' || status === 'resolved') return 'bg-emerald-500';
        return 'bg-red-500';
    };

    const getStatusLabel = (status) => {
        if (status === 'found' || status === 'resolved') return 'REUNITED';
        return 'LOST';
    };

    // Skeleton cards
    const SkeletonCard = () => (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="h-52 bg-slate-200" />
            <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-amber-600 text-[28px]">pets</span>
                    </div>
                    <div>
                        <h3 className="text-amber-900 font-bold text-lg">Lost & Found Pets</h3>
                        <p className="text-amber-700 text-sm hidden sm:block">Help reunite pets with their families in your area.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => { setMatchResults(null); setShowMatchModal(true); }}
                        className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-bold py-2.5 px-5 rounded-xl transition-all text-sm whitespace-nowrap active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        Found a pet? Find matches
                    </button>
                    <button
                        onClick={handleOpenModal}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-amber-500/20 text-sm whitespace-nowrap active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">campaign</span>
                        Report Lost Pet
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {!loading && (
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-red-600 font-semibold bg-red-50 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        {reports.filter(r => r.status === 'lost').length} Missing
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        {reports.filter(r => r.status === 'found' || r.status === 'resolved').length} Reunited
                    </span>
                </div>
            )}

            {/* Cards grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-amber-400 text-[40px]">search_off</span>
                    </div>
                    <h4 className="font-bold text-slate-700 text-lg mb-1">No lost pet reports yet</h4>
                    <p className="text-slate-500 text-sm mb-6">Be the first to report a missing pet in your area.</p>
                    <button onClick={handleOpenModal} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all active:scale-95">
                        Report Lost Pet
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map(report => (
                        <div 
                            key={report.id} 
                            onClick={() => setViewReportModal(report)}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer"
                        >
                            {/* Image */}
                            <div className="h-52 bg-slate-100 relative overflow-hidden">
                                {report.image_url ? (
                                    <img src={report.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={report.pet_name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                        <span className="material-symbols-outlined text-slate-300 text-[64px]">pets</span>
                                    </div>
                                )}
                                <span className={`absolute top-3 right-3 ${getStatusColor(report.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider`}>
                                    {getStatusLabel(report.status)}
                                </span>
                                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                                    {timeAgo(report.created_at)}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{report.pet_name || 'Unknown Pet'}</h4>
                                        <p className="text-sm text-slate-500 font-medium">{report.breed ? `${report.breed} · ` : ''}{report.species || 'Pet'}</p>
                                    </div>
                                    {report.user_avatar && (
                                        <img src={report.user_avatar} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                                    )}
                                </div>

                                <p className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px] text-amber-500">location_on</span>
                                    {report.last_seen_location || 'Unknown location'}
                                </p>

                                {report.description && (
                                    <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">{report.description}</p>
                                )}

                                {report.sighting_count > 0 && (
                                    <span className="inline-flex items-center gap-1 mt-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                                        {report.sighting_count} {report.sighting_count === 1 ? 'sighting' : 'sightings'} reported
                                    </span>
                                )}

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setContactModal(report);
                                        }}
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                        I saw this pet
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(window.location.href);
                                            toast.success('Link copied!');
                                        }}
                                        className="w-10 h-10 border-2 border-slate-200 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
                                        title="Share"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">share</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== REPORT MODAL ===== */}
            {showModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-10 sm:p-14" onClick={handleCloseModal}>
                    <div
                        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-600">campaign</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Report Lost Pet</h3>
                                    <p className="text-xs text-slate-500">Fill in as much detail as you can</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Photos upload (multiple) */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Pet Photos <span className="text-slate-400 font-normal">(up to {MAX_PHOTOS} — more angles help matching)</span></label>
                                <div className="grid grid-cols-3 gap-2">
                                    {previewUrls.map((url, i) => (
                                        <div key={i} className="relative aspect-square">
                                            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-slate-200" />
                                            {i === 0 && <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedFiles(prev => prev.filter((_, x) => x !== i)); setPreviewUrls(prev => prev.filter((_, x) => x !== i)); }}
                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                    {previewUrls.length < MAX_PHOTOS && (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all group"
                                        >
                                            <span className="material-symbols-outlined text-slate-300 text-[28px] group-hover:text-amber-400 transition-colors">add_a_photo</span>
                                            <p className="text-[10px] text-slate-400 mt-1">Add photo</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5">JPG, PNG up to 5MB each. The first photo is the cover.</p>
                                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                            </div>

                            {/* Pet Name */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Pet Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={form.pet_name}
                                    onChange={(e) => setForm({ ...form, pet_name: e.target.value })}
                                    placeholder="e.g. Charlie"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    required
                                />
                            </div>

                            {/* Species + Breed row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Species <span className="text-red-400">*</span></label>
                                    <select
                                        value={form.species}
                                        onChange={(e) => setForm({ ...form, species: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white"
                                    >
                                        <option value="Dog">Dog</option>
                                        <option value="Cat">Cat</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Breed</label>
                                    <input
                                        type="text"
                                        value={form.breed}
                                        onChange={(e) => setForm({ ...form, breed: e.target.value })}
                                        placeholder="e.g. Beagle"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Last seen location */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Last Seen Location <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">location_on</span>
                                    <input
                                        type="text"
                                        value={form.last_seen_location}
                                        onChange={(e) => setForm({ ...form, last_seen_location: e.target.value })}
                                        placeholder="e.g. Near Al Rehab City Park"
                                        className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Any distinguishing features, collar color, behavior, etc."
                                    rows={3}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none"
                                />
                            </div>

                            {/* Contact phone */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Contact Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">phone</span>
                                    <input
                                        type="tel"
                                        value={form.contact_phone}
                                        onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                                        placeholder="e.g. +20 123 456 7890"
                                        className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">lock</span>
                                    Your number stays hidden. People must be logged in and can only reveal it one at a time — no spam.
                                </p>
                            </div>

                            {/* Contact preference */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">How should people reach you?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'both', label: 'Message & Call', icon: 'forum' },
                                        { key: 'message', label: 'Message only', icon: 'chat' },
                                        { key: 'call', label: 'Call only', icon: 'call' },
                                    ].map(opt => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setForm({ ...form, contact_pref: opt.key })}
                                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${form.contact_pref === opt.key ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Submit Report
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== CONTACT MODAL ===== */}
            {contactModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-10 sm:p-14" onClick={() => setContactModal(null)}>
                    <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white text-center">
                            <span className="material-symbols-outlined text-[36px] mb-2 block">pets</span>
                            <h3 className="font-bold text-lg">Contact Pet Owner</h3>
                            <p className="text-sm text-white/80 mt-1">Reach out to help reunite {contactModal.pet_name} with their family</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {(contactModal.user_name || contactModal.reporter_name) && (
                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-amber-600">person</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Reported by</p>
                                        <p className="font-bold text-slate-800">{contactModal.user_name || contactModal.reporter_name}</p>
                                    </div>
                                </div>
                            )}

                            {/* In-app message — spam-gated by the connection-request flow */}
                            {contactModal.reporter_id && contactModal.reporter_id !== user?.id && (
                                <button
                                    onClick={() => handleMessageReporter(contactModal)}
                                    className="w-full flex items-center gap-3 bg-blue-50 hover:bg-blue-100 rounded-xl p-4 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0">
                                        <span className="material-symbols-outlined">forum</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-blue-800">Message in the app</p>
                                        <p className="text-xs text-blue-600">Private &amp; safe — no phone number needed</p>
                                    </div>
                                </button>
                            )}

                            {/* Phone — hidden until the viewer explicitly reveals it (rate-limited) */}
                            {contactModal.has_phone ? (
                                revealedPhone ? (
                                    <div className="space-y-3">
                                        <a
                                            href={`tel:${revealedPhone}`}
                                            className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl p-4 transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
                                                <span className="material-symbols-outlined">call</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-emerald-600 font-medium">Call directly</p>
                                                <p className="font-bold text-emerald-800">{revealedPhone}</p>
                                            </div>
                                        </a>
                                        <a
                                            href={`https://wa.me/${revealedPhone.replace(/[^0-9]/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white shrink-0">
                                                <span className="material-symbols-outlined">chat</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium">WhatsApp</p>
                                                <p className="font-bold text-slate-700">Send a message</p>
                                            </div>
                                        </a>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleRevealPhone(contactModal)}
                                        disabled={revealing}
                                        className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-colors text-left disabled:opacity-60"
                                    >
                                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white shrink-0">
                                            <span className="material-symbols-outlined">{revealing ? 'sync' : 'visibility'}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{revealing ? 'Revealing…' : 'Reveal phone number'}</p>
                                            <p className="text-xs text-slate-500">Shown only to you · limited to prevent spam</p>
                                        </div>
                                    </button>
                                )
                            ) : (
                                !contactModal.reporter_id && (
                                    <div className="text-center text-slate-500 py-4">
                                        <span className="material-symbols-outlined text-[32px] text-slate-300 mb-2 block">phone_disabled</span>
                                        <p className="text-sm">This report has no contact details.</p>
                                    </div>
                                )
                            )}
                            <button
                                onClick={() => setContactModal(null)}
                                className="w-full border-2 border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors mt-2"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== VIEW REPORT MODAL / LIGHTBOX ===== */}
            {viewReportModal && createPortal(
                <div 
                    className="fixed -top-10 -left-10 -right-10 -bottom-10 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6 md:p-12"
                    onClick={() => setViewReportModal(null)}
                >
                    <div 
                        className="bg-white border border-slate-200/50 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh] animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Image / Lightbox Section — blurred-cover backdrop frames any
                            aspect/quality of photo premium (never raw-on-black).
                            Mobile: fixed height (no flex-1 ballooning) so the dark
                            frame stays compact and the details get room to breathe. */}
                        <div className="bg-slate-900 flex items-center justify-center relative h-[40vh] shrink-0 md:h-auto md:shrink md:flex-1 overflow-hidden p-3 sm:p-6">
                            {(viewReportModal.photos?.length || viewReportModal.image_url) ? (
                                <>
                                    <img
                                        src={viewReportModal.photos?.[activePhoto] || viewReportModal.image_url}
                                        aria-hidden="true"
                                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40 pointer-events-none select-none"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md pointer-events-none"></div>
                                    <img
                                        src={viewReportModal.photos?.[activePhoto] || viewReportModal.image_url}
                                        className="relative z-10 max-h-[34vh] md:max-h-[80vh] w-auto max-w-[92%] object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10"
                                        alt={viewReportModal.pet_name}
                                    />
                                    {viewReportModal.photos?.length > 1 && (
                                        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2 px-4 flex-wrap">
                                            {viewReportModal.photos.map((p, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setActivePhoto(i)}
                                                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${activePhoto === i ? 'border-white scale-105' : 'border-white/30 opacity-70 hover:opacity-100'}`}
                                                >
                                                    <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-12 text-slate-600">
                                    <span className="material-symbols-outlined text-[80px]">pets</span>
                                </div>
                            )}
                            <span className={`absolute top-4 left-4 z-20 ${getStatusColor(viewReportModal.status)} text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider`}>
                                {getStatusLabel(viewReportModal.status)}
                            </span>
                            {/* Mobile-only close — reachable at the top where the image is */}
                            <button
                                onClick={() => setViewReportModal(null)}
                                aria-label="Close"
                                className="md:hidden absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur text-white flex items-center justify-center shadow-lg active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Details Sidebar Section */}
                        <div className="w-full md:w-[360px] flex-1 min-h-0 md:flex-none p-5 sm:p-8 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-slate-100 bg-white">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{timeAgo(viewReportModal.created_at)}</span>
                                    <button
                                        onClick={() => setViewReportModal(null)}
                                        className="hidden md:flex w-8 h-8 rounded-full hover:bg-slate-100 items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>

                                <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{viewReportModal.pet_name || 'Unknown Pet'}</h2>
                                <p className="text-sm text-amber-600 font-bold mb-6">
                                    {viewReportModal.breed ? `${viewReportModal.breed} · ` : ''}{viewReportModal.species || 'Pet'}
                                </p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-2 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="material-symbols-outlined text-[18px] text-amber-500 font-bold shrink-0 mt-0.5">location_on</span>
                                        <div>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Last Seen Location</p>
                                            <p className="text-sm font-semibold text-slate-800 leading-relaxed">{viewReportModal.last_seen_location || 'Unknown location'}</p>
                                        </div>
                                    </div>

                                    {viewReportModal.description && (
                                        <div>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Distinguishing Features</p>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 max-h-[150px] overflow-y-auto">
                                                {viewReportModal.description}
                                            </p>
                                        </div>
                                    )}

                                    {viewReportModal.user_name && (
                                        <div className="flex items-center gap-2.5 bg-slate-50/60 p-3 rounded-xl border border-slate-100/50">
                                            {viewReportModal.user_avatar ? (
                                                <img src={viewReportModal.user_avatar} className="w-6 h-6 rounded-full object-cover border border-white" alt="" />
                                            ) : (
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                                            )}
                                            <span className="text-xs text-slate-500 font-semibold">Reported by <strong className="text-slate-800">{viewReportModal.user_name}</strong></span>
                                        </div>
                                    )}

                                    {/* What neighbours say — community sightings */}
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px] text-emerald-500">groups</span>
                                            What neighbours say
                                        </p>
                                        {sightings.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                                No sightings yet. If you've seen {viewReportModal.pet_name || 'this pet'}, be the first to leave a tip.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 max-h-[180px] overflow-y-auto">
                                                {sightings.map(s => (
                                                    <div key={s.id} className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                                {s.spotter_name || 'A neighbour'}
                                                            </span>
                                                            <span className="text-[10px] text-emerald-600 font-semibold">{timeAgo(s.created_at)}</span>
                                                        </div>
                                                        {s.location && <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">location_on</span>{s.location}</p>}
                                                        {s.note && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.note}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Box inside Details */}
                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                                {(viewReportModal.reporter_id && viewReportModal.reporter_id !== user?.id) && (
                                    <button
                                        onClick={() => handleMessageReporter(viewReportModal)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-xs"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">forum</span>
                                        Message in the app
                                    </button>
                                )}
                                {viewReportModal.has_phone && (
                                    <button
                                        onClick={() => { const r = viewReportModal; setViewReportModal(null); setContactModal(r); }}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">call</span>
                                        Reveal phone &amp; call
                                    </button>
                                )}
                                {!viewReportModal.reporter_id && !viewReportModal.has_phone && (
                                    <div className="text-center text-slate-400 py-3 text-xs bg-slate-50 rounded-xl">
                                        <span className="material-symbols-outlined text-[20px] mb-1 block">phone_disabled</span>
                                        No contact details provided
                                    </div>
                                )}
                                {viewReportModal.reporter_id !== user?.id && (
                                    <button
                                        onClick={() => openSighting(viewReportModal)}
                                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs border border-emerald-200"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                        I spotted this pet
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== FOUND-A-PET MATCH MODAL ===== */}
            {showMatchModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-10 sm:p-14" onClick={() => setShowMatchModal(false)}>
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-amber-600">search</span></div>
                                <div><h3 className="font-bold text-slate-800 text-lg">Found a pet?</h3><p className="text-xs text-slate-500">We'll match it against reported lost pets</p></div>
                            </div>
                            <button onClick={() => setShowMatchModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Species</label>
                                    <select value={matchQuery.species} onChange={e => setMatchQuery(q => ({ ...q, species: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"><option value="Dog">Dog</option><option value="Cat">Cat</option></select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Breed <span className="text-slate-400 font-normal">(if known)</span></label>
                                    <input value={matchQuery.breed} onChange={e => setMatchQuery(q => ({ ...q, breed: e.target.value }))} placeholder="e.g. Baladi, Persian" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Where did you find it?</label>
                                <input value={matchQuery.area} onChange={e => setMatchQuery(q => ({ ...q, area: e.target.value }))} placeholder="e.g. Near Maadi, Cairo" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Description <span className="text-slate-400 font-normal">(colour, collar, size…)</span></label>
                                <input value={matchQuery.description} onChange={e => setMatchQuery(q => ({ ...q, description: e.target.value }))} placeholder="e.g. brown, red collar, medium size" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                            </div>
                            <button onClick={runFindMatch} disabled={matchLoading} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
                                <span className="material-symbols-outlined text-[18px]">{matchLoading ? 'sync' : 'search'}</span>{matchLoading ? 'Searching…' : 'Find possible matches'}
                            </button>
                            {matchResults && (
                                matchResults.length === 0 ? (
                                    <p className="text-center text-sm text-slate-400 py-4">No likely matches among current lost reports. Thank you for checking! 🐾</p>
                                ) : (
                                    <div className="space-y-3 pt-1">
                                        <p className="text-xs text-slate-500">Possible matches — reach out to the owner if one looks right:</p>
                                        {matchResults.map(m => (
                                            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                                <img src={m.image_url || `https://ui-avatars.com/api/?name=${m.pet_name}&background=fef3c7&color=b45309`} className="w-14 h-14 rounded-xl object-cover" alt={m.pet_name} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-800 text-sm truncate">{m.pet_name}</h4>
                                                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">{m.match_score}% match</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate">{m.breed || 'Mixed'} · {m.last_seen_location || 'Unknown area'}</p>
                                                    {m.match_reasons?.length > 0 && <p className="text-[10px] text-slate-400 truncate">{m.match_reasons.join(' · ')}</p>}
                                                </div>
                                                {(m.reporter_id || m.has_phone) ? (
                                                    <button onClick={() => { setShowMatchModal(false); setContactModal(m); }} className="shrink-0 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-amber-600 active:scale-95">Contact</button>
                                                ) : (
                                                    <span className="shrink-0 text-[10px] text-slate-400">No contact</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ===== SIGHTING MODAL ("I spotted this pet") ===== */}
            {sightingModal && createPortal(
                <div className="fixed -top-10 -left-10 -right-10 -bottom-10 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-10 sm:p-14" onClick={() => setSightingModal(null)}>
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">visibility</span>
                                    <h3 className="font-bold text-lg">Report a sighting</h3>
                                </div>
                                <button onClick={() => setSightingModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                            <p className="text-sm text-white/85 mt-1">Help reunite {sightingModal.pet_name || 'this pet'} — the owner is notified instantly.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Where did you see them?</label>
                                <input
                                    value={sightingForm.location}
                                    onChange={e => setSightingForm(f => ({ ...f, location: e.target.value }))}
                                    placeholder="e.g. Near the Badr City sports club"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">Details <span className="text-slate-400 font-normal">(direction, condition, time…)</span></label>
                                <textarea
                                    value={sightingForm.note}
                                    onChange={e => setSightingForm(f => ({ ...f, note: e.target.value }))}
                                    rows={3}
                                    placeholder="e.g. Saw a tabby cat heading toward the main road around 6pm, looked healthy."
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                />
                            </div>
                            <button
                                onClick={submitSighting}
                                disabled={submittingSighting || (!sightingForm.note.trim() && !sightingForm.location.trim())}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <span className="material-symbols-outlined text-[18px]">{submittingSighting ? 'sync' : 'send'}</span>
                                {submittingSighting ? 'Sending…' : 'Send sighting to owner'}
                            </button>
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

export default LostFoundTab;
