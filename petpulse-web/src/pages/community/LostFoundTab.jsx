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
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    // Portal body scroll lock
    useEffect(() => {
        if (showModal || contactModal || viewReportModal) {
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
    }, [showModal, contactModal, viewReportModal]);

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
        setForm({ pet_name: '', species: 'Dog', breed: '', last_seen_location: '', description: '', contact_phone: '' });
        setSelectedFile(null);
        setPreviewUrl('');
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be under 5MB');
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.pet_name.trim() || !form.last_seen_location.trim()) {
            toast.error('Pet name and last seen location are required');
            return;
        }

        setSubmitting(true);
        try {
            let uploadedImageUrl = null;
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('upload_preset', 'PetPulse');
                formData.append('folder', 'petpulse/lostfound');
                try {
                    const cloudRes = await axios.post(`${API_BASE}/upload/cloudinary`, formData, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    uploadedImageUrl = cloudRes.data.secure_url;
                } catch (cloudErr) {
                    toast.error('Failed to upload image');
                    setSubmitting(false);
                    return;
                }
            }

            const payload = { ...form };
            if (uploadedImageUrl) payload.image_url = uploadedImageUrl;

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
                <button
                    onClick={handleOpenModal}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-amber-500/20 text-sm whitespace-nowrap active:scale-95 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                    Report Lost Pet
                </button>
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
                            {/* Image upload */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Pet Photo</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all group"
                                >
                                    {previewUrl ? (
                                        <div className="relative">
                                            <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(''); }}
                                                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-md"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-slate-300 text-[40px] group-hover:text-amber-400 transition-colors">add_a_photo</span>
                                            <p className="text-sm text-slate-500 mt-2">Click to upload a photo of your pet</p>
                                            <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 5MB</p>
                                        </>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Contact Phone</label>
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
                            {contactModal.user_name && (
                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-amber-600">person</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Reported by</p>
                                        <p className="font-bold text-slate-800">{contactModal.user_name}</p>
                                    </div>
                                </div>
                            )}
                            {contactModal.contact_phone ? (
                                <div className="space-y-3">
                                    <a
                                        href={`tel:${contactModal.contact_phone}`}
                                        className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 rounded-xl p-4 transition-colors"
                                    >
                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                            <span className="material-symbols-outlined">call</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-600 font-medium">Call directly</p>
                                            <p className="font-bold text-blue-800">{contactModal.contact_phone}</p>
                                        </div>
                                    </a>
                                    <a
                                        href={`https://wa.me/${contactModal.contact_phone.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl p-4 transition-colors"
                                    >
                                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                            <span className="material-symbols-outlined">chat</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-600 font-medium">WhatsApp</p>
                                            <p className="font-bold text-emerald-800">Send a message</p>
                                        </div>
                                    </a>
                                </div>
                            ) : (
                                <div className="text-center text-slate-500 py-4">
                                    <span className="material-symbols-outlined text-[32px] text-slate-300 mb-2 block">phone_disabled</span>
                                    <p className="text-sm">No contact phone was provided for this report.</p>
                                </div>
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
                        {/* Image / Lightbox Section */}
                        <div className="flex-1 bg-slate-950 flex items-center justify-center relative min-h-[250px] md:min-h-0">
                            {viewReportModal.image_url ? (
                                <img 
                                    src={viewReportModal.image_url} 
                                    className="w-full h-full object-contain max-h-[40vh] md:max-h-[85vh]" 
                                    alt={viewReportModal.pet_name} 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-955 p-12 text-slate-700">
                                    <span className="material-symbols-outlined text-[80px]">pets</span>
                                </div>
                            )}
                            <span className={`absolute top-4 left-4 ${getStatusColor(viewReportModal.status)} text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider`}>
                                {getStatusLabel(viewReportModal.status)}
                            </span>
                        </div>

                        {/* Details Sidebar Section */}
                        <div className="w-full md:w-[360px] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-slate-100 bg-white">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{timeAgo(viewReportModal.created_at)}</span>
                                    <button 
                                        onClick={() => setViewReportModal(null)} 
                                        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
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
                                </div>
                            </div>

                            {/* Contact Box inside Details */}
                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                                {viewReportModal.contact_phone ? (
                                    <>
                                        <a
                                            href={`tel:${viewReportModal.contact_phone}`}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-xs"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">call</span>
                                            Call Owner ({viewReportModal.contact_phone})
                                        </a>
                                        <a
                                            href={`https://wa.me/${viewReportModal.contact_phone.replace(/[^0-9]/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-xs"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">chat</span>
                                            Message on WhatsApp
                                        </a>
                                    </>
                                ) : (
                                    <div className="text-center text-slate-400 py-3 text-xs bg-slate-50 rounded-xl">
                                        <span className="material-symbols-outlined text-[20px] mb-1 block">phone_disabled</span>
                                        No phone number provided
                                    </div>
                                )}
                            </div>
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
