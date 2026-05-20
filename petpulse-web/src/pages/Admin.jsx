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
    const [subscriptions, setSubscriptions] = useState([]);
    const [marketplaceProducts, setMarketplaceProducts] = useState([]);
    
    // AI Copilot state
    const [aiInsights, setAiInsights] = useState(null);
    const [aiMessages, setAiMessages] = useState([
        { 
            sender: 'ai', 
            text: "Hello! I am AdminPulse AI, your executive co-pilot. You can query any platform details or database records in natural language.\n\nFor example, try asking:\n* *'Show me all active vets'*\n* *'List recent service bookings'*\n* *'What is our total revenue breakdown?'*" 
        }
    ]);
    const [aiQueryLoading, setAiQueryLoading] = useState(false);
    const [aiQueryInput, setAiQueryInput] = useState('');
    const [refreshingInsights, setRefreshingInsights] = useState(false);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productModalMode, setProductModalMode] = useState('add');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [currentProduct, setCurrentProduct] = useState({
        id: '',
        title: '',
        description: '',
        category: 'food',
        base_price: '',
        image: '',
        badge: ''
    });

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
                } else if (activeTab === 'subscriptions') {
                    const res = await axios.get(`${API_BASE}/admin/subscriptions`, { headers });
                    setSubscriptions(res.data.subscriptions || []);
                } else if (activeTab === 'marketplace_products') {
                    const res = await axios.get(`${API_BASE}/public/products`);
                    setMarketplaceProducts(res.data.products || []);
                } else if (activeTab === 'ai_copilot') {
                    if (!aiInsights) {
                        const res = await axios.get(`${API_BASE}/admin/ai/insights`, { headers });
                        setAiInsights(res.data);
                    }
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined">payments</span></div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{analytics.summary.growth.revenue}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Total Revenue</p>
                        <p className="text-2xl font-black text-slate-900">EGP {analytics.summary.totalRevenue.toLocaleString()}</p>
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
                        <p className="text-2xl font-black text-slate-900">EGP {analytics.summary.avgBookingValue}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><span className="material-symbols-outlined">deployed_code</span></div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Live</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Active Subscriptions</p>
                        <p className="text-2xl font-black text-slate-900">{analytics.summary.activeSubscriptionsCount}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><span className="material-symbols-outlined">task_alt</span></div>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Service Fulfillment</p>
                        <p className="text-2xl font-black text-slate-900">{analytics.summary.serviceFulfillment}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-full -z-10 group-hover:bg-blue-600/10 transition-colors"></div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md"><span className="material-symbols-outlined">smart_toy</span></div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Active</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Inqaz AI Triages</p>
                        <p className="text-2xl font-black text-slate-900">
                            {(analytics.summary.aiTriagesCount ?? 0).toLocaleString()}{' '}
                            <span className={`text-xs font-bold tracking-wide ${(analytics.summary.growth.aiTriages || '').startsWith('-') ? 'text-red-500' : 'text-emerald-500'}`}>
                                {analytics.summary.growth.aiTriages || '+0%'}
                            </span>
                        </p>
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
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `EGP ${val/1000}k`} />
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
                                            <td className="px-6 py-4 font-bold text-emerald-600">EGP {s.price}</td>
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

    const renderSubscriptions = () => {
        let filteredSubs = subscriptions.filter(s => 
            s.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Subscription Ledger</h1>
                    <button onClick={() => exportToCSV(filteredSubs, 'Subscriptions_Export')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                    </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">inventory_2</span> 
                            <h2 className="text-lg font-bold text-slate-900">Active Subscriptions</h2>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input 
                                type="text" 
                                placeholder="Search subscriptions..." 
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
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Next Billing</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading && subscriptions.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading subscriptions...</td></tr>
                                ) : filteredSubs.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No subscriptions found.</td></tr>
                                ) : (
                                    filteredSubs.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors bg-white">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800">{s.first_name} {s.last_name}</p>
                                                <p className="text-[10px] text-slate-400">{s.email}</p>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-600">{s.plan_name}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">EGP {s.price}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                                                {new Date(s.next_billing_date).toLocaleDateString([], { dateStyle: 'short' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                    s.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors border border-slate-200" title="Pause Subscription">
                                                    <span className="material-symbols-outlined text-[18px]">pause</span>
                                                </button>
                                                <button className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-slate-200" title="Cancel Subscription">
                                                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                </button>
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

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
            const headers = { Authorization: `Bearer ${token}` };
            let res;
            const payload = {
                title: currentProduct.title,
                description: currentProduct.description,
                category: currentProduct.category,
                base_price: parseFloat(currentProduct.base_price),
                image: currentProduct.image,
                badge: currentProduct.badge || null
            };
            
            if (productModalMode === 'add') {
                const prodId = currentProduct.id || `p_${Date.now()}`;
                payload.id = prodId;
                res = await axios.post(`${API_BASE}/admin/products`, payload, { headers });
                toast.success('Product added successfully!');
            } else {
                res = await axios.put(`${API_BASE}/admin/products/${currentProduct.id}`, payload, { headers });
                toast.success('Product updated successfully!');
            }
            setIsProductModalOpen(false);
            const refreshRes = await axios.get(`${API_BASE}/public/products`);
            setMarketplaceProducts(refreshRes.data.products || []);
        } catch (error) {
            console.error('Failed to save product:', error);
            toast.error(error.response?.data?.error || 'Failed to save product');
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Are you sure you want to permanently delete this product from the marketplace?")) return;
        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.delete(`${API_BASE}/admin/products/${productId}`, { headers });
            toast.success('Product permanently deleted');
            setMarketplaceProducts(prev => prev.filter(p => p.id !== productId));
        } catch (error) {
            console.error('Failed to delete product:', error);
            toast.error(error.response?.data?.error || 'Failed to delete product');
        }
    };

    const handleProductImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large! Maximum limit is 5MB.");
            return;
        }
        
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload a valid image file (PNG, JPG, WEBP, etc.)");
            return;
        }
        
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'PetPulse');
        
        try {
            const headers = { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            };
            const res = await axios.post(`${API_BASE}/upload/cloudinary`, formData, { headers });
            if (res.data?.secure_url) {
                setCurrentProduct(prev => ({ ...prev, image: res.data.secure_url }));
                toast.success("Image uploaded to Cloudinary successfully!");
            } else {
                throw new Error("Invalid CDN response");
            }
        } catch (error) {
            console.error("Cloudinary upload failure:", error);
            toast.error(error.response?.data?.error || "Failed to upload image. Please try again or use a manual URL.");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File is too large! Maximum limit is 5MB.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload a valid image file.");
            return;
        }
        
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'PetPulse');
        
        try {
            const headers = { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            };
            const res = await axios.post(`${API_BASE}/upload/cloudinary`, formData, { headers });
            if (res.data?.secure_url) {
                setCurrentProduct(prev => ({ ...prev, image: res.data.secure_url }));
                toast.success("Image uploaded to Cloudinary successfully!");
            } else {
                throw new Error("Invalid CDN response");
            }
        } catch (error) {
            console.error("Cloudinary upload failure:", error);
            toast.error(error.response?.data?.error || "Failed to upload image.");
        } finally {
            setUploadingImage(false);
        }
    };

    const renderMarketplaceProducts = () => {
        let filteredProducts = marketplaceProducts.filter(p => 
            p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Marketplace Products</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage pet food, toys, accessories, and wellness products</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                setCurrentProduct({
                                    id: '',
                                    title: '',
                                    description: '',
                                    category: 'food',
                                    base_price: '',
                                    image: '',
                                    badge: ''
                                });
                                setProductModalMode('add');
                                setIsProductModalOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span> Add Product
                        </button>
                        <button 
                            onClick={() => exportToCSV(filteredProducts, 'Products_Export')} 
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">storefront</span> 
                            <h2 className="text-lg font-bold text-slate-900">Products Catalog</h2>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100">
                                <tr className="text-slate-400 text-xs uppercase tracking-wider font-bold">
                                    <th className="px-6 py-4">Product Info</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Rating / Reviews</th>
                                    <th className="px-6 py-4">Badge</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading && marketplaceProducts.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading catalog...</td></tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No products found.</td></tr>
                                ) : (
                                    filteredProducts.map(p => {
                                        let catStyle = "bg-slate-100 text-slate-800 border-slate-200";
                                        if (p.category === 'food') catStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                        else if (p.category === 'accessories') catStyle = "bg-orange-50 text-orange-700 border-orange-200";
                                        else if (p.category === 'toys') catStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                        else if (p.category === 'wellness') catStyle = "bg-purple-50 text-purple-700 border-purple-200";

                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50/55 transition-colors bg-white">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                                            <img 
                                                                src={p.image || "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80"} 
                                                                alt={p.title} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.src = "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80";
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 hover:text-blue-600 transition-colors max-w-xs truncate">{p.title}</p>
                                                            <p className="text-xs text-slate-500 max-w-xs truncate mt-0.5">{p.description}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${catStyle}`}>
                                                        {p.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-black text-emerald-600">
                                                    EGP {parseFloat(p.base_price).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-slate-700">
                                                        <span className="material-symbols-outlined text-amber-400 fill-amber-400 text-lg">star</span>
                                                        <span className="font-bold">{parseFloat(p.rating || 5.0).toFixed(1)}</span>
                                                        <span className="text-xs text-slate-400">({p.reviews || 0})</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {p.badge ? (
                                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                            {p.badge}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setCurrentProduct(p);
                                                                setProductModalMode('edit');
                                                                setIsProductModalOpen(true);
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-colors border border-slate-200"
                                                            title="Edit Product"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors border border-slate-200"
                                                            title="Delete Product"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
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

    useEffect(() => {
        if (activeTab === 'ai_copilot') {
            const container = document.getElementById('ai-chat-messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [aiMessages, aiQueryLoading, activeTab]);

    const handleAiQuerySubmit = async (e) => {
        if (e) e.preventDefault();
        if (!aiQueryInput.trim() || aiQueryLoading) return;

        const question = aiQueryInput;
        setAiQueryInput('');
        setAiQueryLoading(true);

        // Append admin message
        setAiMessages(prev => [...prev, { sender: 'admin', text: question }]);

        try {
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.post(`${API_BASE}/admin/ai/query`, { question }, { headers });
            
            // Append AI message
            setAiMessages(prev => [...prev, { 
                sender: 'ai', 
                text: res.data.answer || "I processed your request.", 
                data: res.data.data 
            }]);
        } catch (error) {
            console.error("AI query failed:", error);
            toast.error("AI Copilot failed to process request");
            setAiMessages(prev => [...prev, { 
                sender: 'ai', 
                text: "I encountered an error trying to process your request. Please ensure the API server is online and you are fully authenticated." 
            }]);
        } finally {
            setAiQueryLoading(false);
        }
    };

    const handleRefreshInsights = async () => {
        if (refreshingInsights) return;
        setRefreshingInsights(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`${API_BASE}/admin/ai/insights`, { headers });
            setAiInsights(res.data);
            toast.success("Executive AI Insights successfully regenerated!");
        } catch (error) {
            console.error("Failed to refresh AI insights:", error);
            toast.error("Failed to regenerate insights");
        } finally {
            setRefreshingInsights(false);
        }
    };

    const renderAiCopilot = () => {
        if (!aiInsights && loading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[450px] text-slate-500 gap-3">
                    <span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">psychology</span>
                    <span className="font-extrabold text-slate-800 tracking-tight text-lg">Analyzing platform metrics & generating insights...</span>
                    <p className="text-sm text-slate-400 font-semibold max-w-xs text-center leading-relaxed">AdminPulse AI is compiling database statistics and computing growth signals.</p>
                </div>
            );
        }

        if (!aiInsights) {
            return (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm my-12 animate-fade-in">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">cloud_off</span>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Executive Insights Offline</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6">We couldn't load the executive insights. Please make sure the backend server is running and fully updated.</p>
                    <button 
                        onClick={handleRefreshInsights}
                        disabled={refreshingInsights}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 mx-auto"
                    >
                        <span className={`material-symbols-outlined text-[18px] ${refreshingInsights ? 'animate-spin' : ''}`}>sync</span>
                        {refreshingInsights ? 'Retrying...' : 'Retry Connection'}
                    </button>
                </div>
            );
        }

        return (
            <div className="animate-fade-in space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600 text-3xl">smart_toy</span>
                            AI Copilot & Command Center
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Real-time intelligent platform orchestration powered by AdminPulse AI.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Copilot Active
                        </span>
                        <button 
                            onClick={handleRefreshInsights}
                            disabled={refreshingInsights}
                            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-700 px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-sm transition-all"
                        >
                            <span className={`material-symbols-outlined text-[18px] ${refreshingInsights ? 'animate-spin text-blue-600' : ''}`}>sync</span>
                            {refreshingInsights ? 'Syncing...' : 'Sync Insights'}
                        </button>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: AI Insights */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Executive Summary */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 shadow-sm space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-blue-600">subject</span>
                                Executive Summary
                            </h3>
                            <p className="text-slate-600 text-sm font-semibold leading-relaxed whitespace-pre-line">
                                {aiInsights.executive_summary}
                            </p>
                        </div>

                        {/* Growth Signals */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-blue-600">trending_up</span>
                                Growth Signals
                            </h3>
                            <div className="space-y-3">
                                {aiInsights.key_growths?.map((growth, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/10 transition-colors">
                                        <span className="material-symbols-outlined text-[20px] text-emerald-500 bg-emerald-50 p-1 rounded-lg">trending_up</span>
                                        <p className="text-sm text-slate-700 font-semibold leading-relaxed">{growth}</p>
                                    </div>
                                ))}
                                {(!aiInsights.key_growths || aiInsights.key_growths.length === 0) && (
                                    <p className="text-xs text-slate-400 font-semibold text-center py-2">No signals currently logged.</p>
                                )}
                            </div>
                        </div>

                        {/* Diagnostics & warnings */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-amber-500">warning</span>
                                Alerts & Diagnostics
                            </h3>
                            <div className="space-y-3">
                                {aiInsights.alerts_and_warnings?.map((alert, index) => {
                                    const isWarning = alert.toLowerCase().includes('ban') || alert.toLowerCase().includes('low') || alert.toLowerCase().includes('warning') || alert.toLowerCase().includes('flagged');
                                    return (
                                        <div key={index} className={`flex items-start gap-3 p-3 rounded-xl border ${isWarning ? 'bg-amber-50/30 border-amber-100 text-amber-800' : 'bg-slate-50/50 border-slate-100 text-slate-700'} hover:shadow-sm transition-all`}>
                                            <span className={`material-symbols-outlined text-[20px] p-1 rounded-lg ${isWarning ? 'text-amber-600 bg-amber-100' : 'text-slate-500 bg-slate-100'}`}>
                                                {isWarning ? 'report' : 'info'}
                                            </span>
                                            <p className="text-sm font-semibold leading-relaxed">{alert}</p>
                                        </div>
                                    );
                                })}
                                {(!aiInsights.alerts_and_warnings || aiInsights.alerts_and_warnings.length === 0) && (
                                    <p className="text-xs text-slate-400 font-semibold text-center py-2">Diagnostics cleared. No alerts detected.</p>
                                )}
                            </div>
                        </div>

                        {/* Actionable recommendations */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-indigo-500">lightbulb</span>
                                Strategic Actions
                            </h3>
                            <div className="space-y-3">
                                {aiInsights.actionable_recommendations?.map((rec, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50/30 to-indigo-50/30 border border-slate-100 hover:border-indigo-100 transition-all">
                                        <span className="material-symbols-outlined text-[20px] text-indigo-600 bg-indigo-50 p-1.5 rounded-lg">bolt</span>
                                        <p className="text-sm text-slate-700 font-semibold leading-relaxed">{rec}</p>
                                    </div>
                                ))}
                                {(!aiInsights.actionable_recommendations || aiInsights.actionable_recommendations.length === 0) && (
                                    <p className="text-xs text-slate-400 font-semibold text-center py-2">No recommendations currently flagged.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Console & Interactive Chat */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
                        {/* Terminal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between shadow-md flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                                    <span className="material-symbols-outlined text-white text-[22px]">terminal</span>
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm tracking-wide">COMMAND CONSOLE</h3>
                                    <p className="text-[10px] text-blue-100 font-medium">DIRECT NLP PLATFORM INTERFACE</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Operational</span>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div 
                            id="ai-chat-messages-container"
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30"
                        >
                            {aiMessages.map((message, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                                >
                                    {message.sender === 'admin' ? (
                                        <div className="max-w-[85%] bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md shadow-blue-600/10">
                                            <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">{message.text}</p>
                                            <span className="text-[10px] text-blue-100 font-bold block text-right mt-1.5">You</span>
                                        </div>
                                    ) : (
                                        <div className="max-w-[90%] bg-white border border-slate-200 text-slate-800 p-5 rounded-2xl rounded-tl-none shadow-sm space-y-3">
                                            <p className="text-sm font-semibold leading-relaxed text-slate-700 whitespace-pre-wrap">{message.text}</p>

                                            {/* Render Dynamic CSV Table */}
                                            {message.data && message.data.length > 0 && (
                                                <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[16px] text-blue-600">table_chart</span>
                                                            Query Results ({message.data.length} records)
                                                        </span>
                                                        <button 
                                                            onClick={() => exportToCSV(message.data, "ai_query_results")}
                                                            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-blue-600 transition-colors shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">download</span>
                                                            Export CSV
                                                        </button>
                                                    </div>
                                                    <div className="overflow-x-auto max-h-[250px]">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                                                    {Object.keys(message.data[0]).filter(key => key !== 'password_hash' && key !== 'profile_pic_url').map(key => (
                                                                        <th key={key} className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/_/g, ' ')}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {message.data.map((row, rowIdx) => (
                                                                    <tr key={rowIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                                        {Object.entries(row).filter(([key]) => key !== 'password_hash' && key !== 'profile_pic_url').map(([key, val]) => {
                                                                            let renderedVal = String(val ?? '');
                                                                            if (typeof val === 'boolean') {
                                                                                renderedVal = val ? 'Yes' : 'No';
                                                                            } else if (key.endsWith('_at') || key === 'created_at' || key === 'start_time') {
                                                                                try {
                                                                                    renderedVal = new Date(val).toLocaleDateString();
                                                                                } catch (e) {}
                                                                            }
                                                                            return (
                                                                                <td key={key} className="px-4 py-2.5 text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                                                                                    {renderedVal}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                            {message.data && message.data.length === 0 && (
                                                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs font-semibold text-slate-500">
                                                    No matching records returned in data payload.
                                                </div>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-bold block mt-2">AdminPulse AI</span>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Loading State bubble */}
                            {aiQueryLoading && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                                        <span className="material-symbols-outlined animate-spin text-blue-600 text-2xl">psychology</span>
                                        <span className="text-sm font-semibold text-slate-500">Copilot is compiling records...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prompt Input Form */}
                        <form 
                            onSubmit={handleAiQuerySubmit} 
                            className="bg-white p-4 border-t border-slate-200 flex gap-3 flex-shrink-0"
                        >
                            <input 
                                type="text"
                                value={aiQueryInput}
                                onChange={(e) => setAiQueryInput(e.target.value)}
                                placeholder="Search database listings & users using natural language..."
                                disabled={aiQueryLoading}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-semibold transition-all placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                type="submit"
                                disabled={!aiQueryInput.trim() || aiQueryLoading}
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:scale-100 disabled:cursor-not-allowed text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/10 transition-all flex-shrink-0"
                            >
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const renderProductModal = () => {
        if (!isProductModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 transition-all scale-100">
                    <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center z-10">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600 text-2xl">storefront</span>
                            <h3 className="text-xl font-bold text-slate-900">
                                {productModalMode === 'add' ? 'Add Premium Product' : 'Edit Product Settings'}
                            </h3>
                        </div>
                        <button 
                            onClick={() => setIsProductModalOpen(false)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {productModalMode === 'add' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Product ID (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. p9 (Auto-generated if empty)" 
                                        value={currentProduct.id}
                                        onChange={(e) => setCurrentProduct({ ...currentProduct, id: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-semibold"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Product Title</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Premium Dog Kibble..." 
                                    value={currentProduct.title}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, title: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Category</label>
                                <select 
                                    value={currentProduct.category}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-semibold"
                                >
                                    <option value="food">Food & Nutrition (Emerald)</option>
                                    <option value="accessories">Accessories & Wear (Orange)</option>
                                    <option value="toys">Toys & Play (Indigo)</option>
                                    <option value="wellness">Wellness & Health (Purple)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Base Price (EGP)</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="450.00" 
                                    value={currentProduct.base_price}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, base_price: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Badge Overlay (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Sale, Hot, Best Seller" 
                                    value={currentProduct.badge || ''}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, badge: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Description</label>
                            <textarea 
                                rows="3"
                                placeholder="Describe the product features, ingredients, dimensions..." 
                                value={currentProduct.description || ''}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Product Image Selector</label>
                            
                            {currentProduct.image ? (
                                <div className="relative rounded-2xl border border-slate-200 overflow-hidden group h-48 bg-slate-50 flex items-center justify-center">
                                    <img 
                                        src={currentProduct.image} 
                                        alt="Product Preview" 
                                        className="h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                        <button 
                                            type="button" 
                                            onClick={() => setCurrentProduct({ ...currentProduct, image: '' })}
                                            className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-1.5 font-semibold text-sm animate-fade-in"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span> Remove Image
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/10 transition-colors cursor-pointer group relative overflow-hidden"
                                >
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        id="product-image-file-input"
                                        onChange={handleProductImageUpload}
                                        className="hidden"
                                    />
                                    
                                    {uploadingImage ? (
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <span className="material-symbols-outlined text-4xl text-blue-600 animate-spin">refresh</span>
                                            <p className="text-sm font-bold text-slate-700 mt-3">Syncing with Cloudinary CDN...</p>
                                            <p className="text-xs text-slate-400 mt-1">Uploading and optimizing image assets</p>
                                        </div>
                                    ) : (
                                        <label htmlFor="product-image-file-input" className="cursor-pointer block">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-blue-600 transition-transform">
                                                <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-blue-600">upload_file</span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800">
                                                Drag & drop a product image here, or <span className="text-blue-600 hover:underline">browse</span>
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1.5">Supports PNG, JPG, WEBP or GIF up to 5MB</p>
                                        </label>
                                    )}
                                </div>
                            )}

                            <div className="mt-4">
                                <div className="flex items-center gap-4 my-3">
                                    <div className="flex-1 h-px bg-slate-200"></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">or paste image address</span>
                                    <div className="flex-1 h-px bg-slate-200"></div>
                                </div>
                                <input 
                                    type="url" 
                                    placeholder="https://images.unsplash.com/photo-..." 
                                    value={currentProduct.image}
                                    onChange={(e) => setCurrentProduct({ ...currentProduct, image: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-semibold"
                                />
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-100 flex justify-end gap-3 z-10">
                            <button 
                                type="button" 
                                onClick={() => setIsProductModalOpen(false)}
                                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={uploadingImage}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 ${
                                    uploadingImage ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-600/10'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {productModalMode === 'add' ? 'Create Product' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
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
                    <button 
                        onClick={() => { setActiveTab('subscriptions'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'subscriptions' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                        Subscriptions
                    </button>
                    <button 
                        onClick={() => { setActiveTab('marketplace_products'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'marketplace_products' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
                        Marketplace Products
                    </button>
                    <button 
                        onClick={() => { setActiveTab('ai_copilot'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'ai_copilot' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                        AI Copilot
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
                        {activeTab === 'subscriptions' && renderSubscriptions()}
                        {activeTab === 'marketplace_products' && renderMarketplaceProducts()}
                        {activeTab === 'ai_copilot' && renderAiCopilot()}
                    </div>
                </div>
            </main>
            {renderProductModal()}
        </div>
    );
};

export default Admin;
