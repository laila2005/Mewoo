import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

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
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentChatRef = useRef(currentChat);
  const location = useLocation();

  useEffect(() => {
    currentChatRef.current = currentChat;
    setIsPartnerTyping(false);
  }, [currentChat]);

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
      setCurrentChat(u);
      
      if (location.state?.initialMessage) {
        setMessageText(location.state.initialMessage);
      }
      
      // Clean up the location state so a page refresh doesn't reopen the chat automatically
      window.history.replaceState({}, document.title);
      
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
    }
  }, [location.state, token]);

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

    socket.on('online_users', (users) => {
      setOnlineUsers(users.map(String));
    });

    socket.on('user_status_change', ({ user_id, status }) => {
      const idStr = String(user_id);
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
      if (currentChatRef.current && String(currentChatRef.current.id) === String(msg.sender_id)) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      loadConversations();
    });

    socket.on('chat_request_accepted', ({ receiver_name, message }) => {
      toast.success(message || `${receiver_name} accepted your chat request!`);
      loadConversations();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const openChat = async (partnerId, name, avatar) => {
    setCurrentChat({ id: partnerId, name, avatar });
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

  const renderContent = () => (
    <div className="flex h-[calc(100vh-80px)] sm:h-[calc(100vh-96px)] bg-slate-50 overflow-hidden animate-fade-in-up">
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
                        openChat(u.id, `${u.first_name} ${u.last_name}`, u.profile_pic_url);
                        setSearchQuery('');
                        setShowSearch(false);
                      }
                    }}
                    className={`flex items-center justify-between p-3 transition-colors ${existingConvo ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={u.profile_pic_url || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=f1f5f9`} className="w-8 h-8 rounded-full object-cover" alt={u.first_name} />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{highlightText(`${u.first_name} ${u.last_name}`, searchQuery)}</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase">{u.role}</p>
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

        <div className="flex-1 overflow-y-auto">
          {/* Requests */}
          {requests.length > 0 && (
            <div>
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Pending Requests</span>
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{requests.length}</span>
              </div>
              {requests.map(r => {
                const fullName = `${r.first_name} ${r.last_name}`;
                const avatarUrl = r.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=dbeafe&color=1d4ed8`;
                return (
                  <div key={r.id} className="p-4 flex items-center gap-3 border-b border-slate-100 bg-blue-50/30 animate-fade-in-up hover-glow">
                    <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover border border-blue-100 shadow-sm" alt={fullName} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900">{fullName}</p>
                      <p className="text-xs text-slate-500">Wants to connect</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => acceptRequest(r.id)} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all text-xs shadow-md shadow-blue-500/20" title="Accept Request">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Conversations */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversations</span>
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50 block">forum</span>
              <p className="text-sm">No conversations yet.</p>
            </div>
          ) : (
            conversations.map(c => (
              <div
                key={c.partner_id}
                onClick={() => openChat(c.partner_id, `${c.first_name} ${c.last_name}`, c.profile_pic_url)}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 hover-glow transition-all duration-300 ${currentChat?.id === c.partner_id ? 'bg-blue-50 border-l-2 border-l-blue-600 active-pulse' : ''}`}
              >
                <div className="relative">
                  <img src={c.profile_pic_url || `https://ui-avatars.com/api/?name=${c.first_name}+${c.last_name}&background=dbeafe&color=1d4ed8`} className="w-12 h-12 rounded-full object-cover" alt={c.first_name} />
                  {c.unread_count > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></span>}
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${onlineUsers.includes(String(c.partner_id)) ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`font-bold text-sm truncate ${c.unread_count > 0 ? 'text-blue-700' : 'text-slate-900'}`}>{highlightText(`${c.first_name} ${c.last_name}`, searchQuery)}</h4>
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
            <div className="h-[72px] bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentChat(null)} 
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-1"
                >
                  <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <img src={currentChat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentChat.name)}&background=dbeafe&color=1d4ed8`} className="w-11 h-11 rounded-full object-cover border border-slate-200" alt={currentChat.name} />
                <div>
                  <h3 className="font-bold text-slate-900">{currentChat.name}</h3>
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
                    <p className={`text-xs font-medium flex items-center gap-1 ${onlineUsers.includes(String(currentChat.id)) ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${onlineUsers.includes(String(currentChat.id)) ? 'bg-emerald-500' : 'bg-red-500'}`}></span> 
                      {onlineUsers.includes(String(currentChat.id)) ? 'Online' : 'Offline'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-slate-50">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No messages yet. Say hello! 👋</div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-message-pop`}>
                      <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300 ${isMine ? 'bg-blue-600 text-white rounded-br-sm hover:bg-blue-700' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100 hover:bg-slate-50'}`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
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
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={sendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 bg-slate-100 rounded-2xl flex items-center pr-2 relative border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="w-full bg-transparent border-none focus:ring-0 py-3.5 pl-4 text-slate-800 placeholder-slate-400 outline-none"
                  />
                  <button type="submit" className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm shrink-0">
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );

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
