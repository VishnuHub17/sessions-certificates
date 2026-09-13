-- supabase/migrations/20260913_02_certificate_schema.sql
-- Certificate system schema: sessions, session_attendance, certificates,
-- plus RLS for every user-facing table and the public certificate
-- verification path.

-- ---------------------------------------------------------------------------
-- 0. Align profiles with the certificate system's naming (fresh project has
--    no data yet, so a straight rename is safe). Guarded so this migration
--    can be re-run / applied to a profiles table that's already renamed.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'mobile')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles RENAME COLUMN mobile TO phone;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'college')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'college_name') THEN
    ALTER TABLE public.profiles RENAME COLUMN college TO college_name;
  END IF;
END $$;

-- Auto-provision a profile row whenever a new auth user is created (phone-only
-- OTP sign-ins have no other hook that would create one).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, email)
  VALUES (NEW.id, NEW.phone, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Generic updated_at trigger (profiles already has its own equivalent).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    session_type TEXT NOT NULL CHECK (session_type IN ('webinar', 'workshop', 'career_session', 'seminar', 'training')),
    session_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    certificate_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON public.sessions;
CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. session_attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    attended BOOLEAN NOT NULL DEFAULT false,
    attendance_status TEXT NOT NULL DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'no_show')),
    attended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT session_attendance_unique_per_student UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS session_attendance_user_id_idx ON public.session_attendance(user_id);
CREATE INDEX IF NOT EXISTS session_attendance_session_id_idx ON public.session_attendance(session_id);

-- ---------------------------------------------------------------------------
-- 3. certificates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id TEXT NOT NULL UNIQUE, -- human-readable, e.g. PW-CUS-2026-001248
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verification_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
    verification_url TEXT,
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT certificates_unique_per_student_session UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS certificates_session_id_idx ON public.certificates(session_id);
CREATE INDEX IF NOT EXISTS certificates_verification_code_idx ON public.certificates(verification_code);

DROP TRIGGER IF EXISTS trg_certificates_updated_at ON public.certificates;
CREATE TRIGGER trg_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
--    Authenticated students may only ever read rows that belong to them.
--    All writes go through the service-role key (Edge Functions / admin
--    tooling), which bypasses RLS by design — no write policies are granted
--    to `authenticated`, so the client can never insert/update/delete here.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_select_attended" ON public.sessions;
CREATE POLICY "sessions_select_attended" ON public.sessions
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.session_attendance sa
        WHERE sa.session_id = sessions.id AND sa.user_id = auth.uid()
      )
    );

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_select_own" ON public.session_attendance;
CREATE POLICY "attendance_select_own" ON public.session_attendance
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "certificates_select_own" ON public.certificates;
CREATE POLICY "certificates_select_own" ON public.certificates
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Public certificate verification
--    A SECURITY DEFINER function is used instead of an RLS policy for `anon`
--    so verification can never leak more than these five safe columns, no
--    matter what a caller requests — phone numbers and auth user ids never
--    leave the database via this path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code TEXT)
RETURNS TABLE (
    found BOOLEAN,
    recipient_name TEXT,
    session_title TEXT,
    certificate_id TEXT,
    issued_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT true, c.recipient_name, s.title, c.certificate_id, c.issued_at, c.status
  FROM public.certificates c
  JOIN public.sessions s ON s.id = c.session_id
  WHERE c.verification_code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;
