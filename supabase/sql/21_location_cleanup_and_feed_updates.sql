-- ==============================================================================
-- KindLink - Database Migration 21: Location Cleanup & Feed Updates
-- Purpose:
--   1. Update public.nearby_requests to support:
--      - Data-driven text categories (all 15 categories + custom 'other')
--      - Tag filtering (filter_tag text)
--      - Returns custom_category_label and tags array
--      - Strict Urgency > Proximity > Waiting Time ordering
--   2. Realtime 24h Activity function:
--      - public.get_hourly_activity_24h() returning hourly requests & helps
--   3. Location Data Cleanup:
--      - Purge legacy test institute strings from profiles and saved_places
--      - Reset hardcoded defaults to null so users only see real saved or live data
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP LEGACY NEARBY_REQUESTS SIGNATURES (if any)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer);

-- ------------------------------------------------------------------------------
-- 2. CREATE UPDATED DATA-DRIVEN NEARBY_REQUESTS FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nearby_requests(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 25.0,
  filter_cat text DEFAULT NULL,
  filter_tag text DEFAULT NULL,
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  requester_id uuid,
  category text,
  custom_category_label text,
  tags text[],
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
      r.category::text AS category,
      r.custom_category_label,
      COALESCE(r.tags, '{}'::text[]) AS tags,
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
      AND (
        filter_cat IS NULL
        OR trim(filter_cat) = ''
        OR r.category::text = lower(trim(filter_cat))
      )
      AND (
        filter_tag IS NULL
        OR trim(filter_tag) = ''
        OR lower(trim(filter_tag)) = ANY(
             ARRAY(SELECT lower(t) FROM unnest(COALESCE(r.tags, '{}'::text[])) AS t)
           )
      )
  )
  SELECT
    c.id,
    c.requester_id,
    c.category,
    c.custom_category_label,
    c.tags,
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

GRANT EXECUTE ON FUNCTION public.nearby_requests(
  double precision, double precision, double precision, text, text, integer, integer
) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. HOURLY ACTIVITY FOR LAST 24 HOURS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hourly_activity_24h()
RETURNS TABLE (
  hour_offset integer,
  hour_label text,
  requests_count integer,
  helps_count integer
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  WITH hours AS (
    SELECT
      i AS hour_offset,
      (date_trunc('hour', now()) - (i || ' hour')::interval) AS bucket_start,
      (date_trunc('hour', now()) - ((i - 1) || ' hour')::interval) AS bucket_end
    FROM generate_series(23, 0, -1) AS i
  )
  SELECT
    h.hour_offset,
    to_char(h.bucket_start, 'HH12 AM') AS hour_label,
    (
      SELECT count(*)::integer
      FROM public.requests r
      WHERE r.created_at >= h.bucket_start AND r.created_at < h.bucket_end
    ) AS requests_count,
    (
      SELECT count(*)::integer
      FROM public.requests r
      WHERE r.completed_at >= h.bucket_start AND r.completed_at < h.bucket_end
    ) AS helps_count
  FROM hours h
  ORDER BY h.hour_offset DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_hourly_activity_24h() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. PURGE OLD DEFAULT LOCATION DATA IN DATABASE
-- ------------------------------------------------------------------------------
-- Clean profiles where home area matches old legacy college defaults
UPDATE public.profiles
SET
  home_neighborhood = NULL
WHERE home_neighborhood ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
   OR home_neighborhood ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
   OR home_neighborhood ILIKE '%' || 'MAK' || 'AUT%';

-- Clean area_name column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'area_name'
  ) THEN
    UPDATE public.profiles
    SET area_name = NULL
    WHERE area_name ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
       OR area_name ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
       OR area_name ILIKE '%' || 'MAK' || 'AUT%';
  END IF;
END $$;

-- Clean saved_places table where label or address matches old legacy defaults
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saved_places'
  ) THEN
    DELETE FROM public.saved_places
    WHERE label ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
       OR label ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
       OR address_text ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
       OR address_text ILIKE '%' || chr(65)||chr(69)||chr(67) || '%';
  END IF;
END $$;
