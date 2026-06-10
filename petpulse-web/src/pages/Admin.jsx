import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const Admin = () => {
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('overview');
    
    // Data states
    const [analytics, setAnalytics] = useState(null);
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [bookings, setBookings] = useState([]);
    
    // Server-side Pagination & Sorting States
    const [usersPage, setUsersPage] = useState(1);
    const [usersLimit] = useState(50);
    const [usersTotalPages, setUsersTotalPages] = useState(1);
    const [usersSortBy, setUsersSortBy] = useState('created_at');
    const [usersSortDesc, setUsersSortDesc] = useState(true);

    const [bookingsPage, setBookingsPage] = useState(1);
    const [bookingsLimit] = useState(50);
    const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
    const [bookingsSortBy, setBookingsSortBy] = useState('created_at');
    const [bookingsSortDesc, setBookingsSortDesc] = useState(true);

    const [servicesPage, setServicesPage] = useState(1);
    const [servicesLimit] = useState(50);
    const [servicesTotalPages, setServicesTotalPages] = useState(1);
    const [servicesSortBy, setServicesSortBy] = useState('created_at');
    const [servicesSortDesc, setServicesSortDesc] = useState(true);

    const [postsPage, setPostsPage] = useState(1);
    const [postsLimit] = useState(50);
    const [postsTotalPages, setPostsTotalPages] = useState(1);
    const [postsSortBy, setPostsSortBy] = useState('created_at');
    const [postsSortDesc, setPostsSortDesc] = useState(true);

    const [subsPage, setSubsPage] = useState(1);
    const [subsLimit] = useState(50);
    const [subsTotalPages, setSubsTotalPages] = useState(1);
    const [subsSortBy, setSubsSortBy] = useState('created_at');
    const [subsSortDesc, setSubsSortDesc] = useState(true);

    const [adsPage, setAdsPage] = useState(1);
    const [adsLimit] = useState(50);
    const [adsTotalPages, setAdsTotalPages] = useState(1);
    const [adsSortBy, setAdsSortBy] = useState('created_at');
    const [adsSortDesc, setAdsSortDesc] = useState(true);

    const [productsPage, setProductsPage] = useState(1);
    const [productsLimit] = useState(50);
    const [productsTotalPages, setProductsTotalPages] = useState(1);
    const [productsSortBy, setProductsSortBy] = useState('created_at');
    const [productsSortDesc, setProductsSortDesc] = useState(true);
    const [posts, setPosts] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [planFormData, setPlanFormData] = useState({ id: '', name: '', price: '', frequency: '/month', description: '', features: '', recommended: false, color: 'blue', target_role: 'owner' });
    const [marketplaceProducts, setMarketplaceProducts] = useState([]);
    const [adBanners, setAdBanners] = useState([]);
    
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
    
    // DB Health states
    const [dbMetrics, setDbMetrics] = useState(null);
    const [dbActionLoading, setDbActionLoading] = useState(false);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [adStatusFilter, setAdStatusFilter] = useState('all');
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

    const [selectedUser, setSelectedUser] = useState(null);
    const [userModalTab, setUserModalTab] = useState('profile');
    const [activityLogs, setActivityLogs] = useState([
        { id: 1, timestamp: '2026-05-23T13:02:11.000Z', level: 'info', user: 'Alex Johnson', role: 'owner', action: 'Published a new community post', details: 'Buddy is learning so fast under Jessica Davis!' },
        { id: 2, timestamp: '2026-05-23T12:45:00.000Z', level: 'warning', user: 'Dr. Sarah Chen', role: 'vet', action: 'Flagged vet triage emergency', details: 'Flagged cardiovascular and breathing symptoms for Milo.' },
        { id: 3, timestamp: '2026-05-23T11:30:15.000Z', level: 'info', user: 'Jessica Davis', role: 'trainer', action: 'Updated specialties in profile builder', details: 'Added Puppy Foundations and positive reinforcement methodologies.' },
        { id: 4, timestamp: '2026-05-23T10:15:32.000Z', level: 'danger', user: 'Dave Smith', role: 'owner', action: 'Account banned by Admin', details: 'Reason: Spamming promotional links in Egyptian community feed.' },
        { id: 5, timestamp: '2026-05-23T09:42:00.000Z', level: 'success', user: 'Paws & Claws Store', role: 'vendor', action: 'Processed ad campaign payment', details: 'Simulated payment of 500 EGP successfully processed for Home Banner.' },
        { id: 6, timestamp: '2026-05-23T08:30:00.000Z', level: 'info', user: 'Emily Clark', role: 'owner', action: 'Registered a new pet profile', details: 'Added Luna (Cat - Siamese Mix, 6 months old).' },
        { id: 7, timestamp: '2026-05-23T07:15:45.000Z', level: 'info', user: 'Ahmed Ali', role: 'owner', action: 'Submitted product review', details: '5 stars for Premium Leather Dog Collar: "Excellent quality!"' },
        { id: 8, timestamp: '2026-05-22T22:11:00.000Z', level: 'info', user: 'Dr. Michael Scott', role: 'vet', action: 'Updated clinic location details', details: 'Updated clinic address: 12 El Nasr Rd, Maadi, Cairo.' },
        { id: 9, timestamp: '2026-05-22T20:30:00.000Z', level: 'warning', user: 'Dave Smith', role: 'owner', action: 'Flagged 3 failed login attempts', details: 'IP address 197.34.88.21 triggered rate limit warning.' },
        { id: 10, timestamp: '2026-05-22T18:45:00.000Z', level: 'info', user: 'Paws & Claws Store', role: 'vendor', action: 'Registered new business storefront', details: 'Established Maadi store with tax ID TAX-123456.' },
        { id: 11, timestamp: '2026-05-22T16:12:10.000Z', level: 'info', user: 'Alex Johnson', role: 'owner', action: 'Booked veterinary appointment', details: 'Scheduled annual vaccination booster slot with Dr. Sarah Chen.' },
        { id: 12, timestamp: '2026-05-22T14:05:00.000Z', level: 'info', user: 'Emily Clark', role: 'owner', action: 'Submitted pet adoption request', details: 'Applied for Golden Retriever adoption (Milo).' },
        { id: 13, timestamp: '2026-05-22T11:22:15.000Z', level: 'success', user: 'Dr. Sarah Chen', role: 'vet', action: 'Marked appointment completed', details: 'Successfully finalized appointment #b1 and uploaded clinical charts.' },
        { id: 14, timestamp: '2026-05-22T09:00:00.000Z', level: 'info', user: 'System Cron', role: 'admin', action: 'Database backup completed', details: 'Automated offsite backup serialized successfully.' }
    ]);
    const [logLevelFilter, setLogLevelFilter] = useState('all');
    const [logRoleFilter, setLogRoleFilter] = useState('all');

    // ID document verification lightbox & review states
    const [idZoom, setIdZoom] = useState(1);
    const [idRotation, setIdRotation] = useState(0);
    const [manualVerifyNotes, setManualVerifyNotes] = useState('');

    useEffect(() => {
        if (selectedUser) {
            setIdZoom(1);
            setIdRotation(0);
            setManualVerifyNotes(selectedUser.verification_notes || '');
        } else {
            setManualVerifyNotes('');
        }
    }, [selectedUser]);

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
                    const res = await axios.get(`${API_BASE}/admin/users?page=${usersPage}&limit=${usersLimit}&search=${encodeURIComponent(searchTerm)}&sortBy=${usersSortBy}&sortDesc=${usersSortDesc}`, { headers });
                    setUsers(res.data.users || []);
                    if (res.data.pagination) setUsersTotalPages(res.data.pagination.totalPages);
                } else if (activeTab === 'services') {
                    const res = await axios.get(`${API_BASE}/admin/services?page=${servicesPage}&limit=${servicesLimit}&search=${encodeURIComponent(searchTerm)}&sortBy=${servicesSortBy}&sortDesc=${servicesSortDesc}`, { headers });
                    setServices(res.data.services || []);
                    if (res.data.pagination) setServicesTotalPages(res.data.pagination.totalPages);
                } else if (activeTab === 'bookings') {
                    const res = await axios.get(`${API_BASE}/admin/bookings?page=${bookingsPage}&limit=${bookingsLimit}&search=${encodeURIComponent(searchTerm)}&sortBy=${bookingsSortBy}&sortDesc=${bookingsSortDesc}`, { headers });
                    setBookings(res.data.bookings || []);
                    if (res.data.pagination) setBookingsTotalPages(res.data.pagination.totalPages);
                } else if (activeTab === 'community') {
                    const res = await axios.get(`${API_BASE}/admin/posts`, { headers });
                    setPosts(res.data.posts || []);
                } else if (activeTab === 'subscription_plans') {
                    const res = await axios.get(`${API_BASE}/public/plans`);
                    setSubscriptionPlans(res.data.plans || []);
                } else if (activeTab === 'subscriptions') {
                    const res = await axios.get(`${API_BASE}/admin/subscriptions`, { headers });
                    setSubscriptions(res.data.subscriptions || []);
                } else if (activeTab === 'marketplace_products') {
                    const res = await axios.get(`${API_BASE}/public/products`);
                    setMarketplaceProducts(res.data.products || []);
                } else if (activeTab === 'ads') {
                    const res = await axios.get(`${API_BASE}/admin/ads`, { headers });
                    setAdBanners(res.data.ads || res.data || []);
                } else if (activeTab === 'logs') {
                    const res = await axios.get(`${API_BASE}/admin/logs`, { headers });
                    setActivityLogs(res.data.logs || []);
                } else if (activeTab === 'ai_copilot') {
                    if (!aiInsights) {
                        const res = await axios.get(`${API_BASE}/admin/ai/insights`, { headers });
                        setAiInsights(res.data);
                    }
                } else if (activeTab === 'db_health') {
                    const res = await axios.get(`${API_BASE}/admin/db/metrics`, { headers });
                    setDbMetrics(res.data.metrics || null);
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

    useEffect(() => {
        if (activeTab === 'ai_copilot') {
            const container = document.getElementById('ai-chat-messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [aiMessages, aiQueryLoading, activeTab]);

    // Helpers
    const handleSort = (tab, field) => {
        if (tab === 'users') {
            if (usersSortBy === field) {
                setUsersSortDesc(!usersSortDesc);
            } else {
                setUsersSortBy(field);
                setUsersSortDesc(true);
            }
        } else if (tab === 'bookings') {
            if (bookingsSortBy === field) {
                setBookingsSortDesc(!bookingsSortDesc);
            } else {
                setBookingsSortBy(field);
                setBookingsSortDesc(true);
            }
        }
    };

    const renderSortIcon = (tab, field) => {
        const sortBy = tab === 'users' ? usersSortBy : bookingsSortBy;
        const sortDesc = tab === 'users' ? usersSortDesc : bookingsSortDesc;
        if (sortBy !== field) return <span className="material-symbols-outlined text-[14px] opacity-30">unfold_more</span>;
        return <span className="material-symbols-outlined text-[14px] text-blue-600">{sortDesc ? 'arrow_downward' : 'arrow_upward'}</span>;
    };

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

    const handleVerify = async (userId, status, notes = '') => {
        try {
            await axios.put(`${API_BASE}/admin/verify/${userId}`, 
                { status: status ? 'approved' : 'rejected', notes },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Profile ${status ? 'Approved' : 'Rejected'} Successfully!`);
            
            const targetUser = users.find(u => u.id === userId);
            if (targetUser) {
                const newLog = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    level: status ? 'success' : 'warning',
                    user: `${targetUser.first_name} ${targetUser.last_name}`,
                    role: targetUser.role,
                    action: status ? 'Credentials Verified & Approved' : 'Credentials Revoked/Rejected',
                    details: status 
                        ? `Verification status approved. Public clinic/storefront is now active.${notes ? ' Notes: ' + notes : ''}` 
                        : `Verification credentials revoked. Public profile set back to pending review.${notes ? ' Reason: ' + notes : ''}`
                };
                setActivityLogs(prev => [newLog, ...prev]);
            }

            const res = await axios.get(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
            const updatedUsers = res.data.users || [];
            setUsers(updatedUsers);
            if (selectedUser && selectedUser.id === userId) {
                const updated = updatedUsers.find(u => u.id === userId);
                if (updated) {
                    setSelectedUser(updated);
                }
            }
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
            
            const targetUser = users.find(u => u.id === userId);
            if (targetUser) {
                const newLog = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    level: isBanned ? 'danger' : 'success',
                    user: `${targetUser.first_name} ${targetUser.last_name}`,
                    role: targetUser.role,
                    action: isBanned ? 'Account banned by Admin' : 'Account unbanned by Admin',
                    details: isBanned 
                        ? `Reason: Violation of Platform Guidelines. Access revoked by Admin.` 
                        : `Account access restored to active status by Admin.`
                };
                setActivityLogs(prev => [newLog, ...prev]);
            }

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: isBanned } : u));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Action failed');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("WARNING: Are you absolutely sure you want to permanently delete this user? This action cannot be undone and will destroy all associated data.")) return;
        try {
            const targetUser = users.find(u => u.id === userId);
            if (targetUser) {
                const newLog = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    level: 'danger',
                    user: `${targetUser.first_name} ${targetUser.last_name}`,
                    role: targetUser.role,
                    action: 'Account permanently deleted',
                    details: `All database records associated with the user were destroyed by Admin.`
                };
                setActivityLogs(prev => [newLog, ...prev]);
            }

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

    const handleAdStatus = async (adId, status) => {
        if (!window.confirm(`Are you sure you want to change this campaign's status to ${status}?`)) return;
        try {
            await axios.put(`${API_BASE}/admin/ads/${adId}/status`, 
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Ad Campaign ${status === 'approved' ? 'Approved' : 'Rejected'} successfully!`);
            setAdBanners(prev => prev.map(ad => ad.id === adId ? { ...ad, status } : ad));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update campaign status');
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
        let filteredUsers = users.filter(u => roleFilter === 'all' || u.role === roleFilter);

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
                                <option value="vendor">Pet Shops</option>
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
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("users", "first_name")}><div className="flex items-center gap-1">User {renderSortIcon("users", "first_name")}</div></th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("users", "role")}><div className="flex items-center gap-1">Role / Details {renderSortIcon("users", "role")}</div></th>
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
                                        const isProvider = u.role === 'vet' || u.role === 'trainer' || u.role === 'vendor';
                                        const isApproved = u.verification_status === 'approved';
                                        
                                        const roleBadgeStyles = u.role === 'vet' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 
                                                                u.role === 'trainer' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                                                                u.role === 'vendor' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                                                                u.role === 'admin' ? 'bg-slate-900 text-white border border-slate-950 shadow-sm' : 
                                                                'bg-sky-50 text-sky-700 border border-sky-100';

                                        const userRegistrationDate = u.created_at || (
                                            u.id === 'u1' ? "2025-10-01T09:00:00.000Z" :
                                            u.id === 'u2' ? "2025-12-15T14:30:00.000Z" :
                                            u.id === 'u3' ? "2026-01-20T10:15:00.000Z" :
                                            u.id === 'u4' ? "2026-02-11T16:45:00.000Z" :
                                            u.id === 'u5' ? "2026-03-05T11:20:00.000Z" :
                                            u.id === 'u6' ? "2026-04-18T08:10:00.000Z" :
                                            "2026-05-01T12:00:00.000Z"
                                        );

                                        return (
                                            <tr key={u.id} className="hover:bg-slate-50/60 border-b border-slate-100/80 transition-colors bg-white">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3.5">
                                                        <img 
                                                            src={u.profile_pic_url || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=f1f5f9&color=2563eb&bold=true`} 
                                                            className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-sm ring-1 ring-slate-100" 
                                                            alt="avatar" 
                                                        />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-extrabold text-slate-800 text-sm leading-none">{u.first_name} {u.last_name}</p>
                                                                {u.is_banned && (
                                                                    <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 text-[8px] font-black uppercase rounded-lg">
                                                                        Banned
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{u.email}</p>
                                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-50 border border-slate-100/60 rounded-lg px-2 py-0.5 w-fit">
                                                                    <span className="material-symbols-outlined text-[12px] font-bold text-slate-400">calendar_month</span>
                                                                    <span>Joined {new Date(userRegistrationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                </div>
                                                                {u.neighborhood && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold bg-rose-50/50 border border-rose-100/60 rounded-lg px-2 py-0.5 w-fit">
                                                                        <span className="material-symbols-outlined text-[12px] font-bold text-rose-500">location_on</span>
                                                                        <span>{u.neighborhood}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider mb-1.5 ${roleBadgeStyles}`}>
                                                        {u.role}
                                                    </span>
                                                    <div className="text-xs text-slate-500 font-semibold space-y-0.5">
                                                        {u.role === 'vet' && u.clinic_name && (
                                                            <span className="flex items-center gap-1 text-slate-600">
                                                                <span className="material-symbols-outlined text-xs">local_hospital</span> {u.clinic_name}
                                                            </span>
                                                        )}
                                                        {u.role === 'vet' && u.license_number && (
                                                            <span className="font-mono text-[10px] text-slate-400">License: {u.license_number}</span>
                                                        )}
                                                        {u.role === 'trainer' && u.specialties && (
                                                            <span className="flex items-center gap-1 text-slate-600 truncate max-w-[170px]">
                                                                <span className="material-symbols-outlined text-xs">fitness_center</span> {u.specialties}
                                                            </span>
                                                        )}
                                                        {u.role === 'vendor' && u.shop_name && (
                                                            <span className="flex items-center gap-1 text-slate-700 font-bold">
                                                                <span className="material-symbols-outlined text-xs text-pink-500">storefront</span> {u.shop_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {u.is_banned ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-100 shadow-sm">
                                                            <span className="material-symbols-outlined text-[14px]">block</span>
                                                            Suspended
                                                        </span>
                                                    ) : isProvider ? (
                                                        <div className="flex flex-col gap-1.5 w-fit">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border shadow-sm ${
                                                                isApproved 
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                                                    : 'bg-amber-50 text-amber-700 border-amber-150'
                                                            }`}>
                                                                <span className="material-symbols-outlined text-[14px]">{isApproved ? 'verified' : 'hourglass_empty'}</span>
                                                                {isApproved ? 'Verified' : 'Pending Verification'}
                                                            </span>
                                                            {u.id_document_url && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 shadow-sm w-fit">
                                                                    <span className="material-symbols-outlined text-[12px] font-bold text-rose-500">badge</span>
                                                                    ID Uploaded
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-sky-50 text-sky-700 border border-sky-100 shadow-sm">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                                                            Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 flex-nowrap ml-auto">
                                                        {isProvider && (
                                                            !isApproved ? (
                                                                <button 
                                                                    onClick={() => handleVerify(u.id, true)} 
                                                                    className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-extrabold text-xs rounded-xl transition-all border border-emerald-250 shadow-sm active:scale-95 duration-200"
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">check_circle</span> Approve
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleVerify(u.id, false)} 
                                                                    className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 font-extrabold text-xs rounded-xl transition-all border border-slate-200 shadow-sm active:scale-95 duration-200"
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">cancel</span> Revoke
                                                                </button>
                                                            )
                                                        )}
                                                        
                                                        <button 
                                                            onClick={() => setSelectedUser(u)} 
                                                            className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl transition-all border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow active:scale-95 duration-200"
                                                            title="Inspect User Details"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px] text-slate-500">visibility</span> Details
                                                        </button>
                                                        {u.role !== 'admin' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleBanToggle(u.id, !u.is_banned)} 
                                                                    className={`flex items-center gap-1 px-3 py-2 font-extrabold text-xs rounded-xl transition-all border shadow-sm active:scale-95 duration-200 ${
                                                                        u.is_banned 
                                                                            ? 'bg-slate-900 text-white border-slate-950 hover:bg-slate-800' 
                                                                            : 'bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-600 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">{u.is_banned ? 'lock_open' : 'block'}</span> 
                                                                    {u.is_banned ? 'Unban' : 'Ban'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteUser(u.id)} 
                                                                    className="flex items-center justify-center w-8 h-8 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl transition-all border border-rose-200 shadow-sm hover:shadow active:scale-95 duration-200"
                                                                    title="Permanently Delete User"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px] font-bold">delete_forever</span>
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

    const renderAds = () => {
        let filteredAds = adBanners.filter(ad => {
            const matchesStatus = adStatusFilter === 'all' || ad.status === adStatusFilter;
            const matchesSearch = !searchTerm || 
                ad.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ad.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ad.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ad.shop_name?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Paid Ad Banner Approvals</h1>
                    <button onClick={() => exportToCSV(filteredAds, 'Ad_Banners_Export')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                    </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">ads_click</span> 
                            <h2 className="text-lg font-bold text-slate-900">Campaign Requests</h2>
                        </div>
                        <div className="flex w-full xl:w-auto gap-3">
                            <select 
                                value={adStatusFilter}
                                onChange={(e) => setAdStatusFilter(e.target.value)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-600"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending Review</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <div className="relative flex-1 xl:w-64">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Search campaigns..." 
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
                                    <th className="px-6 py-4">Ad Campaign</th>
                                    <th className="px-6 py-4">Vendor & Shop</th>
                                    <th className="px-6 py-4">Tier Duration / Placement</th>
                                    <th className="px-6 py-4">Payment</th>
                                    <th className="px-6 py-4 text-right">Moderation Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading && adBanners.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Loading ad campaigns...</td></tr>
                                ) : filteredAds.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">No campaigns found.</td></tr>
                                ) : (
                                    filteredAds.map(ad => {
                                        const isPaid = ad.payment_status === 'paid';
                                        
                                        const placementColors = {
                                            home: 'bg-blue-50 text-blue-700 border-blue-200',
                                            marketplace: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            community: 'bg-purple-50 text-purple-700 border-purple-200'
                                        };

                                        return (
                                            <tr key={ad.id} className="hover:bg-slate-50 transition-colors bg-white">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-14 h-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex-shrink-0 flex items-center justify-center">
                                                            <img 
                                                                src={ad.image_url} 
                                                                alt={ad.title} 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150x80?text=No+Image'; }}
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-800 truncate max-w-[200px]" title={ad.title}>{ad.title}</p>
                                                            <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5">
                                                                Link <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800">{ad.first_name} {ad.last_name}</p>
                                                    <p className="text-xs text-slate-500">{ad.shop_name ? `Shop: ${ad.shop_name}` : ad.email}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-slate-700 font-semibold">{ad.duration?.replace('_', ' ')} <span className="text-xs text-slate-400 font-medium">({ad.price} EGP)</span></span>
                                                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${placementColors[ad.placement] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                            {ad.placement}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                        <span className="material-symbols-outlined text-[14px]">{isPaid ? 'check_circle' : 'hourglass_empty'}</span>
                                                        {isPaid ? 'Paid & Live' : 'Unpaid'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {ad.status === 'pending' ? (
                                                            <>
                                                                <button onClick={() => handleAdStatus(ad.id, 'approved')} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg transition-colors border border-emerald-200 shadow-sm">
                                                                    <span className="material-symbols-outlined text-[14px]">check</span> Approve
                                                                </button>
                                                                <button onClick={() => handleAdStatus(ad.id, 'rejected')} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors border border-red-200 shadow-sm">
                                                                    <span className="material-symbols-outlined text-[14px]">close</span> Decline
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${ad.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {ad.status}
                                                                </span>
                                                                {/* Let admin revert status if needed */}
                                                                <button onClick={() => handleAdStatus(ad.id, 'pending')} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors" title="Reset to Pending">
                                                                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                                                </button>
                                                            </div>
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
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("bookings", "total_price")}><div className="flex items-center gap-1">Price {renderSortIcon("bookings", "total_price")}</div></th>
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
        let filteredBookings = bookings;

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
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSort("bookings", "client_first_name")}><div className="flex items-center gap-1">Client {renderSortIcon("bookings", "client_first_name")}</div></th>
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
        formData.append('folder', 'petpulse/products');
        
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
        formData.append('folder', 'petpulse/products');
        
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

    
    const handleSavePlan = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...planFormData,
                features: typeof planFormData.features === 'string' ? planFormData.features.split(',').map(f => f.trim()) : planFormData.features
            };
            if (currentPlan) {
                await axios.put(`${API_BASE}/admin/plans/${currentPlan.id}`, payload, { headers });
                toast.success('Plan updated successfully');
            } else {
                await axios.post(`${API_BASE}/admin/plans`, payload, { headers });
                toast.success('Plan created successfully');
            }
            setIsPlanModalOpen(false);
            const res = await axios.get(`${API_BASE}/public/plans`);
            setSubscriptionPlans(res.data.plans || []);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save plan');
        }
    };

    const handleDeletePlan = async (id) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        try {
            await axios.delete(`${API_BASE}/admin/plans/${id}`, { headers });
            toast.success('Plan deleted successfully');
            const res = await axios.get(`${API_BASE}/public/plans`);
            setSubscriptionPlans(res.data.plans || []);
        } catch (error) {
            toast.error('Failed to delete plan');
        }
    };

    const renderSubscriptionPlans = () => {
        let filteredPlans = subscriptionPlans.filter(p => 
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">PulseBox Plans Catalogue</h1>
                        <p className="text-sm text-slate-500">Manage your subscription tiers and pricing.</p>
                    </div>
                    <button onClick={() => { setCurrentPlan(null); setPlanFormData({ id: '', name: '', price: '', frequency: '/month', description: '', features: '', recommended: false, color: 'blue', target_role: 'owner' }); setIsPlanModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">add</span> Add New Plan
                    </button>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Available Plans</h2>
                        <div className="relative w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input type="text" placeholder="Search plans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest border-b border-slate-200">
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Color</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && subscriptionPlans.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading plans...</td></tr>
                                ) : filteredPlans.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No plans found.</td></tr>
                                ) : (
                                    filteredPlans.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.id}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-600">{p.name} {p.recommended && <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">Recommended</span>}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.price} EGP {p.frequency}</td>
                                            <td className="px-6 py-4"><span className={`inline-block w-4 h-4 rounded-full bg-${p.color}-500`}></span> {p.color}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 capitalize">{p.target_role}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setCurrentPlan(p); setPlanFormData({...p, features: p.features?.join(', ') || ''}); setIsPlanModalOpen(true); }} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-slate-200" title="Edit Plan"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                    <button onClick={() => handleDeletePlan(p.id)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-slate-200" title="Delete Plan"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Plan Form Modal */}
                {isPlanModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900">{currentPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
                                <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <form id="planForm" onSubmit={handleSavePlan} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Plan ID</label>
                                            <input type="text" required disabled={!!currentPlan} value={planFormData.id} onChange={(e) => setPlanFormData({...planFormData, id: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" placeholder="e.g. p1, sub_starter"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Target Role</label>
                                            <select value={planFormData.target_role} onChange={(e) => setPlanFormData({...planFormData, target_role: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="owner">Pet Owner</option>
                                                <option value="trainer">Trainer</option>
                                                <option value="vet">Vet</option>
                                                <option value="shop">Shop</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Name</label>
                                        <input type="text" required value={planFormData.name} onChange={(e) => setPlanFormData({...planFormData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Price (EGP)</label>
                                            <input type="number" step="0.01" required value={planFormData.price} onChange={(e) => setPlanFormData({...planFormData, price: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Frequency</label>
                                            <input type="text" required value={planFormData.frequency} onChange={(e) => setPlanFormData({...planFormData, frequency: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="/month"/>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                        <textarea required value={planFormData.description} onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Features (comma separated)</label>
                                        <textarea required value={planFormData.features} onChange={(e) => setPlanFormData({...planFormData, features: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" placeholder="Feature 1, Feature 2, Feature 3" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Card Color</label>
                                            <select value={planFormData.color} onChange={(e) => setPlanFormData({...planFormData, color: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option value="blue">Blue</option>
                                                <option value="emerald">Emerald</option>
                                                <option value="purple">Purple</option>
                                                <option value="amber">Amber</option>
                                                <option value="slate">Slate</option>
                                                <option value="indigo">Indigo</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                                <input type="checkbox" checked={planFormData.recommended} onChange={(e) => setPlanFormData({...planFormData, recommended: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-slate-700">Recommended Badge</span>
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-6 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors">Cancel</button>
                                <button type="submit" form="planForm" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors">Save Plan</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
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

    const handleDBAction = async (actionPath, successMessage) => {
        setDbActionLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.post(`${API_BASE}/admin/db/${actionPath}`, {}, { headers });
            toast.success(res.data.message || successMessage);
            
            // Re-fetch metrics to show updated stats
            const metricsRes = await axios.get(`${API_BASE}/admin/db/metrics`, { headers });
            setDbMetrics(metricsRes.data.metrics || null);
        } catch (error) {
            console.error(`DB Maintenance action [${actionPath}] failed:`, error);
            toast.error(error.response?.data?.error || `Failed to execute database action.`);
        } finally {
            setDbActionLoading(false);
        }
    };

    const renderDBHealth = () => {
        if (!dbMetrics && loading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[450px] text-slate-500 gap-3">
                    <span className="material-symbols-outlined animate-spin text-blue-600 text-4xl">database</span>
                    <span className="font-extrabold text-slate-800 tracking-tight text-lg">Acquiring database metrics & catalogs...</span>
                    <p className="text-sm text-slate-400 font-semibold max-w-xs text-center leading-relaxed">Reading table catalogs, active connections, and execution speeds.</p>
                </div>
            );
        }

        const metrics = dbMetrics || {
            activeConnections: 3,
            dbSize: '18.4 MB',
            latencyMs: '4ms',
            status: 'Healthy',
            tableStats: [
                { table_name: 'users', total_size: '128 KB', row_count: 42 },
                { table_name: 'messages', total_size: '512 KB', row_count: 1032 },
                { table_name: 'audit_logs', total_size: '256 KB', row_count: 512 }
            ]
        };

        const isHealthy = metrics.status === 'Healthy';

        return (
            <div className="space-y-8 animate-fade-in">
                {/* Header Title Card with Gradient */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
                    <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10 blur-sm pointer-events-none">
                        <span className="material-symbols-outlined text-[300px]">database</span>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-indigo-400 text-3xl">terminal</span>
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">System Diagnostics & Database Maintenance</h1>
                            </div>
                            <p className="text-slate-300 font-medium text-sm md:text-md max-w-2xl leading-relaxed">
                                Elite co-pilot cockpit to inspect live connections, storage schemas, and run structural query index maintenance sweep actions in real-time.
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                setLoading(true);
                                try {
                                    const headers = { Authorization: `Bearer ${token}` };
                                    const res = await axios.get(`${API_BASE}/admin/db/metrics`, { headers });
                                    setDbMetrics(res.data.metrics || null);
                                    toast.success('Telemetry counters refreshed!');
                                } catch (err) {
                                    toast.error('Failed to update telemetry logs.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading || dbActionLoading}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold px-4 py-2.5 rounded-xl border border-white/20 transition-all shadow-sm shrink-0"
                        >
                            <span className="material-symbols-outlined text-[18px]">sync</span>
                            Refresh Telemetry
                        </button>
                    </div>
                </div>

                {/* Telemetry Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Active Connections */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Connections</span>
                            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                                <span className="material-symbols-outlined text-[20px] block">cable</span>
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">{metrics.activeConnections}</span>
                            <span className="text-xs font-bold text-slate-400">sessions</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-semibold text-slate-500">Telemetry link established</span>
                        </div>
                    </div>

                    {/* Storage Footprint */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">DB Storage Size</span>
                            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                <span className="material-symbols-outlined text-[20px] block">analytics</span>
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">{metrics.dbSize}</span>
                            <span className="text-xs font-bold text-slate-400">footprint</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">cloud_done</span>
                            <span className="text-xs font-semibold text-slate-500">PostgreSQL catalogs online</span>
                        </div>
                    </div>

                    {/* Average Query Latency */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Query Latency</span>
                            <span className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
                                <span className="material-symbols-outlined text-[20px] block">timer</span>
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">{metrics.latencyMs}</span>
                            <span className="text-xs font-bold text-slate-400">Ping latency</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-emerald-500 font-bold">check_circle</span>
                            <span className="text-xs font-semibold text-emerald-600">Fast query plan processing</span>
                        </div>
                    </div>

                    {/* Operational Health */}
                    <div className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${isHealthy ? 'bg-emerald-50/20 border-emerald-100' : 'bg-rose-50/20 border-rose-100'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Health Status</span>
                            <span className={`p-2.5 rounded-xl ${isHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                <span className="material-symbols-outlined text-[20px] block">{isHealthy ? 'health_and_safety' : 'warning'}</span>
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black tracking-tight ${isHealthy ? 'text-emerald-700' : 'text-rose-700'}`}>{metrics.status}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1">
                            <span className={`material-symbols-outlined text-[14px] ${isHealthy ? 'text-emerald-500' : 'text-rose-500'}`}>{isHealthy ? 'done_all' : 'report'}</span>
                            <span className={`text-xs font-semibold ${isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isHealthy ? 'Indexes & stats optimized' : 'Maintenance actions required'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* DB Actions Control Room */}
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-500">settings_applications</span>
                        One-Click Maintenance Control Room
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Action 1: Database Backup */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div>
                                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-fit mb-4">
                                    <span className="material-symbols-outlined text-2xl block">backup</span>
                                </div>
                                <h3 className="text-md font-extrabold text-slate-900 mb-2">Generate Database SQL Dump</h3>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                                    Scans all system schemas, generates complete structure definitions, and exports all rows safely into a `.sql` archive within the backend storage.
                                </p>
                            </div>
                            <button
                                onClick={() => handleDBAction('backup', 'Database backup complete!')}
                                disabled={dbActionLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                                {dbActionLoading ? 'Sweeping Database...' : 'Backup DB Now'}
                            </button>
                        </div>

                        {/* Action 2: Clear Diagnostic Cache */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div>
                                <div className="p-3 rounded-xl bg-orange-50 text-orange-600 w-fit mb-4">
                                    <span className="material-symbols-outlined text-2xl block">cleaning_services</span>
                                </div>
                                <h3 className="text-md font-extrabold text-slate-900 mb-2">Purge Diagnostic Cache</h3>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                                    Safely cleans up stale files from the backend/logs directory, deletes temporary sessions logs, and frees up primary system SSD storage.
                                </p>
                            </div>
                            <button
                                onClick={() => handleDBAction('clear-cache', 'Logs cache directory successfully cleaned!')}
                                disabled={dbActionLoading}
                                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-orange-300 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                                {dbActionLoading ? 'Purging Space...' : 'Clear Diagnostic Cache'}
                            </button>
                        </div>

                        {/* Action 3: Optimize Indexes */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div>
                                <div className="p-3 rounded-xl bg-violet-50 text-violet-600 w-fit mb-4">
                                    <span className="material-symbols-outlined text-2xl block">bolt</span>
                                </div>
                                <h3 className="text-md font-extrabold text-slate-900 mb-2">Vacuum & Reindex Tables</h3>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                                    Runs a comprehensive system VACUUM sweep, cleans unused index nodes, and updates PostgreSQL statistics catalogs to accelerate query runtimes.
                                </p>
                            </div>
                            <button
                                onClick={() => handleDBAction('optimize-indexes', 'Database queries & indexes optimized!')}
                                disabled={dbActionLoading}
                                className="w-full bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:bg-violet-300 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">speed</span>
                                {dbActionLoading ? 'Recalibrating...' : 'Optimize Indexes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Storage Breakdown */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-500">grid_on</span>
                                Database Schemas & Table Size Breakdown
                            </h2>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">Physical disk page sizes and row estimations for public table metrics.</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <th className="py-4 px-6">Table Name</th>
                                    <th className="py-4 px-6 text-center">Row Count (Estimated)</th>
                                    <th className="py-4 px-6 text-right">Physical Disk Size</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-800">
                                {metrics.tableStats && metrics.tableStats.map((stat, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                            <code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-700 text-xs font-bold font-mono">{stat.table_name}</code>
                                        </td>
                                        <td className="py-4 px-6 text-center text-slate-600 font-medium">
                                            {parseInt(stat.row_count || 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-right text-slate-900 font-bold font-mono text-xs">
                                            {stat.total_size}
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

    const renderLogs = () => {
        let filteredLogs = activityLogs.filter(log => {
            const matchesLevel = logLevelFilter === 'all' || log.level === logLevelFilter;
            const matchesRole = logRoleFilter === 'all' || log.role === logRoleFilter;
            const matchesSearch = !searchTerm || 
                (log.user || log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesLevel && matchesRole && matchesSearch;
        });

        return (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
                    <button onClick={() => exportToCSV(filteredLogs, 'Activity_Logs_Export')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">download</span> Export Logs CSV
                    </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">receipt_long</span> 
                            <h2 className="text-lg font-bold text-slate-900">Platform Events Audit</h2>
                        </div>
                        <div className="flex w-full xl:w-auto gap-3 flex-wrap sm:flex-nowrap">
                            <select 
                                value={logLevelFilter}
                                onChange={(e) => setLogLevelFilter(e.target.value)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-600"
                            >
                                <option value="all">All Severities</option>
                                <option value="info">Info</option>
                                <option value="warning">Warnings</option>
                                <option value="danger">Danger</option>
                                <option value="success">Success</option>
                            </select>

                            <select 
                                value={logRoleFilter}
                                onChange={(e) => setLogRoleFilter(e.target.value)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-600"
                            >
                                <option value="all">All Actor Roles</option>
                                <option value="owner">Pet Owners</option>
                                <option value="vet">Veterinarians</option>
                                <option value="trainer">Trainers</option>
                                <option value="vendor">Vendors</option>
                                <option value="admin">System/Admins</option>
                            </select>

                            <div className="relative flex-1 xl:w-64 w-full">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Search audit trail..." 
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
                                    <th className="px-6 py-4 w-[180px]">Timestamp</th>
                                    <th className="px-6 py-4 w-[110px]">Severity</th>
                                    <th className="px-6 py-4 w-[180px]">Actor</th>
                                    <th className="px-6 py-4">Event Description</th>
                                    <th className="px-6 py-4">Action Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm bg-white font-sans">
                                {filteredLogs.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">No matching logs found in audit trail.</td></tr>
                                ) : (
                                    filteredLogs.map(log => {
                                        const lvlColor = log.level === 'danger' ? 'bg-red-50 text-red-700 border-red-200' :
                                                         log.level === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                         log.level === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                         'bg-blue-50 text-blue-700 border-blue-200';
                                        
                                        const actorColor = log.role === 'vet' ? 'bg-indigo-50 text-indigo-700' :
                                                           log.role === 'trainer' ? 'bg-orange-50 text-orange-700' :
                                                           log.role === 'vendor' ? 'bg-pink-50 text-pink-700' :
                                                           log.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700';

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`inline-flex px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${lvlColor}`}>
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{log.user || log.user_name || 'System'}</span>
                                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${actorColor}`}>
                                                            {log.role}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 font-semibold text-slate-700">
                                                    {log.action}
                                                </td>
                                                <td className="px-6 py-3.5 text-xs text-slate-500 font-medium">
                                                    {log.details}
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

    const renderUserDetailsModal = () => {
        if (!selectedUser) return null;
        
        const isBanned = selectedUser.is_banned;
        const banReason = selectedUser.ban_reason || (
            selectedUser.role === 'owner' ? "System flagged: Spamming promotional links in community boards" :
            selectedUser.role === 'vendor' ? "System flagged: Listing unauthorized commercial listings in marketplace" :
            "Verification audit failed: Uploaded fake or expired professional credentials"
        );
        const banDate = selectedUser.ban_date || "2026-05-20T10:15:32.000Z";
        const bannedBy = selectedUser.banned_by || "System Administrator";

        const isAutomated = bannedBy.toLowerCase().includes('system') || 
                            bannedBy.toLowerCase().includes('auto') || 
                            bannedBy.toLowerCase().includes('ai') || 
                            bannedBy.toLowerCase().includes('bot');
        const banMethodText = isAutomated ? "Automated Guard" : "Manual Moderation";

        const registrationDate = selectedUser.created_at || (
            selectedUser.id === 'u1' ? "2025-10-01T09:00:00.000Z" :
            selectedUser.id === 'u2' ? "2025-12-15T14:30:00.000Z" :
            selectedUser.id === 'u3' ? "2026-01-20T10:15:00.000Z" :
            selectedUser.id === 'u4' ? "2026-02-11T16:45:00.000Z" :
            selectedUser.id === 'u5' ? "2026-03-05T11:20:00.000Z" :
            selectedUser.id === 'u6' ? "2026-04-18T08:10:00.000Z" :
            "2026-05-01T12:00:00.000Z"
        );

        const mockPets = selectedUser.role === 'owner' ? (
            selectedUser.id === 'u5' ? [
                { name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', age: 3, notes: 'Fully active, up to date on vaccines.' },
                { name: 'Charlie', species: 'Dog', breed: 'Beagle', age: 1, notes: 'Teething stage, very energetic.' }
            ] : selectedUser.id === 'u6' ? [
                { name: 'Luna', species: 'Cat', breed: 'Siamese Mix', age: 0.5, notes: 'Playful, allergic to salmon dry food.' }
            ] : [
                { name: 'Max', species: 'Dog', breed: 'German Shepherd', age: 2, notes: 'Highly trained watch dog.' }
            ]
        ) : [];

        const roleColor = selectedUser.role === 'vet' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                          selectedUser.role === 'trainer' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                          selectedUser.role === 'vendor' ? 'bg-pink-50 text-pink-600 border-pink-100' : 
                          selectedUser.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-blue-50 text-blue-600 border-blue-100';

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="h-28 w-full bg-gradient-to-r from-blue-600 to-indigo-700 relative flex-shrink-0">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-indigo-500 to-slate-900"></div>
                        <button 
                            onClick={() => { setSelectedUser(null); setUserModalTab('profile'); }}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-sm animate-scale-in"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>

                    <div className="px-6 sm:px-8 -mt-10 relative pb-4 border-b border-slate-100 flex-shrink-0 bg-white">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                            <img 
                                src={selectedUser.profile_pic_url || `https://ui-avatars.com/api/?name=${selectedUser.first_name}+${selectedUser.last_name}&background=f1f5f9&color=2563eb&bold=true&size=128`} 
                                className="w-20 h-20 rounded-2xl border-4 border-white shadow-md object-cover bg-slate-50"
                                alt="user profile"
                            />
                            <div className="pt-2 sm:pt-0 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <h3 className="text-xl font-extrabold text-slate-800 truncate">
                                        {selectedUser.first_name} {selectedUser.last_name}
                                    </h3>
                                    <span className={`inline-flex items-center px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${roleColor}`}>
                                        {selectedUser.role}
                                                    </span>
                                    {selectedUser.verification_status === 'approved' && (
                                        <span className="inline-flex items-center gap-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[9px] font-bold shadow-sm">
                                            <span className="material-symbols-outlined text-[10px] font-bold">verified</span> Verified
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-500 text-xs mt-1 font-semibold truncate">{selectedUser.email}</p>
                                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400 font-extrabold bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-0.5 w-fit justify-center sm:justify-start mx-auto sm:mx-0 shadow-sm">
                                    <span className="material-symbols-outlined text-[12.5px] font-black text-slate-400">calendar_month</span>
                                    <span>Member Since: {new Date(registrationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                        <button 
                            onClick={() => setUserModalTab('profile')}
                            className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                                userModalTab === 'profile' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">account_circle</span> Profile Details
                        </button>
                        <button 
                            onClick={() => setUserModalTab('role-details')}
                            className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                                userModalTab === 'role-details' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                {selectedUser.role === 'owner' ? 'pets' : selectedUser.role === 'vendor' ? 'storefront' : 'badge'}
                            </span>
                            {selectedUser.role === 'owner' ? 'Pets Registry' : selectedUser.role === 'vendor' ? 'Store Catalog' : 'Professional Info'}
                        </button>
                        {selectedUser.role !== 'owner' && selectedUser.role !== 'admin' && (
                            <button 
                                onClick={() => setUserModalTab('id-verification')}
                                className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                                    userModalTab === 'id-verification' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">badge</span> ID & Credentials
                            </button>
                        )}
                        {isBanned && (
                            <button 
                                onClick={() => setUserModalTab('ban-status')}
                                className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                                    userModalTab === 'ban-status' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-500 hover:text-red-500 hover:bg-slate-50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px] text-red-600">block</span> Ban Info
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
                        {userModalTab === 'profile' && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">User Biography</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-100 p-4 rounded-2xl shadow-sm italic">
                                        "{selectedUser.bio || selectedUser.about || "This user hasn't completed their bio profile yet."}"
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                            <span className="material-symbols-outlined text-xl">fingerprint</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Account ID</h4>
                                            <span className="text-xs font-mono font-bold text-slate-800">{selectedUser.id}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                            <span className="material-symbols-outlined text-xl">verified</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Verification Status</h4>
                                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${selectedUser.verification_status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                <span className="material-symbols-outlined text-sm">{selectedUser.verification_status === 'approved' ? 'check_circle' : 'hourglass_empty'}</span>
                                                {selectedUser.verification_status === 'approved' ? 'Verified Profile' : 'Pending Verification'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 sm:col-span-2">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Registration Time</h4>
                                            <span className="text-xs font-bold text-slate-800">
                                                {new Date(registrationDate).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedUser.neighborhood && (
                                        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 sm:col-span-2">
                                            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                                                <span className="material-symbols-outlined text-xl">location_on</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Last Login Location</h4>
                                                <span className="text-xs font-bold text-slate-800">
                                                    {selectedUser.neighborhood}
                                                    {selectedUser.latitude && selectedUser.longitude && (
                                                        <span className="text-slate-400 font-normal ml-1">
                                                            ({parseFloat(selectedUser.latitude).toFixed(4)}, {parseFloat(selectedUser.longitude).toFixed(4)})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {selectedUser.last_seen && (
                                        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 sm:col-span-2">
                                            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
                                                <span className="material-symbols-outlined text-xl">schedule</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Last Online Presence</h4>
                                                <span className="text-xs font-bold text-slate-800">
                                                    {new Date(selectedUser.last_seen).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {userModalTab === 'role-details' && (
                            <div className="space-y-6">
                                {selectedUser.role === 'owner' && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Registered Companions</h4>
                                        {mockPets.length === 0 ? (
                                            <p className="text-sm text-slate-500 italic">No pets registered under this account.</p>
                                        ) : (
                                            mockPets.map((pet, idx) => (
                                                <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                                        <span className="material-symbols-outlined text-2xl">{pet.species === 'Dog' ? 'pets' : 'cat'}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-800 text-sm">{pet.name}</span>
                                                            <span className="text-slate-300 text-xs">•</span>
                                                            <span className="text-xs text-slate-500 font-semibold">{pet.breed} ({pet.age} {pet.age === 1 ? 'year' : 'years'} old)</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed"><strong className="text-slate-600">Health notes:</strong> {pet.notes}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {(selectedUser.role === 'vet' || selectedUser.role === 'trainer') && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Professional Registry</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedUser.role === 'vet' && selectedUser.clinic_name && (
                                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Clinic Name</h4>
                                                    <span className="text-sm font-bold text-slate-800">{selectedUser.clinic_name}</span>
                                                </div>
                                            )}
                                            {selectedUser.license_number && (
                                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Practice License</h4>
                                                    <span className="text-sm font-bold font-mono text-slate-800">{selectedUser.license_number}</span>
                                                </div>
                                            )}
                                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm sm:col-span-2">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Specialties & Operations</h4>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {(Array.isArray(selectedUser.specialties) ? selectedUser.specialties : 
                                                      (typeof selectedUser.specialties === 'string' ? selectedUser.specialties.split(',').map(s=>s.trim()) : 
                                                       (selectedUser.role === 'vet' ? ['General Medicine', 'Surgery', 'Vaccinations'] : ['Puppy Foundations', 'Obedience'])))
                                                    .map((spec, i) => (
                                                        <span key={i} className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg">{spec}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedUser.role === 'vendor' && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Merchant Storefront Details</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedUser.shop_name && (
                                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Store Name</h4>
                                                    <span className="text-sm font-bold text-slate-800">{selectedUser.shop_name}</span>
                                                </div>
                                            )}
                                            {selectedUser.tax_id && (
                                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tax Registration ID</h4>
                                                    <span className="text-sm font-mono font-bold text-slate-800">{selectedUser.tax_id}</span>
                                                </div>
                                            )}
                                            {selectedUser.business_address && (
                                                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm sm:col-span-2">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Store Facility Address</h4>
                                                    <span className="text-sm font-bold text-slate-800">{selectedUser.business_address}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {userModalTab === 'ban-status' && isBanned && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Suspension Status Header Banner */}
                                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 p-5 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                    <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-200 shrink-0">
                                        <span className="material-symbols-outlined text-2xl font-bold">gavel</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-black text-slate-800 text-base tracking-tight">Active Platform Suspension</h4>
                                        <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                                            This account has been suspended due to policy violations. All community posts, messages, and storefront catalog access have been temporarily restricted.
                                        </p>
                                    </div>
                                </div>

                                {/* Ban Audit Info Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Account Registration Card */}
                                    <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                            <span className="material-symbols-outlined text-xl">calendar_month</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Account Created</h4>
                                            <span className="text-xs font-extrabold text-slate-800">
                                                {new Date(registrationDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Enforcement Date Card */}
                                    <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                                            <span className="material-symbols-outlined text-xl">event_busy</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-red-455 uppercase tracking-widest block mb-0.5">Suspension Imposed</h4>
                                            <span className="text-xs font-extrabold text-red-800">
                                                {new Date(banDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Enforcement Source/Method Card */}
                                    <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                                            <span className="material-symbols-outlined text-xl">{isAutomated ? 'smart_toy' : 'shield_person'}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Sanction Method</h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    isAutomated 
                                                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {banMethodText}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enforcer Signature Card */}
                                    <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                            <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Authorized Enforcer</h4>
                                            <span className="text-xs font-extrabold text-slate-800">{bannedBy}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ban Reason Container */}
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Official Moderation Statement</h4>
                                    <div className="text-sm text-slate-700 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm leading-relaxed relative">
                                        <span className="absolute top-3 left-4 text-5xl font-serif text-slate-200 pointer-events-none">“</span>
                                        <p className="font-medium italic text-slate-600 relative pl-4 pr-2">
                                            {banReason}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {userModalTab === 'id-verification' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Header banner */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-5 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
                                        <span className="material-symbols-outlined text-2xl font-bold">verified_user</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-black text-slate-800 text-base tracking-tight">Professional Credentials Verification</h4>
                                        <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                                            Verify the uploaded government-issued ID or practice license details to authorize the professional to perform public operations on PetPulse.
                                        </p>
                                    </div>
                                </div>

                                {/* Lightbox Visualizer Card */}
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Interactive Document Lightbox</h4>
                                    {selectedUser.id_document_url ? (
                                        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-inner h-[280px] sm:h-[350px] flex items-center justify-center overflow-hidden group">
                                            {/* Zoom / rotate indicator */}
                                            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-[10px] font-bold text-white tracking-wider border border-white/10 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                                Zoom: {Math.round(idZoom * 100)}% | Rotation: {idRotation}°
                                            </div>

                                            {/* Top right direct link */}
                                            <a 
                                                href={selectedUser.id_document_url.startsWith('http') ? selectedUser.id_document_url : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${selectedUser.id_document_url}`}
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md hover:bg-black/80 hover:scale-105 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10 shadow-lg"
                                                title="Open in new window"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                            </a>

                                            {/* Main Image in transform layer */}
                                            <div className="w-full h-full flex items-center justify-center transition-transform duration-200">
                                                <img 
                                                    src={selectedUser.id_document_url.startsWith('http') ? selectedUser.id_document_url : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${selectedUser.id_document_url}`}
                                                    alt="Professional Credential Document"
                                                    style={{ transform: `rotate(${idRotation}deg) scale(${idZoom})`, transition: 'transform 0.2s ease-in-out' }}
                                                    className="max-h-full max-w-full object-contain cursor-grab active:cursor-grabbing select-none"
                                                />
                                            </div>

                                            {/* Premium Floating Controls */}
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 transition-transform duration-200 hover:scale-105">
                                                <button 
                                                    onClick={() => setIdZoom(prev => Math.max(0.5, prev - 0.25))}
                                                    className="w-8 h-8 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Zoom Out"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                                                </button>
                                                <button 
                                                    onClick={() => setIdZoom(prev => Math.min(3, prev + 0.25))}
                                                    className="w-8 h-8 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Zoom In"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                                                </button>
                                                <div className="w-px h-5 bg-white/10"></div>
                                                <button 
                                                    onClick={() => setIdRotation(prev => prev - 90)}
                                                    className="w-8 h-8 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Rotate Counter-Clockwise"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">rotate_left</span>
                                                </button>
                                                <button 
                                                    onClick={() => setIdRotation(prev => prev + 90)}
                                                    className="w-8 h-8 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Rotate Clockwise"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">rotate_right</span>
                                                </button>
                                                <div className="w-px h-5 bg-white/10"></div>
                                                <button 
                                                    onClick={() => { setIdZoom(1); setIdRotation(0); }}
                                                    className="w-8 h-8 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Reset View"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50/50 border border-amber-200 p-8 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-2xl font-bold">no_accounts</span>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-extrabold text-slate-800 text-sm">No Document Uploaded Yet</h4>
                                                <p className="text-slate-500 text-xs font-semibold max-w-md leading-relaxed">
                                                    This professional profile has registered but hasn't submitted their verification credentials or ID document file for review.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Autonomous AI Scan Analysis Panel */}
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Autonomous AI OCR Analysis</h4>
                                    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
                                        {/* Dynamic Confidence Score Gauge */}
                                        {(() => {
                                            const confidenceMatch = selectedUser.verification_notes?.match(/(\d+)%/);
                                            const confidenceScore = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
                                            
                                            // Determine theme based on score or status
                                            const isApproved = selectedUser.verification_status === 'approved';
                                            const isRejected = selectedUser.verification_status === 'rejected';
                                            const finalScore = isApproved && confidenceScore === 0 ? 100 : confidenceScore;
                                            
                                            let scoreColorClass = 'text-amber-500 bg-amber-500';
                                            let scoreText = 'Needs Manual Verification';
                                            let statusBadgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                                            
                                            if (finalScore >= 80) {
                                                scoreColorClass = 'text-emerald-500 bg-emerald-500';
                                                scoreText = 'Autonomous Matches Confirmed';
                                                statusBadgeColor = 'bg-emerald-150 text-emerald-800 border-emerald-300';
                                            } else if (finalScore < 50 && finalScore > 0) {
                                                scoreColorClass = 'text-rose-500 bg-rose-500';
                                                scoreText = 'Autonomous Confidence Critically Low';
                                                statusBadgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
                                            } else if (isRejected) {
                                                scoreColorClass = 'text-rose-500 bg-rose-500';
                                                scoreText = 'Manual Rejection Imposed';
                                                statusBadgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
                                            }
                                            
                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-slate-800">AI Confidence Index</span>
                                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusBadgeColor}`}>
                                                                    {selectedUser.verification_status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-semibold">{scoreText}</p>
                                                        </div>
                                                        <span className="text-2xl font-black text-slate-800 tracking-tight">{finalScore}%</span>
                                                    </div>
                                                    
                                                    {/* Custom Gauge meter */}
                                                    <div className="h-3 bg-slate-100 border border-slate-200/50 rounded-full w-full overflow-hidden shadow-inner p-0.5">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ${scoreColorClass}`} 
                                                            style={{ width: `${finalScore}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Autonomous verification_notes logs */}
                                        <div className="space-y-1.5 border-t border-slate-50 pt-3">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">AI Scan Details & Notes</h4>
                                            <p className="text-xs text-slate-600 bg-slate-50/50 border border-slate-100 p-4 rounded-2xl leading-relaxed italic">
                                                "{selectedUser.verification_notes || "No Tesseract autonomous scan history available. Fallback directly to manual reviewer evaluation."}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Manual Decision Review Form */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Manual Action Reviewer Decision Panel</h4>
                                    
                                    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
                                        <div className="space-y-1">
                                            <label htmlFor="manual-notes" className="text-xs font-bold text-slate-700">Official Reviewer Comments</label>
                                            <textarea 
                                                id="manual-notes"
                                                rows="3"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all shadow-inner"
                                                placeholder="Provide detailed reviewer feedback regarding matches, license checks, or credentials rejection reasons. This log is archived in platform audit reports."
                                                value={manualVerifyNotes}
                                                onChange={(e) => setManualVerifyNotes(e.target.value)}
                                            ></textarea>
                                        </div>

                                        <div className="flex gap-3 justify-end pt-1">
                                            <button 
                                                onClick={() => handleVerify(selectedUser.id, false, manualVerifyNotes)}
                                                className="px-5 py-2.5 bg-rose-50 hover:bg-rose-600 border border-rose-250 text-rose-700 hover:text-white font-extrabold text-xs rounded-2xl transition-all shadow-sm active:scale-95 duration-200 flex items-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-[16px] font-bold">cancel</span>
                                                Reject & Request Re-upload
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleVerify(selectedUser.id, true, manualVerifyNotes)}
                                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-sm shadow-emerald-250 active:scale-95 duration-200 flex items-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-[16px] font-bold">verified</span>
                                                Approve Credentials
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end flex-shrink-0">
                        <button 
                            onClick={() => { setSelectedUser(null); setUserModalTab('profile'); }}
                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors shadow-sm active:scale-95 duration-200"
                        >
                            Close Details
                        </button>
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
                    <button 
                        onClick={() => { setActiveTab('subscriptions'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'subscriptions' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                        Subscription Ledger
                    </button>
                    <button 
                        onClick={() => { setActiveTab('subscription_plans'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'subscription_plans' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">redeem</span>
                        PulseBox Plans
                    </button>
                    <button 
                        onClick={() => { setActiveTab('marketplace_products'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'marketplace_products' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">storefront</span>
                        Marketplace Products
                    </button>
                    <button 
                        onClick={() => { setActiveTab('ads'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'ads' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">ads_click</span>
                        Ad Approvals
                    </button>
                    <button 
                        onClick={() => { setActiveTab('logs'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                        Activity Logs
                    </button>
                    <button 
                        onClick={() => { setActiveTab('ai_copilot'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'ai_copilot' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                        AI Copilot
                    </button>
                    <button 
                        onClick={() => { setActiveTab('db_health'); setSearchTerm(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 font-semibold rounded-lg transition-colors ${activeTab === 'db_health' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">database</span>
                        Database Health
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
                {/* Mobile Header & Navigation */}
                <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <img src="/assets/images/logoo.png" alt="Logo" className="h-6 w-6 object-contain" />
                        <span className="text-md font-bold text-blue-600 tracking-tight">Admin<span className="text-slate-800">Pulse</span></span>
                    </div>
                    <select 
                        value={activeTab} 
                        onChange={(e) => { setActiveTab(e.target.value); setSearchTerm(''); }}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 outline-none font-semibold max-w-[140px]"
                    >
                        <option value="overview">Overview</option>
                        <option value="users">Users</option>
                        <option value="community">Community</option>
                        <option value="services">Services</option>
                        <option value="bookings">Bookings</option>
                        <option value="subscriptions">Subscriptions</option>
                        <option value="marketplace_products">Marketplace</option>
                        <option value="ads">Ad Approvals</option>
                        <option value="logs">Activity Logs</option>
                        <option value="ai_copilot">AI Copilot</option>
                        <option value="db_health">Database Health</option>
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
                    <div className="max-w-6xl mx-auto h-full">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'users' && renderUsers()}
                        {activeTab === 'community' && renderCommunity()}
                        {activeTab === 'services' && renderServices()}
                        {activeTab === 'bookings' && renderBookings()}
                        {activeTab === 'subscriptions' && renderSubscriptions()}
                        {activeTab === 'subscription_plans' && renderSubscriptionPlans()}
                        {activeTab === 'marketplace_products' && renderMarketplaceProducts()}
                        {activeTab === 'ads' && renderAds()}
                        {activeTab === 'logs' && renderLogs()}
                        {activeTab === 'ai_copilot' && renderAiCopilot()}
                        {activeTab === 'db_health' && renderDBHealth()}
                    </div>
                </div>
            </main>
            {renderProductModal()}
            {renderUserDetailsModal()}
        </div>
    );
};

export default Admin;
