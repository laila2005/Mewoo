import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';

const BENEFITS = [
    { icon: 'group_add', title: 'Patients come to you', text: 'Our AI assistant triages pet owners and routes them straight to the right vet — you receive real booking requests, not cold leads.' },
    { icon: 'payments', title: 'No upfront cost', text: 'Listing is free. You only pay a small commission when you actually get paid — set transparently by PetPluse.' },
    { icon: 'verified', title: 'Verified badge = trust', text: 'Once we verify your license, your profile carries a Verified badge that reassures owners and wins more bookings.' },
    { icon: 'calendar_month', title: 'Manage your calendar', text: 'Set your working days and hours. Bookings that fall outside them are blocked automatically, and you can reschedule or cancel with one tap.' },
    { icon: 'health_and_safety', title: 'Digital health records', text: 'Every pet arrives with a digital health passport — vaccinations, weight, history — so you spend less time on paperwork.' },
    { icon: 'notifications_active', title: 'Never miss a booking', text: 'Get notified by email the moment a booking comes in, even when you are away from the platform.' },
];

const STEPS = [
    { n: 1, title: 'Create your profile', text: 'Sign up as a veterinarian and add your clinic, specialties and license number.' },
    { n: 2, title: 'Get verified', text: 'Our team reviews your license. Approved profiles get the Verified badge and go live.' },
    { n: 3, title: 'Start receiving bookings', text: 'Appear in search and the AI assistant, take appointments, and grow your practice.' },
];

// Clinic-side tooling, as built. Deliberately worded against what actually
// ships today: a clinic balance with a ledger, and staff seats. The seats give
// a clinic its own revocable logins — there is no separate reception dashboard
// yet, so nothing here promises one.
const CLINIC_TOOLS = [
    {
        icon: 'account_balance_wallet',
        title: 'A balance owners keep with your clinic',
        text: 'Regulars can hold credit with you and spend it at booking time instead of settling up visit by visit. Every movement is written to a ledger, and the balance is structurally unable to go negative — even if two bookings land the same instant.',
    },
    {
        icon: 'groups',
        title: 'Give reception their own logins',
        text: 'Add up to five staff accounts so nobody shares your credentials. Each one gets its own password by email, and you can disable or remove a seat the moment someone leaves.',
    },
    {
        icon: 'shield_person',
        title: 'Staff only ever see your clinic',
        text: 'A seat is bound to your clinic in the database itself, not just hidden in the interface. One vet can never see or touch another clinic\'s team, patients or bookings.',
    },
    {
        icon: 'history',
        title: 'Every change is on the record',
        text: 'Adding, disabling or removing a seat is written to an audit log with the name of whoever did it — so a clinic with several people managing it still has one clear history.',
    },
];

const ForVets = () => {
    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO
                title="For Veterinarians — Join PetPluse"
                description="Grow your veterinary practice with PetPluse. Free listing, AI-matched patients, a Verified badge, calendar management, and email booking alerts. Join Egypt's pet-care platform."
                keywords="vet platform egypt, join as a vet, veterinarian bookings cairo, grow vet practice, petpluse for vets"
            />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)' }}></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, rgba(59,130,246,0.6) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.4) 0%, transparent 45%)' }}></div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
                    <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-blue-100 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-5">
                        <span className="material-symbols-outlined text-[16px]">stethoscope</span> For Veterinarians
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight text-balance max-w-3xl mx-auto">
                        Grow your practice with <span className="text-blue-300">PetPluse</span>
                    </h1>
                    <p className="text-blue-100/90 text-base sm:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
                        Join Egypt's pet-care platform. Reach thousands of pet owners, get bookings routed to you by our AI assistant, and manage everything in one place — for free.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/signup?role=vet" className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-extrabold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">how_to_reg</span> Join as a Vet
                        </Link>
                        <Link to="/vets" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">visibility</span> See vets on PetPluse
                        </Link>
                    </div>
                    <p className="text-blue-200/70 text-xs mt-4">Free to list • Verified badge • Cancel anytime</p>
                </div>
            </section>

            {/* Benefits */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Why vets choose PetPluse</h2>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">Everything you need to attract patients and run your clinic online — nothing you don't.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {BENEFITS.map((b) => (
                        <div key={b.title} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[26px]">{b.icon}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1.5">{b.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{b.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Clinic tools */}
            <section className="bg-white border-y border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full mb-4">
                            <span className="material-symbols-outlined text-[15px]">medical_services</span> Clinic tools
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Built for running a clinic, not just listing one</h2>
                        <p className="text-slate-500 mt-2 max-w-xl mx-auto">A directory entry gets you found. These are the parts that help once the patients arrive.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {CLINIC_TOOLS.map((t) => (
                            <div key={t.title} className="bg-slate-50/60 rounded-3xl border border-slate-100 p-6 flex gap-5">
                                <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                                    <span className="material-symbols-outlined text-[26px]">{t.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base mb-1.5">{t.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{t.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="bg-[#f7faf9]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Live in three steps</h2>
                        <p className="text-slate-500 mt-2">From sign-up to your first booking.</p>
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
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ready to see more patients?</h2>
                <p className="text-slate-500 mt-2 mb-7 max-w-lg mx-auto">Create your verified vet profile today — it takes a couple of minutes and costs nothing to start.</p>
                <Link to="/signup?role=vet" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[22px]">how_to_reg</span> Join as a Vet
                </Link>
                <p className="text-xs text-slate-400 mt-4">
                    Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
                </p>
            </section>
        </div>
    );
};

export default ForVets;
