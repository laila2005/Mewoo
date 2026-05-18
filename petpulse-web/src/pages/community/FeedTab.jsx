import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import PostItem from '../../components/community/PostItem';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const FeedTab = ({ searchQuery }) => {
    const { user, token } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`${API_BASE}/community/posts`, { headers });
            setPosts(res.data.posts || []);
        } catch (error) {
            console.error('Failed to fetch posts', error);
            toast.error('Failed to load community feed');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!user) { toast.error('Please log in to post'); return; }
        if (!newPostContent.trim()) return;

        setIsPosting(true);
        try {
            const payload = { content: newPostContent };
            if (imageUrl) payload.image_url = imageUrl;

            await axios.post(`${API_BASE}/community/posts`, 
                payload,
                { headers: { Authorization: `Bearer ${token}` }}
            );
            setNewPostContent('');
            setImageUrl('');
            setShowImageInput(false);
            setShowEmojiPicker(false);
            toast.success('Post created!');
            fetchPosts(); // Refresh feed
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create post');
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = async (postId) => {
        if (!user) { toast.error('Please log in to like posts'); return; }
        
        // Optimistic UI update
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return { 
                    ...p, 
                    user_liked: !p.user_liked, 
                    likes_count: p.user_liked ? p.likes_count - 1 : p.likes_count + 1 
                };
            }
            return p;
        }));

        try {
            await axios.post(`${API_BASE}/community/posts/${postId}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            // Revert on failure
            fetchPosts();
            toast.error('Failed to like post');
        }
    };

    const filteredPosts = posts.filter(p => 
        !searchQuery || 
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading community feed...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Create Post Area */}
            {user && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <img 
                                src={user.profile_pic_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=f1f5f9`} 
                                alt="You" 
                                className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200" 
                            />
                            <textarea 
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder={`What's on your mind, ${user.first_name}?`}
                                className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all text-sm resize-none min-h-[80px]"
                            />
                        </div>

                        {showImageInput && (
                            <div className="ml-15 mt-2">
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                    <span className="material-symbols-outlined text-slate-400 pl-2 text-[20px]">link</span>
                                    <input 
                                        type="url" 
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="Paste an image URL here..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-1"
                                    />
                                    <button type="button" onClick={() => {setShowImageInput(false); setImageUrl('');}} className="text-slate-400 hover:text-red-500 px-2 material-symbols-outlined text-[18px]">close</button>
                                </div>
                                {imageUrl && (
                                    <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 h-48 bg-slate-100">
                                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 ml-14">
                            <div className="flex gap-1 relative">
                                <button type="button" onClick={() => setShowImageInput(!showImageInput)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${showImageInput ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <span className="material-symbols-outlined text-[20px] text-emerald-500">image</span> Photo
                                </button>
                                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${showEmojiPicker ? 'bg-amber-50 text-amber-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <span className="material-symbols-outlined text-[20px] text-amber-500">mood</span> Feeling/Activity
                                </button>
                                
                                {showEmojiPicker && (
                                    <div className="absolute top-10 left-20 bg-white border border-slate-200 shadow-xl rounded-xl p-3 grid grid-cols-5 gap-2 z-10 w-48">
                                        {['🐾', '❤️', '😂', '🐶', '🐱', '🎉', '🦴', '🐈', '🐕', '🥰'].map(emoji => (
                                            <button type="button" key={emoji} onClick={() => {setNewPostContent(prev => prev + emoji); setShowEmojiPicker(false);}} className="text-2xl hover:bg-slate-100 p-1 rounded-lg transition-colors">
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button 
                                type="submit" 
                                disabled={!newPostContent.trim() || isPosting}
                                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {isPosting ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Posts Feed */}
            {filteredPosts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">forum</span>
                    <p className="text-slate-600 font-semibold mb-1">No posts yet</p>
                    <p className="text-sm text-slate-400">Be the first to share something with the community!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredPosts.map(post => (
                            <PostItem 
                                key={post.id} 
                                post={post} 
                                user={user} 
                                token={token} 
                                onUpdate={fetchPosts} 
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };
    
    export default FeedTab;
