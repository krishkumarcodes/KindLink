-- ============================================================================
-- KindLink - Database Seed: Showcase Demo Accounts & Sample Activity
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Target: PostgreSQL 15+ on Supabase Cloud & Local Test Environments
--
-- INSTRUCTIONS:
-- Run this script in the Supabase SQL Editor AFTER running all_in_one.sql.
-- ============================================================================

DO $$
DECLARE
  -- Fixed Deterministic UUIDs
  v_volunteer_id      uuid := 'a0000000-0000-0000-0000-000000000001';
  v_requester_id      uuid := 'a0000000-0000-0000-0000-000000000002';
  v_admin_id          uuid := 'a0000000-0000-0000-0000-000000000003';
  v_alias_vol_id      uuid := 'a0000000-0000-0000-0000-000000000011';
  v_alias_req_id      uuid := 'a0000000-0000-0000-0000-000000000012';
  v_alias_adm_id      uuid := 'a0000000-0000-0000-0000-000000000013';

  v_sample_req_id     uuid := 'b0000000-0000-0000-0000-000000000001';
  v_sample_offer_id   uuid := 'c0000000-0000-0000-0000-000000000001';

  v_has_instance_id   boolean := false;
  v_has_identities    boolean := false;
  v_has_provider_id   boolean := false;
  v_identities_id_type text := 'text';
BEGIN
  PERFORM set_config('search_path', 'public, extensions', true);

  -- Inspect auth environment capabilities
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'instance_id'
  ) INTO v_has_instance_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'identities'
  ) INTO v_has_identities;

  IF v_has_identities THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) INTO v_has_provider_id;

    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id'
    INTO v_identities_id_type;
  END IF;

  -- Temporarily disable triggers
  BEGIN
    EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests DISABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  -- --------------------------------------------------------------------------
  -- 1. VOLUNTEER (volunteer@kindlink.demo) - Dr. Ananya Roy
  -- --------------------------------------------------------------------------
  IF v_has_instance_id THEN
    EXECUTE 'INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token, phone, phone_change,
      phone_change_token, is_super_admin, created_at, updated_at
    )
    VALUES (
      $1, ''00000000-0000-0000-0000-000000000000'',
      ''volunteer@kindlink.demo'', crypt(''KindLink#Volunteer2026'', gen_salt(''bf'')), now(),
      ''{"provider":"email","providers":["email"]}''::jsonb,
      ''{"username":"kind_volunteer","display_name":"Dr. Ananya Roy"}''::jsonb,
      ''authenticated'', ''authenticated'', '''', '''', '''', '''', '''', '''', NULL, '''', '''', false, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = now(), raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data, confirmation_token = '''',
      recovery_token = '''', email_change = '''', email_change_token_new = '''',
      email_change_token_current = '''', reauthentication_token = '''', phone = NULL,
      phone_change = '''', phone_change_token = '''', is_super_admin = false, updated_at = now()'
    USING v_volunteer_id;
  ELSE
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
    VALUES (v_volunteer_id, 'volunteer@kindlink.demo', '+919832012345', '{"username":"kind_volunteer","display_name":"Dr. Ananya Roy"}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END IF;

  IF v_has_identities THEN
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
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, email, phone, role, verification_status,
    home_location, rating_average, rating_count,
    bio, organisation, area_name, phone_country_code, phone_national, phone_e164,
    visibility_phone, visibility_email, visibility_organisation, visibility_area,
    pinned_badges
  )
  VALUES (
    v_volunteer_id, 'kind_volunteer', 'Dr. Ananya Roy', 'volunteer@kindlink.demo',
    '+91 98320 12345', 'user', 'verified',
    ST_SetSRID(ST_MakePoint(86.9661, 23.6889), 4326)::geography, 5.0, 6,
    'Resident physician at Asansol District Hospital. Dedicated to community mutual aid, emergency blood response, and elderly healthcare support in Paschim Bardhaman.',
    'Asansol District Hospital / WBMC', 'Kalyanpur, Asansol', '+91', '9832012345', '+919832012345',
    'members', 'members', 'members', 'members',
    ARRAY['verified_doctor', 'life_saver', 'community_pillar']
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username, display_name = EXCLUDED.display_name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = EXCLUDED.role, verification_status = 'verified',
    home_location = EXCLUDED.home_location, rating_average = EXCLUDED.rating_average, rating_count = EXCLUDED.rating_count,
    bio = EXCLUDED.bio, organisation = EXCLUDED.organisation, area_name = EXCLUDED.area_name,
    phone_country_code = EXCLUDED.phone_country_code, phone_national = EXCLUDED.phone_national,
    phone_e164 = EXCLUDED.phone_e164, visibility_phone = EXCLUDED.visibility_phone,
    visibility_email = EXCLUDED.visibility_email, visibility_organisation = EXCLUDED.visibility_organisation,
    visibility_area = EXCLUDED.visibility_area, pinned_badges = EXCLUDED.pinned_badges;


  -- --------------------------------------------------------------------------
  -- 2. REQUESTER (requester@kindlink.demo) - Sourav Mukherjee
  -- --------------------------------------------------------------------------
  IF v_has_instance_id THEN
    EXECUTE 'INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token, phone, phone_change,
      phone_change_token, is_super_admin, created_at, updated_at
    )
    VALUES (
      $1, ''00000000-0000-0000-0000-000000000000'',
      ''requester@kindlink.demo'', crypt(''KindLink#Requester2026'', gen_salt(''bf'')), now(),
      ''{"provider":"email","providers":["email"]}''::jsonb,
      ''{"username":"need_aid","display_name":"Sourav Mukherjee"}''::jsonb,
      ''authenticated'', ''authenticated'', '''', '''', '''', '''', '''', '''', NULL, '''', '''', false, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = now(), raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data, confirmation_token = '''',
      recovery_token = '''', email_change = '''', email_change_token_new = '''',
      email_change_token_current = '''', reauthentication_token = '''', phone = NULL,
      phone_change = '''', phone_change_token = '''', is_super_admin = false, updated_at = now()'
    USING v_requester_id;
  ELSE
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
    VALUES (v_requester_id, 'requester@kindlink.demo', '+919832054321', '{"username":"need_aid","display_name":"Sourav Mukherjee"}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END IF;

  IF v_has_identities THEN
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
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, email, phone, role, verification_status,
    home_location, rating_average, rating_count,
    bio, organisation, area_name, phone_country_code, phone_national, phone_e164,
    visibility_phone, visibility_email, visibility_organisation, visibility_area,
    pinned_badges
  )
  VALUES (
    v_requester_id, 'need_aid', 'Sourav Mukherjee', 'requester@kindlink.demo',
    '+91 98320 54321', 'user', 'verified',
    ST_SetSRID(ST_MakePoint(86.9745, 23.6842), 4326)::geography, 4.80, 7,
    'Local resident and small business owner in Asansol. Grateful for community support during medical emergencies.',
    'Kalyanpur Residents Welfare Association', 'Court More, Asansol', '+91', '9832054321', '+919832054321',
    'members', 'members', 'members', 'members',
    ARRAY['verified_member']
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username, display_name = EXCLUDED.display_name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = EXCLUDED.role, verification_status = 'verified',
    home_location = EXCLUDED.home_location, rating_average = EXCLUDED.rating_average, rating_count = EXCLUDED.rating_count,
    bio = EXCLUDED.bio, organisation = EXCLUDED.organisation, area_name = EXCLUDED.area_name,
    phone_country_code = EXCLUDED.phone_country_code, phone_national = EXCLUDED.phone_national,
    phone_e164 = EXCLUDED.phone_e164, visibility_phone = EXCLUDED.visibility_phone,
    visibility_email = EXCLUDED.visibility_email, visibility_organisation = EXCLUDED.visibility_organisation,
    visibility_area = EXCLUDED.visibility_area, pinned_badges = EXCLUDED.pinned_badges;


  -- --------------------------------------------------------------------------
  -- 3. ADMIN (admin@kindlink.demo) - KindLink Administrator
  -- --------------------------------------------------------------------------
  IF v_has_instance_id THEN
    EXECUTE 'INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token, phone, phone_change,
      phone_change_token, is_super_admin, created_at, updated_at
    )
    VALUES (
      $1, ''00000000-0000-0000-0000-000000000000'',
      ''admin@kindlink.demo'', crypt(''KindLink#Admin2026'', gen_salt(''bf'')), now(),
      ''{"provider":"email","providers":["email"]}''::jsonb,
      ''{"username":"admin_kindlink","display_name":"KindLink Administrator"}''::jsonb,
      ''authenticated'', ''authenticated'', '''', '''', '''', '''', '''', '''', NULL, '''', '''', false, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = now(), raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data, confirmation_token = '''',
      recovery_token = '''', email_change = '''', email_change_token_new = '''',
      email_change_token_current = '''', reauthentication_token = '''', phone = NULL,
      phone_change = '''', phone_change_token = '''', is_super_admin = false, updated_at = now()'
    USING v_admin_id;
  ELSE
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
    VALUES (v_admin_id, 'admin@kindlink.demo', '+919832000000', '{"username":"admin_kindlink","display_name":"KindLink Administrator"}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END IF;

  IF v_has_identities THEN
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
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, email, phone, role, verification_status,
    home_location, rating_average, rating_count,
    bio, organisation, area_name, phone_country_code, phone_national, phone_e164,
    visibility_phone, visibility_email, visibility_organisation, visibility_area,
    pinned_badges
  )
  VALUES (
    v_admin_id, 'admin_kindlink', 'KindLink Administrator', 'admin@kindlink.demo',
    '+91 98320 00000', 'admin', 'verified',
    ST_SetSRID(ST_MakePoint(86.9700, 23.6870), 4326)::geography, 5.00, 99,
    'KindLink Community Platform Administrator & Safety Coordinator.',
    'KindLink Community Trust', 'City Centre, Asansol', '+91', '9832000000', '+919832000000',
    'members', 'members', 'members', 'members',
    ARRAY['verified_member']
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username, display_name = EXCLUDED.display_name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = 'admin', verification_status = 'verified',
    home_location = EXCLUDED.home_location, rating_average = EXCLUDED.rating_average, rating_count = EXCLUDED.rating_count,
    bio = EXCLUDED.bio, organisation = EXCLUDED.organisation, area_name = EXCLUDED.area_name,
    phone_country_code = EXCLUDED.phone_country_code, phone_national = EXCLUDED.phone_national,
    phone_e164 = EXCLUDED.phone_e164, visibility_phone = EXCLUDED.visibility_phone,
    visibility_email = EXCLUDED.visibility_email, visibility_organisation = EXCLUDED.visibility_organisation,
    visibility_area = EXCLUDED.visibility_area, pinned_badges = EXCLUDED.pinned_badges;


  -- --------------------------------------------------------------------------
  -- 4. ALIAS VOLUNTEER (kind_volunteer@kindlink.demo)
  -- --------------------------------------------------------------------------
  IF v_has_instance_id THEN
    EXECUTE 'INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token, phone, phone_change,
      phone_change_token, is_super_admin, created_at, updated_at
    )
    VALUES (
      $1, ''00000000-0000-0000-0000-000000000000'',
      ''kind_volunteer@kindlink.demo'', crypt(''KindLink#2026'', gen_salt(''bf'')), now(),
      ''{"provider":"email","providers":["email"]}''::jsonb,
      ''{"username":"kind_volunteer_alias","display_name":"Dr. Ananya Roy"}''::jsonb,
      ''authenticated'', ''authenticated'', '''', '''', '''', '''', '''', '''', NULL, '''', '''', false, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = now(), raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data, confirmation_token = '''',
      recovery_token = '''', email_change = '''', email_change_token_new = '''',
      email_change_token_current = '''', reauthentication_token = '''', phone = NULL,
      phone_change = '''', phone_change_token = '''', is_super_admin = false, updated_at = now()'
    USING v_alias_vol_id;
  ELSE
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
    VALUES (v_alias_vol_id, 'kind_volunteer@kindlink.demo', '+919832012345', '{"username":"kind_volunteer_alias","display_name":"Dr. Ananya Roy"}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END IF;

  IF v_has_identities THEN
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
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, email, phone, role, verification_status,
    home_location, rating_average, rating_count,
    bio, organisation, area_name, phone_country_code, phone_national, phone_e164,
    visibility_phone, visibility_email, visibility_organisation, visibility_area,
    pinned_badges
  )
  VALUES (
    v_alias_vol_id, 'kind_volunteer_alias', 'Dr. Ananya Roy', 'kind_volunteer@kindlink.demo',
    '+91 98320 12345', 'user', 'verified',
    ST_SetSRID(ST_MakePoint(86.9661, 23.6889), 4326)::geography, 5.0, 6,
    'Resident physician at Asansol District Hospital. Dedicated to community mutual aid and emergency response.',
    'Asansol District Hospital / WBMC', 'Kalyanpur, Asansol', '+91', '9832012345', '+919832012345',
    'members', 'members', 'members', 'members',
    ARRAY['verified_doctor', 'life_saver', 'community_pillar']
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username, display_name = EXCLUDED.display_name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = EXCLUDED.role, verification_status = 'verified',
    home_location = EXCLUDED.home_location, rating_average = EXCLUDED.rating_average, rating_count = EXCLUDED.rating_count,
    bio = EXCLUDED.bio, organisation = EXCLUDED.organisation, area_name = EXCLUDED.area_name,
    phone_country_code = EXCLUDED.phone_country_code, phone_national = EXCLUDED.phone_national,
    phone_e164 = EXCLUDED.phone_e164, visibility_phone = EXCLUDED.visibility_phone,
    visibility_email = EXCLUDED.visibility_email, visibility_organisation = EXCLUDED.visibility_organisation,
    visibility_area = EXCLUDED.visibility_area, pinned_badges = EXCLUDED.pinned_badges;


  -- --------------------------------------------------------------------------
  -- 5. ALIAS REQUESTER (need_aid@kindlink.demo)
  -- --------------------------------------------------------------------------
  IF v_has_instance_id THEN
    EXECUTE 'INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token, phone, phone_change,
      phone_change_token, is_super_admin, created_at, updated_at
    )
    VALUES (
      $1, ''00000000-0000-0000-0000-000000000000'',
      ''need_aid@kindlink.demo'', crypt(''KindLink#2026'', gen_salt(''bf'')), now(),
      ''{"provider":"email","providers":["email"]}''::jsonb,
      ''{"username":"need_aid_alias","display_name":"Sourav Mukherjee"}''::jsonb,
      ''authenticated'', ''authenticated'', '''', '''', '''', '''', '''', '''', NULL, '''', '''', false, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = now(), raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data, confirmation_token = '''',
      recovery_token = '''', email_change = '''', email_change_token_new = '''',
      email_change_token_current = '''', reauthentication_token = '''', phone = NULL,
      phone_change = '''', phone_change_token = '''', is_super_admin = false, updated_at = now()'
    USING v_alias_req_id;
  ELSE
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
    VALUES (v_alias_req_id, 'need_aid@kindlink.demo', '+919832054321', '{"username":"need_aid_alias","display_name":"Sourav Mukherjee"}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END IF;

  IF v_has_identities THEN
    DELETE FROM auth.identities WHERE user_id = v_alias_req_id;
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
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, email, phone, role, verification_status,
    home_location, rating_average, rating_count,
    bio, organisation, area_name, phone_country_code, phone_national, phone_e164,
    visibility_phone, visibility_email, visibility_organisation, visibility_area,
    pinned_badges
  )
  VALUES (
    v_alias_req_id, 'need_aid_alias', 'Sourav Mukherjee', 'need_aid@kindlink.demo',
    '+91 98320 54321', 'user', 'verified',
    ST_SetSRID(ST_MakePoint(86.9745, 23.6842), 4326)::geography, 4.80, 7,
    'Local resident and small business owner in Asansol.',
    'Kalyanpur Residents Welfare Association', 'Court More, Asansol', '+91', '9832054321', '+919832054321',
    'members', 'members', 'members', 'members',
    ARRAY['verified_member']
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username, display_name = EXCLUDED.display_name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = EXCLUDED.role, verification_status = 'verified',
    home_location = EXCLUDED.home_location, rating_average = EXCLUDED.rating_average, rating_count = EXCLUDED.rating_count,
    bio = EXCLUDED.bio, organisation = EXCLUDED.organisation, area_name = EXCLUDED.area_name,
    phone_country_code = EXCLUDED.phone_country_code, phone_national = EXCLUDED.phone_national,
    phone_e164 = EXCLUDED.phone_e164, visibility_phone = EXCLUDED.visibility_phone,
    visibility_email = EXCLUDED.visibility_email, visibility_organisation = EXCLUDED.visibility_organisation,
    visibility_area = EXCLUDED.visibility_area, pinned_badges = EXCLUDED.pinned_badges;


  -- --------------------------------------------------------------------------
  -- 6. ALIAS ADMIN (admin_kindlink@kindlink.demo)
  -- --------------------------------------------------------------------------
  IF v_has_instance_id THEN
    EXECUTE 'INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token, phone, phone_change,
      phone_change_token, is_super_admin, created_at, updated_at
    )
    VALUES (
      $1, ''00000000-0000-0000-0000-000000000000'',
      ''admin_kindlink@kindlink.demo'', crypt(''KindLink#2026'', gen_salt(''bf'')), now(),
      ''{"provider":"email","providers":["email"]}''::jsonb,
      ''{"username":"admin_kindlink_alias","display_name":"KindLink Administrator"}''::jsonb,
      ''authenticated'', ''authenticated'', '''', '''', '''', '''', '''', '''', NULL, '''', '''', false, now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = now(), raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data, confirmation_token = '''',
      recovery_token = '''', email_change = '''', email_change_token_new = '''',
      email_change_token_current = '''', reauthentication_token = '''', phone = NULL,
      phone_change = '''', phone_change_token = '''', is_super_admin = false, updated_at = now()'
    USING v_alias_adm_id;
  ELSE
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
    VALUES (v_alias_adm_id, 'admin_kindlink@kindlink.demo', '+919832000000', '{"username":"admin_kindlink_alias","display_name":"KindLink Administrator"}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END IF;

  IF v_has_identities THEN
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
  END IF;

  INSERT INTO public.profiles (
    id, username, display_name, email, phone, role, verification_status,
    home_location, rating_average, rating_count,
    bio, organisation, area_name, phone_country_code, phone_national, phone_e164,
    visibility_phone, visibility_email, visibility_organisation, visibility_area,
    pinned_badges
  )
  VALUES (
    v_alias_adm_id, 'admin_kindlink_alias', 'KindLink Administrator', 'admin_kindlink@kindlink.demo',
    '+91 98320 00000', 'admin', 'verified',
    ST_SetSRID(ST_MakePoint(86.9700, 23.6870), 4326)::geography, 5.00, 99,
    'KindLink Community Platform Administrator & Safety Coordinator.',
    'KindLink Community Trust', 'City Centre, Asansol', '+91', '9832000000', '+919832000000',
    'members', 'members', 'members', 'members',
    ARRAY['verified_member']
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username, display_name = EXCLUDED.display_name, email = EXCLUDED.email,
    phone = EXCLUDED.phone, role = 'admin', verification_status = 'verified',
    home_location = EXCLUDED.home_location, rating_average = EXCLUDED.rating_average, rating_count = EXCLUDED.rating_count,
    bio = EXCLUDED.bio, organisation = EXCLUDED.organisation, area_name = EXCLUDED.area_name,
    phone_country_code = EXCLUDED.phone_country_code, phone_national = EXCLUDED.phone_national,
    phone_e164 = EXCLUDED.phone_e164, visibility_phone = EXCLUDED.visibility_phone,
    visibility_email = EXCLUDED.visibility_email, visibility_organisation = EXCLUDED.visibility_organisation,
    visibility_area = EXCLUDED.visibility_area, pinned_badges = EXCLUDED.pinned_badges;


  -- --------------------------------------------------------------------------
  -- 7. DEMO EMERGENCY CONTACTS
  -- --------------------------------------------------------------------------
  DELETE FROM public.emergency_contacts WHERE user_id IN (v_volunteer_id, v_requester_id);

  INSERT INTO public.emergency_contacts (user_id, name, relationship, phone_e164, phone_country_code)
  VALUES
    (v_volunteer_id, 'Subhash Roy', 'father', '+919832098765', '+91'),
    (v_volunteer_id, 'Dr. Rajesh Sen', 'colleague', '+919832087654', '+91'),
    (v_requester_id, 'Pooja Mukherjee', 'spouse', '+919832076543', '+91');


  -- --------------------------------------------------------------------------
  -- 8. DEMO PRE-APPROVED USER BADGES
  -- --------------------------------------------------------------------------
  DELETE FROM public.user_badges WHERE user_id IN (v_volunteer_id, v_requester_id, v_admin_id);

  INSERT INTO public.user_badges (user_id, badge_id, current_level, current_count, is_pinned, awarded_by, award_reason, earned_at)
  VALUES
    (v_volunteer_id, 'verified_doctor', 1, 1, true, v_admin_id, 'Verified with West Bengal Medical Council', now() - interval '30 days'),
    (v_volunteer_id, 'life_saver', 1, 1, true, NULL, 'Completed emergency blood donations', now() - interval '6 hours'),
    (v_volunteer_id, 'community_pillar', 1, 6, true, NULL, 'Completed 6 vital mutual aid requests', now() - interval '1 day'),
    (v_volunteer_id, 'first_responder', 1, 1, false, NULL, 'Rapid response to critical medical emergency', now() - interval '5 days'),
    (v_volunteer_id, 'trusted_neighbour', 1, 6, false, NULL, 'Received 6 consecutive 5-star ratings', now() - interval '6 hours'),
    (v_volunteer_id, 'first_help', 1, 1, false, NULL, 'Completed first mutual aid task', now() - interval '5 days'),
    (v_volunteer_id, 'helper_streak', 2, 6, false, NULL, '6-day consecutive mutual aid streak', now() - interval '1 hour'),
    (v_volunteer_id, 'medical_gear_lender', 1, 1, false, NULL, 'Shared wheelchair for patient care', now() - interval '1 day'),
    (v_volunteer_id, 'elder_friend', 1, 1, false, NULL, 'Delivered medications to senior citizen', now() - interval '2 days'),
    (v_volunteer_id, 'safe_ride_hero', 1, 1, false, NULL, 'Urgent clinic transit aid', now() - interval '3 days'),
    (v_volunteer_id, 'study_mentor', 1, 1, false, NULL, 'Shared reference textbooks with student', now() - interval '4 days'),
    (v_requester_id, 'verified_member', 1, 1, true, v_admin_id, 'Verified community resident', now() - interval '20 days'),
    (v_admin_id, 'verified_member', 1, 1, true, NULL, 'Platform Administrator', now() - interval '60 days');


  -- --------------------------------------------------------------------------
  -- 9. SAMPLE REQUESTS (COMPLETED & OPEN) TO SATISFY STATS & ACTIVITY LISTS 100%
  -- --------------------------------------------------------------------------
  -- Help 1: Completed Blood Request (Today)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, accepted_helper_id, created_at, accepted_at, completed_at, travel_distance_km
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000002', v_requester_id, 'blood',
    'Emergency: B+ Blood for Thalassemia Ward',
    'Emergency transfusion unit required at Asansol District Hospital. Verified donor arrived on site immediately.',
    'critical', 'completed',
    ST_SetSRID(ST_MakePoint(86.9745, 23.6842), 4326)::geography,
    'District Hospital Blood Bank, Asansol',
    v_volunteer_id,
    now() - interval '6 hours',
    now() - interval '5 hours',
    now() - interval '3 hours 30 minutes',
    3.5
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, accepted_helper_id = EXCLUDED.accepted_helper_id,
    accepted_at = EXCLUDED.accepted_at, completed_at = EXCLUDED.completed_at,
    travel_distance_km = EXCLUDED.travel_distance_km;

  -- Help 2: Completed Medical Equipment Request (1 day ago)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, accepted_helper_id, created_at, accepted_at, completed_at, travel_distance_km
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000003', v_alias_req_id, 'equipment',
    'Urgent Need: Wheelchair for Senior Citizen',
    'Elderly patient discharged from clinic requires folding wheelchair for two weeks recovery at home.',
    'high', 'completed',
    ST_SetSRID(ST_MakePoint(86.9680, 23.6850), 4326)::geography,
    'Burnpur Road, Court More, Asansol',
    v_volunteer_id,
    now() - interval '1 day 4 hours',
    now() - interval '1 day 3 hours',
    now() - interval '1 day 1 hour',
    4.2
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, accepted_helper_id = EXCLUDED.accepted_helper_id,
    accepted_at = EXCLUDED.accepted_at, completed_at = EXCLUDED.completed_at,
    travel_distance_km = EXCLUDED.travel_distance_km;

  -- Help 3: Completed Elderly Assistance (2 days ago)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, accepted_helper_id, created_at, accepted_at, completed_at, travel_distance_km
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000004', v_requester_id, 'elderly_help',
    'Morning Medicine Pickup from Chemist',
    'Prescription medicines pickup and vitals check for elderly mother recovering at home.',
    'medium', 'completed',
    ST_SetSRID(ST_MakePoint(86.9720, 23.6860), 4326)::geography,
    'Kalyanpur Housing Estate, Asansol',
    v_volunteer_id,
    now() - interval '2 days 5 hours',
    now() - interval '2 days 4 hours',
    now() - interval '2 days 2 hours 30 minutes',
    2.1
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, accepted_helper_id = EXCLUDED.accepted_helper_id,
    accepted_at = EXCLUDED.accepted_at, completed_at = EXCLUDED.completed_at,
    travel_distance_km = EXCLUDED.travel_distance_km;

  -- Help 4: Completed Safe Ride / Transport (3 days ago)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, accepted_helper_id, created_at, accepted_at, completed_at, travel_distance_km
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000005', v_alias_req_id, 'transport',
    'Emergency Clinic Ride for Dialysis Follow-up',
    'Safe transit support to local healthcare clinic for scheduled medical appointment.',
    'high', 'completed',
    ST_SetSRID(ST_MakePoint(86.9650, 23.6870), 4326)::geography,
    'S.B. Gorai Road, Asansol',
    v_volunteer_id,
    now() - interval '3 days 6 hours',
    now() - interval '3 days 5 hours',
    now() - interval '3 days 4 hours',
    5.5
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, accepted_helper_id = EXCLUDED.accepted_helper_id,
    accepted_at = EXCLUDED.accepted_at, completed_at = EXCLUDED.completed_at,
    travel_distance_km = EXCLUDED.travel_distance_km;

  -- Help 5: Completed Books & Study Material (4 days ago)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, accepted_helper_id, created_at, accepted_at, completed_at, travel_distance_km
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000006', v_requester_id, 'books',
    'Reference Medical Physiology & Biochemistry Textbooks',
    'First-year student requesting study reference materials and course guidance.',
    'low', 'completed',
    ST_SetSRID(ST_MakePoint(86.9700, 23.6890), 4326)::geography,
    'Collegepara, Asansol',
    v_volunteer_id,
    now() - interval '4 days 8 hours',
    now() - interval '4 days 7 hours',
    now() - interval '4 days 5 hours',
    1.8
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, accepted_helper_id = EXCLUDED.accepted_helper_id,
    accepted_at = EXCLUDED.accepted_at, completed_at = EXCLUDED.completed_at,
    travel_distance_km = EXCLUDED.travel_distance_km;

  -- Help 6: Completed First Aid Emergency (5 days ago)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, accepted_helper_id, created_at, accepted_at, completed_at, travel_distance_km
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000007', v_alias_req_id, 'equipment',
    'Emergency First Aid & Sterile Dressing Kit',
    'Urgent sterile dressing and bandage supplies needed following minor household burn.',
    'high', 'completed',
    ST_SetSRID(ST_MakePoint(86.9730, 23.6830), 4326)::geography,
    'Ushagram, Asansol',
    v_volunteer_id,
    now() - interval '5 days 10 hours',
    now() - interval '5 days 9 hours',
    now() - interval '5 days 8 hours',
    3.0
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, accepted_helper_id = EXCLUDED.accepted_helper_id,
    accepted_at = EXCLUDED.accepted_at, completed_at = EXCLUDED.completed_at,
    travel_distance_km = EXCLUDED.travel_distance_km;

  -- Sample Open Request (Currently in progress / open for demonstration)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, created_at
  )
  VALUES (
    v_sample_req_id, v_requester_id, 'blood',
    'Urgent: B+ Blood Required for Dialysis Patient',
    'Looking for verified blood donor nearby District Hospital Asansol. Patient scheduled for regular hemodialysis treatment today at 3:00 PM.',
    'high', 'open',
    ST_SetSRID(ST_MakePoint(86.9745, 23.6842), 4326)::geography,
    'District Hospital, Asansol, West Bengal',
    now() - interval '20 minutes'
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'open', title = EXCLUDED.title, description = EXCLUDED.description,
    address_text = EXCLUDED.address_text;

  -- Sample Pending Offer on Open Request
  INSERT INTO public.offers (
    id, request_id, helper_id, message, status, created_at, updated_at
  )
  VALUES (
    v_sample_offer_id, v_sample_req_id, v_volunteer_id,
    'Hello! I am a verified donor nearby at Kalyanpur. I can reach District Hospital within 15 minutes.',
    'pending', now() - interval '5 minutes', now() - interval '5 minutes'
  )
  ON CONFLICT (request_id, helper_id) DO UPDATE SET
    message = EXCLUDED.message, status = EXCLUDED.status;


  -- --------------------------------------------------------------------------
  -- 10. POST-TASK RATINGS TO PROVE TRUST SCORE & STATS ACCURACY
  -- --------------------------------------------------------------------------
  DELETE FROM public.ratings WHERE ratee_id = v_volunteer_id;

  INSERT INTO public.ratings (request_id, rater_id, ratee_id, stars, rating_score, comment, created_at)
  VALUES
    (
      'b0000000-0000-0000-0000-000000000002', v_requester_id, v_volunteer_id, 5, 5.0,
      'Dr. Ananya arrived promptly and donated blood in the critical hour. A true lifesaver!',
      now() - interval '3 hours 15 minutes'
    ),
    (
      'b0000000-0000-0000-0000-000000000003', v_alias_req_id, v_volunteer_id, 5, 5.0,
      'Provided folding wheelchair in immaculate condition. Outstanding neighbourly support.',
      now() - interval '1 day 45 minutes'
    ),
    (
      'b0000000-0000-0000-0000-000000000004', v_requester_id, v_volunteer_id, 5, 5.0,
      'Delivered medicines with proper bills and verified dosages. Very caring professional.',
      now() - interval '2 days 2 hours'
    ),
    (
      'b0000000-0000-0000-0000-000000000005', v_alias_req_id, v_volunteer_id, 5, 5.0,
      'Emergency ride to the clinic went smoothly and safely. Deeply grateful!',
      now() - interval '3 days 3 hours 30 minutes'
    ),
    (
      'b0000000-0000-0000-0000-000000000006', v_requester_id, v_volunteer_id, 5, 5.0,
      'Shared excellent textbooks and clinical biochemistry references. Great mentor.',
      now() - interval '4 days 4 hours 30 minutes'
    ),
    (
      'b0000000-0000-0000-0000-000000000007', v_alias_req_id, v_volunteer_id, 5, 5.0,
      'Emergency first aid supplies delivered within 20 minutes of requesting.',
      now() - interval '5 days 7 hours 45 minutes'
    );


  -- Re-enable triggers
  BEGIN
    EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests ENABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  RAISE NOTICE 'Demo accounts, completed mutual aid history, badges, and emergency contacts provisioned successfully.';
END $$;
