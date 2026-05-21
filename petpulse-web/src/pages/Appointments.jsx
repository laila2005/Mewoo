import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const Appointments = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('upcoming');
    
    // Reschedule modal state
    const [rescheduleModal, setRescheduleModal] = useState(null); // holds appointment object
    const [newDateTime, setNewDateTime] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [isCancelling, setIsCancelling] = useState(null); // holds apt id

    useEffect(() => {
        fetchAppointments();
    }, [token]);

    const fetchAppointments = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/bookings/appointments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(res.data.appointments || []);
        } catch (error) {
            console.error("Failed to load appointments:", error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
        setIsCancelling(id);
        try {
            await axios.put(`${API_BASE}/bookings/appointments/${id}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Appointment cancelled');
            fetchAppointments();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to cancel appointment');
        } finally {
            setIsCancelling(null);
        }
    };

    const handleReschedule = async () => {
        if (!newDateTime) { toast.error('Please select a new date and time'); return; }
        if (new Date(newDateTime) <= new Date()) { toast.error('Please select a future date and time'); return; }
        
        setIsRescheduling(true);
        try {
            await axios.put(`${API_BASE}/bookings/appointments/${rescheduleModal.id}/reschedule`, 
                { appointment_time: new Date(newDateTime).toISOString() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Appointment rescheduled!');
            setRescheduleModal(null);
            setNewDateTime('');
            fetchAppointments();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reschedule appointment');
        } finally {
            setIsRescheduling(false);
        }
    };

    const openReschedule = (apt) => {
        // Pre-fill with current appointment time
        const current = new Date(apt.appointment_time);
        const localISO = new Date(current.getTime() - current.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        setNewDateTime(localISO);
        setRescheduleModal(apt);
    };

    const filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_time);
        const now = new Date();
        if (activeFilter === 'upcoming') {
            return (aptDate >= now || apt.status === 'pending' || apt.status === 'confirmed') && apt.status !== 'cancelled';
        } else {
            return aptDate < now || apt.status === 'completed' || apt.status === 'cancelled';
        }
    });

    // Min datetime for input (now + 1 hour)
    const minDateTime = new Date(Date.now() + 60 * 60 * 1000);
    const minDateTimeLocal = new Date(minDateTime.getTime() - minDateTime.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6">
            {/* Reschedule Modal */}
            {rescheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-extrabold text-slate-900">Reschedule Appointment</h3>
                            <button onClick={() => setRescheduleModal(null)} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-[20px] text-slate-600">close</span>
                            </button>
                        </div>

                        <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
                            <p className="text-sm font-bold text-blue-800">{rescheduleModal.clinic_name || 'Veterinary Consultation'}</p>
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                Currently: {new Date(rescheduleModal.appointment_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Select New Date & Time</label>
                            <input
                                type="datetime-local"
                                value={newDateTime}
                                min={minDateTimeLocal}
                                onChange={e => setNewDateTime(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-slate-50 transition-all"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRescheduleModal(null)}
                                className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReschedule}
                                disabled={isRescheduling}
                                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isRescheduling ? (
                                    <><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Saving...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-[18px]">event</span> Confirm</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto flex gap-8">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 hidden lg:block self-start sticky top-24">
                    <div className="mb-6">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Menu</div>
                        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">grid_view</span> Home
                        </Link>
                        <Link to="/owner-profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">pets</span> My Pets
                        </Link>
                        <Link to="/appointments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 transition-colors">
                            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>calendar_today</span> Appointments
                        </Link>
                        <Link to="/community" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">groups</span> Community
                        </Link>
                    </div>
                    <div className="mb-6">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Discover</div>
                        <Link to="/explore" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">explore</span> Explore
                        </Link>
                        <Link to="/vet-booking" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">medical_services</span> Find a Vet
                        </Link>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    {/* ── Back Navigation ── */}
                    <div className="mb-6 flex justify-start">
                        <Link 
                            to="/"
                            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-200 active:scale-[0.98] group"
                        >
                            <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:-translate-x-0.5">arrow_back</span>
                            <span className="text-sm font-bold">Back to Home</span>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Appointments</h1>
                        <p className="text-slate-500 mt-1">Manage your upcoming and past vet and trainer bookings.</p>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4 mb-6 border-b border-slate-200">
                        <button 
                            onClick={() => setActiveFilter('upcoming')}
                            className={`pb-3 font-semibold text-sm px-2 transition-colors ${activeFilter === 'upcoming' ? 'border-b-2 border-blue-600 text-blue-600' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Upcoming
                        </button>
                        <button 
                            onClick={() => setActiveFilter('past')}
                            className={`pb-3 font-semibold text-sm px-2 transition-colors ${activeFilter === 'past' ? 'border-b-2 border-blue-600 text-blue-600' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Past & Cancelled
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-slate-400">
                            <span className="material-symbols-outlined animate-spin text-3xl mb-2">refresh</span>
                            <p>Loading appointments...</p>
                        </div>
                    ) : filteredAppointments.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">calendar_today</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">No {activeFilter === 'upcoming' ? 'upcoming' : 'past'} appointments</h3>
                            <p className="text-slate-500 mb-6 text-sm">You don't have any {activeFilter === 'upcoming' ? 'upcoming' : 'past'} bookings right now.</p>
                            <Link to="/vet-booking" className="inline-block bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                                Find a Vet
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAppointments.map(apt => {
                                const d = new Date(apt.appointment_time);
                                const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                const isUpcoming = activeFilter === 'upcoming';
                                const isCancellingThis = isCancelling === apt.id;
                                
                                const statusBadge = {
                                    confirmed: <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Confirmed</span>,
                                    completed: <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Completed</span>,
                                    pending:   <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Pending</span>,
                                    cancelled: <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Cancelled</span>,
                                }[apt.status];

                                return (
                                    <div key={apt.id} className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center gap-6">
                                        <div className="flex flex-col items-center justify-center bg-blue-50 rounded-xl p-3 min-w-[80px]">
                                            <span className="text-blue-600 font-extrabold text-2xl leading-none">{d.getDate()}</span>
                                            <span className="text-blue-800 font-semibold text-xs uppercase">{d.toLocaleString('en-US', {month: 'short'})}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="text-lg font-bold text-slate-900">{apt.clinic_name || 'Veterinary Consultation'}</h3>
                                                {statusBadge}
                                            </div>
                                            <div className="text-sm text-slate-500 mb-3 flex flex-wrap items-center gap-4">
                                                <span className="flex items-center gap-1.5 font-medium"><span className="material-symbols-outlined text-[16px]">schedule</span> {timeStr}</span>
                                                <span className="flex items-center gap-1.5 font-medium"><span className="material-symbols-outlined text-[16px]">pets</span> {apt.pet_name} ({apt.species})</span>
                                            </div>
                                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{apt.reason}</p>
                                        </div>
                                        {isUpcoming && apt.status !== 'cancelled' && (
                                            <div className="sm:border-l sm:border-slate-100 sm:pl-6 flex sm:flex-col gap-2">
                                                <button
                                                    onClick={() => openReschedule(apt)}
                                                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold text-sm py-2 px-4 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">event</span> Reschedule
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(apt.id)}
                                                    disabled={isCancellingThis}
                                                    className="flex-1 text-red-500 font-bold text-sm py-2 px-4 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                                >
                                                    {isCancellingThis ? <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> : <span className="material-symbols-outlined text-[16px]">cancel</span>}
                                                    {isCancellingThis ? 'Cancelling...' : 'Cancel'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Appointments;
