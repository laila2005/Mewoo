import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import PremiumBadge from '../components/common/PremiumBadge';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const CATEGORIES = ['All', 'Food & Treats', 'Toys & Play', 'Grooming', 'Health & Wellness', 'Accessories', 'Beds & Furniture'];

const Messages = () => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [activeReactionMenuId, setActiveReactionMenuId] = useState(null);
  const [showExpandedPicker, setShowExpandedPicker] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentChatRef = useRef(currentChat);
  const isSocketConnectedRef = useRef(isSocketConnected);

  useEffect(() => {
    isSocketConnectedRef.current = isSocketConnected;
  }, [isSocketConnected]);

  const location = useLocation();
  const navigate = useNavigate();
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [initialHeight, setInitialHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        const kHeight = Math.max(0, window.innerHeight - window.visualViewport.height);
        setKeyboardHeight(kHeight);
      } else {
        setViewportHeight(window.innerHeight);
        setKeyboardHeight(0);
      }
    };

    setInitialHeight(window.innerHeight);
    handleResize();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    // Lock page scrolling to prevent browser viewport shifts on focus
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalBodyPosition = document.body.style.position;
    const originalHtmlPosition = document.documentElement.style.position;
    const originalBodyWidth = document.body.style.width;
    const originalHtmlWidth = document.documentElement.style.width;
    
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.documentElement.style.position = 'fixed';
    document.documentElement.style.width = '100%';
    
    const handleScroll = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
      document.documentElement.style.position = originalHtmlPosition;
      document.documentElement.style.width = originalHtmlWidth;
      
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleInputFocus = () => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    });
  };

  useEffect(() => {
    currentChatRef.current = currentChat;
    setIsPartnerTyping(false);
  }, [currentChat]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeReactionMenuId && !e.target.closest('.emoji-picker-container')) {
        setActiveReactionMenuId(null);
        setShowExpandedPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeReactionMenuId]);

  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-100 text-blue-900 font-bold rounded-sm px-0.5">{part}</mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  useEffect(() => {
    if (location.state?.chatUser) {
      const u = location.state.chatUser;
      const chatUserObj = {
        id: u.id,
        name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
        avatar: u.avatar || u.profile_pic_url || '',
        role: u.role
      };
      setCurrentChat(chatUserObj);
      
      if (location.state?.initialMessage) {
        setMessageText(location.state.initialMessage);
      }
      
      // Clean up the location state so a page refresh doesn't reopen the chat automatically
      navigate(location.pathname, { replace: true, state: {} });
      
      // Attempt to load previous messages if it's a real user ID
      if (!String(u.id).startsWith('mock-')) {
          fetch(`${API_BASE}/messages/${u.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(data => setMessages(data.messages || []))
          .catch(e => console.error("Could not load messages:", e));
      } else {
          setMessages([]);
      }
    } else {
      const searchParams = new URLSearchParams(location.search);
      const userIdQuery = searchParams.get('user') || searchParams.get('userId');
      if (userIdQuery && token) {
        // Fetch user info from backend
        fetch(`${API_BASE}/users/${userIdQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('User not found');
        })
        .then(data => {
          const u = data.user;
          if (u) {
            const chatUserObj = {
              id: u.id,
              name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
              avatar: u.profile_pic_url || '',
              role: u.role
            };
            setCurrentChat(chatUserObj);
            
            // Clean up the URL search params so refresh doesn't trigger fetch again
            navigate(location.pathname, { replace: true, state: {} });

            // Load messages
            fetch(`${API_BASE}/messages/${u.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(resData => setMessages(resData.messages || []))
            .catch(e => console.error("Could not load messages:", e));
          }
        })
        .catch(e => console.error("Could not load queried user details:", e));
      }
    }
  }, [location.state, location.search, token]);

  useEffect(() => {
    loadConversations();
    loadRequests();
  }, []);

  useEffect(() => {
    if (!token) return;
    
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
    const socket = io(socketUrl, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('connect_error', () => {
      setIsSocketConnected(false);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users.map(u => String(u).toLowerCase()));
    });

    socket.on('user_status_change', ({ user_id, status }) => {
      const idStr = String(user_id).toLowerCase();
      setOnlineUsers(prev => {
        if (status === 'online') {
          return Array.from(new Set([...prev, idStr]));
        } else {
          return prev.filter(id => id !== idStr);
        }
      });
    });

    socket.on('user_typing', ({ user_id }) => {
      if (currentChatRef.current && String(currentChatRef.current.id) === String(user_id)) {
        setIsPartnerTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ user_id }) => {
      if (currentChatRef.current && String(currentChatRef.current.id) === String(user_id)) {
        setIsPartnerTyping(false);
      }
    });

    socket.on('receive_message', (msg) => {
      if (currentChatRef.current) {
        const isFromPartner = String(currentChatRef.current.id) === String(msg.sender_id);
        const isToPartnerFromMe = String(currentChatRef.current.id) === String(msg.receiver_id) && String(msg.sender_id) === String(user?.id);
        if (isFromPartner || isToPartnerFromMe) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }
      loadConversations();
    });

    socket.on('message_reaction', ({ message_id, reactions }) => {
      if (currentChatRef.current) {
        setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions } : m));
      }
    });

    socket.on('chat_request_accepted', ({ receiver_name, message }) => {
      toast.success(message || `${receiver_name} accepted your chat request!`);
      loadConversations();
    });

    socket.on('chat_request_received', (data) => {
      toast.success(data.message || 'You have a new connection request!', { icon: '🤝' });
      loadRequests();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, keyboardHeight]);

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) { console.error(e); }
  };

  const loadRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (partnerId) => {
    if (!partnerId || String(partnerId).startsWith('mock-')) return;
    try {
      const res = await fetch(`${API_BASE}/messages/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
          const newMsgs = data.messages || [];
          if (prev.length !== newMsgs.length) {
            return newMsgs;
          }
          let hasDiff = false;
          for (let i = 0; i < prev.length; i++) {
            if (prev[i].id !== newMsgs[i].id || 
                prev[i].content !== newMsgs[i].content || 
                JSON.stringify(prev[i].reactions) !== JSON.stringify(newMsgs[i].reactions)) {
              hasDiff = true;
              break;
            }
          }
          return hasDiff ? newMsgs : prev;
        });
      }
    } catch (e) { console.error("Poll messages error:", e); }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/online`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers((data.onlineUsers || []).map(u => String(u).toLowerCase()));
      }
    } catch (e) { console.error("Error fetching online users:", e); }
  };

  // Hybrid Polling Fallback Effect
  useEffect(() => {
    if (!token) return;

    // Always fetch online users on mount/status updates to ensure UI is perfectly synced
    fetchOnlineUsers();

    const pollInterval = setInterval(() => {
      if (!isSocketConnectedRef.current) {
        loadConversations();
        loadRequests();
      }
    }, 5000);

    const activeChatInterval = setInterval(() => {
      if (!isSocketConnectedRef.current && currentChatRef.current) {
        fetchMessages(currentChatRef.current.id);
      }
    }, 2500);

    // Unconditionally poll online users to heal any missing socket events
    const onlineUsersInterval = setInterval(() => {
      fetchOnlineUsers();
    }, 15000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(activeChatInterval);
      clearInterval(onlineUsersInterval);
    };
  }, [token]);

  const openChat = async (partnerId, name, avatar, active_subscription_plan_id = null, active_subscription_plan_name = null) => {
    setCurrentChat({ id: partnerId, name, avatar, active_subscription_plan_id, active_subscription_plan_name });
    try {
      const res = await fetch(`${API_BASE}/messages/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    
    if (!socketRef.current || !currentChat) return;
    
    socketRef.current.emit('typing', { receiver_id: currentChat.id });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && currentChat) {
        socketRef.current.emit('stop_typing', { receiver_id: currentChat.id });
      }
    }, 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !currentChat) return;

    if (String(currentChat.id).startsWith('mock-')) {
        setMessages(prev => [...prev, {
            sender_id: user?.id,
            content: messageText,
            created_at: new Date().toISOString()
        }]);
        setMessageText('');
        toast.success("Message sent!");
        return;
    }

    try {
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: currentChat.id, content: messageText })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setMessageText('');
        loadConversations();
      }
    } catch (e) { console.error(e); }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m));
        setActiveReactionMenuId(null);
        setShowExpandedPicker(false);
      }
    } catch (e) {
      console.error("Error toggling reaction:", e);
    }
  };

  const getUniqueReactions = (reactions) => {
    if (!reactions || !Array.isArray(reactions)) return [];
    const counts = {};
    reactions.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return Object.keys(counts).map(emoji => ({
      emoji,
      count: counts[emoji],
      users: reactions.filter(r => r.emoji === emoji).map(r => r.user_id)
    }));
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const res = await fetch(`${API_BASE}/users/search/all?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
        setShowSearch(true);
      }
    } catch (e) { console.error(e); }
  };

  const sendChatRequest = async (receiverId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: receiverId })
      });
      if (res.ok) {
        toast.success('Chat request sent!');
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to send request');
      }
    } catch (e) { toast.error('Error sending request'); }
  };

  const acceptRequest = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/chat/request/${id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { toast.success('Request accepted!'); loadRequests(); loadConversations(); }
    } catch (e) { console.error(e); }
  };

  const declineRequest = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/chat/request/${id}/ignore`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { 
        toast.success('Connection request declined'); 
        loadRequests(); 
        loadConversations();
        setCurrentChat(null);
      }
    } catch (e) { console.error(e); }
  };

  const spamUser = async (partnerId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/spam`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: partnerId })
      });
      if (res.ok) {
        toast.success('Reported as spam');
        setCurrentChat(null);
        loadRequests();
        loadConversations();
      }
    } catch (e) { console.error(e); }
  };

  const unspamUser = async (partnerId) => {
    try {
      const res = await fetch(`${API_BASE}/chat/unspam`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: partnerId })
      });
      if (res.ok) {
        toast.success('Conversation marked as safe');
        loadConversations();
      }
    } catch (e) { console.error(e); }
  };

  const renderContent = () => {
    const filteredConversations = conversations.filter(c => activeFolder === 'spam' ? c.is_spam : !c.is_spam);
    const navHeight = window.innerWidth < 640 ? 56 : 64;
    return (
      <div 
        className="flex bg-slate-50 overflow-hidden animate-fade-in-up"
        style={
          isMobile
            ? {
                position: 'fixed',
                top: `${navHeight}px`,
                left: 0,
                right: 0,
                bottom: 0,
                height: `${viewportHeight - navHeight}px`,
                zIndex: 40
              }
            : {
                height: 'calc(100vh - 96px)'
              }
        }
      >
      {/* SIDEBAR */}
      <div className={`w-full md:w-[340px] border-r border-slate-200 flex flex-col bg-white shrink-0 ${currentChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h2 className="text-xl font-bold text-slate-800">Messages</h2>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 relative">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Find users to message..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-64 overflow-y-auto divide-y divide-slate-50">
              {searchResults.map(u => {
                const existingConvo = conversations.find(c => c.partner_id === u.id);
                return (
                  <div 
                    key={u.id} 
                    onClick={() => {
                      if (existingConvo) {
                        openChat(u.id, `${u.first_name} ${u.last_name}`, u.profile_pic_url, u.active_subscription_plan_id, u.active_subscription_plan_name);
                        setSearchQuery('');
                        setShowSearch(false);
                      }
                    }}
                    className={`flex items-center justify-between p-3 transition-colors ${existingConvo ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={u.profile_pic_url || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=f1f5f9`} className="w-8 h-8 rounded-full object-cover" alt={u.first_name} />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-slate-800">{highlightText(`${u.first_name} ${u.last_name}`, searchQuery)}</p>
                          <PremiumBadge active_subscription_plan_id={u.active_subscription_plan_id} active_subscription_plan_name={u.active_subscription_plan_name} />
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">{u.role}{u.email && ` • ${u.email}`}</p>
                      </div>
                    </div>
                    {existingConvo ? (
                      <span className="material-symbols-outlined text-blue-500 text-[20px]" title="Open Chat">forum</span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); sendChatRequest(u.id); }} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all" title="Send Request">
                        <span className="material-symbols-outlined text-[16px]">chat_add_on</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Folder Tabs */}
        <div className="flex px-4 py-2.5 bg-slate-50 border-b border-slate-100 gap-2 justify-start shrink-0">
          <button
            onClick={() => setActiveFolder('inbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-300 ${
              activeFolder === 'inbox'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] font-bold">inbox</span>
            <span>Inbox</span>
            {conversations.filter(c => !c.is_spam && c.unread_count > 0).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveFolder('spam')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-300 ${
              activeFolder === 'spam'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] font-bold">report</span>
            <span>Spam</span>
            {conversations.filter(c => c.is_spam).length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                {conversations.filter(c => c.is_spam).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Requests */}
          {activeFolder === 'inbox' && requests.length > 0 && (
            <div>
              <div className="px-4 py-2.5 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider">Pending Requests</span>
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{requests.length}</span>
              </div>
              {requests.map(r => {
                const fullName = `${r.first_name} ${r.last_name}`;
                const avatarUrl = r.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=dbeafe&color=1d4ed8`;
                return (
                  <div 
                    key={r.id}
                    onClick={() => openChat(r.sender_id, fullName, r.profile_pic_url, r.active_subscription_plan_id, r.active_subscription_plan_name)}
                    className={`p-4 flex items-center gap-3 border-b border-slate-100 cursor-pointer transition-all duration-300 hover-glow text-left ${currentChat?.id === r.sender_id ? 'bg-blue-50/80 border-l-2 border-l-blue-600' : 'bg-blue-50/30 hover:bg-blue-50/60'}`}
                  >
                    <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover border border-blue-100 shadow-sm" alt={fullName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-sm text-slate-900 truncate">{fullName}</p>
                        <PremiumBadge active_subscription_plan_id={r.active_subscription_plan_id} active_subscription_plan_name={r.active_subscription_plan_name} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">Wants to connect</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => acceptRequest(r.id)} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all text-xs shadow-md shadow-blue-500/20" title="Accept Request">
                        <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                      </button>
                      <button onClick={() => declineRequest(r.id)} className="w-8 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-full flex items-center justify-center active:scale-95 transition-all text-xs" title="Decline Request">
                        <span className="material-symbols-outlined text-[15px] font-bold">close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Conversations */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-left">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              {activeFolder === 'spam' ? 'Spam Conversations' : 'Recent Conversations'}
            </span>
          </div>
          {filteredConversations.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-2 opacity-30 block">
                {activeFolder === 'spam' ? 'mark_email_read' : 'forum'}
              </span>
              <p className="text-sm font-semibold">{activeFolder === 'spam' ? 'Spam folder is clean!' : 'No conversations yet.'}</p>
              <p className="text-xs text-slate-400/80 mt-1 max-w-[200px] mx-auto">
                {activeFolder === 'spam' ? 'Chats you report as spam will be sequestered here.' : 'Start a chat by searching for connections.'}
              </p>
            </div>
          ) : (
            filteredConversations.map(c => (
              <div
                key={c.partner_id}
                onClick={() => openChat(c.partner_id, `${c.first_name} ${c.last_name}`, c.profile_pic_url, c.active_subscription_plan_id, c.active_subscription_plan_name)}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 hover-glow transition-all duration-300 text-left ${currentChat?.id === c.partner_id ? 'bg-blue-50 border-l-2 border-l-blue-600 active-pulse' : ''}`}
              >
                <div className="relative">
                  <img src={c.profile_pic_url || `https://ui-avatars.com/api/?name=${c.first_name}+${c.last_name}&background=dbeafe&color=1d4ed8`} className="w-12 h-12 rounded-full object-cover" alt={c.first_name} />
                  {c.unread_count > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></span>}
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${onlineUsers.includes(String(c.partner_id).toLowerCase()) ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                      <h4 className={`font-bold text-sm truncate ${c.unread_count > 0 ? 'text-blue-700' : 'text-slate-900'}`}>{highlightText(`${c.first_name} ${c.last_name}`, searchQuery)}</h4>
                      <PremiumBadge active_subscription_plan_id={c.active_subscription_plan_id} active_subscription_plan_name={c.active_subscription_plan_name} />
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{new Date(c.last_message_time).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-xs truncate ${c.unread_count > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{c.last_message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN CHAT */}
      <div className={`flex-1 flex flex-col relative ${!currentChat ? 'hidden md:flex' : 'flex animate-slide-in-chat md:animate-none'}`}>
        {!currentChat ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <span className="material-symbols-outlined text-5xl text-blue-500">chat</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Your Messages</h3>
            <p className="text-slate-500 text-center max-w-sm">Select a conversation or accept a pending request to start chatting.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm">
              <div className="flex items-center gap-4 text-left">
                <button 
                  onClick={() => setCurrentChat(null)} 
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-1"
                >
                  <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <img src={currentChat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentChat.name)}&background=dbeafe&color=1d4ed8`} className="w-11 h-11 rounded-full object-cover border border-slate-200" alt={currentChat.name} />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-slate-900">{currentChat.name}</h3>
                    <PremiumBadge active_subscription_plan_id={currentChat.active_subscription_plan_id} active_subscription_plan_name={currentChat.active_subscription_plan_name} />
                  </div>
                  {isPartnerTyping ? (
                    <p className="text-xs text-blue-600 font-semibold flex items-center gap-1.5 animate-pulse">
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                      typing...
                    </p>
                  ) : (
                    <p className={`text-xs font-medium flex items-center gap-1 ${onlineUsers.includes(String(currentChat.id).toLowerCase()) ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${onlineUsers.includes(String(currentChat.id).toLowerCase()) ? 'bg-emerald-500' : 'bg-red-500'}`}></span> 
                      {onlineUsers.includes(String(currentChat.id).toLowerCase()) ? 'Online' : 'Offline'}
                    </p>
                  )}
                </div>
              </div>

              {/* Shield Control Actions */}
              <div className="flex items-center gap-2">
                {(() => {
                  const convo = conversations.find(c => String(c.partner_id) === String(currentChat.id));
                  const isSpam = convo ? convo.is_spam : false;
                  
                  if (isSpam) {
                    return (
                      <button
                        onClick={() => unspamUser(currentChat.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                        title="Mark Conversation Safe"
                      >
                        <span className="material-symbols-outlined text-[16px] font-bold">verified_user</span>
                        <span className="hidden sm:inline">Mark Safe</span>
                      </button>
                    );
                  } else {
                    return (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to report ${currentChat.name} as spam? This will move their messages to the Spam Folder.`)) {
                            spamUser(currentChat.id);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                        title="Report Contact as Spam"
                      >
                        <span className="material-symbols-outlined text-[16px] text-amber-600 font-bold">security</span>
                        <span className="hidden sm:inline">Report Spam</span>
                      </button>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Connection Request Banner Overlay */}
            {(() => {
              const pendingRequest = requests.find(r => String(r.sender_id) === String(currentChat?.id) && r.status === 'pending');
              if (!pendingRequest) return null;
              return (
                <div className="bg-gradient-to-r from-blue-50/95 to-indigo-50/95 backdrop-blur-sm border-b border-blue-100/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm relative z-20">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{currentChat.name} sent you a connection request</h4>
                      <p className="text-xs text-slate-500">Accepting lets you exchange messages instantly and adds them to your network.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button 
                      onClick={() => acceptRequest(pendingRequest.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xs font-bold">check</span>
                      <span>Accept</span>
                    </button>
                    <button 
                      onClick={() => declineRequest(pendingRequest.id)}
                      className="bg-white hover:bg-slate-50 text-rose-600 border border-slate-200 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xs font-bold">close</span>
                      <span>Decline</span>
                    </button>
                    <button 
                      onClick={() => spamUser(currentChat.id)}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1 transition-all active:scale-95"
                      title="Mark as Spam"
                    >
                      <span className="material-symbols-outlined text-xs font-bold">report</span>
                      <span>Spam</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-slate-50"
              style={{
                paddingBottom: isMobile ? '16px' : '24px'
              }}
            >
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No messages yet. Say hello! 👋</div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1 animate-message-pop relative group mb-3`}>
                      <div className={`flex items-center gap-2 max-w-[70%] relative ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Message Bubble */}
                        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300 ${isMine ? 'bg-blue-600 text-white rounded-br-sm hover:bg-blue-700' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100 hover:bg-slate-50'}`}>
                          {msg.content}
                          <div className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>

                          {/* Reactions Pill Overlay */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div 
                              onClick={() => {
                                const mine = msg.reactions.find(r => r.user_id === user?.id);
                                if (mine) {
                                  handleReaction(msg.id, mine.emoji);
                                } else {
                                  setActiveReactionMenuId(msg.id);
                                }
                              }}
                              className={`absolute flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 ${isMine ? 'bottom-[-10px] left-3' : 'bottom-[-10px] right-3'} z-20`}
                              title={msg.reactions.map(r => r.user_id === user?.id ? 'You' : 'Partner').join(', ')}
                            >
                              {getUniqueReactions(msg.reactions).map((ur, idx) => (
                                <span key={idx} className="flex items-center gap-0.5">
                                  <span>{ur.emoji}</span>
                                  {ur.count > 1 && <span className="text-[10px] text-slate-400 font-bold">{ur.count}</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Reaction Button Trigger */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                          <button
                            onClick={() => {
                              setActiveReactionMenuId(msg.id);
                              setShowExpandedPicker(false);
                            }}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                            title="Add reaction"
                          >
                            <span className="material-symbols-outlined text-[18px]">sentiment_satisfied</span>
                          </button>
                        </div>

                        {/* WhatsApp floaty reaction picker popover */}
                        {activeReactionMenuId === msg.id && (
                          <div className={`emoji-picker-container absolute z-30 flex flex-col gap-1.5 shadow-xl bg-white border border-slate-200 rounded-2xl p-2 animate-message-pop max-w-[280px] sm:max-w-xs ${isMine ? 'right-0 top-[-48px] sm:top-[-48px]' : 'left-0 top-[-48px] sm:top-[-48px]'}`}>
                            <div className="flex items-center gap-1.5">
                              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => {
                                const isSelected = msg.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id, emoji)}
                                    className={`text-lg hover:scale-135 transition-transform duration-200 p-1 rounded-lg ${isSelected ? 'bg-blue-50 border border-blue-200/50' : 'hover:bg-slate-50'}`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                              
                              <button
                                onClick={() => setShowExpandedPicker(prev => !prev)}
                                className={`text-slate-400 hover:text-blue-500 hover:scale-115 transition-all p-1 flex items-center justify-center rounded-lg ${showExpandedPicker ? 'text-blue-500 bg-blue-50' : ''}`}
                                title="More emojis"
                              >
                                <span className="material-symbols-outlined text-[20px] font-bold">add</span>
                              </button>
                            </div>

                            {/* Expanded picker grid */}
                            {showExpandedPicker && (
                              <div className="grid grid-cols-6 gap-1 bg-slate-50 rounded-xl p-1.5 border border-slate-100 max-h-36 overflow-y-auto">
                                {[
                                  '🐶', '🐱', '🐭', '🐰', '🦊', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🐺', '🦄', '🐴',
                                  '🔥', '🎉', '💯', '👏', '🙌', '✨', '🌟', '💡', '😡', '🤔', '🤫', '🙄', '😎', '💩', '🤡', '💔'
                                ].map(emoji => {
                                  const isSelected = msg.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji);
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.id, emoji)}
                                      className={`text-base hover:scale-135 transition-transform duration-200 p-1 flex items-center justify-center rounded-lg ${isSelected ? 'bg-blue-100 border border-blue-300/40' : 'hover:bg-white hover:shadow-sm'}`}
                                    >
                                      {emoji}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {isPartnerTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-1.5">
                    <span className="flex gap-1 items-center py-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            {(() => {
              const convo = conversations.find(c => String(c.partner_id) === String(currentChat.id));
              const isSpam = convo ? convo.is_spam : false;
              
              if (isSpam) {
                return (
                  <div className="p-5 bg-amber-50/75 backdrop-blur-sm border-t border-amber-200 shrink-0 text-center flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
                      <p className="text-sm font-semibold text-amber-800 text-left">
                        This conversation is in your Spam folder. You must mark it safe to resume messaging.
                      </p>
                    </div>
                    <button
                      onClick={() => unspamUser(currentChat.id)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-amber-500/25 shrink-0"
                    >
                      Mark as Safe
                    </button>
                  </div>
                );
              }
              
              return (
                <div className="p-4 bg-white border-t border-slate-200 shrink-0 z-10">
                  <form onSubmit={sendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                    <div className="flex-1 bg-slate-100 rounded-2xl flex items-center pr-2 relative border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                      <input
                        type="text"
                        value={messageText}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        placeholder="Type a message..."
                        className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-4 text-slate-800 placeholder-slate-400 outline-none"
                      />
                      <button type="submit" className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
  };

  try {
    return renderContent();
  } catch (error) {
    return (
      <div className="p-8 m-8 bg-red-50 border border-red-200 text-red-600 rounded-xl">
        <h2 className="text-lg font-bold mb-2">Message Page Error</h2>
        <pre className="text-xs overflow-auto">{error.stack || error.message}</pre>
      </div>
    );
  }
};

export default Messages;
