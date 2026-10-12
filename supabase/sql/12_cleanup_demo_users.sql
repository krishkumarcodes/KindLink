-- ============================================================================
-- KindLink - Database Migration 12: Purge All Demo & Test Accounts
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Safely delete all demo/test accounts, including test admins and volunteers.
-- Safety: Completely idempotent (can be executed multiple times safely).
-- ============================================================================

DO $$
DECLARE
  v_demo_user_ids uuid[];
BEGIN
  -- 1. Identify all demo and test user IDs
  SELECT array_agg(id) INTO v_demo_user_ids
  FROM auth.users
  WHERE email LIKE '%@kindlink.demo'
     OR email LIKE 'test%@%'
     OR raw_user_meta_data->>'username' IN (
       'priya_nurse', 'rahul_aec', 'dr_sen', 'amit_dhanbad',
       'swati_durgapur', 'vikram_driver', 'ananya_books',
       'admin_kindlink', 'kind_volunteer', 'need_aid', 'admin_krish'
     );

  IF v_demo_user_ids IS NOT NULL AND array_length(v_demo_user_ids, 1) > 0 THEN
    -- 2. Delete related activity rows first
    DELETE FROM public.ratings
    WHERE rater_id = ANY(v_demo_user_ids) OR ratee_id = ANY(v_demo_user_ids);

    DELETE FROM public.notifications
    WHERE user_id = ANY(v_demo_user_ids);

    DELETE FROM public.reports
    WHERE reporter_id = ANY(v_demo_user_ids);

    DELETE FROM public.sos_events
    WHERE user_id = ANY(v_demo_user_ids);

    DELETE FROM public.verification_requests
    WHERE user_id = ANY(v_demo_user_ids);

    DELETE FROM public.offers
    WHERE helper_id = ANY(v_demo_user_ids);

    DELETE FROM public.requests
    WHERE requester_id = ANY(v_demo_user_ids);

    -- 3. Delete profiles
    DELETE FROM public.profiles
    WHERE id = ANY(v_demo_user_ids);

    -- 4. Delete auth.users (cascades any remaining references)
    DELETE FROM auth.users
    WHERE id = ANY(v_demo_user_ids);

    RAISE NOTICE 'Cleaned up % demo/test user accounts and all associated data.', array_length(v_demo_user_ids, 1);
  ELSE
    RAISE NOTICE 'No demo/test user accounts found to clean up.';
  END IF;

  -- 5. Clean up any orphaned requests or profiles with demo usernames
  DELETE FROM public.profiles
  WHERE username IN (
    'priya_nurse', 'rahul_aec', 'dr_sen', 'amit_dhanbad',
    'swati_durgapur', 'vikram_driver', 'ananya_books',
    'admin_kindlink', 'kind_volunteer', 'need_aid', 'admin_krish'
  );

END $$;

-- Verification query
SELECT id, username, role, verification_status, created_at
FROM public.profiles
ORDER BY created_at DESC;
