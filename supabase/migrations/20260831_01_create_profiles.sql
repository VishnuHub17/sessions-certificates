-- supabase/migrations/20260831_01_create_profiles.sql
-- Create canonical profiles table (if not existing)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    mobile TEXT,
    college TEXT,
    department TEXT,
    academic_year TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure one profile per auth user
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);

-- Trigger to refresh updated_at on update
CREATE OR REPLACE FUNCTION public.refresh_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_refresh_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.refresh_profiles_updated_at();
