import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const VetTriageModal = ({ isOpen, onClose }) => {
    const { token, user } = useAuth();
    const [messages, setMessages] = useState([
        { role: 'agent', content: "Hello! I'm your PetPulse Triage Assistant. Could you tell me what symptoms your pet is experiencing?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, messages]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(`${API_BASE}/ai/triage`, {
                symptoms: userText,
                userLocation: { lat: 30.0444, lng: 31.2357 } // Default location for map pairing
            }, { headers });

            setMessages(prev => [...prev, { role: 'agent', content: res.data.response || "I couldn't process that right now. Please consult a local vet immediately if this is an emergency." }]);
        } catch (error) {
            console.error("AI Triage Error:", error);
            setMessages(prev => [...prev, { role: 'agent', content: "Sorry, I am currently experiencing technical difficulties. Please call your local vet clinic." }]);
            toast.error("Failed to connect to triage agent");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-lg h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex justify-between items-center text-white shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <span className="material-symbols-outlined text-white">smart_toy</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">Inqaz AI Triage</h2>
                            <p className="text-xs text-blue-100 font-medium flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block animate-pulse"></span>
                                Agent Online
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <span className="material-symbols-outlined text-white text-[20px]">close</span>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50 flex flex-col gap-4">
                    <div className="text-center mb-2">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase bg-slate-200/50 px-3 py-1 rounded-full">Secure Session Started</span>
                    </div>

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                                msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-sm' 
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100 z-10">
                    <form onSubmit={handleSubmit} className="flex gap-2 relative">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe your pet's symptoms..." 
                            className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm outline-none transition-all shadow-inner"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">Inqaz AI provides recommendations, not certified medical diagnoses.</p>
                </div>
            </div>
        </div>
    );
};

export default VetTriageModal;
