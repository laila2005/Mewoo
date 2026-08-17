import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

/**
 * Report a shop, product, post or lost-pet listing.
 *
 * The reason list is fetched rather than hardcoded, so the dialog and the
 * server can never drift into disagreeing about what a valid reason is.
 *
 * @param {'shop'|'product'|'post'|'lost_pet'} targetType
 */
const ReportDialog = ({ targetType, targetId, targetLabel, onClose }) => {
  const { user, token } = useAuth();
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/reports/reasons`)
      .then((r) => setReasons(r.data.reasons || []))
      .catch(() => setReasons([]));
  }, []);

  // Escape closes, and focus is trapped to the dialog's own first control.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) { toast.error('Please choose a reason'); return; }
    setSending(true);
    try {
      const res = await axios.post(`${API_BASE}/reports`,
        { target_type: targetType, target_id: targetId, reason, details },
        { headers: { Authorization: `Bearer ${token}` } });
      setSent(true);
      toast.success(res.data.message || 'Report sent');
    } catch (err) {
      // The server explains exactly why — already reported, own listing, daily
      // ceiling — and those are the messages worth showing.
      toast.error(err?.response?.data?.error || 'Could not send that report.');
      if (err?.response?.status === 409) setSent(true);
    } finally {
      setSending(false);
    }
  };

  const needsDetail = reason === 'other';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
         onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-title"
           className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">flag</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="report-title" className="text-lg font-extrabold text-slate-900 leading-tight">
              {sent ? 'Report received' : 'Report this listing'}
            </h2>
            {targetLabel && !sent && (
              <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">{targetLabel}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close"
                  className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {sent ? (
          <div className="p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our team will review this. We only act after checking, so nothing happens to a
              listing automatically.
            </p>
            <button onClick={onClose}
                    className="mt-5 w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-sm transition-colors">
              Done
            </button>
          </div>
        ) : !user ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-600">You need to be signed in to report a listing.</p>
            <a href="/login"
               className="mt-4 inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-colors">
              Sign in
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4">
            <fieldset>
              <legend className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                What is wrong?
              </legend>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {reasons.map((r) => (
                  <label key={r.key}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      reason === r.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="reason" value={r.key}
                           checked={reason === r.key}
                           onChange={() => setReason(r.key)}
                           className="accent-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="report-details" className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                Anything else? {needsDetail && <span className="text-rose-500 normal-case tracking-normal font-bold">Required</span>}
              </label>
              <textarea id="report-details" rows={3} maxLength={2000}
                value={details} onChange={(e) => setDetails(e.target.value)}
                placeholder="What happened, and when?"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors resize-none" />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Reports go to our moderation team, not to the shop. False reports may cost you the
              ability to send them.
            </p>

            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={sending || !reason}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm transition-colors">
                {sending ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportDialog;
