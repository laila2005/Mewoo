import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [method, setMethod] = useState('email'); // 'email' | 'phone'
    const [emailMethod, setEmailMethod] = useState('code'); // 'code' | 'link'
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState('request'); // 'request' | 'verify'
    const [code, setCode] = useState(Array(6).fill(''));
    const [resendTimer, setResendTimer] = useState(0);

    const inputRefs = useRef([]);

    useEffect(() => {
        let timer;
        if (resendTimer > 0) {
            timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendTimer]);

    const handleSendRecovery = async (e) => {
        e.preventDefault();
        if (!identifier) {
            toast.error(`Please enter your ${method === 'email' ? 'email address' : 'phone number'}`);
            return;
        }

        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
            const res = await axios.post(`${API_BASE}/auth/forgot-password`, {
                deliveryMethod: method,
                identifier: identifier.trim(),
                emailMethod: method === 'email' ? emailMethod : undefined
            });

            toast.success(res.data.message);
            setResendTimer(60); // 60s cooldown

            if (method === 'email' && emailMethod === 'link') {
                // Link sent directly, no verification stage needed on frontend immediately
                // User will click link, so we stay on request page with a helpful info banner
            } else {
                // Code sent, go to verification stage
                setStage('verify');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to request password recovery. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (element, index) => {
        if (isNaN(element.value)) return false;

        const newCode = [...code];
        newCode[index] = element.value;
        setCode(newCode);

        // Auto focus next input
        if (element.value !== '' && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        const enteredCode = code.join('');
        if (enteredCode.length < 6) {
            toast.error('Please enter the full 6-digit recovery code');
            return;
        }

        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
            const res = await axios.post(`${API_BASE}/auth/verify-recovery-code`, {
                identifier: identifier.trim(),
                code: enteredCode
            });

            toast.success('Code verified successfully!');
            // Pass the resetToken to the ResetPassword page state
            navigate('/reset-password', { state: { resetToken: res.data.resetToken } });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
            const res = await axios.post(`${API_BASE}/auth/forgot-password`, {
                deliveryMethod: method,
                identifier: identifier.trim(),
                emailMethod: method === 'email' ? emailMethod : undefined
            });
            toast.success(res.data.message || 'Verification code resent successfully.');
            setResendTimer(60);
            setCode(Array(6).fill(''));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Resend failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Left Section: Visual Design (Matching Cairo Theme Guidelines) */}
            <section className="hidden lg:flex w-1/2 relative overflow-hidden flex-col bg-slate-900">
                <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&auto=format&fit=crop" alt="Woman with dog" className="absolute inset-0 w-full h-full object-cover opacity-65 mix-blend-overlay" />
                <div className="absolute inset-0 bg-blue-600/60 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/40 to-transparent"></div>
                
                <div className="relative z-10 flex flex-col h-full p-16 text-white justify-end">
                    <div className="mb-8">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-white text-2xl animate-pulse">lock_open</span>
                        </div>
                        <h1 className="text-[40px] font-extrabold mb-4 leading-tight font-display tracking-tight text-white">Secure & Effortless<br/>Account Recovery.</h1>
                        <p className="text-white/80 font-medium text-[15px] leading-relaxed max-w-md">
                            Recover your PetPluse profile seamlessly with industry-standard two-channel authentication protocols. Care for your companions is never far away.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-bold text-white/50 tracking-wider uppercase border-t border-white/10 pt-8 mt-4">
                        <span>Shield Integrity</span>
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></div>
                        <span>SHA-256 OTP Encryption</span>
                    </div>
                </div>
            </section>

            {/* Right Section: Form Workbench */}
            <section className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-16 lg:px-24 py-12 bg-white relative">
                <div className="absolute top-8 left-8 lg:left-12">
                    <Link to="/login" className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Back to Login
                    </Link>
                </div>

                <div className="max-w-[420px] w-full mx-auto">
                    {stage === 'request' ? (
                        <div>
                            <div className="mb-8">
                                <span className="text-[10px] uppercase font-extrabold text-blue-700 tracking-widest bg-blue-50 px-3 py-1 rounded-full">Recovery Portal</span>
                                <h2 className="text-3xl font-extrabold text-slate-900 mt-3 font-display tracking-tight">Forgot Password?</h2>
                                <p className="text-slate-500 mt-2 font-medium text-sm">Select your preferred authentication channel and we will guide you through the process.</p>
                            </div>

                            {/* Method Tabs */}
                            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
                                <button 
                                    onClick={() => { setMethod('email'); setIdentifier(''); }}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${method === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">mail</span>
                                    Email Address
                                </button>
                                <button 
                                    onClick={() => { setMethod('phone'); setIdentifier(''); }}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${method === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">phone_iphone</span>
                                    Phone Number
                                </button>
                            </div>

                            <form onSubmit={handleSendRecovery} className="space-y-6">
                                {/* Email Sub-Methods Selector */}
                                {method === 'email' && (
                                    <div className="space-y-2">
                                        <label className="font-bold text-slate-800 text-[13px] ml-1">Delivery Mechanism</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div 
                                                onClick={() => setEmailMethod('code')}
                                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${emailMethod === 'code' ? 'border-blue-600 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`material-symbols-outlined text-[18px] ${emailMethod === 'code' ? 'text-blue-600' : 'text-slate-400'}`}>pin</span>
                                                    <div>
                                                        <p className="font-bold text-xs text-slate-800">Email Code</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">Get a 6-digit OTP</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div 
                                                onClick={() => setEmailMethod('link')}
                                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${emailMethod === 'link' ? 'border-blue-600 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`material-symbols-outlined text-[18px] ${emailMethod === 'link' ? 'text-blue-600' : 'text-slate-400'}`}>link</span>
                                                    <div>
                                                        <p className="font-bold text-xs text-slate-800">Reset Button</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">Click recovery link</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-800 text-[13px] ml-1">
                                        {method === 'email' ? 'Email Address' : 'Phone Number'}
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[20px]">
                                            {method === 'email' ? 'mail' : 'call'}
                                        </span>
                                        <input 
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none text-sm font-medium placeholder-slate-400" 
                                            placeholder={method === 'email' ? 'e.g. john@example.com' : 'e.g. +201012345678'} 
                                            type={method === 'email' ? 'email' : 'tel'}
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-3.5 bg-blue-700 text-white font-bold text-sm rounded-xl shadow-[0_8px_20px_-6px_rgba(29,78,216,0.4)] hover:bg-blue-800 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? 'Processing Recovery...' : 'Send Recovery Dispatch'}
                                    {!loading && <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>}
                                </button>
                            </form>

                            {method === 'email' && emailMethod === 'link' && resendTimer > 0 && (
                                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                                    <span className="material-symbols-outlined text-emerald-600 text-[20px] mt-0.5">check_circle</span>
                                    <div>
                                        <p className="font-bold text-xs text-emerald-900">Email Dispatched Successfully</p>
                                        <p className="text-[11px] text-emerald-600 mt-1 font-medium">Please check your inbox (or backend logs in the sandbox fallback) and click the link to reset your password.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="mb-8">
                                <span className="text-[10px] uppercase font-extrabold text-blue-700 tracking-widest bg-blue-50 px-3 py-1 rounded-full">Secure Verification</span>
                                <h2 className="text-3xl font-extrabold text-slate-900 mt-3 font-display tracking-tight">Enter Code</h2>
                                <p className="text-slate-500 mt-2 font-medium text-sm">We have dispatched a 6-digit secure recovery token to <strong className="text-slate-800 font-bold">{identifier}</strong>. Enter it below to proceed.</p>
                            </div>

                            <form onSubmit={handleVerifyCode} className="space-y-6">
                                <div className="flex justify-between gap-2.5">
                                    {code.map((val, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            maxLength="1"
                                            ref={(el) => (inputRefs.current[idx] = el)}
                                            value={val}
                                            onChange={(e) => handleCodeChange(e.target, idx)}
                                            onKeyDown={(e) => handleKeyDown(e, idx)}
                                            className="w-12 h-14 text-center text-xl font-extrabold bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none"
                                        />
                                    ))}
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-3.5 bg-blue-700 text-white font-bold text-sm rounded-xl shadow-[0_8px_20px_-6px_rgba(29,78,216,0.4)] hover:bg-blue-800 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? 'Verifying...' : 'Validate Code'}
                                    {!loading && <span className="material-symbols-outlined text-[18px]">verified</span>}
                                </button>
                            </form>

                            <div className="mt-8 text-center text-xs">
                                <p className="text-slate-400 font-medium">
                                    Didn't receive the dispatch?{' '}
                                    {resendTimer > 0 ? (
                                        <span className="text-slate-500 font-bold">Resend code in {resendTimer}s</span>
                                    ) : (
                                        <button 
                                            onClick={handleResend}
                                            disabled={loading}
                                            className="text-blue-700 font-bold hover:underline bg-transparent border-none outline-none cursor-pointer"
                                        >
                                            Resend Verification
                                        </button>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default ForgotPassword;
