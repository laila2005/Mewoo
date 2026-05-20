import React from 'react';
import { Link } from 'react-router-dom';

const Cookies = () => {
    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
                <Link to="/" className="text-blue-600 font-bold flex items-center gap-1 mb-8 hover:underline w-fit">
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Home
                </Link>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Cookie Policy</h1>
                <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last updated: May 20, 2026</p>
                
                <div className="prose max-w-none text-slate-700 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">1. What Are Cookies</h2>
                        <p>As is common practice with almost all professional websites, this site uses cookies, which are tiny files that are downloaded to your computer, to improve your experience. This page describes what information they gather, how we use it, and why we sometimes need to store these cookies.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Cookies</h2>
                        <p>We use cookies for a variety of reasons detailed below. Unfortunately, in most cases, there are no industry standard options for disabling cookies without completely disabling the functionality and features they add to this site.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Account related cookies:</strong> If you create an account with us then we will use cookies for the management of the signup process and general administration.</li>
                            <li><strong>Login related cookies:</strong> We use cookies when you are logged in so that we can remember this fact.</li>
                            <li><strong>Site preferences cookies:</strong> In order to provide you with a great experience on this site we provide the functionality to set your preferences.</li>
                        </ul>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">3. Disabling Cookies</h2>
                        <p>You can prevent the setting of cookies by adjusting the settings on your browser (see your browser Help for how to do this). Be aware that disabling cookies will affect the functionality of this and many other websites that you visit.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Cookies;
