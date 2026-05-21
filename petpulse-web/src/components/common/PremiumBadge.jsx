import React from 'react';

const PremiumBadge = ({ subscription, active_subscription_plan_id, active_subscription_plan_name, plan_id, plan_name, className = "" }) => {
    // Extract plan details from multiple possible formats
    const currentPlanId = subscription?.plan_id || active_subscription_plan_id || plan_id;
    const currentPlanName = subscription?.plan_name || active_subscription_plan_name || plan_name;

    if (!currentPlanId) return null;

    // Get specific badge properties based on plan ID
    const getBadgeStyle = (id, name) => {
        const idLower = id.toLowerCase();
        
        // Vets
        if (idLower.includes('vet_professional')) {
            return {
                label: name || 'Clinic Pro',
                icon: 'workspace_premium',
                bg: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-emerald-500/30 border-transparent',
                pulse: 'animate-pulse shadow-md',
                tooltip: 'Clinic Professional Tier Account'
            };
        }
        if (idLower.includes('vet_starter')) {
            return {
                label: name || 'Verified Clinic',
                icon: 'verified',
                bg: 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-teal-200/50 shadow-teal-500/5',
                pulse: '',
                tooltip: 'Clinic Starter Tier Account'
            };
        }

        // Vendors
        if (idLower.includes('vendor_powerhouse')) {
            return {
                label: name || 'Market Powerhouse',
                icon: 'diamond',
                bg: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-purple-500/30 border-transparent',
                pulse: 'animate-pulse shadow-md',
                tooltip: 'Marketplace Powerhouse Merchant'
            };
        }
        if (idLower.includes('vendor_essential')) {
            return {
                label: name || 'Store Merchant',
                icon: 'storefront',
                bg: 'bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 border-rose-200/50 shadow-rose-500/5',
                pulse: '',
                tooltip: 'Marketplace Essential Merchant'
            };
        }

        // Trainers
        if (idLower.includes('trainer_elite')) {
            return {
                label: name || 'Master Academy Elite',
                icon: 'military_tech',
                bg: 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 text-white shadow-fuchsia-500/30 border-transparent',
                pulse: 'animate-pulse shadow-md',
                tooltip: 'Master Academy Elite Trainer'
            };
        }
        if (idLower.includes('trainer_standard')) {
            return {
                label: name || 'Certified Academy',
                icon: 'school',
                bg: 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 border-violet-200/50 shadow-violet-500/5',
                pulse: '',
                tooltip: 'Academy Standard Trainer'
            };
        }

        // Owners (Standard Box subscriptions)
        if (idLower.includes('chewer')) {
            return {
                label: name || 'Chewers Elite',
                icon: 'shield',
                bg: 'bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-pink-500/20 text-indigo-700 border-indigo-200 shadow-indigo-500/10',
                pulse: 'animate-pulse',
                tooltip: 'Premium Chewers Club Member'
            };
        }
        if (idLower.includes('starter')) {
            return {
                label: name || 'Puppy Club',
                icon: 'child_care',
                bg: 'bg-gradient-to-r from-blue-400/20 via-sky-400/10 to-indigo-400/20 text-blue-700 border-blue-200 shadow-blue-500/5',
                pulse: '',
                tooltip: 'Puppy Starter Package Member'
            };
        }
        if (idLower.includes('senior')) {
            return {
                label: name || 'Senior Care Club',
                icon: 'favorite',
                bg: 'bg-gradient-to-r from-emerald-400/20 via-teal-400/10 to-emerald-400/20 text-emerald-700 border-emerald-200 shadow-emerald-500/5',
                pulse: '',
                tooltip: 'Senior Wellness Package Member'
            };
        }

        // Fallback Premium
        return {
            label: name || 'Premium Account',
            icon: 'workspace_premium',
            bg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-blue-500/20 border-transparent',
            pulse: 'animate-pulse shadow-md',
            tooltip: 'Active Premium Subscriber'
        };
    };

    const style = getBadgeStyle(currentPlanId, currentPlanName);

    return (
        <span 
            title={style.tooltip}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${style.bg} ${style.pulse} transition-all duration-300 ${className}`}
        >
            <span className="material-symbols-outlined text-[12px] leading-none shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                {style.icon}
            </span>
            <span className="leading-none shrink-0">{style.label}</span>
        </span>
    );
};

export default PremiumBadge;
