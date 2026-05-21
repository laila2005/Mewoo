import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/common/SEO';

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
    
    const userRole = user && user.role ? user.role.toLowerCase().trim() : '';
    const isBusinessOrPro = ['vet', 'trainer', 'vendor'].includes(userRole);

    // Default to feed, but check URL hash
    const [activeTab, setActiveTab] = useState(() => {
        if (isBusinessOrPro) return 'feed';
        const hash = location.hash.replace('#', '');
        return ['feed', 'lostfound', 'adoptions', 'petmatch', 'hosting'].includes(hash) ? hash : 'feed';
    });

    useEffect(() => {
        if (isBusinessOrPro) {
            setActiveTab('feed');
            if (location.hash && location.hash !== '#feed') {
                navigate('/community', { replace: true });
            }
            return;
        }
        const hash = location.hash.replace('#', '');
        if (['feed', 'lostfound', 'adoptions', 'petmatch', 'hosting'].includes(hash)) {
            setActiveTab(hash);
        }
    }, [location.hash, isBusinessOrPro, navigate]);

    const handleTabChange = (tab) => {
        if (isBusinessOrPro && tab !== 'feed') return;
        setActiveTab(tab);
        navigate(`#${tab}`);
    };

    const communitySchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "PetPulse Pet Care Community & Forums",
        "description": "Discuss wellness, mating matches, and safe pet hosting with verified pet owners in Egypt.",
        "url": "https://petpulse-web.vercel.app/community"
    };

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] flex justify-center py-6 px-4">
            <SEO 
                title="Pet Care Community & Hosting"
                description="Join Egypt's largest premium pet community. Share mating resumes, find trusted cage-free pet hosting, discuss health, and connect with pet parents."
                keywords="pet community cairo, pet hosting egypt, dog mating matches, pet forums cairo, cage free boarding egypt, petpulse"
                schema={communitySchema}
            />
            <div className="w-full max-w-4xl flex flex-col gap-6">
                
                {/* Community Top Header Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 rounded-2xl border border-slate-100 shadow-sm transition-all duration-200 active:scale-[0.98] group shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-0.5">arrow_back</span>
                        <span className="text-sm font-bold">Back</span>
                    </button>
                    
                    {/* Search Bar */}
                    <div className="flex-1 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center focus-within:border-blue-500/85 focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-100/50 transition-all duration-300">
                        <span className="material-symbols-outlined text-slate-400 pl-3">search</span>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search posts, pets, or people..." 
                            className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm outline-none"
                        />
                    </div>
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

                    {/* Tabs Header / Custom Hub Header */}
                    {isBusinessOrPro ? (
                        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600 flex items-center justify-center shadow-sm border border-blue-100/50">
                                    <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        forum
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Community Feed</h2>
                                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm ${
                                            userRole === 'trainer' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200/60' :
                                            userRole === 'vet' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60' :
                                            'bg-purple-100 text-purple-800 border border-purple-200/60'
                                        }`}>
                                            <span className="material-symbols-outlined text-[12px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                {userRole === 'trainer' ? 'fitness_center' : userRole === 'vet' ? 'medical_services' : 'storefront'}
                                            </span>
                                            {userRole === 'trainer' ? 'Trainer Hub' : userRole === 'vet' ? 'Veterinarian' : 'Pet Shop Vendor'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Share updates, answer community questions, and connect with Egyptian pet owners.
                                    </p>
                                </div>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 self-start md:self-auto bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/50">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                    Cairo Network Active
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar bg-slate-50/50">
                            <button 
                                onClick={() => handleTabChange('feed')} 
                                className={`flex-1 py-3.5 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 ${activeTab === 'feed' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                            >
                                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">dynamic_feed</span> Feed
                            </button>
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
                        </div>
                    )}

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
