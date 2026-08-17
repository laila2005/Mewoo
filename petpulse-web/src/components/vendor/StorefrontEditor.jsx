import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const DAYS = [
  { key: 'sat', label: 'Saturday' }, { key: 'sun', label: 'Sunday' },
  { key: 'mon', label: 'Monday' },   { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },{ key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
];

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourshop' },
  { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourshop' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@yourshop' },
  { key: 'website',   label: 'Website',   placeholder: 'https://yourshop.com' },
];

const label = 'text-xs font-black text-slate-700 uppercase tracking-wider';
const input = 'w-full px-4 py-3 bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-semibold transition-all';

/**
 * The owner's storefront editor.
 *
 * Edits sit beside a live preview of the real page rather than describing a
 * page the owner then has to go and find. The completeness meter names what is
 * missing in terms of what it costs them — an empty storefront looks worse than
 * no storefront, so that state is the one to design against.
 */
const StorefrontEditor = ({ apiBase, token, shop, checklist, onSaved }) => {
  const [form, setForm] = useState({
    bio: '', logo_url: '', banner_url: '', phone: '', whatsapp: '',
    delivery_note: '', return_policy: '', founded_year: '',
  });
  const [hours, setHours] = useState({});
  const [socials, setSocials] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    if (!shop) return;
    setForm({
      bio: shop.bio || '',
      logo_url: shop.logo_url || '',
      banner_url: shop.banner_url || '',
      phone: shop.phone || '',
      whatsapp: shop.whatsapp || '',
      delivery_note: shop.delivery_note || '',
      return_policy: shop.return_policy || '',
      founded_year: shop.founded_year || '',
    });
    setHours(shop.hours || {});
    setSocials(shop.socials || {});
  }, [shop]);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const setDay = (day, field, value) =>
    setHours((h) => ({ ...h, [day]: { ...(h[day] || { open: '09:00', close: '18:00' }), [field]: value } }));

  const toggleDay = (day) =>
    setHours((h) => {
      const next = { ...h };
      if (next[day]) delete next[day];
      else next[day] = { open: '09:00', close: '18:00' };
      return next;
    });

  const upload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Please choose an image under 5MB'); return; }
    setUploading(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${apiBase}/upload/cloudinary`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = res.data?.url || res.data?.secure_url;
      if (!url) throw new Error('no url');
      setForm((f) => ({ ...f, [field]: url }));
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed — you can paste an image URL instead.');
    } finally {
      setUploading('');
      e.target.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${apiBase}/vendor/storefront`, {
        ...form,
        founded_year: form.founded_year === '' ? null : Number(form.founded_year),
        hours: Object.keys(hours).length ? hours : null,
        socials: Object.keys(socials).length ? socials : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Storefront updated');
      onSaved?.(res.data.shop, res.data.storefront);
    } catch (err) {
      // The server says exactly which field is wrong — surface that, not a
      // generic failure the owner cannot act on.
      toast.error(err?.response?.data?.error || 'Could not save your storefront.');
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = shop?.slug ? `/shop/${shop.slug}` : null;
  const missing = useMemo(() => (checklist?.items || []).filter((i) => !i.done), [checklist]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-6">
      <form onSubmit={save} className="space-y-6">

        {/* ── Address ─────────────────────────────────────── */}
        {publicUrl && (
          <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-700 m-0">Your shop's link</p>
              <p className="text-sm font-bold text-slate-800 mt-1 m-0 truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}{publicUrl}
              </p>
              <p className="text-xs text-slate-500 mt-1 m-0">
                This link keeps working even if you rename your shop. Share it on Instagram and WhatsApp.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`);
                  toast.success('Link copied');
                }}
                className="px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors">
                Copy link
              </button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                Open
              </a>
            </div>
          </div>
        )}

        {/* ── Images ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Logo &amp; cover</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { field: 'logo_url', title: 'Logo', hint: 'Square works best', h: 'h-28' },
              { field: 'banner_url', title: 'Cover photo', hint: 'Wide — shown across the top', h: 'h-28' },
            ].map(({ field, title, hint, h }) => (
              <div key={field} className="space-y-1.5">
                <label className={label}>{title}</label>
                <div className={`${h} rounded-xl border border-dashed border-slate-200 bg-[#fafbfd] overflow-hidden flex items-center justify-center`}>
                  {form[field] ? (
                    <img src={form[field]} alt={title}
                      onError={(e) => { e.target.style.display = 'none'; }}
                      className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-slate-300">image</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold text-center transition-colors">
                    {uploading === field ? 'Uploading…' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e, field)} />
                  </label>
                  {form[field] && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, [field]: '' }))}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors">
                      Remove
                    </button>
                  )}
                </div>
                <input name={field} value={form[field]} onChange={change} placeholder={`…or paste an image URL. ${hint}`}
                  className="w-full px-3 py-2 bg-[#fafbfd] border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 transition-all" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Story ───────────────────────────────────────── */}
        <section className="space-y-1.5">
          <label className={label} htmlFor="sf-bio">About your shop</label>
          <textarea id="sf-bio" name="bio" rows={4} maxLength={1500} value={form.bio} onChange={change}
            placeholder="Who runs this shop, what you specialise in, and why someone should buy from you rather than anywhere else."
            className={`${input} resize-none`} />
          <p className="text-[11px] text-slate-400">{form.bio.length}/1500 · shown at the top of your page</p>
        </section>

        {/* ── Contact ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">How customers reach you</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className={label} htmlFor="sf-phone">Phone</label>
              <input id="sf-phone" name="phone" value={form.phone} onChange={change} placeholder="+20 100 000 0000" className={input} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className={label} htmlFor="sf-wa">WhatsApp</label>
              <input id="sf-wa" name="whatsapp" value={form.whatsapp} onChange={change} placeholder="+20 100 000 0000" className={input} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className={label} htmlFor="sf-year">Trading since</label>
              <input id="sf-year" name="founded_year" type="number" min="1900" max={new Date().getFullYear()}
                value={form.founded_year} onChange={change} placeholder="2019" className={input} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SOCIALS.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <label className={label} htmlFor={`sf-${s.key}`}>{s.label}</label>
                <input id={`sf-${s.key}`} value={socials[s.key] || ''} placeholder={s.placeholder} className={input} dir="ltr"
                  onChange={(e) => setSocials((v) => {
                    const next = { ...v };
                    if (e.target.value.trim()) next[s.key] = e.target.value.trim();
                    else delete next[s.key];
                    return next;
                  })} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Hours ───────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Opening hours</h3>
          <p className="text-xs text-slate-400 font-semibold -mt-1">Untick a day to show it as closed.</p>
          <div className="space-y-2">
            {DAYS.map((d) => {
              const on = !!hours[d.key];
              return (
                <div key={d.key} className="flex flex-wrap items-center gap-3 bg-[#fafbfd] border border-slate-100 rounded-xl px-3 py-2">
                  <label className="flex items-center gap-2 w-32 cursor-pointer">
                    <input type="checkbox" checked={on} onChange={() => toggleDay(d.key)} className="accent-blue-600" />
                    <span className="text-sm font-bold text-slate-700">{d.label}</span>
                  </label>
                  {on ? (
                    <div className="flex items-center gap-2">
                      <input type="time" value={hours[d.key].open} onChange={(e) => setDay(d.key, 'open', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-500" />
                      <span className="text-slate-400 text-xs font-bold">to</span>
                      <input type="time" value={hours[d.key].close} onChange={(e) => setDay(d.key, 'close', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-blue-500" />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Terms ───────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={label} htmlFor="sf-del">Delivery</label>
            <textarea id="sf-del" name="delivery_note" rows={3} maxLength={600} value={form.delivery_note} onChange={change}
              placeholder="Where you deliver, how long it takes, and what it costs."
              className={`${input} resize-none`} />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="sf-ret">Returns</label>
            <textarea id="sf-ret" name="return_policy" rows={3} maxLength={600} value={form.return_policy} onChange={change}
              placeholder="What can be returned, within how long, and in what condition."
              className={`${input} resize-none`} />
          </div>
        </section>

        <button type="submit" disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[20px]">save</span>
          {saving ? 'Saving…' : 'Save storefront'}
        </button>
      </form>

      {/* ── Completeness ──────────────────────────────────── */}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Your page</h3>
            <span className="text-2xl font-black text-slate-800 tabular-nums">{checklist?.percent ?? 0}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${checklist?.percent ?? 0}%` }} />
          </div>

          {missing.length === 0 ? (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3 m-0">
              Your storefront is complete. Customers can see who you are, when you're open, and how you deliver.
            </p>
          ) : (
            <>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Still missing</p>
              <ul className="space-y-2.5 m-0 p-0 list-none">
                {missing.map((i) => (
                  <li key={i.key} className="flex gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-300 mt-0.5">radio_button_unchecked</span>
                    <span>
                      <span className="block text-xs font-bold text-slate-700">{i.label}</span>
                      <span className="block text-[11px] text-slate-500 leading-snug">{i.why}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {(checklist?.items || []).some((i) => i.done) && (
            <ul className="space-y-1.5 m-0 p-0 list-none mt-4 pt-4 border-t border-slate-100">
              {(checklist?.items || []).filter((i) => i.done).map((i) => (
                <li key={i.key} className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">check_circle</span>
                  {i.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};

export default StorefrontEditor;
