// src/pages/SessionsPage.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { loadParticipantSessions } from '../lib/phoneAuthService.js';
import { useAuth } from '../context/AuthContext.jsx';
import SessionCard from '../components/SessionCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import AppFooter from '../components/AppFooter.jsx';

const PageChrome = ({ children }) => (
  <div className="relative min-h-screen bg-surface text-on-surface flex flex-col overflow-x-hidden">
    <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />
    <div className="absolute inset-0 atmospheric-glow pointer-events-none" />
    <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />
    <AppHeader />
    <div className="flex-1 z-10 relative">{children}</div>
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('You need to sign in to view your sessions.');
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
        setError(attendanceError.message);
        setLoading(false);
        return;
      }

      // Certificates issued to this student, scoped to their own rows.
      const { data: certsData, error: certsError } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id);

      if (certsError) {
        setError(certsError.message);
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
        <div className="max-w-[1200px] mx-auto px-6 py-16 text-error">Error: {error}</div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-headline-lg font-bold mb-2">My Sessions</h1>
        <p className="text-body-md text-on-surface-variant mb-8 max-w-2xl">
          Sessions you've attended with Pathwisse and the certificates available for them.
        </p>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-start gap-2 py-8">
            <h2 className="text-title-lg font-semibold">
              {unknownPhone ? 'No participation certificates found for this phone number.' : 'No completed sessions yet'}
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              {unknownPhone
                ? "We couldn't match this number to a CareerVoice participant record."
                : "Certificates from Pathwisse sessions you've attended will appear here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((sess) => (
              <SessionCard key={sess.id} session={sess.sessions} certificate={sess.certificate} />
            ))}
          </div>
        )}
      </div>
    </PageChrome>
  );
};

export default SessionsPage;
