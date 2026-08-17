import React, { useState, useEffect } from 'react';
import VendorOrdersPanel from '../components/VendorOrdersPanel';
import BulkProductImport from '../components/BulkProductImport';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const VendorDashboard = () => {
    const navigate = useNavigate();
    const { token, user, setUser } = useAuth();
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [monthlyOrders, setMonthlyOrders] = useState(0);
    const [estEarnings, setEstEarnings] = useState(0);
    const [activeTab, setActiveTab] = useState('analytics'); // analytics | products | add-product | bulk-import | orders | settings | reviews | ads
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [replyText, setReplyText] = useState({});

    // Ad campaigns states
    const [ads, setAds] = useState([]);
    const [showAdModal, setShowAdModal] = useState(false);
    const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
    const [payingAd, setPayingAd] = useState(null);
    const [adForm, setAdForm] = useState({
        title: '',
        image_url: '',
        target_url: '',
        placement: 'home',
        duration: '1_week',
        price: 500
    });
    const [paymentForm, setPaymentForm] = useState({
        cardNumber: '',
        expiry: '',
        cvc: '',
        name: ''
    });

    // Shop editing state
    const [shopForm, setShopForm] = useState({
        name: '',
        category: 'Food',
        address: '',
        image: '',
        tax_id: ''
    });

    // Product adding/editing state
    const [productForm, setProductForm] = useState({
        title: '',
        category: 'Food',
        base_price: '',
        description: '',
        image: '',
        badge: '',
        quantity: 10
    });

    const [uploadingShopImage, setUploadingShopImage] = useState(false);
    const [uploadingProductImage, setUploadingProductImage] = useState(false);
    const [uploadingAdImage, setUploadingAdImage] = useState(false);

    const handleImageUpload = async (e, targetType) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large! Maximum limit is 5MB.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Please upload a valid image file (PNG, JPG, WEBP, etc.)");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'PetPluse');

        let folder = 'petpulse/general';
        if (targetType === 'shop') {
            folder = 'petpulse/shops';
            setUploadingShopImage(true);
        } else if (targetType === 'product') {
            folder = 'petpulse/products';
            setUploadingProductImage(true);
        } else if (targetType === 'ad') {
            folder = 'petpulse/ads';
            setUploadingAdImage(true);
        }
        formData.append('folder', folder);

        const toastId = toast.loading(`Uploading to ${folder}...`);

        try {
            const headers = { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            };
            const res = await axios.post(`${API_BASE}/upload/cloudinary`, formData, { headers });
            if (res.data?.secure_url) {
                const secureUrl = res.data.secure_url;
                if (targetType === 'shop') {
                    setShopForm(prev => ({ ...prev, image: secureUrl }));
                } else if (targetType === 'product') {
                    setProductForm(prev => ({ ...prev, image: secureUrl }));
                } else if (targetType === 'ad') {
                    setAdForm(prev => ({ ...prev, image_url: secureUrl }));
                }
                toast.success("Image uploaded successfully!", { id: toastId });
            } else {
                throw new Error("Invalid response");
            }
        } catch (error) {
            console.error("Direct upload failure:", error);
            toast.error(error.response?.data?.error || "Failed to upload image. Please try again or use a manual URL.", { id: toastId });
        } finally {
            if (targetType === 'shop') setUploadingShopImage(false);
            else if (targetType === 'product') setUploadingProductImage(false);
            else if (targetType === 'ad') setUploadingAdImage(false);
        }
    };

    const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

    const fetchShopAndProducts = async () => {
        try {
            const shopRes = await axios.get(`${API_BASE}/vendor/shop`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (shopRes.data.shop) {
                setShop(shopRes.data.shop);
                setShopForm({
                    name: shopRes.data.shop.name || '',
                    category: shopRes.data.shop.category || 'Food',
                    address: shopRes.data.shop.address || '',
                    image: shopRes.data.shop.image || '',
                    tax_id: shopRes.data.shop.tax_id || ''
                });

                // Fetch products only if shop exists
                const prodRes = await axios.get(`${API_BASE}/vendor/products`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProducts(prodRes.data.products || []);

                // Fetch ad campaigns
                const adsRes = await axios.get(`${API_BASE}/vendor/ads`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAds(adsRes.data.ads || []);

                // Fetch real reviews
                try {
                    const reviewsRes = await axios.get(`${API_BASE}/vendor/reviews`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setReviews(reviewsRes.data.reviews || []);
                } catch (reviewsErr) {
                    console.error("Failed to load vendor reviews", reviewsErr);
                }

                // Fetch stats (like monthly orders and earnings)
                try {
                    const statsRes = await axios.get(`${API_BASE}/vendor/stats`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (statsRes.data?.stats) {
                        setMonthlyOrders(statsRes.data.stats.monthlyOrders || 0);
                        setEstEarnings(statsRes.data.stats.estEarnings || 0);
                    }
                } catch (statsErr) {
                    console.error("Failed to load vendor stats", statsErr);
                }
            }
        } catch (error) {
            console.error("Failed to load vendor data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchShopAndProducts();
        }
    }, [token]);

    useEffect(() => {
        if (user && user.role !== 'vendor') {
            toast.error("Access denied: Vendor account required.");
            navigate('/');
        }
    }, [user, navigate]);

    const handleShopChange = (e) => {
        setShopForm({ ...shopForm, [e.target.name]: e.target.value });
    };

    const handleProductChange = (e) => {
        setProductForm({ ...productForm, [e.target.name]: e.target.value });
    };

    const handleShopSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await axios.put(`${API_BASE}/vendor/shop`, shopForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShop(res.data.shop);
            
            // Refresh global auth user state if needed
            const meRes = await axios.get(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (meRes.data?.user) setUser(meRes.data.user);

            toast.success('Shop details updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update shop details');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/vendor/products`, productForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Product published successfully!');
            setProducts([res.data.product, ...products]);
            setProductForm({ title: '', category: 'Food', base_price: '', description: '', image: '', badge: '', quantity: 10 });
            setActiveTab('products');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add product');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditClick = (product) => {
        setEditingProduct(product);
        setProductForm({
            title: product.title || '',
            category: product.category || 'Food',
            base_price: product.base_price || '',
            description: product.description || '',
            image: product.image || '',
            badge: product.badge || '',
            quantity: product.quantity !== undefined ? product.quantity : 10
        });
        setActiveTab('add-product'); // Reuse product form tab for edit
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await axios.put(`${API_BASE}/vendor/products/${editingProduct.id}`, productForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Product updated successfully!');
            setProducts(products.map(p => p.id === editingProduct.id ? res.data.product : p));
            setEditingProduct(null);
            setProductForm({ title: '', category: 'Food', base_price: '', description: '', image: '', badge: '', quantity: 10 });
            setActiveTab('products');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update product');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product from the marketplace?')) return;
        try {
            await axios.delete(`${API_BASE}/vendor/products/${productId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Product removed successfully!');
            setProducts(products.filter(p => p.id !== productId));
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const handleReplyReview = async (reviewId) => {
        const text = replyText[reviewId];
        if (!text || !text.trim()) return;

        try {
            await axios.post(`${API_BASE}/vendor/reviews/${reviewId}/reply`, { reply: text }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviews(reviews.map(r => r.id === reviewId ? { ...r, vendor_reply: text } : r));
            setReplyText({ ...replyText, [reviewId]: '' });
            toast.success('Reply submitted successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit reply');
        }
    };

    const handleAdDurationChange = (duration) => {
        let price = 500;
        if (duration === '1_month') price = 1500;
        if (duration === '3_months') price = 4000;
        setAdForm({ ...adForm, duration, price });
    };

    const handleAdSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/vendor/ads`, adForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Ad campaign request submitted successfully!');
            setAds([res.data.ad, ...ads]);
            setShowAdModal(false);
            setAdForm({
                title: '',
                image_url: '',
                target_url: '',
                placement: 'home',
                duration: '1_week',
                price: 500
            });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit ad request');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenPayment = (ad) => {
        setPayingAd(ad);
        setPaymentForm({ cardNumber: '', expiry: '', cvc: '', name: '' });
        setShowPaymentDrawer(true);
    };

    const handleSimulatedPayment = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await axios.put(`${API_BASE}/vendor/ads/${payingAd.id}/pay`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Simulated payment processed successfully! Your ad is now active.');
            setAds(ads.map(a => a.id === payingAd.id ? res.data.ad : a));
            setShowPaymentDrawer(false);
            setPayingAd(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to process simulated payment');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">refresh</span>
                    <span className="text-slate-500 font-bold text-sm">Loading your store control board...</span>
                </div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="max-w-xl w-full bg-white rounded-[32px] border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] p-6 sm:p-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"></div>
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                            <span className="material-symbols-outlined text-3xl">storefront</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Your Pet Shop</h2>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                            Initialize your virtual storefront to start listing premium food, toys, and accessories in the PetPluse marketplace.
                        </p>
                    </div>

                    <form onSubmit={handleShopSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Shop Name *</label>
                            <input 
                                required 
                                name="name" 
                                value={shopForm.name} 
                                onChange={handleShopChange} 
                                type="text" 
                                placeholder="e.g. Cairo Feline & Canine Superstore"
                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Shop Category *</label>
                                <select 
                                    name="category" 
                                    value={shopForm.category} 
                                    onChange={handleShopChange} 
                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all animate-fade-in"
                                >
                                    <option value="Food">Food</option>
                                    <option value="Toys">Toys</option>
                                    <option value="Accessories">Accessories</option>
                                    <option value="Grooming">Grooming</option>
                                    <option value="Health">Health</option>
                                    <option value="All-in-One">All-in-One</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tax Registration ID</label>
                                <input 
                                    name="tax_id" 
                                    value={shopForm.tax_id} 
                                    onChange={handleShopChange} 
                                    type="text" 
                                    placeholder="e.g. TAX-123456"
                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Facility Address *</label>
                            <input 
                                required 
                                name="address" 
                                value={shopForm.address} 
                                onChange={handleShopChange} 
                                type="text" 
                                placeholder="e.g. 15 El Nasr Rd, Maadi, Cairo"
                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Cover / Logo Image</label>
                            
                            {shopForm.image && (
                                <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                                    <img 
                                        src={shopForm.image} 
                                        alt="Shop Cover Preview" 
                                        className="w-full h-full object-cover" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShopForm(prev => ({ ...prev, image: '' }))}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-sm"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative shrink-0">
                                    <input 
                                        id="establishShopImageFileInput" 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => handleImageUpload(e, 'shop')} 
                                    />
                                    <button 
                                        type="button"
                                        disabled={uploadingShopImage}
                                        onClick={() => document.getElementById('establishShopImageFileInput').click()}
                                        className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-[0.98] disabled:opacity-60"
                                    >
                                        {uploadingShopImage ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px] text-blue-600">cloud_upload</span>
                                                Upload Cover/Logo
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="relative flex-1">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">link</span>
                                    <input 
                                        name="image" 
                                        value={shopForm.image} 
                                        onChange={handleShopChange} 
                                        type="text" 
                                        placeholder="Or paste custom image link directly..."
                                        className="w-full pl-10 pr-4 py-3.5 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={actionLoading}
                            className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-[0_8px_25px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">save</span>
                            {actionLoading ? 'Creating Storefront...' : 'Establish Shop Profile'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Analytics dynamic stats
    const totalProductsCount = products.length;
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0';
    const totalSalesEstimate = products.reduce((sum, p) => sum + Number(p.base_price || 0) * 12, 0); // Simulated baseline sales

    return (
        <div className="min-h-screen bg-[#f8fafc] pt-4 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* ── Shop Status Banners ── */}
                {shop.status === 'pending' && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 mb-6 backdrop-blur-md">
                        <span className="material-symbols-outlined text-amber-600 shrink-0">pending_actions</span>
                        <div>
                            <h4 className="font-extrabold text-amber-900 text-sm">Awaiting Shop Approval</h4>
                            <p className="text-amber-700 text-xs mt-0.5 font-semibold">
                                Your shop details are currently pending administrator review. You can populate your catalog and adjust settings below, but products will go live once verified.
                            </p>
                        </div>
                    </div>
                )}

                {shop.status === 'rejected' && (
                    <div className="bg-gradient-to-r from-rose-500/10 to-red-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 mb-6 backdrop-blur-md">
                        <span className="material-symbols-outlined text-rose-600 shrink-0">dangerous</span>
                        <div>
                            <h4 className="font-extrabold text-rose-900 text-sm">Verification Rejected</h4>
                            <p className="text-rose-700 text-xs mt-0.5 font-semibold">
                                Verification for "{shop.name}" was rejected. Please review your address details, verify your business credentials, or contact administrative support.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Shop Header ── */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div 
                            onClick={() => window.open(`/marketplace?shop=${encodeURIComponent(shop.name)}`, '_blank')}
                            className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0 overflow-hidden cursor-pointer hover:bg-blue-100 hover:scale-[1.03] transition-all duration-300 shadow-sm"
                            title="View Live Storefront"
                        >
                            {shop.image ? (
                                <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-4xl">storefront</span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 
                                    onClick={() => window.open(`/marketplace?shop=${encodeURIComponent(shop.name)}`, '_blank')}
                                    className="text-2xl font-extrabold text-slate-900 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                                    title="View Live Storefront"
                                >
                                    {shop.name}
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    shop.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                    shop.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                    {shop.status}
                                </span>
                            </div>
                            <p className="text-slate-500 font-medium mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-blue-500">location_on</span>
                                {shop.address || 'Address not registered yet'}
                            </p>
                        </div>
                    </div>

                    {/* Shop details */}
                    <div className="flex flex-wrap gap-2.5 items-center">
                        <button
                            type="button"
                            onClick={() => window.open(`/marketplace?shop=${encodeURIComponent(shop.name)}`, '_blank')}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 text-xs mr-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            View Live Shop
                        </button>
                        <div className="bg-slate-50 px-4 py-2.5 rounded-xl text-center border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Category</span>
                            <span className="text-xs font-extrabold text-slate-700">{shop.category || 'Retail'}</span>
                        </div>
                        <div className="bg-slate-50 px-4 py-2.5 rounded-xl text-center border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tax ID</span>
                            <span className="text-xs font-extrabold text-slate-700">{shop.tax_id || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* ── Quick Stats Grid ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Active Products</span>
                            <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">category</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{totalProductsCount}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">In your public catalog</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Monthly Orders</span>
                            <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{monthlyOrders}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Delivered this month</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Est. Earnings</span>
                            <span className="w-8 h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">payments</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{estEarnings} EGP</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Actual monthly earnings</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Store Rating</span>
                            <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">star</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{avgRating}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Based on customer feedback</p>
                    </div>
                </div>

                {/* ── Main Layout: Sidebar & Content ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Sidebar Menu */}
                    <div className="lg:col-span-3 space-y-2">
                        <button
                            onClick={() => { setEditingProduct(null); setActiveTab('analytics'); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'analytics'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">insights</span>
                            Business Analytics
                        </button>

                        <button
                            onClick={() => { setEditingProduct(null); setActiveTab('products'); }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'products'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <span className="material-symbols-outlined">inventory</span>
                                Product Catalog
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === 'products' ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {products.length}
                            </span>
                        </button>

                        <button
                            onClick={() => { setEditingProduct(null); setActiveTab('orders'); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'orders'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">receipt_long</span>
                            Orders &amp; Reports
                        </button>

                        <button
                            onClick={() => {
                                setEditingProduct(null);
                                setProductForm({ title: '', category: 'Food', base_price: '', description: '', image: '', badge: '' });
                                setActiveTab('add-product');
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'add-product'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </button>

                        <button
                            onClick={() => { setEditingProduct(null); setActiveTab('bulk-import'); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'bulk-import'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">upload_file</span>
                            Bulk Import
                        </button>

                        <button
                            onClick={() => { setEditingProduct(null); setActiveTab('reviews'); }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'reviews'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <span className="material-symbols-outlined">reviews</span>
                                Reviews Hub
                            </span>
                            {reviews.filter(r => !r.vendor_reply && !r.reply).length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white`}>
                                    {reviews.filter(r => !r.vendor_reply && !r.reply).length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => { setEditingProduct(null); setActiveTab('ads'); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'ads'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">campaign</span>
                            Ad Campaigns Workspace
                        </button>

                        <button
                            onClick={() => { setEditingProduct(null); setActiveTab('settings'); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'settings'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">settings</span>
                            Shop Profile Settings
                        </button>
                    </div>

                    {/* Right Content Area */}
                    <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">

                        {/* TAB: ORDERS & REPORTS */}
                        {activeTab === 'orders' && <VendorOrdersPanel />}

                        {/* TAB A: BUSINESS ANALYTICS */}
                        {activeTab === 'analytics' && (
                            <div className="p-6 sm:p-8">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Business & Activity Analytics</h2>
                                    <p className="text-slate-400 text-xs font-semibold mt-0.5">Visualize your shop views, order metrics, and monthly marketplace performance.</p>
                                </div>

                                <div className="space-y-8">
                                    {/* Quick Navigation Shelf */}
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-500 text-lg">explore</span>
                                            Vendor Unified Shortcuts
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
                                            {[
                                                { title: 'Community Feed', icon: 'forum', link: '/community', color: 'from-blue-500 to-indigo-600', text: 'Interact with pet owners' },
                                                { title: 'PulseBox Premium', icon: 'redeem', link: '/pulsebox', color: 'from-amber-500 to-orange-600', text: 'Manage subscription plans' },
                                                { title: 'Shop Profile', icon: 'storefront', onClick: () => setActiveTab('settings'), color: 'from-emerald-500 to-teal-600', text: 'Control your shop profile' },
                                            ].map((item, idx) => (
                                                item.onClick ? (
                                                    <button
                                                        key={idx}
                                                        onClick={item.onClick}
                                                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer outline-none w-full"
                                                    >
                                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center mb-4 shadow-md shadow-slate-100 group-hover:scale-110 transition-transform duration-300`}>
                                                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                                        </div>
                                                        <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{item.title}</h4>
                                                        <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">{item.text}</p>
                                                    </button>
                                                ) : (
                                                    <Link
                                                        key={idx}
                                                        to={item.link}
                                                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer w-full"
                                                    >
                                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center mb-4 shadow-md shadow-slate-100 group-hover:scale-110 transition-transform duration-300`}>
                                                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                                        </div>
                                                        <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{item.title}</h4>
                                                        <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">{item.text}</p>
                                                    </Link>
                                                )
                                            ))}
                                        </div>
                                    </div>

                                    {/* Monthly Sales Graph */}
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="font-extrabold text-slate-800 text-sm">Monthly Store Volume</h3>
                                                <p className="text-[11px] text-slate-500 font-medium">Estimated marketplace views & clicks</p>
                                            </div>
                                            <span className="px-2.5 py-1 bg-white border border-slate-100 rounded-lg text-xs font-extrabold text-slate-600 flex items-center gap-1 shadow-sm">
                                                <span className="w-2 h-2 rounded-full bg-blue-600"></span> 2026 Sales
                                            </span>
                                        </div>

                                        {/* Beautiful SVG Sales Line Chart */}
                                        <div className="relative h-48 w-full flex items-end">
                                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                            </div>

                                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="vendorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M 0 100 Q 125 30 250 80 T 500 20 L 500 120 L 0 120 Z" fill="url(#vendorGrad)" />
                                                <path d="M 0 100 Q 125 30 250 80 T 500 20" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />
                                                
                                                <circle cx="250" cy="80" r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                                                <circle cx="500" cy="20" r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                                            </svg>

                                            <div className="absolute -bottom-6 w-full flex justify-between px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                                                <span>Jan</span>
                                                <span>Feb</span>
                                                <span>Mar</span>
                                                <span>Apr</span>
                                                <span>May</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdown of Store stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                        <div className="p-5 border border-slate-100 rounded-2xl bg-[#fafbfd]">
                                            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4">Store Conversion Rate</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                                                        <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - 0.72)} />
                                                    </svg>
                                                    <span className="absolute text-xs font-black text-slate-800">7.2%</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">High checkout fidelity</p>
                                                    <p className="text-xs text-slate-400 font-semibold mt-1">7.2% of users who visited your store profile added products to cart and purchased.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 border border-slate-100 rounded-2xl bg-[#fafbfd]">
                                            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4">Seller Status & Reputation</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex flex-col justify-center items-center shrink-0 border border-blue-100">
                                                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Verified Retail Vendor</p>
                                                    <p className="text-xs text-slate-400 font-semibold mt-1">Authorized seller of small animal care items, grooming gear, and organic pet food.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB B: PRODUCT CATALOG GRID */}
                        {activeTab === 'products' && (
                            <div className="p-6 sm:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Manage Your Products</h2>
                                        <p className="text-slate-400 text-xs font-semibold mt-0.5">Edit, view, and remove your listed items in the PetPluse marketplace.</p>
                                    </div>
                                    <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl text-slate-500 font-bold">
                                        Total: {products.length}
                                    </span>
                                </div>

                                {products.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">storefront</span>
                                        <h4 className="font-bold text-slate-700">No products listed yet</h4>
                                        <p className="text-slate-400 text-xs mt-1">Add items to your catalog to display them in the marketplace.</p>
                                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                            <button
                                                onClick={() => setActiveTab('add-product')}
                                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-sm hover:bg-blue-700 transition-all"
                                            >
                                                Add Your First Product
                                            </button>
                                            {/* A shop with a real catalogue should not have to type it in one
                                                product at a time — surface the import where the emptiness is felt. */}
                                            <button
                                                onClick={() => setActiveTab('bulk-import')}
                                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all"
                                            >
                                                Or import a spreadsheet
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {products.map((prod) => (
                                            <div key={prod.id} className="p-4 border border-slate-100 rounded-2xl bg-[#fafbfd] flex items-center gap-4 relative group hover:shadow-md transition-all">
                                                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200/50">
                                                    {prod.image ? (
                                                        <img src={prod.image} alt={prod.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                            <span className="material-symbols-outlined">image</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded-md">
                                                            {prod.category}
                                                        </span>
                                                        {prod.badge && (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider rounded-md">
                                                                {prod.badge}
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                                                            (prod.quantity !== undefined ? prod.quantity : 10) <= 0 ? 'bg-rose-100 text-rose-800' :
                                                            (prod.quantity !== undefined ? prod.quantity : 10) <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'
                                                        }`}>
                                                            {(prod.quantity !== undefined ? prod.quantity : 10) <= 0 ? 'Out of Stock' : `${prod.quantity !== undefined ? prod.quantity : 10} In Stock`}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-sm truncate">{prod.title}</h4>
                                                    <p className="text-slate-500 font-extrabold text-xs mt-1">{prod.base_price} EGP</p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col gap-1.5 shrink-0">
                                                    <button 
                                                        onClick={() => handleEditClick(prod)}
                                                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                                        title="Edit details"
                                                    >
                                                        <span className="material-symbols-outlined text-sm flex">edit</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteProduct(prod.id)}
                                                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                                                        title="Delete product"
                                                    >
                                                        <span className="material-symbols-outlined text-sm flex">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB C: ADD OR EDIT PRODUCT */}
                        {activeTab === 'add-product' && (
                            <div className="p-6 sm:p-8">
                                <div className="mb-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">
                                            {editingProduct ? 'Edit Product Details' : 'Add New Product'}
                                        </h2>
                                        <p className="text-slate-400 text-xs font-semibold mt-0.5">
                                            {editingProduct ? 'Adjust listing pricing, categories, and inventory badges.' : 'List a new item in the PetPluse marketplace catalog.'}
                                        </p>
                                    </div>
                                    {editingProduct && (
                                        <button 
                                            onClick={() => {
                                                setEditingProduct(null);
                                                setProductForm({ title: '', category: 'Food', base_price: '', description: '', image: '', badge: '' });
                                                setActiveTab('products');
                                            }}
                                            className="text-xs text-rose-500 font-bold hover:underline"
                                        >
                                            Cancel Editing
                                        </button>
                                    )}
                                </div>

                                {shop.status !== 'approved' ? (
                                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 text-center">
                                        <span className="material-symbols-outlined text-amber-600 text-4xl mb-2">pending_actions</span>
                                        <h3 className="text-sm font-bold text-amber-900">Application Pending Approval</h3>
                                        <p className="text-amber-700 text-xs mt-1">You will be able to post and publish items once your shop profile gets approved by administrators.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Product Title *</label>
                                            <input 
                                                required 
                                                name="title" 
                                                value={productForm.title} 
                                                onChange={handleProductChange} 
                                                type="text" 
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                placeholder="e.g. Organic Puppy Kibble 2kg" 
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Category *</label>
                                                <select 
                                                    name="category" 
                                                    value={productForm.category} 
                                                    onChange={handleProductChange} 
                                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                                                >
                                                    {/* These four are exactly what the marketplace filters on.
                                                        "Grooming" and "Health" used to be offered here, but no
                                                        marketplace tab shows them, so those products were
                                                        unreachable by category. */}
                                                    <option value="Food">Food</option>
                                                    <option value="Toys">Toys</option>
                                                    <option value="Accessories">Accessories</option>
                                                    <option value="Wellness">Wellness</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Base Price (EGP) *</label>
                                                <input 
                                                    required 
                                                    name="base_price" 
                                                    value={productForm.base_price} 
                                                    onChange={handleProductChange} 
                                                    type="number" 
                                                    min="0" 
                                                    step="0.01" 
                                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                    placeholder="299.99" 
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Available Stock *</label>
                                                <input 
                                                    required 
                                                    name="quantity" 
                                                    value={productForm.quantity} 
                                                    onChange={handleProductChange} 
                                                    type="number" 
                                                    min="0" 
                                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                    placeholder="10" 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Description</label>
                                            <textarea 
                                                name="description" 
                                                value={productForm.description} 
                                                onChange={handleProductChange} 
                                                rows="3" 
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium transition-all resize-none" 
                                                placeholder="Details about product ingredients, specifications, sizes..."
                                            ></textarea>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Product Image *</label>
                                            
                                            {productForm.image && (
                                                <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                                                    <img 
                                                        src={productForm.image} 
                                                        alt="Product Preview" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setProductForm(prev => ({ ...prev, image: '' }))}
                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/60 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="relative shrink-0">
                                                    <input 
                                                        id="productImageFileInput" 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => handleImageUpload(e, 'product')} 
                                                    />
                                                    <button 
                                                        type="button"
                                                        disabled={uploadingProductImage}
                                                        onClick={() => document.getElementById('productImageFileInput').click()}
                                                        className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-[0.98] disabled:opacity-60"
                                                    >
                                                        {uploadingProductImage ? (
                                                            <>
                                                                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-[18px] text-blue-600">cloud_upload</span>
                                                                Upload Image
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="relative flex-1">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">link</span>
                                                    <input 
                                                        required={!productForm.image}
                                                        name="image" 
                                                        value={productForm.image} 
                                                        onChange={handleProductChange} 
                                                        type="text" 
                                                        placeholder="Or paste custom product image link..."
                                                        className="w-full pl-10 pr-4 py-3.5 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Sale Badge (Optional)</label>
                                            <input 
                                                name="badge" 
                                                value={productForm.badge} 
                                                onChange={handleProductChange} 
                                                type="text" 
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                placeholder="e.g. SALE, NEW, HOT" 
                                            />
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={actionLoading}
                                            className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">publish</span>
                                            {actionLoading ? 'Saving Product...' : editingProduct ? 'Save Product Details' : 'Publish Product to Marketplace'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* TAB C2: BULK IMPORT */}
                        {activeTab === 'bulk-import' && (
                            <div className="p-6 sm:p-8">
                                {shop.status !== 'approved' ? (
                                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 text-center">
                                        <span className="material-symbols-outlined text-amber-600 text-4xl mb-2">pending_actions</span>
                                        <h3 className="text-sm font-bold text-amber-900">Application Pending Approval</h3>
                                        <p className="text-amber-700 text-xs mt-1">You will be able to import your catalog once your shop profile gets approved by administrators.</p>
                                    </div>
                                ) : (
                                    <BulkProductImport
                                        apiBase={API_BASE}
                                        token={token}
                                        onImported={() => { fetchShopAndProducts(); setActiveTab('products'); }}
                                    />
                                )}
                            </div>
                        )}

                        {/* TAB D: REVIEWS CENTER */}
                        {activeTab === 'reviews' && (
                            <div className="p-6 sm:p-8">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Ratings & Customer Reviews</h2>
                                    <p className="text-slate-400 text-xs font-semibold mt-0.5">Engage directly with small animal owners by replying to store feedback.</p>
                                </div>

                                {reviews.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">reviews</span>
                                        <h4 className="font-bold text-slate-700">No customer feedback yet</h4>
                                        <p className="text-slate-400 text-xs mt-1">When customers review your products, they will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {reviews.map((rev) => {
                                            const hasReply = !!(rev.vendor_reply || rev.reply);
                                            return (
                                                <div key={rev.id} className="p-6 border border-slate-100 rounded-3xl bg-[#fafbfd] hover:shadow-md transition-all duration-300 space-y-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100 overflow-hidden font-black text-sm">
                                                                {rev.reviewer_avatar ? (
                                                                    <img src={rev.reviewer_avatar} alt={rev.reviewer} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{rev.reviewer ? rev.reviewer.charAt(0).toUpperCase() : 'C'}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-extrabold text-slate-800 text-sm">{rev.reviewer || 'Customer'}</h4>
                                                                <p className="text-[10px] text-slate-400 font-bold">{new Date(rev.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-100/50 px-2.5 py-1 rounded-xl w-max">
                                                            <span className="material-symbols-outlined text-amber-500 text-sm fill-amber-500">star</span>
                                                            <span className="text-xs font-black text-amber-700">{rev.rating}</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {rev.product_title && (
                                                            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400">
                                                                <span className="material-symbols-outlined text-[14px]">shopping_basket</span>
                                                                <span>Product: {rev.product_title}</span>
                                                            </div>
                                                        )}
                                                        <p className="text-slate-600 text-sm font-medium leading-relaxed italic">
                                                            "{rev.comment || 'No comment provided.'}"
                                                        </p>
                                                    </div>

                                                    {hasReply ? (
                                                        <div className="pl-4 border-l-2 border-blue-500 bg-blue-50/30 p-3.5 rounded-r-2xl space-y-1">
                                                            <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-[11px] uppercase tracking-wider">
                                                                <span className="material-symbols-outlined text-sm">reply</span>
                                                                <span>Merchant Reply</span>
                                                            </div>
                                                            <p className="text-slate-700 text-xs font-bold leading-relaxed">
                                                                {rev.vendor_reply || rev.reply}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="pt-2 flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Type your merchant reply..." 
                                                                value={replyText[rev.id] || ''} 
                                                                onChange={(e) => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                                                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-xs font-semibold transition-all" 
                                                            />
                                                            <button 
                                                                onClick={() => handleReplyReview(rev.id)}
                                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all active:scale-[0.98]"
                                                            >
                                                                Reply
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB E: SHOP PROFILE SETTINGS */}
                        {activeTab === 'settings' && (
                            <div className="p-6 sm:p-8">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Shop Settings</h2>
                                    <p className="text-slate-400 text-xs font-semibold mt-0.5">Customize your retail metadata, location coordinates, tax ID, and banner.</p>
                                </div>

                                <form onSubmit={handleShopSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Shop Name *</label>
                                            <input 
                                                required 
                                                name="name" 
                                                value={shopForm.name} 
                                                onChange={handleShopChange} 
                                                type="text" 
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Shop Category *</label>
                                            <select 
                                                name="category" 
                                                value={shopForm.category} 
                                                onChange={handleShopChange} 
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                                            >
                                                <option value="Food">Food</option>
                                                <option value="Toys">Toys</option>
                                                <option value="Accessories">Accessories</option>
                                                <option value="Grooming">Grooming</option>
                                                <option value="Health">Health</option>
                                                <option value="All-in-One">All-in-One</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Facility Address *</label>
                                        <input 
                                            required 
                                            name="address" 
                                            value={shopForm.address} 
                                            onChange={handleShopChange} 
                                            type="text" 
                                            className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Tax Registration ID</label>
                                            <input 
                                                name="tax_id" 
                                                value={shopForm.tax_id} 
                                                onChange={handleShopChange} 
                                                type="text" 
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                placeholder="e.g. TAX-987654"
                                            />
                                        </div>

                                        <div className="space-y-3 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Cover / Logo Image</label>
                                            
                                            {shopForm.image && (
                                                <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                                                    <img 
                                                        src={shopForm.image} 
                                                        alt="Shop Cover Preview" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShopForm(prev => ({ ...prev, image: '' }))}
                                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="relative shrink-0">
                                                    <input 
                                                        id="editShopImageFileInput" 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => handleImageUpload(e, 'shop')} 
                                                    />
                                                    <button 
                                                        type="button"
                                                        disabled={uploadingShopImage}
                                                        onClick={() => document.getElementById('editShopImageFileInput').click()}
                                                        className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-[0.98] disabled:opacity-60"
                                                    >
                                                        {uploadingShopImage ? (
                                                            <>
                                                                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-[18px] text-blue-600">cloud_upload</span>
                                                                Upload Cover/Logo
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="relative flex-1">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">link</span>
                                                    <input 
                                                        name="image" 
                                                        value={shopForm.image} 
                                                        onChange={handleShopChange} 
                                                        type="text" 
                                                        placeholder="Or paste custom image link directly..."
                                                        className="w-full pl-10 pr-4 py-3.5 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={actionLoading}
                                        className="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                        {actionLoading ? 'Saving changes...' : 'Save Shop Information'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* TAB F: AD CAMPAIGNS WORKSPACE */}
                        {activeTab === 'ads' && (
                            <div className="p-6 sm:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Paid Banner Campaigns</h2>
                                        <p className="text-slate-400 text-xs font-semibold mt-0.5">Submit premium banner ad requests to target pages like Home, Marketplace, and Community.</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowAdModal(true)}
                                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md hover:bg-blue-700 transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                        Request Ad Campaign
                                    </button>
                                </div>

                                {ads.length === 0 ? (
                                    <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">campaign</span>
                                        <h4 className="font-bold text-slate-700">No ad campaigns requested yet</h4>
                                        <p className="text-slate-400 text-xs mt-1">Submit your first promotion banner campaign to increase store exposure.</p>
                                        <button 
                                            onClick={() => setShowAdModal(true)}
                                            className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-sm hover:bg-blue-700 transition-all"
                                        >
                                            Request Your First Campaign
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                                    <th className="pb-3 pl-2">Campaign Title</th>
                                                    <th className="pb-3">Placement</th>
                                                    <th className="pb-3">Duration & Cost</th>
                                                    <th className="pb-3">Status</th>
                                                    <th className="pb-3 pr-2 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {ads.map((ad) => (
                                                    <tr key={ad.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-4 pl-2 font-bold text-slate-800">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-14 h-8 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200/50">
                                                                    {ad.image_url ? (
                                                                        <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                            <span className="material-symbols-outlined text-xs">image</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="truncate max-w-[160px]">
                                                                    <p className="font-bold text-slate-800 truncate leading-snug">{ad.title}</p>
                                                                    <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline truncate block max-w-[150px]">{ad.target_url}</a>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 font-semibold text-slate-600 capitalize">
                                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                                                {ad.placement}
                                                            </span>
                                                        </td>
                                                        <td className="py-4">
                                                            <p className="font-bold text-slate-700 text-xs capitalize">{ad.duration.replace('_', ' ')}</p>
                                                            <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">{ad.price} EGP</p>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="flex flex-col gap-1">
                                                                {/* Approval Status */}
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-max ${
                                                                    ad.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                                                    ad.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                                                }`}>
                                                                    {ad.status === 'approved' ? 'Approved' : ad.status === 'pending' ? 'Pending Review' : 'Rejected'}
                                                                </span>
                                                                {/* Payment Status */}
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-max ${
                                                                    ad.payment_status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {ad.payment_status === 'paid' ? 'Paid & Live' : 'Unpaid'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-right pr-2">
                                                            {ad.status === 'approved' && ad.payment_status === 'pending' ? (
                                                                <button 
                                                                    onClick={() => handleOpenPayment(ad)}
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1 ml-auto active:scale-95 animate-pulse"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">credit_card</span>
                                                                    Pay Now
                                                                </button>
                                                            ) : ad.status === 'approved' && ad.payment_status === 'paid' ? (
                                                                <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 justify-end">
                                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                                    Live & Active
                                                                </span>
                                                            ) : ad.status === 'rejected' ? (
                                                                <span className="text-slate-400 font-semibold text-xs">Closed</span>
                                                            ) : (
                                                                <span className="text-slate-400 font-semibold text-xs italic">Awaiting Approval</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Ad Campaign Request Modal */}
                    {showAdModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-6 sm:p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800">New Promotion Campaign</h3>
                                            <p className="text-slate-400 text-xs font-semibold mt-0.5">Advertise your shop in premium banner slots.</p>
                                        </div>
                                        <button 
                                            onClick={() => setShowAdModal(false)}
                                            className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>

                                    <form onSubmit={handleAdSubmit} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Campaign Title *</label>
                                            <input 
                                                required 
                                                type="text"
                                                value={adForm.title}
                                                onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                                                placeholder="e.g. Premium Grooming Kit Sale!"
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Asset Image *</label>
                                            
                                            {adForm.image_url && (
                                                <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                                                    <img 
                                                        src={adForm.image_url} 
                                                        alt="Ad Campaign Preview" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setAdForm(prev => ({ ...prev, image_url: '' }))}
                                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="relative shrink-0">
                                                    <input 
                                                        id="adImageFileInput" 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => handleImageUpload(e, 'ad')} 
                                                    />
                                                    <button 
                                                        type="button"
                                                        disabled={uploadingAdImage}
                                                        onClick={() => document.getElementById('adImageFileInput').click()}
                                                        className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 active:scale-[0.98] disabled:opacity-60"
                                                    >
                                                        {uploadingAdImage ? (
                                                            <>
                                                                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-[18px] text-blue-600">cloud_upload</span>
                                                                Upload Banner
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="relative flex-1">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">link</span>
                                                    <input 
                                                        required={!adForm.image_url}
                                                        name="image_url" 
                                                        value={adForm.image_url} 
                                                        onChange={(e) => setAdForm({ ...adForm, image_url: e.target.value })}
                                                        type="text" 
                                                        placeholder="Or paste custom banner link..."
                                                        className="w-full pl-10 pr-4 py-3.5 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Click-Through Target Link *</label>
                                            <input 
                                                required 
                                                type="text"
                                                value={adForm.target_url}
                                                onChange={(e) => setAdForm({ ...adForm, target_url: e.target.value })}
                                                placeholder="e.g. /marketplace or custom external website"
                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Placement Page *</label>
                                                <select
                                                    value={adForm.placement}
                                                    onChange={(e) => setAdForm({ ...adForm, placement: e.target.value })}
                                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                                                >
                                                    <option value="home">Home Page (Top Banner)</option>
                                                    <option value="marketplace">Marketplace (Carousel/Sidebar)</option>
                                                    <option value="community">Community Feed (Inline Banner)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Duration Tier *</label>
                                                <select
                                                    value={adForm.duration}
                                                    onChange={(e) => handleAdDurationChange(e.target.value)}
                                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                                                >
                                                    <option value="1_week">1 Week (500 EGP)</option>
                                                    <option value="1_month">1 Month (1500 EGP)</option>
                                                    <option value="3_months">3 Months (4000 EGP)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/30 text-xs font-bold text-blue-900 flex justify-between items-center mt-2">
                                            <span>Total Campaign Cost:</span>
                                            <span className="text-sm font-black text-blue-700">{adForm.price} EGP</span>
                                        </div>

                                        <div className="flex justify-between gap-3 pt-4">
                                            <button 
                                                type="button"
                                                onClick={() => setShowAdModal(false)}
                                                className="px-5 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit"
                                                disabled={actionLoading}
                                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-1.5"
                                            >
                                                {actionLoading ? 'Submitting...' : 'Submit Request'}
                                                <span className="material-symbols-outlined text-[16px]">send</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Simulated Checkout Drawer / Modal */}
                    {showPaymentDrawer && payingAd && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-300">
                                {/* Top Premium Color Bar */}
                                <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-600"></div>

                                <div className="p-6 sm:p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800">Checkout Payment</h3>
                                            <p className="text-slate-400 text-xs font-semibold mt-0.5">Activate your promotional campaign instantly.</p>
                                        </div>
                                        <button 
                                            onClick={() => { setShowPaymentDrawer(false); setPayingAd(null); }}
                                            className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>

                                    <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                        <div className="flex justify-between text-xs text-slate-500 font-semibold">
                                            <span>Campaign:</span>
                                            <span className="font-extrabold text-slate-700">{payingAd.title}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 font-semibold">
                                            <span>Placement:</span>
                                            <span className="font-extrabold text-slate-700 capitalize">{payingAd.placement} Page</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 font-semibold">
                                            <span>Duration:</span>
                                            <span className="font-extrabold text-slate-700 capitalize">{payingAd.duration.replace('_', ' ')}</span>
                                        </div>
                                        <div className="border-t border-slate-200/50 pt-2 flex justify-between text-sm text-slate-800 font-extrabold">
                                            <span>Amount Due:</span>
                                            <span className="text-blue-600 font-black">{payingAd.price} EGP</span>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSimulatedPayment} className="space-y-4">
                                        {/* Simulated Card Interface */}
                                        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 p-5 rounded-2xl text-white shadow-lg space-y-6 relative overflow-hidden mb-4">
                                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                                            <div className="flex justify-between items-center">
                                                <span className="material-symbols-outlined text-3xl opacity-80">credit_card</span>
                                                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Mock Checkout Sandbox</span>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Card Number</label>
                                                <input 
                                                    required
                                                    type="text"
                                                    maxLength="19"
                                                    value={paymentForm.cardNumber}
                                                    onChange={(e) => {
                                                        let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                                        let matches = v.match(/\d{4,16}/g);
                                                        let match = (matches && matches[0]) || '';
                                                        let parts = [];
                                                        for (let i=0, len=match.length; i<len; i+=4) {
                                                            parts.push(match.substring(i, i+4));
                                                        }
                                                        if (parts.length > 0) {
                                                            setPaymentForm({ ...paymentForm, cardNumber: parts.join(' ') });
                                                        } else {
                                                            setPaymentForm({ ...paymentForm, cardNumber: v });
                                                        }
                                                    }}
                                                    placeholder="4111 2222 3333 4444"
                                                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold tracking-widest placeholder-white/30 outline-none focus:border-white/40 transition-colors text-white"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expiry Date</label>
                                                    <input 
                                                        required
                                                        type="text"
                                                        maxLength="5"
                                                        value={paymentForm.expiry}
                                                        onChange={(e) => {
                                                            let v = e.target.value.replace(/[^0-9]/gi, '');
                                                            if (v.length >= 2) {
                                                                setPaymentForm({ ...paymentForm, expiry: v.substring(0,2) + '/' + v.substring(2,4) });
                                                            } else {
                                                                setPaymentForm({ ...paymentForm, expiry: v });
                                                            }
                                                        }}
                                                        placeholder="MM/YY"
                                                        className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold placeholder-white/30 outline-none focus:border-white/40 transition-colors text-center text-white"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">CVC / CVV</label>
                                                    <input 
                                                        required
                                                        type="password"
                                                        maxLength="3"
                                                        value={paymentForm.cvc}
                                                        onChange={(e) => setPaymentForm({ ...paymentForm, cvc: e.target.value.replace(/[^0-9]/gi, '') })}
                                                        placeholder="***"
                                                        className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold placeholder-white/30 outline-none focus:border-white/40 transition-colors text-center tracking-widest text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            type="submit"
                                            disabled={actionLoading}
                                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] disabled:opacity-75 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">verified</span>
                                            {actionLoading ? 'Processing Securely...' : `Pay ${payingAd.price} EGP & Go Live`}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default VendorDashboard;
