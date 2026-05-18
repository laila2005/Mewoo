import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl mix-blend-multiply opacity-60 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-100 rounded-full blur-3xl mix-blend-multiply opacity-60"></div>
        
        <div className="bg-white rounded-3xl p-10 md:p-16 max-w-2xl w-full text-center relative z-10 shadow-xl border border-slate-100">
            <div className="flex justify-center mb-8">
                <div className="relative">
                    <span className="material-symbols-outlined text-[120px] text-blue-200">pets</span>
                    <span className="material-symbols-outlined text-6xl text-slate-800 absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 bg-white rounded-full p-2 shadow-sm border border-slate-100">search_off</span>
                </div>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight mb-4">404</h1>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">Looks like you're barking up the wrong tree.</h2>
            <p className="text-slate-500 mb-10 max-w-lg mx-auto leading-relaxed">
                We've searched high and low, but the page you're looking for seems to have wandered off. Let's get you back to familiar territory.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                    onClick={() => window.history.back()}
                    className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    Go Back
                </button>
                <Link 
                    to="/" 
                    className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px]">home</span>
                    Back to Home
                </Link>
            </div>
        </div>
    </div>
  );
};

export default NotFound;
