-- ============================================================================
-- KindLink - Database Migration 15: Safe Cleanup of Legacy Test Data
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Safely purges legacy placeholder requests and test accounts
--          while PRESERVING the official showcase demo accounts:
--          kind_volunteer, need_aid, and admin_kindlink.
-- Safety: Completely idempotent and non-destructive to real users.
-- ============================================================================

DO $$
DECLARE
  v_cleaned_requests integer := 0;
  v_cleaned_users integer := 0;
BEGIN
  -- 1. Remove obvious test requests (titles matching test/dummy/placeholder patterns)
  --    EXCEPT the official showcase blood request (id: b0000000-0000-0000-0000-000000000001)
  WITH deleted_reqs AS (
    DELETE FROM public.requests
    WHERE id <> 'b0000000-0000-0000-0000-000000000001'
      AND (
        title ILIKE '%[test]%'
        OR title ILIKE '%dummy%'
        OR title ILIKE '%sample test%'
        OR description ILIKE '%this is a test%'
        OR description ILIKE '%dummy description%'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cleaned_requests FROM deleted_reqs;

  -- 2. Remove legacy non-showcase test accounts (e.g. rahul_sen, test_user, demo_test)
  --    Explicitly PRESERVING showcase accounts and real accounts
  WITH deleted_users AS (
    DELETE FROM auth.users
    WHERE id NOT IN (
      'a0000000-0000-0000-0000-000000000001', -- kind_volunteer
      'a0000000-0000-0000-0000-000000000002', -- need_aid
      'a0000000-0000-0000-0000-000000000003'  -- admin_kindlink
    )
    AND (
      email ILIKE '%test%@example.com'
      OR email ILIKE '%dummy%@%'
      OR raw_user_meta_data->>'username' ILIKE 'test_%'
      OR raw_user_meta_data->>'username' ILIKE 'dummy_%'
      OR raw_user_meta_data->>'username' = 'rahul_sen'
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cleaned_users FROM deleted_users;

  -- 3. Delete orphaned notifications
  DELETE FROM public.notifications WHERE request_id IS NOT NULL AND request_id NOT IN (SELECT id FROM public.requests);

  RAISE NOTICE 'Cleanup complete: removed % test requests and % test users. Preserved official showcase accounts.', v_cleaned_requests, v_cleaned_users;
END $$;
