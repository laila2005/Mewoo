import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isPro = user && (user.role === 'vet' || user.role === 'trainer');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifCount, setNotifCount] = useState(0);
    const notifRef = useRef(null);

    // Close dropdowns on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsNotifOpen(false);
    }, [location.pathname]);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Notifications
    useEffect(() => {
        if (!user) return;
        
        const fetchNotifs = async () => {
            try {
                const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
                const res = await axios.get(`${API_BASE}/users/notifications`);
                setNotifications(res.data.alerts || []);
                setNotifCount(res.data.total || 0);
            } catch (error) {
                console.error("Failed to fetch notifications");
            }
        };

        fetchNotifs();
        const interval = setInterval(fetchNotifs, 60000);
        return () => clearInterval(interval);
    }, [user]);

    const handleNotifClick = async () => {
        const nextState = !isNotifOpen;
        setIsNotifOpen(nextState);
        if (nextState && notifCount > 0) {
            try {
                const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
                await axios.put(`${API_BASE}/users/notifications/mark-read`);
                setNotifCount(0);
            } catch (error) {
                console.error("Failed to mark notifications as read", error);
            }
        }
    };

    const isHome = location.pathname === '/';

    return (
        <>
            <header className="bg-white/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 border-b border-slate-100 shadow-[0_8px_30px_rgb(74,144,226,0.08)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-4 sm:gap-6 lg:gap-8 w-full">
                <Link to="/" className="inline-flex items-center gap-2 flex-shrink-0">
                    <img src="/assets/images/logoo.png" alt="PetPulse Logo" className="h-8 sm:h-10 w-auto" />
                    <span className="text-lg font-bold tracking-tight text-blue-600 font-display hidden sm:inline-block">PetPulse</span>
                </Link>
                
                <nav className="hidden md:flex items-center justify-center gap-4 lg:gap-8 flex-1">
                    <Link to="/" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${isHome ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Home</Link>
                    {!isPro ? (
                        <>
                            <Link to="/marketplace" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${location.pathname === '/marketplace' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Marketplace</Link>
                            <Link to="/explore" className="text-slate-600 font-medium font-['Plus_Jakarta_Sans'] hover:text-blue-500 transition-all duration-300 text-sm lg:text-base">Services</Link>
                        </>
                    ) : (
                        <Link to="/pro-dashboard" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${location.pathname === '/pro-dashboard' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>My Dashboard</Link>
                    )}
                    <Link to="/community" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${location.pathname === '/community' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Community</Link>
                    {!isPro && (
                        <>
                            <Link to="/adoption" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${location.pathname === '/adoption' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Adoption</Link>
                            <Link to="/pulsebox" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base flex items-center gap-1 ${location.pathname === '/pulsebox' ? 'text-amber-600 border-b-2 border-amber-600 pb-1' : 'text-amber-600 hover:text-amber-500'}`}>
                                <span className="material-symbols-outlined text-[16px]">redeem</span> PulseBox
                            </Link>
                        </>
                    )}
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                    {!user ? (
                        <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                            <Link to="/login" className="text-slate-600 font-medium px-2 sm:px-3 py-2 text-xs sm:text-sm hover:text-blue-600 active:scale-95 transition-all rounded-lg hover:bg-slate-50">Log In</Link>
                            <Link to="/signup" className="bg-blue-600 text-white font-semibold px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-full shadow hover:bg-blue-700 active:scale-95 transition-all">Sign Up</Link>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 sm:gap-3">
                            <div className="hidden lg:flex items-center gap-2 relative">
                                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                <input className="pl-8 pr-3 py-1.5 rounded-full border-none bg-slate-100 focus:ring-2 focus:ring-blue-600 text-xs w-28 lg:w-40 outline-none" placeholder="Search..." type="text"/>
                            </div>

                            {/* MESSAGES BUTTON */}
                            <Link to="/messages" className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Messages">
                                <span className="material-symbols-outlined text-[24px]">chat</span>
                            </Link>

                            {/* NOTIFICATIONS DROPDOWN BUTTON */}
                            <div className="relative" ref={notifRef}>
                                <button onClick={handleNotifClick} className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Notifications">
                                    <span className="material-symbols-outlined text-[24px]">notifications</span>
                                    {notifCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border border-white rounded-full text-[10px] text-white flex justify-center items-center font-bold shadow-sm">
                                            {notifCount > 9 ? '9+' : notifCount}
                                        </span>
                                    )}
                                </button>
                                
                                {isNotifOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 transform origin-top-right transition-all">
                                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-4 text-center text-slate-500 text-sm">No new notifications</div>
                                            ) : (
                                                notifications.map((alert, idx) => (
                                                    <Link key={idx} to={alert.action_url} className="block px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors animate-fade-in-up hover-glow">
                                                        <div className="flex items-start gap-3">
                                                            <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full flex-shrink-0 mt-0.5">
                                                                <span className="material-symbols-outlined text-[16px]">{alert.type === 'unread_message' ? 'chat' : 'person_add'}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                                                                <p className="text-xs text-slate-600 mt-0.5">{alert.message}</p>
                                                                <p className="text-[10px] text-slate-400 mt-1">{new Date(alert.time).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* VENDOR DASHBOARD */}
                            {user.role === 'vendor' && (
                                <Link to="/vendor-dashboard" className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Vendor Dashboard">
                                    <span className="material-symbols-outlined text-[24px]">storefront</span>
                                </Link>
                            )}

                            {/* PROFESSIONAL DASHBOARD */}
                            {isPro && (
                                <Link to="/pro-dashboard" className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="My Dashboard">
                                    <span className="material-symbols-outlined text-[24px]">dashboard</span>
                                </Link>
                            )}

                            {/* PROFILE BUTTON */}
                            <Link to="/profile" title="Go to profile" className="block flex-shrink-0">
                                <img 
                                    src={user.profile_pic_url || user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name || 'User'}+${user.last_name || ''}&background=d4e3ff&color=005da7`} 
                                    alt="Profile" 
                                    className="w-9 h-9 rounded-full border-2 border-blue-600/30 object-cover cursor-pointer hover:border-blue-600 transition-colors" 
                                />
                            </Link>

                            {/* LOGOUT */}
                            <button onClick={logout} className="text-slate-600 font-medium px-2 sm:px-3 py-2 hover:text-blue-600 active:scale-95 transition-all text-xs sm:text-sm rounded-lg hover:bg-slate-50" title="Logout">
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                            </button>
                        </div>
                    )}
                    
                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        className="md:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative"
                    >
                        <span className="material-symbols-outlined text-[24px]">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                        {!isMobileMenuOpen && notifCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border border-white rounded-full animate-pulse"></span>
                        )}
                    </button>
                </div>
            </div>
        </header>
        
        {/* Mobile Menu Drawer */}
            {isMobileMenuOpen && (
                <>
                    {/* Style tag injection for custom keyframe animations */}
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes slideInRight {
                            from { transform: translateX(100%); }
                            to { transform: translateX(0); }
                        }
                        @keyframes fadeInBg {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                    `}} />
                    
                    {/* Backdrop Overlay */}
                    <div 
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm md:hidden animate-[fadeInBg_0.2s_ease-out]"
                        style={{ zIndex: 99998 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Sliding Sidebar Drawer */}
                    <div 
                        className="fixed top-0 right-0 h-full w-[290px] sm:w-[320px] bg-white shadow-2xl md:hidden flex flex-col justify-between animate-[slideInRight_0.25s_ease-out] border-l border-slate-100"
                        style={{ zIndex: 99999 }}
                    >
                        <div>
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 p-5">
                                <span className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <img src="/assets/images/logoo.png" alt="Logo" className="h-7 w-auto" />
                                    <span className="text-blue-600 font-display">PetPulse</span>
                                </span>
                                <button 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            {/* User profile card (if logged in) */}
                            {user && (
                                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                                    <img 
                                        src={user.profile_pic_url || user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name || 'User'}+${user.last_name || ''}&background=d4e3ff&color=005da7`} 
                                        alt="Profile" 
                                        className="w-11 h-11 rounded-full border-2 border-blue-600/20 object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-sm text-slate-800 truncate">{user.first_name} {user.last_name}</h4>
                                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                            )}

                            {/* Scrollable Drawer Content */}
                            <div className="overflow-y-auto px-5 py-4 space-y-6 max-h-[calc(100vh-180px)]">
                                {/* Main Navigation Links */}
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-2">Navigation</p>
                                    <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${isHome ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                        <span className="material-symbols-outlined text-[20px]">home</span> Home
                                    </Link>
                                    {!isPro ? (
                                        <>
                                            <Link to="/marketplace" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/marketplace' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                                <span className="material-symbols-outlined text-[20px]">storefront</span> Marketplace
                                            </Link>
                                            <Link to="/explore" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/explore' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                                <span className="material-symbols-outlined text-[20px]">medical_services</span> Services
                                            </Link>
                                        </>
                                    ) : (
                                        <Link to="/pro-dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/pro-dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                            <span className="material-symbols-outlined text-[20px]">dashboard</span> My Dashboard
                                        </Link>
                                    )}
                                    <Link to="/community" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/community' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                        <span className="material-symbols-outlined text-[20px]">forum</span> Community
                                    </Link>
                                    {!isPro && (
                                        <>
                                            <Link to="/adoption" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/adoption' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                                <span className="material-symbols-outlined text-[20px]">volunteer_activism</span> Adoption
                                            </Link>
                                            <Link to="/pulsebox" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/pulsebox' ? 'bg-amber-50 text-amber-600 font-bold' : 'text-amber-600 hover:bg-amber-50'}`}>
                                                <span className="material-symbols-outlined text-[20px]">redeem</span> PulseBox
                                            </Link>
                                        </>
                                    )}
                                </div>

                                {/* User Account / Utilities Section */}
                                {user && (
                                    <div className="space-y-1 pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-2">Account</p>
                                        <Link to="/profile" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/profile' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                            <span className="material-symbols-outlined text-[20px]">person</span> Profile Dashboard
                                        </Link>
                                        {user.role === 'vendor' && (
                                            <Link to="/vendor-dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/vendor-dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                                <span className="material-symbols-outlined text-[20px]">storefront</span> Vendor Dashboard
                                            </Link>
                                        )}
                                        {isPro && (
                                            <Link to="/pro-dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/pro-dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                                <span className="material-symbols-outlined text-[20px]">dashboard</span> My Dashboard
                                            </Link>
                                        )}
                                        <Link to="/messages" className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${location.pathname === '/messages' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'}`}>
                                            <span className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[20px]">chat</span> Messages
                                            </span>
                                        </Link>
                                        
                                        {/* Inline Notifications in Mobile Drawer */}
                                        <div className="relative">
                                            <button 
                                                onClick={handleNotifClick} 
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-500 transition-colors"
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-[20px]">notifications</span> Notifications
                                                </span>
                                                {notifCount > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                                        {notifCount}
                                                    </span>
                                                )}
                                            </button>
                                            
                                            {isNotifOpen && (
                                                <div className="mt-1 space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-100 max-h-[160px] overflow-y-auto">
                                                    {notifications.length === 0 ? (
                                                        <div className="text-center text-slate-400 text-xs py-3">No new notifications</div>
                                                    ) : (
                                                        notifications.map((alert, idx) => (
                                                            <Link key={idx} to={alert.action_url} className="block p-2 hover:bg-white rounded-lg transition-colors border-b border-slate-100/50 last:border-b-0 animate-fade-in-up hover-glow">
                                                                <p className="text-xs font-bold text-slate-800">{alert.title}</p>
                                                                <p className="text-[10px] text-slate-600 mt-0.5">{alert.message}</p>
                                                            </Link>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                            {!user ? (
                                <div className="flex flex-col gap-2">
                                    <Link 
                                        to="/login" 
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="w-full py-3 text-center border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 hover:border-slate-300 transition-colors"
                                    >
                                        Log In
                                    </Link>
                                    <Link 
                                        to="/signup" 
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="w-full py-3 text-center bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 shadow-md shadow-blue-600/10 transition-colors"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        logout();
                                    }} 
                                    className="w-full py-3 text-center bg-red-50 text-red-600 border border-red-100 font-bold rounded-xl text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">logout</span> Log Out
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default Navbar;
