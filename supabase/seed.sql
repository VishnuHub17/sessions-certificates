-- supabase/seed.sql
--
-- Development seed data for the certificate flow: one phone-auth student
-- with 3 attended sessions, 2 issued certificates, and 1 certificate-pending
-- session. No production secrets — this is local/dev-only fixture data.
--
-- NOTE: `supabase db push` only applies migrations; it does not run this
-- file against a remote project. Apply it yourself, once, after the
-- migrations are pushed:
--   supabase db execute -f supabase/seed.sql   (CLI proxies to the linked project)
--   -- or paste this file's contents into the Supabase Studio SQL Editor.
-- `supabase db reset` (local dev only) runs it automatically.

-- ---------------------------------------------------------------------------
-- 1. Test student (phone-only auth user)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID;
  v_session_1 UUID;
  v_session_2 UUID;
  v_session_3 UUID;
BEGIN
  -- Reuse the user if this seed has already run once.
  SELECT id INTO v_user_id FROM auth.users WHERE phone = '+919876543210';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, phone, phone_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '+919876543210', now(), now(), now(), '{"provider":"phone","providers":["phone"]}', '{}'
    );
  END IF;

  -- The on_auth_user_created trigger (migration 02) auto-creates a bare
  -- profiles row for new auth.users — fill in the rest here.
  UPDATE public.profiles
  SET full_name = 'Aarav Sharma', college_name = 'IIT Bombay'
  WHERE user_id = v_user_id;

  -- ---------------------------------------------------------------------
  -- 2. Sessions
  -- ---------------------------------------------------------------------
  INSERT INTO public.sessions (title, description, session_type, session_date, status, certificate_enabled)
  VALUES ('Career Understanding Session', 'A guided session on mapping career goals to concrete next steps.', 'career_session', '2026-08-28', 'completed', true)
  RETURNING id INTO v_session_1;

  INSERT INTO public.sessions (title, description, session_type, session_date, status, certificate_enabled)
  VALUES ('How to Choose the Right Career', 'A live webinar on evaluating career paths and tradeoffs.', 'webinar', '2026-08-21', 'completed', true)
  RETURNING id INTO v_session_2;

  INSERT INTO public.sessions (title, description, session_type, session_date, status, certificate_enabled)
  VALUES ('Building Your Career Roadmap', 'A hands-on workshop for drafting a 12-month career roadmap.', 'workshop', '2026-08-14', 'completed', true)
  RETURNING id INTO v_session_3;

  -- ---------------------------------------------------------------------
  -- 3. Attendance (all three attended)
  -- ---------------------------------------------------------------------
  INSERT INTO public.session_attendance (session_id, user_id, phone, attended, attendance_status, attended_at)
  VALUES
    (v_session_1, v_user_id, '+919876543210', true, 'attended', '2026-08-28 10:00:00+05:30'),
    (v_session_2, v_user_id, '+919876543210', true, 'attended', '2026-08-21 18:00:00+05:30'),
    (v_session_3, v_user_id, '+919876543210', true, 'attended', '2026-08-14 15:00:00+05:30')
  ON CONFLICT (session_id, user_id) DO NOTHING;

  -- ---------------------------------------------------------------------
  -- 4. Certificates — issued for sessions 1 and 2, session 3 left pending.
  -- ---------------------------------------------------------------------
  INSERT INTO public.certificates (certificate_id, session_id, user_id, recipient_name, issued_at)
  VALUES ('PW-CUS-2026-001248', v_session_1, v_user_id, 'Aarav Sharma', '2026-08-28 12:00:00+05:30')
  ON CONFLICT (session_id, user_id) DO NOTHING;

  INSERT INTO public.certificates (certificate_id, session_id, user_id, recipient_name, issued_at)
  VALUES ('PW-WEB-2026-000842', v_session_2, v_user_id, 'Aarav Sharma', '2026-08-21 20:00:00+05:30')
  ON CONFLICT (session_id, user_id) DO NOTHING;

  -- Backfill verification_url now that we know each certificate's code.
  UPDATE public.certificates
  SET verification_url = 'https://certificates.pathwisse.com/verify/' || verification_code
  WHERE session_id IN (v_session_1, v_session_2) AND user_id = v_user_id AND verification_url IS NULL;
END $$;
