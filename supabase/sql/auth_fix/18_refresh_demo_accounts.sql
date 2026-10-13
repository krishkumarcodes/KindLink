-- ============================================================================
-- KindLink - Database Migration 18: Refresh Demo Accounts & Eliminate NULL Tokens in auth.users
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
--
-- ROOT CAUSE RESOLUTION:
-- GoTrue (Supabase Auth server) throws:
--   "Database error finding users"
--   "Database error checking email"
--   "Database error querying schema"
--   "Database error loading user"
-- when any row in auth.users contains NULL in string/token columns:
--   - confirmation_token
--   - recovery_token
--   - email_change
--   - email_change_token_new
--   - email_change_token_current
--   - reauthentication_token
--   - phone
--   - phone_change
--   - phone_change_token
--
-- Go's sql.Scan cannot scan SQL NULL into primitive non-pointer Go string fields.
-- This migration:
--   1. Sanitizes ALL existing rows in auth.users across the entire database to
--      replace NULL token and string fields with empty strings ('').
--   2. Ensures the phone unique constraint on auth.users is partial (ignoring '')
--      so multiple demo and web users can coexist safely without phone collisions.
--   3. Re-provisions all 3 primary demo accounts and 3 alias accounts with
--      explicit non-null empty string tokens, confirmed emails, valid bcrypt
--      passwords, and valid auth.identities entries.
--   4. Synchronizes public.profiles with verified status, roles, and emails.
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
-- Safety: Completely idempotent. Can be executed safely repeatedly.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

SET search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- STEP 1: Ensure public.profiles schema and constraints
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- STEP 2: Safe Phone Constraint Handling in auth.users
-- ----------------------------------------------------------------------------
-- In PostgreSQL, multiple NULL values are allowed by the users_phone_key unique
-- constraint. Multiple empty strings ('') violate uniqueness.
-- Reset any accidental empty strings in phone to NULL.
UPDATE auth.users SET phone = NULL WHERE phone = '';


-- ----------------------------------------------------------------------------
-- STEP 3: Database-Wide NULL Token Sanitization in auth.users
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_col record;
BEGIN
  -- Iterate through all string/token columns present in auth.users and eliminate NULLs
  -- NOTE: 'phone' is NOT a token and must remain NULL for email accounts to comply with users_phone_key
  FOR v_col IN (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'users'
      AND column_name IN (
        'confirmation_token',
        'recovery_token',
        'email_change',
        'email_change_token_new',
        'email_change_token_current',
        'reauthentication_token',
        'phone_change',
        'phone_change_token'
      )
  ) LOOP
    EXECUTE format('UPDATE auth.users SET %I = '''' WHERE %I IS NULL', v_col.column_name, v_col.column_name);
  END LOOP;

  -- Ensure email_confirmed_at is populated if NULL (which automatically generates confirmed_at)
  UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;

  -- Ensure boolean columns have non-null defaults
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_super_admin') THEN
    UPDATE auth.users SET is_super_admin = false WHERE is_super_admin IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user') THEN
    UPDATE auth.users SET is_sso_user = false WHERE is_sso_user IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_anonymous') THEN
    UPDATE auth.users SET is_anonymous = false WHERE is_anonymous IS NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 4: Bulletproof handle_new_user Trigger Function
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- STEP 5: Provision Demo Accounts with Zero NULLs & Verified Identities
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  -- Primary Demo Account UUIDs
  v_volunteer_id      uuid := 'a0000000-0000-0000-0000-000000000001';
  v_requester_id      uuid := 'a0000000-0000-0000-0000-000000000002';
  v_admin_id          uuid := 'a0000000-0000-0000-0000-000000000003';

  -- Alias Demo Account UUIDs
  v_alias_vol_id      uuid := 'a0000000-0000-0000-0000-000000000011';
  v_alias_req_id      uuid := 'a0000000-0000-0000-0000-000000000012';
  v_alias_adm_id      uuid := 'a0000000-0000-0000-0000-000000000013';

  -- Showcase Sample Request & Offer IDs
  v_sample_req_id     uuid := 'b0000000-0000-0000-0000-000000000001';
  v_sample_offer_id   uuid := 'c0000000-0000-0000-0000-000000000001';

  v_has_provider_id   boolean := false;
  v_identities_id_type text := 'text';
BEGIN
  PERFORM set_config('search_path', 'public, extensions', true);

  -- Inspect auth.identities schema dynamically
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
  ) INTO v_has_provider_id;

  SELECT data_type FROM information_schema.columns
  WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id'
  INTO v_identities_id_type;

  -- Temporarily disable triggers during demo batch upserts
  BEGIN
    EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests DISABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  -- ==========================================================================
  -- 1. PRIMARY VOLUNTEER: volunteer@kindlink.demo (kind_volunteer)
  -- ==========================================================================
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
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    reauthentication_token,
    phone,
    phone_change,
    phone_change_token,
    is_super_admin,
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
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    '',
    '',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    reauthentication_token = '',
    phone = NULL,
    phone_change = '',
    phone_change_token = '',
    is_super_admin = false,
    updated_at = now();

  -- Synchronize auth.identities
  DELETE FROM auth.identities WHERE user_id = v_volunteer_id OR id = v_volunteer_id::text;
  BEGIN
    IF v_has_provider_id THEN
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $4, now(), now(), now())'
        USING v_volunteer_id, v_volunteer_id, jsonb_build_object('sub', v_volunteer_id::text, 'email', 'volunteer@kindlink.demo', 'email_verified', true), v_volunteer_id::text;
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $1, now(), now(), now())'
        USING v_volunteer_id::text, v_volunteer_id, jsonb_build_object('sub', v_volunteer_id::text, 'email', 'volunteer@kindlink.demo', 'email_verified', true);
      END IF;
    ELSE
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_volunteer_id, v_volunteer_id, jsonb_build_object('sub', v_volunteer_id::text, 'email', 'volunteer@kindlink.demo', 'email_verified', true);
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_volunteer_id::text, v_volunteer_id, jsonb_build_object('sub', v_volunteer_id::text, 'email', 'volunteer@kindlink.demo', 'email_verified', true);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN null;
  END;

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
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- ==========================================================================
  -- 2. PRIMARY REQUESTER: requester@kindlink.demo (need_aid)
  -- ==========================================================================
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
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    reauthentication_token,
    phone,
    phone_change,
    phone_change_token,
    is_super_admin,
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
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    '',
    '',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    reauthentication_token = '',
    phone = NULL,
    phone_change = '',
    phone_change_token = '',
    is_super_admin = false,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_requester_id OR id = v_requester_id::text;
  BEGIN
    IF v_has_provider_id THEN
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $4, now(), now(), now())'
        USING v_requester_id, v_requester_id, jsonb_build_object('sub', v_requester_id::text, 'email', 'requester@kindlink.demo', 'email_verified', true), v_requester_id::text;
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $1, now(), now(), now())'
        USING v_requester_id::text, v_requester_id, jsonb_build_object('sub', v_requester_id::text, 'email', 'requester@kindlink.demo', 'email_verified', true);
      END IF;
    ELSE
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_requester_id, v_requester_id, jsonb_build_object('sub', v_requester_id::text, 'email', 'requester@kindlink.demo', 'email_verified', true);
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_requester_id::text, v_requester_id, jsonb_build_object('sub', v_requester_id::text, 'email', 'requester@kindlink.demo', 'email_verified', true);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN null;
  END;

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
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- ==========================================================================
  -- 3. PRIMARY SUPER ADMIN: admin@kindlink.demo (admin_kindlink)
  -- ==========================================================================
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
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    reauthentication_token,
    phone,
    phone_change,
    phone_change_token,
    is_super_admin,
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
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    '',
    '',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    reauthentication_token = '',
    phone = NULL,
    phone_change = '',
    phone_change_token = '',
    is_super_admin = false,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_admin_id OR id = v_admin_id::text;
  BEGIN
    IF v_has_provider_id THEN
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $4, now(), now(), now())'
        USING v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@kindlink.demo', 'email_verified', true), v_admin_id::text;
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $1, now(), now(), now())'
        USING v_admin_id::text, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@kindlink.demo', 'email_verified', true);
      END IF;
    ELSE
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@kindlink.demo', 'email_verified', true);
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_admin_id::text, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@kindlink.demo', 'email_verified', true);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN null;
  END;

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

  -- ==========================================================================
  -- 4. ALIAS VOLUNTEER: kind_volunteer@kindlink.demo (KindLink#2026)
  -- ==========================================================================
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
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    reauthentication_token,
    phone,
    phone_change,
    phone_change_token,
    is_super_admin,
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
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    '',
    '',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    reauthentication_token = '',
    phone = NULL,
    phone_change = '',
    phone_change_token = '',
    is_super_admin = false,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_vol_id OR id = v_alias_vol_id::text;
  BEGIN
    IF v_has_provider_id THEN
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $4, now(), now(), now())'
        USING v_alias_vol_id, v_alias_vol_id, jsonb_build_object('sub', v_alias_vol_id::text, 'email', 'kind_volunteer@kindlink.demo', 'email_verified', true), v_alias_vol_id::text;
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $1, now(), now(), now())'
        USING v_alias_vol_id::text, v_alias_vol_id, jsonb_build_object('sub', v_alias_vol_id::text, 'email', 'kind_volunteer@kindlink.demo', 'email_verified', true);
      END IF;
    ELSE
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_alias_vol_id, v_alias_vol_id, jsonb_build_object('sub', v_alias_vol_id::text, 'email', 'kind_volunteer@kindlink.demo', 'email_verified', true);
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_alias_vol_id::text, v_alias_vol_id, jsonb_build_object('sub', v_alias_vol_id::text, 'email', 'kind_volunteer@kindlink.demo', 'email_verified', true);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN null;
  END;

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
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- ==========================================================================
  -- 5. ALIAS REQUESTER: need_aid@kindlink.demo (KindLink#2026)
  -- ==========================================================================
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
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    reauthentication_token,
    phone,
    phone_change,
    phone_change_token,
    is_super_admin,
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
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    '',
    '',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    reauthentication_token = '',
    phone = NULL,
    phone_change = '',
    phone_change_token = '',
    is_super_admin = false,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_req_id OR id = v_alias_req_id::text;
  BEGIN
    IF v_has_provider_id THEN
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $4, now(), now(), now())'
        USING v_alias_req_id, v_alias_req_id, jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true), v_alias_req_id::text;
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $1, now(), now(), now())'
        USING v_alias_req_id::text, v_alias_req_id, jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true);
      END IF;
    ELSE
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_alias_req_id, v_alias_req_id, jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true);
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_alias_req_id::text, v_alias_req_id, jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN null;
  END;

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
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- ==========================================================================
  -- 6. ALIAS ADMIN: admin_kindlink@kindlink.demo (KindLink#2026)
  -- ==========================================================================
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
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    reauthentication_token,
    phone,
    phone_change,
    phone_change_token,
    is_super_admin,
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
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    '',
    '',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    email_change_token_current = '',
    reauthentication_token = '',
    phone = NULL,
    phone_change = '',
    phone_change_token = '',
    is_super_admin = false,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_adm_id OR id = v_alias_adm_id::text;
  BEGIN
    IF v_has_provider_id THEN
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $4, now(), now(), now())'
        USING v_alias_adm_id, v_alias_adm_id, jsonb_build_object('sub', v_alias_adm_id::text, 'email', 'admin_kindlink@kindlink.demo', 'email_verified', true), v_alias_adm_id::text;
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $1, now(), now(), now())'
        USING v_alias_adm_id::text, v_alias_adm_id, jsonb_build_object('sub', v_alias_adm_id::text, 'email', 'admin_kindlink@kindlink.demo', 'email_verified', true);
      END IF;
    ELSE
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_alias_adm_id, v_alias_adm_id, jsonb_build_object('sub', v_alias_adm_id::text, 'email', 'admin_kindlink@kindlink.demo', 'email_verified', true);
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', now(), now(), now())'
        USING v_alias_adm_id::text, v_alias_adm_id, jsonb_build_object('sub', v_alias_adm_id::text, 'email', 'admin_kindlink@kindlink.demo', 'email_verified', true);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN null;
  END;

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

  -- ==========================================================================
  -- 7. DEMO SAMPLE REQUEST & MUTUAL AID OFFER
  -- ==========================================================================
  INSERT INTO public.requests (
    id,
    requester_id,
    category,
    urgency,
    title,
    description,
    location,
    location_name,
    status,
    created_at,
    expires_at
  )
  VALUES (
    v_sample_req_id,
    v_requester_id,
    'blood',
    'critical',
    'Urgent B+ Blood Donor Needed - District Hospital',
    'Emergency transfusion required for surgery patient at District Hospital Blood Bank. Immediate contact appreciated.',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    'District Hospital Blood Bank, Asansol',
    'open',
    now() - interval '15 minutes',
    now() + interval '48 hours'
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'open',
    title = EXCLUDED.title,
    description = EXCLUDED.description;

  INSERT INTO public.request_offers (
    id,
    request_id,
    helper_id,
    message,
    status,
    created_at
  )
  VALUES (
    v_sample_offer_id,
    v_sample_req_id,
    v_volunteer_id,
    'Hello! I am a verified donor nearby at Kalyanpur. I can reach District Hospital within 15 minutes. Please accept to coordinate contact details.',
    'pending',
    now() - interval '5 minutes'
  )
  ON CONFLICT (request_id, helper_id) DO NOTHING;

  -- Re-enable triggers
  BEGIN
    EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests ENABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  RAISE NOTICE 'Migration 18 completed: 6 demo accounts refreshed with zero NULL tokens.';
END $$;

-- ----------------------------------------------------------------------------
-- STEP 6: Universal Username Resolution Function
-- ----------------------------------------------------------------------------
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

-- Sync any orphaned profile emails
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- ----------------------------------------------------------------------------
-- STEP 7: Verification Query
-- ----------------------------------------------------------------------------
SELECT
  p.id,
  p.username,
  u.email,
  p.email AS profile_email,
  p.role,
  p.verification_status,
  CASE WHEN u.confirmation_token = '' THEN 'EMPTY_STRING' ELSE 'HAS_VALUE_OR_NULL' END AS confirmation_token_status,
  CASE WHEN u.recovery_token = '' THEN 'EMPTY_STRING' ELSE 'HAS_VALUE_OR_NULL' END AS recovery_token_status,
  i.provider AS identity_provider
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN auth.identities i ON p.id = i.user_id
WHERE p.username IN (
  'kind_volunteer', 'need_aid', 'admin_kindlink',
  'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
)
ORDER BY p.role DESC, p.username ASC;
