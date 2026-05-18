import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
            if (res.data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Left Section: Visuals */}
            <section className="hidden lg:flex w-1/2 relative overflow-hidden flex-col bg-slate-900">
                <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&auto=format&fit=crop" alt="Woman with dog" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
                <div className="absolute inset-0 bg-blue-600/70 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/40 to-transparent"></div>
                
                <div className="relative z-10 flex flex-col h-full p-16 text-white justify-end">
                    <div className="mb-8">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-white text-2xl">pets</span>
                        </div>
                        <h1 className="text-[42px] font-extrabold mb-4 leading-tight font-display tracking-tight text-white">Elevating Care for<br/>Your Best Friend.</h1>
                        <p className="text-lg text-blue-50 font-medium max-w-[400px] leading-relaxed mb-8">Join thousands of pet parents who trust PetPulse for medical records, wellness tracking, and premium care support.</p>
                        
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3 pr-6 rounded-2xl w-max border border-white/20">
                            <div className="flex -space-x-3">
                                <img src="https://i.pravatar.cc/100?img=1" className="w-10 h-10 rounded-full border-2 border-blue-800 object-cover" alt="User 1"/>
                                <img src="https://i.pravatar.cc/100?img=2" className="w-10 h-10 rounded-full border-2 border-blue-800 object-cover" alt="User 2"/>
                                <img src="https://i.pravatar.cc/100?img=3" className="w-10 h-10 rounded-full border-2 border-blue-800 object-cover" alt="User 3"/>
                            </div>
                            <div>
                                <div className="flex text-amber-400 text-sm mb-0.5">
                                    <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                    <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                </div>
                                <p className="text-xs font-bold text-white">Trusted by 50,000+ Owners</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Slideshow indicators */}
                    <div className="flex gap-2 justify-center mt-4">
                        <div className="w-6 h-1.5 bg-white rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                    </div>
                </div>
            </section>

            {/* Right Section: Form */}
            <section className="w-full lg:w-1/2 flex flex-col justify-center px-6 md:px-16 py-12 relative bg-white">
                <div className="w-full max-w-[420px] mx-auto">
                    <div className="mb-10 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-white text-xl">pets</span>
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-blue-900 font-display">PetPulse</span>
                        </div>
                        <h2 className="text-[28px] font-extrabold text-slate-900 mb-2">Welcome Back</h2>
                        <p className="text-slate-500 font-medium text-center text-sm">Login to your account to manage your pet's care.</p>
                    </div>

                    <div className="space-y-6">
                        <button className="w-full py-3 px-4 border border-slate-200 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors font-bold text-slate-700 text-sm shadow-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Or login with</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-800 text-[13px] ml-1">Username/Email</label>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[20px]">person</span>
                                    <input 
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none text-sm font-medium placeholder-slate-400" 
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
                                    <label className="font-bold text-slate-800 text-[13px]">Password</label>
                                    <a className="font-bold text-blue-600 text-[12px] hover:underline" href="#">Forgot Password?</a>
                                </div>
                                <div className="relative flex items-center">
                                    <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[20px]">lock</span>
                                    <input 
                                        className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none text-sm font-medium placeholder-slate-400" 
                                        placeholder="Enter your password" 
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-3.5 bg-blue-700 text-white font-bold text-sm rounded-xl shadow-[0_8px_20px_-6px_rgba(29,78,216,0.4)] hover:bg-blue-800 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? 'Logging in...' : 'Log In'}
                                    {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-8 text-center text-[13px]">
                        <p className="text-slate-500 font-medium">
                            Don't have an account? <Link to="/signup" className="text-blue-700 font-bold hover:underline">Sign Up</Link>
                        </p>
                    </div>
                    
                    <div className="mt-12 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-slate-600 transition-colors">Support</a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Login;
