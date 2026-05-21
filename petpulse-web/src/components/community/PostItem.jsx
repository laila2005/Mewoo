import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import PremiumBadge from '../common/PremiumBadge';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const PostItem = ({ post: initialPost, user, token, onUpdate }) => {
    const [post, setPost] = useState(initialPost);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // { id, name }
    const [submittingComment, setSubmittingComment] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const shareMenuRef = useRef(null);

    // Update local state if prop changes
    useEffect(() => {
        setPost(initialPost);
    }, [initialPost]);

    // Handle clicks outside of share menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
                setShowShareMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLike = async () => {
        if (!user) { toast.error('Please log in to like posts'); return; }
        
        // Optimistic update
        setPost(prev => ({
            ...prev,
            user_liked: !prev.user_liked,
            likes_count: prev.user_liked ? prev.likes_count - 1 : prev.likes_count + 1
        }));

        try {
            await axios.post(`${API_BASE}/community/posts/${post.id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onUpdate) onUpdate();
        } catch (error) {
            // Revert
            setPost(initialPost);
            toast.error('Failed to like post');
        }
    };

    const toggleComments = async () => {
        const willShow = !showComments;
        setShowComments(willShow);
        if (willShow && comments.length === 0) {
            fetchComments();
        }
    };

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`${API_BASE}/community/posts/${post.id}/comments`, { headers });
            setComments(res.data.comments || []);
        } catch (error) {
            console.error('Failed to load comments', error);
            toast.error('Could not load comments');
        } finally {
            setLoadingComments(false);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!user) { toast.error('Please log in to comment'); return; }
        if (!commentInput.trim()) return;

        setSubmittingComment(true);
        try {
            const res = await axios.post(`${API_BASE}/community/posts/${post.id}/comments`, {
                content: commentInput,
                parent_id: replyingTo ? replyingTo.id : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Add to list locally
            setComments(prev => [...prev, res.data.comment]);
            setPost(prev => ({ ...prev, comments_count: prev.comments_count + 1 }));
            setCommentInput('');
            setReplyingTo(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            toast.error('Failed to post comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleCommentReact = async (commentId, emoji = '👍') => {
        if (!user) { toast.error('Please log in to react'); return; }

        try {
            const res = await axios.post(`${API_BASE}/community/posts/${post.id}/comments/${commentId}/react`, { emoji }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh comments to get new reaction counts
            fetchComments();
        } catch (error) {
            toast.error('Failed to react');
        }
    };

    const handleShare = (platform) => {
        const shareUrl = `${window.location.origin}/community?post=${post.id}`;
        const text = `Check out this post from ${post.first_name} on PetPulse!`;
        setShowShareMenu(false);

        switch(platform) {
            case 'copy':
                navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied to clipboard!');
                break;
            case 'whatsapp':
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
                break;
            case 'messenger':
                window.open(`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`, '_blank');
                // Note: The messenger URL scheme works on mobile. For desktop, FB dialog is usually needed with app_id.
                break;
            case 'native':
                if (navigator.share) {
                    navigator.share({
                        title: 'PetPulse Post',
                        text: text,
                        url: shareUrl
                    }).catch(console.error);
                } else {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('Link copied!');
                }
                break;
            default:
                break;
        }
    };

    const buildCommentTree = (flatComments) => {
        const commentMap = {};
        const tree = [];
        
        flatComments.forEach(c => {
            commentMap[c.id] = { ...c, children: [] };
        });
        
        flatComments.forEach(c => {
            if (c.parent_id && commentMap[c.parent_id]) {
                commentMap[c.parent_id].children.push(commentMap[c.id]);
            } else {
                tree.push(commentMap[c.id]);
            }
        });
        
        return tree;
    };

    const renderCommentNode = (comment, depth = 0) => {
        const reactionEmojis = ['👍', '❤️', '😆', '😲', '😢', '😡'];
        const hasReactions = comment.reactionCounts && Object.keys(comment.reactionCounts).length > 0;
        
        return (
            <div key={comment.id} className={`mt-4 ${depth > 0 ? 'ml-10 relative' : ''}`}>
                {/* Connecting line for sub-comments */}
                {depth > 0 && (
                    <div className="absolute left-[-24px] top-0 bottom-[-20px] w-px bg-slate-200"></div>
                )}
                {depth > 0 && (
                    <div className="absolute left-[-24px] top-5 w-4 h-px bg-slate-200"></div>
                )}
                
                <div className="flex gap-3 relative">
                    <Link to={`/owner-profile?id=${comment.user_id}`}>
                        <img 
                            src={comment.profile_pic_url || `https://ui-avatars.com/api/?name=${comment.first_name}+${comment.last_name}&background=f1f5f9`} 
                            alt={comment.first_name} 
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 mt-1 shrink-0 z-10 relative" 
                        />
                    </Link>
                    <div className="flex-1">
                        <div className="bg-slate-100/70 rounded-2xl px-4 py-2.5 inline-block min-w-[120px] relative">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <Link to={`/owner-profile?id=${comment.user_id}`} className="font-bold text-slate-800 text-xs hover:underline">
                                    {comment.first_name} {comment.last_name}
                                </Link>
                                <PremiumBadge active_subscription_plan_id={comment.active_subscription_plan_id} active_subscription_plan_name={comment.active_subscription_plan_name} />
                            </div>
                            <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                            
                            {/* Reaction Badge (like Facebook) */}
                            {hasReactions && (
                                <div className="absolute -bottom-2.5 right-2 bg-white rounded-full shadow-md border border-slate-100/80 px-2 py-0.5 flex items-center gap-1 text-[10px] font-semibold text-slate-600 z-10 select-none hover:scale-105 transition-transform duration-200 cursor-default">
                                    <div className="flex -space-x-1 items-center">
                                        {Object.keys(comment.reactionCounts).slice(0, 3).map(e => (
                                            <span key={e} className="scale-110 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]">{e}</span>
                                        ))}
                                    </div>
                                    <span className="pl-0.5 text-slate-500">{Object.values(comment.reactionCounts).reduce((a,b)=>a+b,0)}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className={`flex items-center gap-4 ${hasReactions ? 'mt-3.5' : 'mt-1'} ml-2 text-xs text-slate-500 font-medium`}>
                            <span className="text-[10px]">{new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            
                            {/* Hover Reaction Menu wrapper */}
                            <div className="relative group cursor-pointer">
                                <span className={`hover:underline flex items-center gap-1.5 transition-all duration-200 ${comment.userReaction ? 'text-blue-600 font-bold scale-105' : 'text-slate-500'}`}>
                                    {comment.userReaction ? (
                                        <>
                                            <span className="text-sm select-none">{comment.userReaction}</span>
                                            <span>Reacted</span>
                                        </>
                                    ) : 'React'}
                                </span>
                                {/* The popup menu */}
                                <div className="absolute bottom-full left-[-20px] mb-2.5 hidden group-hover:flex bg-white rounded-full shadow-xl border border-slate-100 p-1.5 gap-1.5 z-20 animate-fade-in-up">
                                    {reactionEmojis.map(emoji => (
                                        <button 
                                            key={emoji} 
                                            onClick={(e) => { e.preventDefault(); handleCommentReact(comment.id, emoji); }} 
                                            className="hover:scale-130 active:scale-95 transition-transform text-xl px-1 hover:bg-slate-50 rounded-full select-none"
                                            title={emoji}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <span 
                                className="cursor-pointer hover:underline"
                                onClick={() => {
                                    setReplyingTo({ id: comment.id, name: comment.first_name });
                                    // Focus the input (might need a ref, but simple state is okay for now)
                                }}
                            >
                                Reply
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Recursive children rendering */}
                {comment.children && comment.children.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {comment.children.map(child => renderCommentNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const commentTree = buildCommentTree(comments);

    return (
        <article id={`post-${post.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to={`/owner-profile?id=${post.user_id}`}>
                        <img 
                            src={post.profile_pic_url || `https://ui-avatars.com/api/?name=${post.first_name}+${post.last_name}&background=f1f5f9`} 
                            alt={post.first_name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                        />
                    </Link>
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to={`/owner-profile?id=${post.user_id}`} className="font-bold text-slate-900 text-sm hover:underline">
                                {post.first_name} {post.last_name}
                            </Link>
                            <PremiumBadge active_subscription_plan_id={post.active_subscription_plan_id} active_subscription_plan_name={post.active_subscription_plan_name} />
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span> 
                            {new Date(post.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Body */}
            <div className="px-4 pb-3">
                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                    <div className="mt-3 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <img src={post.image_url} alt="Post attachment" className="w-full max-h-[400px] object-cover" />
                    </div>
                )}
            </div>

            {/* Reactions & Info */}
            <div className="px-4 py-3 border-t border-slate-50">
                <div className="flex justify-between items-center mb-3 text-xs text-slate-500 font-medium px-2">
                    <div className="flex items-center gap-1">
                        <span className="bg-blue-100 p-0.5 rounded-full flex items-center justify-center w-5 h-5">
                            <span className="material-symbols-outlined text-[12px] text-blue-600" style={{fontVariationSettings: "'FILL' 1"}}>thumb_up</span>
                        </span>
                        <span>{post.likes_count}</span>
                    </div>
                    <span className="cursor-pointer hover:underline" onClick={toggleComments}>
                        {post.comments_count} comments
                    </span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-1 border-t border-slate-50 pt-2 relative">
                    <button 
                        onClick={handleLike}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm transition-colors ${post.user_liked ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]" style={post.user_liked ? {fontVariationSettings: "'FILL' 1"} : {}}>thumb_up</span> 
                        Like
                    </button>
                    <button onClick={toggleComments} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors font-semibold ${showComments ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span> Comment
                    </button>
                    
                    {/* Share Button & Dropdown */}
                    <div className="flex-1 relative" ref={shareMenuRef}>
                        <button onClick={() => setShowShareMenu(!showShareMenu)} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm transition-colors ${showShareMenu ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <span className="material-symbols-outlined text-[20px]">share</span> Share
                        </button>
                        
                        {showShareMenu && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 animate-fade-in origin-bottom-right transform">
                                <div className="p-1">
                                    <button onClick={() => handleShare('native')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 font-medium sm:hidden">
                                        <span className="material-symbols-outlined text-slate-400">ios_share</span> Share via...
                                    </button>
                                    <button onClick={() => handleShare('whatsapp')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 font-medium">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-4 h-4" /> WhatsApp
                                    </button>
                                    <button onClick={() => handleShare('messenger')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 font-medium">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg" alt="Messenger" className="w-4 h-4" /> Messenger
                                    </button>
                                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                    <button onClick={() => handleShare('copy')} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 font-medium">
                                        <span className="material-symbols-outlined text-slate-400">link</span> Copy Link
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="border-t border-slate-100 bg-slate-50/50">
                    <div className="px-4 py-4 max-h-[400px] overflow-y-auto chat-scroll">
                        {loadingComments ? (
                            <div className="flex justify-center items-center py-6 text-slate-400 gap-2">
                                <span className="material-symbols-outlined animate-spin">refresh</span> Loading comments...
                            </div>
                        ) : commentTree.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm font-medium">
                                No comments yet. Be the first!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {commentTree.map(comment => renderCommentNode(comment, 0))}
                            </div>
                        )}
                    </div>

                    {/* Comment Input */}
                    {user ? (
                        <div className="p-4 bg-white border-t border-slate-100">
                            <form onSubmit={handleCommentSubmit} className={`flex items-start gap-3`}>
                                <img 
                                    src={user.profile_pic_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=f1f5f9`} 
                                    alt="You" 
                                    className={`w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0`} 
                                />
                                <div className={`flex-1 relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-blue-300 transition-colors`}>
                                    {replyingTo && (
                                        <div className="w-full text-xs text-blue-600 bg-blue-50 px-4 py-1.5 border-b border-slate-200 flex justify-between items-center">
                                            <span>Replying to <strong>{replyingTo.name}</strong></span>
                                            <button type="button" onClick={() => setReplyingTo(null)} className="hover:text-blue-800">Cancel</button>
                                        </div>
                                    )}
                                    <input 
                                        type="text"
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                                        className="w-full bg-transparent px-4 py-2.5 text-sm outline-none"
                                        disabled={submittingComment}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!commentInput.trim() || submittingComment}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-30 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="p-4 bg-white border-t border-slate-100 text-center">
                            <p className="text-sm text-slate-500">Log in to leave a comment.</p>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
};

export default PostItem;
