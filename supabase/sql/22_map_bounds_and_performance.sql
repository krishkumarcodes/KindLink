-- ==============================================================================
-- KindLink - Database Migration 22: Map Bounds Filtering, Performance Indexes & RLS Optimization
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose:
--   1. Spatial Viewport Function:
--      - public.map_items_in_bounds(min_lat, min_lng, max_lat, max_lng, filter_cat, filter_urgency, lim)
--      - Uses PostGIS ST_MakeEnvelope and GiST spatial index on geography(point)
--      - Returns minimal, privacy-preserving fields: id, category, urgency, status, lat, lng, title, contact_name, distance_km
--      - Strictly excludes private notes, phone, and detailed descriptions
--   2. High-Performance Covering Indexes:
--      - requests (status, urgency, category, created_at)
--      - notifications (user_id, is_read, created_at)
--      - offers (request_id, helper_id, status)
--      - partial spatial index on open requests location
--   3. Subquery RLS Policy Optimization:
--      - Wraps auth.uid() in (SELECT auth.uid()) for initPlan evaluation once per statement
--      - Avoids expensive row-by-row function execution in RLS checks
--   4. Maintenance & Database Cleanup Function:
--      - public.cleanup_stale_data()
--      - Purges read notifications > 90 days (retaining unread)
--      - Purges expired SOS tokens / resolved records
--      - Purges stale map cache entries > 30 days old
--   5. Function Execution Timeouts:
--      - Enforces strict 5-second statement_timeout on all public RPC functions
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP EXISTING FUNCTION SIGNATURES (For clean idempotent replacement)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.map_items_in_bounds(float8, float8, float8, float8, text, text, int);
DROP FUNCTION IF EXISTS public.map_items_in_bounds(double precision, double precision, double precision, double precision, text, text, integer);

-- ------------------------------------------------------------------------------
-- 2. CREATE SPATIAL VIEWPORT FUNCTION: public.map_items_in_bounds
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.map_items_in_bounds(
  min_lat float8,
  min_lng float8,
  max_lat float8,
  max_lng float8,
  filter_cat text DEFAULT NULL,
  filter_urgency text DEFAULT NULL,
  lim int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  category text,
  urgency text,
  status text,
  lat float8,
  lng float8,
  title text,
  contact_name text,
  distance_km float8
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, extensions
SET statement_timeout = '5s'
AS $$
DECLARE
  v_min_lat float8 := LEAST(min_lat, max_lat);
  v_max_lat float8 := GREATEST(min_lat, max_lat);
  v_min_lng float8 := LEAST(min_lng, max_lng);
  v_max_lng float8 := GREATEST(min_lng, max_lng);
  v_center_lat float8 := (v_min_lat + v_max_lat) / 2.0;
  v_center_lng float8 := (v_min_lng + v_max_lng) / 2.0;
  v_limit int := LEAST(GREATEST(COALESCE(lim, 100), 1), 500);
  v_cat text := NULLIF(trim(filter_cat), '');
  v_urgency text := NULLIF(trim(filter_urgency), '');
  v_envelope geography;
  v_center_geom geography;
BEGIN
  -- Normalize 'all' filters to NULL
  IF lower(v_cat) = 'all' THEN
    v_cat := NULL;
  END IF;

  -- Normalize category naming (elderly vs elderly_help)
  IF lower(v_cat) = 'elderly' THEN
    v_cat := 'elderly_help';
  END IF;

  IF lower(v_urgency) = 'all' THEN
    v_urgency := NULL;
  END IF;

  -- Construct 4326 envelope and cast to geography to utilize GIST spatial index on geography(point)
  -- ST_MakeEnvelope takes (xmin, ymin, xmax, ymax, srid): x is longitude, y is latitude
  v_envelope := ST_MakeEnvelope(v_min_lng, v_min_lat, v_max_lng, v_max_lat, 4326)::geography;
  v_center_geom := ST_SetSRID(ST_MakePoint(v_center_lng, v_center_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    r.id,
    r.category::text,
    r.urgency::text,
    r.status::text,
    ST_Y(r.location::geometry)::float8 AS lat,
    ST_X(r.location::geometry)::float8 AS lng,
    r.title::text,
    COALESCE(
      NULLIF(trim(r.details->>'contactName'), ''),
      p.display_name,
      p.username,
      'Neighbor'
    )::text AS contact_name,
    ROUND((ST_Distance(r.location, v_center_geom) / 1000.0)::numeric, 2)::float8 AS distance_km
  FROM public.requests r
  LEFT JOIN public.profiles p ON p.id = r.requester_id
  WHERE r.status = 'open'
    AND (r.expires_at IS NULL OR r.expires_at > now())
    -- Bounding box spatial operator (&&) utilizes the GiST spatial index on r.location
    AND r.location && v_envelope
    AND ST_Intersects(r.location, v_envelope)
    -- Category filter if provided
    AND (v_cat IS NULL OR r.category::text = lower(v_cat))
    -- Urgency filter if provided
    AND (v_urgency IS NULL OR r.urgency::text = lower(v_urgency))
  ORDER BY
    CASE r.urgency::text
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END ASC,
    r.location <-> v_center_geom ASC,
    r.created_at DESC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.map_items_in_bounds(
  float8, float8, float8, float8, text, text, int
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.map_items_in_bounds(
  double precision, double precision, double precision, double precision, text, text, integer
) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. COVERING & COMPOSITE PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------

-- Spatial GiST indexes (re-affirm primary spatial indexes)
CREATE INDEX IF NOT EXISTS requests_location_gist_idx ON public.requests USING GIST (location);
CREATE INDEX IF NOT EXISTS requests_open_location_gist_idx ON public.requests USING GIST (location) WHERE status = 'open';

-- Covering index on requests (status, urgency, category, created_at)
CREATE INDEX IF NOT EXISTS requests_status_urgency_cat_created_idx
  ON public.requests (status, urgency, category, created_at DESC);

-- Covering index on notifications (user_id, is_read, created_at)
CREATE INDEX IF NOT EXISTS notifications_user_isread_created_idx
  ON public.notifications (user_id, is_read, created_at DESC);

-- Covering index on offers (request_id, helper_id, status)
CREATE INDEX IF NOT EXISTS offers_req_helper_status_covering_idx
  ON public.offers (request_id, helper_id, status);

-- ------------------------------------------------------------------------------
-- 4. OPTIMIZE HELPER FUNCTION is_admin() WITH (SELECT auth.uid())
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. OPTIMIZE RLS POLICIES: WRAP auth.uid() IN (SELECT auth.uid())
--    Prevents per-row function evaluation by compiling into an initPlan constant.
-- ------------------------------------------------------------------------------

-- TABLE: PROFILES
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = id
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = id OR public.is_admin()
  )
  WITH CHECK (
    (SELECT auth.uid()) = id OR public.is_admin()
  );

-- TABLE: VERIFICATION_REQUESTS
DROP POLICY IF EXISTS "verification_select_own_or_admin" ON public.verification_requests;
CREATE POLICY "verification_select_own_or_admin"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "verification_insert_own" ON public.verification_requests;
CREATE POLICY "verification_insert_own"
  ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
  );

DROP POLICY IF EXISTS "verification_update_admin_only" ON public.verification_requests;
CREATE POLICY "verification_update_admin_only"
  ON public.verification_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- TABLE: REQUESTS
DROP POLICY IF EXISTS "requests_select_active_or_participant" ON public.requests;
CREATE POLICY "requests_select_active_or_participant"
  ON public.requests FOR SELECT
  TO authenticated
  USING (
    (status = 'open' AND (expires_at IS NULL OR expires_at > now()))
    OR requester_id = (SELECT auth.uid())
    OR accepted_helper_id = (SELECT auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "requests_insert_own" ON public.requests;
CREATE POLICY "requests_insert_own"
  ON public.requests FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = requester_id
  );

DROP POLICY IF EXISTS "requests_update_own_or_admin" ON public.requests;
CREATE POLICY "requests_update_own_or_admin"
  ON public.requests FOR UPDATE
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid()) OR public.is_admin()
  )
  WITH CHECK (
    requester_id = (SELECT auth.uid()) OR public.is_admin()
  );

DROP POLICY IF EXISTS "requests_delete_own_or_admin" ON public.requests;
CREATE POLICY "requests_delete_own_or_admin"
  ON public.requests FOR DELETE
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid()) OR public.is_admin()
  );

-- TABLE: OFFERS
DROP POLICY IF EXISTS "offers_select_participant_or_admin" ON public.offers;
CREATE POLICY "offers_select_participant_or_admin"
  ON public.offers FOR SELECT
  TO authenticated
  USING (
    helper_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "offers_insert_verified_helper_only" ON public.offers;
CREATE POLICY "offers_insert_verified_helper_only"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = helper_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.verification_status = 'verified'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "offers_update_participants" ON public.offers;
CREATE POLICY "offers_update_participants"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (
    helper_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  )
  WITH CHECK (
    helper_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "offers_delete_own_or_admin" ON public.offers;
CREATE POLICY "offers_delete_own_or_admin"
  ON public.offers FOR DELETE
  TO authenticated
  USING (
    helper_id = (SELECT auth.uid()) OR public.is_admin()
  );

-- TABLE: NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- TABLE: RATINGS
DROP POLICY IF EXISTS "ratings_insert_participant_only" ON public.ratings;
CREATE POLICY "ratings_insert_participant_only"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = rater_id
    AND rater_id != ratee_id
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
        AND r.status = 'completed'
        AND (
          (r.requester_id = (SELECT auth.uid()) AND r.accepted_helper_id = ratee_id)
          OR (r.accepted_helper_id = (SELECT auth.uid()) AND r.requester_id = ratee_id)
        )
    )
  );

DROP POLICY IF EXISTS "ratings_update_own_or_admin" ON public.ratings;
CREATE POLICY "ratings_update_own_or_admin"
  ON public.ratings FOR UPDATE
  TO authenticated
  USING (
    rater_id = (SELECT auth.uid()) OR public.is_admin()
  )
  WITH CHECK (
    rater_id = (SELECT auth.uid()) OR public.is_admin()
  );

-- TABLE: REPORTS
DROP POLICY IF EXISTS "reports_select_reporter_or_admin" ON public.reports;
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_reporter_or_admin"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = (SELECT auth.uid()) OR public.is_admin()
  );

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "reports_update_admin_only" ON public.reports;
CREATE POLICY "reports_update_admin_only"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- TABLE: SOS_EVENTS
DROP POLICY IF EXISTS "sos_select_own_or_admin" ON public.sos_events;
CREATE POLICY "sos_select_own_or_admin"
  ON public.sos_events FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR public.is_admin()
  );

DROP POLICY IF EXISTS "sos_insert_own" ON public.sos_events;
CREATE POLICY "sos_insert_own"
  ON public.sos_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- CONDITIONAL POLICY OPTIMIZATION FOR EXTENSION TABLES (IF PRESENT)
DO $$
BEGIN
  -- SAVED_PLACES
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_places') THEN
    DROP POLICY IF EXISTS "saved_places_select_own" ON public.saved_places;
    CREATE POLICY "saved_places_select_own" ON public.saved_places FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "saved_places_insert_own" ON public.saved_places;
    CREATE POLICY "saved_places_insert_own" ON public.saved_places FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "saved_places_update_own" ON public.saved_places;
    CREATE POLICY "saved_places_update_own" ON public.saved_places FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "saved_places_delete_own" ON public.saved_places;
    CREATE POLICY "saved_places_delete_own" ON public.saved_places FOR DELETE TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;

  -- EMERGENCY_CONTACTS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emergency_contacts') THEN
    DROP POLICY IF EXISTS "emergency_contacts_select_own_or_admin" ON public.emergency_contacts;
    CREATE POLICY "emergency_contacts_select_own_or_admin" ON public.emergency_contacts FOR SELECT TO authenticated
      USING (user_id = (SELECT auth.uid()) OR public.is_admin());

    DROP POLICY IF EXISTS "emergency_contacts_insert_own" ON public.emergency_contacts;
    CREATE POLICY "emergency_contacts_insert_own" ON public.emergency_contacts FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "emergency_contacts_update_own" ON public.emergency_contacts;
    CREATE POLICY "emergency_contacts_update_own" ON public.emergency_contacts FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()) OR public.is_admin())
      WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_admin());

    DROP POLICY IF EXISTS "emergency_contacts_delete_own" ON public.emergency_contacts;
    CREATE POLICY "emergency_contacts_delete_own" ON public.emergency_contacts FOR DELETE TO authenticated
      USING (user_id = (SELECT auth.uid()) OR public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. DATABASE CLEANUP FUNCTION: public.cleanup_stale_data()
--    Purges read notifications > 90d, expired SOS tokens, and map cache > 30d
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
SET statement_timeout = '5s'
AS $$
DECLARE
  v_notifs_deleted integer := 0;
  v_sos_deleted integer := 0;
  v_cache_deleted integer := 0;
BEGIN
  -- 1. Delete read notifications older than 90 days (retaining unread notifications)
  DELETE FROM public.notifications
  WHERE is_read = true
    AND created_at < (now() - interval '90 days');
  GET DIAGNOSTICS v_notifs_deleted = ROW_COUNT;

  -- 2. Purge expired SOS events and tokens
  DELETE FROM public.sos_events
  WHERE expires_at < now()
     OR (status = 'resolved' AND (resolved_at < now() - interval '24 hours' OR expires_at < now()));
  GET DIAGNOSTICS v_sos_deleted = ROW_COUNT;

  -- 3. Purge map cache entries older than 30 days or already expired
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'map_cache') THEN
    DELETE FROM public.map_cache
    WHERE created_at < (now() - interval '30 days')
       OR expires_at < now();
    GET DIAGNOSTICS v_cache_deleted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'deleted_notifications', v_notifs_deleted,
    'deleted_sos_events', v_sos_deleted,
    'deleted_map_cache', v_cache_deleted,
    'executed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_data() TO service_role, authenticated;

-- ------------------------------------------------------------------------------
-- 7. ENFORCE STATEMENT TIMEOUTS (5s limit) ON ALL PUBLIC RPC FUNCTIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- nearby_requests overloads
  BEGIN
    ALTER FUNCTION public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER FUNCTION public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer, uuid) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER FUNCTION public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER FUNCTION public.nearby_requests(double precision, double precision, double precision, text, integer, integer) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;

  -- get_nearby_requests overloads
  BEGIN
    ALTER FUNCTION public.get_nearby_requests(double precision, double precision, double precision, text, text, integer, integer) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER FUNCTION public.get_nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;

  -- public_stats & live_stats
  BEGIN
    ALTER FUNCTION public.public_stats() SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER FUNCTION public.live_stats() SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER FUNCTION public.live_stats(double precision, double precision, double precision) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;

  -- get_hourly_activity_24h
  BEGIN
    ALTER FUNCTION public.get_hourly_activity_24h() SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;

  -- can_offer_help & get_my_active_requests
  BEGIN
    ALTER FUNCTION public.can_offer_help(uuid, uuid) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER FUNCTION public.get_my_active_requests(uuid) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;

  -- get_contact
  BEGIN
    ALTER FUNCTION public.get_contact(uuid) SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;

  -- cleanup_expired_map_cache
  BEGIN
    ALTER FUNCTION public.cleanup_expired_map_cache() SET statement_timeout = '5s';
  EXCEPTION WHEN others THEN NULL; END;
END $$;
