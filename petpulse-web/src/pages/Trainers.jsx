import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Trainers = () => {
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

    const topTrainers = filteredTrainers.slice(0, 3);
    const otherTrainers = filteredTrainers.slice(3);

    const TrainerCard = ({ t, isTop }) => {
        const defaultPic = 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&q=80&w=300';
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
                        <h3 className="text-xl font-bold mb-1">{t.first_name} {t.last_name}</h3>
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
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-bold">{t.first_name} {t.last_name}</h3>
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-[10px] uppercase">{spec}</span>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4">{t.bio || 'Professional Pet Trainer'}</p>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-yellow-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span> {rating} (Reviews)</span>
                            <span className="flex items-center gap-1 text-emerald-600"><span className="material-symbols-outlined text-sm">verified_user</span> Verified Pro</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-xl font-bold text-blue-600">$65<span className="text-sm font-normal text-slate-400">/hr</span></span>
                        <div className="flex gap-2">
                            <Link to={`/trainer-details?id=${t.id}`} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center flex items-center">View Profile</Link>
                            <Link to={`/trainer-details?id=${t.id}&book=true`} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:shadow-md transition-all">Book</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-50 min-h-screen">
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
                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs whitespace-nowrap">
                            <span className="material-symbols-outlined text-sm">near_me</span> Near Me
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
                            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-100">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-600">explore</span> Trainers Near You
                                    </h3>
                                </div>
                                <div className="h-[500px] relative bg-slate-100 z-0">
                                    <MapContainer center={[30.0444, 31.2357]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                        />
                                        {trainers.map(t => (
                                            <Marker key={t.id} position={[30.0444 + (Math.random() - 0.5) * 0.1, 31.2357 + (Math.random() - 0.5) * 0.1]}>
                                                <Popup>
                                                    <div className="text-center font-sans">
                                                        <img 
                                                            src={t.profile_pic_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=300'} 
                                                            className="w-12 h-12 rounded-full mx-auto object-cover mb-2" 
                                                            alt={t.first_name} 
                                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=300'; }}
                                                        />
                                                        <strong className="block text-slate-800">{t.first_name} {t.last_name}</strong>
                                                        <span className="text-xs text-slate-500">{t.specialties?.[0] || 'Professional Trainer'}</span>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
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
        </div>
    );
};

export default Trainers;
