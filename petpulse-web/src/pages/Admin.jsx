import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Admin = () => {
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('overview');
    
    // Data states
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [posts, setPosts] = useState([]);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const headers = { Authorization: `Bearer ${token}` };
                
                if (activeTab === 'overview') {
                    if (!analytics) {
                        const res = await axios.get(`${API_BASE}/admin/analytics`, { headers });
                        setAnalytics(res.data);
                    }
                } else if (activeTab === 'users') {
                    const res = await axios.get(`${API_BASE}/admin/users`, { headers });
                    setUsers(res.data.users || []);
                } else if (activeTab === 'services') {
                    if (services.length === 0) {
                        const res = await axios.get(`${API_BASE}/admin/services`, { headers });
                        setServices(res.data.services || []);
                    }
                } else if (activeTab === 'bookings') {
                    if (bookings.length === 0) {
                        const res = await axios.get(`${API_BASE}/admin/bookings`, { headers });
                        setBookings(res.data.bookings || []);
                    }
                } else if (activeTab === 'community') {
                    const res = await axios.get(`${API_BASE}/admin/posts`, { headers });
                    setPosts(res.data.posts || []);
                }
            } catch (error) {
                console.error(`Failed to load ${activeTab}:`, error);
                toast.error(`Failed to load data for ${activeTab}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab, token, user]);

    // Helpers
    const exportToCSV = (data, filename) => {
        if (!data || !data.length) {
            toast.error("No data to export!");
            return;
        }
        
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => 
            Object.values(obj).map(val => 
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
            ).join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Export successful");
    };

    const handleVerify = async (userId, status) => {
        try {
            await axios.put(`${API_BASE}/admin/verify/${userId}`, 
                { status: status ? 'approved' : 'rejected' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Profile ${status ? 'Approved' : 'Rejected'} Successfully!`);
            const res = await axios.get(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
            setUsers(res.data.users || []);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Verification failed');
        }
    };

    const handleBanToggle = async (userId, isBanned) => {
        if (!window.confirm(`Are you sure you want to ${isBanned ? 'ban' : 'unban'} this user?`)) return;
        try {
            await axios.put(`${API_BASE}/admin/users/${userId}/ban`, 
                { is_banned: isBanned },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`User ${isBanned ? 'banned' : 'unbanned'} successfully`);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: isBanned } : u));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Action failed');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("WARNING: Are you absolutely sure you want to permanently delete this user? This action cannot be undone and will destroy all associated data.")) return;
        try {
            await axios.delete(`${API_BASE}/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('User permanently deleted');
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Deletion failed');
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this community post?")) return;
        try {
            await axios.delete(`${API_BASE}/admin/posts/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Post deleted');
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete post');
        }
    };

    // Render logic
    if (loading && activeTab === 'overview' && !analytics) {
        return <div className="flex items-center justify-center min-h-screen text-slate-500 gap-2"><span className="material-symbols-outlined animate-spin">refresh</span> Loading Command Center...</div>;
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

    const renderOverview = () => {
        if (!analytics) return null;
        return (
            <div className="animate-fade-in">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">Platform Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined">payments</span></div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{analytics.summary.growth.revenue}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Total Revenue</p>
                        <p className="text-2xl font-black text-slate-900">${analytics.summary.totalRevenue.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined">group</span></div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{analytics.summary.growth.customers}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Total Users</p>
                        <p className="text-2xl font-black text-slate-900">{analytics.summary.totalUsers.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><span className="material-symbols-outlined">receipt_long</span></div>
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">{analytics.summary.growth.avgBookingValue}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Avg. Booking Value</p>
                        <p className="text-2xl font-black text-slate-900">${analytics.summary.avgBookingValue}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><span className="material-symbols-outlined">task_alt</span></div>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Service Fulfillment</p>
                        <p className="text-2xl font-black text-slate-900">{analytics.summary.serviceFulfillment}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                                <span className="material-symbols-outlined text-blue-600">moving</span> Revenue Growth
                            </h2>
                            <select className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-600">
                                <option>Last 6 Months</option>
                            </select>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { month: 'Jan', revenue: 4000 },
                                    { month: 'Feb', revenue: 5200 },
                                    { month: 'Mar', revenue: 6100 },
                                    { month: 'Apr', revenue: 8400 },
                                    { month: 'May', revenue: 10200 },
                                    { month: 'Jun', revenue: 14500 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                                <span className="material-symbols-outlined text-indigo-600">show_chart</span> User Acquisition
                            </h2>
                            <select className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-600">
                                <option>Last 6 Months</option>
                            </select>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[
                                    { month: 'Jan', users: 150, providers: 20 },
                                    { month: 'Feb', users: 300, providers: 45 },
                                    { month: 'Mar', users: 550, providers: 80 },
                                    { month: 'Apr', users: 900, providers: 120 },
                                    { month: 'May', users: 1400, providers: 180 },
                                    { month: 'Jun', users: 2100, providers: 250 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <Tooltip contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                                    <Line type="monotone" name="Pet Owners" dataKey="users" stroke="#2563eb" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                    <Line type="monotone" name="Providers" dataKey="providers" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900"><span className="material-symbols-outlined text-blue-600">bar_chart</span> Top Services Performance</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                                    <th className="px-6 py-4">Service Category</th>
                                    <th className="px-6 py-4">Bookings</th>
                                    <th className="px-6 py-4">Revenue Generated</th>
                                    <th className="px-6 py-4">Growth</th>
                                    <th className="px-6 py-4 text-right">Trend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {analytics.servicesPerformance.map(sp => (
                                    <tr key={sp.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">{sp.icon}</span></div>
                                            {sp.name}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-600">{sp.bookings}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-600">${sp.revenue.toLocaleString()}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-600">{sp.growth}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${sp.growth.includes('-') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {sp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderUsers = () => {
        let filteredUsers = users.filter(u => 
            (u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
             u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (roleFilter === 'all' || u.role === roleFilter)
        );

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <button onClick={() => exportToCSV(filteredUsers, 'Users_Export')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                    </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">manage_accounts</span> 
                            <h2 className="text-lg font-bold text-slate-900">Platform Users</h2>
                        </div>
                        <div className="flex w-full xl:w-auto gap-3">
                            <select 
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-600"
                            >
                                <option value="all">All Roles</option>
                                <option value="owner">Pet Owners</option>
                                <option value="vet">Veterinarians</option>
                                <option value="trainer">Trainers</option>
                                <option value="admin">Admins</option>
                            </select>
                            <div className="relative flex-1 xl:w-64">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role / Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Moderation Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading && users.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">Loading users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">No users found.</td></tr>
                                ) : (
                                    filteredUsers.map(u => {
                                        const isProvider = u.role === 'vet' || u.role === 'trainer';
                                        const isApproved = u.verification_status === 'approved';
                                        
                                        const roleColor = u.role === 'vet' ? 'bg-indigo-50 text-indigo-600' : 
                                                          u.role === 'trainer' ? 'bg-orange-50 text-orange-600' : 
                                                          u.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-blue-50 text-blue-600';

                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50 transition-colors bg-white">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={u.profile_pic_url || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=f1f5f9`} className="w-10 h-10 rounded-full object-cover border border-slate-100" alt="avatar" />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-slate-800">{u.first_name} {u.last_name}</p>
                                                                {u.is_banned && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-sm">Banned</span>}
                                                            </div>
                                                            <p className="text-xs text-slate-500">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${roleColor}`}>
                                                        {u.role}
                                                    </span>
                                                    <div className="text-xs text-slate-500">
                                                        {u.role === 'vet' && u.clinic_name && <span className="block">Clinic: {u.clinic_name}</span>}
                                                        {u.role === 'vet' && u.license_number && <span className="block">Lic: {u.license_number}</span>}
                                                        {u.role === 'trainer' && u.specialties && <span className="block truncate max-w-[150px]">{u.specialties}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isProvider ? (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                            <span className="material-symbols-outlined text-[14px]">{isApproved ? 'check_circle' : 'hourglass_empty'}</span>
                                                            {isApproved ? 'Verified' : 'Pending'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Active</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 flex-wrap max-w-[180px] ml-auto">
                                                        {isProvider && (
                                                            !isApproved ? (
                                                                <button onClick={() => handleVerify(u.id, true)} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded transition-colors border border-emerald-200">
                                                                    <span className="material-symbols-outlined text-[14px]">check</span> Approve
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleVerify(u.id, false)} className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded transition-colors border border-slate-200">
                                                                    <span className="material-symbols-outlined text-[14px]">close</span> Revoke
                                                                </button>
                                                            )
                                                        )}
                                                        
                                                        {u.role !== 'admin' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleBanToggle(u.id, !u.is_banned)} 
                                                                    className={`flex items-center gap-1 px-2 py-1 font-bold text-xs rounded transition-colors border ${u.is_banned ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">{u.is_banned ? 'lock_open' : 'block'}</span> 
                                                                    {u.is_banned ? 'Unban' : 'Ban'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteUser(u.id)} 
                                                                    className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded transition-colors border border-red-200"
                                                                    title="Permanently Delete User"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
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
        );
    };

    const renderCommunity = () => {
        let filteredPosts = posts.filter(p => 
            p.content?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">Community Moderation</h1>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">forum</span> 
                            <h2 className="text-lg font-bold text-slate-900">Global Feed</h2>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input 
                                type="text" 
                                placeholder="Search post content..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1 p-6 bg-slate-50/50">
                        {loading && posts.length === 0 ? (
                            <div className="text-center text-slate-500 py-12">Loading posts...</div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="text-center text-slate-500 py-12">No posts found.</div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {filteredPosts.map(p => (
                                    <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col">
                                        <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-3">
                                            <div className="flex items-center gap-3">
                                                <img src={p.profile_pic_url || `https://ui-avatars.com/api/?name=${p.first_name}+${p.last_name}&background=f1f5f9`} className="w-8 h-8 rounded-full object-cover" alt="avatar" />
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{p.first_name} {p.last_name}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeletePost(p.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Delete Post"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                        <p className="text-slate-700 text-sm mb-3 flex-1 whitespace-pre-wrap">{p.content}</p>
                                        {p.image_url && (
                                            <div className="mt-2 h-40 bg-slate-100 rounded-lg overflow-hidden mb-3">
                                                <img src={p.image_url} className="w-full h-full object-cover" alt="post attachment" />
                                            </div>
                                        )}
                                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">favorite</span> {p.likes_count} likes
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderServices = () => {
        let filteredServices = services.filter(s => 
            s.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1>
                    <button onClick={() => exportToCSV(filteredServices, 'Services_Export')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                    </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">inventory_2</span> 
                            <h2 className="text-lg font-bold text-slate-900">Platform Services</h2>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input 
                                type="text" 
                                placeholder="Search services..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4">Provider</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading && services.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Loading services...</td></tr>
                                ) : filteredServices.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">No services found.</td></tr>
                                ) : (
                                    filteredServices.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors bg-white">
                                            <td className="px-6 py-4 font-bold text-slate-800">{s.title}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-600"><Link to={`/owner-profile?id=${s.provider_id}`} className="hover:text-blue-600 hover:underline">{s.first_name} {s.last_name}</Link></td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600">{s.category}</span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">${s.price}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{new Date(s.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderBookings = () => {
        let filteredBookings = bookings.filter(b => 
            b.service_title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            b.client_first_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Booking Ledger</h1>
                    <button onClick={() => exportToCSV(filteredBookings, 'Bookings_Export')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                    </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">book_online</span> 
                            <h2 className="text-lg font-bold text-slate-900">Platform Transactions</h2>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input 
                                type="text" 
                                placeholder="Search bookings..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                                    <th className="px-6 py-4">ID / Service</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Provider</th>
                                    <th className="px-6 py-4">Schedule</th>
                                    <th className="px-6 py-4">Total</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading && bookings.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading bookings...</td></tr>
                                ) : filteredBookings.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No bookings found.</td></tr>
                                ) : (
                                    filteredBookings.map(b => (
                                        <tr key={b.id} className="hover:bg-slate-50 transition-colors bg-white">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800">{b.service_title}</p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-1">#{b.id.substring(0,8)}</p>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-600">{b.client_first_name} {b.client_last_name}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-600">{b.provider_first_name} {b.provider_last_name}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                                                {new Date(b.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'})}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">${b.total_price}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                    b.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                    b.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex flex-shrink-0 z-20">
                <div className="h-16 flex items-center px-6 border-b border-slate-200">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/assets/images/logoo.png" alt="PetPulse logo" className="h-8 w-8 object-contain" onError={(e) => e.target.style.display='none'} />
                        <span className="text-lg font-bold text-blue-600 tracking-tight">Admin<span className="text-slate-800">Pulse</span></span>
                    </Link>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <button 
                        onClick={() => { setActiveTab('overview'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                        Overview
                    </button>
                    <button 
                        onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">group</span>
                        Users & Moderation
                    </button>
                    <button 
                        onClick={() => { setActiveTab('community'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'community' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">forum</span>
                        Community Posts
                    </button>
                    <button 
                        onClick={() => { setActiveTab('services'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'services' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                        Platform Services
                    </button>
                    <button 
                        onClick={() => { setActiveTab('bookings'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'bookings' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">book_online</span>
                        Booking Ledger
                    </button>
                    <div className="my-4 border-t border-slate-100"></div>
                    <Link to="/" className="flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:bg-slate-50 font-medium rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[20px]">exit_to_app</span>
                        Back to App
                    </Link>
                </nav>
                <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center font-bold text-blue-600 shadow-sm">
                            {user.first_name ? user.first_name[0].toUpperCase() : 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate text-slate-900">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-slate-500 font-medium">Administrator</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-6xl mx-auto h-full">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'community' && renderCommunity()}
                        {activeTab === 'services' && renderServices()}
                        {activeTab === 'bookings' && renderBookings()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Admin;
