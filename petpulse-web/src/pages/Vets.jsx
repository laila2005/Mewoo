import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import DiscoverySidebar from '../components/layout/DiscoverySidebar';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import VetTriageModal from '../components/community/VetTriageModal';

// Fix for default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Vets = () => {
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

    const topVets = filteredVets.slice(0, 3);
    const otherVets = filteredVets.slice(3);

    const VetCard = ({ t, isTop }) => {
        const defaultPic = 'https://images.unsplash.com/photo-1628177142898-93e46e64c104?auto=format&fit=crop&q=80&w=300';
        const spec = t.specialties && t.specialties.length > 0 ? t.specialties[0] : 'General Practice';
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
                        <h3 className="text-xl font-bold mb-1">Dr. {t.first_name} {t.last_name}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{t.clinic_name || t.bio || 'Veterinary Professional.'}</p>
                        <div className="mt-auto flex gap-3">
                            <Link to={`/owner-profile?id=${t.id}`} className="flex-1 py-3 px-4 border border-blue-600 text-blue-600 rounded-xl font-bold text-sm text-center hover:bg-blue-50 transition-colors">Profile</Link>
                            <Link to={`/owner-profile?id=${t.id}`} className="flex-[2] py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg active:scale-95 transition-all text-center">Book Consult</Link>
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
                            <h3 className="text-lg font-bold">Dr. {t.first_name} {t.last_name}</h3>
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-[10px] uppercase">{spec}</span>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4">{t.clinic_name || t.bio || 'Veterinary Professional'}</p>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-yellow-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span> {rating} (Reviews)</span>
                            <span className="flex items-center gap-1 text-blue-600"><span className="material-symbols-outlined text-sm">verified</span> Licensed</span>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-xl font-bold text-blue-600">$80<span className="text-sm font-normal text-slate-400">/consult</span></span>
                        <div className="flex gap-2">
                            <Link to={`/owner-profile?id=${t.id}`} className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center flex items-center">View Profile</Link>
                            <Link to={`/owner-profile?id=${t.id}`} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:shadow-md transition-all">Book</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <DiscoverySidebar />

            <main className="flex-1 min-w-0">
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
                            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-600">explore</span> Vets Near You
                                    </h3>
                                </div>
                                <div className="h-[500px] relative bg-slate-100 z-0">
                                    <MapContainer center={[30.0444, 31.2357]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                        />
                                        {vets.map(t => (
                                            <Marker key={t.id} position={[30.0444 + (Math.random() - 0.5) * 0.1, 31.2357 + (Math.random() - 0.5) * 0.1]}>
                                                <Popup>
                                                    <div className="text-center font-sans">
                                                        <img src={t.profile_pic_url || 'https://images.unsplash.com/photo-1628177142898-93e46e64c104?auto=format&fit=crop&q=80&w=300'} className="w-12 h-12 rounded-full mx-auto object-cover mb-2" alt={t.first_name} />
                                                        <strong className="block text-slate-800">Dr. {t.first_name}</strong>
                                                        <span className="text-xs text-slate-500">{t.clinic_name || 'Veterinary Clinic'}</span>
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
