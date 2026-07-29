import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import BookingWidget from './BookingWidget';
import ChatMessageRenderer from './ChatMessageRenderer';
import toast from 'react-hot-toast';
import { mdToSafeHtml } from '../utils/miniMarkdown';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Sanitize any HTML that originates from the model or the database before it
// reaches the DOM. Preserves the interactive classes/attributes the chatbot
// relies on (bot-chip, bot-card-btn, propose-ai-match-btn, data-*), while
// stripping <script>, event handlers (onerror/onclick), and javascript: URIs.
// The structured /api/ai/chat path renders via React (ChatMessageRenderer) and
// does not use this; this guards only the legacy rich-HTML fallback paths.
const clean = (html) => DOMPurify.sanitize(html || '', { ADD_ATTR: ['target'] });

const ChatMessage = ({ msg, onHtmlClick, navigate, onProposeMatch, onQuickReply }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (msg.isUser) {
        return (
            <div className="message user-message">
                {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Attached" className="rounded-xl mb-1.5 max-w-[180px] max-h-[180px] object-cover border border-white/20" />
                )}
                {msg.text}
            </div>
        );
    }

    // Streaming indicator
    if (msg.isStreaming && !msg.text) {
        return (
            <div className="message bot-message">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold">VetAI is thinking...</span>
                </div>
            </div>
        );
    }

    // Structured blocks from the new /api/ai/chat endpoint
    if (msg.blocks && msg.blocks.length > 0) {
        return (
            <div className="w-full max-w-[95%] self-start space-y-2">
                <ChatMessageRenderer
                    blocks={msg.blocks}
                    lang={msg.lang || 'en'}
                    onNavigate={(route) => navigate(route)}
                    onProposeMatch={(pet) => onProposeMatch?.(pet.pet_id, pet.name, pet.species, pet.gender)}
                    onQuickReply={(text) => onQuickReply?.(text)}
                />
            </div>
        );
    }

    // Plain text (non-HTML) message — render minimal markdown (bold/links/bullets).
    if (!msg.isHtml) {
        return (
            <div className="message bot-message">
                <span className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToSafeHtml(msg.text) }} />
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
            <div className="w-full max-w-[98%] self-start"  style={{flexShrink: 0}}>
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
                    <p className="text-slate-700 text-sm leading-relaxed text-left" dangerouslySetInnerHTML={{ __html: clean(introText) }} />

                    {cardHtmls.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-2 justify-start items-stretch">
                            {cardHtmls.map((html, index) => (
                                <div
                                    key={index}
                                    dangerouslySetInnerHTML={{ __html: clean(html) }}
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
                    <div dangerouslySetInnerHTML={{ __html: clean(msg.text) }} className="prose prose-sm prose-slate max-w-none" />
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
                <p className="text-slate-700 text-sm leading-relaxed text-left" dangerouslySetInnerHTML={{ __html: clean(introText) }} />

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
                        dangerouslySetInnerHTML={{ __html: clean(cardHtml) }}
                        className="triage-action-card mt-1"
                    />
                )}
            </div>
        </div>
    );
};

// Persist the VetAI conversation across refreshes/navigation.
const CHAT_STORAGE_KEY = 'petpulse_vetai_chat_v1';
const loadSavedChat = () => {
    try {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && Array.isArray(parsed.messages) ? parsed : null;
    } catch { return null; }
};

// Contextual follow-up suggestions derived from the latest bot reply.
const followUpsFor = (msg) => {
    const lang = msg?.lang === 'ar' ? 'ar' : 'en';
    const L = (en, ar) => (lang === 'ar' ? ar : en);
    const types = (msg?.blocks || []).map(b => b.type);
    const txt = String(msg?.text || '').toLowerCase();
    if (types.includes('vet_list') || types.includes('vet_options') || types.includes('booking_confirmation'))
        return [L('Book another time', 'احجز موعدًا آخر'), L('What should I ask the vet?', 'ماذا أسأل الطبيب؟')];
    if (types.includes('adoption'))
        return [L('Show adoptable pets', 'حيوانات للتبني'), L('Adoption tips', 'نصائح التبني')];
    if (types.includes('mating_match'))
        return [L('Find more matches', 'مطابقات أخرى'), L('Mating safety tips', 'نصائح السلامة')];
    if (types.includes('medical_info') || /emergency|urgent|vet|symptom|🚨|⚠️/.test(txt))
        return [L('Find a vet near me', 'ابحث عن طبيب قريب'), L('Book an appointment', 'احجز موعدًا')];
    return [L('Book a vet', 'احجز مع طبيب'), L('Check symptoms', 'فحص الأعراض'), L('Vaccination schedule', 'جدول التطعيمات')];
};

const Chatbot = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        const s = loadSavedChat();
        return s?.messages?.length ? s.messages.map(m => ({ ...m, isStreaming: false })) : [];
    });
    const [input, setInput] = useState('');
    const [attachedImage, setAttachedImage] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [loading, setLoading] = useState(false);
    const { token, user, isFeatureLive } = useAuth();
    const messagesEndRef = useRef(null);
    const abortRef = useRef(null);
    const [sessionId, setSessionId] = useState(() => loadSavedChat()?.sessionId || null);
    // If we restored a prior conversation, don't replay the greeting.
    const [isFirstOpen, setIsFirstOpen] = useState(() => !(loadSavedChat()?.messages?.length));
    const navigate = useNavigate();
    const [isOverlayActive, setIsOverlayActive] = useState(false);
    const [isWizardActive, setIsWizardActive] = useState(false);
    
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

        const handleOpenChat = () => {
            setIsOpen(true);
        };

        window.addEventListener('open-chatbot-mating', handleOpenMatingChat);
        window.addEventListener('open-chatbot', handleOpenChat);
        return () => {
            window.removeEventListener('open-chatbot-mating', handleOpenMatingChat);
            window.removeEventListener('open-chatbot', handleOpenChat);
        };
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

        const checkWizardActive = () => {
            const hasWizard = document.querySelector('.wizard-active') !== null;
            setIsWizardActive(hasWizard);
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
                if (div.closest('.chatbot-container') || div.closest('.chatbot-window') || div.classList.contains('chatbot-backdrop')) {
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
        checkWizardActive();

        const observer = new MutationObserver(() => {
            checkOverlays();
            checkWizardActive();
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.removeEventListener('focus', handleFocus);
                input.removeEventListener('blur', handleBlur);
                input.addEventListener('focus', handleFocus);
                input.addEventListener('blur', handleBlur);
            });
        });
        observer.observe(document.body, { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            attributeFilter: ['class'] 
        });

        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', handleFocus);
            input.addEventListener('blur', handleBlur);
        });

        window.addEventListener('resize', () => {
            checkOverlays();
            checkWizardActive();
        });

        return () => {
            observer.disconnect();
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

    // Save the conversation so a refresh / navigation doesn't lose it.
    // NOTE: never write the guest temp-password card to disk — it's a one-time
    // onboarding artifact; keep it in the live session only.
    useEffect(() => {
        try {
            if (messages.length === 0) {
                localStorage.removeItem(CHAT_STORAGE_KEY);
                return;
            }
            const toSave = messages.slice(-60).map(m => {
                const clean = { ...m, isStreaming: false };
                if (Array.isArray(m.blocks)) clean.blocks = m.blocks.filter(b => b?.type !== 'account_created');
                return clean;
            });
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages: toSave, sessionId }));
        } catch { /* ignore storage quota / serialization errors */ }
    }, [messages, sessionId]);

    useEffect(() => {
        if (!(isOpen && isFirstOpen)) return;
        setIsFirstOpen(false);
        (async () => {
            await new Promise(r => setTimeout(r, 500));

            // Personalize for logged-in owners using their pets (name rendered as
            // plain text in the first bubble — never interpolated into HTML).
            const firstName = user?.first_name ? `, ${user.first_name}` : '';
            let petLine = '';
            if (user && token && !isWizardActive) {
                try {
                    const petsRes = await axios.get(`${API_BASE}/pets`, { headers: { Authorization: `Bearer ${token}` } });
                    const names = (petsRes.data?.pets || petsRes.data || []).map(p => p?.name).filter(Boolean);
                    if (names.length === 1) petLine = ` How is ${names[0]} doing today?`;
                    else if (names.length >= 2) petLine = ` How are ${names.slice(0, 2).join(' and ')} doing today?`;
                } catch { /* fall back to the generic greeting */ }
            }
            setMessages(prev => [...prev, { text: `Hello${firstName}! 🐱 I'm VetAI, your friendly PetPulse assistant.${petLine}`, isUser: false }]);

            await new Promise(r => setTimeout(r, 800));
            if (isWizardActive) {
                const isVet = user?.role === 'vet';
                setMessages(prev => [...prev, {
                    text: `I see you are setting up your professional profile wizard! I can help you write a compelling biography, choose clinical specialties, or outline your availability. What would you like help with?
                        <div class="flex flex-wrap gap-2 mt-3">
                            <button class="bot-chip">Help me write my bio 📝</button>
                            <button class="bot-chip">${isVet ? 'Suggest Vet Specialties 🏥' : 'Suggest Trainer Specialties 🐕'}</button>
                            <button class="bot-chip">Availability best practices ⏰</button>
                        </div>`,
                    isUser: false,
                    isHtml: true
                }]);
            } else {
                setMessages(prev => [...prev, {
                    text: `I can help you check pet symptoms, adopt a pet, or explore the community. How can I help today?
                        <div class="flex flex-wrap gap-2 mt-3">
                            ${isFeatureLive('vets') ? '<button class="bot-chip">Book a Vet</button>' : ''}
                            <button class="bot-chip">Check Symptoms</button>
                            <button class="bot-chip">Adopt a Pet</button>
                        </div>`,
                    isUser: false,
                    isHtml: true
                }]);
            }
        })();
    }, [isOpen, isFirstOpen, isWizardActive, user, token]);

    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
        setInput('');
        setIsFirstOpen(true); // re-triggers the greeting since the window is open
        try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
    };

    const handleFeedback = async (idx, rating, excerpt) => {
        setMessages(prev => prev.map((m, i) => i === idx ? { ...m, feedback: rating } : m));
        try {
            await axios.post(`${API_BASE}/ai/feedback`, { sessionId, rating, excerpt: String(excerpt || '').replace(/<[^>]+>/g, '').slice(0, 300) },
                { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        } catch { /* best-effort — UI already reflects the choice */ }
    };

    const handleImageAttach = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image is too large (max 5MB).'); return; }
        setUploadingImage(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', 'PetPulse');
            fd.append('folder', 'petpulse/symptoms');
            const res = await axios.post(`${API_BASE}/upload/cloudinary`, fd, {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'multipart/form-data' },
            });
            if (res.data?.secure_url) setAttachedImage(res.data.secure_url);
            else throw new Error('no url');
        } catch (err) {
            console.error('Symptom photo upload failed', err);
            toast.error('Could not upload the photo. Please try again.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSend = async (textToSend) => {
        const text = textToSend || input.trim();
        const img = attachedImage;
        if (!text && !img) return;

        // Keep the conversation's language stable: a bare Latin reply ("cici") inside
        // an Arabic chat must not flip the cards/chrome to English. Inherit the last
        // bot language when the current message carries no Arabic signal.
        const prevLang = [...messages].reverse().find(m => !m.isUser && m.lang)?.lang;
        const lang = /[؀-ۿ]/.test(text) ? 'ar' : (prevLang || 'en');

        setMessages(prev => [...prev, { text, isUser: true, imageUrl: img || undefined }]);
        setInput('');
        setAttachedImage(null);
        setLoading(true);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Try new agentic chat endpoint with SSE streaming
            const controller = new AbortController();
            abortRef.current = controller;
            const chatRes = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { ...headers, 'Accept': 'text/event-stream' },
                body: JSON.stringify({ message: text || 'Please take a look at this photo of my pet.', sessionId, image_url: img || undefined }),
                signal: controller.signal,
            });

            if (chatRes.ok && chatRes.headers.get('content-type')?.includes('text/event-stream')) {
                // SSE streaming response
                const reader = chatRes.body.getReader();
                const decoder = new TextDecoder();
                let streamedText = '';
                let structuredBlocks = null;
                const streamMsgId = Date.now();

                // Add an empty bot message to stream into
                setMessages(prev => [...prev, { id: streamMsgId, text: '', isUser: false, isStreaming: true, lang }]);

                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const event = JSON.parse(line.slice(6));

                            if (event.type === 'session') {
                                setSessionId(event.sessionId);
                            } else if (event.type === 'token') {
                                streamedText += event.content;
                                setMessages(prev => prev.map(m =>
                                    m.id === streamMsgId ? { ...m, text: streamedText } : m
                                ));
                            } else if (event.type === 'done' && event.response?.blocks) {
                                structuredBlocks = event.response.blocks;
                            }
                        } catch (e) { /* skip malformed events */ }
                    }
                }

                // Replace streaming message with final structured response
                if (structuredBlocks && structuredBlocks.length > 0) {
                    setMessages(prev => prev.map(m =>
                        m.id === streamMsgId
                            ? { ...m, text: streamedText, isStreaming: false, blocks: structuredBlocks }
                            : m
                    ));
                } else {
                    setMessages(prev => prev.map(m =>
                        m.id === streamMsgId ? { ...m, isStreaming: false } : m
                    ));
                }
            } else if (chatRes.ok) {
                // JSON response (non-streaming fallback)
                const data = await chatRes.json();
                if (data.sessionId) setSessionId(data.sessionId);

                if (data.response?.blocks?.length > 0) {
                    setMessages(prev => [...prev, {
                        text: data.text || '',
                        isUser: false,
                        blocks: data.response.blocks,
                        lang,
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        text: data.text || "I've processed your request.",
                        isUser: false,
                    }]);
                }
            } else if (chatRes.status === 429) {
                // Rate limited — surface the message, do NOT fall back (that would
                // bypass the limit and hit the weaker legacy agent).
                let msg = "You're sending messages too fast. Please wait a moment and try again.";
                try { const d = await chatRes.json(); if (d?.error) msg = d.error; } catch { /* keep default */ }
                setMessages(prev => [...prev, { text: msg, isUser: false }]);
            } else {
                // New endpoint failed — fall back to legacy /ai/triage
                const res = await axios.post(`${API_BASE}/ai/triage`, {
                    symptoms: text, petId: null, userLocation: 'Unknown'
                }, { headers });

                setMessages(prev => [...prev, {
                    text: res.data.triage_result || res.data.message || "I've processed your request.",
                    isUser: false,
                    isHtml: true
                }]);
            }
        } catch (error) {
            if (error?.name === 'AbortError') {
                // User stopped generation — mark any in-flight streamed bubble done.
                setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false, text: m.text || '(stopped)' } : m));
            } else {
                console.error(error);
                // Finalize/drop any empty streaming placeholder so it can't spin forever.
                setMessages(prev => [
                    ...prev.filter(m => !(m.isStreaming && !m.text)).map(m => m.isStreaming ? { ...m, isStreaming: false } : m),
                    { text: "Sorry, there was an error connecting to my AI brain.", isUser: false },
                ]);
            }
        } finally {
            setLoading(false);
            abortRef.current = null;
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
                (p.species || '').toLowerCase() === targetSpecLower
            );
            
            if (list.length === 0) {
                toast.error(`You don't have any registered pets compatible with ${targetName} (${targetSpecLower}). Please register one first!`);
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
        <>
            {/* Backdrop for Mobile view to prevent background disruption */}
            {isOpen && (
                <div 
                    className="chatbot-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[9998] md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}
            
            <div className={`fixed bottom-[76px] right-4 md:bottom-5 md:right-5 z-[9999] chatbot-container ${(isOverlayActive || (isWizardActive && !isOpen)) ? 'hidden md:block' : ''}`}>
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
                        aria-label="Open VetAI assistant"
                        className="group relative z-10 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-full shadow-[0_8px_30px_rgb(0,93,167,0.3)] hover:shadow-[0_12px_40px_rgb(0,93,167,0.4)] hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                        <span className="material-symbols-outlined text-[28px] sm:text-[32px] group-hover:rotate-12 transition-transform">smart_toy</span>
                    </button>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div role="dialog" aria-modal="true" aria-label="VetAI assistant" className="w-[calc(100vw-32px)] h-[80vh] sm:w-[420px] sm:h-[650px] max-w-[420px] max-h-[800px] bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100/50 mt-3 transform origin-bottom-right transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in zoom-in-95 ease-out">
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
                        <div className="flex items-center gap-1">
                            <button onClick={handleNewChat} title="Start a new chat" aria-label="Start a new chat" className="text-white/80 hover:text-white hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-all">
                                <span className="material-symbols-outlined">edit_square</span>
                            </button>
                            <button onClick={() => setIsOpen(false)} aria-label="Minimize chat" className="text-white/80 hover:text-white hover:bg-white/10 w-10 h-10 flex items-center justify-center rounded-full transition-all">
                                <span className="material-symbols-outlined">expand_more</span>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div role="log" aria-live="polite" aria-label="Conversation with VetAI" className="flex-1 p-5 overflow-y-auto chat-scroll bg-slate-50/50 flex flex-col gap-5" onClick={handleHtmlClick}>
                        <div className="text-center mt-2 mb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Today</span>
                        </div>
                        
                        {messages.map((msg, idx) => (
                            <div key={idx} className="flex flex-col">
                                <ChatMessage
                                    msg={msg}
                                    onHtmlClick={handleHtmlClick}
                                    navigate={navigate}
                                    onProposeMatch={handleProposeMatch}
                                    onQuickReply={(text) => handleSend(text)}
                                />
                                {!msg.isUser && msg.text && String(msg.text).replace(/<[^>]+>/g, '').trim() && !msg.isStreaming && (
                                    <div className="flex items-center gap-1 mt-1 ml-1">
                                        <button
                                            onClick={() => { navigator.clipboard?.writeText(String(msg.text).replace(/<[^>]+>/g, '')); toast.success('Copied'); }}
                                            aria-label="Copy reply"
                                            title="Copy"
                                            className="text-slate-400 hover:text-slate-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(idx, 1, msg.text)}
                                            aria-label="Helpful"
                                            title="Helpful"
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors ${msg.feedback === 1 ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(idx, -1, msg.text)}
                                            aria-label="Not helpful"
                                            title="Not helpful"
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors ${msg.feedback === -1 ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                                        </button>
                                    </div>
                                )}
                                {/* Contextual follow-up chips under the latest bot reply */}
                                {!msg.isUser && !msg.isStreaming && idx === messages.length - 1 && !loading && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                                        {followUpsFor(msg).filter(s => isFeatureLive('vets') || !/(vet|book|appointment|طبيب|احجز|موعد)/i.test(s)).map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSend(s)}
                                                className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold transition-colors"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
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
                        {attachedImage && (
                            <div className="mb-2 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 w-fit">
                                <img src={attachedImage} alt="Attached" className="w-12 h-12 rounded-lg object-cover" />
                                <span className="text-[11px] text-slate-500 font-semibold">Photo attached</span>
                                <button type="button" onClick={() => setAttachedImage(null)} aria-label="Remove photo" className="w-6 h-6 rounded-full bg-slate-200 hover:bg-red-500 hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            </div>
                        )}
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
                            <input id="vetai-photo-input" type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
                            <button
                                type="button"
                                onClick={() => document.getElementById('vetai-photo-input')?.click()}
                                disabled={loading || uploadingImage}
                                title="Attach a photo"
                                aria-label="Attach a photo"
                                className="absolute left-2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 rounded-full transition-colors disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined text-[22px] ${uploadingImage ? 'animate-spin' : ''}`}>{uploadingImage ? 'progress_activity' : 'add_a_photo'}</span>
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask VetAI anything..."
                                className="w-full pl-12 pr-14 py-3.5 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[20px] text-sm transition-all shadow-inner"
                                disabled={loading}
                            />
                            {loading ? (
                                <button
                                    type="button"
                                    onClick={() => abortRef.current?.abort()}
                                    aria-label="Stop generating"
                                    title="Stop generating"
                                    className="absolute right-2 w-10 h-10 flex items-center justify-center bg-slate-700 text-white rounded-full hover:bg-slate-800 transition-colors shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[20px]">stop</span>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={(!input.trim() && !attachedImage) || uploadingImage}
                                    aria-label="Send message"
                                    className="absolute right-2 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[20px] ml-0.5 mt-0.5">send</span>
                                </button>
                            )}
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
        </>
    );
};

export default Chatbot;
