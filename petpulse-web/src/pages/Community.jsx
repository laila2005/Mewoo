import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Tabs
import FeedTab from './community/FeedTab';
import LostFoundTab from './community/LostFoundTab';
import AdoptionsTab from './community/AdoptionsTab';
import PetMatchTab from './community/PetMatchTab';
import PetHostingTab from './community/PetHostingTab';

const Community = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [ads, setAds] = useState([]);

    useEffect(() => {
        const fetchAds = async () => {
            try {
                const base = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
                const res = await fetch(`${base}/public/ads`);
                const data = await res.json();
                setAds(data.ads || []);
            } catch (err) {
                console.error('Error fetching ads:', err);
            }
        };
        fetchAds();
    }, []);

    const communityAds = ads.filter(ad => ad.placement === 'community');
    const [searchQuery, setSearchQuery] = useState('');
    
    const isBusinessOrPro = user && ['vet', 'trainer', 'vendor'].includes(user.role);

    // Default to feed, but check URL hash
    const [activeTab, setActiveTab] = useState(() => {
        if (isBusinessOrPro) return 'feed';
        const hash = location.hash.replace('#', '');
        return ['feed', 'lostfound', 'adoptions', 'petmatch', 'hosting'].includes(hash) ? hash : 'feed';
    });

    useEffect(() => {
        if (isBusinessOrPro) {
            setActiveTab('feed');
            return;
        }
        const hash = location.hash.replace('#', '');
        if (['feed', 'lostfound', 'adoptions', 'petmatch', 'hosting'].includes(hash)) {
            setActiveTab(hash);
        }
    }, [location.hash, isBusinessOrPro]);

    const handleTabChange = (tab) => {
        if (isBusinessOrPro && tab !== 'feed') return;
        setActiveTab(tab);
        navigate(`#${tab}`);
    };

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] flex justify-center py-6 px-4">
            <div className="w-full max-w-4xl flex flex-col gap-6">
                
                {/* Back Button */}
                <div className="flex items-center">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-100 shadow-sm transition-all duration-200 active:scale-[0.98] group"
                    >
                        <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-0.5">arrow_back</span>
                        <span className="text-sm font-bold">Back</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                    <span className="material-symbols-outlined text-slate-400 pl-3">search</span>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search posts, pets, or people..." 
                        className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm outline-none"
                    />
                </div>

                {/* Community Ad Banner */}
                {communityAds.length > 0 && (
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-100 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>
                        <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-md p-1 border border-purple-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                <img src={communityAds[0].image_url} alt={communityAds[0].title} className="w-full h-full object-cover rounded-lg" />
                            </div>
                            <div>
                                <span className="inline-block py-0.5 px-2 bg-purple-100 text-purple-800 rounded text-[9px] font-bold uppercase tracking-wider mb-0.5">Community Sponsor</span>
                                <h4 className="font-bold text-slate-800 text-sm leading-tight">{communityAds[0].title}</h4>
                                <p className="text-slate-500 text-xs mt-0.5">Brought to you by our verified partner</p>
                            </div>
                        </div>
                        <a 
                            href={communityAds[0].target_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="shrink-0 bg-purple-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-sm hover:bg-purple-500 transition-all flex items-center gap-1.5"
                        >
                            View Details <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </a>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Styles for scrollbar-less horizontal swiping */}
                    <style dangerouslySetInnerHTML={{__html: `
                        .hide-scrollbar::-webkit-scrollbar {
                            display: none;
                        }
                        .hide-scrollbar {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                    `}} />

                    {/* Tabs Header */}
                    <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar bg-slate-50/50">
                        <button 
                            onClick={() => handleTabChange('feed')} 
                            className={`flex-1 py-3.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${activeTab === 'feed' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">dynamic_feed</span> Feed
                        </button>
                        {!isBusinessOrPro && (
                            <>
                                <button 
                                    onClick={() => handleTabChange('lostfound')} 
                                    className={`flex-1 py-3.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${activeTab === 'lostfound' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">search</span> Lost & Found
                                </button>
                                <button 
                                    onClick={() => handleTabChange('adoptions')} 
                                    className={`flex-1 py-3.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${activeTab === 'adoptions' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">volunteer_activism</span> Adoptions
                                </button>
                                <button 
                                    onClick={() => handleTabChange('petmatch')} 
                                    className={`flex-1 py-3.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${activeTab === 'petmatch' ? 'border-pink-500 text-pink-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">favorite</span> Pet Match
                                </button>
                                <button 
                                    onClick={() => handleTabChange('hosting')} 
                                    className={`flex-1 py-3.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${activeTab === 'hosting' ? 'border-purple-500 text-purple-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px] sm:text-[18px]">home</span> Pet Hosting
                                </button>
                            </>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6 bg-slate-50/30">
                        {activeTab === 'feed' && <FeedTab searchQuery={searchQuery} />}
                        {!isBusinessOrPro && activeTab === 'lostfound' && <LostFoundTab searchQuery={searchQuery} />}
                        {!isBusinessOrPro && activeTab === 'adoptions' && <AdoptionsTab searchQuery={searchQuery} />}
                        {!isBusinessOrPro && activeTab === 'petmatch' && <PetMatchTab searchQuery={searchQuery} />}
                        {!isBusinessOrPro && activeTab === 'hosting' && <PetHostingTab searchQuery={searchQuery} />}
                    </div>
                </div>
            </div>
            
            {/* Right Aside - Appointments Reminder (Hidden on Mobile) */}
            <aside className="hidden xl:block w-80 ml-6 shrink-0 space-y-6">
                {user ? (
                    <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-blue-100 p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 text-blue-800 font-bold mb-3">
                            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>calendar_today</span> 
                            Upcoming
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed mb-4">
                            <strong>Bella's</strong> annual vaccination is due in <strong className="text-blue-600">5 days</strong>.
                        </p>
                        <button onClick={() => navigate('/vet-booking')} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm hover:bg-blue-700 transition-colors">
                            Book Appointment
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">lock</span>
                        <h4 className="font-bold text-slate-800 mb-2">Join the Community</h4>
                        <p className="text-sm text-slate-500 mb-4">Log in to interact with posts, find matches, and book vets.</p>
                        <button onClick={() => navigate('/login')} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm hover:bg-slate-700 transition-colors">
                            Log In
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
};

export default Community;
