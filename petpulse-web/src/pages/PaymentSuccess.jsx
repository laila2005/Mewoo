import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

const PaymentSuccess = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#005da7', '#196a59', '#7b5508']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#005da7', '#196a59', '#7b5508']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }, []);

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center overflow-hidden">
                <div className="h-32 bg-emerald-500 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-white/10" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg relative z-10 -mb-16">
                        <span className="material-symbols-outlined text-4xl text-emerald-500 font-bold">check</span>
                    </div>
                </div>
                
                <div className="pt-16 pb-10 px-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Payment Successful!</h1>
                    <p className="text-slate-500 mb-8">Your order has been placed and is being processed. You will receive an email confirmation shortly.</p>
                    
                    <div className="flex flex-col gap-3">
                        <button onClick={() => navigate('/marketplace')} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">shopping_bag</span> Continue Shopping
                        </button>
                        <button onClick={() => navigate('/')} className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">home</span> Return to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
