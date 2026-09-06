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
    <div className="bg-surface-container-low rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-outline-variant hover:border-outline transition-colors">
      <div className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide uppercase text-primary/80 mb-1">
          {session.session_type || 'Session'}
        </span>
        <h2 className="text-title-lg font-bold text-on-surface truncate">{session.title}</h2>
        <div className="flex items-center gap-3 mt-2 text-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            {date}
          </span>
          <span className="inline-flex items-center gap-1 text-success">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Attended
          </span>
        </div>
      </div>

      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1 text-xs ${hasCertificate ? 'text-on-surface-variant' : 'text-on-surface-variant/60'}`}>
          <span className="material-symbols-outlined text-[16px]">
            {hasCertificate ? 'workspace_premium' : 'hourglass_empty'}
          </span>
          {hasCertificate ? 'Certificate available' : 'Certificate pending'}
        </span>
        <Link
          to={`/sessions/${session.id}`}
          className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-on-primary hover:bg-primary-hover transition-colors text-sm font-semibold whitespace-nowrap"
        >
          {hasCertificate ? 'View Certificate' : 'View Session Details'}
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
};

export default SessionCard;
