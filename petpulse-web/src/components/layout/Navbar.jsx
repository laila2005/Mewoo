import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
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

    const isHome = location.pathname === '/';

    return (
        <header className="bg-white/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-[100] border-b border-slate-100 shadow-[0_8px_30px_rgb(74,144,226,0.08)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4 sm:gap-6 lg:gap-8">
                <Link to="/" className="inline-flex items-center gap-2 flex-shrink-0">
                    <img src="/src/assets/images/logoo.png" alt="PetPulse Logo" className="h-8 sm:h-10 w-auto" />
                    <span className="text-lg font-bold tracking-tight text-blue-600 font-display hidden sm:inline-block">PetPulse</span>
                </Link>
                
                <nav className="hidden md:flex items-center justify-center gap-4 lg:gap-8 flex-1">
                    <Link to="/" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${isHome ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Home</Link>
                    <Link to="/marketplace" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${location.pathname === '/marketplace' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Marketplace</Link>
                    <Link to="/explore" className="text-slate-600 font-medium font-['Plus_Jakarta_Sans'] hover:text-blue-500 transition-all duration-300 text-sm lg:text-base">Services</Link>
                    <Link to="/community" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${location.pathname === '/community' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Community</Link>
                    <Link to="/adoption" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base ${location.pathname === '/adoption' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-blue-500'}`}>Adoption</Link>
                    <Link to="/pulsebox" className={`font-medium font-['Plus_Jakarta_Sans'] transition-all duration-300 text-sm lg:text-base flex items-center gap-1 ${location.pathname === '/pulsebox' ? 'text-amber-600 border-b-2 border-amber-600 pb-1' : 'text-amber-600 hover:text-amber-500'}`}>
                        <span className="material-symbols-outlined text-[16px]">redeem</span> PulseBox
                    </Link>
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                    {!user ? (
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Link to="/login" className="text-slate-600 font-medium px-2 sm:px-3 py-2 text-xs sm:text-sm hover:text-blue-600 active:scale-95 transition-all rounded-lg hover:bg-slate-50">Log In</Link>
                            <Link to="/signup" className="bg-blue-600 text-white font-semibold px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-full shadow hover:bg-blue-700 active:scale-95 transition-all">Sign Up</Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 sm:gap-3">
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
                                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Notifications">
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
                                                    <Link key={idx} to={alert.action_url} className="block px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors">
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

                            {/* PROFILE BUTTON */}
                            <Link to={user.role === 'owner' ? '/owner-profile' : '/profile'} title="Go to profile" className="block flex-shrink-0">
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
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[24px]">menu</span>
                    </button>
                </div>
            </div>
            
            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 shadow-lg absolute w-full left-0">
                    <nav className="flex flex-col gap-4">
                        <Link to="/" className="text-slate-700 font-medium">Home</Link>
                        <Link to="/marketplace" className="text-slate-700 font-medium">Marketplace</Link>
                        <Link to="/explore" className="text-slate-700 font-medium">Services</Link>
                        <Link to="/community" className="text-slate-700 font-medium">Community</Link>
                        <Link to="/adoption" className="text-slate-700 font-medium">Adoption</Link>
                        <Link to="/pulsebox" className="text-amber-600 font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">redeem</span> PulseBox
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Navbar;
