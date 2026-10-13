-- ============================================================================
-- KindLink - Database Script 19: Complete Cleanup of Demo Accounts & Sanitization
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
--
-- PURPOSE:
-- 1. Completely deletes all demo accounts, aliases, and their dependent records
--    from application tables, public.profiles, auth.identities, and auth.users.
-- 2. Sanitizes table-wide auth.users (replaces NULL token strings with '',
--    converts accidental empty phone strings to NULL, and ensures email_confirmed_at is set).
--
-- Safety: Completely idempotent. Can be executed repeatedly without errors.
-- ============================================================================

SET search_path = public, extensions;

DO $$
DECLARE
  -- Primary Demo UUIDs
  v_vol_id    uuid := 'a0000000-0000-0000-0000-000000000001';
  v_req_id    uuid := 'a0000000-0000-0000-0000-000000000002';
  v_adm_id    uuid := 'a0000000-0000-0000-0000-000000000003';

  -- Alias Demo UUIDs
  v_alias_vol uuid := 'a0000000-0000-0000-0000-000000000011';
  v_alias_req uuid := 'a0000000-0000-0000-0000-000000000012';
  v_alias_adm uuid := 'a0000000-0000-0000-0000-000000000013';

  -- Sample Data UUIDs
  v_req_sample uuid := 'b0000000-0000-0000-0000-000000000001';
  v_off_sample uuid := 'c0000000-0000-0000-0000-000000000001';

  v_all_demo_ids uuid[];
  v_col record;
BEGIN
  v_all_demo_ids := ARRAY[
    v_vol_id, v_req_id, v_adm_id,
    v_alias_vol, v_alias_req, v_alias_adm
  ];

  -- Temporarily disable triggers during batch deletion
  BEGIN
    EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests DISABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  -- --------------------------------------------------------------------------
  -- 1. DELETE DEPENDENT APPLICATION RECORDS
  -- --------------------------------------------------------------------------
  -- Offers
  BEGIN
    DELETE FROM public.offers
    WHERE id = v_off_sample
       OR request_id = v_req_sample
       OR helper_id = ANY(v_all_demo_ids);
  EXCEPTION WHEN undefined_table THEN null;
  END;

  -- Requests
  BEGIN
    DELETE FROM public.requests
    WHERE id = v_req_sample
       OR requester_id = ANY(v_all_demo_ids);
  EXCEPTION WHEN undefined_table THEN null;
  END;

  -- Messages
  BEGIN
    DELETE FROM public.messages
    WHERE sender_id = ANY(v_all_demo_ids)
       OR receiver_id = ANY(v_all_demo_ids);
  EXCEPTION WHEN undefined_table THEN null;
  END;

  -- Notifications
  BEGIN
    DELETE FROM public.notifications
    WHERE user_id = ANY(v_all_demo_ids);
  EXCEPTION WHEN undefined_table THEN null;
  END;

  -- Ratings
  BEGIN
    DELETE FROM public.ratings
    WHERE rater_id = ANY(v_all_demo_ids)
       OR rated_id = ANY(v_all_demo_ids);
  EXCEPTION WHEN undefined_table THEN null;
  END;

  -- Verifications
  BEGIN
    DELETE FROM public.verifications
    WHERE user_id = ANY(v_all_demo_ids);
  EXCEPTION WHEN undefined_table THEN null;
  END;

  -- Audit logs (if table exists)
  BEGIN
    DELETE FROM public.audit_logs
    WHERE user_id = ANY(v_all_demo_ids);
  EXCEPTION WHEN others THEN null;
  END;

  -- --------------------------------------------------------------------------
  -- 2. DELETE FROM public.profiles
  -- --------------------------------------------------------------------------
  DELETE FROM public.profiles
  WHERE id = ANY(v_all_demo_ids)
     OR username IN (
       'kind_volunteer', 'need_aid', 'admin_kindlink',
       'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
     )
     OR email IN (
       'volunteer@kindlink.demo', 'requester@kindlink.demo', 'admin@kindlink.demo',
       'kind_volunteer@kindlink.demo', 'need_aid@kindlink.demo', 'admin_kindlink@kindlink.demo'
     );

  -- --------------------------------------------------------------------------
  -- 3. DELETE FROM auth.identities
  -- --------------------------------------------------------------------------
  -- Foreign key user_id is uuid = uuid. Never compare uuid to text!
  DELETE FROM auth.identities
  WHERE user_id = ANY(v_all_demo_ids);

  -- Also delete any identities associated by email in identity_data
  DELETE FROM auth.identities
  WHERE identity_data->>'email' IN (
    'volunteer@kindlink.demo', 'requester@kindlink.demo', 'admin@kindlink.demo',
    'kind_volunteer@kindlink.demo', 'need_aid@kindlink.demo', 'admin_kindlink@kindlink.demo'
  );

  -- --------------------------------------------------------------------------
  -- 4. DELETE FROM auth.users
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users
  WHERE id = ANY(v_all_demo_ids)
     OR email IN (
       'volunteer@kindlink.demo', 'requester@kindlink.demo', 'admin@kindlink.demo',
       'kind_volunteer@kindlink.demo', 'need_aid@kindlink.demo', 'admin_kindlink@kindlink.demo'
     )
     OR raw_user_meta_data->>'username' IN (
       'kind_volunteer', 'need_aid', 'admin_kindlink',
       'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
     );

  -- --------------------------------------------------------------------------
  -- 5. SANITIZE REMAINING ROWS IN auth.users
  -- --------------------------------------------------------------------------
  -- Reset empty string phone numbers to NULL to satisfy users_phone_key
  UPDATE auth.users SET phone = NULL WHERE phone = '';

  -- Eliminate NULL token fields for all real users to satisfy GoTrue struct scanning
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

  -- Ensure email_confirmed_at is populated if NULL (which automatically calculates stored confirmed_at)
  UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;

  -- Re-enable triggers
  BEGIN
    EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests ENABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  RAISE NOTICE 'Migration 19 completed: Demo accounts wiped cleanly and auth.users sanitized.';
END $$;

-- Verification of cleanup
SELECT
  'profiles_remaining' AS check_item,
  COUNT(*) AS count
FROM public.profiles
WHERE username IN (
  'kind_volunteer', 'need_aid', 'admin_kindlink',
  'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
)
UNION ALL
SELECT
  'auth_users_remaining' AS check_item,
  COUNT(*) AS count
FROM auth.users
WHERE email IN (
  'volunteer@kindlink.demo', 'requester@kindlink.demo', 'admin@kindlink.demo',
  'kind_volunteer@kindlink.demo', 'need_aid@kindlink.demo', 'admin_kindlink@kindlink.demo'
);
