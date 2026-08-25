import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const EMPTY_FORM = { title: '', description: '', sessions_count: '', duration_weeks: '', price: '', capacity: '' };

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Trainer dashboard "Programs" tab — create/manage training programs and
 *  group classes, view each one's roster (active + waitlisted), and leave
 *  progress notes visible to the enrolled owner. */
const TrainerProgramsPanel = () => {
    const { token } = useAuth();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);

    const [expandedId, setExpandedId] = useState(null);
    const [roster, setRoster] = useState([]);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [noteDrafts, setNoteDrafts] = useState({});
    const [notesByEnrollment, setNotesByEnrollment] = useState({});

    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    const loadPrograms = async () => {
        try {
            const res = await axios.get(`${API_BASE}/programs/mine`, authHeader);
            setPrograms(res.data.programs || []);
        } catch (e) {
            console.error('Failed to load programs', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (token) loadPrograms(); }, [token]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.price) { toast.error('Title and price are required.'); return; }
        setSubmitting(true);
        try {
            await axios.post(`${API_BASE}/programs`, {
                title: form.title.trim(),
                description: form.description.trim() || null,
                sessions_count: form.sessions_count ? Number(form.sessions_count) : null,
                duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
                price: Number(form.price),
                capacity: form.capacity ? Number(form.capacity) : null,
            }, authHeader);
            toast.success('Program created.');
            setForm(EMPTY_FORM);
            setShowForm(false);
            loadPrograms();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create program');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleArchive = async (program) => {
        try {
            const nextStatus = program.status === 'active' ? 'archived' : 'active';
            await axios.put(`${API_BASE}/programs/${program.id}`, { status: nextStatus }, authHeader);
            toast.success(nextStatus === 'archived' ? 'Program archived.' : 'Program reactivated.');
            loadPrograms();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update program');
        }
    };

    const openRoster = async (programId) => {
        if (expandedId === programId) { setExpandedId(null); return; }
        setExpandedId(programId);
        setRosterLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/programs/${programId}/roster`, authHeader);
            setRoster(res.data.roster || []);
        } catch (e) {
            toast.error('Failed to load roster');
            setRoster([]);
        } finally {
            setRosterLoading(false);
        }
    };

    const loadNotes = async (enrollmentId) => {
        try {
            const res = await axios.get(`${API_BASE}/programs/enrollments/${enrollmentId}/notes`, authHeader);
            setNotesByEnrollment(prev => ({ ...prev, [enrollmentId]: res.data.notes || [] }));
        } catch (e) {
            toast.error('Failed to load notes');
        }
    };

    const submitNote = async (enrollmentId) => {
        const text = (noteDrafts[enrollmentId] || '').trim();
        if (!text) return;
        try {
            await axios.post(`${API_BASE}/programs/enrollments/${enrollmentId}/notes`, { note: text }, authHeader);
            setNoteDrafts(prev => ({ ...prev, [enrollmentId]: '' }));
            toast.success('Note added.');
            loadNotes(enrollmentId);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add note');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-400 text-sm">Loading programs…</div>;
    }

    return (
        <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Training Programs</h2>
                    <p className="text-slate-400 text-xs font-semibold mt-0.5">
                        1:1 programs and group classes. Leave capacity empty for 1:1 — set it for a group class with a waitlist.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(s => !s)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    {showForm ? 'Cancel' : 'New Program'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-slate-50 rounded-2xl border border-slate-100 p-5 mb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Title *</label>
                            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g. Puppy Basics Group Class"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Description</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                rows="2" placeholder="What this program covers"
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 resize-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Sessions</label>
                            <input type="number" min="1" value={form.sessions_count} onChange={e => setForm({ ...form, sessions_count: e.target.value })}
                                placeholder="6" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Duration (weeks)</label>
                            <input type="number" min="1" value={form.duration_weeks} onChange={e => setForm({ ...form, duration_weeks: e.target.value })}
                                placeholder="6" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Price (EGP) *</label>
                            <input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                                placeholder="1200" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Capacity (group class only)</label>
                            <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                                placeholder="Leave empty for 1:1" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <button type="submit" disabled={submitting}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors">
                        {submitting ? 'Creating…' : 'Create Program'}
                    </button>
                </form>
            )}

            {programs.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">school</span>
                    <h4 className="font-bold text-slate-700">No programs yet</h4>
                    <p className="text-slate-400 text-xs mt-1">Create a program or group class for pet owners to enroll in.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {programs.map(p => (
                        <div key={p.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-slate-800">{p.title}</h4>
                                        {p.status === 'archived' && (
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase">Archived</span>
                                        )}
                                        {p.capacity != null && (
                                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase">Group · {p.active_count}/{p.capacity}</span>
                                        )}
                                        {p.capacity == null && (
                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase">1:1</span>
                                        )}
                                        {p.waitlisted_count > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase">{p.waitlisted_count} waitlisted</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">
                                        {p.price} EGP{p.sessions_count ? ` · ${p.sessions_count} sessions` : ''}{p.duration_weeks ? ` · ${p.duration_weeks} weeks` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => openRoster(p.id)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">groups</span>
                                        {expandedId === p.id ? 'Hide Roster' : 'View Roster'}
                                    </button>
                                    <button onClick={() => toggleArchive(p)}
                                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl transition-all">
                                        {p.status === 'active' ? 'Archive' : 'Reactivate'}
                                    </button>
                                </div>
                            </div>

                            {expandedId === p.id && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                                    {rosterLoading ? (
                                        <p className="text-xs text-slate-400">Loading roster…</p>
                                    ) : roster.length === 0 ? (
                                        <p className="text-xs text-slate-400">No one enrolled yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {roster.map(r => (
                                                <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="text-sm font-bold text-slate-800">
                                                            {r.owner_first_name} {r.owner_last_name}
                                                            {r.pet_name && <span className="text-slate-400 font-semibold"> · {r.pet_name}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                                r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                {r.status}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-semibold">Enrolled {fmtDate(r.enrolled_at)}</span>
                                                        </div>
                                                    </div>

                                                    {r.status === 'active' && (
                                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                                            {!notesByEnrollment[r.id] && (
                                                                <button onClick={() => loadNotes(r.id)} className="text-xs font-bold text-blue-600 hover:underline">
                                                                    Show progress notes
                                                                </button>
                                                            )}
                                                            {notesByEnrollment[r.id] && (
                                                                <div className="space-y-2 mb-2">
                                                                    {notesByEnrollment[r.id].length === 0 ? (
                                                                        <p className="text-[11px] text-slate-400">No notes yet.</p>
                                                                    ) : notesByEnrollment[r.id].map(n => (
                                                                        <p key={n.id} className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2">
                                                                            <span className="text-slate-400 font-semibold">{fmtDate(n.created_at)} — </span>{n.note}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <input
                                                                    value={noteDrafts[r.id] || ''}
                                                                    onChange={e => setNoteDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                                                                    onKeyDown={e => e.key === 'Enter' && submitNote(r.id)}
                                                                    placeholder="Add a progress note…"
                                                                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                                                                />
                                                                <button onClick={() => submitNote(r.id)}
                                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors">
                                                                    Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrainerProgramsPanel;
