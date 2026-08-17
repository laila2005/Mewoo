import React from 'react';

/**
 * Professional identity badge for community posts.
 *
 * A vet, trainer or shop owner posting in the feed should read as a
 * professional, not as another pet owner — their answers carry different
 * weight. Pet owners deliberately get NOTHING: a badge everyone has says
 * nothing, and the absence is what makes the others meaningful.
 *
 * Each role owns a distinct hue so the type is legible at a glance without
 * reading the label. These are separate from PremiumBadge (a paid
 * subscription), which can appear alongside.
 */
const ROLES = {
  vet: {
    label: 'Veterinarian',
    icon: 'stethoscope',
    // Clinical blue — matches the vet surfaces elsewhere in the product.
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  trainer: {
    label: 'Trainer',
    icon: 'sports_martial_arts',
    // Emerald, as trainers are shown across the app.
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  vendor: {
    label: 'Pet Shop',
    icon: 'storefront',
    // Amber — commerce, distinct from both care roles.
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  clinic_assistant: {
    label: 'Clinic Team',
    icon: 'badge',
    cls: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  admin: {
    label: 'PetPluse Team',
    icon: 'verified',
    cls: 'bg-violet-50 text-violet-700 border-violet-200',
  },
};

/**
 * @param {string} role                 users.role
 * @param {string} [clinicName]         vet_profiles.clinic_name
 * @param {string} [shopName]           pet_shops.name
 */
const RoleBadge = ({ role, clinicName, shopName }) => {
  const key = String(role || '').toLowerCase().trim();
  const meta = ROLES[key];
  if (!meta) return null; // owner / unknown → no badge, by design

  // The business name is the useful part: "Veterinarian · Maadi Pet Wellness".
  const business = key === 'vendor' ? shopName : key === 'vet' ? clinicName : null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${meta.cls}`}
      title={business ? `${meta.label} — ${business}` : meta.label}
    >
      <span className="material-symbols-outlined text-[12px] leading-none">{meta.icon}</span>
      {meta.label}
      {business && (
        <>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span className="normal-case font-semibold max-w-[10rem] truncate">{business}</span>
        </>
      )}
    </span>
  );
};

export default RoleBadge;
