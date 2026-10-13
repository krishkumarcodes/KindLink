-- ============================================================================
-- KindLink - Database Migration 14: Live Community Stats RPC
-- Purpose: Calculate real-time community statistics:
--          1. Helpers Nearby (verified helpers within radius or active in 15m)
--          2. Avg Response Time (median minutes from request creation to first offer in last 30 days)
--          3. Acts of Help (completed requests in area)
--          4. Trust Match (% of 4+ star ratings in last 90 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.live_stats(
  lat double precision DEFAULT 23.6889,
  lng double precision DEFAULT 86.9661,
  radius_km double precision DEFAULT 25.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_helpers integer;
  v_avg_resp double precision;
  v_acts integer;
  v_trust double precision;
  v_ratings_count integer;
  v_requests_with_offers integer;
BEGIN
  -- 1. Helpers Nearby: verified helpers active in last 15 min or registered in radius
  SELECT count(*) INTO v_helpers
  FROM public.profiles p
  WHERE p.verification_status = 'verified'
    AND (
      p.home_location IS NULL
      OR ST_DWithin(p.home_location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_km * 1000.0)
      OR p.updated_at >= now() - interval '15 minutes'
    );

  -- 2. Acts of Help: count of completed requests in the area
  SELECT count(*) INTO v_acts
  FROM public.requests r
  WHERE r.status = 'completed'
    AND ST_DWithin(r.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_km * 1000.0);

  -- 3. Median response time from request creation to first offer in last 30 days
  WITH first_offers AS (
    SELECT
      r.id,
      EXTRACT(EPOCH FROM (MIN(o.created_at) - r.created_at)) / 60.0 AS diff_mins
    FROM public.requests r
    JOIN public.offers o ON o.request_id = r.id
    WHERE r.created_at >= now() - interval '30 days'
      AND o.created_at >= r.created_at
      AND ST_DWithin(r.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_km * 1000.0)
    GROUP BY r.id, r.created_at
  )
  SELECT
    count(*),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY diff_mins)
  INTO v_requests_with_offers, v_avg_resp
  FROM first_offers;

  -- Shows '-' if < 3 requests
  IF v_requests_with_offers < 3 THEN
    v_avg_resp := NULL;
  ELSE
    v_avg_resp := ROUND(v_avg_resp::numeric, 1);
  END IF;

  -- 4. Trust Match: % of 4+ star ratings in last 90 days (shows '-' if < 5 ratings)
  SELECT
    count(*),
    ROUND((count(*) FILTER (WHERE stars >= 4)::numeric / NULLIF(count(*), 0)::numeric) * 100.0, 1)
  INTO v_ratings_count, v_trust
  FROM public.ratings
  WHERE created_at >= now() - interval '90 days';

  IF v_ratings_count < 5 THEN
    v_trust := NULL;
  END IF;

  RETURN jsonb_build_object(
    'helpers_nearby', COALESCE(v_helpers, 0),
    'avg_response_minutes', v_avg_resp,
    'acts_of_help', COALESCE(v_acts, 0),
    'trust_match_percentage', v_trust
  );
END;
$$;

-- Grant execution permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.live_stats(double precision, double precision, double precision) TO anon, authenticated, service_role;
