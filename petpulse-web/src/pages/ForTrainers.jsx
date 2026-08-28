import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import Footer from '../components/layout/Footer';

const BENEFITS = [
    { icon: 'school', title: 'Run real programmes', text: 'Not just one-off sessions. Build a structured course with a set number of sessions over a set number of weeks, and take enrolments for the whole thing at once.' },
    { icon: 'groups_3', title: 'Group classes with real seats', text: 'Put a capacity on a programme and it becomes a group class. Leave it off and the same programme runs one-to-one. One setup, both shapes.' },
    { icon: 'hourglass_top', title: 'Nobody gets turned away', text: 'When a class fills up, the next owner joins a waitlist instead of hitting a dead end — and is told exactly that, rather than being left guessing.' },
    { icon: 'swap_horiz', title: 'Seats refill themselves', text: 'If someone cancels, the longest-waiting owner is promoted to the class in the same moment. A full class never quietly runs under capacity.' },
    { icon: 'edit_note', title: 'Progress notes owners can read', text: 'Leave dated notes against any enrolment. The owner sees them too, so a twelve-week course leaves a written record instead of a vague memory.' },
    { icon: 'inventory_2', title: 'Archive without losing history', text: 'Retire a programme you are no longer running and keep every past enrolment intact. Reactivate it later and pick up where you left off.' },
];

const STEPS = [
    { n: 1, title: 'Create your profile', text: 'Sign up as a trainer and add your certifications, specialties and pricing.' },
    { n: 2, title: 'Get verified', text: 'We review your credentials. Approved profiles carry the Verified badge and appear in search.' },
    { n: 3, title: 'Publish your first programme', text: 'Set the sessions, the weeks, the price and — if it is a group class — the number of seats.' },
];

const ForTrainers = () => {
    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO
                title="For Trainers — Join PetPluse"
                description="Run multi-week training programmes and group classes on PetPluse. Real seat capacity, automatic waitlists, shared progress notes, and a Verified trainer badge. Free to list."
                keywords="dog trainer egypt, pet training programs cairo, group dog classes, join as a trainer, petpluse for trainers"
            />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #4c1d95 55%, #6d28d9 100%)' }}></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, rgba(139,92,246,0.6) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(16,185,129,0.4) 0%, transparent 45%)' }}></div>
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
                    <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-violet-100 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-5">
                        <span className="material-symbols-outlined text-[16px]">school</span> For Trainers
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight text-balance max-w-3xl mx-auto">
                        Teach courses, not just <span className="text-violet-300">single sessions</span>
                    </h1>
                    <p className="text-violet-100/90 text-base sm:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
                        Publish structured multi-week programmes and group classes with real seat limits, automatic waitlists, and progress notes your clients can actually read.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/signup?role=trainer" className="inline-flex items-center justify-center gap-2 bg-white text-violet-700 font-extrabold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">how_to_reg</span> Join as a Trainer
                        </Link>
                        <Link to="/trainers" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[20px]">visibility</span> See trainers on PetPluse
                        </Link>
                    </div>
                    <p className="text-violet-200/70 text-xs mt-4">Free to list • Verified badge • Cancel anytime</p>
                </div>
            </section>

            {/* Benefits */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Why trainers choose PetPluse</h2>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">Everything a multi-week course needs, and nothing that gets in the way of a single session.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {BENEFITS.map((b) => (
                        <div key={b.title} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[26px]">{b.icon}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1.5">{b.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{b.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* The seat problem — the detail that actually differentiates */}
            <section className="bg-white border-y border-slate-100">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-[11px] font-black uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full mb-4">
                            <span className="material-symbols-outlined text-[15px]">event_seat</span> Seat handling
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">A six-seat class holds exactly six</h2>
                        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
                            Two owners tapping enrol at the same second is the moment most booking systems quietly overbook. Ours doesn&apos;t — the seat count is settled in the database, one enrolment at a time.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-slate-50/60 rounded-3xl border border-slate-100 p-6">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[24px]">lock_clock</span>
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1.5">No double-booked seats</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Simultaneous enrolments are handled one after another, so the seat count each one reads is always true. You will never arrive to seven dogs in a six-dog class.</p>
                        </div>
                        <div className="bg-slate-50/60 rounded-3xl border border-slate-100 p-6">
                            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[24px]">format_list_numbered</span>
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1.5">The waitlist is in order</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Owners are promoted oldest-first. Two cancellations promote two different people — never the same person twice while someone else keeps waiting.</p>
                        </div>
                        <div className="bg-slate-50/60 rounded-3xl border border-slate-100 p-6">
                            <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[24px]">groups</span>
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1.5">One roster, both lists</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Open a programme and see everyone at once — enrolled and waiting together — so you know what next week actually looks like.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Live in three steps</h2>
                    <p className="text-slate-500 mt-2">From sign-up to your first enrolment.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {STEPS.map((s) => (
                        <div key={s.n} className="relative bg-white rounded-3xl border border-slate-100 p-6 text-center shadow-sm">
                            <div className="w-11 h-11 rounded-full bg-violet-600 text-white font-black text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-600/25">{s.n}</div>
                            <h3 className="font-bold text-slate-900 mb-1.5">{s.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{s.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ready to fill your next class?</h2>
                <p className="text-slate-500 mt-2 mb-7 max-w-lg mx-auto">Create your verified trainer profile today — it takes a couple of minutes and costs nothing to start.</p>
                <Link to="/signup?role=trainer" className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-violet-600/25 hover:-translate-y-0.5 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[22px]">how_to_reg</span> Join as a Trainer
                </Link>
                <p className="text-xs text-slate-400 mt-4">
                    Already have an account? <Link to="/login" className="text-violet-600 font-bold hover:underline">Log in</Link>
                </p>
            </section>

            <Footer />
        </div>
    );
};

export default ForTrainers;
