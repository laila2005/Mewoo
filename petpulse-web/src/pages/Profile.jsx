import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import PremiumBadge from '../components/common/PremiumBadge';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const getRoleBadge = (role) => {
    switch (role) {
        case 'admin':
            return {
                label: 'Administrator',
                class: 'bg-slate-900 text-white border border-slate-800 shadow-sm shadow-slate-900/10',
                icon: 'admin_panel_settings'
            };
        case 'vet':
            return {
                label: 'Veterinarian',
                class: 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border border-teal-200/50 shadow-sm shadow-teal-500/5',
                icon: 'medical_services'
            };
        case 'trainer':
            return {
                label: 'Professional Trainer',
                class: 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 shadow-sm shadow-blue-500/5',
                icon: 'sports_and_outdoors'
            };
        case 'vendor':
            return {
                label: 'Pet Shop Vendor',
                class: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50 shadow-sm shadow-amber-500/5',
                icon: 'storefront'
            };
        case 'owner':
        default:
            return {
                label: 'Pet Owner',
                class: 'bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 border border-rose-200/50 shadow-sm shadow-rose-500/5',
                icon: 'pets'
            };
    }
};

const Profile = () => {
    const { token, user, setUser } = useAuth();
    const navigate = useNavigate();
    
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [subscription, setSubscription] = useState(null);

    const [isAddPetOpen, setIsAddPetOpen] = useState(false);
    const [newPet, setNewPet] = useState({ name: '', species: 'Dog', breed: '', age: '', weight: '' });
    const [savingPet, setSavingPet] = useState(false);

    const [connections, setConnections] = useState([]);
    const [connectionsLoading, setConnectionsLoading] = useState(false);
    const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);

    const handleOpenConnectionsModal = async () => {
        setIsConnectionsModalOpen(true);
        setConnectionsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/chat/connections`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConnections(res.data.connections || []);
        } catch (error) {
            console.error('Failed to fetch connections:', error);
            toast.error('Failed to load connections list');
        } finally {
            setConnectionsLoading(false);
        }
    };

    const handleToggleMuteConnectionPosts = async () => {
        const currentMute = !!user?.mute_connection_posts;
        const newMute = !currentMute;
        try {
            const res = await axios.put(`${API_BASE}/auth/profile`, {
                mute_connection_posts: newMute
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data.user) {
                setUser(res.data.user);
            } else {
                setUser({ ...user, mute_connection_posts: newMute });
            }
            
            toast.success(newMute ? 'Muted notifications for connection posts' : 'Enabled notifications for connection posts');
        } catch (error) {
            console.error('Failed to update preference:', error);
            toast.error('Failed to update notification settings');
        }
    };

    const handleChatNow = (conn) => {
        setIsConnectionsModalOpen(false);
        navigate('/messages', { 
            state: { 
                chatUser: {
                    id: conn.id,
                    first_name: conn.first_name,
                    last_name: conn.last_name,
                    profile_pic_url: conn.profile_pic_url,
                    role: conn.role
                }
            } 
        });
    };


    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                // Fetch Pets
                const petsRes = await axios.get(`${API_BASE}/pets`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPets(petsRes.data.pets || []);

                // Fetch Posts
                const postsRes = await axios.get(`${API_BASE}/community/posts`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const myPosts = (postsRes.data.posts || []).filter(p => p.user_id === user?.id);
                setPosts(myPosts);

                // Fetch Subscription
                try {
                    const subRes = await axios.get(`${API_BASE}/users/me/subscriptions`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (subRes.data.subscriptions && subRes.data.subscriptions.length > 0) {
                        setSubscription(subRes.data.subscriptions[0]);
                    }
                } catch (e) {
                    console.error("No subscriptions found", e);
                }
            } catch (error) {
                console.error("Failed to load profile data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, user]);

    const handleAddPet = async (e) => {
        e.preventDefault();
        if (!newPet.name) return;

        setSavingPet(true);
        try {
            await axios.post(`${API_BASE}/pets`, {
                name: newPet.name,
                species: newPet.species,
                breed: newPet.breed,
                age_years: newPet.age || null,
                weight_kg: newPet.weight || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Pet added successfully!');
            setIsAddPetOpen(false);
            
            // Reload pets
            const petsRes = await axios.get(`${API_BASE}/pets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPets(petsRes.data.pets || []);
            setNewPet({ name: '', species: 'Dog', breed: '', age: '', weight: '' });
        } catch (error) {
            toast.error('Failed to add pet');
        } finally {
            setSavingPet(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading profile dashboard...</div>;
    }

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-10">
                {/* ── Back Navigation ── */}
                <div className="mb-6 flex justify-start">
                    <Link 
                        to="/"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-200 active:scale-[0.98] group"
                    >
                        <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-0.5">arrow_back</span>
                        <span className="text-sm font-bold">Back to Home</span>
                    </Link>
                </div>

                {/* Profile Header Card */}
                <section className="bg-white rounded-xl shadow-sm p-6 md:p-8 mb-10 border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-100 to-emerald-50 overflow-hidden">
                        {user?.cover_url && (
                            <img src={user.cover_url} alt="Cover" className="w-full h-full object-cover" />
                        )}
                    </div>
                    
                    <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 mt-16 md:mt-20">
                        <div className="relative group cursor-pointer" onClick={() => navigate('/edit-profile')}>
                            <img alt="Profile avatar"
                                 className="w-28 h-28 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-white shadow-md group-hover:opacity-80 transition-opacity bg-white" 
                                 src={user?.profile_pic_url || `https://ui-avatars.com/api/?name=${user?.first_name}+${user?.last_name}&background=d4e3ff&color=005da7`} />
                            <span className="absolute bottom-2 right-2 bg-emerald-500 w-5 h-5 rounded-full border-2 border-white"></span>
                            <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 text-center md:text-left pt-2 md:pt-14">
                            <div className="flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
                                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900">{user?.first_name} {user?.last_name}</h1>
                                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                                    {user?.role && (() => {
                                        const badge = getRoleBadge(user.role);
                                        return (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.class}`}>
                                                <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                                                {badge.label}
                                            </span>
                                        );
                                    })()}
                                    {user?.active_subscription && (
                                        <PremiumBadge subscription={user.active_subscription} />
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 mt-2 text-sm">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                    <span>Cairo, Egypt</span>
                                </div>
                                {user?.role !== 'vendor' && (
                                    <button 
                                        onClick={handleOpenConnectionsModal}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50/85 to-indigo-50/85 hover:from-blue-100/90 hover:to-indigo-100/90 text-blue-600 border border-blue-200/40 rounded-full font-bold transition-all hover:scale-[1.03] shadow-sm active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-sm">group</span>
                                        <span>{user?.connections_count || 0} Connections</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex gap-3 w-full md:w-auto justify-center md:justify-end">
                            <Link to="/edit-profile" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all text-sm whitespace-nowrap">Edit Profile</Link>
                        </div>
                    </div>
                    
                    <div className="mt-8 border-t border-slate-100 pt-6">
                        <p className="text-slate-600 leading-relaxed max-w-2xl text-sm md:text-base">
                            {user?.bio || 'Pet lover and proud owner. Always looking for the best care and community for my furry friends.'}
                        </p>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    {/* Left Column */}
                    <div className="lg:col-span-8 flex flex-col gap-10">
                        {/* My Pets Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6 px-1">
                                <h2 className="text-xl font-bold text-slate-900">My Pets</h2>
                                <Link to="/manage-pet?id=new" className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">add</span> Add Pet
                                </Link>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {pets.length === 0 ? (
                                    <div className="col-span-2 text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-100">
                                        <span className="material-symbols-outlined text-5xl mb-3 block">pets</span>
                                        <p className="font-semibold">No pets yet</p>
                                        <p className="text-sm mt-1">Click "Add New Pet" to get started!</p>
                                    </div>
                                ) : (
                                    pets.map(pet => (
                                        <Link key={pet.id} to={`/manage-pet?id=${pet.id}`} className="block bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                                            <div className="h-48 overflow-hidden bg-slate-100 flex items-center justify-center relative">
                                                <img alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                     src={pet.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pet.name)}&background=d4e3ff&color=005da7&rounded=true`} />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                    <span className="text-white font-bold bg-blue-600/90 px-4 py-2 rounded-full flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">edit</span> Manage Pet</span>
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900">{pet.name}</h3>
                                                        <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider">{pet.breed || pet.species}</span>
                                                    </div>
                                                    {pet.age_years && <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full">{pet.age_years} yrs</div>}
                                                </div>
                                                <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50">
                                                    <div className="flex items-center gap-1 text-slate-400">
                                                        <span className="material-symbols-outlined text-sm">medical_services</span>
                                                        <span className="text-[12px]">{pet.species}</span>
                                                    </div>
                                                    {pet.weight_kg && (
                                                        <div className="flex items-center gap-1 text-slate-400">
                                                            <span className="material-symbols-outlined text-sm">monitor_weight</span>
                                                            <span className="text-[12px]">{pet.weight_kg} kg</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Community Activity */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-6 px-1">Recent Community Activity</h2>
                            <div className="flex flex-col gap-6">
                                {posts.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-100">
                                        <span className="material-symbols-outlined text-5xl mb-3 block">forum</span>
                                        <p className="font-semibold">No activity yet</p>
                                        <p className="text-sm mt-1">Share something with the community!</p>
                                    </div>
                                ) : (
                                    posts.slice(0, 3).map(p => (
                                        <div key={p.id} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-3 mb-4">
                                                <img alt={p.first_name} className="w-10 h-10 rounded-full object-cover" 
                                                     src={p.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.first_name + ' ' + p.last_name)}&background=d4e3ff&color=005da7`} />
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-sm">{p.first_name} {p.last_name}</h4>
                                                    <p className="text-[12px] text-slate-400">{new Date(p.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 text-sm mb-4">{p.content}</p>
                                            {p.image_url && <img src={p.image_url} className="w-full rounded-xl object-cover max-h-48 mb-4" alt="Post" />}
                                            <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <span className="material-symbols-outlined text-[20px]">favorite</span> {p.likes_count}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                    <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span> {p.comments_count}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 flex flex-col gap-8">
                        {/* Subscription */}
                        <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-gradient-to-r from-indigo-900 to-blue-800 p-5 flex items-center justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2 relative z-10">
                                    <span className="material-symbols-outlined text-amber-400">deployed_code</span>
                                    PulseBox
                                </h2>
                                {subscription ? (
                                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider relative z-10 shadow-sm">Active</span>
                                ) : (
                                    <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider relative z-10 shadow-sm">Inactive</span>
                                )}
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-center">
                                {subscription ? (
                                    <>
                                        <p className="font-bold text-slate-900 text-lg">{subscription.plan_name || 'Premium Toy & Treat Box'}</p>
                                        <p className="text-sm text-slate-500 mb-5">Renews on {new Date(subscription.next_billing_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        
                                        <div className="mb-6">
                                            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-2">
                                                <span>Preparing</span>
                                                <span className="text-blue-600">Shipped</span>
                                                <span>Delivered</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div className="h-full bg-blue-600 w-1/2 rounded-full relative">
                                                    <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button className="w-full mt-auto bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-100 transition-colors flex justify-center items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">settings</span> Manage Subscription
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                        </div>
                                        <p className="font-bold text-slate-800 mb-2">No Active Subscription</p>
                                        <p className="text-sm text-slate-500 mb-6">Get premium toys and treats delivered monthly.</p>
                                        <Link to="/marketplace?shop=PulseBox" className="w-full inline-flex bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors justify-center items-center gap-2 shadow-sm">
                                            Discover PulseBox
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Pet Hosting Shortcut */}
                        <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                            <div className="relative z-10">
                                <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-500">home</span>
                                    Pet Hosting
                                </h2>
                                <p className="text-sm text-slate-500 mb-6">Earn money by hosting pets in your home while their owners are away.</p>
                                <button 
                                    onClick={() => navigate('/community#hosting')} 
                                    className="w-full bg-purple-50 hover:bg-purple-600 text-purple-600 hover:text-white border border-purple-100 font-bold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[18px]">settings</span> Become a Host
                                </button>
                            </div>
                        </section>

                        {/* Achievements */}
                        <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>workspace_premium</span>
                                Achievements
                            </h2>
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">award_star</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">Top Contributor</p>
                                        <p className="text-[11px] text-slate-500 uppercase tracking-tight">Level 4 Member</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">verified</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">Certified Pet Parent</p>
                                        <p className="text-[11px] text-slate-500 uppercase tracking-tight">Wellness Records Verified</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Preferences / Notification Settings */}
                        <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">settings</span>
                                Preferences
                            </h2>
                            <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="pr-2 text-left">
                                    <p className="font-semibold text-sm text-slate-900">Connection Post Alerts</p>
                                    <p className="text-[11px] text-slate-500">Get notified when a connection posts in community</p>
                                </div>
                                <button
                                    onClick={handleToggleMuteConnectionPosts}
                                    type="button"
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        !(user?.mute_connection_posts) ? 'bg-blue-600' : 'bg-slate-200'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            !(user?.mute_connection_posts) ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </section>

                        {/* Action Button */}
                        <button onClick={() => setIsAddPetOpen(true)} className="w-full bg-blue-600 text-white py-4 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                            <span className="material-symbols-outlined text-[20px]">add</span> Add New Pet
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Pet Modal */}
            {isAddPetOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Add New Pet</h3>
                            <button onClick={() => setIsAddPetOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddPet} className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Pet Name *</label>
                                <input type="text" placeholder="e.g. Buddy" required value={newPet.name} onChange={(e) => setNewPet({...newPet, name: e.target.value})}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Species *</label>
                                    <select required value={newPet.species} onChange={(e) => setNewPet({...newPet, species: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all">
                                        <option value="Dog">Dog</option>
                                        <option value="Cat">Cat</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Breed</label>
                                    <input type="text" placeholder="e.g. Poodle" value={newPet.breed} onChange={(e) => setNewPet({...newPet, breed: e.target.value})}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Age (years)</label>
                                    <input type="number" min="0" placeholder="e.g. 3" value={newPet.age} onChange={(e) => setNewPet({...newPet, age: e.target.value})}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Weight (kg)</label>
                                    <input type="number" min="0" step="0.1" placeholder="e.g. 28.5" value={newPet.weight} onChange={(e) => setNewPet({...newPet, weight: e.target.value})}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"/>
                                </div>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsAddPetOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
                                <button type="submit" disabled={savingPet} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                                    {savingPet ? 'Saving...' : 'Save Pet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Connections Modal */}
            {isConnectionsModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-md w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100/50 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-slate-900">Connections</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Your mutual network of pet owners & specialists</p>
                            </div>
                            <button onClick={() => setIsConnectionsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200/50 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
                            {connectionsLoading ? (
                                <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs font-semibold">Retrieving your network...</span>
                                </div>
                            ) : connections.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">group</span>
                                    <p className="font-semibold text-sm">No connections yet</p>
                                    <p className="text-xs mt-1 px-4">Connect with veterinarians, trainers, or other owners in the community to start direct chatting!</p>
                                </div>
                            ) : (
                                connections.map(conn => {
                                    const badge = getRoleBadge(conn.role);
                                    return (
                                        <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100 hover:border-blue-100 transition-all hover:bg-white hover:shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    alt={`${conn.first_name} avatar`} 
                                                    className="w-11 h-11 rounded-xl object-cover bg-slate-100 border border-slate-100" 
                                                    src={conn.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conn.first_name + ' ' + conn.last_name)}&background=d4e3ff&color=005da7`} 
                                                />
                                                <div className="text-left">
                                                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{conn.first_name} {conn.last_name}</h4>
                                                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 rounded text-[8px] font-black uppercase tracking-wider ${badge.class}`}>
                                                        <span className="material-symbols-outlined text-[10px]">{badge.icon}</span>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleChatNow(conn)}
                                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-full text-xs transition-all shadow-sm shadow-blue-500/10 hover:scale-[1.03]"
                                            >
                                                <span className="material-symbols-outlined text-sm">chat</span>
                                                <span>Chat</span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
