import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/common/SEO';
import ComingSoonBanner from '../components/common/ComingSoonBanner';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Static Tailwind color maps to bypass dynamic compilation limits and guarantee premium visual styling
const getColorClasses = (color) => {
    const maps = {
        blue: {
            border: 'border-blue-500 shadow-blue-500/10',
            bgRecommended: 'bg-blue-600',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
            btnBg: 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/30 text-white shadow-lg',
            badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            glow: 'shadow-blue-500/10'
        },
        indigo: {
            border: 'border-indigo-500 shadow-indigo-500/10',
            bgRecommended: 'bg-indigo-600',
            iconBg: 'bg-indigo-50',
            iconText: 'text-indigo-600',
            btnBg: 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/30 text-white shadow-lg',
            badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            glow: 'shadow-indigo-500/10'
        },
        emerald: {
            border: 'border-emerald-500 shadow-emerald-500/10',
            bgRecommended: 'bg-emerald-600',
            iconBg: 'bg-emerald-50',
            iconText: 'text-emerald-600',
            btnBg: 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/30 text-white shadow-lg',
            badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            glow: 'shadow-emerald-500/10'
        },
        teal: {
            border: 'border-teal-500 shadow-teal-500/10',
            bgRecommended: 'bg-teal-600',
            iconBg: 'bg-teal-50',
            iconText: 'text-teal-600',
            btnBg: 'bg-teal-600 hover:bg-teal-500 hover:shadow-teal-500/30 text-white shadow-lg',
            badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
            glow: 'shadow-teal-500/10'
        },
        rose: {
            border: 'border-rose-500 shadow-rose-500/10',
            bgRecommended: 'bg-rose-600',
            iconBg: 'bg-rose-50',
            iconText: 'text-rose-600',
            btnBg: 'bg-rose-600 hover:bg-rose-500 hover:shadow-rose-500/30 text-white shadow-lg',
            badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
            glow: 'shadow-rose-500/10'
        },
        violet: {
            border: 'border-violet-500 shadow-violet-500/10',
            bgRecommended: 'bg-violet-600',
            iconBg: 'bg-violet-50',
            iconText: 'text-violet-600',
            btnBg: 'bg-violet-600 hover:bg-violet-500 hover:shadow-violet-500/30 text-white shadow-lg',
            badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
            glow: 'shadow-violet-500/10'
        }
    };
    return maps[color] || maps.indigo;
};

const PulseBox = () => {
    const { user, token, isFeatureLive } = useAuth();
    const subsLive = isFeatureLive('subscriptions');
    const navigate = useNavigate();

    // Map user.role to normalized selector string
    const userRole = user?.role ? user.role.toLowerCase().trim() : 'owner';

    // Set selected active tab segment based on current user's role
    const [selectedRole, setSelectedRole] = useState('owner');
    
    // Seed fallbacks for standard and professional accounts to protect UI stability
    const defaultTiers = [
        // Owners (Standard Box Subscription)
        {
            id: 'tier_starter',
            name: 'The Puppy Starter',
            price: 450,
            frequency: '/month',
            description: 'Perfect for new pet parents navigating the puppy phase with essential care.',
            features: ['Teething Toys & Chewies', 'Organic Training Treats', 'Step-by-Step Puppy Wellness Guide', 'Basic Grooming & Safe Comb Kit'],
            recommended: false,
            color: 'blue',
            target_role: 'owner'
        },
        {
            id: 'tier_chewer',
            name: 'Premium Chewers Club',
            price: 650,
            frequency: '/month',
            description: 'Heavy-duty durability & health items for large or aggressive chewers.',
            features: ['2 Ultra-Tough Custom Rubber Toys', 'Long-lasting Organic Yak Chews', 'Joint & Hip Health Supplements', 'Dental Care Spray & Cleaning Kit'],
            recommended: true,
            color: 'indigo',
            target_role: 'owner'
        },
        {
            id: 'tier_senior',
            name: 'Senior Wellness Box',
            price: 550,
            frequency: '/month',
            description: 'Tailored comfort items, supplements, and vitamins for aging pets.',
            features: ['Orthopedic Comfort Support Items', 'Digestive Care Probiotics & Supplements', 'Soft Baked Low-Sodium Treats', 'Veterinary-Approved Vitamins & Minerals'],
            recommended: false,
            color: 'emerald',
            target_role: 'owner'
        },
        // Vets
        {
            id: 'vet_starter',
            name: 'Clinic Starter',
            price: 300,
            frequency: '/month',
            description: 'Essential digital presence and standard booking management for local Cairo clinics.',
            features: ['Verified Digital Profile & Working Hours', 'Basic Online Appointment Booking Engine', 'Email Appointment Alerts', 'Standard Interactive Map Pin'],
            recommended: false,
            color: 'teal',
            target_role: 'vet'
        },
        {
            id: 'vet_professional',
            name: 'Clinic Professional',
            price: 800,
            frequency: '/month',
            description: 'All-inclusive package for maximum clinic growth, priority search and telehealth tools.',
            features: ['Verified Telehealth Video Consult Portal', 'Priority Glowing Map Pin (Nearest Search Boost)', 'Premium Pro Gold Profile Badge', 'Unlimited Appointments & Direct Schedules', 'SMS Patient Appointment Reminders'],
            recommended: true,
            color: 'emerald',
            target_role: 'vet'
        },
        // Vendors
        {
            id: 'vendor_essential',
            name: 'Marketplace Essential',
            price: 400,
            frequency: '/month',
            description: 'Establish your storefront and list your pet products on the Egypt Marketplace.',
            features: ['Custom Storefront Profile & Details', 'Up to 20 Active Product Listings', 'Standard Checkout & Order Integration', 'Basic Sales & Views Analytics Dashboard'],
            recommended: false,
            color: 'rose',
            target_role: 'vendor'
        },
        {
            id: 'vendor_powerhouse',
            name: 'Marketplace Powerhouse',
            price: 1200,
            frequency: '/month',
            description: 'For established retailers seeking dominance with ads, unlimited catalog, and advanced analytics.',
            features: ['Unlimited Active Product Listings', 'Sponsored Storefront Pin (Top Directory Placement)', 'Priority Listing Boosts (Market Search Boost)', 'Advanced Sales & Customer Demographics Analytics', 'Monthly Featured Spotlight Banner Ad Space'],
            recommended: true,
            color: 'indigo',
            target_role: 'vendor'
        },
        // Trainers
        {
            id: 'trainer_standard',
            name: 'Academy Standard',
            price: 250,
            frequency: '/month',
            description: 'Essential platform exposure and booking schedule for certified animal behaviorists.',
            features: ['Certified Behaviorist Trainer Badge', 'Standard Class Booking & Availability Slots', 'Instant Client Chat Access', 'Standard Directory Listing placement'],
            recommended: false,
            color: 'violet',
            target_role: 'trainer'
        },
        {
            id: 'trainer_elite',
            name: 'Master Academy Elite',
            price: 600,
            frequency: '/month',
            description: 'Premium exposure for top academies offering complex group classes, glow status and boosted leads.',
            features: ['Priority Glowing Map Pin (Nearest Search)', 'Premium "Elite Trainer" Diamond Badge', 'Structured Group Class Scheduling Support', 'Unlimited Client Database Management', 'Advanced Client & Pet Training Progress Tracking'],
            recommended: true,
            color: 'violet',
            target_role: 'trainer'
        }
    ];

    const [tiers, setTiers] = useState(defaultTiers);
    const [loading, setLoading] = useState(true);

    // Auto-select tab matching current user's role on load
    useEffect(() => {
        if (userRole && ['owner', 'vet', 'vendor', 'trainer'].includes(userRole)) {
            setSelectedRole(userRole);
        }
    }, [userRole]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const headers = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const response = await fetch(`${API_BASE}/public/plans`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.plans && data.plans.length > 0) {
                        const parsedPlans = data.plans.map(p => ({
                            ...p,
                            features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features
                        }));
                        setTiers(parsedPlans);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch subscription plans:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, [token]);

    const handleSubscribe = (tier) => {
        if (!subsLive) return; // paid subscriptions not live yet (soft launch)
        if (!user) {
            navigate('/login', { state: { from: '/pulsebox' } });
            return;
        }
        // Redirect to checkout with subscription details
        navigate('/checkout', { 
            state: { 
                isSubscription: true,
                plan: tier 
            }
        });
    };

    // Filter plans dynamically based on selected role tab
    const filteredTiers = tiers.filter(tier => (tier.target_role || 'owner') === selectedRole);

    // Custom personalized banners mapping each role tab to professional copy details
    const getPersonalizedBanner = () => {
        switch (selectedRole) {
            case 'vet':
                return {
                    title: "🩺 Scale Your Veterinary Practice",
                    desc: "Deliver premium pet healthcare and digital accessibility to pet parents across Egypt. Clinic subscriptions unlock telehealth suites, online doctor profiles, and proximity mapping boosts to drive organic appointments.",
                    icon: "medical_services",
                    gradient: "from-emerald-50 to-teal-50 border-emerald-100",
                    badge: "bg-emerald-600",
                    text: "text-emerald-950"
                };
            case 'vendor':
                return {
                    title: "🏪 Establish Storefront Dominance",
                    desc: "Build a customized storefront directly in the PetPluse Marketplace. Essential and Powerhouse packages let your shop upload unlimited catalogs, implement instant checkouts, and boost your views with spotlight ads.",
                    icon: "storefront",
                    gradient: "from-rose-50 to-orange-50 border-rose-100",
                    badge: "bg-rose-600",
                    text: "text-rose-950"
                };
            case 'trainer':
                return {
                    title: "🎓 Unlock Certified Academy Tools",
                    desc: "Acquire new clients, coordinate group schedules, and stand out in our professional directory. Academy plans provide behavioral badge seals, client communication lines, and pet training progress trackers.",
                    icon: "school",
                    gradient: "from-violet-50 to-fuchsia-50 border-violet-100",
                    badge: "bg-violet-600",
                    text: "text-violet-950"
                };
            default:
                return {
                    title: "🐾 Premium Monthly Surprises & Wellness",
                    desc: "Every PulseBox is curated specifically for your pet's age, breed, weight, and behavioral needs. Packed with premium chew toys, delicious organic training treats, and expert-crafted developmental wellness guides.",
                    icon: "celebration",
                    gradient: "from-blue-50 to-indigo-50 border-blue-100",
                    badge: "bg-blue-600",
                    text: "text-slate-900"
                };
        }
    };

    const activeBanner = getPersonalizedBanner();

    const pulseBoxSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "PulseBox - Monthly Premium Treat & Toy Subscription",
        "description": "Custom monthly treat, teething toy, and wellness box delivered directly to your doorstep in Egypt.",
        "image": "https://petpulse-web.vercel.app/assets/images/logoo.png",
        "brand": {
            "@type": "Brand",
            "name": "PetPluse"
        },
        "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "EGP",
            "lowPrice": "250",
            "highPrice": "1200",
            "offerCount": "9"
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <SEO 
                title="PulseBox Premium Subscription Plans"
                description="Subscribe to PulseBox for monthly tailored boxes loaded with durable chewing toys and delicious organic treats, or upgrade your professional medical, training, or storefront business account."
                keywords="pulsebox, pet subscription egypt, dog treat box cairo, cat toys subscription, puppy box cairo, petpulse, vet subscriptions, store plans"
                schema={pulseBoxSchema}
            />

            {/* ── Back Navigation ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {!subsLive && (
                    <ComingSoonBanner
                        className="mb-4"
                        title="Paid subscriptions are coming soon"
                        message="You can browse the plans below, but checkout isn't live yet — we'll switch it on shortly. Meanwhile, everything in Community, Lost & Found, and Adoption is fully available."
                    />
                )}
                <Link
                    to="/"
                    className="w-fit flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-200 active:scale-[0.98] group"
                >
                    <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-0.5">arrow_back</span>
                    <span className="text-sm font-bold">Back to Home</span>
                </Link>
            </div>

            {/* Hero Section with personalized copy tailored to the user's role type */}
            <div className="relative overflow-hidden bg-slate-950 text-white mt-6">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&q=80&w=1920" 
                        alt="Happy Pet Box" 
                        className="w-full h-full object-cover opacity-25 object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
                    {userRole === 'owner' ? (
                        <>
                            <span className="inline-block py-1 px-3.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs tracking-widest uppercase mb-5 border border-blue-500/30">
                                🐾 Pet Owner Subscription
                            </span>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
                                Joy Delivered. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-indigo-500">Every Single Month.</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-medium mb-8 leading-relaxed">
                                Tailored premium toys, organic healthy treats, and expert-crafted wellness guides curated specifically for your pet's breed and developmental needs.
                            </p>
                        </>
                    ) : userRole === 'vet' ? (
                        <>
                            <span className="inline-block py-1 px-3.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs tracking-widest uppercase mb-5 border border-emerald-500/30">
                                🩺 Veterinary Clinic Plans
                            </span>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
                                Scale Practice. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Unlock Digital Care.</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-medium mb-8 leading-relaxed">
                                Connect with thousand of active pet owners in Cairo. Publish booking slots, provide telehealth rooms, and showcase your certified clinic badges.
                            </p>
                        </>
                    ) : userRole === 'vendor' ? (
                        <>
                            <span className="inline-block py-1 px-3.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs tracking-widest uppercase mb-5 border border-rose-500/30">
                                🏪 Boutique Storefront Plans
                            </span>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
                                Marketplace Power. <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400 font-black">Sell to Thousands.</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-medium mb-8 leading-relaxed">
                                Showcase your catalog to organic pet owners across Egypt. Access robust checkouts, display glowing badges, and review analytical trends.
                            </p>
                        </>
                    ) : (
                        <>
                            <span className="inline-block py-1 px-3.5 rounded-full bg-violet-500/20 text-violet-300 font-bold text-xs tracking-widest uppercase mb-5 border border-violet-500/30">
                                🎓 Certified Academy Plans
                            </span>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
                                Master Training. <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Attract Elite Clients.</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-medium mb-8 leading-relaxed">
                                Expand your professional behavioral academy. Open scheduling slots, verify certification credentials, and guide client pet development.
                            </p>
                        </>
                    )}

                    <div className="flex flex-wrap justify-center gap-4">
                        <a href="#plans" className="bg-white text-slate-950 hover:bg-slate-100 px-8 py-4 rounded-2xl font-extrabold text-base transition-all shadow-xl shadow-white/5">
                            View Personalized Packages
                        </a>
                        <a href="#how-it-works" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-base transition-all border border-white/10">
                            How it Works
                        </a>
                    </div>
                </div>
            </div>

            {/* How it Works (Standardized display to build customer trust) */}
            <div id="how-it-works" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">How PetPluse Subscriptions Work</h2>
                        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">Three automated steps to complete your platform upgrade or delivery setup.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 z-0 border-t border-dashed border-slate-300"></div>

                        <div className="relative z-10 text-center flex flex-col items-center group">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100 transform rotate-3 transition-transform group-hover:rotate-6">
                                <span className="material-symbols-outlined text-3xl font-bold">assignment_ind</span>
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900 mb-2">1. Select Your Target Plan</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs">
                                Check the options specific to your user role. Whether you are an owner ordering premium toys, or a business upgrading access, select your perfect tier.
                            </p>
                        </div>

                        <div className="relative z-10 text-center flex flex-col items-center group">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100 transform -rotate-3 transition-transform group-hover:-rotate-6">
                                <span className="material-symbols-outlined text-3xl font-bold">payments</span>
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900 mb-2">2. Frictionless Secure Checkout</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs">
                                Complete your billing profile and process payment safely over our Paymob gateway. Instantly activates subscription roles or schedules local box shipping.
                            </p>
                        </div>

                        <div className="relative z-10 text-center flex flex-col items-center group">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100 transform rotate-3 transition-transform group-hover:rotate-6">
                                <span className="material-symbols-outlined text-3xl font-bold">celebration</span>
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900 mb-2">3. Active Premium Status</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs">
                                Enjoy immediate access! Owners receive boxes at their doorstep, and professionals unlock glowing directory pins, telehealth credentials, and sales dashboards.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Section containing role-segmented controls */}
            <div id="plans" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                            {user ? 'Your Premium Packages' : 'Choose Your Premium Package'}
                        </h2>
                        <p className="text-slate-500 text-base font-medium max-w-xl mx-auto">
                            {user 
                                ? 'Tailored plans and features matching your professional role or pet owner status.'
                                : 'Switch tabs to explore plans. Active accounts automatically highlight matching subscriptions with a personalized tag.'
                            }
                        </p>
                    </div>

                    {/* Segmented Tab Control: Styled with premium HSL states and active user highlights */}
                    {!user && (
                        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto mb-10 p-1.5 bg-slate-200/50 backdrop-blur-md rounded-2xl border border-slate-200">
                            <button
                                onClick={() => setSelectedRole('owner')}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 ${
                                    selectedRole === 'owner'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-600 hover:text-blue-600 hover:bg-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">cruelty_free</span>
                                <span>Pet Owner</span>
                                {userRole === 'owner' && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[8px] tracking-wider uppercase font-black bg-white text-blue-600 rounded-md">You</span>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setSelectedRole('vet')}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 ${
                                    selectedRole === 'vet'
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-slate-600 hover:text-emerald-600 hover:bg-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">medical_services</span>
                                <span>Clinic / Vet</span>
                                {userRole === 'vet' && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[8px] tracking-wider uppercase font-black bg-white text-emerald-600 rounded-md">You</span>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setSelectedRole('vendor')}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 ${
                                    selectedRole === 'vendor'
                                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                                        : 'text-slate-600 hover:text-rose-600 hover:bg-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">storefront</span>
                                <span>Boutique Merchant</span>
                                {userRole === 'vendor' && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[8px] tracking-wider uppercase font-black bg-white text-rose-600 rounded-md">You</span>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setSelectedRole('trainer')}
                                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 ${
                                    selectedRole === 'trainer'
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                        : 'text-slate-600 hover:text-violet-600 hover:bg-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">school</span>
                                <span>Trainer Academy</span>
                                {userRole === 'trainer' && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[8px] tracking-wider uppercase font-black bg-white text-violet-600 rounded-md">You</span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Detailed Role-Based Feature Panel Callout */}
                    <div className={`max-w-4xl mx-auto bg-gradient-to-r ${activeBanner.gradient} border rounded-3xl p-6 md:p-8 mb-12 flex flex-col md:flex-row items-center gap-6 shadow-sm transition-all duration-500`}>
                        <div className={`w-14 h-14 rounded-2xl ${activeBanner.badge} text-white flex items-center justify-center shrink-0 shadow-md`}>
                            <span className="material-symbols-outlined text-2xl font-bold">{activeBanner.icon}</span>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className={`text-base font-extrabold ${activeBanner.text} mb-1.5`}>{activeBanner.title}</h4>
                            <p className="text-slate-600 text-sm leading-relaxed font-medium">
                                {activeBanner.desc}
                            </p>
                        </div>
                    </div>

                    {/* Loading State or Custom Plan Grid */}
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500 font-semibold">Loading packages details...</p>
                        </div>
                    ) : (
                        <div className={`grid grid-cols-1 ${filteredTiers.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-5xl mx-auto'} gap-8 items-stretch`}>
                            {filteredTiers.map((tier) => {
                                const colors = getColorClasses(tier.color || 'indigo');
                                return (
                                    <div 
                                        key={tier.id} 
                                        className={`relative bg-white rounded-3xl p-8 flex flex-col border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2.5 ${
                                            tier.recommended 
                                                ? `${colors.border} shadow-xl ${colors.glow}` 
                                                : 'border-slate-100 shadow-sm hover:border-slate-200'
                                        }`}
                                    >
                                        {tier.recommended && (
                                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${colors.bgRecommended} text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm`}>
                                                Most Popular
                                            </div>
                                        )}
                                        
                                        {/* User Identity Match Highlight */}
                                        {userRole === tier.target_role && (
                                            <div className="absolute top-4 right-4 bg-slate-900 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                                Matching Role
                                            </div>
                                        )}
                                        
                                        <div className="mb-6">
                                            <h3 className="text-xl font-black text-slate-900 mb-2">{tier.name}</h3>
                                            <p className="text-slate-500 font-semibold text-xs leading-relaxed min-h-[40px]">{tier.description}</p>
                                        </div>
                                        
                                        <div className="mb-6 pb-6 border-b border-slate-100 flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-slate-950">EGP {tier.price}</span>
                                            <span className="text-slate-400 font-bold text-xs uppercase">{tier.frequency}</span>
                                        </div>
                                        
                                        <ul className="space-y-4 mb-8 flex-1">
                                            {tier.features.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <div className={`w-5 h-5 rounded-full ${colors.iconBg} ${colors.iconText} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                        <span className="material-symbols-outlined text-[12px] font-extrabold">check</span>
                                                    </div>
                                                    <span className="text-slate-700 font-semibold text-xs leading-tight">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        
                                        <button
                                            onClick={() => handleSubscribe(tier)}
                                            disabled={!subsLive}
                                            className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 ${
                                                !subsLive
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : tier.recommended
                                                        ? `${colors.btnBg}`
                                                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                            }`}
                                        >
                                            {subsLive ? 'Subscribe Now' : 'Coming Soon'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Happiness & Trust Guarantee banner */}
            <div className="bg-slate-900 text-white py-16 border-t border-slate-800">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-4xl text-blue-400 mb-5">verified_user</span>
                    <h2 className="text-2xl font-black mb-3">The PetPluse Guarantee & Active Support</h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6 max-w-2xl">
                        Upgrade with full peace of mind. We stand behind our platform packages: Pet owners get a 100% money-back guarantee, and business/professional accounts receive onboarding sessions and digital audit calls.
                    </p>
                    <div className="flex gap-1.5 text-amber-400 mb-3">
                        {[1,2,3,4,5].map(star => <span key={star} className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Trusted by over 10,000 Cairo Pet Lovers & Service Providers.</p>
                </div>
            </div>
        </div>
    );
};

export default PulseBox;
