-- ============================================================================
-- KindLink - Database Migration 10: Admin Role Grant Template
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Grant administrator privileges to your user account so you can
--          review ID verification documents and moderate community reports.
--
-- Instructions:
-- 1. Replace 'YOUR_USERNAME_HERE' below with the username you signed up with.
-- 2. Run this script in the Supabase SQL Editor.
-- ============================================================================

DO $$
DECLARE
  target_username text := 'YOUR_USERNAME_HERE'; -- <-- PUT YOUR USERNAME HERE
  rows_updated integer;
BEGIN
  UPDATE public.profiles
  SET role = 'admin',
      verification_status = 'verified',
      updated_at = now()
  WHERE lower(username) = lower(target_username);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  IF rows_updated = 0 THEN
    RAISE NOTICE 'No profile found with username: % (Ensure you have signed up in the app first)', target_username;
  ELSE
    RAISE NOTICE 'Success! User % is now an Administrator and Verified Helper.', target_username;
  END IF;
END $$;
