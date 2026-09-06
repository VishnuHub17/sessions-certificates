// supabase/functions/certificate-test-login/index.ts
//
// TEST-ONLY bridge for the Certificate Portal's phone+OTP QA flow.
//
// Why this exists: session_attendance/certificates are RLS-protected by
// auth.uid(). The portal's test login accepts any 6-digit OTP and has no
// real Supabase JWT, so it cannot satisfy RLS from the browser. This function
// is the one sanctioned exception: it runs server-side with the service-role
// key (never shipped to the browser), resolves a phone number against a
// closed QA allowlist, and returns only that participant's own bundle.
//
// It must never run in production. Two independent gates enforce that:
//   1. CERTIFICATE_TEST_AUTH secret must literally be the string "true".
//   2. APP_ENV secret must NOT be "production" (checked even if #1 is true).
// Both are Edge Function secrets (`supabase secrets set ...`), never the
// anon key, never present in any frontend bundle.
//
// Actions (POST body { action, ... }):
//   verify        { phone, otp }                 -> issues a short-lived test-session token
//   bundle        { phone, token }                -> re-fetches the participant's sessions+certificates
//   sessionDetail { phone, token, sessionId }      -> one session's attendance+certificate, scoped server-side
//
// Swapping this out later: once Supabase phone auth is enabled and wired to
// a real SMS provider, the frontend's PhoneAuthService switches to
// supabase.auth.signInWithOtp/verifyOtp and this function (and its secrets)
// can simply be deleted. No other portal code changes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---- phone normalization (Indian mobile numbers only, for now) ----
function normalizePhoneIN(raw: string): { ok: true; e164: string } | { ok: false; error: string } {
  if (!raw) return { ok: false, error: "Phone number is required." };
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length !== 10) return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
  if (!/^[6-9]\d{9}$/.test(digits)) return { ok: false, error: "Enter a valid Indian mobile number." };
  return { ok: true, e164: `+91${digits}` };
}

// ---- signed, stateless test-session token (HMAC-SHA256, 2h expiry) ----
const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  return `${b64url(payloadBytes)}.${b64url(sig)}`;
}
async function verifyToken(token: string, secret: string, expectedPhone: string): Promise<{ ok: boolean; error?: string }> {
  // Any malformed input (bad base64url, non-JSON payload, wrong-length signature, etc.)
  // must reject cleanly as an invalid token, never crash the function.
  try {
    const parts = (token || "").split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "Invalid session token." };
    const [payloadPart, sigPart] = parts;
    const payloadBytes = b64urlToBytes(payloadPart);
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sigPart), payloadBytes);
    if (!valid) return { ok: false, error: "Invalid session token." };
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return { ok: false, error: "Session expired. Please log in again." };
    if (payload.phone !== expectedPhone) return { ok: false, error: "Session token does not match phone number." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid session token." };
  }
}

// ---- QA allowlist: phone -> { user_id, name } ----
// Configured as a secret so no schema change / migration is needed:
//   supabase secrets set CERTIFICATE_QA_PARTICIPANTS='[{"phone":"+919876543210","user_id":"<uuid>","name":"QA Participant"}]'
function loadAllowlist(): Array<{ phone: string; user_id: string; name: string }> {
  const raw = Deno.env.get("CERTIFICATE_QA_PARTICIPANTS");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadBundle(adminClient: ReturnType<typeof createClient>, userId: string) {
  const { data: attendance, error: attendErr } = await adminClient
    .from("session_attendance")
    .select("id, attendance_status, attended_at, sessions(*)")
    .eq("user_id", userId)
    .eq("attendance_status", "attended")
    .order("attended_at", { ascending: false });
  if (attendErr) throw attendErr;

  const { data: certs, error: certErr } = await adminClient
    .from("certificates")
    .select("*")
    .eq("user_id", userId);
  if (certErr) throw certErr;

  return (attendance || [])
    .filter((row) => row.sessions)
    .map((row) => ({
      session: row.sessions,
      certificate: (certs || []).find((c) => c.session_id === row.sessions.id) || null,
    }));
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (e) {
    console.error("certificate-test-login: unhandled error", e);
    return json({ error: "Request could not be processed." }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // --- Gate 1: explicit production refusal, independent of the test-auth flag ---
  const appEnv = (Deno.env.get("APP_ENV") || "").toLowerCase();
  if (appEnv === "production") {
    console.error("certificate-test-login: refused — APP_ENV=production");
    return json({ error: "Test authentication is not available in production." }, 403);
  }
  // --- Gate 2: must be explicitly enabled ---
  if (Deno.env.get("CERTIFICATE_TEST_AUTH") !== "true") {
    console.error("certificate-test-login: refused — CERTIFICATE_TEST_AUTH is not \"true\"");
    return json({ error: "Test authentication is disabled." }, 403);
  }

  const sessionSecret = Deno.env.get("CERTIFICATE_TEST_SESSION_SECRET");
  if (!sessionSecret) {
    console.error("certificate-test-login: misconfigured — CERTIFICATE_TEST_SESSION_SECRET not set");
    return json({ error: "Server misconfiguration." }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const action = body.action;

  if (action === "verify") {
    const phoneInput = String(body.phone || "");
    const otp = String(body.otp || "");

    const normalized = normalizePhoneIN(phoneInput);
    if (!normalized.ok) return json({ error: normalized.error }, 400);
    if (!/^\d{6}$/.test(otp)) return json({ error: "Enter the 6-digit OTP." }, 400);

    const allowlist = loadAllowlist();
    const match = allowlist.find((p) => p.phone === normalized.e164);

    const token = await signToken({ phone: normalized.e164, exp: Date.now() + 2 * 60 * 60 * 1000 }, sessionSecret);

    if (!match) {
      // Unknown phone: OTP still "succeeds" in test mode, but no data is fabricated.
      return json({ known: false, phone: normalized.e164, participant: null, token, items: [] });
    }

    try {
      const items = await loadBundle(adminClient, match.user_id);
      return json({ known: true, phone: normalized.e164, participant: { name: match.name, phone: normalized.e164 }, token, items });
    } catch (e) {
      console.error("certificate-test-login verify: bundle load failed", e);
      return json({ error: "Could not load participant data." }, 500);
    }
  }

  if (action === "bundle" || action === "sessionDetail") {
    const phoneInput = String(body.phone || "");
    const token = String(body.token || "");
    const normalized = normalizePhoneIN(phoneInput);
    if (!normalized.ok) return json({ error: normalized.error }, 400);

    const verified = await verifyToken(token, sessionSecret, normalized.e164);
    if (!verified.ok) return json({ error: verified.error }, 401);

    const allowlist = loadAllowlist();
    const match = allowlist.find((p) => p.phone === normalized.e164);
    if (!match) {
      return action === "bundle" ? json({ known: false, items: [] }) : json({ error: "Not found." }, 404);
    }

    if (action === "bundle") {
      try {
        const items = await loadBundle(adminClient, match.user_id);
        return json({ known: true, items });
      } catch (e) {
        console.error("certificate-test-login bundle: load failed", e);
        return json({ error: "Could not load participant data." }, 500);
      }
    }

    // sessionDetail — always re-scoped server-side to this resolved participant only.
    const sessionId = String(body.sessionId || "");
    if (!sessionId) return json({ error: "sessionId is required." }, 400);

    const { data: attendance, error: attendErr } = await adminClient
      .from("session_attendance")
      .select("attendance_status, sessions(*)")
      .eq("session_id", sessionId)
      .eq("user_id", match.user_id)
      .maybeSingle();

    if (attendErr || !attendance || !attendance.sessions) {
      return json({ error: "No attendance record was found for this session on your account." }, 404);
    }
    if (attendance.attendance_status !== "attended") {
      return json({ error: "You are not eligible for a certificate for this session yet.", session: attendance.sessions }, 200);
    }

    const { data: cert } = await adminClient
      .from("certificates")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", match.user_id)
      .maybeSingle();

    return json({ session: attendance.sessions, certificate: cert || null });
  }

  return json({ error: "Unknown action." }, 400);
}
