import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const VendorDashboard = () => {
    const { token, user } = useAuth();
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);
    const [productForm, setProductForm] = useState({
        title: '',
        category: 'Food',
        base_price: '',
        description: '',
        image: '',
        badge: ''
    });
    
    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

    useEffect(() => {
        const fetchShopDetails = async () => {
            try {
                const res = await axios.get(`${API_BASE}/vendor/shop`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setShop(res.data.shop);
            } catch (error) {
                console.error("Failed to load shop", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchShopDetails();
    }, [token]);

    const handleProductChange = (e) => {
        setProductForm({ ...productForm, [e.target.name]: e.target.value });
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/vendor/products`, productForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Product added to your shop!');
            setProductForm({ title: '', category: 'Food', base_price: '', description: '', image: '', badge: '' });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add product');
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">refresh</span></div>;
    }

    if (!shop) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">storefront</span>
                    <h2 className="text-xl font-bold text-slate-800">Shop Application Pending</h2>
                    <p className="text-slate-500 mt-2">Your application is currently being reviewed by an administrator. Check back later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Shop Header */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-4xl">storefront</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-extrabold text-slate-900">{shop.name}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${shop.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {shop.status}
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">location_on</span> {shop.address}
                        </p>
                    </div>
                </div>

                {shop.status === 'approved' ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">add_circle</span>
                            Add New Product
                        </h2>
                        
                        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700">Product Title</label>
                                <input required name="title" value={productForm.title} onChange={handleProductChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all" placeholder="Premium Dog Food 5kg" />
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Category</label>
                                <select name="category" value={productForm.category} onChange={handleProductChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all">
                                    <option value="Food">Food</option>
                                    <option value="Toys">Toys</option>
                                    <option value="Accessories">Accessories</option>
                                    <option value="Grooming">Grooming</option>
                                    <option value="Health">Health</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Price (EGP)</label>
                                <input required name="base_price" value={productForm.base_price} onChange={handleProductChange} type="number" min="0" step="0.01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all" placeholder="299.99" />
                            </div>
                            
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700">Description</label>
                                <textarea name="description" value={productForm.description} onChange={handleProductChange} rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all resize-none" placeholder="Describe the product details..."></textarea>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Image URL</label>
                                <input name="image" value={productForm.image} onChange={handleProductChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all" placeholder="https://example.com/image.png" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Badge (Optional)</label>
                                <input name="badge" value={productForm.badge} onChange={handleProductChange} type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 outline-none transition-all" placeholder="e.g. Best Seller" />
                            </div>

                            <div className="md:col-span-2 pt-4">
                                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]">
                                    Publish Product to Marketplace
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 shadow-sm text-center">
                        <span className="material-symbols-outlined text-amber-600 text-4xl mb-2">pending_actions</span>
                        <h3 className="text-lg font-bold text-amber-900">Approval Pending</h3>
                        <p className="text-amber-700 mt-1">You can add products to your shop once your application is approved by an administrator.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorDashboard;
