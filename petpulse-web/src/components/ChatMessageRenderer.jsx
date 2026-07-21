/**
 * PetPulse — Chat Message Renderer
 * 
 * Renders structured JSON message blocks from the AI chat endpoint.
 * Replaces dangerouslySetInnerHTML with safe React components.
 * 
 * Block types:
 *   - text: Plain text response
 *   - booking_confirmation: Appointment booked card
 *   - account_created: New account credentials card
 *   - vet_list: Available vets list
 *   - medical_info: RAG knowledge chunks with citations
 *   - tool_status: Tool execution progress
 */

import React, { useState } from 'react';

// ─── Text Block ─────────────────────────────────
const TextBlock = ({ data }) => (
  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
    {data.content}
  </div>
);

// ─── Booking Confirmation ───────────────────────
const BookingConfirmation = ({ data }) => {
  const apt = data.appointment;
  const time = apt?.appointment_time 
    ? new Date(apt.appointment_time).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Scheduled';

  return (
    <div className="rounded-xl overflow-hidden border border-emerald-100" style={{boxShadow: '0 4px 16px rgba(16,185,129,0.1)'}}>
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-white text-[18px]">check_circle</span>
        <span className="text-white font-bold text-sm">Appointment Confirmed!</span>
      </div>
      <div className="bg-white p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 font-semibold">Date & Time</span>
          <span className="text-slate-800 font-bold">{time}</span>
        </div>
        {apt?.reason && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-semibold">Reason</span>
            <span className="text-slate-800 font-bold">{apt.reason}</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 font-semibold">Status</span>
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Confirmed
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Account Created ────────────────────────────
const AccountCreated = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.temporary_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-indigo-100" style={{boxShadow: '0 4px 16px rgba(99,102,241,0.1)'}}>
      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-white text-[18px]">person_add</span>
        <span className="text-white font-bold text-sm">Account Created!</span>
      </div>
      <div className="bg-white p-4 space-y-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 font-semibold">Email</span>
          <span className="text-slate-800 font-bold font-mono text-[11px]">{data.user?.email}</span>
        </div>
        {data.temporary_password && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">Password</span>
            <div className="flex items-center gap-1.5">
              <code className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-indigo-100 select-all">
                {data.temporary_password}
              </code>
              <button
                onClick={handleCopy}
                type="button"
                className={`w-6 h-6 rounded flex items-center justify-center border transition-all active:scale-90 cursor-pointer ${
                  copied 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600'
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">{copied ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 text-[9px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 p-1.5 rounded-lg mt-1">
          <span className="material-symbols-outlined text-[10px] text-amber-500">lock</span>
          Change this password in Profile Settings
        </div>
      </div>
    </div>
  );
};

// ─── Vet List ───────────────────────────────────
const VetList = ({ data }) => (
  <div className="rounded-xl overflow-hidden border border-blue-100" style={{boxShadow: '0 4px 16px rgba(59,130,246,0.08)'}}>
    <div className="bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">stethoscope</span>
      <span className="text-white font-bold text-xs">Available Veterinarians ({data.count})</span>
    </div>
    <div className="bg-white divide-y divide-slate-100">
      {(data.vets || []).map((vet, i) => (
        <div key={vet.vet_user_id || i} className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-500 text-[16px]">person</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 m-0">{vet.name}</p>
              {vet.clinic_name && (
                <p className="text-[10px] text-slate-500 m-0">{vet.clinic_name}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Available</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Medical Info (RAG Results) ─────────────────
const MedicalInfo = ({ data }) => (
  <div className="rounded-xl overflow-hidden border border-amber-100" style={{boxShadow: '0 4px 16px rgba(245,158,11,0.08)'}}>
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center gap-2">
      <span className="material-symbols-outlined text-white text-[16px]">local_library</span>
      <span className="text-white font-bold text-xs">Veterinary Knowledge</span>
    </div>
    <div className="bg-white p-4 space-y-3">
      {(data.chunks || []).slice(0, 3).map((chunk, i) => (
        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <p className="text-xs text-slate-700 leading-relaxed m-0 line-clamp-4">{chunk.content}</p>
          {chunk.source && (
            <p className="text-[9px] text-slate-400 font-semibold mt-1.5 m-0 flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">source</span>
              Source: {chunk.source}
            </p>
          )}
        </div>
      ))}
      {data.disclaimer && (
        <div className="flex items-start gap-1.5 text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 p-2 rounded-lg">
          <span className="material-symbols-outlined text-[12px] text-amber-500 mt-0.5">warning</span>
          <span>{data.disclaimer}</span>
        </div>
      )}
    </div>
  </div>
);

// ─── Tool Status ────────────────────────────────
const ToolStatus = ({ data }) => (
  <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold py-1">
    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    <span>{data.message || `Running ${data.tool}...`}</span>
  </div>
);

// ─── Block Registry ─────────────────────────────
const BLOCK_RENDERERS = {
  text: TextBlock,
  booking_confirmation: BookingConfirmation,
  account_created: AccountCreated,
  vet_list: VetList,
  medical_info: MedicalInfo,
  tool_status: ToolStatus,
};

/**
 * Main renderer — takes structured response blocks and renders them
 * 
 * @param {Object} props
 * @param {Array} props.blocks - Array of { type, data } blocks from the API
 */
const ChatMessageRenderer = ({ blocks = [] }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((block, index) => {
        const Renderer = BLOCK_RENDERERS[block.type];
        if (!Renderer) {
          // Unknown block type — render as text fallback
          return (
            <div key={index} className="text-sm text-slate-600">
              {JSON.stringify(block.data)}
            </div>
          );
        }
        return <Renderer key={index} data={block.data} />;
      })}
    </div>
  );
};

export default ChatMessageRenderer;
