import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const MOCK_OWNERS = {
    'mock_owner1': { id: 'mock_owner1', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=mock1', bio: 'I love dogs and have been taking care of them for years. Currently hosting Milo!', pets: [{id: 'mock_milo', name: 'Milo', type: 'Dog', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIYDqvNenCMOIcovCc3-8JiqPFIFVMge8QT3kBMGgY00RFtQZz36_5xeoOW6u0MeSzrPwrScDyyg5-PmQsx0vDvS33gAEL7AofIxjdu2mkHYU3JR6laFwWrOF-E9R5GDlnQPOBWNtOfKufF4lhgc4Dwztk2BpH4JSL_NInA1FCEUwfhpqx9AKWHdhOoGlYnSN3rtBpm1mrdIVYyiV4T5xAXLW--qQXHJOKiNqx3S0y0vDyaF70Yd0s8d8OeXirjFs5OhSGas3ruxiK'}] },
    'mock_owner2': { id: 'mock_owner2', name: 'Sarah Smith', avatar: 'https://i.pravatar.cc/150?u=mock2', bio: 'Proud cat mom. Luna is my favorite little troublemaker.', pets: [{id: 'mock_luna', name: 'Luna', type: 'Cat', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1HTaaBQPg3n_nYf7w6etlvKrVwf6dxEoFOZAPH95jlQc0X8myrLHYV0YL5Tjo0PUsuMLUWa_wz6B-FWk6aw_x0e2Y7Gt3afAJ-B-ZQbm9wvnJhqYFndgXfVSblSmxeC_6YPpgL9xIOClSCE8MnmBWbd-JVD25BfeKNsA2ALnh4F-E4L3LurtCfYQ7drMMb8AFlDhQhAgC_K1MwBGFKPVHsC4M8MgOQETv_vWP2OkI26iXeggtM98IefRiHj22amdfkyzpMNZEBBXd'}] },
    'mock_owner3': { id: 'mock_owner3', name: 'Mike Johnson', avatar: 'https://i.pravatar.cc/150?u=mock3', bio: 'Always out on a hike with my Beagle, Charlie.', pets: [{id: 'mock_charlie', name: 'Charlie', type: 'Dog', img: 'https://images.unsplash.com/photo-1537151608804-ea6f117c7608?w=400'}] },
    'mock_owner4': { id: 'mock_owner4', name: 'Emily Davis', avatar: 'https://i.pravatar.cc/150?u=mock4', bio: 'Passionate about animal rescue. Bella is my current foster fail!', pets: [{id: 'mock_bella', name: 'Bella', type: 'Cat', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400'}] },
};

const OwnerProfile = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const ownerIdParam = searchParams.get('id');

    const [owner, setOwner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chatStatus, setChatStatus] = useState(null);
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        const fetchOwner = async () => {
            let idToFetch = ownerIdParam;
            let isMyProfile = false;

            if (!idToFetch) {
                if (!token) { navigate('/login'); return; }
                isMyProfile = true;
                idToFetch = user?.id; // Fallback to current user
            }

            if (isMyProfile && user) {
                setOwner({
                    id: user.id,
                    name: `${user.first_name} ${user.last_name}`,
                    avatar: user.profile_pic_url,
                    bio: user.bio || 'Pet lover on PetPulse.',
                    pets: [] // We could fetch user's own pets here if needed
                });
                setLoading(false);
            } else if (idToFetch && String(idToFetch).startsWith('mock_')) {
                setOwner(MOCK_OWNERS[idToFetch]);
                setLoading(false);
            } else if (idToFetch) {
                try {
                    const res = await axios.get(`${API_BASE}/users/${idToFetch}`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    });
                    const data = res.data.user;
                    
                    if (data.role === 'trainer' || data.role === 'vet') {
                        navigate(`/trainer-details?id=${data.id}`);
                        return;
                    }

                    setOwner({
                        id: data.id,
                        name: `${data.first_name} ${data.last_name}`,
                        avatar: data.profile_pic_url,
                        bio: data.bio || 'Pet lover on PetPulse.',
                        pets: [] // Update backend to include pets if needed
                    });
                } catch (error) {
                    console.error("Failed to fetch owner", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchOwner();
    }, [ownerIdParam, user, token, navigate]);

    useEffect(() => {
        const checkStatus = async () => {
            if (!owner || !token || user?.id === owner.id || String(owner.id).startsWith('mock_')) return;
            
            try {
                const res = await axios.get(`${API_BASE}/chat/status?receiver_id=${owner.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setChatStatus(res.data.status);
            } catch (error) {
                console.error("Failed to check chat status");
            }
        };
        checkStatus();
    }, [owner, token, user]);

    const handleMessage = async () => {
        if (!user) { toast.error('Please login first'); navigate('/login'); return; }
        if (isRequesting) return;

        if (String(owner.id).startsWith('mock_')) {
            toast.success('Mock chat request sent!');
            setChatStatus('pending');
            return;
        }

        setIsRequesting(true);
        try {
            await axios.post(`${API_BASE}/chat/request`, { receiver_id: owner.id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Connection request sent!');
            setChatStatus('pending');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send request');
        } finally {
            setIsRequesting(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading profile...</div>;
    }

    if (!owner) {
        return (
            <div className="text-center py-20">
                <span className="material-symbols-outlined text-5xl text-slate-300 block mb-4">person_off</span>
                <h2 className="text-xl font-bold text-slate-800">Owner Not Found</h2>
                <button onClick={() => navigate(-1)} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl">Go Back</button>
            </div>
        );
    }

    const isMyProfile = user && user.id === owner.id;

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-8">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-12 relative">
                    <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                    </div>
                    
                    <div className="px-8 pb-8 md:px-12 md:pb-12 relative">
                        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end -mt-20 mb-8">
                            <div className="w-36 h-36 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-xl flex-shrink-0 relative z-10">
                                {owner.avatar ? (
                                    <img src={owner.avatar} alt={owner.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-5xl font-bold text-slate-400">{owner.name[0].toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex-grow pt-4 md:pt-0">
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{owner.name}</h1>
                                <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px] text-blue-500">verified</span> Verified Member</span>
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px] text-amber-400" style={{fontVariationSettings: "'FILL' 1"}}>star</span> 4.9 Rating</span>
                                </div>
                            </div>

                            {isMyProfile ? (
                                <button onClick={() => navigate('/edit-profile')} className="w-full md:w-auto mt-4 md:mt-0 bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit My Profile
                                </button>
                            ) : chatStatus === 'pending' ? (
                                <button disabled className="w-full md:w-auto mt-4 md:mt-0 bg-slate-100 text-slate-400 font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                                    <span className="material-symbols-outlined text-[18px]">schedule</span> Pending
                                </button>
                            ) : chatStatus === 'accepted' ? (
                                <button onClick={() => navigate(`/messages?user=${owner.id}`)} className="w-full md:w-auto mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
                                    <span className="material-symbols-outlined text-[20px]">chat</span> Chat Now
                                </button>
                            ) : (
                                <button onClick={handleMessage} disabled={isRequesting} className="w-full md:w-auto mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50">
                                    <span className="material-symbols-outlined text-[20px]">{isRequesting ? 'sync' : 'chat'}</span> 
                                    {isRequesting ? 'Sending...' : 'Send Message'}
                                </button>
                            )}
                        </div>

                        <div className="bg-blue-50/50 rounded-2xl p-6 md:p-8 border border-blue-100/50 mb-10">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">person</span> About Me
                            </h3>
                            <p className="text-slate-700 leading-relaxed text-base">{owner.bio}</p>
                        </div>

                        {owner.pets && owner.pets.length > 0 && (
                            <div className="border-t border-slate-100 pt-10">
                                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600">pets</span> Pets Hosted by this Owner
                                </h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {owner.pets.map(p => (
                                        <Link key={p.id} to={`/pet-profile?id=${p.id}`} className="block group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-blue-600 hover:shadow-lg transition-all">
                                            <div className="h-40 bg-slate-100 relative overflow-hidden">
                                                <img src={p.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={p.name} />
                                            </div>
                                            <div className="p-4 flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</h4>
                                                    <p className="text-xs text-slate-500">{p.type}</p>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">arrow_forward</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-100 pt-10 mt-10">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>grade</span> Community Recommendations
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-0.5">
                                    <img src="https://i.pravatar.cc/150?img=32" className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-50" alt="Amanda R." />
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-slate-800 text-sm">Amanda R.</h4>
                                            <span className="text-xs font-semibold text-slate-400">2 weeks ago</span>
                                        </div>
                                        <div className="flex text-amber-400 mb-2">
                                            {[1,2,3,4,5].map(star => <span key={star} className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">"An amazing pet parent! I've hosted their pets a few times and they are always well-behaved and a joy to have around. Highly recommend connecting!"</p>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-0.5">
                                    <img src="https://i.pravatar.cc/150?img=11" className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-50" alt="David M." />
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-slate-800 text-sm">David M.</h4>
                                            <span className="text-xs font-semibold text-slate-400">1 month ago</span>
                                        </div>
                                        <div className="flex text-amber-400 mb-2">
                                            {[1,2,3,4,5].map(star => <span key={star} className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">"Great community member. Very knowledgeable about local pet spots and always willing to help out fellow pet owners with advice and recommendations."</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerProfile;
