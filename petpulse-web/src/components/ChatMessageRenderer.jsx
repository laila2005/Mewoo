/**
 * PetPulse — Chat Message Renderer
 *
 * Renders structured JSON message blocks from the AI chat endpoint as safe
 * React components (no dangerouslySetInnerHTML). Card chrome is localized
 * EN/AR via the `lang` prop so the whole card matches the user's language.
 */

import React, { useState } from 'react';
import { mdToSafeHtml } from '../utils/miniMarkdown';

// ─── Localized labels (card chrome) ─────────────
const LABELS = {
  en: {
    vets: 'Available Veterinarians', trainers: 'Trainers',
    mating: 'Compatible Mating Partners', adoption: 'Pets Available for Adoption',
    knowledge: 'Veterinary Knowledge', apptConfirmed: 'Appointment Confirmed!',
    accountCreated: 'Account Created!', date: 'Date & Time', reason: 'Reason',
    status: 'Status', confirmed: 'Confirmed', email: 'Email', password: 'Password',
    changePw: 'Change this password in Profile Settings', source: 'Source',
    available: 'Available', propose: '🐾 Propose Match', viewAdoption: 'View Adoption',
    vet: 'Veterinarian', location: 'Location',
    chooseVet: 'Choose a Vet', book: 'Book', kmAway: 'km away', fee: 'Consultation',
    emergency: '24/7 Emergency', yrsExp: 'yrs exp',
    pickDay: 'Pick a day', pickTime: 'Pick a time', noTimes: 'No open times that day.',
    yourAppointments: 'Your Appointments', cancelAppt: 'Cancel', confirmCancel: 'Yes, cancel', keepIt: 'Keep it',
    addGoogle: 'Google Calendar', addPhone: 'Phone calendar',
  },
  ar: {
    vets: 'أطباء بيطريون متاحون', trainers: 'مدرّبون',
    mating: 'شركاء تزاوج متوافقون', adoption: 'حيوانات متاحة للتبنّي',
    knowledge: 'معرفة بيطرية', apptConfirmed: 'تم تأكيد الموعد!',
    accountCreated: 'تم إنشاء الحساب!', date: 'التاريخ والوقت', reason: 'السبب',
    status: 'الحالة', confirmed: 'مؤكد', email: 'البريد الإلكتروني', password: 'كلمة المرور',
    changePw: 'غيّر كلمة المرور من إعدادات الملف الشخصي', source: 'المصدر',
    available: 'متاح', propose: '🐾 اقترح تزاوج', viewAdoption: 'عرض التبنّي',
    vet: 'الطبيب البيطري', location: 'الموقع',
    chooseVet: 'اختر طبيبًا بيطريًا', book: 'احجز', kmAway: 'كم', fee: 'الكشف',
    emergency: 'طوارئ 24/7', yrsExp: 'سنوات خبرة',
    pickDay: 'اختر اليوم', pickTime: 'اختر الوقت', noTimes: 'لا توجد أوقات متاحة في هذا اليوم.',
    yourAppointments: 'مواعيدك', cancelAppt: 'إلغاء', confirmCancel: 'نعم، ألغِ', keepIt: 'احتفظ به',
    addGoogle: 'تقويم Google', addPhone: 'تقويم الهاتف',
  },
};

// ─── Text ───────────────────────────────────────
const TextBlock = ({ data }) => (
  <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToSafeHtml(data.content) }} />
);

// ─── Booking Confirmation ───────────────────────
// ─── Add-to-calendar links ──────────────────────
// Two links cover every device with no install and no OAuth: Google Calendar's
// template URL for the browser, and an .ics that iOS/Android/Outlook open
// natively. The server builds both — the .ics link is signed, so it also works
// when the same email is opened on a phone that is not logged in.
const CalendarLinks = ({ google, ics, t }) => {
  if (!google && !ics) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {google && (
        <a href={google} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors">
          <span className="material-symbols-outlined text-[14px]">event</span>{t.addGoogle}
        </a>
      )}
      {ics && (
        <a href={ics}
           className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors">
          <span className="material-symbols-outlined text-[14px]">download</span>{t.addPhone}
        </a>
      )}
    </div>
  );
};

const BookingConfirmation = ({ data, t, lang }) => {
  const apt = data.appointment;
  const vet = data.vet || {};
  const time = apt?.appointment_time
    ? new Date(apt.appointment_time).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' })
    : 'Scheduled';
  const place = [vet.clinic_name, vet.address].filter(Boolean).join(' — ');
  const row = (label, value) => value ? (
    <div className="flex justify-between gap-3 text-xs"><span className="text-slate-500 font-semibold whitespace-nowrap">{label}</span><span className="text-slate-800 font-bold text-right">{value}</span></div>
  ) : null;
  return (
    <div className="rounded-xl overflow-hidden border border-emerald-100" style={{ boxShadow: '0 4px 16px rgba(16,185,129,0.1)' }}>
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-white text-[18px]">check_circle</span>
        <span className="text-white font-bold text-sm">{t.apptConfirmed}</span>
      </div>
      <div className="bg-white p-4 space-y-2">
        {row(t.vet, vet.name)}
        {row(t.location, place)}
        {row(t.date, time)}
        {row(t.reason, apt?.reason)}
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 font-semibold">{t.status}</span>
          <span className="text-emerald-600 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>{t.confirmed}</span>
        </div>
        <CalendarLinks google={data.calendar?.google} ics={data.calendar?.ics} t={t} />
      </div>
    </div>
  );
};

// ─── Account Created ────────────────────────────
const AccountCreated = ({ data, t }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(data.temporary_password); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="rounded-xl overflow-hidden border border-indigo-100" style={{ boxShadow: '0 4px 16px rgba(99,102,241,0.1)' }}>
      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-white text-[18px]">person_add</span>
        <span className="text-white font-bold text-sm">{t.accountCreated}</span>
      </div>
      <div className="bg-white p-4 space-y-2.5">
        <div className="flex justify-between text-xs"><span className="text-slate-500 font-semibold">{t.email}</span><span className="text-slate-800 font-bold font-mono text-[11px]">{data.user?.email}</span></div>
        {data.temporary_password && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">{t.password}</span>
            <div className="flex items-center gap-1.5">
              <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-indigo-100 select-all">{data.temporary_password}</code>
              <button onClick={handleCopy} type="button" className={`w-6 h-6 rounded flex items-center justify-center border transition-all active:scale-90 cursor-pointer ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600'}`}>
                <span className="material-symbols-outlined text-[12px]">{copied ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 text-[9px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 p-1.5 rounded-lg mt-1">
          <span className="material-symbols-outlined text-[10px] text-amber-500">lock</span>{t.changePw}
        </div>
      </div>
    </div>
  );
};

// ─── Vet List ───────────────────────────────────
const VetList = ({ data, t }) => (
  <div className="rounded-xl overflow-hidden border border-blue-100" style={{ boxShadow: '0 4px 16px rgba(59,130,246,0.08)' }}>
    <div className="bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">stethoscope</span>
      <span className="text-white font-bold text-xs">{t.vets} ({data.count})</span>
    </div>
    <div className="bg-white divide-y divide-slate-100">
      {(data.vets || []).map((vet, i) => (
        <div key={vet.vet_user_id || i} className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-blue-500 text-[16px]">person</span></div>
            <div>
              <p className="text-xs font-bold text-slate-800 m-0">{vet.name}</p>
              {vet.clinic_name && <p className="text-[10px] text-slate-500 m-0">{vet.clinic_name}</p>}
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{t.available}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Vet Options (selectable, nearest-first) ────
const VetOptions = ({ data, t, lang, onQuickReply }) => (
  <div className="rounded-xl overflow-hidden border border-blue-100" style={{ boxShadow: '0 4px 16px rgba(59,130,246,0.1)' }}>
    <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">stethoscope</span>
      <span className="text-white font-bold text-xs">{t.chooseVet} ({(data.vets || []).length})</span>
    </div>
    <div className="bg-white divide-y divide-slate-100">
      {(data.vets || []).map((vet, i) => {
        const place = [vet.area || vet.address, vet.clinic_name].filter(Boolean)[0] || vet.clinic_name;
        return (
          <div key={vet.vet_user_id || i} className="px-3.5 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-800 m-0 truncate">{vet.name}</p>
                {vet.is_emergency && <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100 whitespace-nowrap">{t.emergency}</span>}
              </div>
              {vet.clinic_name && <p className="text-[10px] text-slate-500 m-0 truncate">{vet.clinic_name}</p>}
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {place && <span className="text-[10px] text-slate-400 m-0 flex items-center gap-0.5">📍 {place}{vet.distance_km != null ? ` · ${vet.distance_km} ${t.kmAway}` : ''}</span>}
                {vet.consultation_fee != null && <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">{t.fee}: EGP {vet.consultation_fee}</span>}
                {vet.experience != null && vet.experience > 0 && <span className="text-[9px] text-slate-500">{vet.experience} {t.yrsExp}</span>}
              </div>
              {vet.specialties?.length > 0 && <p className="text-[9px] text-indigo-500 m-0 mt-0.5 truncate">{vet.specialties.slice(0, 3).join(' • ')}</p>}
            </div>
            <button
              type="button"
              onClick={() => onQuickReply?.(lang === 'ar' ? `احجز مع ${vet.name}` : `Book with ${vet.name}`)}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
            >
              {t.book}
            </button>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Medical Info (RAG) ─────────────────────────
const MedicalInfo = ({ data, t }) => (
  <div className="rounded-xl overflow-hidden border border-amber-100" style={{ boxShadow: '0 4px 16px rgba(245,158,11,0.08)' }}>
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">local_library</span>
      <span className="text-white font-bold text-xs">{t.knowledge}</span>
    </div>
    <div className="bg-white p-4 space-y-3">
      {(data.chunks || []).slice(0, 3).map((chunk, i) => (
        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <p className="text-xs text-slate-700 leading-relaxed m-0 line-clamp-4">{chunk.content}</p>
          {chunk.source && <p className="text-[9px] text-slate-400 font-semibold mt-1.5 m-0 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">source</span>{t.source}: {chunk.source}</p>}
        </div>
      ))}
      {data.disclaimer && (
        <div className="flex items-start gap-1.5 text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 p-2 rounded-lg">
          <span className="material-symbols-outlined text-[12px] text-amber-500 mt-0.5">warning</span><span>{data.disclaimer}</span>
        </div>
      )}
    </div>
  </div>
);

// ─── Pet Card (mating + adoption) ───────────────
const PetCard = ({ pet, accent, actionLabel, onAction }) => (
  <div className="rounded-xl overflow-hidden border bg-white" style={{ borderColor: accent.border, boxShadow: `0 4px 16px ${accent.shadow}` }}>
    <div className="h-24 bg-slate-100">{pet.avatar_url && <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />}</div>
    <div className="p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-800 m-0">{pet.name}{pet.age_years != null ? `, ${pet.age_years} yr` : ''}</p>
        {pet.gender && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: accent.chipBg, color: accent.chipText }}>{pet.gender}</span>}
      </div>
      <p className="text-[10px] text-slate-500 m-0">{[pet.breed, pet.species].filter(Boolean).join(' • ')}</p>
      {pet.location && <p className="text-[10px] text-slate-400 m-0">📍 {pet.location}</p>}
      {pet.bio && <p className="text-[10px] text-slate-600 italic mt-1 line-clamp-2">"{pet.bio}"</p>}
      {actionLabel && <button type="button" onClick={() => onAction?.(pet)} className="w-full mt-2 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95" style={{ background: accent.chipBg, color: accent.chipText }}>{actionLabel}</button>}
    </div>
  </div>
);

// ─── Mating Matches ─────────────────────────────
const MatingMatch = ({ data, t, onProposeMatch }) => (
  <div className="rounded-xl overflow-hidden border border-rose-100" style={{ boxShadow: '0 4px 16px rgba(244,63,94,0.08)' }}>
    <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">favorite</span>
      <span className="text-white font-bold text-xs">{t.mating} ({data.count})</span>
    </div>
    <div className="bg-white p-3 grid grid-cols-2 gap-2.5">
      {(data.matches || []).map((pet, i) => (
        <PetCard key={pet.pet_id || i} pet={pet} accent={{ border: '#ffe4e6', shadow: 'rgba(244,63,94,0.10)', chipBg: '#fff1f2', chipText: '#e11d48' }} actionLabel={t.propose} onAction={(p) => onProposeMatch?.(p)} />
      ))}
    </div>
  </div>
);

// ─── Adoption ───────────────────────────────────
const Adoption = ({ data, t, onNavigate }) => (
  <div className="rounded-xl overflow-hidden border border-emerald-100" style={{ boxShadow: '0 4px 16px rgba(16,185,129,0.08)' }}>
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">pets</span>
      <span className="text-white font-bold text-xs">{t.adoption} ({data.count})</span>
    </div>
    <div className="bg-white p-3 grid grid-cols-2 gap-2.5">
      {(data.pets || []).map((pet, i) => (
        <PetCard key={pet.pet_id || i} pet={pet} accent={{ border: '#d1fae5', shadow: 'rgba(16,185,129,0.10)', chipBg: '#ecfdf5', chipText: '#059669' }} actionLabel={t.viewAdoption} onAction={() => onNavigate?.('/adoption')} />
      ))}
    </div>
  </div>
);

// ─── Provider List ──────────────────────────────
const ProviderList = ({ data, t }) => (
  <div className="rounded-xl overflow-hidden border border-blue-100" style={{ boxShadow: '0 4px 16px rgba(59,130,246,0.08)' }}>
    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">{data.role === 'trainer' ? 'sports_martial_arts' : 'stethoscope'}</span>
      <span className="text-white font-bold text-xs">{data.role === 'trainer' ? t.trainers : t.vets} ({data.count})</span>
    </div>
    <div className="bg-white divide-y divide-slate-100">
      {(data.providers || []).map((p, i) => (
        <div key={p.provider_id || i} className="px-4 py-2.5">
          <p className="text-xs font-bold text-slate-800 m-0">{p.name}</p>
          {p.clinic_name && <p className="text-[10px] text-slate-500 m-0">{p.clinic_name}</p>}
          {p.specialties?.length > 0 && <p className="text-[10px] text-slate-500 m-0">{p.specialties.join(', ')}</p>}
        </div>
      ))}
    </div>
  </div>
);

// ─── Navigation ─────────────────────────────────
const Navigation = ({ data, onNavigate }) => (
  <button type="button" onClick={() => onNavigate?.(data.route)} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>{data.label || 'Open'}
  </button>
);

// ─── Tool Status ────────────────────────────────
const ToolStatus = ({ data }) => (
  <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold py-1">
    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    <span>{data.message || `Running ${data.tool}...`}</span>
  </div>
);

// ─── Slot picker ────────────────────────────────
// Tapping a time is the whole point: a chosen slot needs no date parsing, and
// only genuinely open slots are ever rendered, so "outside working hours" and
// "that day is closed" cannot happen on this path. Typing still works.
const SlotPicker = ({ data, t, lang, onQuickReply }) => {
  const days = Array.isArray(data.days) ? data.days : [];
  const [active, setActive] = useState(data.selected_date || days[0]?.date || null);
  if (!days.length) return null;
  const current = days.find((d) => d.date === active) || days[0];
  const wh = data.working_hours;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-blue-600">event_available</span>
        <span className="text-xs font-bold text-slate-800">{data.vet_name}</span>
        {wh?.start && wh?.end && (
          <span className="text-[11px] text-slate-500 ms-auto font-medium">{wh.start}–{wh.end}</span>
        )}
      </div>

      <div className="p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{t.pickDay}</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setActive(d.date)}
              aria-pressed={d.date === active}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                d.date === active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3 mb-1.5">{t.pickTime}</p>
        <div className="flex flex-wrap gap-1.5">
          {(current.slots || []).map((time) => (
            <button
              key={time}
              type="button"
              /* Send an unambiguous, locale-independent value. The server parses
                 this deterministically and also matches it against the slots it
                 remembered offering. */
              onClick={() => onQuickReply?.(`${current.date} ${time}`)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-colors active:scale-95"
            >
              {time}
            </button>
          ))}
        </div>
        {!current.slots?.length && <p className="text-xs text-slate-500">{t.noTimes}</p>}
      </div>
    </div>
  );
};

// ─── Appointment actions (cancel / reschedule) ──
// Cancelling is destructive, so the model never decides it: the server lists
// what the user actually has and this renders one explicit button per row.
// The chip sends an unambiguous token the server matches on.
const AppointmentActions = ({ data, t, lang, onQuickReply }) => {
  const items = Array.isArray(data.appointments) ? data.appointments : [];
  const [confirming, setConfirming] = useState(null);
  if (!items.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-blue-600">event</span>
        <span className="text-xs font-bold text-slate-800">{t.yourAppointments}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((a) => (
          <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 m-0 truncate">{a.when}</p>
              <p className="text-[11px] text-slate-500 m-0 truncate">
                {[a.pet, a.vet, a.clinic].filter(Boolean).join(' · ')}
              </p>
            </div>
            {confirming === a.id ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onQuickReply?.(`cancel-appointment ${a.id}`)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  {t.confirmCancel}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  {t.keepIt}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(a.id)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors"
              >
                {t.cancelAppt}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const BLOCK_RENDERERS = {
  text: TextBlock,
  slot_picker: SlotPicker,
  appointment_actions: AppointmentActions,
  booking_confirmation: BookingConfirmation,
  account_created: AccountCreated,
  vet_list: VetList,
  vet_options: VetOptions,
  medical_info: MedicalInfo,
  tool_status: ToolStatus,
  mating_match: MatingMatch,
  adoption: Adoption,
  provider_list: ProviderList,
  navigation: Navigation,
};

const ChatMessageRenderer = ({ blocks = [], lang = 'en', onProposeMatch, onNavigate, onQuickReply }) => {
  if (!blocks || blocks.length === 0) return null;
  const t = LABELS[lang] || LABELS.en;
  return (
    <div className="flex flex-col gap-2.5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {blocks.map((block, index) => {
        const Renderer = BLOCK_RENDERERS[block.type];
        if (!Renderer) return <div key={index} className="text-sm text-slate-600">{JSON.stringify(block.data)}</div>;
        return <Renderer key={index} data={block.data} t={t} lang={lang} onProposeMatch={onProposeMatch} onNavigate={onNavigate} onQuickReply={onQuickReply} />;
      })}
    </div>
  );
};

export default ChatMessageRenderer;
