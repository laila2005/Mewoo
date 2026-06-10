import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import PremiumBadge from '../components/common/PremiumBadge';
import { useAuth } from '../context/AuthContext';
import LocationPromptModal from '../components/common/LocationPromptModal';
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

const getTrainerCoords = (t) => {
    let lat = parseFloat(t.latitude);
    let lng = parseFloat(t.longitude);
    const idNum = typeof t.id === 'string' ? (parseInt(t.id.replace(/\D/g, ''), 10) || 1) : (parseInt(t.id, 10) || 1);
    if (isNaN(lat) || !isFinite(lat)) lat = 30.0444 + ((idNum * 0.003) % 0.05);
    if (isNaN(lng) || !isFinite(lng)) lng = 31.2357 + ((idNum * 0.005) % 0.05);
    return [lat, lng];
};

const defaultPic = 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&q=80&w=300';

const Trainers = () => {
    const navigate = useNavigate();
    const { userLocation } = useAuth();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        const fetchTrainers = async () => {
            try {
                // Assuming providers include both vets and trainers, here we fetch providers
                const res = await axios.get(`${API_BASE}/providers`);
                // For demonstration, let's treat all fetched providers as trainers in this view,
                // or if backend separates them by role, we could filter here.
                setTrainers(res.data.trainers || res.data.providers || []);
            } catch (error) {
                console.error("Failed to load trainers", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrainers();
    }, []);

    const filteredTrainers = trainers.filter(t => {
        const name = `${t.first_name} ${t.last_name}`.toLowerCase();
        const specs = (t.specialties || []).join(' ').toLowerCase();
        const matchesQuery = name.includes(searchQuery.toLowerCase()) || specs.includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === '' || (t.specialties && t.specialties.some(s => s.toLowerCase().includes(typeFilter.toLowerCase())));
        return matchesQuery && matchesType;
    });

    const parsedTrainers = useMemo(() => {
        return filteredTrainers.map(t => {
            const [lat, lng] = getTrainerCoords(t);
            const distance = calculateDistance(userLocation?.lat, userLocation?.lng, lat, lng);
            return { ...t, distance, coords: [lat, lng] };
        }).sort((a, b) => {
            if (a.distance === null || a.distance === undefined) return 1;
            if (b.distance === null || b.distance === undefined) return -1;
            return a.distance - b.distance;
        });
    }, [filteredTrainers, userLocation]);

    const topTrainers = parsedTrainers.slice(0, 3);
    const otherTrainers = parsedTrainers.slice(3);

    const TrainerCard = ({ t, isTop }) => {
        const spec = t.specialties && t.specialties.length > 0 ? t.specialties[0] : 'General Training';
        const rating = isTop ? '4.9' : '4.8';

        if (isTop) {
            return (
                <div className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col">
                    <div className="relative h-64 shrink-0">
                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={t.profile_pic_url || defaultPic} alt={t.first_name} />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <span className="material-symbols-outlined text-yellow-500 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            <span className="font-bold text-xs text-slate-900">{rating}</span>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                        <h3 className="text-xl font-bold mb-1 flex items-center gap-1.5 flex-wrap">
                            <span>{t.first_name} {t.last_name}</span>
                            {t.active_subscription_plan_id && (
                                <PremiumBadge active_subscription_plan_id={t.active_subscription_plan_id} active_subscription_plan_name={t.active_subscription_plan_name} />
                            )}
                        </h3>
                        <div className="flex items-center gap-2 mb-3 text-xs font-bold">
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">{spec}</span>
                            {t.distance !== undefined && t.distance !== null && (
                                <span className="flex items-center gap-0.5 text-slate-500 bg-slate-100/70 px-2 py-0.5 rounded">
                                    <span className="material-symbols-outlined text-[13px]">distance</span>
                                    {t.distance.toFixed(1)} km
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{t.bio || 'Professional Pet Trainer.'}</p>
                        <div className="mt-auto flex gap-3">
                            <Link to={`/trainer-details?id=${t.id}`} className="flex-1 py-3 px-4 border border-blue-600 text-blue-600 rounded-xl font-bold text-sm text-center hover:bg-blue-50 transition-colors">Profile</Link>
                            <Link to={`/trainer-details?id=${t.id}&book=true`} className="flex-[2] py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg active:scale-95 transition-all text-center">Book Session</Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col md:flex-row bg-white rounded-2xl p-4 gap-6 border border-slate-100 hover:border-blue-300 shadow-sm transition-all group">
                <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden shrink-0">
                    <img className="w-full h-full object-cover" src={t.profile_pic_url || defaultPic} alt={t.first_name} />
                </div>
                <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <h3 className="text-lg font-bold flex items-center gap-1.5 flex-wrap">
                                <span>{t.first_name} {t.last_name}</span>
                                {t.active_subscription_plan_id && (
                                    <PremiumBadge active_subscription_plan_id={t.active_subscription_plan_id} active_subscription_plan_name={t.active_subscription_plan_name} />
                                )}
                            </h3>
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-[10px] uppercase shrink-0">{spec}</span>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4">{t.bio || 'Professional Pet Trainer'}</p>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-yellow-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span> {rating} (Reviews)</span>
                            <span className="flex items-center gap-1 text-emerald-600"><span className="material-symbols-outlined text-sm">verified_user</span> Verified Pro</span>
                            {t.distance !== undefined && t.distance !== null && (
                                <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <span className="material-symbols-outlined text-sm">distance</span>
                                    {t.distance.toFixed(1)} km away
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-xl font-bold text-blue-600">EGP 650<span className="text-sm font-normal text-slate-400">/hr</span></span>
                        <div className="flex gap-2">
                            <Link to={`/trainer-details?id=${t.id}`} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center flex items-center">View Profile</Link>
                            <Link to={`/trainer-details?id=${t.id}&book=true`} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:shadow-md transition-all">Book</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const trainersSchema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "PetPulse Professional Dog Training Academies",
        "description": "Book certified positive-reinforcement trainers and pet behaviorists in Cairo, Egypt.",
        "url": "https://petpulse-web.vercel.app/trainers",
        "telephone": "+20-100-000-0000",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Cairo",
            "addressCountry": "EG"
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <SEO 
                title="Professional Dog Training Academies"
                description="Connect with professional, positive reinforcement dog trainers and puppy behavior specialists in Cairo and Giza. Leash training, socialization, and agility classes."
                keywords="dog trainers cairo, puppy training egypt, positive reinforcement dog cairo, behavior modification dog, petpulse"
                schema={trainersSchema}
            />
            {/* Hero with Dynamic Gradient */}
            <div className="relative pt-32 pb-36 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 z-0"></div>
                <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
                <svg className="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
                </svg>
                <div className="max-w-5xl mx-auto relative z-20 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">Find the Best <span className="text-emerald-300">Trainers</span> Near You</h1>
                    <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10">Connect with certified pet professionals who understand your furry friend's unique needs. From puppy basics to behavior correction.</p>
                    <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2 max-w-3xl mx-auto border border-white/20">
                        <div className="flex-1 flex items-center px-4 gap-3 bg-white/90 rounded-xl border-l md:border-l-0">
                            <span className="material-symbols-outlined text-blue-600">location_on</span>
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 py-4 outline-none text-slate-800" 
                                placeholder="Search by name or specialty..." 
                                type="text"
                            />
                        </div>
                        <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg transition-all border border-white/30">Search Now</button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <section className="sticky top-[72px] z-40 bg-white border-b border-slate-200 py-4 px-6 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <button 
                            onClick={() => setIsLocationModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs whitespace-nowrap transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            <span>📍 {userLocation?.neighborhood || 'Cairo, Egypt'}</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-full font-bold text-xs text-slate-600 whitespace-nowrap transition-colors">
                            <span className="material-symbols-outlined text-sm">star</span> Top Rated
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-full font-bold text-xs text-slate-600 whitespace-nowrap transition-colors">
                            <span className="material-symbols-outlined text-sm">schedule</span> Available Now
                        </button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                    <div className="relative group">
                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="appearance-none bg-slate-50 border border-slate-200 rounded-full px-6 py-2 pr-10 font-bold text-xs text-slate-600 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                        >
                            <option value="">Training Type (All)</option>
                            <option value="Puppy Foundations">Puppy Foundations</option>
                            <option value="Behavior Correction">Behavior Correction</option>
                            <option value="Obedience">Obedience</option>
                            <option value="Agility">Agility</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sm text-slate-400">expand_more</span>
                    </div>
                </div>
            </section>

            <main className="max-w-7xl mx-auto px-6 py-12">
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

                {/* Featured Section */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Top Rated Trainers</h2>
                            <p className="text-slate-500 text-sm mt-1">Our most recommended experts based on community feedback.</p>
                        </div>
                    </div>
                    {loading ? (
                        <p className="text-slate-500 text-center py-10">Loading trainers...</p>
                    ) : topTrainers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {topTrainers.map(t => <TrainerCard key={t.id} t={t} isTop={true} />)}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-10">No top trainers found.</p>
                    )}
                </div>

                {/* Main Content & Map Split */}
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Main List */}
                    <div className="lg:w-2/3">
                        <h2 className="text-2xl font-bold text-slate-900 mb-8">All Available Trainers</h2>
                        <div className="space-y-6">
                            {loading ? (
                                <p className="text-slate-500 text-center py-10">Loading trainers...</p>
                            ) : otherTrainers.length > 0 ? (
                                otherTrainers.map(t => <TrainerCard key={t.id} t={t} isTop={false} />)
                            ) : (
                                <p className="text-slate-500 text-center py-10">No other trainers found.</p>
                            )}
                        </div>
                    </div>

                    {/* Map Preview Section */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-[148px]">
                            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100 flex flex-col hidden lg:flex">
                                <div className="p-6 border-b border-slate-100 shrink-0">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-600">explore</span> Trainers Near You
                                    </h3>
                                </div>
                                <div className="h-[450px] relative bg-slate-100 z-0">
                                    <LeafletMap
                                        center={[userLocation?.lat || 30.0444, userLocation?.lng || 31.2357]}
                                        zoom={12}
                                        userLocation={userLocation}
                                        markers={parsedTrainers.map(t => {
                                            const container = document.createElement('div');
                                            container.className = 'text-center font-sans p-2 bg-white rounded-xl';
                                            const imageSrc = t.profile_pic_url || defaultPic;
                                            
                                            container.innerHTML = `
                                                <img src="${imageSrc}" class="w-12 h-12 rounded-full mx-auto object-cover mb-2 border border-slate-100" alt="${t.first_name}" />
                                                <strong class="block text-slate-800 text-sm">${t.first_name} ${t.last_name}</strong>
                                                <span class="text-[10px] text-slate-500 block mb-1">${t.specialties?.[0] || 'Professional Trainer'}</span>
                                                ${t.distance !== null && t.distance !== undefined ? `<span class="text-[10px] text-emerald-600 font-extrabold block mb-2">${t.distance.toFixed(1)} km away</span>` : ''}
                                                <button class="inline-block bg-blue-600 text-white text-[10px] font-bold py-1 px-3 rounded-full hover:bg-blue-700 transition-colors map-trainer-action-btn">View Profile</button>
                                            `;
                                            
                                            const btn = container.querySelector('.map-trainer-action-btn');
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
                                    <p className="text-sm text-blue-100 mb-4">Tell us about your pet, and we'll match you with the perfect trainer.</p>
                                    <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-colors">Start Matching Quiz</button>
                                </div>
                                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12">psychology_alt</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <LocationPromptModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        </div>
    );
};

export default Trainers;
