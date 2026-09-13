// src/pages/SessionsPage.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { loadParticipantSessions } from '../lib/phoneAuthService.js';
import { useAuth } from '../context/AuthContext.jsx';
import SessionCard from '../components/SessionCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import AppFooter from '../components/AppFooter.jsx';

const PageChrome = ({ children }) => (
  <div className="antialiased font-body-md text-body-md overflow-x-hidden min-h-screen flex flex-col">
    <div className="bg-glow" />
    <AppHeader />
    <main className="relative z-10 pt-32 pb-24 px-gutter max-w-container-max mx-auto w-full flex-1">{children}</main>
    <AppFooter />
  </div>
);

const SessionsPage = () => {
  const { mode } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unknownPhone, setUnknownPhone] = useState(false);

  useEffect(() => {
    const fetchViaTestBridge = async () => {
      const result = await loadParticipantSessions();
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setUnknownPhone(result.known === false);
      setSessions((result.items || []).map((item) => ({ id: item.session.id, sessions: item.session, certificate: item.certificate })));
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

        // Attended sessions for the logged-in student (RLS also restricts this to their own rows).
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('session_attendance')
          .select('id, attendance_status, attended_at, sessions(*)')
          .eq('user_id', user.id)
          .eq('attendance_status', 'attended')
          .order('attended_at', { ascending: false });

        if (attendanceError) {
          setError('Could not reach Supabase. Please check your connection and try again.');
          setLoading(false);
          return;
        }

        // Certificates issued to this student, scoped to their own rows.
        // Revoked certificates are excluded — they must never present as a valid,
        // downloadable certificate on the sessions list.
        const { data: certsData, error: certsError } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'issued');

        if (certsError) {
          setError('Could not reach Supabase. Please check your connection and try again.');
          setLoading(false);
          return;
        }

        const mergedData = (attendanceData || [])
          .filter((item) => item.sessions)
          .map((item) => ({
            ...item,
            certificate: (certsData || []).find((c) => c.session_id === item.sessions?.id) || null,
          }));

        setSessions(mergedData);
        setLoading(false);
      } catch (e) {
        console.error('SessionsPage: unexpected error loading sessions', e);
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
  }, [mode]);

  if (loading) {
    return (
      <PageChrome>
        <div className="flex justify-center items-center py-32 text-on-surface-variant">Loading your sessions…</div>
      </PageChrome>
    );
  }

  if (error) {
    return (
      <PageChrome>
        <div className="text-error">{error}</div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <header className="mb-section-gap">
        <h1 className="text-display-lg font-display-lg text-white mb-4">My Sessions</h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl">
          Sessions you've attended with Pathwisse and the certificates available for them.
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-start gap-2 py-8">
          <h2 className="text-title-md font-title-md font-semibold text-on-surface">
            {unknownPhone ? 'No participation certificates found for this phone number.' : 'No completed sessions yet'}
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">
            {unknownPhone
              ? "We couldn't match this number to a CareerVoice participant record."
              : "Certificates from Pathwisse sessions you've attended will appear here."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-element-gap">
          {sessions.map((sess) => (
            <SessionCard key={sess.id} session={sess.sessions} certificate={sess.certificate} />
          ))}
        </div>
      )}
    </PageChrome>
  );
};

export default SessionsPage;
