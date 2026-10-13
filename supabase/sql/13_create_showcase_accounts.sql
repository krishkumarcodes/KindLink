-- ============================================================================
-- KindLink - Database Migration 13: Create Showcase Demo & Admin Accounts
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Provisions 2 verified community showcase accounts and 1 platform admin
--          with known passwords for portfolio reviews, live demos, and grading.
--          Includes full Supabase GoTrue `auth.identities` synchronization and
--          dual-credential alias accounts for unified demo access.
-- Safety: Completely idempotent (can be re-run safely anytime).
-- ============================================================================
--
-- ACCOUNT CREDENTIALS SUMMARY:
-- ----------------------------------------------------------------------------
-- PRIMARY SHOWCASE ACCOUNTS:
-- 1. Showcase Volunteer:
--    Username: kind_volunteer
--    Email:    volunteer@kindlink.demo
--    Password: KindLink#Volunteer2026
--    Role:     user (verified volunteer)
--
-- 2. Showcase Requester:
--    Username: need_aid
--    Email:    requester@kindlink.demo
--    Password: KindLink#Requester2026
--    Role:     user (verified citizen)
--
-- 3. Super Administrator:
--    Username: admin_kindlink
--    Email:    admin@kindlink.demo
--    Password: KindLink#Admin2026
--    Role:     admin (full access to /admin verification & moderation portal)
--
-- ALIAS ACCOUNTS (1-Click & Unified Demo Password Compatibility):
-- 4. Showcase Volunteer Alias:
--    Username: kind_volunteer_alias
--    Email:    kind_volunteer@kindlink.demo
--    Password: KindLink#2026
--    Role:     user (verified volunteer)
--
-- 5. Showcase Requester Alias:
--    Username: need_aid_alias
--    Email:    need_aid@kindlink.demo
--    Password: KindLink#2026
--    Role:     user (verified citizen)
--
-- 6. Super Administrator Alias:
--    Username: admin_kindlink_alias
--    Email:    admin_kindlink@kindlink.demo
--    Password: KindLink#2026
--    Role:     admin (full access to /admin verification & moderation portal)
-- ----------------------------------------------------------------------------

-- Enable necessary extensions and set search_path to avoid missing function errors
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

SET search_path = public, extensions;

-- Ensure auth.users columns exist (guarantees compatibility with both local shims and Supabase Cloud)
DO $$ BEGIN
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS instance_id uuid;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS aud text DEFAULT 'authenticated';
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'authenticated';
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS encrypted_password text;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb DEFAULT '{"provider":"email","providers":["email"]}'::jsonb;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS phone text;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Ensure auth.identities exists and has all required columns & constraints for GoTrue
CREATE TABLE IF NOT EXISTS auth.identities (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  provider_id text NOT NULL,
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider, provider_id)
);

DO $$ BEGIN
  ALTER TABLE auth.identities ADD COLUMN IF NOT EXISTS provider_id text;
  ALTER TABLE auth.identities ADD COLUMN IF NOT EXISTS identity_data jsonb;
  ALTER TABLE auth.identities ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;
  ALTER TABLE auth.identities ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  ALTER TABLE auth.identities ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identities_provider_id_provider_unique'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'auth' AND tablename = 'identities' AND indexdef LIKE '%provider_id%' AND indexdef LIKE '%provider%'
  ) THEN
    ALTER TABLE auth.identities ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider, provider_id);
  END IF;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Ensure profiles email column and unique constraints exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

DO $$ BEGIN
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

-- Fix handle_new_request_notification: ensure search_path includes extensions and ST_DWithin has double precision cast
CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, request_id)
  SELECT
    p.id,
    'new_nearby_request',
    '🚨 New Urgent Need: ' || NEW.title,
    'Urgent aid requested at ' || COALESCE(NEW.address_text, '') || ' (' || NEW.category || '). Help is just next door.',
    NEW.id
  FROM public.profiles p
  WHERE p.id != NEW.requester_id
    AND p.verification_status = 'verified'
    AND p.home_location IS NOT NULL
    AND NEW.location IS NOT NULL
    AND ST_DWithin(
      p.home_location::geography,
      NEW.location::geography,
      10000.0
    );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Fallback safety: do not block request creation if notification dispatch fails
    RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_volunteer_id      uuid := 'a0000000-0000-0000-0000-000000000001';
  v_requester_id      uuid := 'a0000000-0000-0000-0000-000000000002';
  v_admin_id          uuid := 'a0000000-0000-0000-0000-000000000003';
  v_alias_vol_id      uuid := 'a0000000-0000-0000-0000-000000000011';
  v_alias_req_id      uuid := 'a0000000-0000-0000-0000-000000000012';
  v_alias_adm_id      uuid := 'a0000000-0000-0000-0000-000000000013';
  v_sample_req_id     uuid := 'b0000000-0000-0000-0000-000000000001';
BEGIN
  PERFORM set_config('search_path', 'public, extensions', true);

  -- Temporarily disable triggers during seeding
  BEGIN
    EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests DISABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  -- --------------------------------------------------------------------------
  -- 1. Create or Update: Showcase Volunteer (kind_volunteer)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'volunteer@kindlink.demo' OR raw_user_meta_data->>'username' = 'kind_volunteer') AND id <> v_volunteer_id;
  DELETE FROM public.profiles WHERE (username = 'kind_volunteer' OR email = 'volunteer@kindlink.demo') AND id <> v_volunteer_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_volunteer_id,
    '00000000-0000-0000-0000-000000000000',
    'volunteer@kindlink.demo',
    crypt('KindLink#Volunteer2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"kind_volunteer","display_name":"Dr. Ananya Roy (Volunteer)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- CRITICAL: auth.identities record required for GoTrue email/password login
  DELETE FROM auth.identities WHERE user_id = v_volunteer_id OR (provider = 'email' AND provider_id = v_volunteer_id::text) OR id = v_volunteer_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_volunteer_id::text,
    v_volunteer_id,
    jsonb_build_object('sub', v_volunteer_id::text, 'email', 'volunteer@kindlink.demo', 'email_verified', true),
    'email',
    v_volunteer_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  -- Profile synchronization
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_volunteer_id,
    'kind_volunteer',
    'Dr. Ananya Roy (Volunteer)',
    'volunteer@kindlink.demo',
    '+91 98320 12345',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    4.95,
    18
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 2. Create or Update: Showcase Requester (need_aid)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'requester@kindlink.demo' OR raw_user_meta_data->>'username' = 'need_aid') AND id <> v_requester_id;
  DELETE FROM public.profiles WHERE (username = 'need_aid' OR email = 'requester@kindlink.demo') AND id <> v_requester_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_requester_id,
    '00000000-0000-0000-0000-000000000000',
    'requester@kindlink.demo',
    crypt('KindLink#Requester2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"need_aid","display_name":"Sourav Mukherjee"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- CRITICAL: auth.identities record required for GoTrue email/password login
  DELETE FROM auth.identities WHERE user_id = v_requester_id OR (provider = 'email' AND provider_id = v_requester_id::text) OR id = v_requester_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_requester_id::text,
    v_requester_id,
    jsonb_build_object('sub', v_requester_id::text, 'email', 'requester@kindlink.demo', 'email_verified', true),
    'email',
    v_requester_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_requester_id,
    'need_aid',
    'Sourav Mukherjee',
    'requester@kindlink.demo',
    '+91 98321 54321',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    5.00,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 3. Create or Update: Super Administrator (admin_kindlink)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'admin@kindlink.demo' OR raw_user_meta_data->>'username' = 'admin_kindlink') AND id <> v_admin_id;
  DELETE FROM public.profiles WHERE (username = 'admin_kindlink' OR email = 'admin@kindlink.demo') AND id <> v_admin_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@kindlink.demo',
    crypt('KindLink#Admin2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin_kindlink","display_name":"KindLink Administrator"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- CRITICAL: auth.identities record required for GoTrue email/password login
  DELETE FROM auth.identities WHERE user_id = v_admin_id OR (provider = 'email' AND provider_id = v_admin_id::text) OR id = v_admin_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id::text,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@kindlink.demo', 'email_verified', true),
    'email',
    v_admin_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_admin_id,
    'admin_kindlink',
    'KindLink Administrator',
    'admin@kindlink.demo',
    '+91 98000 00000',
    'admin',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    5.00,
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = 'admin',
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 4. Create or Update: Showcase Volunteer Alias (kind_volunteer@kindlink.demo)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'kind_volunteer@kindlink.demo' AND id <> v_alias_vol_id;
  DELETE FROM public.profiles WHERE (username = 'kind_volunteer_alias' OR email = 'kind_volunteer@kindlink.demo') AND id <> v_alias_vol_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_vol_id,
    '00000000-0000-0000-0000-000000000000',
    'kind_volunteer@kindlink.demo',
    crypt('KindLink#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"kind_volunteer_alias","display_name":"Dr. Ananya Roy (Volunteer Alias)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_vol_id OR (provider = 'email' AND provider_id = v_alias_vol_id::text) OR id = v_alias_vol_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_vol_id::text,
    v_alias_vol_id,
    jsonb_build_object('sub', v_alias_vol_id::text, 'email', 'kind_volunteer@kindlink.demo', 'email_verified', true),
    'email',
    v_alias_vol_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_alias_vol_id,
    'kind_volunteer_alias',
    'Dr. Ananya Roy (Volunteer Alias)',
    'kind_volunteer@kindlink.demo',
    '+91 98320 12345',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    4.95,
    18
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 5. Create or Update: Showcase Requester Alias (need_aid@kindlink.demo)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'need_aid@kindlink.demo' AND id <> v_alias_req_id;
  DELETE FROM public.profiles WHERE (username = 'need_aid_alias' OR email = 'need_aid@kindlink.demo') AND id <> v_alias_req_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_req_id,
    '00000000-0000-0000-0000-000000000000',
    'need_aid@kindlink.demo',
    crypt('KindLink#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"need_aid_alias","display_name":"Sourav Mukherjee (Requester Alias)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_req_id OR (provider = 'email' AND provider_id = v_alias_req_id::text) OR id = v_alias_req_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_req_id::text,
    v_alias_req_id,
    jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true),
    'email',
    v_alias_req_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_alias_req_id,
    'need_aid_alias',
    'Sourav Mukherjee (Requester Alias)',
    'need_aid@kindlink.demo',
    '+91 98321 54321',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    5.00,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 6. Create or Update: Showcase Admin Alias (admin_kindlink@kindlink.demo)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'admin_kindlink@kindlink.demo' AND id <> v_alias_adm_id;
  DELETE FROM public.profiles WHERE (username = 'admin_kindlink_alias' OR email = 'admin_kindlink@kindlink.demo') AND id <> v_alias_adm_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_adm_id,
    '00000000-0000-0000-0000-000000000000',
    'admin_kindlink@kindlink.demo',
    crypt('KindLink#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin_kindlink_alias","display_name":"KindLink Administrator (Admin Alias)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_adm_id OR (provider = 'email' AND provider_id = v_alias_adm_id::text) OR id = v_alias_adm_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_adm_id::text,
    v_alias_adm_id,
    jsonb_build_object('sub', v_alias_adm_id::text, 'email', 'admin_kindlink@kindlink.demo', 'email_verified', true),
    'email',
    v_alias_adm_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_alias_adm_id,
    'admin_kindlink_alias',
    'KindLink Administrator (Admin Alias)',
    'admin_kindlink@kindlink.demo',
    '+91 98000 00000',
    'admin',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    5.00,
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = 'admin',
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 7. Create Live Showcase Request & Mutual Offer
  -- --------------------------------------------------------------------------
  INSERT INTO public.requests (
    id,
    requester_id,
    category,
    urgency,
    title,
    description,
    details,
    location,
    address_text,
    status,
    created_at
  )
  VALUES (
    v_sample_req_id,
    v_requester_id,
    'blood',
    'critical',
    '🚨 Critical O+ Blood Needed (2 Units) - Asansol District Hospital',
    'Emergency trauma patient admitted in surgical ward. Requires 2 verified units of O+ blood immediately. Patient relatives available on site.',
    '{"bloodGroup": "O+", "unitsNeeded": 2, "hospitalName": "Asansol District Hospital"}'::jsonb,
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    'Asansol District Hospital, SB Gorai Road, Asansol',
    'open',
    now() - interval '12 minutes'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create an active offer from Dr. Ananya Roy (kind_volunteer)
  INSERT INTO public.offers (
    id,
    request_id,
    helper_id,
    message,
    status,
    created_at
  )
  VALUES (
    'c0000000-0000-0000-0000-000000000001',
    v_sample_req_id,
    v_volunteer_id,
    'Hello! I am a verified donor nearby at Kalyanpur. I can reach District Hospital within 15 minutes. Please accept to coordinate contact details.',
    'pending',
    now() - interval '5 minutes'
  )
  ON CONFLICT (request_id, helper_id) DO NOTHING;

  -- Universal GoTrue Go struct scan safety: ensure token strings are not NULL
  BEGIN
    UPDATE auth.users
    SET
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      email_change = COALESCE(email_change, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      confirmed_at = COALESCE(confirmed_at, email_confirmed_at, now()),
      is_super_admin = COALESCE(is_super_admin, false),
      is_sso_user = COALESCE(is_sso_user, false),
      is_anonymous = COALESCE(is_anonymous, false)
    WHERE id IN (
      v_volunteer_id, v_requester_id, v_admin_id,
      v_alias_vol_id, v_alias_req_id, v_alias_adm_id
    );
  EXCEPTION WHEN others THEN null;
  END;

  -- Re-enable triggers
  BEGIN
    EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests ENABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  RAISE NOTICE 'Successfully created showcase accounts: kind_volunteer, need_aid, and admin_kindlink (with auth.identities).';
END $$;

-- FUNCTION: Bulletproof handle_new_user trigger function to never block GoTrue signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_username text;
  v_sanitized_username text;
  v_display_name text;
  v_collision_count integer;
BEGIN
  v_raw_username := NEW.raw_user_meta_data->>'username';
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  IF v_raw_username IS NULL OR char_length(trim(v_raw_username)) < 3 THEN
    v_sanitized_username := 'user_' || substr(NEW.id::text, 1, 8);
  ELSE
    v_sanitized_username := lower(trim(v_raw_username));
  END IF;

  SELECT COUNT(*) INTO v_collision_count
  FROM public.profiles
  WHERE username = v_sanitized_username AND id <> NEW.id;

  IF v_collision_count > 0 THEN
    v_sanitized_username := v_sanitized_username || '_' || substr(NEW.id::text, 1, 4);
  END IF;

  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      email,
      phone,
      role,
      verification_status
    )
    VALUES (
      NEW.id,
      v_sanitized_username,
      COALESCE(v_display_name, v_sanitized_username),
      NEW.email,
      NEW.phone,
      'user',
      'unverified'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      email = COALESCE(EXCLUDED.email, profiles.email);
  EXCEPTION
    WHEN others THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify created showcase accounts and auth identities
SELECT
  p.id,
  p.username,
  u.email,
  p.email AS profile_email,
  p.role,
  p.verification_status,
  p.display_name,
  p.phone,
  i.provider,
  i.provider_id
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
JOIN auth.identities i ON p.id = i.user_id
WHERE p.username IN (
  'kind_volunteer', 'need_aid', 'admin_kindlink',
  'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
)
ORDER BY p.role DESC, p.username ASC;
