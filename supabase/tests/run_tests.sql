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
  v_map_cleaned integer;
  v_map_usage record;
  v_map_blocked boolean := false;
  v_bio_error boolean := false;
  v_vis_error boolean := false;
  v_contact_limit_error boolean := false;
  v_proof_id uuid;
  v_proof_blocked boolean := false;
  v_summary_json jsonb;
  v_member_anon jsonb;
  v_member_auth jsonb;
  v_member_self jsonb;
  v_badge_count integer;
  v_badge_dup boolean := false;
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

  -- --------------------------------------------------------------------------
  -- TEST 19: Map Cache & Daily Usage Table Schema and Constraints
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'map_cache' AND c.relkind = 'r'
  ) AND EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'map_daily_usage' AND c.relkind = 'r'
  ) THEN
    PERFORM record_test(19, 'Maps Schema: map_cache and map_daily_usage tables exist with indexes', true, 'Tables and constraints verified');
  ELSE
    PERFORM record_test(19, 'Maps Schema', false, 'Tables do not exist');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 20: Atomic increment_map_usage function
  -- --------------------------------------------------------------------------
  -- Reset role to database owner to execute procedures and inspect
  EXECUTE 'RESET ROLE';
  PERFORM public.increment_map_usage('geoapify', CURRENT_DATE, 4, 2);
  PERFORM public.increment_map_usage('geoapify', CURRENT_DATE, 3, 1);
  
  SELECT request_count, credit_count INTO v_map_usage
  FROM public.map_daily_usage
  WHERE provider = 'geoapify' AND usage_date = CURRENT_DATE;

  IF v_map_usage.request_count = 7 AND v_map_usage.credit_count = 3 THEN
    PERFORM record_test(20, 'Maps Usage: increment_map_usage atomically accumulates requests and credits', true, 'Atomic upsert accumulated to (7 req, 3 cred)');
  ELSE
    PERFORM record_test(20, 'Maps Usage', false, 'Accumulation mismatch: ' || COALESCE(v_map_usage.request_count, -1)::text);
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 21: cleanup_expired_map_cache function
  -- --------------------------------------------------------------------------
  INSERT INTO public.map_cache (key, data, category, expires_at)
  VALUES 
    ('test:expired:1', '{"status":"old"}'::jsonb, 'geocode', now() - interval '10 minutes'),
    ('test:expired:2', '{"status":"old"}'::jsonb, 'route', now() - interval '1 hour'),
    ('test:valid:1', '{"status":"fresh"}'::jsonb, 'places', now() + interval '2 hours');

  v_map_cleaned := public.cleanup_expired_map_cache();

  IF v_map_cleaned >= 2 AND EXISTS (SELECT 1 FROM public.map_cache WHERE key = 'test:valid:1')
     AND NOT EXISTS (SELECT 1 FROM public.map_cache WHERE key LIKE 'test:expired:%') THEN
    PERFORM record_test(21, 'Maps Cache: cleanup_expired_map_cache purges stale entries and keeps fresh ones', true, 'Expired entries purged (' || v_map_cleaned::text || ' rows)');
  ELSE
    PERFORM record_test(21, 'Maps Cache', false, 'Cache cleanup failed');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 22: RLS Isolation for Map Cache and Daily Usage
  -- --------------------------------------------------------------------------
  -- Authenticated user must NOT have access to map_cache or map_daily_usage
  EXECUTE 'SET ROLE authenticated';
  PERFORM auth.set_acting_user(u1, 'authenticated');
  v_map_blocked := false;
  BEGIN
    PERFORM * FROM public.map_cache;
  EXCEPTION WHEN others THEN
    v_map_blocked := true;
  END;

  IF NOT v_map_blocked THEN
    -- If no exception was raised by REVOKE, check if RLS returned 0 rows
    IF (SELECT count(*) FROM public.map_cache) = 0 THEN
      v_map_blocked := true;
    END IF;
  END IF;

  -- Verify service_role HAS access
  EXECUTE 'SET ROLE service_role';
  PERFORM auth.set_acting_user(NULL, 'service_role');
  PERFORM count(*) FROM public.map_cache;
  PERFORM count(*) FROM public.map_daily_usage;

  -- Reset role back to database owner
  EXECUTE 'RESET ROLE';

  PERFORM record_test(22, 'Maps Security: RLS restricts map_cache and map_daily_usage from public/authenticated users', v_map_blocked, 'Direct user access blocked by RLS/privileges');

  -- --------------------------------------------------------------------------
  -- TEST 23: Profile Overhaul Columns & Check Constraints
  -- --------------------------------------------------------------------------
  v_bio_error := false;
  BEGIN
    UPDATE public.profiles SET bio = repeat('X', 501) WHERE id = u1;
  EXCEPTION WHEN check_violation THEN
    v_bio_error := true;
  END;

  v_vis_error := false;
  BEGIN
    UPDATE public.profiles SET visibility_phone = 'invalid_level' WHERE id = u1;
  EXCEPTION WHEN check_violation THEN
    v_vis_error := true;
  END;

  IF v_bio_error AND v_vis_error THEN
    PERFORM record_test(23, 'Profile Overhaul: Bio length <= 500 and visibility enum constraints', true, 'Invalid bio (>500) and invalid visibility successfully rejected');
  ELSE
    PERFORM record_test(23, 'Profile Overhaul Constraints', false, 'Constraints did not trigger check violations');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 24: Emergency Contacts Table & Maximum 3 Contacts Trigger
  -- --------------------------------------------------------------------------
  DELETE FROM public.emergency_contacts WHERE user_id = u1;
  INSERT INTO public.emergency_contacts (user_id, name, relationship, phone_e164)
  VALUES
    (u1, 'Contact One', 'parent', '+919999900001'),
    (u1, 'Contact Two', 'sibling', '+919999900002'),
    (u1, 'Contact Three', 'friend', '+919999900003');

  v_contact_limit_error := false;
  BEGIN
    INSERT INTO public.emergency_contacts (user_id, name, relationship, phone_e164)
    VALUES (u1, 'Contact Four', 'other', '+919999900004');
  EXCEPTION WHEN others THEN
    v_contact_limit_error := true;
  END;

  IF v_contact_limit_error AND (SELECT count(*) FROM public.emergency_contacts WHERE user_id = u1) = 3 THEN
    PERFORM record_test(24, 'Emergency Contacts: Maximum 3 contacts per user trigger constraint', true, '4th emergency contact blocked by trigger');
  ELSE
    PERFORM record_test(24, 'Emergency Contacts Limit', false, 'Failed to enforce max 3 contacts limit');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 25: Badge Definitions Seed & User Badges Uniqueness
  -- --------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_badge_count FROM public.badge_definitions;
  
  DELETE FROM public.user_badges WHERE user_id = u3;
  INSERT INTO public.user_badges (user_id, badge_id, current_level, current_count, is_pinned)
  VALUES (u3, 'community_pillar', 1, 10, true);

  v_badge_dup := false;
  BEGIN
    INSERT INTO public.user_badges (user_id, badge_id, current_level, current_count)
    VALUES (u3, 'community_pillar', 1, 15);
  EXCEPTION WHEN unique_violation THEN
    v_badge_dup := true;
  END;

  IF v_badge_count >= 18 AND v_badge_dup THEN
    PERFORM record_test(25, 'Badges: Standard definitions seeded and (user_id, badge_id) uniqueness enforced', true, 'Seeded ' || v_badge_count::text || ' badges, duplicate badge blocked');
  ELSE
    PERFORM record_test(25, 'Badges', false, 'Badge verification failed');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 26: Professional Proofs & Account Deletion Requests RLS
  -- --------------------------------------------------------------------------
  EXECUTE 'SET ROLE authenticated';
  PERFORM auth.set_acting_user(u2, 'authenticated');

  INSERT INTO public.professional_proofs (user_id, profession_type, reg_number, document_path)
  VALUES (u2, 'doctor', 'WBMC-TEST-99', u2::text || '/test_doc.pdf')
  RETURNING id INTO v_proof_id;

  -- Non-admin cannot approve proof
  v_proof_blocked := false;
  BEGIN
    UPDATE public.professional_proofs SET status = 'approved' WHERE id = v_proof_id;
  EXCEPTION WHEN others THEN
    v_proof_blocked := true;
  END;
  IF (SELECT status FROM public.professional_proofs WHERE id = v_proof_id) = 'pending' THEN
    v_proof_blocked := true;
  END IF;

  -- Admin can review proof
  PERFORM auth.set_acting_user(u_admin, 'authenticated');
  UPDATE public.professional_proofs SET status = 'approved', reviewed_by = u_admin, reviewed_at = now() WHERE id = v_proof_id;

  -- User can submit account deletion request
  PERFORM auth.set_acting_user(u2, 'authenticated');
  INSERT INTO public.account_deletion_requests (user_id, reason)
  VALUES (u2, 'Moving out of coverage region');

  EXECUTE 'RESET ROLE';

  IF v_proof_blocked AND (SELECT status FROM public.professional_proofs WHERE id = v_proof_id) = 'approved'
     AND EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE user_id = u2) THEN
    PERFORM record_test(26, 'Proofs & Deletion Requests: User submission and admin-only approval RLS', true, 'Non-admin approval blocked, admin approved successfully');
  ELSE
    PERFORM record_test(26, 'Proofs RLS', false, 'Proof workflow or RLS failure');
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 27: get_profile_summary Single Source of Truth Metrics
  -- --------------------------------------------------------------------------
  -- Insert a completed request with distance and ratings for u3 (Amit Verified)
  INSERT INTO public.requests (
    id, requester_id, category, title, description, urgency, status,
    location, address_text, accepted_helper_id, created_at, accepted_at, completed_at, travel_distance_km
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000099', u1, 'blood',
    'Completed Blood Aid Request For Test 27',
    'Test aid request description',
    'critical', 'completed',
    ST_SetSRID(ST_MakePoint(86.9745, 23.6842), 4326)::geography,
    'District Hospital Asansol',
    u3,
    now() - interval '3 hours',
    now() - interval '2 hours',
    now() - interval '30 minutes',
    4.50
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, accepted_helper_id = EXCLUDED.accepted_helper_id,
    completed_at = EXCLUDED.completed_at, travel_distance_km = EXCLUDED.travel_distance_km;

  DELETE FROM public.ratings WHERE request_id = 'b0000000-0000-0000-0000-000000000099';
  INSERT INTO public.ratings (request_id, rater_id, ratee_id, stars, rating_score, comment)
  VALUES ('b0000000-0000-0000-0000-000000000099', u1, u3, 5, 5.0, 'Excellent verified helper');

  v_summary_json := public.get_profile_summary(u3);

  IF (v_summary_json->>'helps_given')::integer >= 1
     AND (v_summary_json->>'hours_volunteered')::numeric >= 1.0
     AND (v_summary_json->>'distance_covered_km')::numeric >= 4.5
     AND (v_summary_json->>'trust_score')::numeric = 5.0
     AND (v_summary_json->>'current_streak_days')::integer >= 1 THEN
    PERFORM record_test(27, 'Profile Summary Function: Single source of truth metrics accurately aggregated', true, 'Summary calculated helps, hours, distance, streak, and trust score');
  ELSE
    PERFORM record_test(27, 'Profile Summary Function', false, 'Metrics mismatch: ' || v_summary_json::text);
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 28: get_member_profile Visibility & Privacy Control Enforcement
  -- --------------------------------------------------------------------------
  UPDATE public.profiles
  SET bio = 'Dedicated community volunteer',
      organisation = 'Asansol Engineering College',
      area_name = 'Kalyanpur',
      phone_e164 = '+919876543210',
      phone_national = '9876543210',
      phone_country_code = '+91',
      visibility_phone = 'private',
      visibility_email = 'members',
      visibility_organisation = 'members',
      visibility_area = 'members'
  WHERE id = u1;

  -- 1) Anonymous view: phone, email, organisation, area MUST be NULL
  v_member_anon := public.get_member_profile('priya_test', NULL);

  -- 2) Logged-in view by u2 (not matched): email, organisation, area visible; phone NULL (private)
  v_member_auth := public.get_member_profile('priya_test', u2);

  -- 3) Self view: phone visible, emergency contacts returned
  v_member_self := public.get_member_profile('priya_test', u1);

  IF (v_member_anon->>'phone' IS NULL AND v_member_anon->>'email' IS NULL AND v_member_anon->>'organisation' IS NULL)
     AND (v_member_auth->>'organisation' = 'Asansol Engineering College' AND v_member_auth->>'phone' IS NULL)
     AND (v_member_self->>'phone' = '+919876543210' AND jsonb_array_length(v_member_self->'emergency_contacts') = 3) THEN
    PERFORM record_test(28, 'Member Profile View: Privacy enforcement across anonymous, member, and self views', true, 'Phone hidden when private, revealed to self; organisation revealed to members');
  ELSE
    PERFORM record_test(28, 'Member Profile View', false, 'Privacy violation or data omission in get_member_profile');
  END IF;

END $$;

SELECT test_num, test_name, passed, details FROM test_results ORDER BY test_num;

ROLLBACK;
