import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const TrainerDetails = () => {
    const [searchParams] = useSearchParams();
    const providerId = searchParams.get('id');
    const autoBook = searchParams.get('book') === 'true';
    
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [booking, setBooking] = useState(false);
    const { token } = useAuth();
    const navigate = useNavigate();

    const timeSlots = ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM"];

    useEffect(() => {
        if (!providerId) {
            toast.error('No provider specified.');
            navigate('/trainers');
            return;
        }

        const fetchProvider = async () => {
            try {
                const res = await axios.get(`${API_BASE}/providers/${providerId}`);
                if (res.data.provider) {
                    setProvider(res.data.provider);
                }
            } catch (error) {
                console.error("Failed to fetch provider", error);
                toast.error('Error loading provider details.');
                navigate('/trainers');
            } finally {
                setLoading(false);
            }
        };

        fetchProvider();
    }, [providerId, navigate]);

    useEffect(() => {
        if (autoBook && provider && !loading) {
            window.scrollTo({ top: document.getElementById('booking-section').offsetTop - 100, behavior: 'smooth' });
        }
    }, [autoBook, provider, loading]);

    const handleBooking = async () => {
        if (!token) {
            toast.error('Please log in to book a session.');
            navigate('/login');
            return;
        }
        if (!date || !time) {
            toast.error('Please select both a date and a time slot.');
            return;
        }

        const cartItem = {
            title: isVet ? 'Standard Checkup' : '1.5 Hour Session',
            base_price: 120.00,
            provider_id: providerId,
            date,
            time
        };
        const existingCart = JSON.parse(localStorage.getItem('mewoo_cart') || '[]');
        existingCart.push(cartItem);
        localStorage.setItem('mewoo_cart', JSON.stringify(existingCart));
        
        navigate('/checkout');
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading details...</div>;
    }

    if (!provider) return null;

    const sections = provider.custom_sections ? (typeof provider.custom_sections === 'string' ? JSON.parse(provider.custom_sections) : provider.custom_sections) : [];
    const isVet = provider.type === 'vet';

    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)]">
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            {/* Banner */}
                            {provider.cover_url && (
                                <div className="w-full h-48 md:h-64 bg-slate-200">
                                    <img src={provider.cover_url} className="w-full h-full object-cover" alt="Cover photo" />
                                </div>
                            )}

                            {/* Main Info */}
                            <div className={`p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center md:items-start ${provider.cover_url ? '-mt-16 md:-mt-20 relative z-10' : ''}`}>
                                <img 
                                    src={provider.profile_pic_url || `https://ui-avatars.com/api/?name=${provider.first_name}&background=d4e3ff&color=005da7`} 
                                    className={`w-32 h-32 rounded-full object-cover shadow-md border-4 border-white ${provider.cover_url ? 'bg-white' : ''}`}
                                    alt={`${provider.first_name} ${provider.last_name}`}
                                />
                                <div className={`text-center md:text-left flex-1 ${provider.cover_url ? 'mt-4 md:mt-16' : ''}`}>
                                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
                                        <h1 className="text-3xl font-extrabold text-slate-900">{provider.first_name} {provider.last_name}</h1>
                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold w-max mx-auto md:mx-0 border border-emerald-100">
                                            <span className="material-symbols-outlined text-[16px]">verified</span> 
                                            Verified {isVet ? 'Veterinarian' : 'Trainer'}
                                        </span>
                                    </div>
                                    <p className="text-blue-600 font-bold mb-4">{isVet ? (provider.clinic_name || 'Veterinary Clinic') : (provider.specialties ? provider.specialties.join(', ') : 'Professional Trainer')}</p>
                                    <p className="text-slate-600 leading-relaxed font-medium">{provider.bio || 'No bio available for this provider.'}</p>
                                </div>
                            </div>

                            {/* Specializations */}
                            {!isVet && provider.specialties && provider.specialties.length > 0 && (
                                <div className="p-6 md:p-8 border-b border-slate-100">
                                    <h2 className="text-xl font-bold mb-6 text-slate-800">Specializations</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {provider.specialties.map((spec, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{spec}</h4>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Sections */}
                            {sections.map((sec, i) => (
                                <div key={i} className="p-6 md:p-8 border-b border-slate-100">
                                    <h2 className="text-xl font-bold mb-4 text-slate-800">{sec.title}</h2>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-line font-medium">{sec.content}</p>
                                </div>
                            ))}

                            {/* Reviews & Recommendations */}
                            <div className="p-6 md:p-8 bg-slate-50/30">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
                                        Reviews & Recommendations
                                    </h2>
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">4.9 Overall Rating</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-0.5">
                                        <img src="https://i.pravatar.cc/150?img=32" className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-50" alt="Amanda R." />
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-bold text-slate-800 text-sm">Amanda R.</h4>
                                                <span className="text-xs font-semibold text-slate-400">2 weeks ago</span>
                                            </div>
                                            <div className="flex text-amber-400 mb-2">
                                                {[1,2,3,4,5].map(star => <span key={star} className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">"Absolutely incredible! They helped my rescue dog overcome severe separation anxiety. Extremely patient, professional, and knowledgeable. Highly recommended to anyone looking for top-tier care!"</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-0.5">
                                        <img src="https://i.pravatar.cc/150?img=11" className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-50" alt="David M." />
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-bold text-slate-800 text-sm">David M.</h4>
                                                <span className="text-xs font-semibold text-slate-400">1 month ago</span>
                                            </div>
                                            <div className="flex text-amber-400 mb-2">
                                                {[1,2,3,4,5].map(star => <span key={star} className="material-symbols-outlined text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">"The best in the area hands down. Always available for questions and truly cares about the well-being of the pets. You can tell they have a genuine passion for what they do."</p>
                                        </div>
                                    </div>
                                    </div>
                                    
                                    {/* Add Review Section */}
                                    <div className="mt-8 pt-8 border-t border-slate-200/60">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Leave a Review</h3>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-sm font-bold text-slate-600">Your Rating:</span>
                                                <div className="flex gap-1 text-slate-300 cursor-pointer">
                                                    {[1,2,3,4,5].map(star => (
                                                        <span key={`rate-${star}`} className="material-symbols-outlined hover:text-amber-400 transition-colors" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <textarea 
                                                className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-medium text-slate-700 placeholder-slate-400 focus:ring-0 resize-none outline-none mb-4" 
                                                rows="3" 
                                                placeholder={`Share your experience with ${provider ? provider.first_name : 'this trainer'}...`}
                                            ></textarea>
                                            <div className="flex justify-end">
                                                <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                                                    Submit Review <span className="material-symbols-outlined text-[18px]">send</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                    </div>

                    {/* Right Sidebar - Booking */}
                    <div className="lg:col-span-1" id="booking-section">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24 space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">event_available</span>
                                {isVet ? 'Book Consultation' : 'Book Training Session'}
                            </h2>

                            {/* Date Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium" 
                                />
                            </div>

                            {/* Time Selection */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-sm text-slate-700">Available Times</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {timeSlots.map((ts, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => setTime(ts)}
                                            className={`border rounded-xl p-3 text-center cursor-pointer transition-colors font-bold text-sm ${time === ts ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300 text-slate-600'}`}
                                        >
                                            {ts}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Session Info */}
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-700">{isVet ? 'Standard Checkup' : '1.5 Hour Session'}</span>
                                    <span className="text-lg font-extrabold text-blue-600">EGP 1200</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Includes full assessment and take-home guide.</p>
                            </div>

                            {/* CTA Button */}
                            <button 
                                onClick={handleBooking}
                                disabled={booking}
                                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {booking ? <span className="material-symbols-outlined animate-spin">refresh</span> : null}
                                {booking ? 'Processing...' : 'Confirm Booking'}
                            </button>
                            <p className="text-center text-xs text-slate-500 font-medium">No payment required until after session.</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    );
};

export default TrainerDetails;
