import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Checkout = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [cart, setCart] = useState([]);
    const [cartTotal, setCartTotal] = useState(0);
    const [pendingOrderId, setPendingOrderId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPaymobModal, setShowPaymobModal] = useState(false);

    const [billingData, setBillingData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        street: ''
    });

    useEffect(() => {
        if (user) {
            setBillingData(prev => ({
                ...prev,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    useEffect(() => {
        if (location.state && location.state.isSubscription && location.state.plan) {
            const plan = location.state.plan;
            const subscriptionItem = {
                id: plan.id,
                title: `PulseBox: ${plan.name}`,
                base_price: plan.price,
                type: 'subscription'
            };
            setCart([subscriptionItem]);
            setCartTotal(plan.price);
        } else {
            const storedCart = JSON.parse(localStorage.getItem('mewoo_cart') || '[]');
            setCart(storedCart);
            const total = storedCart.reduce((sum, item) => sum + parseFloat(item.base_price || 0), 0);
            setCartTotal(total);
        }
    }, [location.state]);

    const handleChange = (e) => {
        setBillingData({ ...billingData, [e.target.name]: e.target.value });
    };

    const removeItem = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
        if (!location.state?.isSubscription) {
            localStorage.setItem('mewoo_cart', JSON.stringify(newCart));
        }
        const total = newCart.reduce((sum, item) => sum + parseFloat(item.base_price || 0), 0);
        setCartTotal(total);
    };

    const processCheckout = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return toast.error('Your cart is empty');

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/payments/checkout`, {
                items: cart,
                total_amount: cartTotal,
                billing_data: billingData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPendingOrderId(res.data.order_id);

            // Simulate Paymob redirect
            setTimeout(() => {
                setLoading(false);
                setShowPaymobModal(true);
            }, 1500);

        } catch (error) {
            console.error(error);
            setLoading(false);
            toast.error('Error initiating checkout');
        }
    };

    const simulatePaymobSuccess = async (method) => {
        try {
            // Mock backend webhook
            await axios.post(`${API_BASE}/payments/webhook`, {
                type: 'TRANSACTION',
                obj: {
                    order: { id: pendingOrderId },
                    success: true,
                    amount_cents: cartTotal * 100,
                    source_data: { type: method, pan: "xxxx-xxxx-xxxx-1234" },
                    id: Math.floor(Math.random() * 100000000)
                }
            });

            if (!location.state?.isSubscription) {
                localStorage.removeItem('mewoo_cart');
            }
            navigate(`/payment-success?order_id=${pendingOrderId}`);
        } catch (error) {
            toast.error('Payment simulation failed');
            setShowPaymobModal(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] py-8 md:py-12 px-4">
            <div className="max-w-4xl mx-auto relative">
                
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">shopping_cart_checkout</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Checkout</h1>
                        <p className="text-sm text-slate-500">Complete your order securely</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Billing Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">person</span> Billing Details
                            </h2>
                            
                            <form id="checkoutForm" onSubmit={processCheckout} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                                        <input type="text" name="first_name" value={billingData.first_name} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                                        <input type="text" name="last_name" value={billingData.last_name} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                    <input type="email" name="email" value={billingData.email} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                                    <input type="tel" name="phone_number" value={billingData.phone_number} onChange={handleChange} required placeholder="+20 100 000 0000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Address / Region</label>
                                    <input type="text" name="street" value={billingData.street} onChange={handleChange} required placeholder="E.g., Maadi, Cairo" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-28">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">receipt_long</span> Order Summary
                            </h2>
                            
                            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                                {cart.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-4">Your cart is empty.</p>
                                ) : (
                                    cart.map((item, index) => (
                                        <div key={index} className="flex gap-3 items-center group">
                                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 text-blue-600">
                                                <span className="material-symbols-outlined text-xl">work</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800 truncate">{item.title}</h4>
                                                <p className="text-xs text-slate-500">{parseFloat(item.base_price).toFixed(2)} EGP</p>
                                            </div>
                                            <button type="button" onClick={() => removeItem(index)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="border-t border-slate-100 pt-4 space-y-3 mb-6">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-slate-700">{cartTotal.toFixed(2)} EGP</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Taxes & Fees</span>
                                    <span className="font-bold text-slate-700">Calculated by Paymob</span>
                                </div>
                                <div className="flex justify-between text-lg font-black text-slate-900 pt-3 border-t border-slate-100">
                                    <span>Total</span>
                                    <span>{cartTotal.toFixed(2)} EGP</span>
                                </div>
                            </div>

                            <button 
                                onClick={(e) => document.getElementById('checkoutForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                                disabled={cart.length === 0 || loading} 
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined">credit_card</span> Pay with Paymob
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mock Loader Overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center rounded-3xl">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <h3 className="text-xl font-bold text-slate-800">Processing...</h3>
                        <p className="text-slate-500 mt-2">Please do not close this window.</p>
                    </div>
                )}

                {/* Paymob Iframe Modal (Mocked Hosted Checkout) */}
                {showPaymobModal && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-8">
                        <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                            <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-600">lock</span>
                                    <span className="font-bold text-slate-800 text-sm tracking-wide">PAYMOB SECURE CHECKOUT</span>
                                </div>
                                <button onClick={() => setShowPaymobModal(false)} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <div className="p-6">
                                <div className="mb-6 text-center">
                                    <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                                    <p className="text-3xl font-black text-slate-900">{cartTotal.toFixed(2)} EGP</p>
                                </div>
                                <div className="space-y-4">
                                    <button onClick={() => simulatePaymobSuccess('card')} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-between transition-colors">
                                        <span className="flex items-center gap-2"><span className="material-symbols-outlined">credit_card</span> Credit / Debit Card</span>
                                        <span className="material-symbols-outlined text-slate-400">arrow_forward</span>
                                    </button>
                                    <button onClick={() => simulatePaymobSuccess('wallet')} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-3 px-4 rounded-xl font-bold flex items-center justify-between transition-colors">
                                        <span className="flex items-center gap-2"><span className="material-symbols-outlined">account_balance_wallet</span> Mobile Wallet</span>
                                        <span className="material-symbols-outlined text-indigo-300">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by Paymob</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Checkout;
