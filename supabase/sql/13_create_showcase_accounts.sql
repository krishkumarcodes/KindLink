-- ============================================================================
-- KindLink - Database Migration 13: Create Showcase Demo & Admin Accounts
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Provisions 2 verified community showcase accounts and 1 platform admin
--          with known passwords for portfolio reviews, live demos, and grading.
-- Safety: Completely idempotent (can be re-run safely anytime).
-- ============================================================================
--
-- ACCOUNT CREDENTIALS SUMMARY:
-- ----------------------------------------------------------------------------
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
-- ----------------------------------------------------------------------------

-- Ensure auth.users columns exist (guarantees compatibility with both local shims and Supabase Cloud)
DO $$ BEGIN
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS instance_id uuid;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS aud text DEFAULT 'authenticated';
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'authenticated';
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS encrypted_password text;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb DEFAULT '{"provider":"email","providers":["email"]}'::jsonb;
EXCEPTION
  WHEN others THEN null;
END $$;

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
    AND extensions.ST_DWithin(p.home_location, NEW.location, 10000.0::double precision);

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Fallback safety: do not block request creation if notification dispatch fails
    RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_volunteer_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_requester_id uuid := 'a0000000-0000-0000-0000-000000000002';
  v_admin_id     uuid := 'a0000000-0000-0000-0000-000000000003';
  v_sample_req_id uuid := 'b0000000-0000-0000-0000-000000000001';
BEGIN

  -- --------------------------------------------------------------------------
  -- 1. Create or Update: Showcase Volunteer (kind_volunteer)
  -- --------------------------------------------------------------------------
  -- Cleanup any conflicting email/username if previously created with different ID
  DELETE FROM auth.users WHERE (email = 'volunteer@kindlink.demo' OR raw_user_meta_data->>'username' = 'kind_volunteer') AND id <> v_volunteer_id;
  DELETE FROM public.profiles WHERE (username = 'kind_volunteer') AND id <> v_volunteer_id;

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
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- Profile synchronization
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
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
    '+91 98320 12345',
    'user',
    'verified',
    ST_SetSRID(ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    4.95,
    18
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 2. Create or Update: Showcase Requester (need_aid)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'requester@kindlink.demo' OR raw_user_meta_data->>'username' = 'need_aid') AND id <> v_requester_id;
  DELETE FROM public.profiles WHERE (username = 'need_aid') AND id <> v_requester_id;

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
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
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
    '+91 98321 54321',
    'user',
    'verified',
    ST_SetSRID(ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    5.00,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 3. Create or Update: Super Administrator (admin_kindlink)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'admin@kindlink.demo' OR raw_user_meta_data->>'username' = 'admin_kindlink') AND id <> v_admin_id;
  DELETE FROM public.profiles WHERE (username = 'admin_kindlink') AND id <> v_admin_id;

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
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
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
    '+91 98000 00000',
    'admin',
    'verified',
    ST_SetSRID(ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    5.00,
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    role = 'admin',
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 4. Create Live Showcase Request & Mutual Offer
  -- --------------------------------------------------------------------------
  -- Temporarily disable notification trigger during seed to ensure zero friction
  BEGIN
    EXECUTE 'ALTER TABLE public.requests DISABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

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
    ST_SetSRID(ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    'Asansol District Hospital, SB Gorai Road, Asansol',
    'open',
    now() - interval '12 minutes'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Re-enable notification trigger
  BEGIN
    EXECUTE 'ALTER TABLE public.requests ENABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

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

  RAISE NOTICE 'Successfully created showcase accounts: kind_volunteer, need_aid, and admin_kindlink.';
END $$;

-- Verify created showcase accounts
SELECT
  p.id,
  p.username,
  u.email,
  p.role,
  p.verification_status,
  p.display_name,
  p.phone
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.username IN ('kind_volunteer', 'need_aid', 'admin_kindlink')
ORDER BY p.role DESC, p.username ASC;
