-- ==============================================================================
-- KindLink - Database Migration 12: Eradicate Physics Concepts & Urgency Ranking Update
-- Purpose: Remove all physics/gravity concepts from PostgreSQL database,
--          drop help_gravity_score columns/functions, and update the
--          nearby_requests stored procedure to sort by:
--          1. Urgency Level (Critical > High > Medium > Low)
--          2. Distance (Nearest distance in km)
--          3. Waiting Time (Longest waiting time / oldest created_at)
-- Idempotent: Safe to execute multiple times.
-- ==============================================================================

-- 1. Safely drop column if it ever existed on requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'help_gravity_score'
  ) THEN
    ALTER TABLE public.requests DROP COLUMN help_gravity_score;
  END IF;
END $$;

-- 2. Drop obsolete physics/gravity functions
DROP FUNCTION IF EXISTS public.calculate_help_gravity(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.calculate_help_gravity(text, double precision, integer);

-- Drop old signature of nearby_requests that returned help_gravity_score
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer);

-- 3. Recreate public.nearby_requests with clean schema and new ranking ordering
CREATE OR REPLACE FUNCTION public.nearby_requests(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 15.0,
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

COMMENT ON FUNCTION public.nearby_requests IS 'Returns nearby open aid requests ordered strictly by Urgency (Critical -> High -> Medium -> Low), nearest distance, and waiting duration.';
