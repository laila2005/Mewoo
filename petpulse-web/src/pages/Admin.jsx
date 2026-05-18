import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Admin = () => {
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            setLoading(false);
            return;
        }

        const fetchProviders = async () => {
            try {
                const res = await axios.get(`${API_BASE}/admin/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const allUsers = res.data.users || [];
                const providerUsers = allUsers.filter(u => u.role === 'vet' || u.role === 'trainer');
                
                let verifiedCount = 0;
                let pendingCount = 0;
                providerUsers.forEach(p => {
                    if (p.is_verified) verifiedCount++;
                    else pendingCount++;
                });

                setStats({
                    total: providerUsers.length,
                    verified: verifiedCount,
                    pending: pendingCount
                });
                
                setProviders(providerUsers);
            } catch (error) {
                console.error("Failed to load users:", error);
                toast.error('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        fetchProviders();
    }, [token, user]);

    const handleVerify = async (userId, status) => {
        try {
            await axios.put(`${API_BASE}/admin/verify/${userId}`, 
                { is_verified: status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success(`Profile ${status ? 'Approved' : 'Revoked'} Successfully!`);
            
            // Update local state to reflect change without full reload
            setProviders(prev => prev.map(p => p.id === userId ? { ...p, is_verified: status } : p));
            setStats(prev => ({
                ...prev,
                verified: status ? prev.verified + 1 : prev.verified - 1,
                pending: status ? prev.pending - 1 : prev.pending + 1
            }));
            
        } catch (error) {
            toast.error(error.response?.data?.error || 'Verification failed');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-slate-500">Loading admin dashboard...</div>;
    }

    if (!user || user.role !== 'admin') {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">gpp_bad</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">Access Denied</h3>
                    <p className="text-slate-500 mb-6">You must be an administrator to view this page.</p>
                    <button onClick={() => navigate('/')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">Return to Home</button>
                </div>
            </div>
        );
    }

    const filteredProviders = providers.filter(p => 
        p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex flex-shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-slate-200">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/assets/images/logoo.png" alt="PetPulse logo" className="h-8 w-8 object-contain" onError={(e) => e.target.style.display='none'} />
                        <span className="text-lg font-bold text-blue-600 tracking-tight">Admin<span className="text-slate-800">Pulse</span></span>
                    </Link>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 bg-blue-50 text-blue-600 font-semibold rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                        Dashboard
                    </button>
                    <Link to="/" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 font-medium rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[20px]">exit_to_app</span>
                        Back to App
                    </Link>
                </nav>
                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-blue-600 flex items-center justify-center font-bold text-slate-600">
                            {user.first_name ? user.first_name[0].toUpperCase() : 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate text-slate-900">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-slate-500">System Administrator</p>
                        </div>
                    </div>
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">logout</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-6xl mx-auto">
                        
                        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Overview</h1>

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined">group</span></div>
                                <div><p className="text-sm font-semibold text-slate-500">Total Providers</p><p className="text-2xl font-bold text-slate-900">{stats.total}</p></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><span className="material-symbols-outlined">verified_user</span></div>
                                <div><p className="text-sm font-semibold text-slate-500">Verified</p><p className="text-2xl font-bold text-slate-900">{stats.verified}</p></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><span className="material-symbols-outlined">pending_actions</span></div>
                                <div><p className="text-sm font-semibold text-slate-500">Pending Approvals</p><p className="text-2xl font-bold text-slate-900">{stats.pending}</p></div>
                            </div>
                        </div>

                        {/* Table Section */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900"><span className="material-symbols-outlined text-blue-600">manage_accounts</span> Professional Profiles</h2>
                                <div className="relative w-full sm:w-64">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                    <input 
                                        type="text" 
                                        placeholder="Search providers..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                                            <th className="px-6 py-4">Provider Info</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredProviders.length === 0 ? (
                                            <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 bg-white">No professional profiles found.</td></tr>
                                        ) : (
                                            filteredProviders.map(p => {
                                                const isVerified = p.is_verified;
                                                const roleColor = p.role === 'vet' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-orange-50 text-orange-600 border-orange-200';
                                                const statusColor = isVerified ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200';
                                                
                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors bg-white group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <img src={p.profile_pic_url || `https://ui-avatars.com/api/?name=${p.first_name}+${p.last_name}&background=f1f5f9`} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
                                                                <div>
                                                                    <p className="font-bold text-slate-800">{p.first_name} {p.last_name}</p>
                                                                    <p className="text-xs text-slate-500">{p.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${roleColor}`}>
                                                                {p.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                                                                <span className="material-symbols-outlined text-[14px]">{isVerified ? 'check_circle' : 'hourglass_empty'}</span>
                                                                {isVerified ? 'Verified' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {!isVerified ? (
                                                                <button onClick={() => handleVerify(p.id, true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg transition-colors border border-emerald-200">
                                                                    <span className="material-symbols-outlined text-[16px]">check</span> Approve
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleVerify(p.id, false)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200">
                                                                    <span className="material-symbols-outlined text-[16px]">close</span> Revoke
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default Admin;
