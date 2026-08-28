import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/common/SEO';
import Footer from '../components/layout/Footer';

// One page serves all three partner campaigns. The code decides who is being
// invited: the API returns the invite's role, and every piece of copy, colour
// and CTA below is keyed off that. A link with no ?code= falls back to the vet
// campaign, which is the one that went out first.
const LAUNCH_CODE = 'BETA-CLINIC-2026';

// Guess the audience from the code prefix so the page does not flash the wrong
// copy while the invite is still being checked. The API's answer always wins.
const ROLE_BY_PREFIX = [
    ['BETA-SHOP', 'vendor'],
    ['BETA-TRAINER', 'trainer'],
    ['BETA-CLINIC', 'vet'],
];

const COPY = {
    vet: {
        role: 'vet',
        eyebrowIcon: 'workspace_premium',
        heroLead: 'Become a featured',
        heroAccent: 'clinic partner',
        blurb: "We're opening PetPluse to a small group of clinics for our beta launch. Partners get two months completely free, a marketing spotlight, and bookings from pet owners across Egypt — from day one.",
        perksHeading: 'What partner clinics get',
        perksSub: 'Everything on the platform, plus the things we only offer the clinics who join us first.',
        ctaActive: 'Claim your partner spot',
        ctaInactive: 'Join as a Vet',
        finalActive: 'Beta partner places are limited. Create your clinic profile now and start taking bookings this week.',
        finalInactive: 'Beta partner places for this campaign are closed, but you can still create your clinic profile — our team reviews new clinics every day.',
        seoTitle: 'Beta Clinic Partner — PetPluse',
        seoDesc: "You're invited to join PetPluse as a featured clinic partner. Two months completely free, a marketing spotlight on Instagram and Facebook, direct patient bookings, and digital health records.",
        seoKeywords: 'petpluse beta partner, featured vet clinic egypt, free vet listing, clinic partner invite, veterinary bookings cairo',
        gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)',
        glow: 'radial-gradient(circle at 25% 40%, rgba(59,130,246,0.6) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.4) 0%, transparent 45%)',
        heroText: 'text-blue-100',
        heroBody: 'text-blue-100/90',
        heroAccentText: 'text-blue-300',
        heroFine: 'text-blue-200/70',
        onLight: 'text-blue-700',
        iconChip: 'bg-blue-50 text-blue-600',
        stepChip: 'bg-blue-600 shadow-blue-600/25',
        solid: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25',
        link: 'text-blue-600',
        trust: '2 months free • 0% commission • No card required',
        perks: [
            { icon: 'featured_seasonal_and_gifts', title: '2 months 100% free', text: 'Zero listing fees and 0% commission for your first two months. Every pound a booking brings in stays with your clinic.' },
            { icon: 'campaign', title: 'Free marketing spotlight', text: 'Your clinic gets a featured profile on our Instagram and Facebook pages — introduced to pet owners as a founding PetPluse partner.' },
            { icon: 'event_available', title: 'Direct patient bookings', text: 'Owners book you straight from your profile. You set your working days and hours, and confirm or reschedule with one tap.' },
            { icon: 'health_and_safety', title: 'Digital health records', text: 'Vaccination and checkup history travels with every pet, so a returning patient arrives with their file already open.' },
        ],
        steps: [
            { n: 1, title: 'Claim your invitation', text: 'Your invite is already attached to this page — just tap the button below.' },
            { n: 2, title: 'Add your clinic', text: 'Clinic name, license number and specialties. It takes a couple of minutes.' },
            { n: 3, title: 'Go live verified', text: 'Partner clinics skip the review queue — your Verified profile is live immediately.' },
        ],
    },

    trainer: {
        role: 'trainer',
        eyebrowIcon: 'school',
        heroLead: 'Become a founding',
        heroAccent: 'training partner',
        blurb: "We're opening PetPluse to a small group of trainers for our beta launch. Partners get two months completely free, a marketing spotlight, and a full programme system — multi-week courses, group classes and waitlists — from day one.",
        perksHeading: 'What partner trainers get',
        perksSub: 'Everything on the platform, plus the things we only offer the trainers who join us first.',
        ctaActive: 'Claim your partner spot',
        ctaInactive: 'Join as a Trainer',
        finalActive: 'Beta partner places are limited. Create your trainer profile now and open your first class this week.',
        finalInactive: 'Beta partner places for this campaign are closed, but you can still create your trainer profile — our team reviews new trainers every day.',
        seoTitle: 'Beta Training Partner — PetPluse',
        seoDesc: "You're invited to join PetPluse as a founding training partner. Two months completely free, a marketing spotlight, multi-week programmes with real seat capacity, automatic waitlists and shared progress notes.",
        seoKeywords: 'petpluse trainer partner, dog trainer egypt, group dog classes cairo, pet training programs, trainer partner invite',
        gradient: 'linear-gradient(135deg, #0f172a 0%, #4c1d95 55%, #6d28d9 100%)',
        glow: 'radial-gradient(circle at 25% 40%, rgba(139,92,246,0.6) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.4) 0%, transparent 45%)',
        heroText: 'text-violet-100',
        heroBody: 'text-violet-100/90',
        heroAccentText: 'text-violet-300',
        heroFine: 'text-violet-200/70',
        onLight: 'text-violet-700',
        iconChip: 'bg-violet-50 text-violet-600',
        stepChip: 'bg-violet-600 shadow-violet-600/25',
        solid: 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/25',
        link: 'text-violet-600',
        trust: '2 months free • 0% commission • No card required',
        perks: [
            { icon: 'featured_seasonal_and_gifts', title: '2 months 100% free', text: 'Zero listing fees and 0% commission for your first two months. Every pound an enrolment brings in stays with you.' },
            { icon: 'campaign', title: 'Free marketing spotlight', text: 'Your profile gets featured on our Instagram and Facebook pages — introduced to pet owners as a founding PetPluse trainer.' },
            { icon: 'groups_3', title: 'Group classes with real seats', text: 'Put a capacity on a programme and it becomes a group class. When it fills, the next owner joins a waitlist and is promoted automatically if a seat opens.' },
            { icon: 'edit_note', title: 'Progress notes owners can read', text: 'Leave dated notes against any enrolment, visible to the owner too — so a twelve-week course leaves a real written record.' },
        ],
        steps: [
            { n: 1, title: 'Claim your invitation', text: 'Your invite is already attached to this page — just tap the button below.' },
            { n: 2, title: 'Add your credentials', text: 'Certifications, specialties and pricing. It takes a couple of minutes.' },
            { n: 3, title: 'Publish your first programme', text: 'Partner trainers skip the review queue — set your sessions, weeks and seats, and go live immediately.' },
        ],
    },

    vendor: {
        role: 'vendor',
        eyebrowIcon: 'storefront',
        heroLead: 'Become a founding',
        heroAccent: 'shop partner',
        blurb: "We're opening PetPluse to a small group of pet shops for our beta launch. Partners get two months completely free, a marketing spotlight, and their own public storefront — with the whole catalogue importable from a spreadsheet.",
        perksHeading: 'What partner shops get',
        perksSub: 'Everything on the platform, plus the things we only offer the shops who join us first.',
        ctaActive: 'Claim your partner spot',
        ctaInactive: 'Join as a Shop',
        finalActive: 'Beta partner places are limited. Create your storefront now and start taking orders this week.',
        finalInactive: 'Beta partner places for this campaign are closed, but you can still create your storefront — our team reviews new shops every day.',
        seoTitle: 'Beta Shop Partner — PetPluse',
        seoDesc: "You're invited to join PetPluse as a founding shop partner. Two months completely free, a marketing spotlight, your own public storefront, and bulk catalogue import straight from a spreadsheet.",
        seoKeywords: 'petpluse shop partner, pet shop egypt, sell pet products online cairo, pet store storefront, vendor partner invite',
        gradient: 'linear-gradient(135deg, #0f172a 0%, #831843 55%, #be123c 100%)',
        glow: 'radial-gradient(circle at 25% 40%, rgba(244,63,94,0.55) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(251,191,36,0.4) 0%, transparent 45%)',
        heroText: 'text-rose-100',
        heroBody: 'text-rose-100/90',
        heroAccentText: 'text-rose-300',
        heroFine: 'text-rose-200/70',
        onLight: 'text-rose-700',
        iconChip: 'bg-rose-50 text-rose-600',
        stepChip: 'bg-rose-600 shadow-rose-600/25',
        solid: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25',
        link: 'text-rose-600',
        trust: '2 months free • 0% commission • No card required',
        perks: [
            { icon: 'featured_seasonal_and_gifts', title: '2 months 100% free', text: 'Zero listing fees and 0% commission for your first two months. Every pound an order brings in stays with your shop.' },
            { icon: 'campaign', title: 'Free marketing spotlight', text: 'Your shop gets a featured profile on our Instagram and Facebook pages — introduced to pet owners as a founding PetPluse partner.' },
            { icon: 'storefront', title: 'Your own storefront address', text: 'A public page at its own clean link you can share anywhere — not just a filtered view of the marketplace.' },
            { icon: 'upload_file', title: 'Import your whole catalogue', text: 'Upload a spreadsheet instead of adding products one by one. Every row is checked and you are told exactly which ones need fixing.' },
        ],
        steps: [
            { n: 1, title: 'Claim your invitation', text: 'Your invite is already attached to this page — just tap the button below.' },
            { n: 2, title: 'Add your shop', text: 'Shop name, category and business address. It takes a couple of minutes.' },
            { n: 3, title: 'Import and go live', text: 'Partner shops skip the review queue — upload your catalogue and your storefront is live immediately.' },
        ],
    },
};

const normalise = (raw) => (raw || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 64);

const guessRole = (code) => {
    const hit = ROLE_BY_PREFIX.find(([prefix]) => code.startsWith(prefix));
    return hit ? hit[1] : 'vet';
};

const BetaPartner = () => {
    const [code, setCode] = useState(LAUNCH_CODE);
    const [invite, setInvite] = useState(null); // { valid, label?, role? }
    const [checking, setChecking] = useState(true);
    const [role, setRole] = useState('vet');

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        // Same normalisation the API applies, so the link is forgiving about
        // case and stray characters picked up from a chat app or a QR scan.
        const activeCode = normalise(queryParams.get('code')) || LAUNCH_CODE;
        setCode(activeCode);
        setRole(guessRole(activeCode));

        const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
        let cancelled = false;
        axios.get(`${API_BASE}/public/partner-invite/${encodeURIComponent(activeCode)}`, { timeout: 8000 })
            .then(r => {
                if (cancelled) return;
                const data = r.data || { valid: false };
                setInvite(data);
                // The server is the authority on who this invite is actually for.
                if (data.valid && COPY[data.role]) setRole(data.role);
            })
            .catch(() => { if (!cancelled) setInvite({ valid: false }); })
            .finally(() => { if (!cancelled) setChecking(false); });

        return () => { cancelled = true; };
    }, []);

    const t = COPY[role] || COPY.vet;
    const isActive = !!invite?.valid;
    // An expired or unknown link still gets the full pitch — it just sends the
    // partner through the normal (reviewed) signup instead of the partner one.
    const ctaHref = isActive
        ? `/signup?role=${t.role}&code=${encodeURIComponent(code)}`
        : `/signup?role=${t.role}`;

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO title={t.seoTitle} description={t.seoDesc} keywords={t.seoKeywords} />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: t.gradient }}></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: t.glow }}></div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
                    <span className={`inline-flex items-center gap-2 bg-white/10 border border-white/15 ${t.heroText} text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-5`}>
                        <span className="material-symbols-outlined text-[16px]">{t.eyebrowIcon}</span> Beta Launch — By Invitation
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight text-balance max-w-3xl mx-auto">
                        {t.heroLead} <span className={t.heroAccentText}>{t.heroAccent}</span>
                    </h1>
                    <p className={`${t.heroBody} text-base sm:text-lg mt-5 max-w-2xl mx-auto leading-relaxed`}>
                        {t.blurb}
                    </p>

                    {/* Invitation state */}
                    <div className="mt-8 flex justify-center">
                        {checking ? (
                            <span className={`inline-flex items-center gap-2 bg-white/10 border border-white/20 ${t.heroText} text-sm font-bold px-5 py-2.5 rounded-2xl`}>
                                <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></span>
                                Checking your invitation…
                            </span>
                        ) : isActive ? (
                            <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-300/30 text-emerald-100 text-sm font-bold px-5 py-2.5 rounded-2xl">
                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                Your invitation is active{invite?.label ? ` — ${invite.label}` : ''}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-sm font-bold px-5 py-2.5 rounded-2xl">
                                <span className="material-symbols-outlined text-[18px]">schedule</span>
                                This invitation link has expired — contact us and we&apos;ll send you a new one
                            </span>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to={ctaHref} className={`inline-flex items-center justify-center gap-2 bg-white ${t.onLight} font-extrabold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all`}>
                            <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                            {isActive ? t.ctaActive : t.ctaInactive}
                        </Link>
                        <Link to="/contact" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">chat</span> Talk to our team
                        </Link>
                    </div>
                    <p className={`${t.heroFine} text-xs mt-4`}>{t.trust}</p>
                </div>
            </section>

            {/* Perks */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{t.perksHeading}</h2>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">{t.perksSub}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {t.perks.map((p) => (
                        <div key={p.title} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className={`w-12 h-12 rounded-2xl ${t.iconChip} flex items-center justify-center mb-4`}>
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
                        <p className="text-slate-500 mt-2">From invitation to going live.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {t.steps.map((s) => (
                            <div key={s.n} className="relative bg-slate-50/60 rounded-3xl border border-slate-100 p-6 text-center">
                                <div className={`w-11 h-11 rounded-full ${t.stepChip} text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-lg`}>{s.n}</div>
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
                    {isActive ? t.finalActive : t.finalInactive}
                </p>
                <Link to={ctaHref} className={`inline-flex items-center justify-center gap-2 ${t.solid} text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all`}>
                    <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
                    {isActive ? t.ctaActive : t.ctaInactive}
                </Link>
                <p className="text-xs text-slate-400 mt-4">
                    Already have an account? <Link to="/login" className={`${t.link} font-bold hover:underline`}>Log in</Link>
                </p>
            </section>

            <Footer />
        </div>
    );
};

export default BetaPartner;
