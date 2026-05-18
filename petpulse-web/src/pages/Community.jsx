import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Tabs
import FeedTab from './community/FeedTab';
import LostFoundTab from './community/LostFoundTab';
import AdoptionsTab from './community/AdoptionsTab';
import PetMatchTab from './community/PetMatchTab';

const Community = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    
    // Default to feed, but check URL hash
    const [activeTab, setActiveTab] = useState(() => {
        const hash = location.hash.replace('#', '');
        return ['feed', 'lostfound', 'adoptions', 'petmatch'].includes(hash) ? hash : 'feed';
    });

    useEffect(() => {
        const hash = location.hash.replace('#', '');
        if (['feed', 'lostfound', 'adoptions', 'petmatch'].includes(hash)) {
            setActiveTab(hash);
        }
    }, [location.hash]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        navigate(`#${tab}`);
    };

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] flex justify-center py-6 px-4">
            <div className="w-full max-w-4xl flex flex-col gap-6">
                
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

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Tabs Header */}
                    <div className="flex border-b border-slate-100 overflow-x-auto hide-scrollbar bg-slate-50/50">
                        <button 
                            onClick={() => handleTabChange('feed')} 
                            className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'feed' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">dynamic_feed</span> Feed
                        </button>
                        <button 
                            onClick={() => handleTabChange('lostfound')} 
                            className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'lostfound' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">search</span> Lost & Found
                        </button>
                        <button 
                            onClick={() => handleTabChange('adoptions')} 
                            className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'adoptions' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">volunteer_activism</span> Adoptions
                        </button>
                        <button 
                            onClick={() => handleTabChange('petmatch')} 
                            className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'petmatch' ? 'border-pink-500 text-pink-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">favorite</span> Pet Match
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6 bg-slate-50/30">
                        {activeTab === 'feed' && <FeedTab searchQuery={searchQuery} />}
                        {activeTab === 'lostfound' && <LostFoundTab searchQuery={searchQuery} />}
                        {activeTab === 'adoptions' && <AdoptionsTab searchQuery={searchQuery} />}
                        {activeTab === 'petmatch' && <PetMatchTab searchQuery={searchQuery} />}
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
