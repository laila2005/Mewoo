import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PET_SHOPS = [
    {
        id: 1,
        name: "Paws & Play Superstore",
        category: "Premium Food",
        rating: 4.8,
        reviews: 342,
        address: "123 Tails Blvd, Cairo",
        lat: 30.0444, lng: 31.2357,
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=400",
        isOpen: true
    },
    {
        id: 2,
        name: "Happy Tails Boutique",
        category: "Grooming",
        rating: 4.9,
        reviews: 128,
        address: "45 Whiskers Ave, Giza",
        lat: 30.0131, lng: 31.2089,
        image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&q=80&w=400",
        isOpen: true
    },
    {
        id: 3,
        name: "The Healthy Hound",
        category: "Premium Food",
        rating: 4.7,
        reviews: 215,
        address: "78 Bark Street, Heliopolis",
        lat: 30.0924, lng: 31.3216,
        image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=400",
        isOpen: false
    },
    {
        id: 4,
        name: "Feline Friends Emporium",
        category: "Toys",
        rating: 4.6,
        reviews: 89,
        address: "99 Meow Lane, Maadi",
        lat: 29.9602, lng: 31.2569,
        image: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=400",
        isOpen: true
    },
    {
        id: 5,
        name: "Pawsitive Play Boutique",
        category: "Toys",
        rating: 4.5,
        reviews: 56,
        address: "22 Fetch Rd, Nasr City",
        lat: 30.0583, lng: 31.3477,
        image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400",
        isOpen: true
    },
    {
        id: 6,
        name: "Bark & Meow Bakery",
        category: "Premium Food",
        rating: 4.8,
        reviews: 412,
        address: "5 Paws Drive, Zamalek",
        lat: 30.0626, lng: 31.2223,
        image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400",
        isOpen: false
    }
];

const PetShops = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('All Shops');

    const filteredShops = activeFilter === 'All Shops' 
        ? PET_SHOPS 
        : PET_SHOPS.filter(shop => shop.category.includes(activeFilter));

    return (
        <div className="flex w-full min-h-[calc(100vh-80px)] bg-[#f7faf9]">
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
                    <div className="mb-6">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-blue-600" style={{fontVariationSettings:"'FILL' 1"}}>storefront</span>
                            Pet Shops
                        </h1>
                        <p className="text-slate-500 mt-1">Find the best pet supplies, food, and toys near you.</p>
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
                        {filteredShops.map(shop => (
                            <div key={shop.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                                <div className="relative h-40 overflow-hidden">
                                    <img src={shop.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={shop.name} />
                                    <div className={`absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider ${shop.isOpen ? 'text-emerald-600' : 'text-red-500'} uppercase shadow-sm`}>
                                        {shop.isOpen ? 'Open Now' : 'Closed'}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-base font-bold text-slate-800 leading-tight">{shop.name}</h3>
                                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md text-[11px] font-bold ml-2 shrink-0">
                                            <span className="material-symbols-outlined text-[12px]" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                                            {shop.rating}
                                        </div>
                                    </div>
                                    <p className="text-xs font-semibold text-blue-600 mb-3">{shop.category}</p>
                                    
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-3">
                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                        <span className="truncate">{shop.address}</span>
                                    </div>

                                    <button onClick={(e) => { e.stopPropagation(); navigate('/marketplace'); }} className="w-full bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2 rounded-xl text-xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                                        Shop Online
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Map Placeholder */}
                <div className="hidden lg:block w-1/2 relative z-0 border-l border-slate-200 bg-slate-100 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.05)]">
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">map</span>
                        <p className="font-bold text-slate-500 text-lg">Interactive Map</p>
                        <p className="text-sm">Location services integration placeholder.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PetShops;
