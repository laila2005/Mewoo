import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import DiscoverySidebar from '../components/layout/DiscoverySidebar';
import DiscoveryHeader from '../components/layout/DiscoveryHeader';
import LeafletMap from '../components/common/LeafletMap';
import { useAuth } from '../context/AuthContext';
import LocationPromptModal from '../components/common/LocationPromptModal';
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

const getProviderCoords = (t) => {
    let lat = parseFloat(t.latitude);
    let lng = parseFloat(t.longitude);
    const idNum = typeof t.id === 'string' ? (parseInt(t.id.replace(/\D/g, ''), 10) || 1) : (parseInt(t.id, 10) || 1);
    if (isNaN(lat) || !isFinite(lat)) lat = 30.0444 + ((idNum * 0.003) % 0.05);
    if (isNaN(lng) || !isFinite(lng)) lng = 31.2357 + ((idNum * 0.005) % 0.05);
    return [lat, lng];
};

const VetBooking = () => {
    const navigate = useNavigate();
    const { userLocation } = useAuth();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    
    const [vets, setVets] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [adoptablePets, setAdoptablePets] = useState([]);
    const [matingPets, setMatingPets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [providersRes, adoptableRes, matingRes] = await Promise.all([
                    axios.get(`${API_BASE}/providers`).catch(() => ({ data: { vets: [], trainers: [] } })),
                    axios.get(`${API_BASE}/pets/adoptable`).catch(() => ({ data: { pets: [] } })),
                    axios.get(`${API_BASE}/pets/mating`).catch(() => ({ data: { pets: [] } }))
                ]);

                setVets(providersRes.data.vets || []);
                setTrainers(providersRes.data.trainers || []);
                setAdoptablePets(adoptableRes.data.pets || []);
                setMatingPets(matingRes.data.pets || []);
            } catch (error) {
                console.error("Error fetching explore data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Stable marker positions and distance sorting
    const sortedVets = useMemo(() => {
        return vets.map(v => {
            const [lat, lng] = getProviderCoords(v);
            const distance = calculateDistance(userLocation?.lat, userLocation?.lng, lat, lng);
            return { ...v, lat, lng, distance };
        }).sort((a, b) => {
            if (a.distance === null || a.distance === undefined) return 1;
            if (b.distance === null || b.distance === undefined) return -1;
            return a.distance - b.distance;
        });
    }, [vets, userLocation]);

    const sortedTrainers = useMemo(() => {
        return trainers.map(t => {
            const [lat, lng] = getProviderCoords(t);
            const distance = calculateDistance(userLocation?.lat, userLocation?.lng, lat, lng);
            return { ...t, lat, lng, distance };
        }).sort((a, b) => {
            if (a.distance === null || a.distance === undefined) return 1;
            if (b.distance === null || b.distance === undefined) return -1;
            return a.distance - b.distance;
        });
    }, [trainers, userLocation]);

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <DiscoverySidebar />
            
            <main className="flex-1 min-w-0 space-y-12 sm:space-y-16">
                
                {/* Unified discovery header (mobile/tablet) */}
                <DiscoveryHeader active="local" />

                {/* Header section */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight hidden xl:block">Explore Local Care</h1>
                            <div className="flex items-center gap-2 text-slate-500">
                                <span className="material-symbols-outlined text-sm sm:text-base text-blue-600">location_on</span>
                                <p className="text-xs sm:text-sm">Showing services near <span className="font-bold text-slate-800">{userLocation?.neighborhood || 'Cairo, Egypt'}</span></p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsLocationModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs sm:text-sm bg-white shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit_location</span>
                            Change Location
                        </button>
                    </div>
                </section>

                {/* Vets Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-blue-600">medical_services</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Nearby Veterinarians</h2>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x">
                        {loading ? (
                            <p className="text-slate-500 text-sm p-4">Loading veterinarians...</p>
                        ) : sortedVets.length > 0 ? (
                            sortedVets.map(vet => (
                                <div key={vet.id} onClick={() => navigate(`/trainer-details?id=${vet.id}`)} className="min-w-[280px] sm:min-w-[320px] bg-white rounded-2xl p-6 border border-slate-100 snap-start shrink-0 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                                    <div className="flex items-start gap-4 mb-4">
                                        <img src={vet.profile_pic_url || 'https://ui-avatars.com/api/?name=Vet'} alt="Vet" className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-50" />
                                        <div>
                                            <h3 className="font-bold text-slate-900">{vet.first_name.toLowerCase().startsWith('dr.') ? vet.first_name : 'Dr. ' + vet.first_name} {vet.last_name}</h3>
                                            <p className="text-slate-500 text-sm">{vet.clinic_name || 'Veterinary Clinic'}</p>
                                            <div className="flex items-center gap-1 mt-1 text-amber-500">
                                                <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                <span className="font-bold text-sm">4.9</span>
                                                <span className="text-slate-400 text-xs">(120)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">General Practice</span>
                                        {vet.is_emergency && <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-md text-xs font-bold">Emergency</span>}
                                        {vet.distance !== undefined && vet.distance !== null && (
                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-extrabold flex items-center gap-0.5">
                                                <span className="material-symbols-outlined text-[14px]">distance</span>
                                                {vet.distance.toFixed(1)} km
                                            </span>
                                        )}
                                    </div>
                                    <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">
                                        Book Consult
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm p-4">No veterinarians found nearby.</p>
                        )}
                    </div>
                </section>

                {/* Trainers Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-emerald-600">sports_score</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Professional Trainers</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {loading ? (
                            <p className="text-slate-500 text-sm p-4 col-span-full">Loading trainers...</p>
                        ) : sortedTrainers.length > 0 ? (
                            sortedTrainers.map(trainer => (
                                <div key={trainer.id} onClick={() => navigate(`/trainer-details?id=${trainer.id}`)} className="group bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 text-center shadow-sm hover:shadow-xl transition-all cursor-pointer">
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5">
                                        <img src={trainer.profile_pic_url || `https://ui-avatars.com/api/?name=${trainer.first_name}`} alt="Trainer" className="w-full h-full rounded-full object-cover border-4 border-slate-50" />
                                        <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white">
                                            <span className="material-symbols-outlined text-sm">verified</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-900">{trainer.first_name} {trainer.last_name}</h3>
                                    <p className="text-emerald-600 font-bold text-xs sm:text-sm mb-2">{trainer.specialties ? trainer.specialties.join(', ') : 'Professional Trainer'}</p>
                                    {trainer.distance !== undefined && trainer.distance !== null && (
                                        <p className="text-slate-400 font-bold text-xs mb-3 flex items-center justify-center gap-0.5">
                                            <span className="material-symbols-outlined text-[14px]">distance</span>
                                            {trainer.distance.toFixed(1)} km away
                                        </p>
                                    )}
                                    <button className="w-full bg-emerald-50 text-emerald-600 py-2.5 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-colors text-sm">
                                        View Profile
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm p-4 col-span-full">No trainers found nearby.</p>
                        )}
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                    {/* Adoptable Pets */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-blue-600">volunteer_activism</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Pets for Adoption</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {loading ? (
                                <p className="text-slate-500 text-sm p-4">Loading adoptable pets...</p>
                            ) : adoptablePets.length > 0 ? (
                                adoptablePets.slice(0, 4).map(pet => (
                                    <Link key={pet.id} to={`/pet-profile?id=${pet.id}`} className="bg-white rounded-2xl overflow-hidden border border-slate-100 flex shadow-sm hover:shadow-xl transition-all group">
                                        <div className="w-1/3 bg-slate-100 overflow-hidden">
                                            <img src={pet.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200'} alt={pet.name} className="w-full h-full object-cover min-h-[120px] group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{pet.name}</h3>
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm mb-2">{pet.breed || 'Mixed'} • {pet.age_years || '?'} yrs</p>
                                            <span className="text-blue-600 font-bold text-xs mt-auto">Available Now</span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm p-4">No adoptable pets found.</p>
                            )}
                        </div>
                    </div>

                    {/* Mating Pets */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-pink-600">pets</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Pets for Mating</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {loading ? (
                                <p className="text-slate-500 text-sm p-4">Loading mating pets...</p>
                            ) : matingPets.length > 0 ? (
                                matingPets.slice(0, 4).map(pet => (
                                    <Link key={pet.id} to={`/pet-profile?id=${pet.id}`} className="bg-white rounded-2xl overflow-hidden border border-slate-100 flex shadow-sm hover:shadow-xl transition-all group">
                                        <div className="w-1/3 bg-slate-100 overflow-hidden">
                                            <img src={pet.avatar_url || 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200'} alt={pet.name} className="w-full h-full object-cover min-h-[120px] group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-slate-900 group-hover:text-pink-600 transition-colors">{pet.name}</h3>
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm mb-2">{pet.breed || 'Purebred'} • {pet.age_years || '?'} yrs</p>
                                            <span className="text-pink-600 font-bold text-xs mt-auto">Seeking Mate</span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-slate-500 text-sm p-4">No pets seeking mating found.</p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                    <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Service Map</h2>
                            <p className="text-slate-500 text-sm mt-1">Showing veterinarians, trainers & shelters near you</p>
                        </div>
                    </div>
                    <div className="h-64 sm:h-80 md:h-96 w-full bg-slate-100 relative z-0">
                        <LeafletMap
                            center={[userLocation?.lat || 30.0444, userLocation?.lng || 31.2357]}
                            zoom={12}
                            userLocation={userLocation}
                            markers={[
                                ...sortedVets.map(t => {
                                    const container = document.createElement('div');
                                    container.className = 'text-center font-sans p-2 bg-white rounded-xl';
                                    const titleText = t.first_name.toLowerCase().startsWith('dr.') ? t.first_name : 'Dr. ' + t.first_name;
                                    const imageSrc = t.profile_pic_url || 'https://images.unsplash.com/photo-1628177142898-93e46e64c104?auto=format&fit=crop&q=80&w=300';
                                    
                                    container.innerHTML = `
                                        <img src="${imageSrc}" class="w-12 h-12 rounded-full mx-auto object-cover mb-2 border border-slate-100" alt="${t.first_name}" />
                                        <strong class="block text-slate-800 text-sm">${titleText}</strong>
                                        <span class="text-[10px] text-slate-500 block mb-1">${t.clinic_name || 'Veterinary Clinic'}</span>
                                        ${t.distance !== null && t.distance !== undefined ? `<span class="text-[10px] text-emerald-600 font-extrabold block mb-2">${t.distance.toFixed(1)} km away</span>` : ''}
                                        <button class="inline-block bg-blue-600 text-white text-[10px] font-bold py-1.5 px-4 mt-1 rounded-full hover:bg-blue-700 transition-colors map-vet-action-btn">View Profile</button>
                                    `;
                                    
                                    const btn = container.querySelector('.map-vet-action-btn');
                                    if (btn) {
                                        btn.addEventListener('click', (e) => {
                                            e.stopPropagation();
                                            navigate(`/trainer-details?id=${t.id}`);
                                        });
                                    }
                                    
                                    return {
                                        id: `vet-${t.id}`,
                                        coords: [t.lat, t.lng],
                                        popupHtml: container
                                    };
                                }),
                                ...sortedTrainers.map(t => {
                                    const container = document.createElement('div');
                                    container.className = 'text-center font-sans p-2 bg-white rounded-xl';
                                    const imageSrc = t.profile_pic_url || `https://ui-avatars.com/api/?name=${t.first_name}`;
                                    
                                    container.innerHTML = `
                                        <img src="${imageSrc}" class="w-12 h-12 rounded-full mx-auto object-cover mb-2 border border-slate-100" alt="${t.first_name}" />
                                        <strong class="block text-slate-800 text-sm">${t.first_name} ${t.last_name}</strong>
                                        <span class="text-[10px] text-slate-500 block mb-1">${t.specialties ? t.specialties[0] : 'Trainer'}</span>
                                        ${t.distance !== null && t.distance !== undefined ? `<span class="text-[10px] text-emerald-600 font-extrabold block mb-2">${t.distance.toFixed(1)} km away</span>` : ''}
                                        <button class="inline-block bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-4 mt-1 rounded-full hover:bg-emerald-700 transition-colors map-trainer-action-btn">View Profile</button>
                                    `;
                                    
                                    const btn = container.querySelector('.map-trainer-action-btn');
                                    if (btn) {
                                        btn.addEventListener('click', (e) => {
                                            e.stopPropagation();
                                            navigate(`/trainer-details?id=${t.id}`);
                                        });
                                    }
                                    
                                    return {
                                        id: `trainer-${t.id}`,
                                        coords: [t.lat, t.lng],
                                        popupHtml: container
                                    };
                                })
                            ]}
                        />
                    </div>
                </section>
            </main>
            <LocationPromptModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        </div>
    );
};

export default VetBooking;
