import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import Footer from '../components/layout/Footer';

// Everything on this page is written against what VetAI actually does today.
// Nothing here describes a planned capability.
const CAN_DO = [
    { icon: 'event_available', title: 'Book the appointment', text: 'Not just tell you how to. Ask for a vet tomorrow morning and it finds who is genuinely free, holds the slot, and confirms it — with a calendar invite in your inbox.' },
    { icon: 'near_me', title: 'Find the right vet nearby', text: 'Verified vets only, ordered by how far they actually are from you, and filterable by what you need — not a directory you scroll.' },
    { icon: 'menu_book', title: 'Answer from a real knowledge base', text: 'Health questions are answered from a curated veterinary reference, matched to your pet\'s species — with the source shown.' },
    { icon: 'pets', title: 'Set your pet up mid-conversation', text: 'No account yet? It can create one and register your pet without sending you off to a form and back.' },
    { icon: 'diversity_1', title: 'Find adoptions and matches', text: 'Search pets available for adoption, or compatible partners for breeding, in the same conversation.' },
    { icon: 'explore', title: 'Take you to the right screen', text: 'When something is better done in the app, it hands you a working button — never a made-up link.' },
];

const SAFETY = [
    { icon: 'emergency', title: 'Emergencies are caught before the AI answers', text: 'Chocolate, a seizure, a cat that cannot urinate — these are recognised by fixed rules that run first. The model is never given the chance to soften an emergency into advice.' },
    { icon: 'block', title: 'It will not give you a dose', text: 'Asking how much ibuprofen to give a dog gets a refusal, not a number. That check runs before anything else, including booking.' },
    { icon: 'shield_lock', title: 'It cannot act as someone else', text: 'Who you are comes from your login, never from the conversation. Nothing you type can make it book, cancel or read on another person\'s behalf.' },
    { icon: 'help', title: 'It is allowed to say "I don\'t know"', text: 'If the knowledge base has no good answer, it says so instead of reaching for the closest thing it can find.' },
];

const VetAIPage = () => {
    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO
                title="VetAI — The assistant that books the appointment"
                description="VetAI is PetPluse's veterinary assistant. It books real appointments, finds verified vets near you, answers from a curated veterinary knowledge base, and detects emergencies before it answers. English and Arabic."
                keywords="vet ai egypt, pet health assistant arabic, ai vet booking, veterinary chatbot cairo, petpluse vetai"
            />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0b1020 0%, #14306b 55%, #1d4ed8 100%)' }}></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.7) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(16,185,129,0.45) 0%, transparent 45%)' }}></div>
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-blue-100 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-5">
                                <span className="material-symbols-outlined text-[16px]">smart_toy</span> VetAI
                            </span>
                            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight text-balance">
                                It doesn&apos;t just answer. <span className="text-blue-300">It books the appointment.</span>
                            </h1>
                            <p className="text-blue-100/90 text-base sm:text-lg mt-5 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                Most pet chatbots hand you a phone number. VetAI finds a verified vet who is genuinely free, books the slot, and sends the calendar invite — and when the situation is an emergency, it refuses to do anything except tell you to go now.
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                                <Link to="/signup" className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-extrabold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all">
                                    <span className="material-symbols-outlined text-[20px]">chat</span> Try VetAI free
                                </Link>
                                <Link to="/vets" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 active:scale-95 transition-all">
                                    <span className="material-symbols-outlined text-[20px]">stethoscope</span> Browse vets
                                </Link>
                            </div>
                            <p className="text-blue-200/70 text-xs mt-4">English &amp; Arabic • Free to use • Always on</p>
                        </div>

                        {/* Conversation mockup */}
                        <div className="bg-white/[0.06] border border-white/10 rounded-3xl p-5 backdrop-blur-sm">
                            <div className="space-y-3">
                                <div className="ml-auto max-w-[85%] bg-blue-500 text-white text-sm rounded-2xl rounded-br-md px-4 py-3 font-medium">
                                    My dog ate chocolate — what do I do?
                                </div>
                                <div className="max-w-[90%] bg-white/10 border border-white/10 text-blue-50 text-sm rounded-2xl rounded-bl-md px-4 py-3 leading-relaxed">
                                    🚨 Treat this as an emergency. Contact a vet now — do not wait for advice from me.
                                </div>
                                <div className="inline-block bg-emerald-400/10 border border-emerald-300/25 text-emerald-200 text-[11px] font-mono rounded-lg px-2.5 py-1.5">
                                    safety check · ran before the AI
                                </div>

                                <div className="pt-3"></div>

                                <div className="ml-auto max-w-[85%] bg-blue-500 text-white text-sm rounded-2xl rounded-br-md px-4 py-3 font-medium">
                                    Book me a vet tomorrow morning
                                </div>
                                <div className="inline-block bg-emerald-400/10 border border-emerald-300/25 text-emerald-200 text-[11px] font-mono rounded-lg px-2.5 py-1.5">
                                    checking real availability…
                                </div>
                                <div className="max-w-[90%] bg-white/10 border border-white/10 text-blue-50 text-sm rounded-2xl rounded-bl-md px-4 py-3 leading-relaxed">
                                    Booked with Dr. Amina, 10:00 tomorrow. Calendar invite sent. ✅
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* What it can do */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="text-center mb-12">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">What you can actually ask it</h2>
                    <p className="text-slate-500 mt-2 max-w-xl mx-auto">Each of these completes a real task on your account — not a description of how to do it yourself.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {CAN_DO.map((c) => (
                        <div key={c.title} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[26px]">{c.icon}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1.5">{c.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{c.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Safety */}
            <section className="bg-white border-y border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                    <div className="text-center mb-12">
                        <span className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 text-[11px] font-black uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full mb-4">
                            <span className="material-symbols-outlined text-[15px]">health_and_safety</span> Safety first, literally
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">The safety checks run before the AI does</h2>
                        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
                            An AI that is slow, confused or talked into something could miss an emergency. So we never gave it that job — emergencies are caught by fixed rules that run first, in English and Arabic alike.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {SAFETY.map((s) => (
                            <div key={s.title} className="bg-slate-50/60 rounded-3xl border border-slate-100 p-6 flex gap-5">
                                <div className="w-12 h-12 shrink-0 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/20">
                                    <span className="material-symbols-outlined text-[26px]">{s.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base mb-1.5">{s.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{s.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-8 max-w-2xl mx-auto">
                        VetAI supports your decisions — it does not replace a veterinarian, and it will never diagnose your pet or tell you what to give them.
                    </p>
                </div>
            </section>

            {/* Arabic */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
                        <span className="material-symbols-outlined text-[30px]">translate</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Arabic is not an afterthought</h2>
                    <p className="text-slate-500 mt-3 max-w-2xl mx-auto leading-relaxed">
                        Ask in Arabic and you get Arabic — right-to-left, with Arabic dates and numerals. The safety rules are written for Arabic too, in both masculine and feminine forms.
                    </p>
                    {/* Kept on its own line: mixing an RTL phrase into an LTR
                        sentence reorders badly at some widths and splits the
                        Arabic mid-phrase. */}
                    <div className="mt-6 inline-flex flex-col sm:flex-row items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3">
                        <span dir="rtl" lang="ar" className="font-bold text-slate-800 text-lg">كلبي لا يتنفس</span>
                        <span className="material-symbols-outlined text-[18px] text-rose-500">arrow_forward</span>
                        <span className="text-sm text-slate-500">recognised as an emergency, exactly like its English equivalent</span>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ask it something</h2>
                <p className="text-slate-500 mt-2 mb-7 max-w-lg mx-auto">VetAI is on every page — look for the button in the corner. Create a free account and it can book for you too.</p>
                <Link to="/signup" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[22px]">chat</span> Try VetAI free
                </Link>
            </section>

            <Footer />
        </div>
    );
};

export default VetAIPage;
