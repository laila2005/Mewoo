import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const EditProfile = () => {
    const { user, token, setUser } = useAuth();
    const navigate = useNavigate();
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [bio, setBio] = useState('');
    const [customSections, setCustomSections] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setBio(user.bio || '');
            setAvatarUrl(user.profile_pic_url || '');
            setCoverUrl(user.cover_url || '');
            setCustomSections(user.custom_sections || []);
        }
    }, [user]);

    const generateAvatar = () => `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=005da7&color=fff&size=128`;

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            toast.error('First and last name are required');
            return;
        }

        setIsSaving(true);
        try {
            const res = await axios.put(`${API_BASE}/auth/profile`, {
                first_name: firstName,
                last_name: lastName,
                bio,
                custom_sections: customSections
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setUser(res.data.user);
            toast.success('Profile updated successfully!');
            navigate('/owner-profile'); // Or whatever the profile route will be
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }

        const toastId = toast.loading(`Uploading ${type}...`);

        try {
            // 1. Upload to Cloudinary First via Backend Proxy
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'PetPulse');
            
            const cloudRes = await axios.post(`${API_BASE}/upload/cloudinary`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const secureUrl = cloudRes.data.secure_url;

            // 2. Then update our database via /auth/profile
            const payload = {};
            if (type === 'cover') payload.cover_url = secureUrl;
            else payload.profile_pic_url = secureUrl;

            await axios.put(`${API_BASE}/auth/profile`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 3. Update local state
            if (type === 'cover') {
                setCoverUrl(secureUrl);
                setUser({ ...user, cover_url: secureUrl });
            } else {
                setAvatarUrl(secureUrl);
                setUser({ ...user, profile_pic_url: secureUrl });
            }
            toast.success(`${type === 'cover' ? 'Cover' : 'Avatar'} updated!`, { id: toastId });
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error(`Failed to upload ${type}`, { id: toastId });
        }
    };

    const addCustomSection = () => {
        setCustomSections([...customSections, { title: '', content: '' }]);
    };

    const updateCustomSection = (index, field, value) => {
        const newSections = [...customSections];
        newSections[index][field] = value;
        setCustomSections(newSections);
    };

    const removeCustomSection = (index) => {
        setCustomSections(customSections.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-[#f7faf9] min-h-screen pt-8 pb-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
                
                <div className="mb-8">
                    <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-blue-600 font-medium hover:underline text-sm group mb-3">
                        <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900">Edit Profile</h1>
                    <p className="text-slate-500 mt-1 text-sm">Update your personal information and preferences.</p>
                </div>

                {/* Identity Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                    <div className="group relative cursor-pointer w-full h-32 md:h-40" onClick={() => document.getElementById('coverInput').click()}>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-emerald-100 bg-cover bg-center transition-all" style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : 'none' }}></div>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">edit</span>
                        </div>
                        <input id="coverInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
                    </div>

                    <div className="relative px-6 sm:px-8 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12 sm:-mt-16 z-20">
                        <div className="relative cursor-pointer group" onClick={() => document.getElementById('photoInput').click()}>
                            <img src={avatarUrl || generateAvatar()} alt="Profile" className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white shadow-lg bg-white" />
                            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">photo_camera</span>
                            </div>
                            <input id="photoInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatar')} />
                        </div>
                        <div className="text-center sm:text-left flex-1 mb-2">
                            <h3 className="font-bold text-xl text-slate-900">Profile Identity</h3>
                            <p className="text-slate-500 text-sm mt-1">Update your avatar and profile cover.</p>
                        </div>
                    </div>
                </section>

                {/* Personal Information */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
                    <div className="p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 text-lg">person</span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Personal Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                                    <input type="email" value={user?.email || ''} disabled className="w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed" />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold">Verified</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 border-t border-slate-100 pt-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Bio</label>
                            <textarea rows="4" value={bio} onChange={e => setBio(e.target.value)} maxLength="300" placeholder="Tell us about yourself..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none resize-none text-sm"></textarea>
                            <p className="text-xs text-slate-400 text-right">{bio.length}/300</p>
                        </div>
                    </div>
                </section>

                {/* Provider Settings */}
                {(user?.role === 'vet' || user?.role === 'trainer') && (
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-600 text-lg">storefront</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">Professional Profile Customization</h3>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Profile Sections</label>
                                <button onClick={addCustomSection} className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[18px]">add</span> Add Section
                                </button>
                            </div>
                            <div className="space-y-4">
                                {customSections.map((section, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-xl relative border border-slate-200">
                                        <button onClick={() => removeCustomSection(idx)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                        <div className="space-y-3 mr-6">
                                            <input type="text" placeholder="Section Title (e.g. My Philosophy)" value={section.title} onChange={e => updateCustomSection(idx, 'title', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 text-sm font-bold outline-none" />
                                            <textarea placeholder="Section Content" rows="3" value={section.content} onChange={e => updateCustomSection(idx, 'content', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 text-sm resize-none outline-none"></textarea>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8">
                    <button onClick={() => navigate(-1)} className="px-8 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-8 py-3.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                        {isSaving ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : <span className="material-symbols-outlined text-[18px]">check</span>}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;
