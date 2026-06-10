import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Extraction: Read token from location state (JWT from OTP) or query params (Hex from direct link)
    const resetToken = location.state?.resetToken || searchParams.get('token');

    useEffect(() => {
        if (!resetToken) {
            toast.error('Access Denied: Missing cryptographic recovery session token.');
            navigate('/forgot-password');
        }
    }, [resetToken, navigate]);

    // Password criteria checklist state
    const criteria = {
        length: newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        lowercase: /[a-z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        symbol: /[^A-Za-z0-9]/.test(newPassword)
    };

    const getStrengthScore = () => {
        let score = 0;
        if (criteria.length) score++;
        if (criteria.uppercase) score++;
        if (criteria.lowercase) score++;
        if (criteria.number) score++;
        if (criteria.symbol) score++;
        return score;
    };

    const getStrengthLabel = (score) => {
        if (score === 0) return { label: 'Empty', color: 'bg-slate-200', text: 'text-slate-400' };
        if (score <= 2) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
        if (score <= 4) return { label: 'Good', color: 'bg-amber-500', text: 'text-amber-500' };
        return { label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-500' };
    };

    const strength = getStrengthLabel(getStrengthScore());

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (getStrengthScore() < 4) {
            toast.error('Please configure a stronger password that satisfies the security requirements.');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('The passwords do not match. Please verify your entries.');
            return;
        }

        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
            await axios.post(`${API_BASE}/auth/reset-password`, {
                newPassword,
                resetToken
            });

            toast.success('Your password has been successfully updated!');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reset password. The session may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Left Section: Visual Design */}
            <section className="hidden lg:flex w-1/2 relative overflow-hidden flex-col bg-slate-900">
                <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&auto=format&fit=crop" alt="Woman with dog" className="absolute inset-0 w-full h-full object-cover opacity-65 mix-blend-overlay" />
                <div className="absolute inset-0 bg-blue-600/60 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/40 to-transparent"></div>
                
                <div className="relative z-10 flex flex-col h-full p-16 text-white justify-end">
                    <div className="mb-8">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-white text-2xl">verified_user</span>
                        </div>
                        <h1 className="text-[40px] font-extrabold mb-4 leading-tight font-display tracking-tight text-white">Fortify Your Profile<br/>Credentials.</h1>
                        <p className="text-white/80 font-medium text-[15px] leading-relaxed max-w-md">
                            PetPulse values security. Please establish a robust new password containing combinations of casing, numeric indices, and special glyphs.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold text-white/50 tracking-wider uppercase border-t border-white/10 pt-8 mt-4">
                        <span>Shield Integrity</span>
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></div>
                        <span>JWT Signature Validation</span>
                    </div>
                </div>
            </section>

            {/* Right Section: Form Workbench */}
            <section className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 lg:px-24 py-12 bg-white relative">
                <div className="max-w-[420px] w-full mx-auto">
                    <div className="mb-8">
                        <span className="text-[10px] uppercase font-extrabold text-blue-700 tracking-widest bg-blue-50 px-3 py-1 rounded-full">Credential Workshop</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 mt-3 font-display tracking-tight">New Password</h2>
                        <p className="text-slate-500 mt-2 font-medium text-sm">Create a robust and secure password for your PetPulse profile below.</p>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-800 text-[13px] ml-1">New Password</label>
                            <div className="relative flex items-center">
                                <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[20px]">lock</span>
                                <input 
                                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none text-sm font-medium placeholder-slate-400" 
                                    placeholder="Configure a strong password" 
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <span 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="material-symbols-outlined absolute right-4 text-slate-400 text-[18px] cursor-pointer hover:text-slate-600 select-none"
                                >
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </div>
                        </div>

                        {/* Password Strength Meter */}
                        {newPassword.length > 0 && (
                            <div className="space-y-2 px-1">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-wider">Strength Indicator</span>
                                    <span className={strength.text}>{strength.label}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                                    {Array(5).fill(0).map((_, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`h-full flex-1 transition-all duration-300 ${idx < getStrengthScore() ? strength.color : 'bg-slate-100'}`}
                                        />
                                    ))}
                                </div>

                                {/* Checklist Widgets */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-[14px] ${criteria.length ? 'text-green-500 font-bold' : 'text-slate-300'}`}>
                                            {criteria.length ? 'check_circle' : 'circle'}
                                        </span>
                                        <span className={`text-[11px] font-medium ${criteria.length ? 'text-slate-800' : 'text-slate-400'}`}>At least 8 characters</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-[14px] ${criteria.uppercase ? 'text-green-500 font-bold' : 'text-slate-300'}`}>
                                            {criteria.uppercase ? 'check_circle' : 'circle'}
                                        </span>
                                        <span className={`text-[11px] font-medium ${criteria.uppercase ? 'text-slate-800' : 'text-slate-400'}`}>One uppercase letter</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-[14px] ${criteria.lowercase ? 'text-green-500 font-bold' : 'text-slate-300'}`}>
                                            {criteria.lowercase ? 'check_circle' : 'circle'}
                                        </span>
                                        <span className={`text-[11px] font-medium ${criteria.lowercase ? 'text-slate-800' : 'text-slate-400'}`}>One lowercase letter</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-[14px] ${criteria.number ? 'text-green-500 font-bold' : 'text-slate-300'}`}>
                                            {criteria.number ? 'check_circle' : 'circle'}
                                        </span>
                                        <span className={`text-[11px] font-medium ${criteria.number ? 'text-slate-800' : 'text-slate-400'}`}>One numeric index</span>
                                    </div>
                                    <div className="flex items-center gap-2 col-span-2">
                                        <span className={`material-symbols-outlined text-[14px] ${criteria.symbol ? 'text-green-500 font-bold' : 'text-slate-300'}`}>
                                            {criteria.symbol ? 'check_circle' : 'circle'}
                                        </span>
                                        <span className={`text-[11px] font-medium ${criteria.symbol ? 'text-slate-800' : 'text-slate-400'}`}>One special glyph (e.g. @, #, $, %)</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-800 text-[13px] ml-1">Confirm Password</label>
                            <div className="relative flex items-center">
                                <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[20px]">lock_reset</span>
                                <input 
                                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none text-sm font-medium placeholder-slate-400" 
                                    placeholder="Re-enter your password to confirm" 
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <span 
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="material-symbols-outlined absolute right-4 text-slate-400 text-[18px] cursor-pointer hover:text-slate-600 select-none"
                                >
                                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-3.5 bg-blue-700 text-white font-bold text-sm rounded-xl shadow-[0_8px_20px_-6px_rgba(29,78,216,0.4)] hover:bg-blue-800 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? 'Fortifying Credentials...' : 'Apply New Password'}
                                {!loading && <span className="material-symbols-outlined text-[18px]">lock_open</span>}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default ResetPassword;
