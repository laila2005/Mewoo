import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/common/SEO';

// The code marketing hands out for the launch campaign. A link without ?code=
// still works — it falls back to this one.
const LAUNCH_CODE = 'BETA-CLINIC-2026';

const PERKS = [
    {
        icon: 'featured_seasonal_and_gifts',
        title: '2 months 100% free',
        text: 'Zero listing fees and 0% commission for your first two months. Every pound a booking brings in stays with your clinic.',
    },
    {
        icon: 'campaign',
        title: 'Free marketing spotlight',
        text: 'Your clinic gets a featured profile on our Instagram and Facebook pages — introduced to pet owners as a founding PetPluse partner.',
    },
    {
        icon: 'event_available',
        title: 'Direct patient bookings',
        text: 'Owners book you straight from your profile. You set your working days and hours, and confirm or reschedule with one tap.',
    },
    {
        icon: 'health_and_safety',
        title: 'Digital health records',
        text: 'Vaccination and checkup history travels with every pet, so a returning patient arrives with their file already open.',
    },
];

const STEPS = [
    { n: 1, title: 'Claim your invitation', text: 'Your invite is already attached to this page — just tap the button below.' },
    { n: 2, title: 'Add your clinic', text: 'Clinic name, license number and specialties. It takes a couple of minutes.' },
    { n: 3, title: 'Go live verified', text: 'Partner clinics skip the review queue — your Verified profile is live immediately.' },
];

const BetaPartner = () => {
    const [code, setCode] = useState(LAUNCH_CODE);
    const [invite, setInvite] = useState(null); // { valid, label?, role? }
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const raw = queryParams.get('code');
        // Same normalisation the API applies, so the link is forgiving about
        // case and stray characters picked up from a chat app or a QR scan.
        const cleaned = (raw || LAUNCH_CODE).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 64);
        const activeCode = cleaned || LAUNCH_CODE;
        setCode(activeCode);

        const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
        let cancelled = false;
        axios.get(`${API_BASE}/public/partner-invite/${encodeURIComponent(activeCode)}`, { timeout: 8000 })
            .then(r => { if (!cancelled) setInvite(r.data || { valid: false }); })
            .catch(() => { if (!cancelled) setInvite({ valid: false }); })
            .finally(() => { if (!cancelled) setChecking(false); });

        return () => { cancelled = true; };
    }, []);

    const isActive = !!invite?.valid;
    // An expired or unknown link still gets the full pitch — it just sends the
    // clinic through the normal (reviewed) signup instead of the partner one.
    const ctaHref = isActive ? `/signup?role=vet&code=${encodeURIComponent(code)}` : '/signup?role=vet';

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO
                title="Beta Clinic Partner — PetPluse"
                description="You're invited to join PetPluse as a featured clinic partner. Two months completely free, a marketing spotlight on Instagram and Facebook, direct patient bookings, and digital health records."
                keywords="petpluse beta partner, featured vet clinic egypt, free vet listing, clinic partner invite, veterinary bookings cairo"
            />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)' }}></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, rgba(59,130,246,0.6) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.4) 0%, transparent 45%)' }}></div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
                    <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-blue-100 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-5">
                        <span className="material-symbols-outlined text-[16px]">workspace_premium</span> Beta Launch — By Invitation
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight text-balance max-w-3xl mx-auto">
                        Become a featured <span className="text-blue-300">clinic partner</span>
                    </h1>
                    <p className="text-blue-100/90 text-base sm:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
                        We're opening PetPluse to a small group of clinics for our beta launch. Partners get two months completely free, a marketing spotlight, and bookings from pet owners across Egypt — from day one.
                    </p>

                    {/* Invitation state */}
                    <div className="mt-8 flex justify-center">
                        {checking ? (
                            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-100 text-sm font-bold px-5 py-2.5 rounded-2xl">
                                <span className="w-4 h-4 border-2 border-blue-200 border-t-transparent rounded-full animate-spin"></span>
                                Checking your invitation…
                            </span>
                        ) : isActive ? (
                            <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-300/30 text-emerald-100 text-sm font-bold px-5 py-2.5 rounded-2xl">
                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                Your invitation is active{invite?.label ? ` — ${invite.label}` : ''}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-50 text-sm font-bold px-5 py-2.5 rounded-2xl">
                                <span className="material-symbols-outlined text-[18px]">schedule</span>
                                This invitation link has expired — contact us and we'll send you a new one
                            </span>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to={ctaHref} className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-extrabold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                            {isActive ? 'Claim your partner spot' : 'Join as a Vet'}
                        </Link>
                        <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">mail</span> Talk to our team
                        </Link>
                    </div>
                    <p className="text-blue-200/70 text-xs mt-4">2 months free • 0% commission • No card required</p>
                </div>
            </section>

            {/* Perks */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">What partner clinics get</h2>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">Everything on the platform, plus the things we only offer the clinics who join us first.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {PERKS.map((p) => (
                        <div key={p.title} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[26px]">{p.icon}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1.5">{p.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{p.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="bg-white border-y border-slate-100">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Live in three steps</h2>
                        <p className="text-slate-500 mt-2">From invitation to your first booking.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {STEPS.map((s) => (
                            <div key={s.n} className="relative bg-slate-50/60 rounded-3xl border border-slate-100 p-6 text-center">
                                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/25">{s.n}</div>
                                <h3 className="font-bold text-slate-900 mb-1.5">{s.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{s.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {isActive ? 'Your spot is waiting' : 'Still want to join us?'}
                </h2>
                <p className="text-slate-500 mt-2 mb-7 max-w-lg mx-auto">
                    {isActive
                        ? 'Beta partner places are limited. Create your clinic profile now and start taking bookings this week.'
                        : 'Beta partner places for this campaign are closed, but you can still create your clinic profile — our team reviews new clinics every day.'}
                </p>
                <Link to={ctaHref} className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
                    {isActive ? 'Claim your partner spot' : 'Join as a Vet'}
                </Link>
                <p className="text-xs text-slate-400 mt-4">
                    Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
                </p>
            </section>
        </div>
    );
};

export default BetaPartner;
