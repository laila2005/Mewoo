/**
 * PetPulse — Chat Message Renderer
 *
 * Renders structured JSON message blocks from the AI chat endpoint as safe
 * React components (no dangerouslySetInnerHTML). Card chrome is localized
 * EN/AR via the `lang` prop so the whole card matches the user's language.
 */

import React, { useState } from 'react';

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
  },
};

// ─── Text ───────────────────────────────────────
const TextBlock = ({ data }) => (
  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.content}</div>
);

// ─── Booking Confirmation ───────────────────────
const BookingConfirmation = ({ data, t }) => {
  const apt = data.appointment;
  const vet = data.vet || {};
  const time = apt?.appointment_time
    ? new Date(apt.appointment_time).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' })
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

const BLOCK_RENDERERS = {
  text: TextBlock,
  booking_confirmation: BookingConfirmation,
  account_created: AccountCreated,
  vet_list: VetList,
  medical_info: MedicalInfo,
  tool_status: ToolStatus,
  mating_match: MatingMatch,
  adoption: Adoption,
  provider_list: ProviderList,
  navigation: Navigation,
};

const ChatMessageRenderer = ({ blocks = [], lang = 'en', onProposeMatch, onNavigate }) => {
  if (!blocks || blocks.length === 0) return null;
  const t = LABELS[lang] || LABELS.en;
  return (
    <div className="flex flex-col gap-2.5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {blocks.map((block, index) => {
        const Renderer = BLOCK_RENDERERS[block.type];
        if (!Renderer) return <div key={index} className="text-sm text-slate-600">{JSON.stringify(block.data)}</div>;
        return <Renderer key={index} data={block.data} t={t} onProposeMatch={onProposeMatch} onNavigate={onNavigate} />;
      })}
    </div>
  );
};

export default ChatMessageRenderer;
