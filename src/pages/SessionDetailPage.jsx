// src/pages/SessionDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { fetchSessionDetail } from '../lib/phoneAuthService.js';
import { useAuth } from '../context/AuthContext.jsx';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Filesystem-safe slug: strip anything but letters/digits/spaces/hyphens, collapse whitespace to '-'.
const slugify = (value, fallback) => {
  const base = (value || fallback || '').toString().trim();
  const cleaned = base.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
  return cleaned || fallback;
};

const SessionDetailPage = () => {
  const { sessionId } = useParams();
  const { mode } = useAuth();
  const [sessionData, setSessionData] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    const fetchViaTestBridge = async () => {
      const result = await fetchSessionDetail(sessionId);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if (result.error) {
        // Server resolved the session but flagged an eligibility problem (e.g. not attended yet).
        setError(result.error);
        setSessionData(result.session || null);
        setLoading(false);
        return;
      }
      setSessionData(result.session);
      setCertificate(result.certificate || null);
      setLoading(false);
    };

    const fetchViaSupabase = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Your session has expired. Please sign in again.');
          setLoading(false);
          return;
        }

        // Verify the student actually attended this session before showing anything about it.
        // RLS also independently restricts sessions/session_attendance/certificates to this
        // user's own rows, so this can never resolve another student's data.
        const { data: attendance, error: attendErr } = await supabase
          .from('session_attendance')
          .select('attendance_status, sessions(*)')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (attendErr) {
          setError('Could not reach Supabase. Please check your connection and try again.');
          setLoading(false);
          return;
        }

        if (!attendance || !attendance.sessions) {
          setError('No attendance record was found for this session on your account.');
          setLoading(false);
          return;
        }

        if (attendance.attendance_status !== 'attended') {
          setError('You are not eligible for a certificate for this session yet.');
          setSessionData(attendance.sessions);
          setLoading(false);
          return;
        }

        const { data: certData, error: certErr } = await supabase
          .from('certificates')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .eq('status', 'issued') // a revoked certificate must never present as valid
          .maybeSingle();

        if (certErr) {
          setError('Could not reach Supabase. Please check your connection and try again.');
          setLoading(false);
          return;
        }

        setSessionData(attendance.sessions);
        setCertificate(certData || null);
        setLoading(false);
      } catch (e) {
        console.error('SessionDetailPage: unexpected error loading session', e);
        setError('Supabase is unavailable right now. Please try again shortly.');
        setLoading(false);
      }
    };

    setLoading(true);
    setError(null);
    if (mode === 'test') {
      fetchViaTestBridge();
    } else {
      fetchViaSupabase();
    }
  }, [sessionId, mode]);

  // Generate a real, scannable QR code pointing at the public verification page.
  useEffect(() => {
    if (!certificate?.verification_code) {
      setQrDataUrl(null);
      return;
    }
    const verifyUrl = certificate.verification_url || `${window.location.origin}/verify/${certificate.verification_code}`;
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 160, color: { dark: '#131316', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch((e) => {
        console.error('QR code generation failed', e);
        setQrDataUrl(null);
      });
  }, [certificate]);

  const downloadPdf = async () => {
    if (!certificate) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const element = document.getElementById('certificate-card');
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const studentSlug = slugify(certificate.recipient_name, 'student');
      const certificateIdSlug = slugify(certificate.certificate_id, certificate.id);
      pdf.save(`Pathwisse-Certificate-${studentSlug}-${certificateIdSlug}.pdf`);
    } catch (e) {
      console.error('Certificate download failed', e);
      setDownloadError('Could not generate the certificate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const getVerifyUrl = () => {
    if (!certificate?.verification_code) return null;
    return certificate.verification_url || `${window.location.origin}/verify/${certificate.verification_code}`;
  };

  const shareCertificate = async () => {
    const shareUrl = getVerifyUrl();
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Pathwisse Certificate', url: shareUrl });
      } catch (e) {
        console.error('Share failed', e);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard');
    }
  };

  const shareToLinkedIn = () => {
    const shareUrl = getVerifyUrl();
    if (!shareUrl) return;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const BackLink = () => (
    <Link to="/sessions" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors duration-200 w-fit mb-4">
      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      <span className="font-label-sm text-label-sm">Back to My Sessions</span>
    </Link>
  );

  const Chrome = ({ children }) => (
    <div className="font-body-md text-body-md min-h-screen flex flex-col">
      <div className="glow-background" />
      <main className="flex-grow w-full max-w-container-max mx-auto px-gutter py-section-gap flex flex-col gap-element-gap">
        <BackLink />
        {children}
      </main>
    </div>
  );

  if (loading) {
    return <Chrome><div className="flex justify-center items-center py-32 text-on-surface-variant">Loading…</div></Chrome>;
  }

  if (error) {
    return (
      <Chrome>
        <div className="flex flex-col items-center justify-center gap-3 py-32 px-4 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl">error</span>
          <p className="text-title-md font-title-md font-semibold text-on-surface">{error}</p>
          <Link to="/sessions" className="text-primary hover:text-primary-fixed-dim text-sm">Back to My Sessions</Link>
        </div>
      </Chrome>
    );
  }

  if (!certificate) {
    return (
      <Chrome>
        <div className="flex flex-col items-center justify-center gap-3 py-32 px-4 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-4xl">hourglass_empty</span>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">{sessionData?.title}</h1>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">
            Your certificate for this session hasn't been issued yet. Please check back later.
          </p>
          <Link to="/sessions" className="text-primary hover:text-primary-fixed-dim text-sm mt-2">Back to My Sessions</Link>
        </div>
      </Chrome>
    );
  }

  const issuedDate = new Date(certificate.issued_at || sessionData.session_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const sessionDate = new Date(sessionData.session_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Chrome>
      <header className="glass-panel p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-primary font-label-sm text-label-sm tracking-wider uppercase">
              {(sessionData.session_type || 'Session').replace(/_/g, ' ')}
            </span>
            <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface md:font-display-lg md:text-display-lg truncate">
            {sessionData.title}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] opacity-70">event</span>
            {sessionDate}
          </p>
        </div>
        <div className="flex flex-col md:items-end gap-1 text-on-surface-variant shrink-0">
          <span className="font-label-sm text-label-sm opacity-60">Certificate ID</span>
          <span className="font-mono text-sm">{certificate.certificate_id}</span>
        </div>
      </header>

      <section className="flex flex-col items-center gap-8 animate-cert-entrance">
        <div className="text-center flex flex-col gap-2">
          <h2 className="font-title-md text-title-md text-on-surface">Your Certificate</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Your certificate for this session is available below.</p>
        </div>

        <div id="certificate-card" className="w-full max-w-[1000px] certificate-viewer rounded-lg p-5 sm:p-8 md:p-16 flex flex-col justify-between border border-gray-200">
          <div className="cert-watermark" />
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 z-10">
            <div className="font-display-lg text-display-lg text-surface-container-highest tracking-tighter">Pathwisse</div>
            <div className="text-left sm:text-right">
              <span className="block font-label-sm text-label-sm text-surface-variant opacity-50 uppercase tracking-widest">Certificate ID</span>
              <span className="block font-mono text-sm text-surface-variant break-all">{certificate.certificate_id}</span>
            </div>
          </div>

          <div className="flex flex-col items-center text-center z-10 my-8">
            <h3 className="font-label-sm text-label-sm tracking-[0.3em] text-surface-variant uppercase mb-12">Certificate of Participation</h3>
            <p className="font-body-lg text-body-lg text-surface-variant italic mb-4">Presented to</p>
            <h2 className="font-certificate-name text-certificate-name text-surface-container-highest mb-12 border-b border-gray-300 pb-2 px-12 inline-block">
              {certificate.recipient_name || 'Student'}
            </h2>
            <p className="font-body-lg text-body-lg text-surface-variant mb-2">For successful participation in</p>
            <h4 className="font-title-md text-title-md text-surface-container-highest">{sessionData.title}</h4>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-0 z-10 w-full mt-auto pt-8 border-t border-gray-100">
            <div className="flex flex-col text-center sm:text-left w-full sm:w-1/3 items-center sm:items-start">
              <span className="font-title-md text-title-md text-surface-container-highest">{issuedDate}</span>
              <span className="font-label-sm text-label-sm text-surface-variant opacity-70 uppercase tracking-wider">Date Issued</span>
            </div>
            <div className="flex justify-center w-full sm:w-1/3">
              <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded flex items-center justify-center p-1">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Scan to verify this certificate" className="w-full h-full object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-gray-400 text-[36px]">qr_code_2</span>
                )}
              </div>
            </div>
            <div className="flex flex-col text-center sm:text-right w-full sm:w-1/3 items-center sm:items-end">
              <div className="h-12 w-32 border-b border-gray-300 mb-2" />
              <span className="font-label-sm text-label-sm text-surface-variant opacity-70 uppercase tracking-wider">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </section>

      {downloadError && <p className="text-error text-sm text-center">{downloadError}</p>}

      <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-[1000px] mx-auto">
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="btn-primary w-full sm:w-auto px-8 py-3 rounded-lg text-body-md font-body-md font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
        >
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
        <button onClick={shareCertificate} className="btn-secondary w-full sm:w-auto px-8 py-3 rounded-lg text-body-md font-body-md font-semibold flex justify-center items-center gap-2">
          Share
        </button>
        <button
          onClick={shareToLinkedIn}
          className="w-full sm:w-auto px-8 py-3 rounded-lg text-body-md font-body-md font-semibold flex justify-center items-center gap-2 text-white transition-colors"
          style={{ backgroundColor: '#0A66C2' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"/>
          </svg>
          Share on LinkedIn
        </button>
      </div>

      {certificate.verification_code && (
        <p className="text-center text-label-sm font-label-sm text-on-surface-variant">
          <a
            href={`/verify/${certificate.verification_code}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:text-primary-fixed-dim transition-colors"
          >
            Verify this certificate
          </a>
        </p>
      )}
    </Chrome>
  );
};

export default SessionDetailPage;
