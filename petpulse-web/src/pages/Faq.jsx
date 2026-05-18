import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FaqItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`faq-item border ${isOpen ? 'border-blue-300 shadow-md' : 'border-slate-200'} rounded-2xl overflow-hidden transition-all bg-white hover:border-blue-300 hover:shadow-md`}>
            <button className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-800 focus:outline-none" onClick={() => setIsOpen(!isOpen)}>
                {question}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${isOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
            </button>
            <div className={`faq-answer px-6 bg-slate-50/50 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="pb-6 pt-2 text-slate-600 leading-relaxed text-sm md:text-base font-medium">
                    {answer}
                </div>
            </div>
        </div>
    );
};

const Faq = () => {
    return (
        <div className="bg-slate-50 font-sans min-h-[calc(100vh-80px)] flex flex-col">
            {/* Header with Dynamic Gradient */}
            <div className="relative pt-24 pb-32 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 z-0"></div>
                
                {/* Decorative Elements */}
                <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
                <svg className="absolute bottom-0 left-0 w-full text-slate-50 z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
                </svg>

                <div className="max-w-3xl mx-auto relative z-20 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white font-medium text-sm mb-6">
                        <span className="material-symbols-outlined text-sm">lightbulb</span> Knowledge Base
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                        How can we <span className="text-emerald-300">help?</span>
                    </h1>
                    <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mx-auto">
                        Find quick answers to your questions and learn how to get the most out of PetPulse.
                    </p>
                    
                    {/* Search Bar in Header */}
                    <div className="mt-10 max-w-xl mx-auto relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input type="text" placeholder="Search for answers..." className="w-full pl-12 pr-4 py-4 rounded-2xl border-none shadow-xl focus:ring-4 focus:ring-blue-500/50 text-slate-700 font-medium placeholder-slate-400 outline-none" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 w-full relative z-20 -mt-8">
                <div className="bg-white rounded-[2rem] shadow-xl p-8 md:p-12 border border-slate-100">
                    
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                            <span className="material-symbols-outlined text-2xl">help_center</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Frequently Asked Questions</h2>
                    </div>

                    <div className="space-y-5">
                        <FaqItem 
                            question="How do I adopt a pet through PetPulse?" 
                            answer='Adopting a pet is easy! Navigate to the Community section from the homepage. Browse the available pets, and when you find one you love, click "Adopt". From there, you can submit an adoption request, and our verification team will contact you within 48 hours.'
                        />
                        <FaqItem 
                            question="Are the veterinarians verified?" 
                            answer="Yes. Every veterinarian and service provider on PetPulse undergoes a rigorous verification process, including license verification and background checks, to ensure your pet receives the highest quality care."
                        />
                        <FaqItem 
                            question="How does the PetPulse point system work?" 
                            answer="You earn points automatically! You get 1 point for every day you are active, 5 points for every community post you share, and 20 points for every pet you register. Accumulate points to climb the tiers from Pet Novice to Pet Guru!"
                        />
                        <FaqItem 
                            question="I forgot my password, how can I reset it?" 
                            answer='Simply click the "Forgot Password" link on the Login page. Enter your email address, and we will send you a secure link to reset your password within minutes.'
                        />
                    </div>

                    {/* Support CTA */}
                    <div className="mt-16 text-center relative rounded-[2rem] p-10 overflow-hidden bg-slate-50 shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-emerald-100/50 z-0"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg text-blue-600 mb-6">
                                <span className="material-symbols-outlined text-3xl">support_agent</span>
                            </div>
                            <h3 className="font-extrabold text-2xl text-slate-800 mb-3">Still have questions?</h3>
                            <p className="text-slate-600 mb-8 max-w-md font-medium text-sm md:text-base">Our support team is always ready to help you with any issue, day or night.</p>
                            <Link to="/contact" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
                                Contact Support <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Faq;
