import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import BookingWidget from './BookingWidget';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const ChatMessage = ({ msg, onHtmlClick, navigate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (msg.isUser) {
        return (
            <div className="message user-message">
                {msg.text}
            </div>
        );
    }
    
    // Intercept Booking Flow Tag
    if (msg.isHtml && msg.text.includes('booking-flow')) {
        const reasonMatch = msg.text.match(/data-reason="([^"]*)"/);
        const vetIdMatch = msg.text.match(/data-vet-id="([^"]*)"/);
        const vetNameMatch = msg.text.match(/data-vet-name="([^"]*)"/);

        const prefilledReason = reasonMatch ? reasonMatch[1] : '';
        const prefilledVetId = vetIdMatch ? vetIdMatch[1] : '';
        const prefilledVetName = vetNameMatch ? vetNameMatch[1] : '';

        // Decode HTML entities
        const decodedReason = prefilledReason.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

        return (
            <div className="message bot-message p-0 bg-transparent border-0 shadow-none max-w-[95%] w-full">
                <BookingWidget 
                    prefilledReason={decodedReason}
                    prefilledVetId={prefilledVetId}
                    prefilledVetName={prefilledVetName}
                />
            </div>
        );
    }
    
    // Intercept Mating Card Tag
    if (msg.isHtml && msg.text.includes('mating-match-card')) {
        const cardStartIndex = msg.text.indexOf('<div class="mating-match-card');
        let introText = msg.text;
        let cardHtmls = [];
        
        if (cardStartIndex !== -1) {
            introText = msg.text.substring(0, cardStartIndex).trim();
            const cardsPart = msg.text.substring(cardStartIndex);
            const rawCards = cardsPart.split(/<div class="mating-match-card/g).filter(Boolean);
            cardHtmls = rawCards.map(c => '<div class="mating-match-card' + c);
        }

        return (
            <div className="message bot-message border border-rose-100 rounded-2xl bg-white shadow-sm overflow-hidden p-0 max-w-[95%] w-full">
                <div className="px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between bg-gradient-to-r from-rose-500 to-pink-600">
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">favorite</span>
                        <span>VetAI Agentic Matchmaking</span>
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">
                        Mating Center
                    </span>
                </div>
                
                <div className="p-4 flex flex-col gap-3">
                    <p className="text-slate-700 text-sm leading-relaxed text-left" dangerouslySetInnerHTML={{ __html: introText }} />
                    
                    {cardHtmls.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-2 justify-start items-stretch" onClick={onHtmlClick}>
                            {cardHtmls.map((html, index) => (
                                <div 
                                    key={index}
                                    dangerouslySetInnerHTML={{ __html: html }} 
                                    className="mating-card-container hover:scale-[1.02] transition-transform duration-200"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    const isTriage = msg.isHtml && (
        msg.text.includes('bot-card') || 
        msg.text.includes('triage') || 
        msg.text.includes('emergency') ||
        msg.text.includes('Consultation')
    );
    
    if (!isTriage) {
        return (
            <div className="message bot-message">
                {msg.isHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: msg.text }} className="prose prose-sm prose-slate max-w-none" />
                ) : (
                    msg.text
                )}
            </div>
        );
    }
    
    const isEmergency = msg.text.toLowerCase().includes('emergency') || msg.text.toLowerCase().includes('blood') || msg.text.toLowerCase().includes('urgent');
    
    const cardStartIndex = msg.text.indexOf('<div class="bot-card');
    const cardStartIndexAlt = msg.text.indexOf('<div className="bot-card');
    const splitIndex = cardStartIndex !== -1 ? cardStartIndex : cardStartIndexAlt;
    
    let introText = msg.text;
    let cardHtml = '';
    
    if (splitIndex !== -1) {
        introText = msg.text.substring(0, splitIndex).trim();
        cardHtml = msg.text.substring(splitIndex).trim();
    }
    
    return (
        <div className="message bot-message border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden p-0 max-w-[90%]">
            <div className={`px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between ${isEmergency ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">medical_services</span>
                    <span>VetAI {isEmergency ? 'Emergency Triage' : 'Diagnostic Brief'}</span>
                </div>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">
                    {isEmergency ? 'Urgent' : 'Routine'}
                </span>
            </div>
            
            <div className="p-4 flex flex-col gap-3">
                <p className="text-slate-700 text-sm leading-relaxed text-left" dangerouslySetInnerHTML={{ __html: introText }} />
                
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                    <button 
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer select-none"
                    >
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-blue-500">fact_check</span>
                            Diagnostic Assessment Steps
                        </span>
                        <span className="material-symbols-outlined transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            expand_more
                        </span>
                    </button>
                    
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[300px] border-t border-slate-100 p-3' : 'max-h-0'}`}>
                        <ul className="text-xs text-slate-600 flex flex-col gap-2.5 list-none p-0 m-0 text-left">
                            <li className="flex gap-2">
                                <span className="text-emerald-500 font-bold">✓</span>
                                <div>
                                    <strong className="text-slate-700 block">Symptom Ingestion:</strong>
                                    Analyzed severity and emergency markers in real-time.
                                </div>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-emerald-500 font-bold">✓</span>
                                <div>
                                    <strong className="text-slate-700 block">Triage Classification:</strong>
                                    Mapped symptoms against vet database providers.
                                </div>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-emerald-500 font-bold">✓</span>
                                <div>
                                    <strong className="text-slate-700 block">Actionable Care Guide:</strong>
                                    Coordinated routing links and pre-booking holds.
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
                
                {cardHtml && (
                    <div 
                        onClick={onHtmlClick}
                        dangerouslySetInnerHTML={{ __html: cardHtml }} 
                        className="triage-action-card mt-1"
                    />
                )}
            </div>
        </div>
    );
};

const Chatbot = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();
    const messagesEndRef = useRef(null);
    const [isFirstOpen, setIsFirstOpen] = useState(true);
    const navigate = useNavigate();
    const [isOverlayActive, setIsOverlayActive] = useState(false);
    
    // AI Matchmaking states
    const [showProposalOverlay, setShowProposalOverlay] = useState(false);
    const [compatiblePets, setCompatiblePets] = useState([]);
    const [proposalTarget, setProposalTarget] = useState(null);
    const [submittingProposal, setSubmittingProposal] = useState(false);

    // Keep a ref to handleSend so the event listener doesn't need to rebind on every render or state change
    const handleSendRef = useRef(null);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('open_chat') === 'true') {
            setIsOpen(true);
        }

        const handleOpenMatingChat = (e) => {
            setIsOpen(true);
            if (e.detail?.pet) {
                const pet = e.detail.pet;
                const genderText = (pet.gender || 'male').toLowerCase() === 'male' ? 'female' : 'male';
                const queryStr = `I want to find a compatible ${genderText} ${pet.species} mate for my pet similar to ${pet.name} who is a ${pet.gender} ${pet.breed} in ${pet.location || 'Cairo'}.`;
                // Add a small delay to make sure the open transition has completed and user sees the typing effect
                setTimeout(() => {
                    if (handleSendRef.current) {
                        handleSendRef.current(queryStr);
                    }
                }, 400);
            }
        };
        window.addEventListener('open-chatbot-mating', handleOpenMatingChat);
        return () => window.removeEventListener('open-chatbot-mating', handleOpenMatingChat);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const handleFocus = (e) => {
            if (e.target.closest('.chatbot-container') || e.target.closest('.chatbot-window')) {
                return;
            }
            if (window.innerWidth < 768) {
                setIsOverlayActive(true);
            }
        };

        const handleBlur = () => {
            if (window.innerWidth < 768) {
                checkOverlays();
            }
        };

        const checkOverlays = () => {
            if (window.innerWidth >= 768) {
                setIsOverlayActive(false);
                return;
            }
            
            // Auto-hide when typing in form inputs on mobile to avoid keyboard overlays
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
                if (!activeEl.closest('.chatbot-container')) {
                    setIsOverlayActive(true);
                    return;
                }
            }
            
            const divs = document.querySelectorAll('div');
            let active = false;
            for (const div of divs) {
                if (div.closest('.chatbot-container') || div.closest('.chatbot-window')) {
                    continue;
                }
                
                const className = div.className || '';
                const isFixedOrAbsolute = className.includes('fixed') || className.includes('absolute');
                const isBackdrop = className.includes('backdrop-blur-sm') || 
                                   className.includes('bg-slate-900/') || 
                                   className.includes('bg-black/50') ||
                                   className.includes('bg-slate-900/40') ||
                                   className.includes('bg-slate-900/55') ||
                                   className.includes('bg-slate-900/60') ||
                                   className.includes('bg-slate-900/80') ||
                                   className.includes('bg-black/60');
                                   
                if (isFixedOrAbsolute && isBackdrop) {
                    const style = window.getComputedStyle(div);
                    if (
                        style.display !== 'none' && 
                        style.visibility !== 'hidden' && 
                        style.opacity !== '0' &&
                        div.offsetWidth > 0 && 
                        div.offsetHeight > 0
                    ) {
                        active = true;
                        break;
                    }
                }
            }
            setIsOverlayActive(active);
        };

        checkOverlays();

        const observer = new MutationObserver(() => {
            checkOverlays();
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.removeEventListener('focus', handleFocus);
                input.removeEventListener('blur', handleBlur);
                input.addEventListener('focus', handleFocus);
                input.addEventListener('blur', handleBlur);
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', handleFocus);
            input.addEventListener('blur', handleBlur);
        });

        window.addEventListener('resize', checkOverlays);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', checkOverlays);
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.removeEventListener('focus', handleFocus);
                input.removeEventListener('blur', handleBlur);
            });
        };
    }, []);

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

    const handleProposeMatch = async (targetId, targetName, targetSpecies, targetGender) => {
        if (!token) {
            toast.error('Please log in to propose a mating match!');
            navigate('/login');
            return;
        }

        try {
            setLoading(true);
            const headers = { Authorization: `Bearer ${token}` };
            const petsRes = await axios.get(`${API_BASE}/pets`, { headers });
            const petsList = petsRes.data?.pets || petsRes.data || [];
            
            // Filter compatible pets
            const targetSpecLower = (targetSpecies || 'Dog').toLowerCase();
            const targetGendLower = (targetGender || 'female').toLowerCase();
            
            const list = petsList.filter(p => 
                (p.species || '').toLowerCase() === targetSpecLower && 
                (p.gender || '').toLowerCase() !== targetGendLower
            );
            
            if (list.length === 0) {
                toast.error(`You don't have any registered pets compatible with ${targetName} (${targetGendLower === 'female' ? 'Male' : 'Female'} ${targetSpecLower}). Please register one first!`);
                return;
            }

            const targetObj = { id: targetId, name: targetName, species: targetSpecies, gender: targetGender };
            setProposalTarget(targetObj);

            if (list.length === 1) {
                // If exactly 1 compatible pet, submit directly in 1-click!
                await submitMatingProposalDirect(list[0].id, targetObj);
            } else {
                // If multiple, show overlay
                setCompatiblePets(list);
                setShowProposalOverlay(true);
            }
        } catch (err) {
            console.error('Failed to prepare mating proposal:', err);
            toast.error('Failed to retrieve your pets.');
        } finally {
            setLoading(false);
        }
    };

    const submitMatingProposalDirect = async (userPetId, targetPet) => {
        try {
            setSubmittingProposal(true);
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post(`${API_BASE}/mating/request`, {
                pet_id: targetPet.id,
                applicant_pet_id: userPetId,
                message: `Hi! Our AI matchmaking service indicated our pets would make a wonderful mating pair! Let's connect.`
            }, { headers });
            
            toast.success(`🐾 Mating proposal sent to ${targetPet.name} successfully!`);
        } catch (err) {
            console.error('Failed to submit mating proposal:', err);
            toast.error(err.response?.data?.error || 'Failed to submit mating proposal.');
        } finally {
            setSubmittingProposal(false);
            setProposalTarget(null);
        }
    };

    const submitMatingProposal = async (userPetId) => {
        if (!proposalTarget) return;
        try {
            setSubmittingProposal(true);
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post(`${API_BASE}/mating/request`, {
                pet_id: proposalTarget.id,
                applicant_pet_id: userPetId,
                message: `Hi! Our AI matchmaking service indicated our pets would make a wonderful mating pair! Let's connect.`
            }, { headers });
            
            toast.success(`🐾 Mating proposal sent to ${proposalTarget.name} successfully!`);
            setShowProposalOverlay(false);
        } catch (err) {
            console.error('Failed to submit mating proposal:', err);
            toast.error(err.response?.data?.error || 'Failed to submit mating proposal.');
        } finally {
            setSubmittingProposal(false);
            setProposalTarget(null);
        }
    };

    const handleHtmlClick = (e) => {
        if (e.target.classList.contains('bot-chip')) {
            handleSend(e.target.textContent);
        } else if (e.target.closest('.bot-card-btn')) {
            e.preventDefault();
            const href = e.target.closest('.bot-card-btn').getAttribute('href');
            if (href) navigate(href);
        } else if (e.target.closest('.propose-ai-match-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.propose-ai-match-btn');
            const targetId = btn.getAttribute('data-target-id');
            const targetName = btn.getAttribute('data-target-name');
            const targetSpecies = btn.getAttribute('data-target-species');
            const targetGender = btn.getAttribute('data-target-gender');
            handleProposeMatch(targetId, targetName, targetSpecies, targetGender);
        }
    };

    useEffect(() => {
        handleSendRef.current = handleSend;
    });

    // Hide chatbot on pages where intense workflows or chat interfaces overlap
    if (['/checkout', '/messages'].includes(location.pathname)) {
        return null;
    }

    return (
        <div className={`fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-[9999] chatbot-container ${isOverlayActive ? 'hidden md:block' : ''}`}>
            <style>{`
                .message { max-width: 85%; padding: 14px 18px; border-radius: 20px; font-size: 14px; line-height: 1.5; box-shadow: 0 2px 10px rgba(0,0,0,0.02); flex-shrink: 0; }
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
                <div className="relative flex justify-end">
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
                <div className="w-[calc(100vw-32px)] h-[80vh] sm:w-[420px] sm:h-[650px] max-w-[420px] max-h-[800px] bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100/50 mt-3 transform origin-bottom-right transition-all duration-300">
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
                            <ChatMessage 
                                key={idx} 
                                msg={msg} 
                                onHtmlClick={handleHtmlClick} 
                                navigate={navigate} 
                            />
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

                    {/* Inline Mating Proposal Selection Overlay */}
                    {showProposalOverlay && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 w-full max-w-[340px] border border-rose-100/50 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-rose-500 text-3xl">favorite</span>
                                    <h4 className="font-extrabold text-slate-800 text-sm mt-1">Select your mating applicant</h4>
                                    <p className="text-slate-500 text-[10px] mt-0.5">Which of your pets would you like to match with <strong>{proposalTarget?.name}</strong>?</p>
                                </div>
                                
                                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                                    {compatiblePets.map(pet => (
                                        <button 
                                            key={pet.id}
                                            onClick={() => submitMatingProposal(pet.id)}
                                            disabled={submittingProposal}
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50 text-left transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <img src={pet.avatar_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'} className="w-8 h-8 rounded-full object-cover" />
                                                <div>
                                                    <div className="font-bold text-slate-800 text-xs">{pet.name}</div>
                                                    <div className="text-[9px] text-slate-500 font-semibold uppercase">{pet.gender} • {pet.breed || pet.species}</div>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-rose-400 text-[16px]">arrow_forward</span>
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="flex gap-2 mt-1">
                                    <button 
                                        onClick={() => { setShowProposalOverlay(false); setProposalTarget(null); }}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Chatbot;
