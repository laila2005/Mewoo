import React, { useState, useEffect } from 'react';
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
        role: 'owner',
        clinic_name: '',
        license_number: '',
        specialties: '',
        shop_name: '',
        shop_category: 'General',
        business_address: '',
        tax_id: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const roleParam = queryParams.get('role');
        if (roleParam && ['owner', 'vet', 'trainer', 'vendor'].includes(roleParam.toLowerCase())) {
            setFormData(prev => ({ ...prev, role: roleParam.toLowerCase() }));
        }
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
            
            let payload = formData;
            let headers = {};

            // If registering a vet, trainer, or vendor, send multipart FormData
            if (formData.role !== 'owner') {
                const multipartData = new FormData();
                Object.keys(formData).forEach(key => {
                    // Only append active fields based on role
                    if (formData.role === 'vendor' && ['shop_name', 'shop_category', 'business_address', 'tax_id'].includes(key)) {
                        multipartData.append(key, formData[key]);
                    } else if ((formData.role === 'vet' || formData.role === 'trainer') && ['clinic_name', 'license_number', 'specialties'].includes(key)) {
                        multipartData.append(key, formData[key]);
                    } else if (!['shop_name', 'shop_category', 'business_address', 'tax_id', 'clinic_name', 'license_number', 'specialties'].includes(key)) {
                        multipartData.append(key, formData[key]);
                    }
                });

                if (selectedFile) {
                    multipartData.append('national_id', selectedFile);
                }
                payload = multipartData;
                headers = { 'Content-Type': 'multipart/form-data' };
            }

            const res = await axios.post(`${API_BASE}/auth/register`, payload, { headers });
            
            login(res.data.token, res.data.user);
            toast.success('Account created successfully!');
            if (res.data.user.role === 'vet' || res.data.user.role === 'trainer') {
                navigate('/pro-dashboard');
            } else if (res.data.user.role === 'vendor') {
                navigate('/vendor-dashboard');
            } else {
                navigate('/');
            }
        } catch (error) {
            const errData = error.response?.data;
            if (errData?.details) {
                const firstError = Object.values(errData.details)[0];
                toast.error(firstError || 'Registration failed');
            } else {
                toast.error(errData?.error || 'Registration failed');
            }
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
                                    minLength="8"
                                />
                                <span 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="material-symbols-outlined absolute right-4 text-slate-400 text-[18px] cursor-pointer hover:text-slate-600 select-none"
                                >
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 ml-1 mt-1">Must be at least 8 characters</p>
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
                                <option value="vendor">Pet Shop / Business</option>
                            </select>
                        </div>

                        {formData.role === 'vendor' && (
                            <div className="space-y-4 pt-2 border-t border-slate-200">
                                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Business Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-700 text-sm ml-1">Shop Name</label>
                                        <input className="w-full px-4 py-3 bg-slate-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl outline-none" name="shop_name" type="text" placeholder="Paws & Claws Store" onChange={handleChange} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-700 text-sm ml-1">Shop Category</label>
                                        <select name="shop_category" onChange={handleChange} className="w-full px-4 py-3 bg-slate-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl outline-none">
                                            <option value="General">General</option>
                                            <option value="Food">Food & Treats</option>
                                            <option value="Toys">Toys & Accessories</option>
                                            <option value="Grooming">Grooming</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-700 text-sm ml-1">Business Address</label>
                                        <input className="w-full px-4 py-3 bg-slate-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl outline-none" name="business_address" type="text" placeholder="123 Pet Street, City" onChange={handleChange} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-700 text-sm ml-1">Tax ID / Reg.</label>
                                        <input className="w-full px-4 py-3 bg-slate-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl outline-none" name="tax_id" type="text" placeholder="Optional" onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(formData.role === 'vet' || formData.role === 'trainer') && (
                            <div className="space-y-4 pt-2 border-t border-slate-200">
                                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Professional Credentials</h3>
                                {formData.role === 'vet' && (
                                    <div className="space-y-1.5">
                                        <label className="font-bold text-slate-700 text-sm ml-1">Clinic Name</label>
                                        <input className="w-full px-4 py-3 bg-slate-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl outline-none" name="clinic_name" type="text" placeholder="e.g. Hope Veterinary Clinic" onChange={handleChange} required />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 text-sm ml-1">Professional License Number</label>
                                    <input className="w-full px-4 py-3 bg-slate-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl outline-none" name="license_number" type="text" placeholder="e.g. LIC-2026-9812" onChange={handleChange} required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-bold text-slate-700 text-sm ml-1">Specialties (Comma Separated)</label>
                                    <input className="w-full px-4 py-3 bg-slate-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl outline-none" name="specialties" type="text" placeholder="e.g. Small Animals, Dentistry, Surgery" onChange={handleChange} />
                                </div>
                                
                                {/* Premium Drag and Drop Upload */}
                                <div className="space-y-2">
                                    <label className="font-bold text-slate-700 text-sm ml-1">Upload ID / Professional Certificate</label>
                                    <div 
                                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]); }}
                                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                                            dragging ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 bg-slate-50'
                                        }`}
                                    >
                                        <input 
                                            type="file" 
                                            id="national_id" 
                                            className="hidden" 
                                            accept="image/*,.pdf" 
                                            onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
                                        />
                                        <label htmlFor="national_id" className="cursor-pointer">
                                            <span className="material-symbols-outlined text-3xl text-slate-400 mb-2 block">cloud_upload</span>
                                            {selectedFile ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                        {selectedFile.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 mt-1 font-semibold">Drag or tap to replace</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-slate-600">Drag & Drop certificate or ID card here</span>
                                                    <span className="text-[10px] text-slate-400 mt-0.5 font-semibold">Supports PNG, JPG, PDF up to 5MB</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

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
