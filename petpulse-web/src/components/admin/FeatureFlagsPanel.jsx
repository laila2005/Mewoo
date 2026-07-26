import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const TOGGLES = [
  { key: 'vets', label: 'Vet booking & discovery', hint: 'Flip on when your first verified vet is ready.' },
  { key: 'marketplace', label: 'Marketplace / Shops', hint: 'Flip on when shops have listed products.' },
  { key: 'subscriptions', label: 'PulseBox paid subscriptions', hint: 'Flip on when payments are wired.' },
];

/** Admin control to flip soft-launch features live/coming-soon (no redeploy). */
const FeatureFlagsPanel = () => {
  const { token } = useAuth();
  const [flags, setFlags] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/public/feature-flags`)
      .then(r => setFlags(r.data?.flags || {}))
      .catch(() => setFlags({}));
  }, []);

  const toggle = async (key) => {
    const next = !(flags[key] !== false); // current live? -> flip
    setSaving(key);
    try {
      const res = await axios.put(`${API_BASE}/admin/settings/features`, { flags: { [key]: next } },
        { headers: { Authorization: `Bearer ${token}` } });
      setFlags(res.data?.flags || { ...flags, [key]: next });
      toast.success(`${TOGGLES.find(t => t.key === key)?.label} is now ${next ? 'LIVE' : 'Coming Soon'}`);
    } catch (e) {
      toast.error('Failed to update feature');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-blue-600">tune</span>
        <h2 className="text-lg font-bold text-slate-900">Feature Availability</h2>
      </div>
      <p className="text-xs text-slate-400 font-semibold mb-4">Turn partner-dependent features live the moment you're ready — takes effect immediately, no deploy.</p>
      {flags === null ? (
        <div className="text-sm text-slate-400 py-4">Loading…</div>
      ) : (
        <div className="space-y-2">
          {TOGGLES.map(t => {
            const live = flags[t.key] !== false;
            return (
              <div key={t.key} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div>
                  <p className="font-bold text-sm text-slate-800">{t.label}</p>
                  <p className="text-[11px] text-slate-400 font-semibold">{t.hint}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${live ? 'text-emerald-600' : 'text-amber-600'}`}>{live ? 'Live' : 'Coming soon'}</span>
                  <button
                    onClick={() => toggle(t.key)}
                    disabled={saving === t.key}
                    aria-label={`Toggle ${t.label}`}
                    className={`relative w-11 h-6 rounded-full transition-colors ${live ? 'bg-emerald-500' : 'bg-slate-300'} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${live ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeatureFlagsPanel;
