import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();
    const messagesEndRef = useRef(null);
    const [isFirstOpen, setIsFirstOpen] = useState(true);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    useEffect(() => {
        if (isOpen && isFirstOpen) {
            setIsFirstOpen(false);
            setTimeout(() => {
                setMessages(prev => [...prev, { text: "Hello! 🐱 I'm VetAI, your friendly PetPulse assistant.", isUser: false }]);
                setTimeout(() => {
                    setMessages(prev => [...prev, { 
                        text: `I can help you check pet symptoms, find nearby vets, or adopt a pet. How can I help today?
                            <div class="flex flex-wrap gap-2 mt-3">
                                <button class="bot-chip">Book a Vet</button>
                                <button class="bot-chip">Check Symptoms</button>
                                <button class="bot-chip">Adopt a Pet</button>
                            </div>`, 
                        isUser: false, 
                        isHtml: true 
                    }]);
                }, 900);
            }, 500);
        }
    }, [isOpen, isFirstOpen]);

    const handleSend = async (textToSend) => {
        const text = textToSend || input.trim();
        if (!text) return;

        setMessages(prev => [...prev, { text, isUser: true }]);
        setInput('');
        setLoading(true);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await axios.post(`${API_BASE}/ai/triage`, {
                symptoms: text,
                petId: null,
                userLocation: 'Unknown' // Replace with actual location if available
            }, { headers });

            setMessages(prev => [...prev, { 
                text: res.data.triage_result || res.data.message || "I've processed your request. Can I help with anything else?", 
                isUser: false, 
                isHtml: true 
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { text: "Sorry, there was an error connecting to my AI brain.", isUser: false }]);
        } finally {
            setLoading(false);
        }
    };

    const handleHtmlClick = (e) => {
        if (e.target.classList.contains('bot-chip')) {
            handleSend(e.target.textContent);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-[9999] max-w-[calc(100vw-40px)]">
            <style>{`
                .message { max-width: 85%; padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.4; }
                .bot-message { align-self: flex-start; background: white; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
                .user-message { align-self: flex-end; background: #0060ac; color: white; border-bottom-right-radius: 4px; }
                .bot-chip { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 16px; padding: 6px 12px; font-size: 12px; color: #334155; cursor: pointer; transition: all 0.2s; white-space: nowrap; margin-right: 4px; margin-bottom: 4px; }
                .bot-chip:hover { background: #e2e8f0; color: #0f172a; }
                .bot-card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .bot-card-btn { display: block; width: 100%; text-align: center; background: #f8fafc; padding: 8px; border-top: 1px solid #e2e8f0; color: #005da7; font-weight: 600; text-decoration: none; font-size: 13px; }
                .bot-card-btn:hover { background: #f1f5f9; }
                @keyframes float-badge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                .ai-floating-badge { animation: float-badge 2s ease-in-out infinite; }
            `}</style>
            
            {/* Toggle Button */}
            {!isOpen && (
                <div className="relative">
                    {isFirstOpen && (
                        <div className="ai-floating-badge absolute -top-12 -left-4 bg-white text-blue-600 font-bold px-3 py-1.5 rounded-xl shadow-lg border border-blue-100 whitespace-nowrap text-xs flex items-center gap-1 z-50">
                            ✨ Try VetAI Now!
                            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-blue-100 transform rotate-45"></div>
                        </div>
                    )}
                    <button 
                        onClick={() => setIsOpen(true)} 
                        className="animate-pulse relative z-10 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all font-medium text-sm"
                    >
                        <div className="bg-white rounded-full p-1 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600 text-sm">smart_toy</span>
                        </div>
                        <span className="font-bold">Chat with VetAI</span>
                    </button>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[calc(100vw-30px)] h-[500px] sm:w-[400px] sm:h-[550px] max-w-full bg-white rounded-2xl shadow-[0_22px_48px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden border border-slate-200 mt-3">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                                <span className="material-symbols-outlined text-blue-600">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="font-semibold m-0 text-white">VetAI Assistant</h3>
                                <p className="text-xs opacity-90 m-0 text-blue-100">Cat Health Specialist • Online</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 w-8 h-8 flex items-center justify-center rounded-xl text-xl leading-none transition-colors">×</button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-5 overflow-y-auto bg-slate-50 flex flex-col gap-4" onClick={handleHtmlClick}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.isUser ? 'user-message' : 'bot-message text-slate-700'}`}>
                                {msg.isHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                ) : (
                                    msg.text
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="text-sm text-slate-500 italic flex items-center gap-2">
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span> VetAI is thinking...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-200 bg-white">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Describe symptoms, ask about bookings..." 
                                className="flex-1 border border-slate-300 focus:border-blue-600 rounded-2xl px-5 py-3 text-sm outline-none transition-colors" 
                            />
                            <button 
                                onClick={() => handleSend()}
                                disabled={loading || !input.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white w-12 h-12 rounded-2xl flex items-center justify-center transition-colors text-xl shrink-0"
                            >
                                <span className="material-symbols-outlined">arrow_upward</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
