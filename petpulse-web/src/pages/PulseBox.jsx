import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PulseBox = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const tiers = [
        {
            id: 'tier_starter',
            name: 'The Puppy Starter',
            price: 450,
            frequency: '/month',
            description: 'Perfect for new pet parents navigating the puppy phase.',
            features: ['Teething Toys', 'Training Treats', 'Puppy Wellness Guide', 'Basic Grooming Kit'],
            recommended: false,
            color: 'blue'
        },
        {
            id: 'tier_chewer',
            name: 'Premium Chewers Club',
            price: 650,
            frequency: '/month',
            description: 'Heavy-duty durability for large or aggressive chewers.',
            features: ['2 Ultra-Tough Toys', 'Long-lasting Chews', 'Joint Health Supplements', 'Dental Care Kit'],
            recommended: true,
            color: 'indigo'
        },
        {
            id: 'tier_senior',
            name: 'Senior Wellness Box',
            price: 550,
            frequency: '/month',
            description: 'Tailored comfort and health support for aging pets.',
            features: ['Orthopedic Comfort Items', 'Digestive Supplements', 'Soft Baked Treats', 'Vet-Approved Vitamins'],
            recommended: false,
            color: 'emerald'
        }
    ];

    const handleSubscribe = (tier) => {
        // Redirect to checkout with PulseBox parameters
        navigate('/checkout', { 
            state: { 
                isSubscription: true,
                plan: tier 
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-slate-900 text-white">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&q=80&w=1920" 
                        alt="Happy Dog with Box" 
                        className="w-full h-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
                    <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-300 font-bold text-sm tracking-wider uppercase mb-6 border border-blue-500/30">
                        Monthly Subscription
                    </span>
                    <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
                        Joy Delivered. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Every Month.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-medium mb-10 leading-relaxed">
                        Tailored toys, premium treats, and expert wellness guides curated specifically for your pet's age, size, and needs.
                    </p>
                    <div className="flex justify-center gap-4">
                        <a href="#plans" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/30">
                            View Plans
                        </a>
                        <a href="#how-it-works" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all border border-white/10">
                            How it Works
                        </a>
                    </div>
                </div>
            </div>

            {/* How it Works */}
            <div id="how-it-works" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">How PulseBox Works</h2>
                        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">Three simple steps to a happier, healthier pet.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 z-0 border-t border-dashed border-slate-300"></div>

                        <div className="relative z-10 text-center flex flex-col items-center">
                            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-blue-100 transform rotate-3">
                                <span className="material-symbols-outlined text-4xl">cruelty_free</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">1. Tell Us About Your Pet</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">We use your pet's profile to understand their breed, age, weight, and specific behavioral traits.</p>
                        </div>

                        <div className="relative z-10 text-center flex flex-col items-center">
                            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100 transform -rotate-3">
                                <span className="material-symbols-outlined text-4xl">auto_awesome</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">2. We Curate the Box</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">Our veterinary and training experts select the best premium toys, treats, and wellness guides.</p>
                        </div>

                        <div className="relative z-10 text-center flex flex-col items-center">
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100 transform rotate-3">
                                <span className="material-symbols-outlined text-4xl">local_shipping</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">3. Unbox the Joy</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">Delivered directly to your door every month. Watch your pet's tail wag with excitement!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Tiers */}
            <div id="plans" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Choose Your PulseBox</h2>
                        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">Flexible plans tailored for every stage of your pet's life. Cancel anytime.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {tiers.map((tier) => (
                            <div 
                                key={tier.id} 
                                className={`relative bg-white rounded-3xl p-8 flex flex-col border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                                    tier.recommended 
                                        ? `border-${tier.color}-500 shadow-lg shadow-${tier.color}-500/10` 
                                        : 'border-transparent shadow-sm'
                                }`}
                            >
                                {tier.recommended && (
                                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-${tier.color}-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm`}>
                                        Most Popular
                                    </div>
                                )}
                                
                                <div className="mb-8">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                                    <p className="text-slate-500 font-medium h-12">{tier.description}</p>
                                </div>
                                
                                <div className="mb-8 flex items-end gap-1">
                                    <span className="text-4xl font-black text-slate-900">EGP {tier.price}</span>
                                    <span className="text-slate-500 font-medium mb-1">{tier.frequency}</span>
                                </div>
                                
                                <ul className="space-y-4 mb-8 flex-1">
                                    {tier.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full bg-${tier.color}-50 text-${tier.color}-600 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                            </div>
                                            <span className="text-slate-700 font-medium">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                
                                <button 
                                    onClick={() => handleSubscribe(tier)}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                                        tier.recommended 
                                            ? `bg-${tier.color}-600 text-white hover:bg-${tier.color}-700 shadow-md` 
                                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                    }`}
                                >
                                    Subscribe Now
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Social Proof / Guarantee */}
            <div className="bg-indigo-600 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-5xl text-indigo-300 mb-6">verified_user</span>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">The PetPulse Happiness Guarantee</h2>
                    <p className="text-indigo-100 text-lg font-medium leading-relaxed mb-8">
                        If your pet isn't 100% thrilled with their PulseBox, we'll work with you to replace items or refund your month. No questions asked.
                    </p>
                    <div className="flex gap-2 text-amber-400">
                        {[1,2,3,4,5].map(star => <span key={star} className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                    </div>
                    <p className="mt-2 font-bold text-indigo-200">Trusted by over 10,000 pet parents.</p>
                </div>
            </div>
        </div>
    );
};

export default PulseBox;
