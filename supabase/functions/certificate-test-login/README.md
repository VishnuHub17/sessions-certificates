# certificate-test-login (QA-only Edge Function)

Bridges the Certificate Portal's phone+OTP **test mode** to real, RLS-protected
`session_attendance`/`certificates` data — without weakening RLS, without a
service-role key ever reaching the browser, and without a fake Supabase JWT.

## Why this exists

`session_attendance`/`certificates` RLS requires `auth.uid() = user_id`. Test
mode has no real Supabase session (phone auth isn't enabled on this project
yet — see below), so the browser cannot satisfy RLS directly. This function
runs server-side with the service-role key, checks a closed QA allowlist, and
returns only that one phone number's own data.

## Deploy (requires Supabase CLI login + project access — not available to me in this session)

```bash
supabase login
supabase link --project-ref ulmmjdoxyfrpiocthmkv
supabase functions deploy certificate-test-login

# Secrets (server-side only — never VITE_* / never in the frontend build):
supabase secrets set APP_ENV=development
supabase secrets set CERTIFICATE_TEST_AUTH=true
supabase secrets set CERTIFICATE_TEST_SESSION_SECRET="$(openssl rand -hex 32)"

# QA allowlist: phone -> an existing auth.users id that already has (or will have)
# real session_attendance/certificates rows. No schema change needed.
supabase secrets set CERTIFICATE_QA_PARTICIPANTS='[
  {"phone":"+919876543210","user_id":"<existing-auth-users-uuid>","name":"QA Participant"}
]'
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into
every Edge Function by the platform — do not set them manually, and never put
them in `.env`/Vite config.

## Turning it off / going to production

- Set `APP_ENV=production` (hard refusal, independent of the flag below), and/or
- Set `CERTIFICATE_TEST_AUTH=false` (or unset it).
- Once Supabase's Phone provider is enabled and an SMS provider is actually
  wired up (currently `phone: false` on this project per `/auth/v1/settings`),
  swap the frontend's `phoneAuthService` over to
  `supabase.auth.signInWithOtp({ phone })` / `verifyOtp(...)` and delete this
  function and its secrets. No other portal code needs to change — the
  frontend only ever talks to `PhoneAuthService`'s interface.

## Contract

`POST /functions/v1/certificate-test-login`

| action | body | returns |
|---|---|---|
| `verify` | `{ phone, otp }` | `{ known, participant, token, items }` |
| `bundle` | `{ phone, token }` | `{ known, items }` |
| `sessionDetail` | `{ phone, token, sessionId }` | `{ session, certificate }` |

- `otp` may be any 6-digit numeric string in test mode — real verification is
  a future concern once Supabase phone auth is live.
- `token` is a short-lived (2h) HMAC-signed value tied to the phone number,
  issued by `verify` and required by `bundle`/`sessionDetail`. It is **not** a
  Supabase JWT and grants no direct table access.
- An unknown (non-allowlisted) phone returns `known:false, items:[]` — never
  fabricated data, never another participant's data.
- `sessionDetail` always re-derives the participant from the verified phone
  server-side; it never trusts a client-supplied user id.
