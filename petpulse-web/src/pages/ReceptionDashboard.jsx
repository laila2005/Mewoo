import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import SEO from '../components/common/SEO';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL
    || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Local YYYY-MM-DD. toISOString() would shift the date backwards for anyone
// east of UTC — which is everyone using this, since the clinic runs on
// Africa/Cairo — and show yesterday's diary before 02:00.
const isoDay = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const addDays = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    return isoDay(dt);
};

const timeOf = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const STATUS_STYLE = {
    pending: { chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Awaiting confirmation' },
    confirmed: { chip: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Confirmed' },
    completed: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Seen' },
    cancelled: { chip: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400', label: 'Cancelled' },
};

const TILES = [
    { key: 'total', label: 'Booked today', tone: 'text-slate-900' },
    { key: 'pending', label: 'To confirm', tone: 'text-amber-600' },
    { key: 'confirmed', label: 'Confirmed', tone: 'text-blue-600' },
    { key: 'completed', label: 'Seen', tone: 'text-emerald-600' },
    { key: 'cancelled', label: 'Cancelled', tone: 'text-slate-400' },
];

const ReceptionDashboard = () => {
    const { user } = useAuth();
    const today = useMemo(() => isoDay(new Date()), []);
    const [date, setDate] = useState(today);
    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [editing, setEditing] = useState(null); // appointment id being rescheduled
    const [newTime, setNewTime] = useState('');

    const loadSummary = useCallback(async () => {
        try {
            const r = await axios.get(`${API_BASE}/reception/summary`);
            setSummary(r.data);
        } catch (e) {
            // A failed summary should not blank the diary below it.
            console.error('Summary failed', e);
        }
    }, []);

    const loadDay = useCallback(async (day) => {
        setLoading(true);
        try {
            const r = await axios.get(`${API_BASE}/reception/appointments`, { params: { date: day } });
            setRows(r.data.appointments || []);
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Could not load the diary.');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { loadDay(date); }, [date, loadDay]);

    const act = async (id, status) => {
        setBusyId(id);
        try {
            await axios.patch(`${API_BASE}/reception/appointments/${id}/status`, { status });
            toast.success(status === 'cancelled' ? 'Appointment cancelled' : `Marked ${status}`);
            await Promise.all([loadDay(date), loadSummary()]);
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Could not update that appointment.');
        } finally {
            setBusyId(null);
        }
    };

    const submitReschedule = async (id) => {
        if (!newTime) return toast.error('Pick a new time first.');
        setBusyId(id);
        try {
            await axios.put(`${API_BASE}/reception/appointments/${id}/reschedule`, {
                appointment_time: new Date(newTime).toISOString(),
            });
            toast.success('Appointment moved');
            setEditing(null);
            setNewTime('');
            await Promise.all([loadDay(date), loadSummary()]);
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Could not move that appointment.');
        } finally {
            setBusyId(null);
        }
    };

    const clinicName = summary?.clinic?.clinic_name
        || (summary?.clinic ? `Dr. ${summary.clinic.first_name} ${summary.clinic.last_name}` : 'Your clinic');

    return (
        <div className="bg-[#f7faf9] min-h-[calc(100vh-80px)]">
            <SEO title="Reception — PetPluse" description="Front desk view for clinic assistants." />

            {/* Header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-[0.18em] px-3 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-[15px]">support_agent</span> Reception
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{clinicName}</h1>
                    </div>
                    <p className="text-slate-500 text-sm mt-2">
                        Signed in as <span className="font-semibold text-slate-700">{user?.first_name} {user?.last_name}</span> — front desk.
                        You can confirm, move and close appointments. Medical records stay with the vet.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Today at a glance */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    {TILES.map((t) => (
                        <div key={t.key} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                            <div className={`text-3xl font-black tracking-tight ${t.tone}`}>
                                {summary?.today?.[t.key] ?? '—'}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-1">{t.label}</div>
                        </div>
                    ))}
                </div>

                {/* Next up */}
                {summary?.next && (
                    <div className="bg-blue-600 text-white rounded-3xl p-6 mb-6 shadow-lg shadow-blue-600/20 flex flex-wrap items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[28px]">schedule</span>
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-100">Next in</div>
                            <div className="text-xl font-extrabold truncate">
                                {timeOf(summary.next.appointment_time)} — {summary.next.pet_name}
                            </div>
                            <div className="text-blue-100 text-sm truncate">
                                {summary.next.owner_first_name} {summary.next.owner_last_name}
                                {summary.next.owner_phone ? ` · ${summary.next.owner_phone}` : ''}
                            </div>
                        </div>
                        {summary.next.owner_phone && (
                            <a href={`tel:${summary.next.owner_phone}`}
                               className="ml-auto inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-5 py-2.5 rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all">
                                <span className="material-symbols-outlined text-[18px]">call</span> Call
                            </a>
                        )}
                    </div>
                )}

                {/* Day picker */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button onClick={() => setDate(addDays(date, -1))}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value || today)}
                           className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-600" />
                    <button onClick={() => setDate(addDays(date, 1))}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                    {date !== today && (
                        <button onClick={() => setDate(today)}
                                className="text-sm font-bold text-blue-600 hover:underline">Back to today</button>
                    )}
                    <span className="ml-auto text-sm text-slate-500">{rows.length} appointment{rows.length === 1 ? '' : 's'}</span>
                </div>

                {/* Diary */}
                {loading ? (
                    <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
                        <span className="material-symbols-outlined text-[44px] text-slate-300">event_available</span>
                        <p className="text-slate-500 mt-3 font-semibold">Nothing booked for this day.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rows.map((a) => {
                            const s = STATUS_STYLE[a.status] || STATUS_STYLE.pending;
                            const closed = a.status === 'cancelled' || a.status === 'completed';
                            return (
                                <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="text-center shrink-0 w-16">
                                            <div className="text-lg font-black text-slate-900">{timeOf(a.appointment_time)}</div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-slate-900 truncate">
                                                {a.pet_name}
                                                <span className="font-normal text-slate-400 text-sm"> · {a.species}{a.pet_breed ? ` · ${a.pet_breed}` : ''}</span>
                                            </div>
                                            <div className="text-sm text-slate-500 truncate">
                                                {a.owner_first_name} {a.owner_last_name}
                                                {a.owner_phone ? ` · ${a.owner_phone}` : ' · no phone on file'}
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.chip}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                                        </span>
                                        <div className="flex flex-wrap gap-2 ml-auto">
                                            {a.owner_phone && (
                                                <a href={`tel:${a.owner_phone}`}
                                                   className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100">
                                                    <span className="material-symbols-outlined text-[17px]">call</span> Call
                                                </a>
                                            )}
                                            {!closed && (
                                                <>
                                                    {a.status === 'pending' && (
                                                        <button disabled={busyId === a.id} onClick={() => act(a.id, 'confirmed')}
                                                                className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                                                            <span className="material-symbols-outlined text-[17px]">check</span> Confirm
                                                        </button>
                                                    )}
                                                    <button disabled={busyId === a.id} onClick={() => act(a.id, 'completed')}
                                                            className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
                                                        <span className="material-symbols-outlined text-[17px]">task_alt</span> Seen
                                                    </button>
                                                    <button disabled={busyId === a.id}
                                                            onClick={() => { setEditing(editing === a.id ? null : a.id); setNewTime(''); }}
                                                            className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-60">
                                                        <span className="material-symbols-outlined text-[17px]">edit_calendar</span> Move
                                                    </button>
                                                    <button disabled={busyId === a.id} onClick={() => act(a.id, 'cancelled')}
                                                            className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                                                        <span className="material-symbols-outlined text-[17px]">close</span> Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {editing === a.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                                            <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                                                   className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
                                            <button disabled={busyId === a.id} onClick={() => submitReschedule(a.id)}
                                                    className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60">
                                                Move appointment
                                            </button>
                                            <button onClick={() => { setEditing(null); setNewTime(''); }}
                                                    className="text-sm font-bold text-slate-500 hover:underline">Cancel</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceptionDashboard;
