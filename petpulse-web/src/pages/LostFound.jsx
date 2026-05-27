import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import Footer from '../components/layout/Footer';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';



const StatusBadge = ({ status }) => {
    if (status === 'found' || status === 'resolved') return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Reunited</span>;
    return <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">Searching</span>;
};

const LostFound = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('lost');
    const [lostPets, setLostPets] = useState([]);
    const [foundPets, setFoundPets] = useState([]);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState('lost');
    const [formData, setFormData] = useState({ pet_name: '', species: 'Dog', breed: '', location: '', description: '', contact_phone: '' });
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lostRes, foundRes] = await Promise.all([
                    axios.get(`${API_BASE}/lost-found/lost`).catch(() => ({ data: { reports: [] } })),
                    axios.get(`${API_BASE}/lost-found/found`).catch(() => ({ data: { reports: [] } })),
                ]);
                setLostPets(lostRes.data.reports || []);
                setFoundPets(foundRes.data.reports || []);
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!user) { toast.error('Please login first'); navigate('/login'); return; }
        setSubmitting(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            let uploadedImageUrl = null;
            if (selectedFile) {
                const fd = new FormData();
                fd.append('file', selectedFile);
                fd.append('upload_preset', 'PetPulse');
                fd.append('folder', 'petpulse/lostfound');
                const cloudRes = await axios.post(`${API_BASE}/upload/cloudinary`, fd, { headers });
                uploadedImageUrl = cloudRes.data.secure_url;
            }
            if (reportType === 'lost') {
                await axios.post(`${API_BASE}/lost-found/lost`, {
                    pet_name: formData.pet_name,
                    species: formData.species,
                    breed: formData.breed,
                    last_seen_location: formData.location,
                    description: formData.description,
                    contact_phone: formData.contact_phone,
                    ...(uploadedImageUrl && { image_url: uploadedImageUrl })
                }, { headers });
            } else {
                await axios.post(`${API_BASE}/lost-found/found`, {
                    description: formData.description,
                    location: formData.location,
                    ...(uploadedImageUrl && { image_url: uploadedImageUrl }),
                    contact_phone: formData.contact_phone
                }, { headers });
            }
            toast.success('Report submitted successfully!');
            setShowReportModal(false);
            setFormData({ pet_name: '', species: 'Dog', breed: '', location: '', description: '', contact_phone: '' });
            setSelectedFile(null);
            setPreviewUrl('');
            // Refresh data
            const [lostRes, foundRes] = await Promise.all([
                axios.get(`${API_BASE}/lost-found/lost`).catch(() => ({ data: { reports: [] } })),
                axios.get(`${API_BASE}/lost-found/found`).catch(() => ({ data: { reports: [] } })),
            ]);
            setLostPets(lostRes.data.reports || []);
            setFoundPets(foundRes.data.reports || []);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    const lostFoundSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "PetPulse Lost & Found Pets Alert System",
        "description": "Report a lost pet or register a found sighting. Join community alerts and reunite pets with their owners in Egypt.",
        "url": "https://petpulse-web.vercel.app/lost-found"
    };

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO 
                title="Lost & Found Pets Tracker Egypt"
                description="Community alert board to report missing dogs and cats or report found pets in Cairo, Maadi, Tagamoa, and across Egypt. Help reunite lost pets with their families."
                keywords="lost dogs cairo, found cat egypt, missing pet finder cairo, community pet alert, petpulse"
                schema={lostFoundSchema}
            />
            {/* Hero */}
            <section className="relative pt-20 pb-28 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 z-0"></div>
                <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
                <svg className="absolute bottom-0 left-0 w-full text-[#f7faf9] z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor">
                    <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
                </svg>
                <div className="max-w-4xl mx-auto text-center relative z-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white font-medium text-sm mb-6">
                        <span className="material-symbols-outlined text-sm">location_searching</span> Community Alert Board
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                        Lost & <span className="text-yellow-200">Found</span> Pets
                    </h1>
                    <p className="text-orange-100 text-lg md:text-xl font-medium max-w-2xl mx-auto">
                        Help reunite lost pets with their families. Report a sighting or spread the word — every share counts.
                    </p>
                </div>
            </section>

            {/* Action Bar */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20 -mt-10 pb-20">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab('lost')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'lost' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <span className="material-symbols-outlined text-[18px]">search</span> Lost Pets
                        </button>
                        <button onClick={() => setActiveTab('found')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'found' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                            <span className="material-symbols-outlined text-[18px]">pets</span> Found Pets
                        </button>
                    </div>
                    <button onClick={() => { if (!user) { toast.error('Please login'); navigate('/login'); return; } setReportType(activeTab === 'found' ? 'found' : 'lost'); setShowReportModal(true); }} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center">
                        <span className="material-symbols-outlined text-[18px]">add_circle</span> Report {activeTab === 'lost' ? 'Lost' : 'Found'} Pet
                    </button>
                </div>

                {/* Lost Pets Tab */}
                {activeTab === 'lost' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lostPets.map(pet => (
                            <div key={pet.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="relative h-52 overflow-hidden">
                                    <img src={pet.image_url} alt={pet.pet_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-3 left-3"><StatusBadge status={pet.status} /></div>
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600">{timeAgo(pet.created_at)}</div>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{pet.pet_name}</h3>
                                            <p className="text-xs font-semibold text-amber-600">{pet.breed} • {pet.species}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-3">
                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                        <span>Last seen: {pet.last_seen_location}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{pet.description}</p>
                                    <div className="flex gap-2">
                                        <button className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-500 hover:text-white hover:border-amber-500 font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">call</span> Contact Owner
                                        </button>
                                        <button className="bg-slate-50 text-slate-600 border border-slate-200 hover:bg-blue-500 hover:text-white hover:border-blue-500 font-bold text-xs py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">share</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Found Pets Tab */}
                {activeTab === 'found' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {foundPets.map(pet => (
                            <div key={pet.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="relative h-52 overflow-hidden">
                                    <img src={pet.image_url} alt="Found pet" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-3 left-3"><span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Found</span></div>
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600">{timeAgo(pet.created_at)}</div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">{pet.breed || 'Unknown'} {pet.species}</h3>
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-3">
                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                        <span>Found at: {pet.found_location}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{pet.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                                        <span className="material-symbols-outlined text-[14px]">person</span> Reported by {pet.user_name}
                                    </div>
                                    <button className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">chat</span> Is this your pet? Contact Finder
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Safety Tips */}
                <div className="mt-12 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">tips_and_updates</span> What to Do If Your Pet is Missing
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: 'add_photo_alternate', text: 'Post a clear, recent photo with identifying features' },
                            { icon: 'share', text: 'Share the alert on social media and community groups' },
                            { icon: 'explore', text: 'Search the area — check hiding spots, neighbors, and shelters' },
                            { icon: 'verified', text: 'Contact local vets and pet shops with your pet\'s description' },
                        ].map((tip, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-amber-600 shadow-sm flex-shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-[18px]">{tip.icon}</span>
                                </div>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed">{tip.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
                        <div className={`p-6 text-white ${reportType === 'lost' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined">{reportType === 'lost' ? 'search' : 'pets'}</span>
                                    Report {reportType === 'lost' ? 'Lost' : 'Found'} Pet
                                </h2>
                                <button onClick={() => setShowReportModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSubmitReport} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Image upload */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Pet Photo</label>
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all">
                                    {previewUrl ? (
                                        <div className="relative">
                                            <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(''); }} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-slate-300 text-[32px]">add_a_photo</span>
                                            <p className="text-xs text-slate-500 mt-1">Click to upload (max 5MB)</p>
                                        </>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </div>
                            {reportType === 'lost' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Pet Name *</label>
                                    <input type="text" required value={formData.pet_name} onChange={(e) => setFormData({...formData, pet_name: e.target.value})} placeholder="e.g. Max" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Species *</label>
                                    <select required value={formData.species} onChange={(e) => setFormData({...formData, species: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all">
                                        <option value="Dog">Dog</option>
                                        <option value="Cat">Cat</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Breed</label>
                                    <input type="text" value={formData.breed} onChange={(e) => setFormData({...formData, breed: e.target.value})} placeholder="e.g. Golden Retriever" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{reportType === 'lost' ? 'Last Seen Location' : 'Found Location'} *</label>
                                <input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="e.g. Maadi, Cairo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Describe identifying features, collar, behavior..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Phone</label>
                                <input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({...formData, contact_phone: e.target.value})} placeholder="e.g. +20 100 123 4567" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${reportType === 'lost' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                                    {submitting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default LostFound;
