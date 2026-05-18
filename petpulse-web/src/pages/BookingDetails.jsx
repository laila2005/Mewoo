import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const BookingDetails = () => {
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('id');
    const { token } = useAuth();
    const navigate = useNavigate();

    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!appointmentId) {
            toast.error('No appointment specified.');
            navigate('/appointments');
            return;
        }

        const fetchDetails = async () => {
            try {
                // Assuming we fetch all and filter, or there's a specific endpoint. Let's fetch all and filter.
                const res = await axios.get(`${API_BASE}/bookings/appointments`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const appt = res.data.appointments?.find(a => a.id == appointmentId);
                if (appt) {
                    setAppointment(appt);
                } else {
                    toast.error('Appointment not found.');
                    navigate('/appointments');
                }
            } catch (error) {
                console.error("Failed to load appointment", error);
                toast.error('Error loading appointment details.');
                navigate('/appointments');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [appointmentId, token, navigate]);

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading details...</div>;
    }

    if (!appointment) return null;

    const dateObj = new Date(appointment.appointment_time);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
        
        try {
            await axios.put(`${API_BASE}/bookings/appointments/${appointmentId}`, {
                status: 'cancelled'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Appointment cancelled successfully.');
            navigate('/appointments');
        } catch (error) {
            toast.error('Failed to cancel appointment.');
        }
    };

    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-emerald-400"></div>
                    
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-2xl font-extrabold text-slate-900">Booking Reference</h1>
                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-slate-200">
                                PET-{new Date(appointment.created_at || Date.now()).getFullYear()}-{appointment.id.toString().padStart(4, '0')}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">event_available</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Appointment Confirmed</h3>
                                <p className="text-sm text-slate-500">Your session is scheduled and confirmed.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Provider</p>
                                    <p className="text-base font-bold text-slate-800">{appointment.provider_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</p>
                                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-md border border-green-100 uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        {appointment.status}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6 grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Date</p>
                                    <p className="text-base font-bold text-slate-800">{dateStr}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Time</p>
                                    <p className="text-base font-bold text-slate-800">{timeStr}</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Reason for Visit / Details</p>
                                <p className="text-base font-medium text-slate-700">{appointment.reason || 'General checkup / Training'}</p>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-slate-100 flex gap-4">
                            <button onClick={handleCancel} className="flex-1 py-3.5 border-2 border-red-100 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-colors">
                                Cancel Appointment
                            </button>
                            <button onClick={() => navigate('/appointments')} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                                View All Appointments
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingDetails;
