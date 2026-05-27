import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/layout/Footer';

const Privacy = () => {
    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="flex-grow py-12 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <Link to="/" className="text-blue-600 font-bold flex items-center gap-1 mb-8 hover:underline w-fit">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Home
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
                    <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last updated: May 20, 2026</p>
                    
                    <div className="prose max-w-none text-slate-700 space-y-6">
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
                            <p>Welcome to PetPulse. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
                        </section>
                        
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">2. The Data We Collect</h2>
                            <p>We may collect, use, store and transfer different kinds of personal data about you and your pet which we have grouped together as follows:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                                <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                                <li><strong>Pet Data:</strong> includes pet species, breed, medical history, and vaccination records.</li>
                            </ul>
                        </section>
                        
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Data</h2>
                            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                                <li>Where it is necessary for our legitimate interests and your interests and fundamental rights do not override those interests.</li>
                                <li>Where we need to comply with a legal or regulatory obligation.</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Privacy;
