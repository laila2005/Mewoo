import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
                <Link to="/" className="text-blue-600 font-bold flex items-center gap-1 mb-8 hover:underline w-fit">
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Home
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Terms of Service</h1>
                <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last updated: May 20, 2026</p>
                
                <div className="prose max-w-none text-slate-700 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">1. Agreement to Terms</h2>
                        <p>By accessing or using the PetPulse platform, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
                        <p>PetPulse provides an integrated ecosystem for pet owners to access veterinary care, purchase pet supplies, and connect with other pet enthusiasts. We act as an intermediary between service providers (vets, trainers, shops) and users.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Responsibilities</h2>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>You must provide accurate and complete information when creating an account.</li>
                            <li>You are responsible for safeguarding the password that you use to access the service.</li>
                            <li>You agree not to disclose your password to any third party.</li>
                            <li>You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Terms;
