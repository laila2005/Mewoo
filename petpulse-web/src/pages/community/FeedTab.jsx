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
            await axios.post(`${API_BASE}/community/posts`, 
                { content: newPostContent },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            setNewPostContent('');
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                    <div className="flex gap-4">
                        <img 
                            src={user.profile_pic_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=f1f5f9`} 
                            alt="You" 
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200" 
                        />
                        <form onSubmit={handleCreatePost} className="flex-1 flex flex-col gap-3">
                            <input 
                                type="text"
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="What's on your pet's mind today? 🐾"
                                className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-full px-4 py-2.5 outline-none transition-all text-sm"
                            />
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <div className="flex gap-2">
                                    <button type="button" className="flex items-center gap-1.5 text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
                                        <span className="material-symbols-outlined text-[20px] text-emerald-500">image</span> Photo
                                    </button>
                                    <button type="button" className="flex items-center gap-1.5 text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium">
                                        <span className="material-symbols-outlined text-[20px] text-amber-500">mood</span> Feeling
                                    </button>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={!newPostContent.trim() || isPosting}
                                    className="bg-blue-600 text-white px-5 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {isPosting ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        </form>
                    </div>
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
