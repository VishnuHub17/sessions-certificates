// src/components/SessionCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * List-row card for a single attended session on the "My Sessions" page.
 */
const SessionCard = ({ session, certificate }) => {
  const date = new Date(session.session_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hasCertificate = Boolean(certificate);

  return (
    <div className="glass-card flex flex-col md:flex-row items-start md:items-center p-6 gap-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-container/0 to-primary-container/0 group-hover:from-primary-container/5 transition-all duration-300 pointer-events-none" />

      <div className="flex-1 flex flex-col gap-2 relative z-10 min-w-0">
        <span className="text-label-sm font-label-sm text-primary tracking-wider uppercase">
          {(session.session_type || 'Session').replace(/_/g, ' ')}
        </span>
        <h2 className="text-headline-lg-mobile font-headline-lg-mobile text-white leading-tight truncate">
          {session.title}
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant mt-1">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            {date}
          </span>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Attended
          </span>
        </div>
      </div>

      <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-3 relative z-10 border-t border-white/5 md:border-t-0 md:border-l md:border-white/5 pt-4 md:pt-0 md:pl-6 shrink-0">
        <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">
            {hasCertificate ? 'workspace_premium' : 'hourglass_empty'}
          </span>
          {hasCertificate ? 'Certificate available' : 'Certificate pending'}
        </span>
        <Link
          to={`/sessions/${session.id}`}
          className="sessions-btn-primary w-full md:w-auto px-6 py-2.5 rounded-lg text-white font-semibold flex items-center justify-center gap-2 group/btn whitespace-nowrap"
        >
          {hasCertificate ? 'View Certificate' : 'View Session Details'}
          <span className="material-symbols-outlined text-[18px] group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
};

export default SessionCard;
