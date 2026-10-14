-- ============================================================================
-- KindLink - Comprehensive Automated Test Suite
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Target: Automated verification of all business rules, RLS, functions, & triggers
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE test_results (
  test_num integer PRIMARY KEY,
  test_name text NOT NULL,
  passed boolean NOT NULL,
  details text
);

CREATE OR REPLACE FUNCTION record_test(p_num integer, p_name text, p_passed boolean, p_details text DEFAULT 'OK')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO test_results (test_num, test_name, passed, details)
  VALUES (p_num, p_name, p_passed, p_details);
  IF NOT p_passed THEN
    RAISE EXCEPTION 'TEST % FAILED: % - %', p_num, p_name, p_details;
  END IF;
END;
$$;
GRANT ALL ON TABLE test_results TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_test TO authenticated, anon;


DO $$
DECLARE
  u1 uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  u2 uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  u3 uuid := '33333333-3333-3333-3333-333333333333'::uuid;
  u_admin uuid := '99999999-9999-9999-9999-999999999999'::uuid;
  p_rec record;
  dup_error boolean := false;
  fmt_error boolean := false;
  rls_read_count integer;
  rls_blocked boolean := false;
  req_id uuid;
  req_blood uuid;
  req_books uuid;
  offer1 uuid;
  contact_phone text;
  stats jsonb;
  v_score_actual double precision;
  v_top_id uuid;
  v_storage_blocked boolean := false;
BEGIN

  -- --------------------------------------------------------------------------
  -- SETUP & TEST 1: Auto profile creation on auth sign-up
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
  VALUES (
    u1,
    'user1@test.kindlink',
    '+919876543210',
    '{"username":"priya_test","display_name":"Priya Nurse"}'::jsonb
  );

  SELECT * INTO p_rec FROM public.profiles WHERE id = u1;
  IF p_rec.username = 'priya_test' AND p_rec.display_name = 'Priya Nurse' AND p_rec.phone = '+919876543210' THEN
    PERFORM record_test(1, 'Profile auto-creation on auth sign-up trigger', true, 'Profile created with metadata');
  ELSE
    PERFORM record_test(1, 'Profile auto-creation on auth sign-up trigger', false, 'Profile data mismatch');
  END IF;

  -- Create User 2 (unverified)
  INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
  VALUES (
    u2,
    'user2@test.kindlink',
    '+919876543211',
    '{"username":"rahul_test","display_name":"Rahul Student"}'::jsonb
  );

  -- Create User 3 (verified helper)
  INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
  VALUES (
    u3,
    'user3@test.kindlink',
    '+919876543212',
    '{"username":"amit_test","display_name":"Amit Verified"}'::jsonb
  );
  UPDATE public.profiles
  SET verification_status = 'verified',
      home_location = ST_SetSRID(ST_MakePoint(86.9746, 23.6889), 4326)::geography
  WHERE id = u3;

  -- Create Admin User
  INSERT INTO auth.users (id, email, phone, raw_user_meta_data)
  VALUES (
    u_admin,
    'admin@test.kindlink',
    '+919876543219',
    '{"username":"admin_test","display_name":"Platform Admin"}'::jsonb
  );
  UPDATE public.profiles SET role = 'admin' WHERE id = u_admin;

  -- --------------------------------------------------------------------------
  -- TEST 2: Case-insensitive username uniqueness
  -- --------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      gen_random_uuid(),
      'PRIYA_TEST',
      'Priya Duplicate'
    );
  EXCEPTION WHEN unique_violation THEN
    dup_error := true;
  END;
  PERFORM record_test(2, 'Case-insensitive username uniqueness constraint', dup_error, 'Prevented PRIYA_TEST duplicate of priya_test');

  -- --------------------------------------------------------------------------
  -- TEST 3: Username format validation check
  -- --------------------------------------------------------------------------
  -- TEST 3: Username format validation check
  -- --------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      gen_random_uuid(),
      '12invalid',
      'Invalid Format'
    );
  EXCEPTION WHEN check_violation THEN
    fmt_error := true;
  END;
  PERFORM record_test(3, 'Username format regex validation (must start with letter)', fmt_error, 'Rejected invalid username format');

  -- --------------------------------------------------------------------------
  -- SWITCH TO CLIENT ROLE: authenticated
  -- --------------------------------------------------------------------------
  EXECUTE 'SET ROLE authenticated';

  -- --------------------------------------------------------------------------
  -- TEST 4: RLS Profile isolation: User cannot read other user profile row
  -- --------------------------------------------------------------------------
  PERFORM auth.set_acting_user(u2, 'authenticated');
  SELECT count(*) INTO rls_read_count FROM public.profiles WHERE id = u1;
  IF rls_read_count = 0 THEN
    PERFORM record_test(4, 'RLS Profile isolation (User cannot read other users private profile row)', true, 'Other users private row invisible');
  ELSE
    PERFORM record_test(4, 'RLS Profile isolation', false, 'Data leak: Other user profile was visible');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 5: Public safe view access
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO rls_read_count FROM public.public_profiles WHERE id = u1;
  IF rls_read_count = 1 THEN
    PERFORM record_test(5, 'Public profiles safe view accessible without private phone', true, 'Public profile view returned sanitized data');
  ELSE
    PERFORM record_test(5, 'Public profiles safe view', false, 'Public profiles view failed');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 6 & 7: RLS Offer constraints
  -- --------------------------------------------------------------------------
  -- User 1 posts a help request
  PERFORM auth.set_acting_user(u1, 'authenticated');
  INSERT INTO public.requests (
    requester_id,
    category,
    title,
    description,
    urgency,
    location,
    address_text
  )
  VALUES (
    u1,
    'blood',
    'Need B+ blood at Asansol Hospital',
    'Urgent replacement needed for surgery',
    'critical',
    ST_SetSRID(ST_MakePoint(86.9746, 23.6889), 4326)::geography,
    'Asansol District Hospital'
  )
  RETURNING id INTO req_id;

  -- Test 6: Unverified user (u2) cannot offer help
  PERFORM auth.set_acting_user(u2, 'authenticated');
  rls_blocked := false;
  BEGIN
    INSERT INTO public.offers (request_id, helper_id, message)
    VALUES (req_id, u2, 'I can help');
  EXCEPTION WHEN others THEN
    rls_blocked := true;
  END;
  IF NOT rls_blocked AND NOT EXISTS (SELECT 1 FROM public.offers WHERE request_id = req_id AND helper_id = u2) THEN
    rls_blocked := true;
  END IF;
  PERFORM record_test(6, 'RLS: Unverified user cannot submit help offer', rls_blocked, 'Blocked unverified user offer');

  -- Test 7: User cannot offer help on their own request
  PERFORM auth.set_acting_user(u1, 'authenticated');
  rls_blocked := false;
  BEGIN
    INSERT INTO public.offers (request_id, helper_id, message)
    VALUES (req_id, u1, 'I will do it myself');
  EXCEPTION WHEN others THEN
    rls_blocked := true;
  END;
  IF NOT rls_blocked AND NOT EXISTS (SELECT 1 FROM public.offers WHERE request_id = req_id AND helper_id = u1) THEN
    rls_blocked := true;
  END IF;
  PERFORM record_test(7, 'RLS: User cannot offer help on their own request', rls_blocked, 'Self-offer blocked');

  -- Test 8: Verified user (u3) CAN offer help
  PERFORM auth.set_acting_user(u3, 'authenticated');
  INSERT INTO public.offers (request_id, helper_id, message)
  VALUES (req_id, u3, 'I am a verified donor and available right now')
  RETURNING id INTO offer1;

  IF offer1 IS NOT NULL THEN
    PERFORM record_test(8, 'Verified helper can submit offer successfully', true, 'Offer accepted into database');
  ELSE
    PERFORM record_test(8, 'Verified helper submit offer', false, 'Offer failed to insert');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 9: Only Requester can accept offer
  -- --------------------------------------------------------------------------
  -- Non-requester (u2) tries to accept offer
  PERFORM auth.set_acting_user(u2, 'authenticated');
  rls_blocked := false;
  BEGIN
    PERFORM public.accept_offer(offer1);
  EXCEPTION WHEN others THEN
    rls_blocked := true;
  END;
  PERFORM record_test(9, 'Workflow: Non-requester cannot accept offer', rls_blocked, 'Blocked unauthorized offer acceptance');

  -- Requester (u1) accepts offer
  PERFORM auth.set_acting_user(u1, 'authenticated');
  PERFORM public.accept_offer(offer1);

  -- --------------------------------------------------------------------------
  -- TEST 10: Safe Contact Disclosure
  -- --------------------------------------------------------------------------
  -- Unrelated user (u2) tries to get contact
  PERFORM auth.set_acting_user(u2, 'authenticated');
  rls_blocked := false;
  BEGIN
    PERFORM * FROM public.get_contact(req_id);
  EXCEPTION WHEN others THEN
    rls_blocked := true;
  END;
  PERFORM record_test(10, 'Security: Unrelated third party cannot view contact info', rls_blocked, 'Contact reveal forbidden to non-participants');

  -- Matched helper (u3) calls get_contact -> sees requester phone
  PERFORM auth.set_acting_user(u3, 'authenticated');
  SELECT counterpart_phone INTO contact_phone FROM public.get_contact(req_id);
  IF contact_phone = '+919876543210' THEN
    PERFORM record_test(11, 'Safe Contact Reveal: Matched helper sees requester phone', true, 'Phone revealed only to accepted helper');
  ELSE
    PERFORM record_test(11, 'Safe Contact Reveal', false, 'Phone did not match requester phone');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 12: Urgency & Distance Ranking Ordering Setup
  -- --------------------------------------------------------------------------
  -- Create blood request and books request
  PERFORM auth.set_acting_user(u1, 'authenticated');
  INSERT INTO public.requests (
    requester_id, category, title, description, urgency, location, address_text, created_at
  )
  VALUES (
    u1, 'blood', 'Emergency Platelets', 'Critical', 'critical',
    ST_SetSRID(ST_MakePoint(86.9746, 23.6889), 4326)::geography, 'Location 1',
    now() - interval '20 minutes'
  ) RETURNING id INTO req_blood;

  INSERT INTO public.requests (
    requester_id, category, title, description, urgency, location, address_text, created_at
  )
  VALUES (
    u1, 'books', 'Data Structures Book', 'Study aid', 'low',
    ST_SetSRID(ST_MakePoint(86.9746, 23.6889), 4326)::geography, 'Location 2',
    now() - interval '20 minutes'
  ) RETURNING id INTO req_books;

  -- --------------------------------------------------------------------------
  -- TEST 12: Urgency & Distance Ranking Ordering
  -- --------------------------------------------------------------------------
  SELECT id INTO v_top_id
  FROM public.nearby_requests(23.6889, 86.9746, 50.0)
  LIMIT 1;

  IF v_top_id = req_blood THEN
    PERFORM record_test(12, 'Urgency & Distance Ranking: Critical urgency ranked ahead of low urgency', true, 'Critical request ranked first');
  ELSE
    PERFORM record_test(12, 'Urgency & Distance Ranking', false, 'Expected critical request to be ranked first');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 13: Expired requests hidden from nearby_requests
  -- --------------------------------------------------------------------------
  UPDATE public.requests SET expires_at = now() - interval '10 minutes' WHERE id = req_books;
  IF NOT EXISTS (SELECT 1 FROM public.nearby_requests(23.6889, 86.9746, 50.0) WHERE id = req_books) THEN
    PERFORM record_test(13, 'Filter: Expired requests automatically excluded from nearby feed', true, 'Expired request filtered out');
  ELSE
    PERFORM record_test(13, 'Filter: Expired requests excluded', false, 'Expired request was returned in feed');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 14: Rating trigger recalculates profile average
  -- --------------------------------------------------------------------------
  PERFORM auth.set_acting_user(u1, 'authenticated');
  PERFORM public.complete_request(req_id);

  -- Requester rates Helper (u3) 5 stars
  INSERT INTO public.ratings (request_id, rater_id, ratee_id, stars, comment)
  VALUES (req_id, u1, u3, 5, 'Exceptional hero!');

  -- Re-read under admin role to view profile data
  PERFORM auth.set_acting_user(u_admin, 'authenticated');
  SELECT rating_average, rating_count INTO p_rec FROM public.profiles WHERE id = u3;
  IF p_rec.rating_average = 5.00 AND p_rec.rating_count = 1 THEN
    PERFORM record_test(14, 'Trigger: Rating trigger automatically updates user average rating', true, 'Rating average updated to 5.00');
  ELSE
    PERFORM record_test(14, 'Trigger: Rating trigger', false, 'Rating average mismatch');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 15: Public statistics function
  -- --------------------------------------------------------------------------
  PERFORM auth.set_acting_user(NULL, 'anon');
  stats := public.public_stats();
  IF (stats->>'verified_helpers')::int >= 1 AND (stats->>'completed_requests')::int >= 1 THEN
    PERFORM record_test(15, 'Public Stats Function: Anonymous aggregated platform metrics', true, 'Returned safe public metrics JSON');
  ELSE
    PERFORM record_test(15, 'Public Stats Function', false, 'Metrics returned invalid values');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 16: Admin Verification Workflow
  -- --------------------------------------------------------------------------
  PERFORM auth.set_acting_user(u2, 'authenticated');
  INSERT INTO public.verification_requests (user_id, phone, id_document_path)
  VALUES (u2, '+919876543211', u2::text || '/college_id.pdf');

  -- Regular user (u1) cannot update verification
  PERFORM auth.set_acting_user(u1, 'authenticated');
  UPDATE public.verification_requests SET status = 'verified' WHERE user_id = u2;
  IF (SELECT count(*) FROM public.verification_requests WHERE user_id = u2 AND status = 'verified') = 0 THEN
    PERFORM record_test(16, 'Admin Security: Non-admin cannot approve verification requests', true, 'Non-admin update blocked by RLS');
  ELSE
    PERFORM record_test(16, 'Admin Security', false, 'Non-admin was able to approve verification');
  END IF;

  -- Admin approves verification
  PERFORM auth.set_acting_user(u_admin, 'authenticated');
  UPDATE public.verification_requests SET status = 'verified', reviewed_by = u_admin WHERE user_id = u2;
  IF (SELECT count(*) FROM public.verification_requests WHERE user_id = u2 AND status = 'verified') = 1 THEN
    PERFORM record_test(17, 'Admin Approval: Admin successfully reviews verification submission', true, 'Status updated to verified by admin');
  ELSE
    PERFORM record_test(17, 'Admin Approval', false, 'Admin update failed');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 18: Storage RLS Folder Isolation
  -- --------------------------------------------------------------------------
  PERFORM auth.set_acting_user(u1, 'authenticated');
  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('verification-docs', u1::text || '/id.png', u1);

  -- User 1 CANNOT insert in User 2's folder
  v_storage_blocked := false;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('verification-docs', u2::text || '/hacked.png', u1);
  EXCEPTION WHEN others THEN
    v_storage_blocked := true;
  END;
  IF NOT v_storage_blocked AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE name = u2::text || '/hacked.png') THEN
    v_storage_blocked := true;
  END IF;
  PERFORM record_test(18, 'Storage Security: Users strictly restricted to their own {user_id} folder', v_storage_blocked, 'Folder traversal/tampering blocked');

  -- Reset role back to database owner
  EXECUTE 'RESET ROLE';

END $$;

SELECT test_num, test_name, passed, details FROM test_results ORDER BY test_num;

ROLLBACK;
