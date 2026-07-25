import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

/**
 * Reusable appointments UI (list + reschedule + cancel). Rendered inside the
 * Profile page's "Appointments" tab — no sidebar / page chrome of its own, so
 * it stays consistent with the rest of the profile.
 */
const AppointmentsPanel = () => {
    const { token } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('upcoming');
    const [rescheduleModal, setRescheduleModal] = useState(null);
    const [newDateTime, setNewDateTime] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [isCancelling, setIsCancelling] = useState(null);

    useEffect(() => { fetchAppointments(); }, [token]);

    const fetchAppointments = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/bookings/appointments`, { headers: { Authorization: `Bearer ${token}` } });
            setAppointments(res.data.appointments || []);
        } catch (error) {
            console.error('Failed to load appointments:', error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
        setIsCancelling(id);
        try {
            await axios.put(`${API_BASE}/bookings/appointments/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
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
                { headers: { Authorization: `Bearer ${token}` } });
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
        const current = new Date(apt.appointment_time);
        setNewDateTime(new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        setRescheduleModal(apt);
    };

    const filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_time);
        const now = new Date();
        if (activeFilter === 'upcoming') {
            return (aptDate >= now || apt.status === 'pending' || apt.status === 'confirmed') && apt.status !== 'cancelled';
        }
        return aptDate < now || apt.status === 'completed' || apt.status === 'cancelled';
    });

    const minDateTime = new Date(Date.now() + 60 * 60 * 1000);
    const minDateTimeLocal = new Date(minDateTime.getTime() - minDateTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    return (
        <div>
            {/* Reschedule Modal */}
            {rescheduleModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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
                            <label className="block text-sm font-bold text-slate-700 mb-2">Select New Date &amp; Time</label>
                            <input type="datetime-local" value={newDateTime} min={minDateTimeLocal} onChange={e => setNewDateTime(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-slate-50 transition-all" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setRescheduleModal(null)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={handleReschedule} disabled={isRescheduling}
                                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-60 flex items-center justify-center gap-2">
                                {isRescheduling ? (<><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Saving...</>) : (<><span className="material-symbols-outlined text-[18px]">event</span> Confirm</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                {['upcoming', 'past'].map(f => (
                    <button key={f} onClick={() => setActiveFilter(f)}
                        className={`pb-3 font-semibold text-sm px-2 transition-colors ${activeFilter === f ? 'border-b-2 border-blue-600 text-blue-600' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {f === 'upcoming' ? 'Upcoming' : 'Past & Cancelled'}
                    </button>
                ))}
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
                    <Link to="/vet-booking" className="inline-block bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">Find a Vet</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAppointments.map(apt => {
                        const d = new Date(apt.appointment_time);
                        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });
                        const isUpcoming = activeFilter === 'upcoming';
                        const isCancellingThis = isCancelling === apt.id;
                        const statusBadge = {
                            confirmed: <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Confirmed</span>,
                            completed: <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Completed</span>,
                            pending: <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Pending</span>,
                            cancelled: <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Cancelled</span>,
                        }[apt.status];
                        return (
                            <div key={apt.id} className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center gap-6">
                                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-xl p-3 min-w-[80px] self-start sm:self-auto">
                                    <span className="text-blue-600 font-extrabold text-2xl leading-none">{d.getDate()}</span>
                                    <span className="text-blue-800 font-semibold text-xs uppercase">{d.toLocaleString('en-US', { month: 'short' })}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1 gap-2">
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
                                        <button onClick={() => openReschedule(apt)}
                                            className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold text-sm py-2 px-4 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">event</span> Reschedule
                                        </button>
                                        <button onClick={() => handleCancel(apt.id)} disabled={isCancellingThis}
                                            className="flex-1 text-red-500 font-bold text-sm py-2 px-4 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
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
        </div>
    );
};

export default AppointmentsPanel;
