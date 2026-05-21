import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import SEO from '../components/common/SEO';
import PremiumBadge from '../components/common/PremiumBadge';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import LocationPromptModal from '../components/common/LocationPromptModal';

// Fix for default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        const container = map.getContainer();
        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });
        observer.observe(container);
        
        return () => observer.disconnect();
    }, [map]);
    return null;
};

// Custom Pulsing Blue Marker for User Location
const pulsingIcon = typeof window !== 'undefined' ? L.divIcon({
    className: 'custom-pulsing-marker',
    html: `
        <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-30"></div>
            <div class="relative w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
}) : null;

const MapRecenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.flyTo(center, 12, { animate: true, duration: 1.5 });
        }
    }, [center, map]);
    return null;
};

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

const PetShops = () => {
    const { user, userLocation } = useAuth();
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('All Shops');
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const markerRefs = useRef({});

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const response = await fetch(`${API_BASE}/public/shops`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.shops) {
                        const validShops = data.shops.filter(shop => shop.lat && shop.lng && shop.image);
                        setShops(validShops);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch shops:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
    }, []);

    const parsedShops = useMemo(() => {
        const activeShops = activeFilter === 'All Shops' 
            ? shops 
            : shops.filter(shop => shop.category.includes(activeFilter));

        return activeShops.map(shop => {
            const distance = calculateDistance(userLocation?.lat, userLocation?.lng, parseFloat(shop.lat), parseFloat(shop.lng));
            return { ...shop, distance };
        }).sort((a, b) => {
            if (a.distance === null || a.distance === undefined) return 1;
            if (b.distance === null || b.distance === undefined) return -1;
            return a.distance - b.distance;
        });
    }, [shops, activeFilter, userLocation]);

    const petShopsSchema = {
        "@context": "https://schema.org",
        "@type": "PetStore",
        "name": "PetPulse Local Pet Shops Directory",
        "description": "Directory and interactive map of the best local physical pet stores and grooming centers in Egypt.",
        "url": "https://petpulse-web.vercel.app/pet-shops",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Cairo",
            "addressCountry": "EG"
        }
    };

    return (
        <div className="flex w-full min-h-[calc(100vh-80px)] bg-[#f7faf9]">
            <SEO 
                title="Premium Pet Shops Directory"
                description="Explore local pet shops and grooming boutiques in Cairo and Giza. Find certified physical pet stores, premium dry food retailers, and durable toy supplies near you."
                keywords="pet shops cairo, pet stores egypt, grooming cairo, local pet supplies, tags map tags, petpulse"
                schema={petShopsSchema}
            />
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 hidden xl:block bg-white border-r border-slate-200 overflow-y-auto px-4 py-8 relative z-20">
                <div className="mb-6">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Menu</div>
                    <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">grid_view</span> Home
                    </Link>
                    <Link to="/owner-profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">pets</span> My Pets
                    </Link>
                    <Link to="/appointments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">calendar_today</span> Appointments
                    </Link>
                    <Link to="/community" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">groups</span> Community
                    </Link>
                </div>
                <div className="mb-6">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Discover</div>
                    <Link to="/explore" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">explore</span> Explore
                    </Link>
                    <Link to="/vet-booking" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">medical_services</span> Find a Vet
                    </Link>
                    <Link to="/pet-shops" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>storefront</span> Pet Shops
                    </Link>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Shop List */}
                <div className="w-full lg:w-1/2 overflow-y-auto p-4 md:p-8 bg-slate-50 relative z-10">
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
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-slate-50 shrink-0 active:scale-95 transition-all"
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
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-extrabold whitespace-nowrap shadow-sm border border-blue-100 shrink-0 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">storefront</span> Pet Shops
                        </Link>
                    </div>

                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                <span className="material-symbols-outlined text-4xl text-blue-600" style={{fontVariationSettings:"'FILL' 1"}}>storefront</span>
                                Pet Shops
                            </h1>
                            <p className="text-slate-500 mt-1">Find the best pet supplies, food, and toys near you.</p>
                        </div>
                        <button 
                            onClick={() => setIsLocationModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs bg-white shadow-sm self-start sm:self-center"
                        >
                            <span className="material-symbols-outlined text-[16px] text-blue-600">location_on</span>
                            <span>📍 {userLocation?.neighborhood || 'Cairo, Egypt'}</span>
                        </button>
                    </div>

                    {/* Cross-Link Banner */}
                    <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-blue-600">local_shipping</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Prefer shopping from home?</h4>
                                <p className="text-slate-500 text-xs mt-0.5">Discover premium food and toys delivered right to your door.</p>
                            </div>
                        </div>
                        <Link to="/marketplace" className="shrink-0 bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors font-bold text-xs py-2 px-4 rounded-xl shadow-sm flex items-center gap-1 w-full sm:w-auto justify-center">
                            Shop Online <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                    </div>

                    {/* Filter Tags */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
                        {['All Shops', 'Premium Food', 'Toys', 'Grooming'].map(filter => (
                            <button 
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${activeFilter === filter ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {filter === 'Toys' ? 'Toys & Accessories' : filter === 'Grooming' ? 'Grooming Available' : filter}
                            </button>
                        ))}
                    </div>

                    {/* Shops Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {parsedShops.map(shop => (
                            <div 
                                key={shop.id} 
                                onMouseEnter={() => {
                                    const marker = markerRefs.current[shop.id];
                                    if (marker) marker.openPopup();
                                }}
                                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                            >
                                <div className="relative h-40 overflow-hidden">
                                    <img src={shop.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={shop.name} />
                                    <div className={`absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider ${shop.isOpen ? 'text-emerald-600' : 'text-red-500'} uppercase shadow-sm`}>
                                        {shop.isOpen ? 'Open Now' : 'Closed'}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <h3 className="text-base font-bold text-slate-800 leading-tight">{shop.name}</h3>
                                            {shop.active_subscription_plan_id && (
                                                <div className="mt-0.5">
                                                    <PremiumBadge active_subscription_plan_id={shop.active_subscription_plan_id} active_subscription_plan_name={shop.active_subscription_plan_name} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md text-[11px] font-bold ml-2 shrink-0">
                                            <span className="material-symbols-outlined text-[12px]" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                                            {shop.rating}
                                        </div>
                                    </div>
                                    <p className="text-xs font-semibold text-blue-600 mb-3">{shop.category}</p>
                                    
                                    <div className="flex items-center justify-between gap-1.5 text-slate-500 text-xs mb-3">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                                            <span className="truncate">{shop.address}</span>
                                        </div>
                                        {shop.distance !== undefined && shop.distance !== null && (
                                            <span className="shrink-0 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-0.5 animate-fade-in">
                                                <span className="material-symbols-outlined text-[12px]">distance</span>
                                                {shop.distance.toFixed(1)} km
                                            </span>
                                        )}
                                    </div>

                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/marketplace?shop=${encodeURIComponent(shop.name)}`); }} className="w-full bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                                        Shop Online
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Interactive Map */}
                <div className="hidden lg:block w-1/2 sticky top-[80px] z-10 border-l border-slate-200 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)] h-[calc(100vh-80px)]">
                    <MapContainer center={[userLocation?.lat || 30.0444, userLocation?.lng || 31.2357]} zoom={12} className="w-full h-full z-0" style={{ height: '100%', width: '100%' }}>
                        <MapResizer />
                        <MapRecenter center={[userLocation?.lat || 30.0444, userLocation?.lng || 31.2357]} />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Pulsing "You Are Here" Marker */}
                        {userLocation && pulsingIcon && (
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={pulsingIcon}>
                                <Popup>
                                    <div className="text-center font-sans p-1">
                                        <strong className="block text-slate-800 text-sm">📍 You Are Here</strong>
                                        <span className="text-[10px] text-slate-500 block">{userLocation.neighborhood || 'Cairo, Egypt'}</span>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {parsedShops.map(shop => (
                            <Marker 
                                key={shop.id} 
                                position={[shop.lat, shop.lng]}
                                ref={(ref) => {
                                    if (ref) {
                                        markerRefs.current[shop.id] = ref;
                                    }
                                }}
                            >
                                <Popup className="rounded-xl overflow-hidden shadow-xl p-0 m-0 custom-popup">
                                    <div className="w-56 overflow-hidden rounded-xl border border-slate-100 font-sans">
                                        <div className="h-28 relative">
                                            <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                                            <div className={`absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider ${shop.isOpen ? 'text-emerald-600' : 'text-red-500'} uppercase shadow-sm`}>
                                                {shop.isOpen ? 'Open' : 'Closed'}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-white">
                                            <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{shop.name}</h4>
                                            <p className="text-xs font-semibold text-blue-600 mb-1">{shop.category}</p>
                                            {shop.distance !== null && shop.distance !== undefined && (
                                                <p className="text-[10px] text-emerald-600 font-extrabold mb-2">{shop.distance.toFixed(1)} km away</p>
                                            )}
                                            <button onClick={() => navigate(`/marketplace?shop=${encodeURIComponent(shop.name)}`)} className="w-full bg-slate-900 text-white font-bold py-1.5 rounded-lg text-xs hover:bg-blue-600 transition-colors">
                                                Shop Online
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
            <LocationPromptModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        </div>
    );
};

export default PetShops;
