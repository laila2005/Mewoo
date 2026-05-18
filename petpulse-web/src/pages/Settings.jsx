import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Settings = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('account');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    
    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const submitPasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwords.new_password !== passwords.confirm_password) {
            toast.error("New passwords do not match!");
            return;
        }
        if (passwords.new_password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            await axios.put(`${API_BASE}/auth/password`, {
                current_password: passwords.current_password,
                new_password: passwords.new_password
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Password updated successfully!");
            setShowPasswordForm(false);
            setPasswords({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            toast.error(error.response?.data?.error || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirm1 = window.confirm("Are you ABSOLUTELY sure? This will delete all your data permanently.");
        if (!confirm1) return;
        const confirm2 = window.confirm("Please confirm one more time to delete your account. This action cannot be undone.");
        if (!confirm2) return;

        try {
            await axios.delete(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Account successfully deleted. We are sorry to see you go.");
            logout();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete account");
        }
    };

    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex flex-col">
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(-1)}>
                            <span className="material-symbols-outlined text-slate-500 hover:text-blue-600 transition-colors">arrow_back</span>
                            <span className="text-xl font-bold text-slate-800 ml-2">Settings</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[700px]">
                    
                    {/* Sidebar Navigation */}
                    <div className="w-full md:w-72 bg-slate-50/50 border-r border-slate-100 p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-8 px-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <span className="material-symbols-outlined text-xl">settings</span>
                            </div>
                            <h2 className="text-lg font-bold">Preferences</h2>
                        </div>

                        <nav className="space-y-1 flex-1">
                            <button 
                                onClick={() => setActiveTab('account')} 
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all text-left ${activeTab === 'account' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">person</span>
                                Account Information
                            </button>
                            <button 
                                onClick={() => setActiveTab('privacy')} 
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all text-left ${activeTab === 'privacy' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">security</span>
                                Privacy & Security
                            </button>
                        </nav>
                        
                        <div className="mt-auto border-t border-slate-200 pt-6">
                            <nav className="space-y-1">
                                <button onClick={() => navigate('/faq')} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium transition-all text-left">
                                    <span className="material-symbols-outlined text-[20px]">help_center</span>
                                    Help Center
                                </button>
                                <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 font-medium transition-all text-left">
                                    <span className="material-symbols-outlined text-[20px]">logout</span>
                                    Log Out
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 md:p-12 relative bg-white">
                        
                        {/* TAB: ACCOUNT */}
                        {activeTab === 'account' && (
                            <div className="animate-fade-in">
                                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Account Information</h2>
                                <p className="text-slate-500 mb-10">Manage your basic profile settings and credentials.</p>

                                <div className="space-y-8 max-w-2xl">
                                    {/* Email */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-600 text-[20px]">mail</span> Email Address
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <input type="email" disabled className="bg-transparent border-none text-slate-600 font-medium w-full outline-none" value={user?.email || 'Loading...'}/>
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">Verified</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-3 border-t border-slate-200 pt-3">To change your email address, please contact support.</p>
                                    </div>

                                    {/* Password */}
                                    <div className={`bg-slate-50 p-6 rounded-2xl border transition-all ${showPasswordForm ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-100'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-blue-600 text-[20px]">key</span> Password
                                            </h3>
                                            {!showPasswordForm && (
                                                <button onClick={() => setShowPasswordForm(true)} className="text-blue-600 font-bold text-sm hover:underline">Change</button>
                                            )}
                                        </div>
                                        
                                        {!showPasswordForm && (
                                            <div className="text-slate-500 font-mono tracking-widest mt-2">••••••••</div>
                                        )}

                                        {/* Expandable Form */}
                                        {showPasswordForm && (
                                            <form className="mt-6 space-y-4 border-t border-slate-200 pt-6" onSubmit={submitPasswordUpdate}>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                                                    <input 
                                                        type="password" 
                                                        name="current_password"
                                                        value={passwords.current_password}
                                                        onChange={handlePasswordChange}
                                                        required 
                                                        className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                                                    <input 
                                                        type="password" 
                                                        name="new_password"
                                                        value={passwords.new_password}
                                                        onChange={handlePasswordChange}
                                                        required 
                                                        minLength="8" 
                                                        className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                                                    <input 
                                                        type="password" 
                                                        name="confirm_password"
                                                        value={passwords.confirm_password}
                                                        onChange={handlePasswordChange}
                                                        required 
                                                        minLength="8" 
                                                        className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-3 pt-2">
                                                    <button type="button" onClick={() => setShowPasswordForm(false)} className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                                                    <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50">
                                                        {loading ? 'Updating...' : 'Update Password'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: PRIVACY & SECURITY */}
                        {activeTab === 'privacy' && (
                            <div className="animate-fade-in">
                                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Privacy & Security</h2>
                                <p className="text-slate-500 mb-10">Manage your data, notifications, and account security.</p>

                                <div className="space-y-8 max-w-2xl">
                                    {/* Notification Preferences */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-600 text-[20px]">notifications</span> Notification Preferences
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Community Updates', desc: 'New posts, comments, and likes on your content', defaultChecked: true },
                                                { label: 'Appointment Reminders', desc: 'Upcoming vet and trainer appointments', defaultChecked: true },
                                                { label: 'Messages', desc: 'New chat requests and direct messages', defaultChecked: true },
                                                { label: 'Marketing & Promotions', desc: 'PulseBox deals, marketplace sales, and events', defaultChecked: false },
                                            ].map((pref, i) => (
                                                <div key={i} className="flex items-center justify-between py-2">
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800">{pref.label}</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">{pref.desc}</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" defaultChecked={pref.defaultChecked} className="sr-only peer" />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Data Export */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-600 text-[20px]">download</span> Export Your Data
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4">Download a copy of all your data including pet profiles, appointments, and community posts.</p>
                                        <button onClick={() => toast.success('Your data export has been queued. You will receive an email shortly.')} className="bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center gap-2 shadow-sm">
                                            <span className="material-symbols-outlined text-[18px]">cloud_download</span> Request Data Export
                                        </button>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
                                        <h3 className="text-lg font-bold text-red-600 flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined">warning</span> Danger Zone
                                        </h3>
                                        <p className="text-sm text-red-800/70 mb-6 font-medium">Once you delete your account, there is no going back. All your data, pet records, and appointments will be permanently removed.</p>
                                        <button onClick={handleDeleteAccount} className="bg-white border-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold py-3 px-6 rounded-xl transition-all text-sm w-full sm:w-auto shadow-sm">
                                            Delete My Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
