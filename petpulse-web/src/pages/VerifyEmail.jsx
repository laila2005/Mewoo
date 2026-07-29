import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// States: 'verifying' | 'success' | 'error' | 'notoken'
const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState(token ? 'verifying' : 'notoken');
    const [message, setMessage] = useState('');
    const [resending, setResending] = useState(false);

    const isLoggedIn = !!localStorage.getItem('token');

    const verify = useCallback(async () => {
        try {
            const res = await axios.post(`${API_BASE}/auth/verify-email`, { token });
            setStatus('success');
            setMessage(res.data.message || 'Your email has been verified. You can now log in.');
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.error || 'This verification link is invalid or has expired.');
        }
    }, [token]);

    useEffect(() => {
        if (token) verify();
    }, [token, verify]);

    const handleResend = async () => {
        if (!isLoggedIn) return;
        setResending(true);
        try {
            const res = await axios.post(`${API_BASE}/auth/resend-verification`, {});
            toast.success(res.data.message || 'Verification email sent. Please check your inbox.');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Could not resend the verification email.');
        } finally {
            setResending(false);
        }
    };

    const Icon = () => {
        if (status === 'verifying') {
            return <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />;
        }
        const map = {
            success: { icon: 'mark_email_read', ring: 'bg-emerald-50 text-emerald-600' },
            error: { icon: 'link_off', ring: 'bg-rose-50 text-rose-600' },
            notoken: { icon: 'mark_email_unread', ring: 'bg-blue-50 text-blue-600' },
        }[status];
        return (
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${map.ring}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '34px' }}>{map.icon}</span>
            </div>
        );
    };

    const heading = {
        verifying: 'Verifying your email…',
        success: 'Email verified!',
        error: "We couldn't verify that link",
        notoken: 'Check your inbox',
    }[status];

    const subtext = {
        verifying: 'Hang tight while we confirm your email address.',
        success: message,
        error: message,
        notoken: 'We sent you a verification link. Open it from your inbox to confirm your email address.',
    }[status];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10 text-center">
                <Link to="/" className="inline-flex items-center gap-1.5 mb-8 text-blue-600 font-extrabold text-lg">
                    <span>🐾</span> PetPulse
                </Link>

                <div className="flex justify-center mb-6">
                    <Icon />
                </div>

                <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{heading}</h1>
                <p className="text-slate-600 leading-relaxed mb-8">{subtext}</p>

                {/* Primary actions per state */}
                {status === 'success' && (
                    <Link
                        to={isLoggedIn ? '/' : '/login'}
                        className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                    >
                        {isLoggedIn ? 'Continue to PetPulse' : 'Continue to log in'}
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                )}

                {(status === 'error' || status === 'notoken') && (
                    <div className="space-y-3">
                        {isLoggedIn ? (
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
                            >
                                {resending ? 'Sending…' : 'Resend verification email'}
                                {!resending && <span className="material-symbols-outlined text-base">forward_to_inbox</span>}
                            </button>
                        ) : (
                            <Link
                                to="/login"
                                className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                            >
                                Log in to resend
                            </Link>
                        )}
                        <Link to="/" className="block text-sm text-slate-500 hover:text-slate-700 hover:underline">
                            Back to Home
                        </Link>
                    </div>
                )}

                {status === 'verifying' && (
                    <p className="text-xs text-slate-400">This only takes a moment.</p>
                )}
            </div>

            <p className="mt-6 text-xs text-slate-400 text-center max-w-md">
                Having trouble? Make sure you opened the most recent link — verification links expire after 24 hours.
            </p>
        </div>
    );
};

export default VerifyEmail;
