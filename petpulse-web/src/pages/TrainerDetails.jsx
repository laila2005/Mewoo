import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BackButton from '../components/common/BackButton';
import SEO from '../components/common/SEO';
import ComingSoonBanner from '../components/common/ComingSoonBanner';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const TrainerDetails = () => {
    const [searchParams] = useSearchParams();
    const providerId = searchParams.get('id');
    const autoBook = searchParams.get('book') === 'true';
    
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [booking, setBooking] = useState(false);
    
    // Reviews state
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const [chatStatusData, setChatStatusData] = useState(null);
    const [isRequesting, setIsRequesting] = useState(false);

    const { token, user, isFeatureLive } = useAuth();
    const navigate = useNavigate();

    const timeSlots = ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM"];
    const isVet = provider?.type === 'vet';
    const vetGated = isVet && !isFeatureLive('vets'); // soft launch: vet booking not live yet

    const fetchReviews = async () => {
        if (!providerId) return;
        try {
            const res = await axios.get(`${API_BASE}/providers/${providerId}/reviews`);
            setReviews(res.data.reviews || []);
        } catch (error) {
            console.error("Failed to fetch reviews", error);
        } finally {
            setReviewsLoading(false);
        }
    };

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
        fetchReviews();
    }, [providerId, navigate]);

    useEffect(() => {
        if (autoBook && provider && !loading) {
            window.scrollTo({ top: document.getElementById('booking-section').offsetTop - 100, behavior: 'smooth' });
        }
    }, [autoBook, provider, loading]);

    useEffect(() => {
        const checkStatus = async () => {
            if (!provider || !token || user?.id === provider.id) return;
            
            try {
                const res = await axios.get(`${API_BASE}/chat/status?receiver_id=${provider.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setChatStatusData(res.data);
            } catch (error) {
                console.error("Failed to check chat status");
            }
        };
        checkStatus();
    }, [provider, token, user]);

    const handleAcceptRequest = async (requestId) => {
        if (!token) return;
        try {
            await axios.put(`${API_BASE}/chat/request/${requestId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Connection request accepted!');
            setChatStatusData(prev => ({
                ...prev,
                status: 'accepted'
            }));
            setProvider(prev => prev ? { ...prev, connections_count: (prev.connections_count || 0) + 1 } : null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to accept request');
        }
    };

    const handleDeclineRequest = async (requestId) => {
        if (!token) return;
        try {
            await axios.put(`${API_BASE}/chat/request/${requestId}/ignore`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Connection request declined');
            setChatStatusData(prev => ({
                ...prev,
                status: 'rejected'
            }));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to decline request');
        }
    };

    const handleSpamRequest = async (targetId) => {
        if (!token) return;
        try {
            await axios.post(`${API_BASE}/chat/spam`, { target_user_id: targetId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Reported as spam successfully');
            setChatStatusData(prev => ({
                ...prev,
                status: 'rejected',
                is_spam: true
            }));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to report spam');
        }
    };

    const handleUnspamRequest = async (targetId) => {
        if (!token) return;
        try {
            await axios.post(`${API_BASE}/chat/unspam`, { target_user_id: targetId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Marked as safe');
            setChatStatusData(prev => ({
                ...prev,
                is_spam: false
            }));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to remove spam status');
        }
    };

    const handleMessage = async () => {
        if (!user) { toast.error('Please login first'); navigate('/login'); return; }
        if (isRequesting) return;

        setIsRequesting(true);
        try {
            const res = await axios.post(`${API_BASE}/chat/request`, { receiver_id: provider.id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Connection request sent!');
            setChatStatusData({ status: 'pending', request: res.data.request || { sender_id: user.id, receiver_id: provider.id } });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send request');
        } finally {
            setIsRequesting(false);
        }
    };

    const handleBooking = async () => {
        if (vetGated) { toast('🐾 Vet booking is coming soon — we\'re onboarding verified vets!'); return; }
        if (!token) {
            toast.error('Please log in to book a session.');
            navigate('/login');
            return;
        }
        if (!date || !time) {
            toast.error('Please select both a date and a time slot.');
            return;
        }

        const actualPrice = provider?.consultation_fee && parseFloat(provider.consultation_fee) > 0 
            ? parseFloat(provider.consultation_fee) 
            : (isVet ? 450.00 : 350.00);
        const cartItem = {
            title: isVet ? 'Standard Checkup' : '1.5 Hour Session',
            base_price: actualPrice,
            provider_id: providerId,
            date,
            time
        };
        const existingCart = JSON.parse(localStorage.getItem('mewoo_cart') || '[]');
        existingCart.push(cartItem);
        localStorage.setItem('mewoo_cart', JSON.stringify(existingCart));
        
        navigate('/checkout');
    };

    const handleSubmitReview = async () => {
        if (!token) {
            toast.error("Please log in to leave a review.");
            navigate('/login');
            return;
        }
        if (userRating === 0) {
            toast.error("Please select a star rating.");
            return;
        }
        if (!commentText.trim()) {
            toast.error("Please write a comment for your review.");
            return;
        }

        setIsSubmittingReview(true);
        try {
            await axios.post(`${API_BASE}/providers/${providerId}/reviews`, {
                rating: userRating,
                comment: commentText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Review added successfully!");
            setUserRating(0);
            setCommentText('');
            fetchReviews();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to submit review.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading details...</div>;
    }

    if (!provider) return null;

    const sections = provider.custom_sections ? (typeof provider.custom_sections === 'string' ? JSON.parse(provider.custom_sections) : provider.custom_sections) : [];

    const averageRatingValue = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : "4.8";
    const reviewsCountValue = reviews.length > 0 ? reviews.length : 5;

    const seoTitle = isVet
        ? `Dr. ${provider.first_name} ${provider.last_name} | Verified Veterinarian`
        : `${provider.first_name} ${provider.last_name} | Certified Pet Trainer`;

    const seoDescription = provider.bio
        ? (provider.bio.length > 155 ? provider.bio.substring(0, 152) + '...' : provider.bio)
        : (isVet
            ? `Consult with Dr. ${provider.first_name} ${provider.last_name}, a verified veterinarian on PetPulse. View ratings, booking slots, and professional vet care.`
            : `Train with ${provider.first_name} ${provider.last_name}, a certified pet trainer on PetPulse. Puppy training, behavior correction, and advanced obedience classes.`);

    const seoKeywords = isVet
        ? `${provider.first_name} ${provider.last_name}, vet cairo, veterinarian egypt, ${provider.clinic_name || 'vet clinic'}, pet doctor, online vet appointment, petpulse`
        : `${provider.first_name} ${provider.last_name}, dog trainer cairo, pet training egypt, puppy training, dog behaviorist, positive reinforcement, petpulse`;

    const seoImage = provider.profile_pic_url || provider.cover_url || "/assets/images/logoo.png";

    const schemaData = isVet
        ? {
            "@context": "https://schema.org",
            "@type": "VeterinaryCare",
            "name": `Dr. ${provider.first_name} ${provider.last_name}`,
            "image": provider.profile_pic_url || "https://images.unsplash.com/photo-1628177142898-93e46e64c104?auto=format&fit=crop&q=80&w=300",
            "description": provider.bio || `Verified veterinary healthcare provider offering clinic visits and consultation services.`,
            "telephone": "+20-100-000-0000",
            "priceRange": provider.consultation_fee ? `EGP ${provider.consultation_fee}` : "EGP 450",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Cairo",
                "addressCountry": "EG"
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": averageRatingValue,
                "reviewCount": reviewsCountValue,
                "bestRating": "5",
                "worstRating": "1"
            },
            "review": reviews.length > 0 ? reviews.map(r => ({
                "@type": "Review",
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": r.rating || "5",
                    "bestRating": "5"
                },
                "author": {
                    "@type": "Person",
                    "name": `${r.first_name || 'Pet'} ${r.last_name || 'Lover'}`
                },
                "reviewBody": r.comment || "Great professional service!",
                "datePublished": r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : "2026-05-07"
            })) : [
                {
                    "@type": "Review",
                    "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": "5"
                    },
                    "author": {
                        "@type": "Person",
                        "name": "Amanda R."
                    },
                    "reviewBody": "Absolutely incredible! patient, professional, and knowledgeable.",
                    "datePublished": "2026-05-07"
                }
            ]
        }
        : {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": `${provider.first_name} ${provider.last_name} Dog Training`,
            "image": provider.profile_pic_url || "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?auto=format&fit=crop&q=80&w=300",
            "description": provider.bio || `Certified positive reinforcement trainer and pet behaviorist.`,
            "telephone": "+20-100-000-0000",
            "priceRange": provider.consultation_fee ? `EGP ${provider.consultation_fee}` : "EGP 350",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Cairo",
                "addressCountry": "EG"
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": averageRatingValue,
                "reviewCount": reviewsCountValue,
                "bestRating": "5",
                "worstRating": "1"
            },
            "review": reviews.length > 0 ? reviews.map(r => ({
                "@type": "Review",
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": r.rating || "5",
                    "bestRating": "5"
                },
                "author": {
                    "@type": "Person",
                    "name": `${r.first_name || 'Pet'} ${r.last_name || 'Lover'}`
                },
                "reviewBody": r.comment || "Great professional service!",
                "datePublished": r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : "2026-05-07"
            })) : [
                {
                    "@type": "Review",
                    "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": "5"
                    },
                    "author": {
                        "@type": "Person",
                        "name": "Amanda R."
                    },
                    "reviewBody": "Absolutely incredible! patient, professional, and knowledgeable.",
                    "datePublished": "2026-05-07"
                }
            ]
        };

    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)]">
            <SEO 
                title={seoTitle}
                description={seoDescription}
                keywords={seoKeywords}
                image={seoImage}
                type="profile"
                schema={schemaData}
            />
            <main className="max-w-7xl mx-auto px-6 py-8">
                <BackButton className="mb-6" to={isVet ? "/vets" : "/trainers"} />
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
                                        <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                                <span className="material-symbols-outlined text-[16px]">verified</span> 
                                                Verified {isVet ? 'Veterinarian' : 'Trainer'}
                                            </span>
                                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100/50">
                                                <span className="material-symbols-outlined text-[16px]">group</span> 
                                                {provider.connections_count || 0} Connections
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-blue-600 font-bold mb-4">{isVet ? (provider.clinic_name || 'Veterinary Clinic') : (provider.specialties ? provider.specialties.join(', ') : 'Professional Trainer')}</p>
                                    <p className="text-slate-600 leading-relaxed font-medium">{provider.bio || 'No bio available for this provider.'}</p>
                                    
                                    {/* Connection / Message Controls */}
                                    {user?.id !== provider.id && (
                                        <div className="mt-4 flex flex-wrap gap-2.5 justify-center md:justify-start">
                                            {chatStatusData?.is_spam ? (
                                                <button onClick={() => handleUnspamRequest(provider.id)} className="bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-2 shadow-sm text-sm">
                                                    <span className="material-symbols-outlined text-[18px]">verified_user</span> Mark Safe
                                                </button>
                                            ) : chatStatusData?.status === 'accepted' ? (
                                                <button onClick={() => navigate('/messages', { state: { chatUser: { id: provider.id, first_name: provider.first_name, last_name: provider.last_name, profile_pic_url: provider.profile_pic_url, role: provider.role || (isVet ? 'vet' : 'trainer') } } })} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-sm">
                                                    <span className="material-symbols-outlined text-[18px]">chat</span> Chat Now
                                                </button>
                                            ) : chatStatusData?.status === 'pending' ? (
                                                chatStatusData.request?.sender_id === user?.id ? (
                                                    <button disabled className="bg-slate-100 text-slate-400 font-bold py-2 px-5 rounded-xl flex items-center gap-2 cursor-not-allowed text-sm">
                                                        <span className="material-symbols-outlined text-[18px] animate-pulse">pending</span> Pending Request
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button 
                                                            onClick={() => handleAcceptRequest(chatStatusData.request.id)} 
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm text-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">check</span> Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeclineRequest(chatStatusData.request.id)} 
                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm text-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">close</span> Ignore
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSpamRequest(provider.id)} 
                                                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm text-sm"
                                                            title="Mark as Spam"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">report</span> Spam
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                <button onClick={handleMessage} disabled={isRequesting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm">
                                                    <span className="material-symbols-outlined text-[18px]">{isRequesting ? 'sync' : 'group_add'}</span> 
                                                    {isRequesting ? 'Sending...' : 'Connect'}
                                                </button>
                                            )}
                                        </div>
                                    )}
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
                            {sections.map((sec, i) => {
                                if (sec.title === 'Training Methodology') {
                                    const methodologies = sec.content.split(', ');
                                    return (
                                        <div key={i} className="p-6 md:p-8 border-b border-slate-100">
                                            <h2 className="text-xl font-bold mb-4 text-slate-800">{sec.title}</h2>
                                            <div className="flex flex-wrap gap-2.5">
                                                {methodologies.map((method, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl text-xs font-black text-blue-700 flex items-center gap-2 shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px] font-black text-blue-600">verified</span>
                                                        {method}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={i} className="p-6 md:p-8 border-b border-slate-100">
                                        <h2 className="text-xl font-bold mb-4 text-slate-800">{sec.title}</h2>
                                        <p className="text-slate-600 leading-relaxed whitespace-pre-line font-medium">{sec.content}</p>
                                    </div>
                                );
                            })}

                            {/* Reviews & Recommendations */}
                            <div className="p-6 md:p-8 bg-slate-50/30">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
                                        Reviews & Recommendations
                                    </h2>
                                    {reviews.length > 0 && (
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                            {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} Overall Rating
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {reviewsLoading ? (
                                        <p className="text-slate-400 text-sm font-medium">Loading reviews...</p>
                                    ) : reviews.length > 0 ? (
                                        reviews.map((rev) => (
                                            <div key={rev.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-0.5">
                                                <img 
                                                    src={rev.profile_pic_url || `https://ui-avatars.com/api/?name=${rev.first_name}`} 
                                                    className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-50" 
                                                    alt={`${rev.first_name} ${rev.last_name}`} 
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-bold text-slate-800 text-sm">{rev.first_name} {rev.last_name}</h4>
                                                        <span className="text-xs font-semibold text-slate-400">
                                                            {new Date(rev.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex text-amber-400 mb-2">
                                                        {[1,2,3,4,5].map(star => (
                                                            <span 
                                                                key={star} 
                                                                className="material-symbols-outlined text-[14px]" 
                                                                style={{fontVariationSettings: star <= rev.rating ? "'FILL' 1" : "'FILL' 0"}}
                                                            >
                                                                star
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">"{rev.comment}"</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div>
                                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-0.5 mb-4">
                                                <img src="https://i.pravatar.cc/150?img=32" className="w-12 h-12 rounded-full object-cover shadow-sm border border-slate-50" alt="Amanda R." />
                                                <div>
                                                    <div className="flex items-start justify-between mb-1">
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
                                    )}
                                </div>
                                    
                                {/* Add Review Section */}
                                <div className="mt-8 pt-8 border-t border-slate-200/60">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Leave a Review</h3>
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-sm font-bold text-slate-600">Your Rating:</span>
                                            <div className="flex gap-1 cursor-pointer">
                                                {[1,2,3,4,5].map(star => (
                                                    <span 
                                                        key={`rate-${star}`} 
                                                        onMouseEnter={() => setHoverRating(star)}
                                                        onMouseLeave={() => setHoverRating(0)}
                                                        onClick={() => setUserRating(star)}
                                                        className={`material-symbols-outlined transition-colors ${
                                                            star <= (hoverRating || userRating) ? 'text-amber-400' : 'text-slate-300'
                                                        }`}
                                                        style={{fontVariationSettings: star <= (hoverRating || userRating) ? "'FILL' 1" : "'FILL' 0"}}
                                                    >
                                                        star
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea 
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="w-full bg-slate-50 border-0 rounded-xl p-4 text-sm font-medium text-slate-700 placeholder-slate-400 focus:ring-0 resize-none outline-none mb-4" 
                                            rows="3" 
                                            placeholder={`Share your experience with ${provider ? provider.first_name : 'this provider'}...`}
                                        ></textarea>
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={handleSubmitReview}
                                                disabled={isSubmittingReview}
                                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isSubmittingReview ? 'Submitting...' : 'Submit Review'} 
                                                <span className="material-symbols-outlined text-[18px]">send</span>
                                            </button>
                                        </div>
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
                                    <span className="text-lg font-extrabold text-blue-600">
                                        EGP {provider?.consultation_fee && parseFloat(provider.consultation_fee) > 0 
                                            ? parseFloat(provider.consultation_fee) 
                                            : (isVet ? 450.00 : 350.00)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Includes full assessment and take-home guide.</p>
                            </div>

                            {vetGated && (
                                <ComingSoonBanner
                                    className="mb-3"
                                    title="Vet booking is coming soon"
                                    message="We're onboarding verified veterinarians. You can view this profile now and book once we go live."
                                />
                            )}
                            {/* CTA Button */}
                            <button
                                onClick={handleBooking}
                                disabled={booking || vetGated}
                                className={`w-full py-3.5 rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2 ${vetGated ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30 disabled:opacity-70'}`}
                            >
                                {booking ? <span className="material-symbols-outlined animate-spin">refresh</span> : null}
                                {vetGated ? 'Coming Soon' : (booking ? 'Processing...' : 'Confirm Booking')}
                            </button>
                            {!vetGated && <p className="text-center text-xs text-slate-500 font-medium">No payment required until after session.</p>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TrainerDetails;
