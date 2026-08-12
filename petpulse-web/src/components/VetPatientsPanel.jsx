import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination, { usePagination } from './common/Pagination';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });

const STATUS_STYLE = {
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-slate-100 text-slate-600',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-600',
};

/** Vet dashboard "Patients" tab — list of treated pets + per-patient history record. */
const VetPatientsPanel = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);     // pet history { pet, visits, records }
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE}/providers/patients`, { headers: { Authorization: `Bearer ${token}` } });
                setPatients(res.data.patients || []);
            } catch (e) {
                console.error('Failed to load patients', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    const openHistory = async (petId) => {
        setHistoryLoading(true);
        setSelected({ loading: true });
        try {
            const res = await axios.get(`${API_BASE}/providers/patients/${petId}/history`, { headers: { Authorization: `Bearer ${token}` } });
            setSelected(res.data);
        } catch (e) {
            setSelected(null);
        } finally {
            setHistoryLoading(false);
        }
    };

    const filtered = patients.filter(p =>
        !search || `${p.name} ${p.species} ${p.breed || ''} ${p.owner_first} ${p.owner_last}`.toLowerCase().includes(search.toLowerCase())
    );

    // Same problem as the Work Tracker: the grid grows without bound.
    const patientPage = usePagination(filtered, 6);

    const avatar = (p) => p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'Pet')}&background=dbeafe&color=2563eb`;

    return (
        <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">My Patients</h2>
                    {/* Was "Every pet you've treated" — untrue: the list is every pet
                        BOOKED with this clinic, and with the visit count corrected to
                        exclude cancelled and future bookings, most have zero visits. */}
                    <p className="text-slate-400 text-xs font-semibold mt-0.5">Pets booked with your clinic, with their full visit history.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl text-slate-500 font-bold">Total: {patients.length}</span>
                </div>
            </div>

            <div className="mb-6 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients or owners…"
                    className="w-full bg-transparent border-none focus:ring-0 py-2.5 outline-none text-sm text-slate-800" />
            </div>

            {loading ? (
                <div className="text-center py-16 text-slate-400"><span className="material-symbols-outlined animate-spin text-3xl">refresh</span><p className="text-sm mt-2">Loading patients…</p></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><span className="material-symbols-outlined text-3xl">pets</span></div>
                    <h3 className="font-bold text-slate-800">No patients yet</h3>
                    <p className="text-sm text-slate-500 mt-1">Pets you treat will appear here after their first appointment.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {patientPage.slice.map(p => (
                        <button key={p.id} onClick={() => openHistory(p.id)}
                            className="text-left bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4 group">
                            <img src={avatar(p)} alt={p.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 bg-slate-50 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900 truncate">{p.name}</h3>
                                    <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shrink-0">{p.species}</span>
                                </div>
                                {/* Signalment first — it is what a vet reads to place the
                                    animal. age/sex/weight are only ~half filled across the
                                    data, so each is dropped rather than rendered blank. */}
                                <p className="text-xs text-slate-500 truncate">
                                    {[p.breed || 'Mixed',
                                      p.age_years != null ? `${p.age_years}y` : null,
                                      p.gender || null,
                                      p.weight_kg != null ? `${p.weight_kg}kg` : null,
                                    ].filter(Boolean).join(' · ')}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{p.owner_first} {p.owner_last}</p>
                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[13px]">event</span>{p.visit_count} visit{p.visit_count === 1 ? '' : 's'}</span>
                                    {p.last_visit && <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[13px]">history</span>{fmtDate(p.last_visit)}</span>}
                                    {/* An upcoming booking is the single most actionable fact
                                        on this row, and it used to be silently folded into
                                        "last visit" — a future date shown as the last one. */}
                                    {p.next_visit && (
                                        <span className="flex items-center gap-0.5 text-blue-600 font-bold">
                                            <span className="material-symbols-outlined text-[13px]">event_upcoming</span>{fmtDate(p.next_visit)}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">chevron_right</span>
                        </button>
                    ))}
                    </div>
                    <Pagination {...patientPage} label="patients" />
                </>
            )}

            {/* History record modal */}
            {selected && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {selected.loading || historyLoading ? (
                            <div className="p-16 text-center text-slate-400"><span className="material-symbols-outlined animate-spin text-3xl">refresh</span></div>
                        ) : selected.pet ? (
                            <>
                                <div className="p-6 border-b border-slate-100 flex items-start gap-4">
                                    <img src={avatar(selected.pet)} alt={selected.pet.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 bg-slate-50" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-black text-slate-900">{selected.pet.name}</h3>
                                        <p className="text-sm text-slate-500">{selected.pet.breed || 'Mixed'} · {selected.pet.species}{selected.pet.age_years ? ` · ${selected.pet.age_years} yrs` : ''}{selected.pet.weight_kg ? ` · ${selected.pet.weight_kg} kg` : ''}</p>
                                    </div>
                                    <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined text-[20px]">close</span></button>
                                </div>

                                {/* Owner */}
                                <div className="p-6 border-b border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Owner</p>
                                    <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {selected.pet.owner_avatar
                                                ? <img src={selected.pet.owner_avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200" />
                                                : <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">{(selected.pet.owner_first || 'U')[0].toUpperCase()}</div>}
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">{selected.pet.owner_first} {selected.pet.owner_last}</p>
                                                {/* A clinic calls people. The phone was rendered as dead
                                                    text and the email was fetched and never shown. */}
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {selected.pet.owner_phone && (
                                                        <a href={`tel:${selected.pet.owner_phone}`} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-[13px]">call</span>{selected.pet.owner_phone}
                                                        </a>
                                                    )}
                                                    {selected.pet.owner_email && (
                                                        <a href={`mailto:${selected.pet.owner_email}`} className="text-xs text-slate-500 hover:underline truncate flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-[13px]">mail</span>{selected.pet.owner_email}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => navigate(`/messages?user=${selected.pet.owner_id}`)} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">chat</span> Message
                                        </button>
                                    </div>
                                </div>

                                {/* Visit history */}
                                <div className="p-6">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Visit History ({selected.visits.length})</p>
                                    <div className="space-y-3">
                                        {selected.visits.map((v, i) => (
                                            <div key={v.id} className="relative pl-6">
                                                <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100"></span>
                                                {i < selected.visits.length - 1 && <span className="absolute left-[4px] top-4 bottom-[-12px] w-0.5 bg-slate-100"></span>}
                                                <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className="text-xs font-bold text-slate-800">{fmtDateTime(v.appointment_time)}</span>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${STATUS_STYLE[v.status] || 'bg-slate-100 text-slate-600'}`}>{v.status}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600">{v.reason || 'General check-up'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selected.records && selected.records.length > 0 && (
                                        <>
                                            {/* summary holds {allergies, past_surgeries, vaccines, notes}
                                                and was fetched then discarded in favour of a link that
                                                just said "Document". It is AI-extracted with no OCR, so
                                                it is shown as UNVERIFIED — useful to a vet as a prompt,
                                                never presentable as clinical fact. */}
                                            {(() => {
                                                const merge = (k) => selected.records.flatMap(r => {
                                                    const v = r.summary?.[k];
                                                    return Array.isArray(v) ? v : (v ? [v] : []);
                                                }).filter(Boolean);
                                                const allergies = merge('allergies');
                                                const surgeries = merge('past_surgeries');
                                                if (!allergies.length && !surgeries.length) return null;
                                                return (
                                                    <div className="mt-6 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From uploaded records</p>
                                                            <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">Unverified</span>
                                                        </div>
                                                        {allergies.length > 0 && (
                                                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                                                                <p className="text-[10px] font-black uppercase text-rose-700 mb-1">Allergies</p>
                                                                <p className="text-xs text-rose-900">{allergies.join(', ')}</p>
                                                            </div>
                                                        )}
                                                        {surgeries.length > 0 && (
                                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                                <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Past surgeries</p>
                                                                <p className="text-xs text-slate-700">{surgeries.join(', ')}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">Medical Documents ({selected.records.length})</p>
                                            <div className="space-y-2">
                                                {selected.records.map(r => (
                                                    <a key={r.id} href={r.document_url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                                                        <span className="material-symbols-outlined text-[18px]">description</span>
                                                        Document · {fmtDate(r.created_at)}
                                                    </a>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-10 text-center text-slate-500">Couldn't load this patient's history.</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default VetPatientsPanel;
