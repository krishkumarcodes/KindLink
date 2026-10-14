-- ============================================================================
-- KindLink - Database Migration 05: Core Stored Procedures & Ranking Engines
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Implement the Urgency and Distance ranking algorithm in SQL, safe contact
--          disclosure, public statistics, and offer/request workflow operations.
-- Safety: Completely idempotent (CREATE OR REPLACE FUNCTION).
-- ============================================================================

-- 1. HELPER FUNCTION: Category weights in ONE single location
CREATE OR REPLACE FUNCTION public.category_weight(cat public.help_category)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE cat
    WHEN 'blood' THEN 10.0
    WHEN 'transport' THEN 9.0
    WHEN 'elderly_help' THEN 6.0
    WHEN 'equipment' THEN 5.0
    WHEN 'books' THEN 2.0
    ELSE 5.0
  END;
$$;

-- 2. NEARBY REQUESTS WITH URGENCY & DISTANCE RANKING
-- Sorted by Urgency Level (Critical > High > Medium > Low), then nearest distance, then longest waiting time.
CREATE OR REPLACE FUNCTION public.nearby_requests(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 25.0,
  filter_cat public.help_category DEFAULT NULL,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  requester_id uuid,
  category public.help_category,
  title text,
  description text,
  details jsonb,
  urgency public.urgency_level,
  status public.request_status,
  latitude double precision,
  longitude double precision,
  address_text text,
  distance_km double precision,
  waiting_minutes integer,
  accepted_helper_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $$
  WITH computed AS (
    SELECT
      r.id,
      r.requester_id,
      r.category,
      r.title,
      r.description,
      r.details,
      r.urgency,
      r.status,
      ST_Y(r.location::geometry) AS latitude,
      ST_X(r.location::geometry) AS longitude,
      r.address_text,
      ROUND((ST_Distance(r.location::geography, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000.0)::numeric, 2)::double precision AS distance_km,
      GREATEST(1, ROUND(EXTRACT(EPOCH FROM (now() - r.created_at)) / 60.0)::integer) AS waiting_minutes,
      r.accepted_helper_id,
      r.created_at
    FROM public.requests r
    WHERE r.status = 'open'
      AND (r.expires_at IS NULL OR r.expires_at > now())
      AND ST_DWithin(
        r.location::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        (radius_km * 1000.0)::double precision
      )
      AND (filter_cat IS NULL OR r.category = filter_cat)
  )
  SELECT
    c.id,
    c.requester_id,
    c.category,
    c.title,
    c.description,
    c.details,
    c.urgency,
    c.status,
    c.latitude,
    c.longitude,
    c.address_text,
    c.distance_km,
    c.waiting_minutes,
    c.accepted_helper_id,
    c.created_at
  FROM computed c
  ORDER BY
    CASE c.urgency
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END ASC,
    c.distance_km ASC,
    c.waiting_minutes DESC,
    c.created_at ASC
  LIMIT page_limit
  OFFSET page_offset;
$$;

-- 3. SAFE CONTACT DISCLOSURE (Returns phone ONLY to accepted match pair)
CREATE OR REPLACE FUNCTION public.get_contact(req_id uuid)
RETURNS TABLE (
  counterpart_user_id uuid,
  counterpart_name text,
  counterpart_phone text,
  user_relationship text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
  v_current_user uuid := auth.uid();
BEGIN
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view contact info';
  END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = req_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Caller is the Requester
  IF v_req.requester_id = v_current_user THEN
    IF v_req.accepted_helper_id IS NULL THEN
      RAISE EXCEPTION 'No helper has been accepted yet for this request';
    END IF;

    RETURN QUERY
    SELECT
      p.id,
      COALESCE(p.display_name, p.username),
      p.phone,
      'accepted_helper'::text
    FROM public.profiles p
    WHERE p.id = v_req.accepted_helper_id;
    RETURN;

  -- Caller is the Accepted Helper
  ELSIF v_req.accepted_helper_id = v_current_user THEN
    RETURN QUERY
    SELECT
      p.id,
      COALESCE(p.display_name, p.username),
      p.phone,
      'requester'::text
    FROM public.profiles p
    WHERE p.id = v_req.requester_id;
    RETURN;

  ELSE
    RAISE EXCEPTION 'Access denied. You are not a matched participant in this aid request';
  END IF;
END;
$$;

-- 4. PUBLIC ANONYMOUS PLATFORM STATS (Safe aggregated numbers for Welcome page)
CREATE OR REPLACE FUNCTION public.public_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'open_requests', (SELECT count(*) FROM public.requests WHERE status = 'open' AND (expires_at IS NULL OR expires_at > now())),
    'verified_helpers', (SELECT count(*) FROM public.profiles WHERE verification_status = 'verified'),
    'completed_requests', (SELECT count(*) FROM public.requests WHERE status = 'completed'),
    'total_volunteers', (SELECT count(*) FROM public.profiles)
  );
$$;

-- 5. WORKFLOW: ACCEPT OFFER (Only the requester can accept an offer)
CREATE OR REPLACE FUNCTION public.accept_offer(target_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.offers%ROWTYPE;
  v_req public.requests%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_offer FROM public.offers WHERE id = target_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = v_offer.request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated request not found';
  END IF;

  IF v_req.requester_id != v_caller THEN
    RAISE EXCEPTION 'Only the requester can accept volunteer offers for this request';
  END IF;

  IF v_req.status != 'open' THEN
    RAISE EXCEPTION 'Request is already in % status', v_req.status;
  END IF;

  -- Update accepted offer
  UPDATE public.offers
  SET status = 'accepted', updated_at = now()
  WHERE id = target_offer_id;

  -- Decline any other pending offers on this request
  UPDATE public.offers
  SET status = 'declined', updated_at = now()
  WHERE request_id = v_req.id AND id != target_offer_id AND status = 'pending';

  -- Update request status
  UPDATE public.requests
  SET status = 'accepted',
      accepted_helper_id = v_offer.helper_id,
      accepted_at = now()
  WHERE id = v_req.id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_req.id,
    'accepted_helper_id', v_offer.helper_id
  );
END;
$$;

-- 6. WORKFLOW: COMPLETE REQUEST (Requester or accepted helper can mark complete)
CREATE OR REPLACE FUNCTION public.complete_request(target_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = target_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_req.requester_id != v_caller AND v_req.accepted_helper_id != v_caller THEN
    RAISE EXCEPTION 'Only matched participants can mark a request as completed';
  END IF;

  UPDATE public.requests
  SET status = 'completed', completed_at = now()
  WHERE id = target_request_id;

  RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;

-- 7. WORKFLOW: CANCEL REQUEST (Only requester can cancel their request)
CREATE OR REPLACE FUNCTION public.cancel_request(target_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = target_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_req.requester_id != v_caller THEN
    RAISE EXCEPTION 'Only the requester can cancel this request';
  END IF;

  UPDATE public.requests
  SET status = 'cancelled'
  WHERE id = target_request_id;

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

-- 8. LIVE STATS AGGREGATION RPC
CREATE OR REPLACE FUNCTION public.live_stats(
  lat double precision DEFAULT 23.6889,
  lng double precision DEFAULT 86.9661,
  radius_km double precision DEFAULT 25.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_helpers_count integer := 0;
  v_avg_response_min numeric := NULL;
  v_completed_count integer := 0;
  v_satisfaction_pct numeric := NULL;
  v_active_requests integer := 0;
BEGIN
  -- Count verified helpers
  SELECT COUNT(*) INTO v_helpers_count
  FROM public.profiles
  WHERE role IN ('user', 'admin') AND verification_status = 'verified';

  -- Active requests
  SELECT COUNT(*) INTO v_active_requests
  FROM public.requests
  WHERE status IN ('open', 'accepted');

  -- Completed requests
  SELECT COUNT(*) INTO v_completed_count
  FROM public.requests
  WHERE status = 'completed';

  -- Avg response time (in minutes) between created_at and accepted_at
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60)::numeric, 1)
  INTO v_avg_response_min
  FROM public.requests
  WHERE accepted_at IS NOT NULL AND status IN ('accepted', 'completed');

  -- Satisfaction percentage based on ratings
  SELECT ROUND((AVG(COALESCE(rating_score, stars::numeric)) / 5.0 * 100)::numeric, 1)
  INTO v_satisfaction_pct
  FROM public.ratings
  WHERE stars IS NOT NULL;

  RETURN jsonb_build_object(
    'helpers_nearby', COALESCE(v_helpers_count, 0),
    'active_requests', COALESCE(v_active_requests, 0),
    'requests_completed', COALESCE(v_completed_count, 0),
    'avg_response_minutes', v_avg_response_min,
    'satisfaction_percentage', v_satisfaction_pct
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_stats TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_stats(double precision, double precision, double precision) TO anon, authenticated, service_role;

-- 9. USERNAME RESOLUTION RPC FOR LOGIN
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

-- End of 05_functions.sql
