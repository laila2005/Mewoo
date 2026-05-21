import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const VET_SUGGESTIONS = [
    "General Medicine",
    "Surgery",
    "Cardiology",
    "Dermatology",
    "Dentistry",
    "Orthopedics",
    "Oncology",
    "Ophthalmology",
    "Radiology",
    "Nutrition",
    "Vaccination",
    "Exotic Pets",
    "Pediatrics"
];

const TRAINER_SUGGESTIONS = [
    "Puppy Training",
    "Obedience Training",
    "Behavior Modification",
    "Agility Training",
    "Clicker Training",
    "Socialization",
    "Leash Training",
    "Protection Training",
    "Trick Training",
    "Therapy Pet Training",
    "Canine Good Citizen",
    "Separation Anxiety"
];

const ProfessionalDashboard = () => {
    const { token, user, setUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('tracker'); // tracker | profile | analytics
    const [wizardStep, setWizardStep] = useState(1);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // API config
    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

    // ── 1. Work Tracker State ──
    const [appointments, setAppointments] = useState([]);

    // ── 2. Profile State ──
    const [profile, setProfile] = useState({
        title: '',
        experience: 0,
        about: '',
        specialties: [],
        license_number: '',
        degrees: '',
        consultation_fee: 0,
        address: '',
        working_hours: {
            start: '09:00',
            end: '18:00'
        },
        available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday']
    });

    const [reviews, setReviews] = useState([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);

    // Synchronize profile state when user is loaded or changed from DB
    useEffect(() => {
        if (user) {
            setProfile({
                title: user.title || '',
                experience: user.experience !== undefined && user.experience !== null ? parseInt(user.experience) : 0,
                about: user.bio || '',
                specialties: Array.isArray(user.specialties) ? user.specialties : [],
                license_number: user.license_number || '',
                degrees: user.degrees || '',
                consultation_fee: user.consultation_fee !== undefined && user.consultation_fee !== null ? parseFloat(user.consultation_fee) : 0,
                address: user.address || '',
                working_hours: user.working_hours || {
                    start: '09:00',
                    end: '18:00'
                },
                available_days: Array.isArray(user.available_days) && user.available_days.length > 0 
                    ? user.available_days 
                    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday']
            });
            setIsEditingProfile(!user.title);
        }
    }, [user]);

    // Fetch provider reviews from PostgreSQL database
    useEffect(() => {
        const fetchReviews = async () => {
            if (!token || !user?.id) return;
            try {
                const res = await axios.get(`${API_BASE}/providers/${user.id}/reviews`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.reviews) {
                    setReviews(res.data.reviews);
                }
            } catch (err) {
                console.error("Failed to fetch reviews", err);
            }
        };

        fetchReviews();
    }, [token, user?.id, API_BASE]);

    // Fetch professional's appointments from PostgreSQL database
    useEffect(() => {
        const fetchRealData = async () => {
            if (!token) return;
            try {
                const aptsRes = await axios.get(`${API_BASE}/bookings/appointments`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (aptsRes.data?.appointments) {
                    const dbApts = aptsRes.data.appointments.map(apt => {
                        const ownerName = apt.owner_first_name 
                            ? `${apt.owner_first_name} ${apt.owner_last_name || ''}`.trim()
                            : 'Pet Owner';
                        return {
                            id: apt.id,
                            client_name: ownerName,
                            client_avatar: apt.owner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=d4e3ff&color=005da7`,
                            pet_name: apt.pet_name || 'Pet',
                            pet_species: apt.species || 'Dog',
                            pet_breed: apt.pet_breed || 'Mixed',
                            appointment_time: apt.appointment_time,
                            reason: apt.reason || 'Routine consultation',
                            status: apt.status || 'pending',
                            fee: apt.fee || (user?.role === 'vet' ? 450 : 350)
                        };
                    });
                    setAppointments(dbApts);
                }
            } catch (err) {
                console.error("Failed to fetch database appointments", err);
            }
        };

        fetchRealData();
    }, [token, API_BASE, user?.role]);

    // ── Actions: Work Tracker ──
    const handleUpdateStatus = async (appointmentId, newStatus) => {
        setAppointments(prev => 
            prev.map(apt => apt.id === appointmentId ? { ...apt, status: newStatus } : apt)
        );

        toast.success(`Appointment status updated to ${newStatus}!`);

        // Ready API connection:
        try {
            await axios.put(`${API_BASE}/bookings/appointments/${appointmentId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.log("Ready to connect PUT /api/bookings/appointments/:id/status on live backend.");
        }
    };

    // ── Actions: Profile Update ──
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Check if there is text in specialty input and add it
            const input = document.getElementById('specialty-input');
            let currentSpecialties = [...profile.specialties];
            if (input && input.value.trim()) {
                const val = input.value.trim();
                if (!currentSpecialties.includes(val)) {
                    currentSpecialties.push(val);
                }
                if (input) input.value = '';
            }

            // Map 'about' to 'bio' as expected by the backend /profile/pro route
            const payload = {
                ...profile,
                specialties: currentSpecialties,
                bio: profile.about
            };
            await axios.put(`${API_BASE}/auth/profile/pro`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Fetch updated user to refresh global auth state
            const meRes = await axios.get(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (meRes.data?.user) {
                setUser(meRes.data.user);
            }

            setLoading(false);
            toast.success("Professional profile saved successfully!");
            setIsEditingProfile(false);
            setWizardStep(1);
        } catch (err) {
            setLoading(false);
            toast.error(err.response?.data?.error || "Failed to save profile. Please try again.");
            console.error("Profile update error:", err);
        }
    };

    const handleSpecialtyChange = (e, index) => {
        const newSpec = [...profile.specialties];
        newSpec[index] = e.target.value;
        setProfile({ ...profile, specialties: newSpec });
    };

    const addSpecialty = () => {
        setProfile({ ...profile, specialties: [...profile.specialties, ''] });
    };

    const removeSpecialty = (index) => {
        const newSpec = profile.specialties.filter((_, i) => i !== index);
        setProfile({ ...profile, specialties: newSpec });
    };

    const toggleDay = (day) => {
        const days = profile.available_days.includes(day)
            ? profile.available_days.filter(d => d !== day)
            : [...profile.available_days, day];
        setProfile({ ...profile, available_days: days });
    };

    const autoAddSpecialtyFromInput = () => {
        const input = document.getElementById('specialty-input');
        if (input && input.value.trim()) {
            const val = input.value.trim();
            if (!profile.specialties.includes(val)) {
                setProfile(prev => ({
                    ...prev,
                    specialties: [...prev.specialties, val]
                }));
            }
            input.value = '';
        }
    };

    const changeWizardStep = (targetStep) => {
        if (wizardStep === 2) {
            autoAddSpecialtyFromInput();
        }
        setWizardStep(targetStep);
    };

    // ── Metrics calculations for Analytics ──
    const totalAppointments = appointments.length;
    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
    const completedCount = appointments.filter(a => a.status === 'completed').length;
    const estimatedEarnings = appointments
        .filter(a => a.status === 'completed' || a.status === 'confirmed')
        .reduce((sum, a) => sum + (a.fee || 300), 0);

    const isVet = user?.role === 'vet';

    // ── Group Appointments dynamically by Month (Last 6 Months) ──
    const getMonthlyVolumeData = () => {
        const months = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        
        // Generate last 6 months in chronological order
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
                name: monthNames[d.getMonth()],
                year: d.getFullYear(),
                monthIndex: d.getMonth(),
                count: 0
            });
        }

        // Aggregate counts from appointments
        appointments.forEach(apt => {
            if (!apt.appointment_time) return;
            const aptDate = new Date(apt.appointment_time);
            const aptMonth = aptDate.getMonth();
            const aptYear = aptDate.getFullYear();
            
            const matched = months.find(m => m.monthIndex === aptMonth && m.year === aptYear);
            if (matched) {
                matched.count += 1;
            }
        });

        // Map to coordinates inside a 500x120 SVG space
        const maxCount = Math.max(...months.map(m => m.count), 1);
        const points = months.map((m, i) => {
            const x = (i / 5) * 500;
            const y = 100 - (m.count / maxCount) * 80; // Scale dynamically between y=100 and y=20
            return { x, y, count: m.count, name: m.name };
        });

        // Draw horizontal cubic bezier curve
        let linePath = '';
        if (points.length > 0) {
            linePath = `M ${points[0].x} ${points[0].y}`;
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const cp1x = p0.x + (p1.x - p0.x) / 2;
                const cp1y = p0.y;
                const cp2x = p0.x + (p1.x - p0.x) / 2;
                const cp2y = p1.y;
                linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
            }
        }

        const fillPath = points.length > 0 ? `${linePath} L 500 120 L 0 120 Z` : '';

        return { months, points, linePath, fillPath };
    };

    const chartData = getMonthlyVolumeData();

    const nonCancelledCount = appointments.filter(a => a.status !== 'cancelled').length;
    const fulfillmentRate = nonCancelledCount > 0 ? Math.round((completedCount / nonCancelledCount) * 100) : 0;

    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const userSpecialties = Array.isArray(user?.specialties) && user.specialties.length > 0
        ? user.specialties
        : (user?.role === 'vet' ? ['General Veterinary Medicine'] : ['General Pet Training']);

    const isProfileIncomplete = !user?.bio || !user?.title || !(user?.license_number || user?.role === 'trainer') || userSpecialties.length === 0;

    return (
        <div className="min-h-screen bg-[#f8fafc] pt-4 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* ── Page Header ── */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0">
                            <span className="material-symbols-outlined text-4xl">
                                {isVet ? 'medical_services' : 'pets'}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-extrabold text-slate-900">
                                    Welcome, {user?.first_name || 'Professional'}!
                                </h1>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider">
                                    {user?.role === 'vet' ? 'Veterinarian' : 'Pet Trainer'}
                                </span>
                            </div>
                            <p className="text-slate-500 font-medium mt-1">
                                {profile.title} at {profile.address || 'Your Clinic / Center'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Access Actions */}
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={() => navigate('/community')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-lg">forum</span>
                            Community Feed
                        </button>
                        <button 
                            onClick={() => navigate('/messages')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-lg">chat</span>
                            Message Inbox
                        </button>
                    </div>
                </div>

                {/* ── ID Verification Status Alert Banners ── */}
                {user?.status === 'pending' && (
                    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md flex items-center gap-3 shadow-[0_4px_12px_rgba(245,158,11,0.05)]">
                        <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">hourglass_empty</span>
                        <div>
                            <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wide">Awaiting Verification</h4>
                            <p className="text-xs text-amber-800/80 font-semibold mt-0.5">
                                Our team is reviewing your uploaded credentials. You can still set up your profile and schedule below, but your public profile will go live once verified.
                            </p>
                        </div>
                    </div>
                )}

                {user?.status === 'rejected' && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md flex items-center gap-3 shadow-[0_4px_12px_rgba(244,63,94,0.05)]">
                        <span className="material-symbols-outlined text-rose-600 text-2xl shrink-0 font-bold">error</span>
                        <div>
                            <h4 className="font-extrabold text-xs text-rose-900 uppercase tracking-wide">Verification Failed</h4>
                            <p className="text-xs text-rose-800/80 font-semibold mt-0.5">
                                Verification failed. Please re-upload your valid credentials or contact administrator support.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Quick Stats Grid ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Total Bookings</span>
                            <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">event_note</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{totalAppointments}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">All-time appointments</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Pending Requests</span>
                            <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">pending</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Require action</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Confirmed Today</span>
                            <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">task_alt</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{confirmedCount}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Confirmed work</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-xs sm:text-sm font-semibold">Est. Earnings</span>
                            <span className="w-8 h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">payments</span>
                            </span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">{estimatedEarnings} EGP</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Confirmed / Completed</p>
                    </div>
                </div>

                {/* ── Main Modules Content Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Sidebar Menu */}
                    <div className="lg:col-span-3 space-y-2">
                        <button
                            onClick={() => setActiveTab('tracker')}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'tracker'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <span className="material-symbols-outlined">schedule</span>
                                Work Tracker
                            </span>
                            {pendingCount > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    activeTab === 'tracker' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                                }`}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'profile'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">badge</span>
                            Public Profile Builder
                        </button>

                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 outline-none ${
                                activeTab === 'analytics'
                                    ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.25)]'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                            }`}
                        >
                            <span className="material-symbols-outlined">insights</span>
                            Analytics Hub
                        </button>
                    </div>

                    {/* Right Interactive Content Area */}
                    <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
                        
                        {/* TAB A: WORK TRACKER */}
                        {activeTab === 'tracker' && (
                            <div className="p-6 sm:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Appointment Tracker</h2>
                                        <p className="text-slate-400 text-xs font-semibold mt-0.5">Manage and track your schedule of incoming client sessions.</p>
                                    </div>
                                    <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl text-slate-500 font-bold">
                                        Total: {appointments.length}
                                    </span>
                                </div>

                                {isProfileIncomplete && (
                                    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 shadow-sm border border-blue-500/20">
                                                <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-sm text-blue-900">Complete Your Professional Onboarding</h4>
                                                <p className="text-xs text-blue-800/80 font-medium mt-1">
                                                    Your profile is currently incomplete (missing bio, specialties, clinic address, or license info). Stand out to pet parents and enable bookings by completing the setup wizard.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab('profile');
                                                setWizardStep(1);
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap active:scale-[0.98]"
                                        >
                                            Launch Profile Wizard
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {appointments.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">event_busy</span>
                                            <h4 className="font-bold text-slate-700">No client bookings yet</h4>
                                            <p className="text-slate-400 text-xs mt-1">Once clients schedule slots on your public profile, they will appear here.</p>
                                        </div>
                                    ) : (
                                        appointments.map((apt) => (
                                            <div 
                                                key={apt.id} 
                                                className="p-5 border border-slate-100 rounded-2xl hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 bg-[#fafbfd]"
                                            >
                                                {/* Client / Pet Details */}
                                                <div className="flex items-start gap-4">
                                                    <img 
                                                        src={apt.client_avatar || `https://ui-avatars.com/api/?name=${apt.client_name}&background=d4e3ff&color=005da7`} 
                                                        className="w-12 h-12 rounded-full border border-blue-100 object-cover shrink-0" 
                                                        alt={apt.client_name}
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-bold text-slate-800 text-sm">{apt.client_name}</h3>
                                                            <span className="text-slate-300 text-xs">•</span>
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[10px]">pets</span>
                                                                {apt.pet_name} ({apt.pet_species} / {apt.pet_breed || 'Mixed'})
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px] text-blue-500">schedule</span>
                                                            {new Date(apt.appointment_time).toLocaleString('en-US', {
                                                                weekday: 'short',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                        <p className="text-xs text-slate-600 mt-2 italic bg-white p-2 rounded-lg border border-slate-100/50">
                                                            "{apt.reason}"
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Status & Action Buttons */}
                                                <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-400 font-bold">Status:</span>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                            apt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                            apt.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                            apt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-rose-100 text-rose-700'
                                                        }`}>
                                                            {apt.status}
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {apt.status === 'pending' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                                                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold rounded-xl transition-all"
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                                                                    className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                                                                >
                                                                    Confirm
                                                                </button>
                                                            </>
                                                        )}
                                                        {apt.status === 'confirmed' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleUpdateStatus(apt.id, 'completed')}
                                                                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                                                                >
                                                                    Mark Complete
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => navigate('/messages')}
                                                            title="Chat with client"
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-lg flex">chat</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB B: PROFILE BUILDER */}
                        {activeTab === 'profile' && (
                            <div className="p-6 sm:p-8">
                                {!isEditingProfile ? (
                                    /* BEAUTIFUL HIGH-FIDELITY PUBLIC PROFILE PREVIEW CARD */
                                    <div className="space-y-8 animate-fadeIn">
                                        {/* Cover Banner & Actions */}
                                        <div className="relative">
                                            <div className="h-32 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 shadow-md relative overflow-hidden">
                                                {/* Decorative background vectors */}
                                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-indigo-500 to-slate-900"></div>
                                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
                                            </div>
                                            
                                            {/* Avatar overlay */}
                                            <div className="absolute -bottom-10 left-6 flex items-end gap-4">
                                                <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg bg-blue-50 flex items-center justify-center text-blue-600 text-3xl font-extrabold select-none">
                                                    {user?.first_name?.[0] || 'P'}{user?.last_name?.[0] || ''}
                                                </div>
                                            </div>

                                            {/* Action Buttons Top Right */}
                                            <div className="absolute -bottom-12 right-0 flex items-center gap-3">
                                                <button
                                                    onClick={() => setIsEditingProfile(true)}
                                                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95 hover:border-slate-300"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                    Edit Profile
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/trainer-details?id=${user.id}`)}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 hover:shadow-lg shadow-blue-500/20"
                                                >
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                    View Booking Page
                                                </button>
                                            </div>
                                        </div>

                                        {/* Professional Info Header */}
                                        <div className="pt-6">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-extrabold text-slate-800">
                                                    {isVet ? 'Dr. ' : ''}{user?.first_name} {user?.last_name}
                                                </h3>
                                                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-xs">verified</span>
                                                    Verified Profile
                                                </div>
                                            </div>
                                            <p className="text-slate-500 font-bold text-sm mt-1 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base text-blue-600">
                                                    {isVet ? 'medical_services' : 'pets'}
                                                </span>
                                                {profile.title || 'Certified Professional'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Consultation Fee</span>
                                                <span className="text-lg font-black text-blue-600">{profile.consultation_fee} EGP</span>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Experience</span>
                                                <span className="text-lg font-black text-slate-700">{profile.experience} Years</span>
                                            </div>
                                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Clinic Rating</span>
                                                <span className="text-lg font-black text-amber-500 flex items-center justify-center gap-1">
                                                    <span className="material-symbols-outlined text-base font-bold">star</span>
                                                    {averageRating || 'New'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Two Column details */}
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                                            {/* Left Main details */}
                                            <div className="lg:col-span-8 space-y-6">
                                                {/* Bio / About */}
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Biography & Clinical Focus</h4>
                                                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 relative">
                                                        <span className="material-symbols-outlined text-4xl text-blue-100 absolute right-4 top-2 pointer-events-none font-bold">format_quote</span>
                                                        <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-line relative z-10">
                                                            {profile.about || "No biography provided yet. Click 'Edit Profile' to add a professional bio."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Specialties / Tags */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Specialties & Focus Areas</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {profile.specialties && profile.specialties.length > 0 ? (
                                                            profile.specialties.map((spec, i) => (
                                                                <span key={i} className="px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100/50 shadow-sm flex items-center gap-1.5">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                                    {spec}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">No specialties configured yet.</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Credentials Verification Card */}
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3.5">
                                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Academic Credentials & Certification</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-emerald-600 font-bold text-lg mt-0.5">school</span>
                                                            <div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Education & Degrees</span>
                                                                <span className="text-xs font-bold text-slate-700">{profile.degrees || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <span className="material-symbols-outlined text-emerald-600 font-bold text-lg mt-0.5">verified_user</span>
                                                            <div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">License Registration</span>
                                                                <span className="text-xs font-mono font-bold text-slate-600">{profile.license_number || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column availability */}
                                            <div className="lg:col-span-4 space-y-6">
                                                {/* Clinic Location */}
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-base text-blue-600">location_on</span>
                                                        Clinic Location
                                                    </h4>
                                                    <p className="text-xs font-extrabold text-slate-700 leading-relaxed">
                                                        {profile.address || 'No location configured.'}
                                                    </p>
                                                </div>

                                                {/* Working hours */}
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-base text-blue-600">schedule</span>
                                                        Working Hours
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1 bg-white border border-slate-100 rounded-lg text-xs font-black text-slate-700">
                                                            {profile.working_hours?.start || '09:00'}
                                                        </span>
                                                        <span className="text-slate-400 font-bold text-xs">to</span>
                                                        <span className="px-2.5 py-1 bg-white border border-slate-100 rounded-lg text-xs font-black text-slate-700">
                                                            {profile.working_hours?.end || '18:00'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Weekly availability days */}
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Weekly Schedule</h4>
                                                    <div className="space-y-2">
                                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                                            const isAvailable = profile.available_days?.includes(day);
                                                            return (
                                                                <div key={day} className="flex justify-between items-center py-1 border-b border-slate-100/50 last:border-0">
                                                                    <span className={`text-xs font-bold ${isAvailable ? 'text-slate-700' : 'text-slate-400'}`}>{day}</span>
                                                                    {isAvailable ? (
                                                                        <span className="material-symbols-outlined text-base text-emerald-600 font-black">check_circle</span>
                                                                    ) : (
                                                                        <span className="material-symbols-outlined text-base text-slate-300">cancel</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* WIZARD FORM IN EDIT MODE */
                                    <>
                                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800">Public Profile Settings Wizard</h2>
                                                <p className="text-slate-400 text-xs font-semibold mt-0.5">Customize your clinical credentials, rates, and schedule visible to small animal owners.</p>
                                            </div>
                                            <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl font-bold border border-blue-100">
                                                Step {wizardStep} of 3
                                            </span>
                                        </div>

                                        {/* Premium Stepper Progress Indicator */}
                                        <div className="mb-10 relative px-4">
                                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0"></div>
                                            <div 
                                                className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full z-0 transition-all duration-500"
                                                style={{ width: `${((wizardStep - 1) / 2) * 100}%` }}
                                            ></div>
                                            
                                            <div className="relative flex justify-between items-center z-10">
                                                {[
                                                    { step: 1, label: 'Credentials', icon: 'badge' },
                                                    { step: 2, label: 'Biography & Skills', icon: 'description' },
                                                    { step: 3, label: 'Rates & Availability', icon: 'calendar_month' }
                                                ].map((item) => {
                                                    const isCompleted = wizardStep > item.step;
                                                    const isActive = wizardStep === item.step;
                                                    return (
                                                        <div key={item.step} className="flex flex-col items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => changeWizardStep(item.step)}
                                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                                                    isCompleted 
                                                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                                                                        : isActive 
                                                                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-lg shadow-blue-600/20' 
                                                                            : 'bg-white border-2 border-slate-200 text-slate-400 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                {isCompleted ? (
                                                                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                                                                ) : (
                                                                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                                                                )}
                                                            </button>
                                                            <span className={`text-[11px] font-bold mt-2 transition-all duration-300 ${isActive ? 'text-blue-600 font-extrabold' : isCompleted ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                                            
                                            {/* ── STEP 1: credentials ── */}
                                            {wizardStep === 1 && (
                                                <div className="space-y-6">
                                                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 flex gap-3 mb-2">
                                                        <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
                                                        <div>
                                                            <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wide">Credentials & Qualifications</h4>
                                                            <p className="text-xs text-blue-700/80 font-medium mt-0.5">Please provide your official titles, years of active clinical practice, and university certifications.</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Professional Title</label>
                                                            <input 
                                                                type="text" 
                                                                required
                                                                placeholder={isVet ? 'e.g. Doctor of Veterinary Medicine (DVM)' : 'e.g. Certified Canine Behavior Consultant'}
                                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold transition-all" 
                                                                value={profile.title}
                                                                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Years of Experience</label>
                                                            <input 
                                                                type="number" 
                                                                required
                                                                min="0"
                                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold transition-all" 
                                                                value={profile.experience}
                                                                onChange={(e) => setProfile({ ...profile, experience: parseInt(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">License Number / Registration</label>
                                                            <input 
                                                                type="text" 
                                                                required
                                                                placeholder="e.g. LIC-123456789"
                                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold font-mono transition-all" 
                                                                value={profile.license_number}
                                                                onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Degrees & Education</label>
                                                            <input 
                                                                type="text" 
                                                                required
                                                                placeholder="e.g. B.V.Sc, Cairo University"
                                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold transition-all" 
                                                                value={profile.degrees}
                                                                onChange={(e) => setProfile({ ...profile, degrees: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── STEP 2: biography & focus ── */}
                                            {wizardStep === 2 && (
                                                <div className="space-y-6">
                                                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 flex gap-3 mb-2">
                                                        <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
                                                        <div>
                                                            <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wide">Biography & Expertise</h4>
                                                            <p className="text-xs text-blue-700/80 font-medium mt-0.5">Let pet owners know who you are. Define your specialization to rank in searches.</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Short Bio / About Yourself</label>
                                                        <textarea 
                                                            rows="4" 
                                                            required
                                                            placeholder="Write a warm, welcoming introduction summarizing your credentials and passion for pets..."
                                                            className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-semibold transition-all resize-none leading-relaxed" 
                                                            value={profile.about}
                                                            onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                                                        />
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Specialties & Core Skills</label>
                                                        <div className="flex flex-wrap gap-2.5">
                                                            {profile.specialties.map((spec, index) => (
                                                                <span 
                                                                    key={index}
                                                                    className="px-3.5 py-2 bg-blue-50 border border-blue-100/50 rounded-xl text-xs font-bold text-blue-700 flex items-center gap-2 group transition-all"
                                                                >
                                                                    {spec}
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => removeSpecialty(index)}
                                                                        className="text-blue-400 hover:text-red-600 shrink-0 font-extrabold"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm font-extrabold flex">close</span>
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* Tag Input Field with Dropdown Auto-Complete Suggestions */}
                                                        <div className="relative pt-2">
                                                            <div className="flex gap-2">
                                                                <input
                                                                    id="specialty-input"
                                                                    type="text"
                                                                    placeholder={isVet ? "e.g. Surgery, Dermatology..." : "e.g. Obedience, Puppy..."}
                                                                    className="flex-1 px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-2xl focus:border-blue-500 outline-none text-sm font-semibold transition-all"
                                                                    onFocus={() => {
                                                                        setActiveSuggestionIndex(0);
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        // Small delay to allow list clicks to register first before hiding
                                                                        setTimeout(() => {
                                                                            setActiveSuggestionIndex(null);
                                                                        }, 150);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        const suggestionsList = isVet ? VET_SUGGESTIONS : TRAINER_SUGGESTIONS;
                                                                        const queryVal = e.target.value.toLowerCase().trim();
                                                                        const filtered = suggestionsList.filter(s => 
                                                                            s.toLowerCase().includes(queryVal) && !profile.specialties.includes(s)
                                                                        );

                                                                        if (e.key === 'ArrowDown' && activeSuggestionIndex !== null) {
                                                                            e.preventDefault();
                                                                            setActiveSuggestionIndex(prev => Math.min((filtered.length || 1) - 1, (prev !== null ? prev + 1 : 0)));
                                                                        } else if (e.key === 'ArrowUp' && activeSuggestionIndex !== null) {
                                                                            e.preventDefault();
                                                                            setActiveSuggestionIndex(prev => Math.max(0, (prev !== null ? prev - 1 : 0)));
                                                                        } else if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            if (activeSuggestionIndex !== null && filtered[activeSuggestionIndex]) {
                                                                                const selectedTag = filtered[activeSuggestionIndex];
                                                                                setProfile({ ...profile, specialties: [...profile.specialties, selectedTag] });
                                                                                e.target.value = '';
                                                                            } else if (e.target.value.trim()) {
                                                                                const customTag = e.target.value.trim();
                                                                                if (!profile.specialties.includes(customTag)) {
                                                                                    setProfile({ ...profile, specialties: [...profile.specialties, customTag] });
                                                                                }
                                                                                e.target.value = '';
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const input = document.getElementById('specialty-input');
                                                                        if (input && input.value.trim()) {
                                                                            const val = input.value.trim();
                                                                            if (!profile.specialties.includes(val)) {
                                                                                setProfile({ ...profile, specialties: [...profile.specialties, val] });
                                                                            }
                                                                            input.value = '';
                                                                        }
                                                                    }}
                                                                    className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0"
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>

                                                            {/* Dropdown Suggestions List Popup */}
                                                            {activeSuggestionIndex !== null && (
                                                                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto overflow-hidden divide-y divide-slate-50">
                                                                    {(() => {
                                                                        const suggestionsList = isVet ? VET_SUGGESTIONS : TRAINER_SUGGESTIONS;
                                                                        const inputEl = document.getElementById('specialty-input');
                                                                        const queryText = inputEl ? inputEl.value.toLowerCase().trim() : '';
                                                                        const filteredSuggestions = suggestionsList.filter(s => 
                                                                            s.toLowerCase().includes(queryText) && !profile.specialties.includes(s)
                                                                        );

                                                                        if (filteredSuggestions.length === 0) {
                                                                            return (
                                                                                <div className="px-4 py-3 text-xs text-slate-400 font-semibold italic">
                                                                                    Press 'Add' or hit 'Enter' to insert custom skill...
                                                                                </div>
                                                                            );
                                                                        }

                                                                        return filteredSuggestions.map((item, idx) => (
                                                                            <div
                                                                                key={item}
                                                                                onMouseDown={(e) => {
                                                                                    // Critical to use onMouseDown with preventDefault to prevent focus blur race condition
                                                                                    e.preventDefault();
                                                                                    setProfile({ ...profile, specialties: [...profile.specialties, item] });
                                                                                    if (inputEl) inputEl.value = '';
                                                                                }}
                                                                                className={`px-4 py-2.5 text-xs font-bold cursor-pointer transition-all ${
                                                                                    idx === activeSuggestionIndex 
                                                                                        ? 'bg-blue-50 text-blue-700 font-extrabold' 
                                                                                        : 'text-slate-600 hover:bg-slate-50'
                                                                                }`}
                                                                            >
                                                                                {item}
                                                                            </div>
                                                                        ));
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── STEP 3: availability & pricing ── */}
                                            {wizardStep === 3 && (
                                                <div className="space-y-6">
                                                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 flex gap-3 mb-2">
                                                        <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
                                                        <div>
                                                            <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wide">Base Consultation & Availability</h4>
                                                            <p className="text-xs text-blue-700/80 font-medium mt-0.5">Specify your regular clinic consultation fees, location address, and choose your active working days/shifts.</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Base Consultation / Session Fee (EGP)</label>
                                                            <input 
                                                                type="number" 
                                                                required
                                                                className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                                value={profile.consultation_fee}
                                                                onChange={(e) => setProfile({...profile, consultation_fee: parseInt(e.target.value) || 0})}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Clinic / Facility Location Address</label>
                                                            <input 
                                                                type="text" 
                                                                required
                                                                className="w-full px-[#10px] py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                                placeholder="e.g. New Cairo Clinic Center"
                                                                value={profile.address}
                                                                onChange={(e) => setProfile({...profile, address: e.target.value})}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 border-t border-slate-100 pt-5">
                                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-blue-600">schedule</span>
                                                            Availability & Operating Hours
                                                        </h3>
                                                        
                                                        <div className="space-y-3">
                                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Weekly Working Days</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                                                                    const active = profile.available_days.includes(day);
                                                                    return (
                                                                        <button
                                                                            key={day}
                                                                            type="button"
                                                                            onClick={() => toggleDay(day)}
                                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                                                active 
                                                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                                            }`}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Shift Start</label>
                                                                <input 
                                                                    type="time" 
                                                                    required
                                                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                                    value={profile.working_hours.start}
                                                                    onChange={(e) => setProfile({
                                                                        ...profile, 
                                                                        working_hours: { ...profile.working_hours, start: e.target.value }
                                                                    })}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Shift End</label>
                                                                <input 
                                                                    type="time" 
                                                                    required
                                                                    className="w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all" 
                                                                    value={profile.working_hours.end}
                                                                    onChange={(e) => setProfile({
                                                                        ...profile, 
                                                                        working_hours: { ...profile.working_hours, end: e.target.value }
                                                                    })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                    {/* Navigation Controls */}
                                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                        <button
                                            type="button"
                                            disabled={wizardStep === 1}
                                            onClick={() => changeWizardStep(Math.max(1, wizardStep - 1))}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all outline-none ${
                                                wizardStep === 1 
                                                    ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400' 
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-[0.98]'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                                            Previous Step
                                        </button>

                                        {wizardStep < 3 ? (
                                            <button
                                                type="button"
                                                onClick={() => changeWizardStep(Math.min(3, wizardStep + 1))}
                                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md active:scale-[0.98] transition-all"
                                            >
                                                Next Step
                                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md active:scale-[0.98] transition-all"
                                            >
                                                {loading ? 'Saving Profile...' : 'Save Public Credentials'}
                                                {!loading && <span className="material-symbols-outlined text-lg">check_circle</span>}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                )}

                        {/* TAB C: ANALYTICS HUB */}
                        {activeTab === 'analytics' && (
                            <div className="p-6 sm:p-8">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Business & Activity Analytics</h2>
                                    <p className="text-slate-400 text-xs font-semibold mt-0.5">Visualize your clinic session volume, patient success, and estimated billings over time.</p>
                                </div>

                                <div className="space-y-8">
                                    {/* Premium Interactive Graph Representation */}
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="font-extrabold text-slate-800 text-sm">Monthly Session Volume</h3>
                                                <p className="text-[11px] text-slate-500 font-medium">Estimated consultations & appointments</p>
                                            </div>
                                            <span className="px-2.5 py-1 bg-white border border-slate-100 rounded-lg text-xs font-extrabold text-slate-600 flex items-center gap-1 shadow-sm">
                                                <span className="w-2 h-2 rounded-full bg-blue-600"></span> 2026 Season
                                            </span>
                                        </div>

                                        {/* Harmonized SVG Line Graph Visual */}
                                        <div className="relative h-48 w-full flex items-end">
                                            {/* Graph Line Background Grid */}
                                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                                <div className="border-b border-slate-200/50 w-full h-px"></div>
                                            </div>

                                            {/* Beautiful custom styled SVG path for data visual representation */}
                                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                                                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                                                    </linearGradient>
                                                </defs>
                                                {/* Graph fill area */}
                                                {chartData.fillPath && <path d={chartData.fillPath} fill="url(#grad)" />}
                                                {/* Graph path line */}
                                                {chartData.linePath && <path d={chartData.linePath} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />}
                                                
                                                {/* Glow dots at peaks */}
                                                {chartData.points.map((pt, idx) => (
                                                    <g key={idx}>
                                                        <circle cx={pt.x} cy={pt.y} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
                                                        <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="text-[8px] font-black fill-slate-700">{pt.count > 0 ? pt.count : ''}</text>
                                                    </g>
                                                ))}
                                            </svg>

                                            {/* Months indicators */}
                                            <div className="absolute -bottom-6 w-full flex justify-between px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                                                {chartData.months.map((m, idx) => (
                                                    <span key={idx}>{m.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Secondary analytics metrics breakdown */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-5 border border-slate-100 rounded-2xl bg-[#fafbfd]">
                                            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4">Patient Fulfillment Rate</h4>
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                                                    {/* Circular indicator */}
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                                                        <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - (nonCancelledCount > 0 ? fulfillmentRate / 100 : 0))} />
                                                    </svg>
                                                    <span className="absolute text-xs font-black text-slate-800">
                                                        {nonCancelledCount > 0 ? `${fulfillmentRate}%` : 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {nonCancelledCount > 0 ? (fulfillmentRate >= 80 ? 'Outstanding clinical fidelity' : 'Improving fidelity') : 'No appointments yet'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-semibold mt-1">
                                                        {nonCancelledCount > 0 
                                                            ? `${fulfillmentRate}% of booked consultations were concluded successfully.` 
                                                            : 'Bookings will update your fulfillment score dynamically.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 border border-slate-100 rounded-2xl bg-[#fafbfd]">
                                            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4">Quality & Ratings</h4>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-16 h-16 rounded-2xl flex flex-col justify-center items-center shrink-0 border ${
                                                    averageRating 
                                                        ? 'bg-amber-50 text-amber-500 border-amber-100' 
                                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                                }`}>
                                                    <span className="text-lg font-black leading-none">
                                                        {averageRating || 'N/A'}
                                                    </span>
                                                    <span className="material-symbols-outlined text-[14px] mt-1" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {averageRating ? 'Excellent Client Feedback' : 'No reviews yet'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-semibold mt-1">
                                                        {averageRating 
                                                            ? `Based on ${reviews.length} reviews submitted by pet parents who completed appointments.` 
                                                            : 'Authenticate client feedback will build your specialty rating here.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Client Reviews Hub */}
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mt-8">
                                        <h3 className="font-extrabold text-slate-800 text-sm mb-4">Client Feedback & Reviews</h3>
                                        {reviews.length === 0 ? (
                                            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                                                <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">rate_review</span>
                                                <h4 className="font-bold text-slate-700 text-xs">No client reviews yet</h4>
                                                <p className="text-slate-400 text-[10px] mt-1">When pet parents leave ratings after completed appointments, they will show up here.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                                {reviews.map((rev) => (
                                                    <div key={rev.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <img 
                                                                    src={rev.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.first_name)}&background=d4e3ff&color=005da7`} 
                                                                    className="w-8 h-8 rounded-full border border-slate-100 object-cover" 
                                                                    alt={rev.first_name}
                                                                />
                                                                <div>
                                                                    <h4 className="font-bold text-slate-800 text-xs">{rev.first_name} {rev.last_name || ''}</h4>
                                                                    <p className="text-[10px] text-slate-400 font-semibold">{new Date(rev.created_at).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 text-amber-500 font-black text-xs">
                                                                <span>{rev.rating}</span>
                                                                <span className="material-symbols-outlined text-[10px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-600 font-medium italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                                            "{rev.comment}"
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProfessionalDashboard;
