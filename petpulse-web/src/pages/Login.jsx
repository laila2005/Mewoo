import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
            const res = await axios.post(`${API_BASE}/auth/login`, {
                email,
                password
            });
            
            login(res.data.token, res.data.user);
            toast.success('Logged in successfully!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Left Section: Visuals */}
            <section className="hidden lg:flex w-1/2 bg-blue-600 relative overflow-hidden flex-col">
                <div className="absolute inset-0 bg-blue-600"></div>
                <div className="relative z-10 flex flex-col h-full p-12 text-white">
                    <Link to="/" className="flex items-center gap-2 w-max">
                        <span className="material-symbols-outlined text-3xl">arrow_back</span>
                        <span className="font-medium text-blue-50 hover:text-white transition-colors">Back to home</span>
                    </Link>
                    <div className="mt-auto mb-12">
                        <h1 className="text-5xl font-black mb-6 leading-tight font-display">Welcome to<br/>the future of<br/>pet care.</h1>
                        <p className="text-xl text-blue-100 font-medium max-w-md leading-relaxed">Join thousands of pet owners, vets, and trainers connecting on PetPulse.</p>
                    </div>
                </div>
            </section>

            {/* Right Section: Form */}
            <section className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-12 py-12 relative">
                <div className="w-full max-w-[420px]">
                    <div className="mb-10 flex flex-col items-center lg:items-start">
                        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-white text-2xl">pets</span>
                            </div>
                            <span className="text-3xl font-extrabold tracking-tight text-slate-800 font-display">PetPulse</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome Back</h2>
                        <p className="text-slate-500 font-medium">Login to your account to manage your pet's care.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 text-sm ml-1">Username/Email</label>
                            <div className="relative flex items-center">
                                <span className="material-symbols-outlined absolute left-4 text-slate-400">person</span>
                                <input 
                                    className="w-full pl-12 pr-4 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none" 
                                    placeholder="Username or Email" 
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <label className="font-bold text-slate-700 text-sm">Password</label>
                                <a className="font-bold text-blue-600 text-sm hover:underline" href="#">Forgot Password?</a>
                            </div>
                            <div className="relative flex items-center">
                                <span className="material-symbols-outlined absolute left-4 text-slate-400">lock</span>
                                <input 
                                    className="w-full pl-12 pr-4 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none" 
                                    placeholder="Enter your password" 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 text-white font-bold text-base rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? 'Logging in...' : 'Log In'}
                                {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 text-center lg:text-left">
                        <p className="text-slate-600">
                            Don't have an account? <Link to="/signup" className="text-blue-600 font-bold hover:underline">Sign Up</Link>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Login;
