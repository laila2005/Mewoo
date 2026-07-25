import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/common/SEO';
import PremiumBadge from '../components/common/PremiumBadge';
import LocationPromptModal from '../components/common/LocationPromptModal';
import LeafletMap from '../components/common/LeafletMap';
import DiscoveryHeader from '../components/layout/DiscoveryHeader';

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
                        const validShops = data.shops
                            .map(shop => ({
                                ...shop,
                                lat: parseFloat(shop.lat),
                                lng: parseFloat(shop.lng)
                            }))
                            .filter(shop => 
                                !isNaN(shop.lat) && isFinite(shop.lat) && 
                                !isNaN(shop.lng) && isFinite(shop.lng) && 
                                shop.image
                            );
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
            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Shop List */}
                <div className="w-full lg:w-1/2 overflow-y-auto p-4 md:p-8 bg-slate-50 relative z-10">
                    {/* Unified discovery header (mobile/tablet) */}
                    <DiscoveryHeader active="shops" />

                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-end gap-4">
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
                    <LeafletMap
                        center={[userLocation?.lat || 30.0444, userLocation?.lng || 31.2357]}
                        zoom={12}
                        userLocation={userLocation}
                        markers={parsedShops.map(shop => ({
                            id: shop.id,
                            coords: [shop.lat, shop.lng],
                            title: shop.name,
                            subtitle: shop.category,
                            distanceText: shop.distance !== null && shop.distance !== undefined ? `${shop.distance.toFixed(1)} km away` : null,
                            image: shop.image,
                            isOpenStatus: shop.isOpen,
                            buttonText: "Shop Online",
                            onButtonClick: () => navigate(`/marketplace?shop=${encodeURIComponent(shop.name)}`)
                        }))}
                        onMarkerRegister={(id, marker) => {
                            markerRefs.current[id] = marker;
                        }}
                    />
                </div>
            </div>
            <LocationPromptModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        </div>
    );
};

export default PetShops;
