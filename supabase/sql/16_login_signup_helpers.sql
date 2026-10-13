-- ============================================================================
-- KindLink - Database Migration 16: Login & Signup Helpers
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose:
--   1. Ensures RLS policies allow reading profile by username for login.
--   2. Provides get_email_by_username(p_username) for username-based authentication.
--   3. Enforces unique constraint on profiles.username and ensures profiles.email exists.
--   4. Adds accepted_at column to requests table for response-time metrics.
-- Safety: Completely idempotent (safe to re-run multiple times).
-- ============================================================================

-- 1. ENSURE PROFILES TABLE SCHEMA & UNIQUE CONSTRAINTS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Sync emails from auth.users into public.profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Unique constraint on profiles.username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    EXCEPTION
      WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

-- Ensure ratings table has rating_score column for live_stats compatibility
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS rating_score numeric;
UPDATE public.ratings SET rating_score = stars WHERE rating_score IS NULL;

-- 2. ADD accepted_at COLUMN TO requests IF MISSING
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_requests_accepted_at ON public.requests (accepted_at);

-- 3. RLS POLICY: ALLOW PROFILE SELECT BY USERNAME FOR LOGIN
DROP POLICY IF EXISTS "profiles_select_by_username" ON public.profiles;
CREATE POLICY "profiles_select_by_username"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR username = (SELECT p2.username FROM public.profiles p2 WHERE p2.id = auth.uid())
    OR public.is_admin()
  );

-- 4. FUNCTION: get_email_by_username
-- Resolves email for username-based login without exposing entire profile row to anon
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(p.email, u.email)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE lower(p.username) = lower(p_username)
     OR p.username = p_username
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_email_by_username TO anon, authenticated;

-- End of 16_login_signup_helpers.sql
