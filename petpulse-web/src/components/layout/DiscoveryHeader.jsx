import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Unified mobile header for the discovery cluster (Explore / Vets / Local / Shops).
 *
 * Every page in this cluster used to render its own header — some with a dark
 * gradient hero, others with a "Back to Home" pill and horizontal text tabs, with
 * inconsistent labels ("Local" vs "Local Services"). Switching categories felt like
 * jumping between different apps. This component gives all four pages ONE consistent
 * chrome: the same gradient hero (with a per-page title + accent) and the same
 * 4-way category switcher, so moving between them feels like one experience.
 *
 * Mobile/tablet only (xl:hidden) — on XL screens the DiscoverySidebar handles nav.
 *
 * @param {'explore'|'vets'|'local'|'shops'} active
 */
const CATS = [
    { key: 'explore', to: '/explore',     label: 'Explore', icon: 'explore',          from: '#6366f1', to2: '#818cf8', tint: 'rgba(99,102,241,0.10)',  ring: 'rgba(99,102,241,0.35)',  text: 'text-indigo-700' },
    { key: 'vets',    to: '/vets',        label: 'Vets',    icon: 'medical_services', from: '#10b981', to2: '#34d399', tint: 'rgba(16,185,129,0.10)', ring: 'rgba(16,185,129,0.35)', text: 'text-emerald-700' },
    { key: 'local',   to: '/vet-booking', label: 'Local',   icon: 'location_on',      from: '#f59e0b', to2: '#fbbf24', tint: 'rgba(245,158,11,0.12)', ring: 'rgba(245,158,11,0.40)', text: 'text-amber-700' },
    { key: 'shops',   to: '/pet-shops',   label: 'Shops',   icon: 'storefront',       from: '#ec4899', to2: '#f472b6', tint: 'rgba(236,72,153,0.10)', ring: 'rgba(236,72,153,0.35)', text: 'text-pink-700' },
];

const HERO = {
    explore: { eyebrow: 'Discover',        title: 'Explore',     subtitle: 'Trending pets, stories & community highlights' },
    vets:    { eyebrow: 'Veterinary Care', title: 'Find a Vet',  subtitle: 'Certified professionals who understand your pet' },
    local:   { eyebrow: 'Local Services',  title: 'Local Care',  subtitle: 'Trusted pet services around you' },
    shops:   { eyebrow: 'Marketplace',     title: 'Pet Shops',   subtitle: 'Food, supplies & toys for your pet' },
};

const DiscoveryHeader = ({ active = 'explore' }) => {
    const activeCat = CATS.find((c) => c.key === active) || CATS[0];
    const hero = HERO[active] || HERO.explore;

    return (
        <div className="xl:hidden mb-5">
            {/* Consistent gradient hero */}
            <div
                className="relative mb-4 rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}
            >
                <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.5) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.4) 0%, transparent 50%)' }}
                />
                <div className="relative px-5 pt-6 pb-5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-[22px]" style={{ color: activeCat.to2 }}>{activeCat.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: activeCat.to2 }}>{hero.eyebrow}</span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-1">{hero.title}</h1>
                    <p className="text-indigo-200 text-sm font-medium">{hero.subtitle}</p>
                </div>
            </div>

            {/* Consistent 4-way category switcher */}
            <div className="grid grid-cols-4 gap-2">
                {CATS.map((c) => {
                    const isActive = c.key === active;
                    return (
                        <Link
                            key={c.key}
                            to={c.to}
                            aria-current={isActive ? 'page' : undefined}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all active:scale-95"
                            style={
                                isActive
                                    ? { background: c.tint, border: `1.5px solid ${c.ring}` }
                                    : { background: '#ffffff', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }
                            }
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to2})` }}>
                                <span className="material-symbols-outlined text-white text-[20px]">{c.icon}</span>
                            </div>
                            <span className={`text-[10px] font-extrabold ${isActive ? c.text : 'text-slate-500'}`}>{c.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default DiscoveryHeader;
