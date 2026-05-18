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
            <section className="hidden lg:flex w-1/2 bg-blue-600 relative overflow-hidden flex-col">
                <div className="absolute inset-0 bg-blue-600"></div>
                <div className="relative z-10 flex flex-col h-full p-12 text-white">
                    <Link to="/" className="flex items-center gap-2 w-max">
                        <span className="material-symbols-outlined text-3xl">arrow_back</span>
                        <span className="font-medium text-blue-50 hover:text-white transition-colors">Back to home</span>
                    </Link>
                    <div className="mt-auto mb-12">
                        <h1 className="text-5xl font-black mb-6 leading-tight font-display">Join the<br/>PetPulse<br/>Community.</h1>
                        <p className="text-xl text-blue-100 font-medium max-w-md leading-relaxed">Create an account today and manage your pet's life with ease.</p>
                    </div>
                </div>
            </section>

            {/* Right Section: Form */}
            <section className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-12 py-12 relative overflow-y-auto">
                <div className="w-full max-w-[420px]">
                    <div className="mb-8 flex flex-col items-center lg:items-start">
                        <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-white text-2xl">pets</span>
                            </div>
                            <span className="text-3xl font-extrabold tracking-tight text-slate-800 font-display">PetPulse</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
                        <p className="text-slate-500 font-medium">Join us as a Pet Owner, Vet, or Trainer.</p>
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
                            <input 
                                className="w-full px-4 py-3 bg-slate-100 border-transparent focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all duration-200 outline-none" 
                                placeholder="Create a password" 
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
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
