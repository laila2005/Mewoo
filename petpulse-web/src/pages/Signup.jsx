import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Signup = () => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'owner'
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
            const res = await axios.post(`${API_BASE}/auth/register`, formData);
            
            login(res.data.token, res.data.user);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Registration failed');
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
            <section className="w-full lg:w-1/2 flex flex-col justify-center px-6 md:px-16 py-12 relative overflow-y-auto bg-white">
                <div className="w-full max-w-[420px] mx-auto">
                    <div className="mb-10 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-white text-xl">pets</span>
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-blue-900 font-display">PetPulse</span>
                        </div>
                        <h2 className="text-[28px] font-extrabold text-slate-900 mb-2">Create Account</h2>
                        <p className="text-slate-500 font-medium text-center text-sm">Join us as a Pet Owner, Vet, or Trainer.</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 text-sm ml-1">First Name</label>
                                <input 
                                    className="w-full px-4 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none" 
                                    placeholder="John" 
                                    name="first_name"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700 text-sm ml-1">Last Name</label>
                                <input 
                                    className="w-full px-4 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none" 
                                    placeholder="Doe" 
                                    name="last_name"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 text-sm ml-1">Email Address</label>
                            <input 
                                className="w-full px-4 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none" 
                                placeholder="name@example.com" 
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 text-sm ml-1">Password</label>
                            <div className="relative flex items-center">
                                <input 
                                    className="w-full pl-4 pr-10 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none" 
                                    placeholder="Create a password" 
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
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

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-700 text-sm ml-1">I am a...</label>
                            <select 
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none appearance-none font-medium text-slate-700"
                            >
                                <option value="owner">Pet Owner</option>
                                <option value="vet">Veterinarian</option>
                                <option value="trainer">Pet Trainer</option>
                            </select>
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 text-white font-bold text-base rounded-xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? 'Creating Account...' : 'Sign Up'}
                                {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center lg:text-left">
                        <p className="text-slate-600">
                            Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log In</Link>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Signup;
