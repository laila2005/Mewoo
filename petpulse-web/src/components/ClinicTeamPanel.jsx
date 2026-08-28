import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

/**
 * Clinic Team — a vet manages one or more reception assistants (secretaries).
 * The vet creates the account (assistant is emailed a temp password), and can
 * enable/disable or remove the seat. Assistants help with appointments without
 * full vet access.
 */
const ClinicTeamPanel = () => {
    const { token } = useAuth();
    const [assistants, setAssistants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '' });
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [lastCreated, setLastCreated] = useState(null); // { email, temporary_password }

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const load = async () => {
        try {
            const res = await axios.get(`${API_BASE}/clinic/assistants`, authHeaders);
            setAssistants(res.data.assistants || []);
        } catch (err) {
            console.error('Failed to load assistants:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
            toast.error('Please fill in the assistant\'s name and email.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE}/clinic/assistants`, {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
            }, authHeaders);
            setLastCreated({ email: res.data.assistant.email, temporary_password: res.data.temporary_password });
            toast.success('Assistant added — we emailed them their sign-in details.');
            setForm({ first_name: '', last_name: '', email: '' });
            setShowForm(false);
            load();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not add the assistant.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (a) => {
        try {
            await axios.patch(`${API_BASE}/clinic/assistants/${a.id}/status`, { disabled: !a.assistant_disabled }, authHeaders);
            setAssistants(prev => prev.map(x => x.id === a.id ? { ...x, assistant_disabled: !a.assistant_disabled } : x));
            toast.success(a.assistant_disabled ? 'Assistant re-enabled.' : 'Assistant disabled.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not update the assistant.');
        }
    };

    const remove = async (a) => {
        if (!window.confirm(`Remove ${a.first_name} ${a.last_name}? Their account will be deleted and they'll lose access.`)) return;
        try {
            await axios.delete(`${API_BASE}/clinic/assistants/${a.id}`, authHeaders);
            setAssistants(prev => prev.filter(x => x.id !== a.id));
            toast.success('Assistant removed.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Could not remove the assistant.');
        }
    };

    return (
        <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900">Clinic Team</h2>
                    <p className="text-sm text-slate-500 mt-1">Add a reception assistant to help manage appointments — without giving full clinic access.</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-xl">
                        Assistants sign in to their own front-desk screen: today&apos;s diary, confirming, moving and closing
                        appointments, and owner phone numbers. They never see the reason for a visit or any medical record,
                        and disabling a seat locks it out immediately.
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { setShowForm(true); setLastCreated(null); }}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Add assistant
                    </button>
                )}
            </div>

            {/* Temp-password confirmation (shown once) */}
            {lastCreated && (
                <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <p className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                        Assistant added
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                        We emailed sign-in details to <strong>{lastCreated.email}</strong>. If it doesn't arrive, share this temporary password (shown once):
                    </p>
                    <code className="inline-block mt-2 bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-sm font-mono text-emerald-900">{lastCreated.temporary_password}</code>
                </div>
            )}

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleCreate} className="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="First name" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Last name" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Assistant's email" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <div className="flex gap-2">
                        <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-60">
                            <span className="material-symbols-outlined text-[18px]">{submitting ? 'sync' : 'check'}</span>
                            {submitting ? 'Adding…' : 'Create account'}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50">Cancel</button>
                    </div>
                    <p className="text-xs text-slate-400">The assistant receives a temporary password by email and can accept or cancel appointments on your behalf.</p>
                </form>
            )}

            {/* List */}
            {loading ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading team…</div>
            ) : assistants.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                    <span className="material-symbols-outlined text-[40px] text-slate-300">groups</span>
                    <p className="text-sm text-slate-500 mt-2">No assistants yet. Add one to help run your reception.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {assistants.map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${a.assistant_disabled ? 'bg-slate-300' : 'bg-blue-500'}`}>
                                {(a.first_name?.[0] || 'A').toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">
                                    {a.first_name} {a.last_name}
                                    {a.assistant_disabled && <span className="ml-2 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Disabled</span>}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{a.email}</p>
                            </div>
                            <button
                                onClick={() => toggleStatus(a)}
                                className={`shrink-0 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${a.assistant_disabled ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                            >
                                {a.assistant_disabled ? 'Enable' : 'Disable'}
                            </button>
                            <button
                                onClick={() => remove(a)}
                                className="shrink-0 w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"
                                title="Remove assistant"
                            >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClinicTeamPanel;
