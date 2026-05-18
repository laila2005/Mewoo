import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  const messagesEndRef = useRef(null);

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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !currentChat) return;
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

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-[340px] border-r border-slate-200 flex flex-col bg-white shrink-0">
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
                        <p className="text-sm font-bold text-slate-800">{u.first_name} {u.last_name}</p>
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
              {requests.map(r => (
                <div key={r.id} className="p-4 flex items-center gap-3 border-b border-slate-100 bg-blue-50/30">
                  <img src={r.sender_avatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" alt={r.sender_name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900">{r.sender_name}</p>
                    <p className="text-xs text-slate-500">Wants to connect</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => acceptRequest(r.id)} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors text-xs">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </button>
                  </div>
                </div>
              ))}
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
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 ${currentChat?.id === c.partner_id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
              >
                <div className="relative">
                  <img src={c.profile_pic_url || `https://ui-avatars.com/api/?name=${c.first_name}+${c.last_name}&background=dbeafe&color=1d4ed8`} className="w-12 h-12 rounded-full object-cover" alt={c.first_name} />
                  {c.unread_count > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full"></span>}
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${onlineUsers.includes(String(c.partner_id)) ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`font-bold text-sm truncate ${c.unread_count > 0 ? 'text-blue-700' : 'text-slate-900'}`}>{c.first_name} {c.last_name}</h4>
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
      <div className="flex-1 flex flex-col relative">
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
            <div className="h-[72px] bg-white border-b border-slate-200 flex items-center px-6 shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                <img src={currentChat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentChat.name)}&background=dbeafe&color=1d4ed8`} className="w-11 h-11 rounded-full object-cover border border-slate-200" alt={currentChat.name} />
                <div>
                  <h3 className="font-bold text-slate-900">{currentChat.name}</h3>
                  <p className={`text-xs font-medium flex items-center gap-1 ${onlineUsers.includes(String(currentChat.id)) ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${onlineUsers.includes(String(currentChat.id)) ? 'bg-emerald-500' : 'bg-red-500'}`}></span> 
                    {onlineUsers.includes(String(currentChat.id)) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No messages yet. Say hello! 👋</div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isMine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'}`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
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
                    onChange={(e) => setMessageText(e.target.value)}
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
};

export default Messages;
