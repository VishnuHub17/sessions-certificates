// src/lib/phoneAuthService.js
//
// Modular phone+OTP auth boundary for the Certificate Portal.
//
// isTestAuthEnabled() gates a QA-only bridge (see supabase/functions/
// certificate-test-login) that accepts any 6-digit OTP. It is refused
// whenever this is a production build, regardless of the env var, so the
// bypass cannot ship by accident.
//
// The real (non-test) path below is the one to keep once Supabase phone auth
// is enabled and wired to an SMS provider — swap TEST_AUTH off and this
// module talks to signInWithOtp/verifyOtp directly, with no caller changes.

import { supabase } from './supabaseClient.js';

const TEST_SESSION_KEY = 'certificate_test_session';
const FUNCTION_NAME = 'certificate-test-login';

export function isTestAuthEnabled() {
  const flag = import.meta.env.VITE_CERTIFICATE_TEST_AUTH === 'true';
  if (flag && import.meta.env.PROD) {
    // Defensive production guard: never honor the flag in a production build.
    console.error(
      '[phoneAuthService] VITE_CERTIFICATE_TEST_AUTH=true was set on a production build. ' +
      'Refusing to activate the OTP test bypass.'
    );
    return false;
  }
  return flag;
}

export function normalizePhoneIN(raw) {
  if (!raw) return { ok: false, error: 'Enter your mobile number.' };
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length !== 10) return { ok: false, error: 'Enter a valid 10-digit Indian mobile number.' };
  if (!/^[6-9]\d{9}$/.test(digits)) return { ok: false, error: 'Enter a valid Indian mobile number.' };
  return { ok: true, e164: `+91${digits}` };
}

export function isValidOtp(otp) {
  return /^\d{6}$/.test(String(otp || ''));
}

function readTestSession() {
  try {
    const raw = localStorage.getItem(TEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.phone || !parsed?.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(TEST_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeTestSession(session) {
  localStorage.setItem(TEST_SESSION_KEY, JSON.stringify(session));
}

function clearTestSession() {
  localStorage.removeItem(TEST_SESSION_KEY);
}

async function invokeTestLogin(payload) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: payload });
  if (error) {
    // supabase-js surfaces non-2xx responses here without the parsed body in older versions;
    // try to recover the server's JSON error message when available.
    const serverMessage = error?.context?.body ? await tryReadJson(error.context.body) : null;
    return { ok: false, error: serverMessage?.error || error.message || 'Test login is unavailable.' };
  }
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true, data };
}

async function tryReadJson(body) {
  try {
    if (typeof body === 'string') return JSON.parse(body);
    if (body instanceof Blob) return JSON.parse(await body.text());
    return null;
  } catch {
    return null;
  }
}

// ---- Public API -----------------------------------------------------------

/**
 * Step 1: request an OTP for a phone number.
 * Test mode: purely client-side simulation (no network call needed — the
 * real verification/allowlist check happens in verifyOtp against the edge
 * function). Real mode: Supabase signInWithOtp.
 */
export async function sendOtp(phone) {
  const normalized = normalizePhoneIN(phone);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  if (isTestAuthEnabled()) {
    return { ok: true, e164: normalized.e164 };
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: normalized.e164 });
  if (error) return { ok: false, error: error.message };
  return { ok: true, e164: normalized.e164 };
}

/**
 * Step 2: verify the OTP and establish an identity.
 * Test mode: any 6-digit code, checked against the QA bridge which resolves
 * the participant and returns their real attendance/certificate bundle.
 * Real mode: Supabase verifyOtp, establishing a real JWT session.
 */
export async function verifyOtp(phone, otp) {
  const normalized = normalizePhoneIN(phone);
  if (!normalized.ok) return { ok: false, error: normalized.error };
  if (!isValidOtp(otp)) return { ok: false, error: 'Enter the 6-digit OTP.' };

  if (isTestAuthEnabled()) {
    const result = await invokeTestLogin({ action: 'verify', phone: normalized.e164, otp });
    if (!result.ok) return result;
    const { participant, token, items, known } = result.data;
    writeTestSession({
      phone: normalized.e164,
      participantName: participant?.name || null,
      token,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });
    return { ok: true, mode: 'test', known, phone: normalized.e164, participant, items };
  }

  const { data, error } = await supabase.auth.verifyOtp({ phone: normalized.e164, token: otp, type: 'sms' });
  if (error) return { ok: false, error: error.message };
  return { ok: true, mode: 'supabase', phone: normalized.e164, session: data.session };
}

export function getTestSession() {
  return readTestSession();
}

export function clearSession() {
  clearTestSession();
}

/** Re-fetch the current test participant's session/certificate bundle. */
export async function loadParticipantSessions() {
  const session = readTestSession();
  if (!session) return { ok: false, error: 'No active test session.' };
  const result = await invokeTestLogin({ action: 'bundle', phone: session.phone, token: session.token });
  if (!result.ok) return result;
  return { ok: true, known: result.data.known, items: result.data.items };
}

/** Fetch one session's attendance+certificate, scoped server-side to the current test participant. */
export async function fetchSessionDetail(sessionId) {
  const session = readTestSession();
  if (!session) return { ok: false, error: 'No active test session.' };
  const result = await invokeTestLogin({ action: 'sessionDetail', phone: session.phone, token: session.token, sessionId });
  if (!result.ok) return result;
  return { ok: true, session: result.data.session, certificate: result.data.certificate, error: result.data.error };
}
