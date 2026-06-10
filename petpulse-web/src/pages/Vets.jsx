import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import PremiumBadge from '../components/common/PremiumBadge';
import DiscoverySidebar from '../components/layout/DiscoverySidebar';
import VetTriageModal from '../components/community/VetTriageModal';
import { useAuth } from '../context/AuthContext';
import LeafletMap from '../components/common/LeafletMap';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');



const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
        ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
};

const getVetCoords = (t) => {
    let lat = parseFloat(t.latitude);
    let lng = parseFloat(t.longitude);
    const idNum = typeof t.id === 'string' ? (parseInt(t.id.replace(/\D/g, ''), 10) || 1) : (parseInt(t.id, 10) || 1);
    if (isNaN(lat) || !isFinite(lat)) lat = 30.0444 + ((idNum * 0.003) % 0.05);
    if (isNaN(lng) || !isFinite(lng)) lng = 31.2357 + ((idNum * 0.005) % 0.05);
    return [lat, lng];
};

const Vets = () => {
    const navigate = useNavigate();
    const { userLocation } = useAuth();
    const [vets, setVets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);

    useEffect(() => {
        const fetchVets = async () => {
            try {
                const res = await axios.get(`${API_BASE}/providers`);
                setVets(res.data.vets || []);
            } catch (error) {
                console.error("Failed to load vets", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVets();
    }, []);

    const filteredVets = vets.filter(t => {
        const name = `${t.first_name} ${t.last_name}`.toLowerCase();
        const specs = (t.specialties || []).join(' ').toLowerCase();
        const matchesQuery = name.includes(searchQuery.toLowerCase()) || specs.includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === '' || (t.specialties && t.specialties.some(s => s.toLowerCase().includes(typeFilter.toLowerCase())));
        return matchesQuery && matchesType;
    });

    const parsedVets = filteredVets.map(t => {
        const [vetLat, vetLng] = getVetCoords(t);
        const distance = calculateDistance(userLocation?.lat, userLocation?.lng, vetLat, vetLng);
        return { ...t, distance, coords: [vetLat, vetLng] };
    }).sort((a, b) => {
        if (a.distance === null || a.distance === undefined) return 1;
        if (b.distance === null || b.distance === undefined) return -1;
        return a.distance - b.distance;
    });

    const topVets = parsedVets.slice(0, 3);
    const otherVets = parsedVets.slice(3);

    const VetCard = ({ t, isTop }) => {
        const defaultPic = 'https://images.unsplash.com/photo-1628177142898-93e46e64c104?auto=format&fit=crop&q=80&w=300';
        const spec = t.specialties && t.specialties.length > 0 ? t.specialties[0] : 'General Practice';
        const rating = isTop ? '4.9' : '4.8';

        if (isTop) {
            return (
                <div className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col">
                    <div className="relative h-64 shrink-0">
                        <img 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            src={t.profile_pic_url || defaultPic} 
                            alt={t.first_name} 
                            onError={(e) => { e.target.onerror = null; e.target.src = defaultPic; }}
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <span className="material-symbols-outlined text-yellow-500 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            <span className="font-bold text-xs text-slate-900">{rating}</span>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                        <h3 className="text-xl font-bold mb-1 flex items-center gap-1.5 flex-wrap">
                            <span>{t.first_name.toLowerCase().startsWith('dr.') ? t.first_name : 'Dr. ' + t.first_name} {t.last_name}</span>
                            {t.active_subscription_plan_id && (
                                <PremiumBadge active_subscription_plan_id={t.active_subscription_plan_id} active_subscription_plan_name={t.active_subscription_plan_name} />
                            )}
                        </h3>
                        <div className="flex items-center gap-2 mb-3 text-xs font-bold">
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{spec}</span>
                            {t.distance !== undefined && t.distance !== null && (
                                <span className="flex items-center gap-0.5 text-slate-500 bg-slate-100/70 px-2 py-0.5 rounded">
                                    <span className="material-symbols-outlined text-[13px]">distance</span>
                                    {t.distance.toFixed(1)} km
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{t.clinic_name || t.bio || 'Veterinary Professional.'}</p>
                        <div className="mt-auto flex gap-3">
                            <Link to={`/trainer-details?id=${t.id}`} className="flex-1 py-3 px-4 border border-blue-600 text-blue-600 rounded-xl font-bold text-sm text-center hover:bg-blue-50 transition-colors">Profile</Link>
                            <Link to={`/trainer-details?id=${t.id}&book=true`} className="flex-[2] py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg active:scale-95 transition-all text-center">Book Consult</Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col md:flex-row bg-white rounded-2xl p-4 gap-6 border border-slate-100 hover:border-blue-300 shadow-sm transition-all group">
                <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden shrink-0">
                    <img 
                        className="w-full h-full object-cover" 
                        src={t.profile_pic_url || defaultPic} 
                        alt={t.first_name} 
                        onError={(e) => { e.target.onerror = null; e.target.src = defaultPic; }}
                    />
                </div>
                <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <h3 className="text-lg font-bold flex items-center gap-1.5 flex-wrap">
                                <span>{t.first_name.toLowerCase().startsWith('dr.') ? t.first_name : 'Dr. ' + t.first_name} {t.last_name}</span>
                                {t.active_subscription_plan_id && (
                                    <PremiumBadge active_subscription_plan_id={t.active_subscription_plan_id} active_subscription_plan_name={t.active_subscription_plan_name} />
                                )}
                            </h3>
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-[10px] uppercase shrink-0">{spec}</span>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4">{t.clinic_name || t.bio || 'Veterinary Professional'}</p>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-yellow-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span> {rating} (Reviews)</span>
                            <span className="flex items-center gap-1 text-blue-600"><span className="material-symbols-outlined text-sm">verified</span> Licensed</span>
                            {t.distance !== undefined && t.distance !== null && (
                                <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <span className="material-symbols-outlined text-sm">distance</span>
                                    {t.distance.toFixed(1)} km away
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-xl font-bold text-blue-600">EGP 800<span className="text-sm font-normal text-slate-400">/consult</span></span>
                        <div className="flex gap-2">
                            <Link to={`/trainer-details?id=${t.id}`} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center flex items-center">View Profile</Link>
                            <Link to={`/trainer-details?id=${t.id}&book=true`} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:shadow-md transition-all">Book</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const vetsSchema = {
        "@context": "https://schema.org",
        "@type": "VeterinaryCare",
        "name": "PetPulse Veterinary Consultations",
        "description": "Book clinic visits and video consultations with certified, verified veterinarians in Egypt.",
        "url": "https://petpulse-web.vercel.app/vets",
        "telephone": "+20-100-000-0000",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Cairo",
            "addressCountry": "EG"
        },
        "priceRange": "EGP 500 - 2000",
        "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "00:00",
            "closes": "23:59"
        }
    };

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <SEO 
                title="Verified Veterinary Consultations"
                description="Book clinic appointments and virtual checkups with licensed vets in Cairo and Giza. Certified medical experts for dogs, cats, birds, and exotic pets."
                keywords="veterinarians cairo, vet clinic egypt, cat vet cairo, dog doctor giza, booking online vet, petpulse"
                schema={vetsSchema}
            />
            <DiscoverySidebar />

            <main className="flex-1 min-w-0">
                {/* ── Back Navigation ── */}
                <div className="mb-6 flex justify-start">
                    <Link 
                        to="/"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-200 active:scale-[0.98] group"
                    >
                        <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-0.5">arrow_back</span>
                        <span className="text-sm font-bold">Back to Home</span>
                    </Link>
                </div>

                {/* Mobile Quick-Links Carousel (hidden on XL screens where sidebar is visible) */}
                <div className="xl:hidden flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none">
                    <Link 
                        to="/explore"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-slate-50 shrink-0 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">explore</span> Explore
                    </Link>
                    <Link 
                        to="/vets"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-extrabold whitespace-nowrap shadow-sm border border-blue-100 shrink-0 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">medical_services</span> Find a Vet
                    </Link>
                    <Link 
                        to="/vet-booking"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-slate-50 shrink-0 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">location_on</span> Local Services
                    </Link>
                    <Link 
                        to="/pet-shops"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-slate-50 shrink-0 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">storefront</span> Pet Shops
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Find a Vet</h1>
                    <p className="text-slate-500 mt-1">Connect with certified veterinary professionals who understand your furry friend's unique needs.</p>
                </div>

                <div className="bg-white p-2 rounded-2xl shadow-sm mb-8 flex flex-col md:flex-row gap-2 border border-slate-200">
                    <div className="flex-1 flex items-center px-4 gap-3 bg-slate-50 rounded-xl">
                        <span className="material-symbols-outlined text-blue-600">search</span>
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 py-3 outline-none text-slate-800 text-sm" 
                            placeholder="Search by name or specialty..." 
                            type="text"
                        />
                    </div>
                </div>
                {/* Featured Section */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Top Rated Vets</h2>
                            <p className="text-slate-500 text-sm mt-1">Our most recommended experts based on community feedback.</p>
                        </div>
                    </div>
                    {loading ? (
                        <p className="text-slate-500 text-center py-10">Loading vets...</p>
                    ) : topVets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {topVets.map(t => <VetCard key={t.id} t={t} isTop={true} />)}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-10">No top vets found.</p>
                    )}
                </div>

                {/* Main Content & Map Split */}
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Main List */}
                    <div className="lg:w-2/3">
                        <h2 className="text-2xl font-bold text-slate-900 mb-8">All Available Vets</h2>
                        <div className="space-y-6">
                            {loading ? (
                                <p className="text-slate-500 text-center py-10">Loading vets...</p>
                            ) : otherVets.length > 0 ? (
                                otherVets.map(t => <VetCard key={t.id} t={t} isTop={false} />)
                            ) : (
                                <p className="text-slate-500 text-center py-10">No other vets found.</p>
                            )}
                        </div>
                    </div>

                    {/* Map Preview Section */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-[104px]">
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hidden lg:block">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-600">explore</span> Vets Near You
                                    </h3>
                                </div>
                                <div className="h-[500px] relative bg-slate-100 z-0">
                                    <LeafletMap
                                        center={[userLocation?.lat || 30.0444, userLocation?.lng || 31.2357]}
                                        zoom={12}
                                        userLocation={userLocation}
                                        markers={parsedVets.map(t => {
                                            const container = document.createElement('div');
                                            container.className = 'text-center font-sans p-2 bg-white rounded-xl';
                                            const titleText = t.first_name.toLowerCase().startsWith('dr.') ? t.first_name : 'Dr. ' + t.first_name;
                                            const imageSrc = t.profile_pic_url || 'https://images.unsplash.com/photo-1628177142898-93e46e64c104?auto=format&fit=crop&q=80&w=300';
                                            
                                            container.innerHTML = `
                                                <img src="${imageSrc}" class="w-12 h-12 rounded-full mx-auto object-cover mb-2 border border-slate-100" alt="${t.first_name}" />
                                                <strong class="block text-slate-800 text-sm">${titleText}</strong>
                                                <span class="text-[10px] text-slate-500 block mb-1">${t.clinic_name || 'Veterinary Clinic'}</span>
                                                ${t.distance !== null && t.distance !== undefined ? `<span class="text-[10px] text-emerald-600 font-extrabold block mb-2">${t.distance.toFixed(1)} km away</span>` : ''}
                                                <button class="inline-block bg-blue-600 text-white text-[10px] font-bold py-1 px-3 rounded-full hover:bg-blue-700 transition-colors map-vet-action-btn">View Profile</button>
                                            `;
                                            
                                            const btn = container.querySelector('.map-vet-action-btn');
                                            if (btn) {
                                                btn.addEventListener('click', (e) => {
                                                    e.stopPropagation();
                                                    navigate(`/trainer-details?id=${t.id}`);
                                                });
                                            }
                                            
                                            return {
                                                id: t.id,
                                                coords: t.coords,
                                                popupHtml: container
                                            };
                                        })}
                                    />
                                </div>
                            </div>

                            {/* Newsletter/CTA Mini Card */}
                            <div className="mt-8 bg-blue-600 p-6 rounded-2xl text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <h4 className="text-lg font-bold mb-2">Need a recommendation?</h4>
                                    <p className="text-sm text-blue-100 mb-4">Tell us about your pet, and we'll match you with the perfect vet.</p>
                                    <button onClick={() => setIsTriageModalOpen(true)} className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors">Start Matching Quiz</button>
                                </div>
                                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12">pets</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            <VetTriageModal isOpen={isTriageModalOpen} onClose={() => setIsTriageModalOpen(false)} />
        </div>
    );
};

export default Vets;
