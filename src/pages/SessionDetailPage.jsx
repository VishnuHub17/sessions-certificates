// src/pages/SessionDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { fetchSessionDetail } from '../lib/phoneAuthService.js';
import { useAuth } from '../context/AuthContext.jsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('You need to sign in to view this session.');
        setLoading(false);
        return;
      }

      // Verify the student actually attended this session before showing anything about it.
      const { data: attendance, error: attendErr } = await supabase
        .from('session_attendance')
        .select('attendance_status, sessions(*)')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (attendErr || !attendance || !attendance.sessions) {
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

      const { data: certData } = await supabase
        .from('certificates')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      setSessionData(attendance.sessions);
      setCertificate(certData || null);
      setLoading(false);
    };

    setLoading(true);
    setError(null);
    if (mode === 'test') {
      fetchViaTestBridge();
    } else {
      fetchViaSupabase();
    }
  }, [sessionId, mode]);

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
      const sessionSlug = slugify(sessionData?.title, 'session');
      pdf.save(`${studentSlug}-${sessionSlug}-certificate.pdf`);
    } catch (e) {
      console.error('Certificate download failed', e);
      setDownloadError('Could not generate the certificate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const shareCertificate = async () => {
    const shareUrl = `${window.location.origin}/sessions/${sessionId}`;
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

  const Chrome = ({ children }) => (
    <div className="relative min-h-screen bg-surface text-on-surface overflow-x-hidden">
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />
      <nav className="flex items-center justify-between p-4 bg-[#0B0B10]/80 backdrop-blur-md border-b border-white/5 z-10 relative">
        <Link to="/sessions" className="text-label-sm text-on-surface-variant hover:text-primary transition-colors">← Back to My Sessions</Link>
        <span className="text-title-md font-title-md font-bold text-on-surface">Pathwisse</span>
      </nav>
      {children}
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
          <p className="text-title-md font-semibold">{error}</p>
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
          <h1 className="text-headline-lg font-bold">{sessionData?.title}</h1>
          <p className="text-body-md text-on-surface-variant max-w-sm">
            Your certificate for this session hasn't been issued yet. Please check back later.
          </p>
          <Link to="/sessions" className="text-primary hover:text-primary-fixed-dim text-sm mt-2">Back to My Sessions</Link>
        </div>
      </Chrome>
    );
  }

  return (
    <Chrome>
      <div className="flex flex-col items-center justify-center pt-12 p-4">
        <h1 className="text-center text-headline-lg font-bold mb-6">{sessionData.title}</h1>
        <div id="certificate-card" className="glass-panel rounded-xl p-6 border border-primary/30 w-full max-w-[480px]">
          <h2 className="text-title-md font-semibold mb-2">Certificate of Participation</h2>
          <p className="text-body-md text-on-surface-variant">This certifies that</p>
          <p className="text-title-md font-bold my-2 text-on-surface">{certificate.recipient_name || 'Student'}</p>
          <p className="text-body-md text-on-surface-variant">has attended the session</p>
          <p className="text-title-md font-semibold my-2 text-on-surface">{sessionData.title}</p>
          <p className="text-body-md text-on-surface-variant">on {new Date(sessionData.session_date).toLocaleDateString()}</p>
          <p className="text-body-md text-on-surface-variant mt-4">Issued at: {new Date(certificate.issued_at || Date.now()).toLocaleDateString()}</p>
          <p className="text-body-md text-on-surface-variant">Certificate ID: {certificate.id}</p>
        </div>
        {downloadError && <p className="text-error text-sm mt-4">{downloadError}</p>}
        <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-center w-full max-w-[480px]">
          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="btn-primary w-full py-3 px-4 rounded-lg text-body-md font-body-md font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
          <button onClick={shareCertificate} className="btn-primary w-full py-3 px-4 rounded-lg text-body-md font-body-md font-semibold flex justify-center items-center gap-2">
            Share
          </button>
        </div>
      </div>
    </Chrome>
  );
};

export default SessionDetailPage;
