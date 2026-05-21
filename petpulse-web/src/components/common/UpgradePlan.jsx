import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const UpgradePlan = ({ role }) => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [activeSubscription, setActiveSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

    useEffect(() => {
        const fetchPlansAndSub = async () => {
            try {
                setLoading(true);
                // 1. Fetch plans targeted to this user role
                const plansRes = await axios.get(`${API_BASE}/public/plans?role=${role}`);
                setPlans(plansRes.data.plans || []);

                // 2. Fetch active subscriptions for this user
                if (token) {
                    const subRes = await axios.get(`${API_BASE}/users/me/subscriptions`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (subRes.data.subscriptions && subRes.data.subscriptions.length > 0) {
                        const active = subRes.data.subscriptions.find(s => s.status === 'active');
                        if (active) setActiveSubscription(active);
                    }
                }
            } catch (error) {
                console.error('Failed to load upgrade plans:', error);
                toast.error('Failed to retrieve active plans');
            } finally {
                setLoading(false);
            }
        };

        fetchPlansAndSub();
    }, [role, token]);

    const handleSelectPlan = (plan) => {
        if (!token) {
            toast.error('Please log in to upgrade your subscription');
            navigate('/login');
            return;
        }

        // Navigate to checkout passing the plan details in the router state
        navigate('/checkout', {
            state: {
                isSubscription: true,
                plan: plan
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-semibold font-display">Assembling premium plans...</p>
            </div>
        );
    }

    return (
        <div className="py-6 px-2">
            {/* Inline Styles for animations and glassmorphism */}
            <style dangerouslySetInnerHTML={{ __html: `
                .premium-plan-card {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .premium-plan-card:hover {
                    transform: translateY(-8px) scale(1.01);
                }
                .glow-card-teal {
                    box-shadow: 0 20px 40px -15px rgba(20, 184, 166, 0.15);
                }
                .glow-card-teal:hover {
                    box-shadow: 0 30px 60px -10px rgba(20, 184, 166, 0.25);
                }
                .glow-card-emerald {
                    box-shadow: 0 20px 40px -15px rgba(16, 185, 129, 0.15);
                }
                .glow-card-emerald:hover {
                    box-shadow: 0 30px 60px -10px rgba(16, 185, 129, 0.25);
                }
                .glow-card-rose {
                    box-shadow: 0 20px 40px -15px rgba(244, 63, 94, 0.15);
                }
                .glow-card-rose:hover {
                    box-shadow: 0 30px 60px -10px rgba(244, 63, 94, 0.25);
                }
                .glow-card-indigo {
                    box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.15);
                }
                .glow-card-indigo:hover {
                    box-shadow: 0 30px 60px -10px rgba(99, 102, 241, 0.25);
                }
                .glow-card-violet {
                    box-shadow: 0 20px 40px -15px rgba(139, 92, 246, 0.15);
                }
                .glow-card-violet:hover {
                    box-shadow: 0 30px 60px -10px rgba(139, 92, 246, 0.25);
                }
                .glow-badge-pulse {
                    animation: pulseBadge 2s infinite;
                }
                @keyframes pulseBadge {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
            ` }} />

            {/* Current Active Subscription Banner */}
            {activeSubscription && (
                <div className="mb-10 p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_45%)]"></div>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider mb-3">
                            <span className="material-symbols-outlined text-[14px]">workspace_premium</span> Current Plan
                        </div>
                        <h3 className="text-2xl font-black">{activeSubscription.plan_name}</h3>
                        <p className="text-white/80 mt-1 text-sm font-medium">
                            Next renewal date: {new Date(activeSubscription.next_billing_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-1.5 z-10">
                        <span className="text-2xl font-black">EGP {activeSubscription.price} <span className="text-xs font-medium opacity-85">/mo</span></span>
                        <span className="bg-emerald-500/90 text-white font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> Active & Verified
                        </span>
                    </div>
                </div>
            )}

            {/* Heading Section */}
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
                    Empower Your {role.charAt(0).toUpperCase() + role.slice(1)} Profile
                </h2>
                <p className="text-slate-500 mt-3 text-base leading-relaxed">
                    Select a premium targeted package designed to boost your search discoverability, add verified badges, unlock client tools, and multiply your business growth.
                </p>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto justify-center">
                {plans.map((plan) => {
                    const isActive = activeSubscription && activeSubscription.plan_id === plan.id;
                    const glowClass = `glow-card-${plan.color || 'indigo'}`;
                    const borderClass = plan.recommended 
                        ? 'border-2 border-blue-500 scale-[1.02] md:scale-[1.03]' 
                        : 'border border-slate-100';

                    return (
                        <div 
                            key={plan.id} 
                            className={`premium-plan-card bg-white rounded-3xl p-8 relative flex flex-col justify-between ${borderClass} ${glowClass} transition-all duration-300`}
                        >
                            {plan.recommended && (
                                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-black text-[10px] tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg glow-badge-pulse flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">star</span> Recommended Choice
                                </span>
                            )}

                            <div>
                                {/* Title and Price */}
                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 font-display">{plan.name}</h3>
                                        <p className="text-slate-400 mt-1 text-xs">{plan.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-slate-900 font-display">EGP {plan.price}</span>
                                        <span className="text-slate-400 text-xs block">{plan.frequency}</span>
                                    </div>
                                </div>

                                <hr className="border-slate-100 my-5" />

                                {/* Features List */}
                                <div className="space-y-3.5 mb-8">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Included Benefits</p>
                                    {plan.features && plan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <span className={`material-symbols-outlined text-[20px] text-${plan.color}-500 bg-${plan.color}-50 p-0.5 rounded-full flex-shrink-0`}>
                                                check
                                            </span>
                                            <span className="text-sm font-semibold text-slate-600 leading-snug">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CTA Action Button */}
                            <button
                                onClick={() => !isActive && handleSelectPlan(plan)}
                                disabled={isActive}
                                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                                    isActive
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                        : plan.recommended
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.98]'
                                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 active:scale-[0.98]'
                                }`}
                            >
                                {isActive ? (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">verified</span> Active Plan
                                    </>
                                ) : (
                                    <>
                                        Upgrade Profile <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UpgradePlan;
