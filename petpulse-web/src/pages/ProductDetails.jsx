import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

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

const BADGE_COLORS = { 
    'Best Seller': 'bg-amber-400 text-white', 
    'New': 'bg-emerald-500 text-white', 
    'Top Rated': 'bg-purple-500 text-white', 
    'Sale': 'bg-red-500 text-white', 
    'Popular Plan': 'bg-blue-600 text-white' 
};

const StarRating = ({ rating, size = 'text-[14px]' }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
            <span 
                key={i} 
                className={`material-symbols-outlined ${size} ${i <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`} 
                style={{ fontVariationSettings: "'FILL' 1" }}
            >
                star
            </span>
        ))}
        <span className="text-xs text-slate-500 ml-1.5 font-bold">{Number(rating).toFixed(1)}</span>
    </div>
);

const ProductDetails = () => {
    const { id } = useParams();
    const { user, token, isFeatureLive } = useAuth();
    const marketplaceLive = isFeatureLive('marketplace');
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    // Review form states
    const [newRating, setNewRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Cart integration
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('cart');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (item, qtyToAdd = 1) => {
        if (!marketplaceLive) { toast('🛍️ The marketplace is coming soon!'); return; }
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) {
                return prev.map(c => c.id === item.id ? { ...c, quantity: Math.min(item.quantity !== undefined ? item.quantity : 99, (c.quantity || 1) + qtyToAdd) } : c);
            }
            return [...prev, { ...item, quantity: qtyToAdd }];
        });
        toast.success(`Added ${qtyToAdd} × ${item.title.slice(0, 25)}... to cart!`);
    };

    // Scroll to top on id change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    useEffect(() => {
        const fetchProductData = async () => {
            setLoading(true);
            try {
                // 1. Fetch single product details
                const pRes = await axios.get(`${API_BASE}/public/products/${id}`).catch(() => null);
                let currentProduct = null;

                if (pRes && pRes.data && pRes.data.product) {
                    currentProduct = {
                        ...pRes.data.product,
                        base_price: Number(pRes.data.product.base_price),
                        rating: pRes.data.product.rating ? Number(pRes.data.product.rating) : 4.8,
                        reviews: pRes.data.product.reviews ? Number(pRes.data.product.reviews) : 45
                    };
                } else {
                    // Fallback to mock products if live product not found (keeps local/demo data resilient)
                    const mockMatch = MOCK_PRODUCTS.find(p => p.id === id);
                    if (mockMatch) {
                        currentProduct = mockMatch;
                    }
                }

                if (!currentProduct) {
                    toast.error('Product not found.');
                    navigate('/marketplace');
                    return;
                }
                setProduct(currentProduct);

                // 2. Fetch reviews
                const rRes = await axios.get(`${API_BASE}/public/products/${id}/reviews`).catch(() => null);
                if (rRes && rRes.data && rRes.data.reviews) {
                    setReviews(rRes.data.reviews);
                } else {
                    // Seed mock reviews for mock products so page doesn't look empty
                    setReviews([
                        { id: 'r1', rating: 5, comment: 'Absolutely incredible! My pet fell in love with it immediately. Highly recommend.', first_name: 'Ahmed', last_name: 'Zaki', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
                        { id: 'r2', rating: 4, comment: 'Great quality and fast delivery. Very professional service.', first_name: 'Mariam', last_name: 'Gaber', created_at: new Date(Date.now() - 86400000 * 5).toISOString(), vendor_reply: 'Thank you Mariam! We are delighted that you had a wonderful experience.' },
                        { id: 'r3', rating: 5, comment: 'Super durable and holds up great. Worth every single EGP.', first_name: 'Tarek', last_name: 'Nour', created_at: new Date(Date.now() - 86400000 * 10).toISOString() }
                    ]);
                }

                // 3. Fetch all products to construct "Similar Products"
                const allRes = await axios.get(`${API_BASE}/public/products`).catch(() => null);
                if (allRes && allRes.data && allRes.data.products) {
                    const mappedLive = allRes.data.products.map(p => ({
                        ...p,
                        base_price: Number(p.base_price),
                        rating: p.rating ? Number(p.rating) : 4.8,
                        reviews: p.reviews ? Number(p.reviews) : 45
                    }));
                    setAllProducts([...mappedLive, ...MOCK_PRODUCTS.filter(p => p.category === 'subscriptions')]);
                } else {
                    setAllProducts(MOCK_PRODUCTS);
                }

            } catch (err) {
                console.error('Failed to load product details page:', err);
                toast.error('Error loading product details');
            } finally {
                setLoading(false);
            }
        };

        fetchProductData();
    }, [id, navigate]);

    // Filter similar products
    const similarProducts = useMemo(() => {
        if (!product) return [];
        return allProducts
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, 4);
    }, [allProducts, product]);

    // Review statistics calculations
    const stats = useMemo(() => {
        if (reviews.length === 0) {
            return { average: 5.0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
        }
        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (dist[r.rating] !== undefined) dist[r.rating] += 1;
        });

        // Convert distribution to percentages
        const distPercentages = {};
        for (let star = 5; star >= 1; star--) {
            distPercentages[star] = Math.round((dist[star] / total) * 100);
        }

        return {
            average: (sum / total).toFixed(1),
            total,
            distribution: distPercentages
        };
    }, [reviews]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            toast.error('Please login to write a review');
            navigate('/login');
            return;
        }
        if (!newComment.trim()) {
            toast.error('Please enter your review feedback text.');
            return;
        }

        setSubmittingReview(true);
        try {
            const res = await axios.post(`${API_BASE}/public/products/${product.id}/reviews`, {
                rating: newRating,
                comment: newComment
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Your feedback has been published successfully!');
            setReviews(prev => [res.data.review, ...prev]);
            setNewComment('');
            setNewRating(5);

            // Fetch product again to update aggregate rating in layout
            const productReload = await axios.get(`${API_BASE}/public/products/${product.id}`).catch(() => null);
            if (productReload && productReload.data && productReload.data.product) {
                setProduct(prev => ({
                    ...prev,
                    rating: Number(productReload.data.product.rating),
                    reviews: Number(productReload.data.product.reviews)
                }));
            }
        } catch (err) {
            console.error('Error submitting review:', err);
            toast.error(err.response?.data?.error || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold text-sm">Loading Premium Product Details...</p>
                </div>
            </div>
        );
    }

    if (!product) return null;

    return (
        <div className="bg-[#f7faf9] min-h-screen pb-20">
            <SEO 
                title={`${product.title} - PetPulse Premium`}
                description={product.description}
                keywords={`pet pulse, petpulse, ${product.title}, ${product.category} egypt`}
            />

            {/* Breadcrumbs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
                <nav className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white/70 backdrop-blur-md py-4 px-6 rounded-2xl border border-slate-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.02)] mb-8 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <Link to="/" className="hover:text-blue-600 hover:-translate-y-0.5 transition-all flex items-center gap-1 text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">home</span>
                        Home
                    </Link>
                    <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
                    <Link to="/marketplace" className="hover:text-blue-600 hover:-translate-y-0.5 transition-all text-slate-500">Marketplace</Link>
                    <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
                    <span className="text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-lg text-[10px]">{product.category}</span>
                    <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
                    <span className="text-blue-600 truncate max-w-[220px] font-extrabold tracking-normal normal-case">{product.title}</span>
                </nav>
            </div>

            {/* Main Product View */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col lg:flex-row gap-8 lg:gap-12 p-6 sm:p-10 mb-12">
                    
                    {/* Left Column: Image Viewport */}
                    <div className="w-full lg:w-1/2 flex flex-col gap-4">
                        <div className="relative aspect-square overflow-hidden bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center group">
                            <img 
                                src={product.image} 
                                alt={product.title} 
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/600x600?text=Product+Image'; e.target.onerror = null; }}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                            />
                            {/* Promo Badge */}
                            {product.badge && (
                                <span className={`absolute top-4 left-4 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md uppercase tracking-wider ${BADGE_COLORS[product.badge] || 'bg-slate-600 text-white'}`}>
                                    {product.badge}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Attributes & Purchase actions */}
                    <div className="w-full lg:w-1/2 flex flex-col justify-between py-2">
                        <div>
                            {/* Vendor Brand Card */}
                            <div className="mb-5 flex items-center gap-2">
                                {product.shop_name ? (
                                    <Link 
                                        to={`/marketplace?shop=${encodeURIComponent(product.shop_name)}`}
                                        className="group flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100/80 hover:border-emerald-300 hover:shadow-[0_4px_12px_rgba(16,185,129,0.12)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all px-3 py-1.5 rounded-xl font-extrabold text-[11px] uppercase tracking-wider shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[16px] text-emerald-600 transition-transform group-hover:rotate-6">storefront</span>
                                        <span>{product.shop_name}</span>
                                        <span className="material-symbols-outlined text-[12px] opacity-70 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 px-3 py-1.5 rounded-xl font-extrabold text-[11px] uppercase tracking-wider shadow-sm">
                                        <span className="material-symbols-outlined text-[16px] text-blue-600">verified</span>
                                        <span>PetPulse Official</span>
                                    </div>
                                )}
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 leading-tight font-display tracking-tight">{product.title}</h1>
                            
                            {/* Aggregate ratings block */}
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                                <StarRating rating={product.rating} size="text-[18px]" />
                                <span className="text-slate-300">|</span>
                                <a href="#feedbacks" className="text-xs font-bold text-blue-600 hover:underline">{product.reviews} Customer Feedbacks</a>
                            </div>

                            <p className="text-slate-600 leading-relaxed text-sm sm:text-base mb-8">{product.description}</p>
                            
                            {/* Stock Badge */}
                            <div className="mb-8">
                                {product.quantity !== undefined ? (
                                    product.quantity > 0 ? (
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-full text-xs font-extrabold tracking-wide shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            {product.quantity} In Stock & Ready to Ship
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-700 border border-rose-500/20 rounded-full text-xs font-extrabold tracking-wide shadow-[0_2px_10px_rgba(244,63,94,0.05)]">
                                            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                            Sold Out / Out of Stock
                                        </span>
                                    )
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 rounded-full text-xs font-extrabold tracking-wide shadow-[0_2px_10px_rgba(99,102,241,0.05)]">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                        </span>
                                        Available in Stock
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            {/* Price Card & Quantity Picker */}
                            <div className="flex items-center justify-between gap-6 bg-slate-50/60 p-6 rounded-2xl border border-slate-200/50 shadow-inner mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Price</span>
                                    <span className="font-black text-slate-900 text-3xl tracking-tight">{(product.base_price * quantity).toLocaleString()} <span className="text-sm font-extrabold text-slate-500">EGP</span></span>
                                </div>

                                {/* Qty Counter Selector */}
                                <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                                    <button 
                                        type="button"
                                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                        className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-600 font-extrabold text-lg flex items-center justify-center active:scale-90 transition-all duration-200"
                                    >
                                        -
                                    </button>
                                    <span className="w-12 text-center font-extrabold text-slate-800 text-base select-none">{quantity}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setQuantity(prev => product.quantity !== undefined ? Math.min(product.quantity, prev + 1) : prev + 1)}
                                        className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-600 font-extrabold text-lg flex items-center justify-center active:scale-90 transition-all duration-200"
                                        disabled={product.quantity !== undefined && product.quantity <= quantity}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Purchase button */}
                            <button 
                                onClick={() => addToCart(product, quantity)}
                                disabled={product.quantity !== undefined && product.quantity === 0}
                                className="group relative w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 disabled:from-slate-200 disabled:via-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-2xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.55)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-3 text-base overflow-hidden"
                            >
                                <span className="material-symbols-outlined text-[22px] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">add_shopping_cart</span>
                                <span>Add {quantity} Item{quantity !== 1 ? 's' : ''} to Cart</span>
                            </button>
                        </div>

                    </div>
                </div>

                {/* Feedbacks and Reviews Section */}
                <section id="feedbacks" className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 sm:p-10 mb-12 scroll-mt-6">
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-8 flex items-center gap-2 font-display">
                        <span className="material-symbols-outlined text-blue-600">reviews</span> Customer Feedbacks
                    </h2>

                    <div className="flex flex-col xl:flex-row gap-10">
                        {/* Left: Ratings distribution chart */}
                        <div className="w-full xl:w-1/3 flex flex-col gap-6 bg-slate-50/50 p-6 sm:p-8 rounded-2xl border border-slate-100 h-fit">
                            <div className="text-center">
                                <span className="text-5xl font-black text-slate-800 leading-none tracking-tight">{stats.average}</span>
                                <span className="text-slate-400 text-lg font-bold">/5</span>
                                <div className="flex justify-center mt-3 mb-1">
                                    <StarRating rating={Number(stats.average)} size="text-[20px]" />
                                </div>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stats.total} verified reviews</span>
                            </div>

                            {/* Progress Bars for ratings breakdown */}
                            <div className="space-y-3 pt-6 border-t border-slate-100">
                                {[5, 4, 3, 2, 1].map(star => (
                                    <div key={star} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-500 w-3 text-right">{star}</span>
                                        <span className="material-symbols-outlined text-[14px] text-amber-400">star</span>
                                        <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                                                style={{ width: `${stats.distribution[star]}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 w-8 text-right">{stats.distribution[star]}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Reviews Feed & Submission Form */}
                        <div className="flex-1 flex flex-col gap-8">
                            
                            {/* Submit Review Card */}
                            <div className="bg-slate-50/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all hover:border-slate-300/80">
                                <h3 className="font-extrabold text-slate-800 mb-1 text-base">Write your review</h3>
                                <p className="text-xs text-slate-400 mb-6 font-medium">Help other pet owners by sharing your personal experience.</p>
                                
                                <form onSubmit={handleReviewSubmit} className="space-y-5">
                                    {/* Star Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Your Rating</label>
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setNewRating(star)}
                                                    className="focus:outline-none transition-all duration-200 hover:scale-120 active:scale-90"
                                                >
                                                    <span 
                                                        className={`material-symbols-outlined text-[30px] transition-colors duration-200 ${
                                                            star <= (hoverRating || newRating) 
                                                                ? 'text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]' 
                                                                : 'text-slate-200'
                                                        }`}
                                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                                    >
                                                        star
                                                    </span>
                                                </button>
                                            ))}
                                            <span className="text-xs font-extrabold text-slate-500 ml-2 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                                                {hoverRating || newRating} Star{ (hoverRating || newRating) !== 1 ? 's' : '' }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Comment textbox */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Feedback Details</label>
                                        <textarea 
                                            rows="4"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="What did your pet think? Share details on quality, taste, shipping, or durability..."
                                            className="w-full px-4 py-3 bg-white border border-slate-200/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-2xl outline-none text-sm font-medium placeholder-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] transition-all duration-200"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submittingReview}
                                        className="py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-300 disabled:to-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-2"
                                    >
                                        {submittingReview ? 'Submitting...' : 'Submit Feedback'}
                                        {!submittingReview && <span className="material-symbols-outlined text-[16px]">send</span>}
                                    </button>
                                </form>
                            </div>

                            {/* Reviews list */}
                            <div className="space-y-6">
                                {reviews.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50/30 rounded-2xl border border-slate-100/50">
                                        <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">forum</span>
                                        <p className="font-semibold text-sm">No reviews yet. Be the first to review this product!</p>
                                    </div>
                                ) : (
                                    reviews.map(item => (
                                        <div key={item.id} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.01)] flex flex-col gap-4">
                                            
                                            {/* Review Author, Stars and Date */}
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center overflow-hidden font-bold text-sm">
                                                        {item.profile_pic_url ? (
                                                            <img src={item.profile_pic_url} className="w-full h-full object-cover" alt={item.first_name} />
                                                        ) : (
                                                            <span>{item.first_name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm leading-none mb-1">{item.first_name} {item.last_name || 'Guest'}</h4>
                                                        <StarRating rating={item.rating} size="text-[12px]" />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {new Date(item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>

                                            {/* Comment */}
                                            <p className="text-slate-600 text-sm leading-relaxed pl-13">{item.comment}</p>

                                            {/* Helpfulness controls */}
                                            <div className="flex items-center gap-4 pl-13 text-xs font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50">
                                                <button onClick={() => toast.success('Marked as helpful!')} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">thumb_up</span> Helpful
                                                </button>
                                                <span className="text-slate-200">|</span>
                                                <button onClick={() => toast.success('Report submitted successfully')} className="hover:text-red-500 flex items-center gap-1 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">flag</span> Report
                                                </button>
                                            </div>

                                            {/* Vendor Reply */}
                                            {item.vendor_reply && (
                                                <div className="ml-13 p-4 bg-emerald-50/50 border border-emerald-100/60 rounded-xl flex gap-3 mt-2">
                                                    <span className="material-symbols-outlined text-emerald-600 text-[18px] flex-shrink-0 mt-0.5">chat_bubble</span>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span className="text-xs font-extrabold text-emerald-800 leading-none">Seller Response</span>
                                                            <span className="py-0.5 px-1.5 bg-emerald-600 text-white rounded text-[8px] font-bold uppercase tracking-wider">Verified Shop</span>
                                                        </div>
                                                        <p className="text-xs text-emerald-700 leading-relaxed font-medium">{item.vendor_reply}</p>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    ))
                                )}
                            </div>

                        </div>
                    </div>
                </section>

                {/* Similar Products Recommendation Carousel */}
                {similarProducts.length > 0 && (
                    <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-6 sm:p-10">
                        <h2 className="text-2xl font-extrabold text-slate-900 mb-8 flex items-center gap-2 font-display">
                            <span className="material-symbols-outlined text-blue-600">explore</span> Browse Similar Products
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {similarProducts.map(item => (
                                <Link 
                                    to={`/marketplace/product/${item.id}`}
                                    key={item.id} 
                                    className="bg-[#f7faf9]/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-slate-100 flex flex-col group transition-all duration-300"
                                >
                                    <div className="relative h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                                        <img 
                                            src={item.image} 
                                            alt={item.title} 
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Product+Image'; e.target.onerror = null; }}
                                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                                        />
                                        {item.badge && <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE_COLORS[item.badge] || 'bg-slate-600 text-white'}`}>{item.badge}</span>}
                                    </div>
                                    <div className="p-4 flex flex-col flex-1 bg-white">
                                        <h3 className="font-bold text-slate-800 text-sm mb-1 leading-snug line-clamp-2">{item.title}</h3>
                                        <div className="mt-auto pt-2 flex items-center justify-between">
                                            <span className="font-extrabold text-blue-600 text-sm">{item.base_price.toLocaleString()} <span className="text-[10px]">EGP</span></span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-0.5 group-hover:text-blue-600 transition-colors">
                                                View <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

            </main>
        </div>
    );
};

export default ProductDetails;
