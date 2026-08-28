import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Footer from '../components/layout/Footer';

// The one channel that actually reaches us. We have no support mailbox — the
// domain was bought without one — so the form hands off to WhatsApp rather than
// pretending to deliver an email nobody would ever read.
const WHATSAPP_NUMBER = '201210212792';
const PHONE_DISPLAY = '+20 121 021 2792';

const Contact = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const f = e.target;
        const name = `${f.firstName.value} ${f.lastName.value}`.trim();
        const body = [
            `Hi PetPluse — ${f.subject.value}`,
            '',
            `From: ${name}`,
            `Email: ${f.email.value}`,
            '',
            f.message.value,
        ].join('\n');

        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(body)}`;
        const win = window.open(url, '_blank', 'noopener,noreferrer');

        setIsSubmitting(false);

        if (win) {
            toast.success('Opening WhatsApp with your message ready to send.');
        } else {
            // Pop-up blocked — never claim it was sent when it was not.
            toast.error('Please allow pop-ups, or message us directly on WhatsApp.');
        }
    };

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            {/* Hero Section */}
            <div className="relative pt-12 pb-24 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 z-0"></div>
                <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl mix-blend-overlay z-0 animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl mix-blend-overlay z-0"></div>
                <svg className="absolute bottom-0 left-0 w-full text-[#f7faf9] z-10" preserveAspectRatio="none" viewBox="0 0 1440 74" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 24C320 -24 720 48 1440 24V74H0V24Z" />
                </svg>
                <div className="max-w-4xl mx-auto text-center relative z-20">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">Let's start a <span className="text-emerald-300">conversation</span></h1>
                    <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mx-auto">Have questions about our pet services? Need help with your account? Our dedicated support team is here to ensure you and your furry friends have the best experience.</p>
                </div>
            </div>

            {/* Main Contact Section */}
            <main className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row gap-12 relative z-10 -mt-12 pb-24">
                
                {/* Contact Form */}
                <div className="lg:w-2/3 bg-white/90 backdrop-blur-xl border border-white/50 p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a message</h2>
                    <p className="text-slate-500 text-sm mb-8">Fill this in and we&apos;ll open WhatsApp with your message ready to send — so it reaches us straight away.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2" htmlFor="firstName">First Name</label>
                                <input type="text" id="firstName" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none" placeholder="Jane" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2" htmlFor="lastName">Last Name</label>
                                <input type="text" id="lastName" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none" placeholder="Doe" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2" htmlFor="email">Email Address</label>
                            <input type="email" id="email" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none" placeholder="jane@example.com" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2" htmlFor="subject">Subject</label>
                            <select id="subject" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none appearance-none">
                                <option value="" disabled defaultValue>Select a topic...</option>
                                <option value="General Inquiry">General Inquiry</option>
                                <option value="Technical Support">Technical Support</option>
                                <option value="Vet Booking Issue">Vet Booking Issue</option>
                                <option value="Feedback">Feedback</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2" htmlFor="message">Message</label>
                            <textarea id="message" rows="5" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none resize-none" placeholder="How can we help you?"></textarea>
                        </div>
                        
                        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none">
                            <span>{isSubmitting ? 'Opening WhatsApp...' : 'Send via WhatsApp'}</span>
                            <span className="material-symbols-outlined text-sm">{isSubmitting ? 'sync' : 'send'}</span>
                        </button>
                    </form>
                </div>
                
                {/* Contact Information */}
                <div className="lg:w-1/3 flex flex-col gap-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Contact Information</h3>
                        
                        <div className="space-y-6">
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">chat</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 mb-1">WhatsApp</h4>
                                    <p className="text-sm text-slate-500 group-hover:text-emerald-700 transition-colors">{PHONE_DISPLAY}</p>
                                    <p className="text-xs text-slate-400 mt-1">The fastest way to reach us</p>
                                </div>
                            </a>

                            <a href={`tel:+${WHATSAPP_NUMBER}`} className="flex items-start gap-4 group">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">call</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 mb-1">Phone</h4>
                                    <p className="text-sm text-slate-500 group-hover:text-blue-700 transition-colors">{PHONE_DISPLAY}</p>
                                    <p className="text-xs text-slate-400 mt-1">Call us if you would rather talk</p>
                                </div>
                            </a>

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                    <span className="material-symbols-outlined">code</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 mb-1">We are a software team</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">PetPluse is built and run online — there is no walk-in office to visit.</p>
                                </div>
                            </div>
                        </div>
                        
                        <hr className="my-8 border-slate-100" />
                        
                        <div>
                            <h4 className="font-bold text-sm text-slate-900 mb-4">Follow Us</h4>
                            <div className="flex gap-3">
                                <a href="#" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"><span className="material-symbols-outlined text-sm">public</span></a>
                                <a href="#" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"><span className="material-symbols-outlined text-sm">share</span></a>
                                <a href="#" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"><span className="material-symbols-outlined text-sm">photo_camera</span></a>
                            </div>
                        </div>
                    </div>
                    
                    {/* FAQ Mini Card */}
                    <div className="bg-blue-50 p-6 rounded-3xl text-blue-900 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-blue-100">
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold mb-1">Have a quick question?</h4>
                                <p className="text-sm opacity-80">Check our FAQ center first.</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </div>
                        <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-6xl opacity-10 rotate-12">help</span>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Contact;
