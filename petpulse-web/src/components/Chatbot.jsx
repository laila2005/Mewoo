import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();
    const messagesEndRef = useRef(null);
    const [isFirstOpen, setIsFirstOpen] = useState(true);
    const navigate = useNavigate();

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
                userLocation: 'Unknown'
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
        } else if (e.target.closest('.bot-card-btn')) {
            e.preventDefault();
            const href = e.target.closest('.bot-card-btn').getAttribute('href');
            if (href) navigate(href);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-[9999] max-w-[calc(100vw-40px)]">
            <style>{`
                .message { max-width: 85%; padding: 14px 18px; border-radius: 20px; font-size: 14px; line-height: 1.5; box-shadow: 0 2px 10px rgba(0,0,0,0.02); }
                .bot-message { align-self: flex-start; background: #ffffff; border: 1px solid #eef2f6; border-bottom-left-radius: 4px; color: #334155; }
                .user-message { align-self: flex-end; background: linear-gradient(135deg, #005da7, #004883); color: white; border-bottom-right-radius: 4px; }
                
                .bot-chip { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px; padding: 6px 14px; font-size: 13px; color: #475569; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; margin-right: 6px; margin-bottom: 6px; font-weight: 500; }
                .bot-chip:hover { background: #005da7; color: white; border-color: #005da7; transform: translateY(-1px); }
                
                .bot-card { border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin-top: 12px; background: white; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.2s; }
                .bot-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
                .bot-card-btn { display: block; width: 100%; text-align: center; background: #f8fafc; padding: 10px; border-top: 1px solid #eef2f6; color: #005da7; font-weight: 600; text-decoration: none; font-size: 14px; transition: background 0.2s; }
                .bot-card-btn:hover { background: #f1f5f9; color: #004883; }
                
                @keyframes float-badge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                .ai-floating-badge { animation: float-badge 2s ease-in-out infinite; }
                
                /* Typing Indicator */
                .typing-indicator span { display: inline-block; width: 6px; height: 6px; background-color: #94a3b8; border-radius: 50%; margin: 0 2px; animation: bounce 1.4s infinite ease-in-out both; }
                .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
                .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
                
                /* Scrollbar */
                .chat-scroll::-webkit-scrollbar { width: 6px; }
                .chat-scroll::-webkit-scrollbar-track { background: transparent; }
                .chat-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
            
            {/* Toggle Button */}
            {!isOpen && (
                <div className="relative">
                    {isFirstOpen && (
                        <div className="ai-floating-badge absolute -top-14 right-0 bg-white/95 backdrop-blur text-blue-600 font-bold px-4 py-2 rounded-2xl shadow-[0_8px_30px_rgb(0,93,167,0.12)] border border-white/50 whitespace-nowrap text-xs sm:text-sm flex items-center gap-1.5 z-50">
                            <span className="text-lg">✨</span> Try Agentic AI
                            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white transform rotate-45 border-b border-r border-slate-100"></div>
                        </div>
                    )}
                    <button 
                        onClick={() => setIsOpen(true)} 
                        className="group relative z-10 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-full shadow-[0_8px_30px_rgb(0,93,167,0.3)] hover:shadow-[0_12px_40px_rgb(0,93,167,0.4)] hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                        <span className="material-symbols-outlined text-[28px] sm:text-[32px] group-hover:rotate-12 transition-transform">smart_toy</span>
                    </button>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[calc(100vw-30px)] h-[550px] sm:w-[420px] sm:h-[650px] max-w-full bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100/50 mt-3 transform origin-bottom-right transition-all duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-5 flex items-center justify-between shadow-sm relative z-10">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-inner">
                                <span className="material-symbols-outlined text-white text-[28px]">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg m-0 text-white flex items-center gap-2">
                                    VetAI <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
                                </h3>
                                <p className="text-xs opacity-90 m-0 text-blue-50 font-medium flex items-center gap-1.5 mt-0.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-all">
                            <span className="material-symbols-outlined">expand_more</span>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-5 overflow-y-auto chat-scroll bg-slate-50/50 flex flex-col gap-5" onClick={handleHtmlClick}>
                        <div className="text-center mt-2 mb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Today</span>
                        </div>
                        
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.isUser ? 'user-message' : 'bot-message'}`}>
                                {msg.isHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: msg.text }} className="prose prose-sm prose-slate max-w-none" />
                                ) : (
                                    msg.text
                                )}
                            </div>
                        ))}
                        
                        {loading && (
                            <div className="message bot-message flex items-center gap-2 px-4 py-3">
                                <div className="typing-indicator flex items-center justify-center h-4">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100 relative z-10">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask VetAI anything..."
                                className="w-full pl-5 pr-14 py-3.5 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[20px] text-sm transition-all shadow-inner"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="absolute right-2 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[20px] ml-0.5 mt-0.5">send</span>
                            </button>
                        </form>
                        <div className="text-center mt-3">
                            <p className="text-[10px] text-slate-400 font-medium">VetAI can make mistakes. Consider consulting a human vet.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
