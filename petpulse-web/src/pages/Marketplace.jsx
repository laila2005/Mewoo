import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const MOCK_PRODUCTS = [
    { id: 'p1', type: 'product', category: 'food', title: 'Premium Grain-Free Dry Dog Food', description: 'High-protein kibble with real salmon and sweet potato for all life stages.', base_price: 2250, image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80', rating: 4.8, reviews: 124, badge: 'Best Seller' },
    { id: 'p2', type: 'product', category: 'accessories', title: 'Heavy Duty Rope Leash with Reflective Thread', description: 'Durable 6ft climbing rope leash with padded handle for maximum comfort.', base_price: 850, image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80', rating: 4.9, reviews: 89, badge: 'New' },
    { id: 'p3', type: 'product', category: 'toys', title: 'Interactive Puzzle Toy for Dogs', description: 'Mental stimulation toy that hides treats to keep your dog entertained for hours.', base_price: 1200, image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&q=80', rating: 4.6, reviews: 210 },
    { id: 'p4', type: 'product', category: 'food', title: 'Organic Beef Liver Training Treats', description: 'Single-ingredient freeze-dried liver treats perfect for obedience training.', base_price: 650, image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80', rating: 4.9, reviews: 432, badge: 'Top Rated' },
    { id: 'p5', type: 'product', category: 'wellness', title: 'Advanced Joint Supplement Chews', description: 'Glucosamine and chondroitin chews to support hip and joint health in senior dogs.', base_price: 1600, image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80', rating: 4.7, reviews: 156 },
    { id: 'p6', type: 'product', category: 'accessories', title: 'Orthopedic Memory Foam Pet Bed', description: 'Premium dog bed with washable cover and bolsters for neck support.', base_price: 4500, image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80', rating: 4.8, reviews: 320, badge: 'Sale' },
    { id: 'p7', type: 'product', category: 'wellness', title: 'Natural Flea & Tick Prevention Spray', description: 'Plant-based alternative to harsh chemicals. Safe for dogs and cats.', base_price: 950, image: 'https://images.unsplash.com/photo-1585559700398-1385b3a8aeb6?w=400&q=80', rating: 4.5, reviews: 67 },
    { id: 'p8', type: 'product', category: 'toys', title: 'Tough Chew Indestructible Bone', description: 'Designed for aggressive chewers. Made from durable non-toxic rubber.', base_price: 800, image: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&q=80', rating: 4.4, reviews: 840 },
    { id: 'sub1', type: 'product', category: 'subscriptions', title: 'PulseBox: The Puppy Starter Kit', description: 'Monthly delivery of teething toys, training treats, and puppy wellness guides.', base_price: 1500, image: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=400&q=80', rating: 5.0, reviews: 1205, badge: 'Popular Plan' },
    { id: 'sub2', type: 'product', category: 'subscriptions', title: 'PulseBox: Premium Chewers Club', description: 'Heavy-duty toys and long-lasting treats tailored for large and aggressive chewers.', base_price: 1750, image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80', rating: 4.9, reviews: 890 },
];

const BADGE_COLORS = { 'Best Seller': 'bg-amber-400 text-white', 'New': 'bg-emerald-500 text-white', 'Top Rated': 'bg-purple-500 text-white', 'Sale': 'bg-red-500 text-white', 'Popular Plan': 'bg-blue-600 text-white' };

const CATEGORIES = [
    { key: 'all', label: 'Everything', icon: 'apps' },
    { key: 'food', label: 'Food & Treats', icon: 'restaurant' },
    { key: 'toys', label: 'Toys', icon: 'sports_baseball' },
    { key: 'accessories', label: 'Accessories', icon: 'checkroom' },
    { key: 'wellness', label: 'Wellness', icon: 'healing' },
    { key: 'subscriptions', label: 'Subscriptions', icon: 'redeem' },
];

const StarRating = ({ rating }) => (
    <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(i => (
            <span key={i} className={`material-symbols-outlined text-[14px] ${i <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`} style={{fontVariationSettings:"'FILL' 1"}}>star</span>
        ))}
        <span className="text-xs text-slate-500 ml-1">{rating.toFixed(1)}</span>
    </div>
);

const Marketplace = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Extract shop name from query parameters if present
    const queryParams = new URLSearchParams(location.search);
    const shopContext = queryParams.get('shop');

    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const filtered = useMemo(() => {
        return MOCK_PRODUCTS.filter(p => {
            const matchesCat = activeCategory === 'all' || p.category === activeCategory;
            const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [activeCategory, searchQuery]);

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { ...item, qty: 1 }];
        });
        toast.success(`${item.title.slice(0, 30)}... added to cart!`);
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(c => c.id !== id));

    const cartTotal = cart.reduce((sum, c) => sum + (c.base_price * c.qty), 0);
    const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

    const handleCheckout = () => {
        if (!user) { toast.error('Please login to checkout'); navigate('/login'); return; }
        if (cart.length === 0) { toast.error('Your cart is empty'); return; }
        // Store cart in localStorage for checkout page
        localStorage.setItem('cart', JSON.stringify(cart));
        navigate('/checkout');
    };

    return (
        <div className="bg-[#f7faf9] min-h-screen">
            {/* HERO */}
            <section className="bg-slate-900 text-white py-20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-40">
                    <img src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&q=80&w=2000" alt="Dogs running" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="max-w-2xl">
                        {shopContext ? (
                            <>
                                <span className="inline-flex items-center gap-1.5 py-1.5 px-4 bg-emerald-500/20 text-emerald-300 rounded-full font-bold text-xs tracking-wider uppercase mb-4 border border-emerald-500/30">
                                    <span className="material-symbols-outlined text-[16px]">storefront</span> Online Storefront
                                </span>
                                <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight text-white">Welcome to<br/><span className="text-emerald-400">{shopContext}</span></h1>
                                <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">You are now browsing the exclusive catalog and products currently available at {shopContext}. Fast local delivery is available!</p>
                            </>
                        ) : (
                            <>
                                <span className="inline-block py-1 px-3 bg-blue-500/20 text-blue-300 rounded-full font-bold text-xs tracking-wider uppercase mb-4 border border-blue-500/30">Everything Your Pet Needs</span>
                                <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight">The Ultimate<br/><span className="text-blue-400">Pet Marketplace</span></h1>
                                <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">From top-tier medical and grooming services to premium nutrition, engaging toys, and stylish accessories.</p>
                            </>
                        )}
                        
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => document.getElementById('searchInput').focus()} className={`font-bold py-3.5 px-8 rounded-xl transition-all text-white ${shopContext ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]'}`}>Browse Catalog</button>
                            <Link to="/pet-shops" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-bold py-3.5 px-8 rounded-xl transition-all">Find Other Shops</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Cart Button (floating) */}
            {cartCount > 0 && (
                <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 hover:bg-blue-700 transition-all hover:scale-105">
                    <span className="material-symbols-outlined">shopping_cart</span>
                    <span className="font-bold">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                    <span className="font-bold text-blue-200">|</span>
                    <span className="font-bold">{cartTotal.toLocaleString()} EGP</span>
                </button>
            )}

            {/* Cart Sidebar */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[200] flex">
                    <div className="flex-1 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
                    <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined">shopping_cart</span> Your Cart ({cartCount})</h2>
                            <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center text-slate-400 mt-12"><span className="material-symbols-outlined text-5xl block mb-3">shopping_cart</span><p>Your cart is empty</p></div>
                            ) : cart.map(item => (
                                <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
                                    <img src={item.image} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" alt={item.title} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-slate-800 truncate">{item.title}</p>
                                        <p className="text-blue-600 font-bold text-sm">{(item.base_price * item.qty).toLocaleString()} EGP</p>
                                        <p className="text-xs text-slate-400">Qty: {item.qty} × {item.base_price.toLocaleString()} EGP</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-slate-100">
                            <div className="flex justify-between mb-4">
                                <span className="font-semibold text-slate-700">Total</span>
                                <span className="font-extrabold text-xl text-blue-600">{cartTotal.toLocaleString()} EGP</span>
                            </div>
                            <button onClick={handleCheckout} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
                                <span className="material-symbols-outlined">lock</span> Proceed to Checkout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main>
                {/* PulseBox Banner */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-4">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 max-w-xl">
                            <div className="flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-amber-300 text-3xl">redeem</span><span className="text-sm font-bold tracking-widest uppercase text-blue-200">New Subscription</span></div>
                            <h2 className="text-3xl md:text-4xl font-black mb-4">Introducing PulseBox</h2>
                            <p className="text-blue-100 text-lg mb-6">A monthly box of joy delivered right to your door. Tailored toys, premium treats, and wellness items hand-picked for your pet's size and breed.</p>
                            <button onClick={() => setActiveCategory('subscriptions')} className="bg-white text-blue-600 font-bold py-3 px-6 rounded-xl hover:bg-blue-50 transition-colors shadow-lg flex items-center gap-2 w-fit">View Plans <span className="material-symbols-outlined text-sm">arrow_forward</span></button>
                        </div>
                        <div className="relative z-10 flex justify-center">
                            <div className="w-44 h-44 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-4 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                                <img src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80" className="w-full h-full object-cover rounded-xl" alt="PulseBox" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    {/* Cross-link Banner */}
                    <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-amber-600">location_on</span></div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Need it immediately?</h4>
                                <p className="text-slate-500 text-xs mt-0.5">Skip the shipping wait. Find a physical pet shop near you for instant pickup.</p>
                            </div>
                        </div>
                        <Link to="/pet-shops" className="shrink-0 bg-white border border-amber-200 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors font-bold text-xs py-2 px-4 rounded-xl shadow-sm flex items-center gap-1">Find Local Shops <span className="material-symbols-outlined text-[14px]">arrow_forward</span></Link>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col xl:flex-row gap-6 mb-10 items-start xl:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="relative w-full xl:w-[400px]">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input id="searchInput" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products, food, accessories..." className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-600 text-sm transition-all outline-none" />
                        </div>
                        <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
                            {CATEGORIES.map(cat => (
                                <button key={cat.key} onClick={() => setActiveCategory(cat.key)} className={`px-5 py-2.5 font-bold text-sm rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeCategory === cat.key ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                                    <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>{cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    {filtered.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-slate-400">
                            <span className="material-symbols-outlined text-5xl block mb-3 opacity-50">search_off</span>
                            <p className="font-semibold">No products match your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map(item => (
                                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col border border-slate-100 group">
                                    <div className="relative h-52 overflow-hidden bg-slate-100 flex items-center justify-center">
                                        <img src={item.image} alt={item.title} 
                                             onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Product+Image'; e.target.onerror = null; }}
                                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        {item.badge && <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${BADGE_COLORS[item.badge] || 'bg-slate-600 text-white'}`}>{item.badge}</span>}
                                    </div>
                                    <div className="p-5 flex flex-col flex-1">
                                        <h3 className="font-bold text-slate-900 mb-1 leading-snug line-clamp-2">{item.title}</h3>
                                        <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">{item.description}</p>
                                        <div className="mt-auto">
                                            <StarRating rating={item.rating} />
                                            <p className="text-xs text-slate-400 mt-1 mb-3">{item.reviews} reviews</p>
                                            <div className="flex items-center justify-between">
                                                <span className="font-extrabold text-blue-600 text-lg">{item.base_price.toLocaleString()} <span className="text-sm font-bold">EGP</span></span>
                                                <button onClick={() => addToCart(item)} className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm active:scale-95">
                                                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Marketplace;
