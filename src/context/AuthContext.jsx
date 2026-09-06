// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { getTestSession, clearSession as clearTestSession, isTestAuthEnabled } from '../lib/phoneAuthService.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [testSession, setTestSession] = useState(() => (isTestAuthEnabled() ? getTestSession() : null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Test session lives in localStorage, not the Supabase client — keep it in sync
  // across tabs and after login/logout writes from this same tab.
  useEffect(() => {
    if (!isTestAuthEnabled()) return undefined;
    const onStorage = () => setTestSession(getTestSession());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const refreshTestSession = useCallback(() => {
    setTestSession(isTestAuthEnabled() ? getTestSession() : null);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearTestSession();
    setTestSession(null);
  }, []);

  const mode = session ? 'supabase' : testSession ? 'test' : null;
  const value = {
    session,
    testSession,
    mode,
    isAuthenticated: Boolean(session || testSession),
    participant: testSession
      ? { phone: testSession.phone, name: testSession.participantName }
      : session
        ? { phone: session.user?.phone || null, name: session.user?.email || null }
        : null,
    loading,
    refreshTestSession,
    logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
