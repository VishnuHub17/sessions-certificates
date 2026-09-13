// src/pages/VerifyPage.jsx
//
// Public certificate verification page (no auth required). Resolves a
// verification_code through the verify_certificate() Postgres function,
// which is SECURITY DEFINER and returns only safe, non-identifying columns —
// phone numbers and auth user ids never reach this page or the client.
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

const VerifyPage = () => {
  const { verificationCode } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('verify_certificate', { p_code: verificationCode });
        if (cancelled) return;
        if (rpcError) {
          setError('Could not reach the verification service. Please try again shortly.');
          setLoading(false);
          return;
        }
        setResult(Array.isArray(data) ? data[0] : data);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error('VerifyPage: unexpected error', e);
        setError('Could not reach the verification service. Please try again shortly.');
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [verificationCode]);

  return (
    <div className="font-body-md text-body-md min-h-screen flex flex-col items-center justify-center px-4">
      <div className="glow-background" />
      <div className="glass-panel rounded-xl p-8 w-full max-w-md text-center">
        <span className="text-title-md font-title-md font-bold text-on-surface block mb-6">Pathwisse</span>

        {loading && <p className="text-body-md font-body-md text-on-surface-variant">Verifying certificate…</p>}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl">error</span>
            <p className="text-body-md font-body-md text-on-surface-variant">{error}</p>
          </div>
        )}

        {!loading && !error && result && !result.found && (
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-error text-4xl">cancel</span>
            <h1 className="text-title-md font-title-md font-semibold text-on-surface">Certificate not found</h1>
            <p className="text-body-md font-body-md text-on-surface-variant">
              This verification code doesn't match any issued Pathwisse certificate.
            </p>
          </div>
        )}

        {!loading && !error && result?.found && (
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-emerald-400 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            <h1 className="text-title-md font-title-md font-semibold text-on-surface">Certificate verified</h1>
            <div className="w-full text-left mt-4 space-y-3">
              <div>
                <span className="block text-label-sm font-label-sm text-on-surface-variant opacity-60 uppercase tracking-wider">Recipient</span>
                <span className="block text-body-md font-body-md text-on-surface">{result.recipient_name}</span>
              </div>
              <div>
                <span className="block text-label-sm font-label-sm text-on-surface-variant opacity-60 uppercase tracking-wider">Session</span>
                <span className="block text-body-md font-body-md text-on-surface">{result.session_title}</span>
              </div>
              <div>
                <span className="block text-label-sm font-label-sm text-on-surface-variant opacity-60 uppercase tracking-wider">Certificate ID</span>
                <span className="block font-mono text-sm text-on-surface">{result.certificate_id}</span>
              </div>
              <div>
                <span className="block text-label-sm font-label-sm text-on-surface-variant opacity-60 uppercase tracking-wider">Issued</span>
                <span className="block text-body-md font-body-md text-on-surface">
                  {result.issued_at ? new Date(result.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </span>
              </div>
              <div>
                <span className="block text-label-sm font-label-sm text-on-surface-variant opacity-60 uppercase tracking-wider">Status</span>
                <span className="block text-body-md font-body-md text-on-surface capitalize">{result.status}</span>
              </div>
            </div>
          </div>
        )}

        <Link to="/login" className="inline-block mt-8 text-label-sm font-label-sm text-primary hover:text-primary-fixed-dim transition-colors">
          Go to Pathwisse Certificate Portal
        </Link>
      </div>
    </div>
  );
};

export default VerifyPage;
