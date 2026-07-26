import React from 'react';

/**
 * Friendly "this feature isn't live yet" banner for the soft launch.
 * Shown above gated features (vets, marketplace, subscriptions) whose actions
 * are disabled until an admin flips the feature live.
 */
export default function ComingSoonBanner({ title = 'Coming soon', message, className = '' }) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 ${className}`} role="status">
      <span className="material-symbols-outlined text-amber-600 shrink-0">rocket_launch</span>
      <div>
        <h4 className="font-extrabold text-amber-900 text-sm">{title}</h4>
        {message && <p className="text-amber-800/80 text-xs mt-0.5 font-semibold leading-relaxed">{message}</p>}
      </div>
    </div>
  );
}
