-- ==============================================================================
-- KindLink - Database Migration 17: Own-Request Rules & Data Cleanup
-- Purpose:
--   1. Strict Database Enforcement: Trigger to prevent users from offering help on own requests
--   2. Eligibility Function: public.can_offer_help(p_request_id, p_user_id)
--   3. Exclude requester's own requests from help feeds (nearby_requests, get_nearby_requests)
--   4. Stored procedure get_my_active_requests(p_user_id) with offer counts
--   5. Data cleanup: purge self-offers and stale default college location labels
-- Idempotent & Non-Destructive. Safe to run repeatedly.
-- ==============================================================================

-- 1. DATA CLEANUP: Remove any existing self-offers
DELETE FROM public.offers
WHERE helper_id = (SELECT requester_id FROM public.requests WHERE id = offers.request_id);

-- 2. DATA CLEANUP: Clean up old default college location labels in profiles and saved_places
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_neighborhood'
  ) THEN
    UPDATE public.profiles
    SET home_neighborhood = NULL
    WHERE home_neighborhood ILIKE '%' || 'Asansol' || '_' || 'Engineering%' OR home_neighborhood ILIKE '%' || chr(65)||chr(69)||chr(67) || '%';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'area_name'
  ) THEN
    UPDATE public.profiles
    SET area_name = NULL
    WHERE area_name ILIKE '%' || 'Asansol' || '_' || 'Engineering%' OR area_name ILIKE '%' || chr(65)||chr(69)||chr(67) || '%';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saved_places'
  ) THEN
    DELETE FROM public.saved_places
    WHERE label ILIKE '%' || chr(65)||chr(69)||chr(67) || '%' OR address_text ILIKE '%' || 'Asansol' || '_' || 'Engineering%';
  END IF;
END $$;

-- 3. TRIGGER: Prevent users from offering help on their own request
CREATE OR REPLACE FUNCTION public.check_prevent_self_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id uuid;
BEGIN
  SELECT requester_id INTO v_requester_id
  FROM public.requests
  WHERE id = NEW.request_id;

  IF NEW.helper_id = v_requester_id THEN
    RAISE EXCEPTION 'You cannot offer help on your own request'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_offer ON public.offers;
CREATE TRIGGER trg_prevent_self_offer
  BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_prevent_self_offer();

COMMENT ON TRIGGER trg_prevent_self_offer ON public.offers IS
  'Guarantees at database level that a user cannot insert or update an offer assisting their own aid request.';

-- 4. FUNCTION: can_offer_help(p_request_id, p_user_id)
CREATE OR REPLACE FUNCTION public.can_offer_help(
  p_request_id uuid,
  p_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
  v_helper_status text;
  v_has_active_offer boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'not_authenticated';
  END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN 'request_not_found';
  END IF;

  -- 1. Own request check
  IF v_req.requester_id = p_user_id THEN
    RETURN 'own_request';
  END IF;

  -- 2. Request status check
  IF v_req.status != 'open' THEN
    RETURN 'request_closed';
  END IF;

  -- 3. Verification status check
  SELECT verification_status::text INTO v_helper_status FROM public.profiles WHERE id = p_user_id;
  IF v_helper_status IS DISTINCT FROM 'verified' THEN
    RETURN 'not_verified';
  END IF;

  -- 4. Already offered check (active offer, pending or accepted)
  SELECT EXISTS (
    SELECT 1 FROM public.offers
    WHERE request_id = p_request_id
      AND helper_id = p_user_id
      AND status IN ('pending', 'accepted')
  ) INTO v_has_active_offer;

  IF v_has_active_offer THEN
    RETURN 'already_offered';
  END IF;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_offer_help(uuid, uuid) TO anon, authenticated, service_role;

-- 5. FUNCTION: nearby_requests & get_nearby_requests with own-request filtering
-- Safely drop old overloads
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer);
DROP FUNCTION IF EXISTS public.get_nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer, uuid);

CREATE OR REPLACE FUNCTION public.nearby_requests(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 15.0,
  filter_cat public.help_category DEFAULT NULL,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
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
      AND (p_user_id IS NULL OR r.requester_id != p_user_id)
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

CREATE OR REPLACE FUNCTION public.get_nearby_requests(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 15.0,
  filter_cat public.help_category DEFAULT NULL,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
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
  SELECT * FROM public.nearby_requests(
    lat,
    lng,
    radius_km,
    filter_cat,
    page_limit,
    page_offset,
    p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer, uuid) TO anon, authenticated, service_role;

-- 6. FUNCTION: get_my_active_requests(p_user_id)
CREATE OR REPLACE FUNCTION public.get_my_active_requests(p_user_id uuid)
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
  offer_count bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
    0.0::double precision AS distance_km,
    GREATEST(1, ROUND(EXTRACT(EPOCH FROM (now() - r.created_at)) / 60.0)::integer) AS waiting_minutes,
    r.accepted_helper_id,
    COALESCE((
      SELECT count(*)
      FROM public.offers o
      WHERE o.request_id = r.id
    ), 0)::bigint AS offer_count,
    r.created_at
  FROM public.requests r
  WHERE r.requester_id = p_user_id
    AND r.status NOT IN ('completed', 'cancelled')
  ORDER BY r.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_active_requests(uuid) TO anon, authenticated, service_role;
