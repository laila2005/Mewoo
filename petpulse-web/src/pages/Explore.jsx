import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import DiscoverySidebar from '../components/layout/DiscoverySidebar';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const Explore = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [deletedPosts, setDeletedPosts] = useState([]);

    useEffect(() => {
        const fetchExploreData = async () => {
            try {
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const [postsRes, petsRes] = await Promise.all([
                    axios.get(`${API_BASE}/community/posts`, { headers }).catch(() => ({ data: { posts: [] } })),
                    axios.get(`${API_BASE}/pets/adoptable`).catch(() => ({ data: { pets: [] } }))
                ]);

                const posts = postsRes.data.posts || [];
                const pets = petsRes.data.pets || [];

                // Combine and shuffle
                const combined = [
                    ...posts.filter(p => p.image_url).map(p => ({ type: 'post', data: p })),
                    ...pets.map(p => ({ type: 'pet', data: p }))
                ].sort(() => 0.5 - Math.random());

                setItems(combined);
            } catch (error) {
                console.error("Failed to fetch explore data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchExploreData();
    }, [token]);

    useEffect(() => {
        if (!token) {
            setDeletedPosts([]);
            return;
        }
        const fetchDeletedPosts = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` };
                const res = await axios.get(`${API_BASE}/community/posts/deleted`, { headers });
                setDeletedPosts(res.data.posts || []);
            } catch (err) {
                console.error("Failed to load deleted posts", err);
            }
        };
        fetchDeletedPosts();
    }, [token]);

    const handleAppeal = async (postId) => {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.put(`${API_BASE}/community/posts/${postId}/appeal`, {}, { headers });
            toast.success("Appeal submitted! Administrators will review your post shortly.");
            setDeletedPosts(prev => prev.map(p => p.id === postId ? { ...p, review_requested: true } : p));
        } catch (err) {
            console.error("Failed to submit appeal", err);
            toast.error(err.response?.data?.error || "Failed to submit appeal");
        }
    };

    const filteredItems = items.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'post') return item.type === 'post';
        if (filter === 'pet') return item.type === 'pet';
        if (filter === 'success') return item.type === 'post'; // Fallback for success stories
        return true;
    });

    const generateAvatar = (first, last) => `https://ui-avatars.com/api/?name=${first}+${last}&background=f1f5f9`;

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <DiscoverySidebar />

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Mobile Quick-Links Carousel (hidden on XL screens where sidebar is visible) */}
                <div className="xl:hidden flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-none">
                    <Link 
                        to="/explore"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-extrabold whitespace-nowrap shadow-sm border border-blue-100 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">explore</span> Explore
                    </Link>
                    <Link 
                        to="/vets"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-slate-50 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">medical_services</span> Find a Vet
                    </Link>
                    <Link 
                        to="/vet-booking"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-slate-50 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">location_on</span> Local Services
                    </Link>
                    <Link 
                        to="/pet-shops"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-slate-50 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">storefront</span> Pet Shops
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Explore</h1>
                    <p className="text-slate-500 mt-1">Discover trending pets, stories, and community highlights.</p>
                </div>

                {deletedPosts.length > 0 && (
                    <div className="mb-8 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-rose-500 text-[26px] animate-pulse">report</span>
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-base">Automatic Content Review Notice</h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Our AI Auto-Moderator soft-deleted {deletedPosts.length} of your post{deletedPosts.length > 1 ? 's' : ''} for community guideline violations. They are hidden from the public feed but can be appealed for manual admin review.
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            {deletedPosts.map(p => (
                                <div key={p.id} className="bg-white/80 border border-rose-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-white shadow-inner">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-100">
                                                AI Flagged
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-semibold mb-2">
                                            Violation Report: <span className="text-rose-600 italic font-medium">"{p.soft_deleted_reason}"</span>
                                        </p>
                                        <p className="text-slate-800 text-sm font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            {p.content}
                                        </p>
                                    </div>
                                    <div className="shrink-0 w-full sm:w-auto">
                                        {p.review_requested ? (
                                            <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-extrabold shadow-sm">
                                                <span className="material-symbols-outlined text-[16px] animate-pulse">pending</span>
                                                Review Pending
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleAppeal(p.id)}
                                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-sm hover:shadow active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">campaign</span>
                                                Request Appeal
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filter Tags */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
                    <button 
                        onClick={() => setFilter('all')} 
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${filter === 'all' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilter('post')} 
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${filter === 'post' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Trending Posts
                    </button>
                    <button 
                        onClick={() => setFilter('pet')} 
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${filter === 'pet' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Adoptable Pets
                    </button>
                    <button 
                        onClick={() => setFilter('success')} 
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${filter === 'success' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Success Stories
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-4xl mb-3 block opacity-50">refresh</span>
                        <p className="font-semibold">Gathering the best content...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">explore_off</span>
                        <p className="font-bold text-slate-700 mb-1">Nothing found</p>
                        <p className="text-sm text-slate-500">Check back later for new content!</p>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                        {filteredItems.map((item, idx) => {
                            if (item.type === 'post') {
                                const p = item.data;
                                return (
                                    <div key={`post-${p.id}-${idx}`} onClick={() => navigate(`/community?post=${p.id}`)} className="break-inside-avoid bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer mb-6">
                                        <div className="relative overflow-hidden bg-slate-100">
                                            <img src={p.image_url} alt="Post" className="w-full object-cover group-hover:scale-105 transition-transform duration-500 min-h-[200px]" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                                                <p className="text-white font-bold text-sm leading-relaxed line-clamp-3">{p.content}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 flex items-center justify-between bg-white relative z-10">
                                            <div className="flex items-center gap-3">
                                                <img src={p.profile_pic_url || generateAvatar(p.first_name, p.last_name)} className="w-8 h-8 rounded-full object-cover border border-slate-100" alt={p.first_name} />
                                                <span className="text-sm font-bold text-slate-800">{p.first_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs bg-slate-50 px-2 py-1 rounded-lg">
                                                <span className="material-symbols-outlined text-[16px] text-blue-600" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span> 
                                                {p.likes_count}
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                const p = item.data;
                                return (
                                    <div key={`pet-${p.id}-${idx}`} onClick={() => navigate(`/pet-profile?id=${p.id}`)} className="break-inside-avoid bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer mb-6">
                                        <div className="relative overflow-hidden bg-slate-100">
                                            <img src={p.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'} alt={p.name} className="w-full object-cover group-hover:scale-105 transition-transform duration-500 min-h-[240px]" />
                                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest text-emerald-600 uppercase shadow-sm flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                ADOPT ME
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <h3 className="text-xl font-bold text-slate-900 mb-1">{p.name}</h3>
                                            <p className="text-sm font-medium text-slate-500 mb-4">{p.breed || p.species} • {p.age_years} yrs</p>
                                            <button className="w-full bg-slate-50 text-blue-600 font-bold py-2.5 rounded-xl text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                Meet {p.name}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Explore;
