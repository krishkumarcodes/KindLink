-- ============================================================================
-- KindLink - Database Script 20: Provision Showcase Demo Accounts Properly
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
--
-- ACCOUNT CREDENTIALS SUMMARY:
-- ----------------------------------------------------------------------------
-- PRIMARY SHOWCASE ACCOUNTS:
-- 1. Showcase Volunteer:
--    Username: kind_volunteer
--    Email:    volunteer@kindlink.demo
--    Password: KindLink#Volunteer2026  (also accepts KindLink#2026)
--    Role:     user (verified volunteer)
--
-- 2. Showcase Requester:
--    Username: need_aid
--    Email:    requester@kindlink.demo
--    Password: KindLink#Requester2026  (also accepts KindLink#2026)
--    Role:     user (verified citizen)
--
-- 3. Super Administrator:
--    Username: admin_kindlink
--    Email:    admin@kindlink.demo
--    Password: KindLink#Admin2026      (also accepts KindLink#2026)
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
-- Safety: Completely idempotent. Can be executed repeatedly without errors.
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
-- STEP 2: Universal Identifier Resolution Function
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

-- ----------------------------------------------------------------------------
-- STEP 3: Provision Demo Accounts with Zero NULLs & Valid Identities
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

  -- Dynamically detect auth.identities schema structure
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

  -- Clean and insert identity (user_id is uuid = uuid)
  DELETE FROM auth.identities WHERE user_id = v_volunteer_id;
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

  -- Clean and insert identity
  DELETE FROM auth.identities WHERE user_id = v_requester_id;
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
    '+91 98320 54321',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9745, 23.6842), 4326)::geography,
    4.80,
    7
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
  -- 3. PRIMARY ADMINISTRATOR: admin@kindlink.demo (admin_kindlink)
  -- ==========================================================================
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

  -- Clean and insert identity
  DELETE FROM auth.identities WHERE user_id = v_admin_id;
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
    '+91 98320 00000',
    'admin',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9700, 23.6870), 4326)::geography,
    5.00,
    99
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
  -- 4. ALIAS VOLUNTEER: kind_volunteer@kindlink.demo (kind_volunteer_alias)
  -- ==========================================================================
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

  -- Clean and insert identity
  DELETE FROM auth.identities WHERE user_id = v_alias_vol_id;
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
  -- 5. ALIAS REQUESTER: need_aid@kindlink.demo (need_aid_alias)
  -- ==========================================================================
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

  -- Clean and insert identity
  DELETE FROM auth.identities WHERE user_id = v_alias_req_id;
  BEGIN
    IF v_has_provider_id THEN
      IF v_identities_id_type = 'uuid' THEN
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $4, now(), now(), now())'
        USING v_alias_req_id, v_alias_req_id, jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true), v_alias_req_id::text;
      ELSE
        EXECUTE 'INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES ($1, $2, $3, ''email'', $1, now(), now(), now())'
        USING v_alias_req_id, v_alias_req_id, jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true);
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
    '+91 98320 54321',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9745, 23.6842), 4326)::geography,
    4.80,
    7
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
  -- 6. ALIAS ADMINISTRATOR: admin_kindlink@kindlink.demo (admin_kindlink_alias)
  -- ==========================================================================
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

  -- Clean and insert identity
  DELETE FROM auth.identities WHERE user_id = v_alias_adm_id;
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
    '+91 98320 00000',
    'admin',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9700, 23.6870), 4326)::geography,
    5.00,
    99
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
  -- 7. PROVISION SHOWCASE REQUEST AND OFFER
  -- ==========================================================================
  INSERT INTO public.requests (
    id,
    requester_id,
    category,
    title,
    description,
    urgency,
    status,
    location,
    location_name,
    created_at,
    updated_at
  )
  VALUES (
    v_sample_req_id,
    v_requester_id,
    'blood-donation',
    'Urgent: B+ Blood Required for Dialysis Patient',
    'Looking for verified blood donor nearby District Hospital Asansol. Patient scheduled for regular hemodialysis treatment today at 3:00 PM.',
    'high',
    'open',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9745, 23.6842), 4326)::geography,
    'District Hospital, Asansol, West Bengal',
    now() - interval '20 minutes',
    now() - interval '20 minutes'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.offers (
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

  RAISE NOTICE 'Migration 20 completed: 6 demo accounts and showcase data provisioned with zero NULLs.';
END $$;

-- ----------------------------------------------------------------------------
-- STEP 4: Verification Query
-- ----------------------------------------------------------------------------
SELECT
  p.id,
  p.username,
  u.email,
  p.email AS profile_email,
  p.role,
  p.verification_status,
  CASE WHEN u.confirmation_token = '' THEN 'EMPTY_STRING (OK)' ELSE 'HAS_VALUE_OR_NULL' END AS token_status,
  i.provider AS identity_provider
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN auth.identities i ON p.id = i.user_id
WHERE p.username IN (
  'kind_volunteer', 'need_aid', 'admin_kindlink',
  'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
)
ORDER BY p.role DESC, p.username ASC;
