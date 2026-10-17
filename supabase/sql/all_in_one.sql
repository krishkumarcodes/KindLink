-- ============================================================================
-- KindLink - Master Database Schema Setup (All-in-One Migration)
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Target: PostgreSQL 15+ with PostGIS on Supabase (Cloud Free Tier)
-- Safety: Completely idempotent. Safe to run multiple times without errors.
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/pwfvaajngfmnmsfmqgyx/sql)
-- 2. Paste this entire file and click 'Run'.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/01_extensions.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 01: PostgreSQL Extensions
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Enable cryptographic functions, UUID generation, and PostGIS geometry.
-- Safety: Completely idempotent (safe to run multiple times).
-- ============================================================================

-- 1. UUID generation extension (used for unique identifiers)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Cryptographic functions (used for hashing and token generation)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. PostGIS extension (used for geospatial geography points, distance calculations, and radar queries)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- End of 01_extensions.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/02_types.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 02: Enumerated Types & Statuses
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Create fixed enum types for user roles, statuses, and urgency levels.
-- Safety: Completely idempotent (safe to re-run multiple times).
-- ============================================================================

-- 1. User Roles (standard volunteer user vs community platform admin)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Verification Status for Volunteer Identity Trust
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Aid Task Categories
DO $$ BEGIN
  CREATE TYPE help_category AS ENUM (
    'blood',
    'equipment',
    'elderly_help',
    'books',
    'transport'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Urgency Priority Levels
DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Help Request Lifecycle Status
DO $$ BEGIN
  CREATE TYPE request_status AS ENUM (
    'open',
    'offered',
    'accepted',
    'on_the_way',
    'arrived',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. Volunteer Offer Status
DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. Community Report Moderation Status
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- End of 02_types.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/03_tables.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 03: Core Tables Schema
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Create normalized tables with constraints, default timestamps,
--          and foreign keys for profiles, requests, offers, and safety logs.
-- Safety: Completely idempotent (CREATE TABLE IF NOT EXISTS).
-- ============================================================================

-- 1. PROFILES TABLE (linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  email text,
  display_name text,
  phone text,
  preferred_language text DEFAULT 'en',
  role user_role DEFAULT 'user' NOT NULL,
  verification_status verification_status DEFAULT 'unverified' NOT NULL,
  home_location geography(Point, 4326),
  rating_average numeric(3, 2) DEFAULT 5.0 NOT NULL,
  rating_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT username_length_check CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format_check CHECK (username ~* '^[a-z][a-z0-9_.]*$')
);

-- Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

-- 2. VERIFICATION REQUESTS TABLE (Private ID verification submissions)
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  id_document_path text NOT NULL,
  status verification_status DEFAULT 'pending' NOT NULL,
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz
);

-- 3. HELP REQUESTS TABLE (Community emergencies and urgent tasks)
CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category help_category NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  urgency urgency_level DEFAULT 'medium' NOT NULL,
  status request_status DEFAULT 'open' NOT NULL,
  location geography(Point, 4326) NOT NULL,
  address_text text NOT NULL,
  accepted_helper_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  accepted_at timestamptz,
  completed_at timestamptz,

  CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- 4. OFFERS TABLE (Volunteer responses to open requests)
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text,
  status offer_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Unique offer per helper per request (cannot submit duplicate offers)
  CONSTRAINT unique_offer_per_helper UNIQUE (request_id, helper_id)
);

-- 5. NOTIFICATIONS TABLE (Real-time in-app alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 6. RATINGS TABLE (Post-task mutual trust reviews)
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  rating_score numeric,
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL,

  -- One rating per rater per request
  CONSTRAINT unique_rating_per_request_rater UNIQUE (request_id, rater_id)
);

-- 7. REPORTS TABLE (Community moderation and anti-exploitation reporting)
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status report_status DEFAULT 'pending' NOT NULL,
  admin_note text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 8. SOS EVENTS TABLE (Safety emergency triggers & Emergency SOS)
CREATE TABLE IF NOT EXISTS public.sos_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  location geography(Point, 4326),
  address_text text,
  status text DEFAULT 'active' NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '2 hours') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz
);

-- Backward compatibility in case sos_events was previously created without token
ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS token uuid DEFAULT gen_random_uuid();
ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS address_text text;
ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '2 hours');
ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE public.sos_events ALTER COLUMN user_id DROP NOT NULL;
UPDATE public.sos_events SET token = gen_random_uuid() WHERE token IS NULL;
DO $$ BEGIN
  ALTER TABLE public.sos_events ADD CONSTRAINT sos_events_token_key UNIQUE (token);
EXCEPTION WHEN others THEN null;
END $$;

-- End of 03_tables.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/04_indexes.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 04: Spatial & Performance Indexes
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Create GiST spatial indexes for PostGIS geography calculations
--          and B-Tree indexes for fast feed filtering, foreign keys, and sorting.
-- Safety: Completely idempotent (CREATE INDEX IF NOT EXISTS).
-- ============================================================================

-- 1. SPATIAL GIST INDEXES (Essential for fast Haversine/ST_DWithin radar lookups)
CREATE INDEX IF NOT EXISTS requests_location_gist_idx ON public.requests USING GIST (location);
CREATE INDEX IF NOT EXISTS profiles_home_location_gist_idx ON public.profiles USING GIST (home_location);
CREATE INDEX IF NOT EXISTS sos_events_location_gist_idx ON public.sos_events USING GIST (location);

-- 2. REQUESTS FILTERING & SORTING INDEXES
CREATE INDEX IF NOT EXISTS requests_status_created_at_idx ON public.requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_requester_id_idx ON public.requests (requester_id);
CREATE INDEX IF NOT EXISTS requests_accepted_helper_id_idx ON public.requests (accepted_helper_id);
CREATE INDEX IF NOT EXISTS requests_category_idx ON public.requests (category);
CREATE INDEX IF NOT EXISTS requests_urgency_idx ON public.requests (urgency);
CREATE INDEX IF NOT EXISTS requests_expires_at_idx ON public.requests (expires_at);

-- 3. OFFERS INDEXES
CREATE INDEX IF NOT EXISTS offers_request_id_idx ON public.offers (request_id);
CREATE INDEX IF NOT EXISTS offers_helper_id_idx ON public.offers (helper_id);
CREATE INDEX IF NOT EXISTS offers_status_idx ON public.offers (status);

-- 4. NOTIFICATIONS INDEXES
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id, is_read, created_at DESC);

-- 5. RATINGS INDEXES
CREATE INDEX IF NOT EXISTS ratings_ratee_id_idx ON public.ratings (ratee_id);
CREATE INDEX IF NOT EXISTS ratings_request_id_idx ON public.ratings (request_id);

-- 6. VERIFICATION REQUESTS & REPORTS INDEXES (Admin lookups)
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON public.verification_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS verification_requests_user_id_idx ON public.verification_requests (user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);

-- End of 04_indexes.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/05_functions.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 05: Core Stored Procedures & Ranking Engines
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Implement the Urgency and Distance ranking algorithm in SQL, safe contact
--          disclosure, public statistics, and offer/request workflow operations.
-- Safety: Completely idempotent (CREATE OR REPLACE FUNCTION).
-- ============================================================================

-- 1. HELPER: Urgency Ranking strictly adheres to Urgency > Distance > Waiting Time.
-- Legacy scoring and weights are completely deprecated.

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


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/06_triggers.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 06: Event Triggers & Notification Handlers
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Automatic profile creation on sign-up, rating calculation,
--          and automated push notifications for request matches and responses.
-- Safety: Completely idempotent (DROP TRIGGER IF EXISTS before CREATE TRIGGER).
-- ============================================================================

-- 1. TRIGGER: Auto-create Profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_username text;
  v_sanitized_username text;
  v_display_name text;
  v_collision_count integer;
BEGIN
  -- Extract username from sign-up metadata
  v_raw_username := NEW.raw_user_meta_data->>'username';
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  -- Fallback if username wasn't provided in metadata
  IF v_raw_username IS NULL OR char_length(trim(v_raw_username)) < 3 THEN
    v_sanitized_username := 'user_' || substr(NEW.id::text, 1, 8);
  ELSE
    v_sanitized_username := lower(trim(v_raw_username));
  END IF;

  -- Deduplicate username if another user already holds it
  SELECT COUNT(*) INTO v_collision_count
  FROM public.profiles
  WHERE username = v_sanitized_username AND id <> NEW.id;

  IF v_collision_count > 0 THEN
    v_sanitized_username := v_sanitized_username || '_' || substr(NEW.id::text, 1, 4);
  END IF;

  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      email,
      phone,
      role,
      verification_status
    )
    VALUES (
      NEW.id,
      v_sanitized_username,
      COALESCE(v_display_name, v_sanitized_username),
      NEW.email,
      NEW.phone,
      'user',
      'unverified'
    )
    ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        email = COALESCE(EXCLUDED.email, profiles.email);
  EXCEPTION
    WHEN others THEN
      -- Safety guarantee: Never block GoTrue user registration
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. TRIGGER: Recalculate Average Rating on public.profiles
CREATE OR REPLACE FUNCTION public.handle_rating_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user uuid;
  v_avg numeric(3, 2);
  v_count integer;
BEGIN
  v_target_user := COALESCE(NEW.ratee_id, OLD.ratee_id);

  SELECT
    COALESCE(ROUND(AVG(stars)::numeric, 2), 5.0),
    COUNT(*)::integer
  INTO v_avg, v_count
  FROM public.ratings
  WHERE ratee_id = v_target_user;

  UPDATE public.profiles
  SET rating_average = v_avg,
      rating_count = v_count,
      updated_at = now()
  WHERE id = v_target_user;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_change ON public.ratings;
CREATE TRIGGER on_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rating_update();

-- 3. TRIGGER: Notification on New Urgent Request (alerts verified helpers within 10 km)
CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Find verified helpers with a set home_location within 10 km
  INSERT INTO public.notifications (user_id, type, title, body, request_id)
  SELECT
    p.id,
    'new_nearby_request',
    '🚨 New Urgent Need: ' || NEW.title,
    'Urgent aid requested at ' || COALESCE(NEW.address_text, '') || ' (' || NEW.category || '). Help is just next door.',
    NEW.id
  FROM public.profiles p
  WHERE p.id != NEW.requester_id
    AND p.verification_status = 'verified'
    AND p.home_location IS NOT NULL
    AND NEW.location IS NOT NULL
    AND ST_DWithin(
      p.home_location::geography,
      NEW.location::geography,
      10000.0
    );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Fallback safety: do not block request creation if notification dispatch fails
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_request_created ON public.requests;
CREATE TRIGGER on_new_request_created
  AFTER INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_request_notification();

-- 4. TRIGGER: Notification when a volunteer offers help
CREATE OR REPLACE FUNCTION public.handle_new_offer_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
  v_helper_name text;
BEGIN
  SELECT * INTO v_req FROM public.requests WHERE id = NEW.request_id;
  SELECT COALESCE(display_name, username) INTO v_helper_name FROM public.profiles WHERE id = NEW.helper_id;

  INSERT INTO public.notifications (user_id, type, title, body, request_id)
  VALUES (
    v_req.requester_id,
    'offer_received',
    '🤝 New Helper Stepped Up!',
    v_helper_name || ' offered to assist with: ' || v_req.title,
    NEW.request_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_offer_created ON public.offers;
CREATE TRIGGER on_offer_created
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_offer_notification();

-- 5. TRIGGER: Notification when an offer is accepted
CREATE OR REPLACE FUNCTION public.handle_offer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    SELECT * INTO v_req FROM public.requests WHERE id = NEW.request_id;

    INSERT INTO public.notifications (user_id, type, title, body, request_id)
    VALUES (
      NEW.helper_id,
      'offer_accepted',
      '✅ Offer Accepted!',
      'Your offer was accepted for: ' || v_req.title || '. Tap to coordinate contact details.',
      NEW.request_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_offer_status_change ON public.offers;
CREATE TRIGGER on_offer_status_change
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_offer_status_change();

-- 6. TRIGGER: Notification when request is marked completed
CREATE OR REPLACE FUNCTION public.handle_request_completed_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Notify Requester to rate helper
    IF NEW.accepted_helper_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id)
      VALUES (
        NEW.requester_id,
        'request_completed',
        '🌟 Aid Completed! Please rate your helper',
        'Thank you for using KindLink. Please leave a rating for your volunteer.',
        NEW.id
      );

      -- Notify Helper
      INSERT INTO public.notifications (user_id, type, title, body, request_id)
      VALUES (
        NEW.accepted_helper_id,
        'request_completed',
        '🌟 Act of Kindness Recorded!',
        'Your help on ' || NEW.title || ' was marked as completed. Thank you for your service!',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_request_completed ON public.requests;
CREATE TRIGGER on_request_completed
  AFTER UPDATE OF status ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_request_completed_notification();

-- End of 06_triggers.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/07_rls_policies.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 07: Row Level Security (RLS) Policies
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Enforce strict data isolation, protect sensitive personal data
--          (phone, email, ID docs), restrict offers to verified helpers,
--          and grant administrative auditing capabilities.
-- Safety: Completely idempotent (DROP POLICY IF EXISTS before CREATE POLICY).
-- ============================================================================

-- 0. HELPER FUNCTION: Check if the current executing user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: PROFILES
-- Business Rules:
-- - A user can read and edit only their own profile row.
-- - Other users' sensitive data (phone, home_location) remains hidden.
-- - Admins can view all profile rows for moderation.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );

-- SAFE PUBLIC PROFILES VIEW
-- Safe view displaying only public badges, username, and rating without sensitive phone
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT
    id,
    username,
    display_name,
    role,
    verification_status,
    rating_average,
    rating_count,
    created_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ============================================================================
-- TABLE: VERIFICATION_REQUESTS
-- Business Rules:
-- - Users can submit their own verification and view their own status.
-- - Sensitive ID document paths are never visible to other users.
-- - Only Admins can view all verification requests and update review status.
-- ============================================================================

DROP POLICY IF EXISTS "verification_select_own_or_admin" ON public.verification_requests;
CREATE POLICY "verification_select_own_or_admin"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "verification_insert_own" ON public.verification_requests;
CREATE POLICY "verification_insert_own"
  ON public.verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
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

-- ============================================================================
-- TABLE: REQUESTS
-- Business Rules:
-- - Any authenticated user can create a help request (emergencies don't wait).
-- - Expired requests are hidden from normal search; only visible to requester.
-- - Requesters can update and cancel their own requests.
-- ============================================================================

DROP POLICY IF EXISTS "requests_select_active_or_participant" ON public.requests;
CREATE POLICY "requests_select_active_or_participant"
  ON public.requests FOR SELECT
  TO authenticated
  USING (
    (status = 'open' AND (expires_at IS NULL OR expires_at > now()))
    OR requester_id = auth.uid()
    OR accepted_helper_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "requests_insert_own" ON public.requests;
CREATE POLICY "requests_insert_own"
  ON public.requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
  );

DROP POLICY IF EXISTS "requests_update_own_or_admin" ON public.requests;
CREATE POLICY "requests_update_own_or_admin"
  ON public.requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = requester_id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = requester_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "requests_delete_own_or_admin" ON public.requests;
CREATE POLICY "requests_delete_own_or_admin"
  ON public.requests FOR DELETE
  TO authenticated
  USING (
    auth.uid() = requester_id OR public.is_admin()
  );

-- ============================================================================
-- TABLE: OFFERS
-- Business Rules:
-- - Only VERIFIED users can offer help.
-- - Users cannot offer on their own request.
-- - Only the helper and the requester (or admin) can view the offer.
-- - Only the requester can accept an offer (also guarded via accept_offer RPC).
-- ============================================================================

DROP POLICY IF EXISTS "offers_select_participant_or_admin" ON public.offers;
CREATE POLICY "offers_select_participant_or_admin"
  ON public.offers FOR SELECT
  TO authenticated
  USING (
    helper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "offers_insert_verified_helper_only" ON public.offers;
CREATE POLICY "offers_insert_verified_helper_only"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = helper_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.verification_status = 'verified'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "offers_update_participants" ON public.offers;
CREATE POLICY "offers_update_participants"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (
    helper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    helper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "offers_delete_own_or_admin" ON public.offers;
CREATE POLICY "offers_delete_own_or_admin"
  ON public.offers FOR DELETE
  TO authenticated
  USING (
    helper_id = auth.uid() OR public.is_admin()
  );

-- ============================================================================
-- TABLE: NOTIFICATIONS
-- Business Rules:
-- - Users can view and mark as read only their own notifications.
-- ============================================================================

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- TABLE: RATINGS
-- Business Rules:
-- - Anyone authenticated can view ratings and comments.
-- - Only participants of a completed request can rate the other person.
-- - Self-rating is strictly prohibited.
-- ============================================================================

DROP POLICY IF EXISTS "ratings_select_all" ON public.ratings;
CREATE POLICY "ratings_select_all"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ratings_insert_participant_only" ON public.ratings;
CREATE POLICY "ratings_insert_participant_only"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = rater_id
    AND rater_id != ratee_id
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
        AND r.status = 'completed'
        AND (
          (r.requester_id = auth.uid() AND r.accepted_helper_id = ratee_id)
          OR (r.accepted_helper_id = auth.uid() AND r.requester_id = ratee_id)
        )
    )
  );

DROP POLICY IF EXISTS "ratings_update_own_or_admin" ON public.ratings;
CREATE POLICY "ratings_update_own_or_admin"
  ON public.ratings FOR UPDATE
  TO authenticated
  USING (
    rater_id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    rater_id = auth.uid() OR public.is_admin()
  );

-- ============================================================================
-- TABLE: REPORTS
-- Business Rules:
-- - Any authenticated user can submit a community safety report.
-- - Only the reporter and admins can view reports.
-- - Only admins can update the report resolution status.
-- ============================================================================

DROP POLICY IF EXISTS "reports_select_reporter_or_admin" ON public.reports;
CREATE POLICY "reports_select_reporter_or_admin"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
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

-- ============================================================================
-- TABLE: SOS_EVENTS
-- Business Rules:
-- - Users can log their own SOS distress triggers.
-- - Users and admins can view their own SOS events.
-- ============================================================================

DROP POLICY IF EXISTS "sos_select_own_or_admin" ON public.sos_events;
CREATE POLICY "sos_select_own_or_admin"
  ON public.sos_events FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "sos_insert_own" ON public.sos_events;
CREATE POLICY "sos_insert_own"
  ON public.sos_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================================
-- STANDARD ROLE PERMISSIONS
-- ============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- End of 07_rls_policies.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/08_storage.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 08: Supabase Storage Configuration & Policies
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Create private 'verification-docs' bucket for government IDs,
--          enforcing 5MB file limits and strictly scoped user folders.
-- Safety: Completely idempotent (INSERT ON CONFLICT DO NOTHING, DROP POLICY IF EXISTS).
-- ============================================================================

-- 1. Create the private 'verification-docs' bucket if it does not already exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'verification-docs',
      'verification-docs',
      false,
      5242880, -- 5 MB in bytes
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  END IF;
END $$;

-- 2. Storage Policies on storage.objects
-- Note: User upload path is strictly {user_id}/{filename}

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN

    -- A. Users can view their own documents; Admins can view all documents
    DROP POLICY IF EXISTS "verification_docs_select" ON storage.objects;
    CREATE POLICY "verification_docs_select"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'verification-docs'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.is_admin()
        )
      );

    -- B. Users can upload only into their own folder
    DROP POLICY IF EXISTS "verification_docs_insert" ON storage.objects;
    CREATE POLICY "verification_docs_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- C. Users can update their own documents in their folder
    DROP POLICY IF EXISTS "verification_docs_update" ON storage.objects;
    CREATE POLICY "verification_docs_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- D. Users can delete their own documents; Admins can delete any document
    DROP POLICY IF EXISTS "verification_docs_delete" ON storage.objects;
    CREATE POLICY "verification_docs_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'verification-docs'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.is_admin()
        )
      );

  END IF;
END $$;

-- End of 08_storage.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/09_realtime.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 09: Realtime Subscriptions Configuration
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Enable PostgreSQL CDC (Change Data Capture) via Supabase Realtime
--          for live updates on requests, offers, and user notifications.
-- Safety: Completely idempotent (checked via system catalog).
-- ============================================================================

-- 1. Ensure REPLICA IDENTITY is set to FULL so that update/delete payloads
-- contain full previous record attributes
ALTER TABLE public.requests REPLICA IDENTITY FULL;
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Check and add requests
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
    END IF;

    -- Check and add offers
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
    END IF;

    -- Check and add notifications
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- End of 09_realtime.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/10_make_me_admin.sql
-- ----------------------------------------------------------------------------

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

-- End of 10_make_me_admin.sql


-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/13_map_cache_and_usage.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 13: Map Cache & Provider Daily Usage Tracking
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: High-performance caching for geocoding, reverse geocoding, routing,
--          and places queries to reduce latency and conserve API quotas/credits.
--          Atomic daily usage counters per provider for quota management.
--          Strict Row Level Security (service_role only).
-- Safety: Completely idempotent (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE,
--         DROP POLICY IF EXISTS).
-- ============================================================================

-- 1. MAP CACHE TABLE
-- Caches serialized results of map queries with TTL expiration
CREATE TABLE IF NOT EXISTS public.map_cache (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  category text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT map_cache_category_check CHECK (char_length(category) > 0)
);

-- Indexes for lightning-fast lookups, category filtering, and expiration sweeps
CREATE INDEX IF NOT EXISTS map_cache_expires_at_idx ON public.map_cache (expires_at);
CREATE INDEX IF NOT EXISTS map_cache_category_idx ON public.map_cache (category);
CREATE INDEX IF NOT EXISTS map_cache_lookup_idx ON public.map_cache (key, expires_at);

-- 2. MAP DAILY USAGE TRACKING TABLE
-- Aggregates request counts and credit consumption per provider per calendar day
CREATE TABLE IF NOT EXISTS public.map_daily_usage (
  provider text NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  request_count integer DEFAULT 0 NOT NULL,
  credit_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  PRIMARY KEY (provider, usage_date),
  CONSTRAINT request_count_non_negative CHECK (request_count >= 0),
  CONSTRAINT credit_count_non_negative CHECK (credit_count >= 0)
);

-- Index on usage_date for date-range analytics and daily quota reporting
CREATE INDEX IF NOT EXISTS map_daily_usage_date_idx ON public.map_daily_usage (usage_date);

-- 3. ATOMIC MAP USAGE INCREMENT FUNCTION
-- Upserts and atomically adds request_count and credit_count for provider and date
DROP FUNCTION IF EXISTS public.increment_map_usage(text, date, integer, integer);

CREATE OR REPLACE FUNCTION public.increment_map_usage(
  p_provider text,
  p_date date DEFAULT CURRENT_DATE,
  p_count integer DEFAULT 1,
  p_credits integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text := lower(trim(p_provider));
  v_date date := COALESCE(p_date, CURRENT_DATE);
  v_count integer := COALESCE(p_count, 1);
  v_credits integer := COALESCE(p_credits, 0);
BEGIN
  IF v_provider IS NULL OR v_provider = '' THEN
    RAISE EXCEPTION 'Map provider name must be a non-empty string';
  END IF;

  INSERT INTO public.map_daily_usage (
    provider,
    usage_date,
    request_count,
    credit_count,
    updated_at
  )
  VALUES (
    v_provider,
    v_date,
    GREATEST(0, v_count),
    GREATEST(0, v_credits),
    now()
  )
  ON CONFLICT (provider, usage_date)
  DO UPDATE SET
    request_count = public.map_daily_usage.request_count + EXCLUDED.request_count,
    credit_count = public.map_daily_usage.credit_count + EXCLUDED.credit_count,
    updated_at = now();
END;
$$;

-- 4. CLEANUP EXPIRED MAP CACHE FUNCTION
-- Purges stale records whose expiration timestamp has elapsed
DROP FUNCTION IF EXISTS public.cleanup_expired_map_cache();

CREATE OR REPLACE FUNCTION public.cleanup_expired_map_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.map_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS to protect internal cache entries and usage accounting
ALTER TABLE public.map_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_daily_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to guarantee idempotency
DROP POLICY IF EXISTS "map_cache_service_role_all" ON public.map_cache;
DROP POLICY IF EXISTS "map_cache_service_role_only" ON public.map_cache;
DROP POLICY IF EXISTS "map_daily_usage_service_role_all" ON public.map_daily_usage;
DROP POLICY IF EXISTS "map_daily_usage_service_role_only" ON public.map_daily_usage;

-- Explicit policy granting full access to service_role ONLY
CREATE POLICY "map_cache_service_role_only"
  ON public.map_cache
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "map_daily_usage_service_role_only"
  ON public.map_daily_usage
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. STRICT PERMISSION RESTRICTIONS
-- Revoke all table access from public, anon, and authenticated roles
REVOKE ALL ON TABLE public.map_cache FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.map_daily_usage FROM PUBLIC, anon, authenticated;

-- Grant all permissions strictly to service_role
GRANT ALL ON TABLE public.map_cache TO service_role;
GRANT ALL ON TABLE public.map_daily_usage TO service_role;

-- Restrict function execution permissions to service_role
REVOKE EXECUTE ON FUNCTION public.increment_map_usage(text, date, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_map_usage(text, date, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_map_cache() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_map_cache() TO service_role;

-- End of 13_map_cache_and_usage.sql



-- ----------------------------------------------------------------------------
-- SOURCE: supabase/sql/14_profile_overhaul.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- KindLink - Database Migration 14: Profile Overhaul & Community Trust Engine
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Complete profile overhaul supporting granular privacy controls,
--          custom badges & gamified levels, emergency contacts, professional
--          credential proofs, account deletion audit, and single-source-of-truth
--          stats and member profile view functions.
-- Safety: Completely idempotent (IF NOT EXISTS, CREATE OR REPLACE, DROP IF EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND PUBLIC.PROFILES COLUMNS
-- ----------------------------------------------------------------------------

-- Bio with length validation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS bio_length_check;
  ALTER TABLE public.profiles ADD CONSTRAINT bio_length_check CHECK (bio IS NULL OR char_length(bio) <= 500);
EXCEPTION WHEN others THEN null;
END $$;

-- Organisation (migrated / renamed from legacy college if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'college'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN college TO organisation;
  ELSE
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organisation text;
  END IF;
END $$;

-- Area and phone segmentation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+91';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_national text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 text;

-- Languages supported
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '["en", "hi", "bn"]'::jsonb;

-- Granular visibility controls
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS visibility_phone text DEFAULT 'members';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS visibility_email text DEFAULT 'members';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS visibility_organisation text DEFAULT 'members';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS visibility_area text DEFAULT 'members';

DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS visibility_phone_check;
  ALTER TABLE public.profiles ADD CONSTRAINT visibility_phone_check CHECK (visibility_phone IN ('members', 'matched', 'private'));
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS visibility_email_check;
  ALTER TABLE public.profiles ADD CONSTRAINT visibility_email_check CHECK (visibility_email IN ('members', 'matched', 'private'));
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS visibility_organisation_check;
  ALTER TABLE public.profiles ADD CONSTRAINT visibility_organisation_check CHECK (visibility_organisation IN ('members', 'matched', 'private'));
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS visibility_area_check;
  ALTER TABLE public.profiles ADD CONSTRAINT visibility_area_check CHECK (visibility_area IN ('members', 'matched', 'private'));
EXCEPTION WHEN others THEN null;
END $$;

-- Notification preferences & metadata
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"emergency_alerts": true, "sos_alerts": true, "nearby_requests": true, "nearby_radius_km": 5, "sound_enabled": true, "quiet_hours_enabled": false, "quiet_hours_start": "22:00", "quiet_hours_end": "07:00"}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pinned_badges text[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Travel distance tracking on requests for volunteer distance covered stats
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS travel_distance_km numeric(8, 2) DEFAULT 0.0;

-- Backfill phone_e164 from existing phone column if null
UPDATE public.profiles
SET phone_e164 = COALESCE(phone_e164, phone)
WHERE phone_e164 IS NULL AND phone IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 2. EMERGENCY CONTACTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  custom_relationship text,
  phone_e164 text NOT NULL,
  phone_country_code text DEFAULT '+91',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS emergency_contacts_user_id_idx ON public.emergency_contacts (user_id);

-- Enforce Maximum 3 contacts per user
CREATE OR REPLACE FUNCTION public.check_emergency_contacts_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.emergency_contacts
    WHERE user_id = NEW.user_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 3 THEN
    RAISE EXCEPTION 'A user cannot have more than 3 emergency contacts';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_emergency_contacts_limit ON public.emergency_contacts;
CREATE TRIGGER trg_check_emergency_contacts_limit
  BEFORE INSERT OR UPDATE ON public.emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_emergency_contacts_limit();


-- ----------------------------------------------------------------------------
-- 3. BADGE DEFINITIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id text PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  icon_path text NOT NULL,
  is_automatic boolean DEFAULT true NOT NULL,
  levels jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);


-- ----------------------------------------------------------------------------
-- 4. USER BADGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  current_level integer DEFAULT 1 NOT NULL,
  current_count integer DEFAULT 0 NOT NULL,
  earned_at timestamptz DEFAULT now() NOT NULL,
  awarded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  award_reason text,
  is_pinned boolean DEFAULT false NOT NULL,
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges (user_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx ON public.user_badges (badge_id);


-- ----------------------------------------------------------------------------
-- 5. PROFESSIONAL PROOFS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profession_type text NOT NULL,
  reg_number text NOT NULL,
  document_path text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT professional_proofs_profession_check CHECK (profession_type IN ('doctor', 'nurse', 'pharmacist', 'teacher', 'student', 'ngo')),
  CONSTRAINT professional_proofs_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info'))
);

CREATE INDEX IF NOT EXISTS professional_proofs_user_id_idx ON public.professional_proofs (user_id);
CREATE INDEX IF NOT EXISTS professional_proofs_status_idx ON public.professional_proofs (status);


-- ----------------------------------------------------------------------------
-- 6. ACCOUNT DELETION REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'pending' NOT NULL,
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT deletion_requests_status_check CHECK (status IN ('pending', 'approved', 'denied'))
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx ON public.account_deletion_requests (user_id);


-- ----------------------------------------------------------------------------
-- 7. ADMIN AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_id_idx ON public.admin_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON public.admin_audit_logs (created_at DESC);


-- ----------------------------------------------------------------------------
-- 8. SEED STANDARD BADGE DEFINITIONS
-- ----------------------------------------------------------------------------
INSERT INTO public.badge_definitions (id, title, category, description, icon_path, is_automatic, levels)
VALUES
  (
    'community_pillar',
    'Community Pillar',
    'helps',
    'Consistently offering vital assistance and support to neighbours in need',
    '/badges/community_pillar.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":10},{"level":2,"name":"Silver","threshold":25},{"level":3,"name":"Gold","threshold":50},{"level":4,"name":"Platinum","threshold":100}]'::jsonb
  ),
  (
    'life_saver',
    'Life Saver',
    'blood',
    'Stepping up during critical medical emergencies to donate blood and save lives',
    '/badges/life_saver.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":1},{"level":2,"name":"Silver","threshold":3},{"level":3,"name":"Gold","threshold":10},{"level":4,"name":"Platinum","threshold":25}]'::jsonb
  ),
  (
    'first_responder',
    'Emergency First Responder',
    'emergency',
    'Rapid response to critical and urgent distress requests in your community',
    '/badges/first_responder.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":3},{"level":2,"name":"Silver","threshold":10},{"level":3,"name":"Gold","threshold":25},{"level":4,"name":"Platinum","threshold":50}]'::jsonb
  ),
  (
    'quick_responder',
    'Quick Responder',
    'speed',
    'Submitting timely offers to help neighbours before anyone else',
    '/badges/quick_responder.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":5},{"level":2,"name":"Silver","threshold":20},{"level":3,"name":"Gold","threshold":50},{"level":4,"name":"Platinum","threshold":100}]'::jsonb
  ),
  (
    'trusted_neighbour',
    'Trusted Local Neighbour',
    'trust',
    'Maintained exceptional community feedback and 5-star ratings across requests',
    '/badges/trusted_neighbour.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":5},{"level":2,"name":"Silver","threshold":15},{"level":3,"name":"Gold","threshold":30},{"level":4,"name":"Platinum","threshold":60}]'::jsonb
  ),
  (
    'study_mentor',
    'Study and Books Mentor',
    'education',
    'Lending textbooks, study notes, and educational mentorship to students',
    '/badges/study_mentor.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":1},{"level":2,"name":"Silver","threshold":5},{"level":3,"name":"Gold","threshold":15},{"level":4,"name":"Platinum","threshold":30}]'::jsonb
  ),
  (
    'medical_gear_lender',
    'Medical Gear Lender',
    'equipment',
    'Sharing oxygen concentrators, wheelchairs, crutches, and vital equipment',
    '/badges/medical_gear.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":1},{"level":2,"name":"Silver","threshold":5},{"level":3,"name":"Gold","threshold":15},{"level":4,"name":"Platinum","threshold":30}]'::jsonb
  ),
  (
    'elder_friend',
    'Elder Friend',
    'elderly',
    'Providing regular companionship, grocery delivery, and medication pickup to senior citizens',
    '/badges/elder_friend.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":1},{"level":2,"name":"Silver","threshold":5},{"level":3,"name":"Gold","threshold":15},{"level":4,"name":"Platinum","threshold":30}]'::jsonb
  ),
  (
    'safe_ride_hero',
    'Safe Ride Hero',
    'transport',
    'Providing safe emergency transport to clinics, schools, and hospitals',
    '/badges/safe_ride.svg',
    true,
    '[{"level":1,"name":"Bronze","threshold":1},{"level":2,"name":"Silver","threshold":5},{"level":3,"name":"Gold","threshold":15},{"level":4,"name":"Platinum","threshold":30}]'::jsonb
  ),
  (
    'helper_streak',
    'Helper Streak',
    'streak',
    'Active community mutual aid participation over consecutive days',
    '/badges/streak.svg',
    true,
    '[{"level":1,"name":"3 Days","threshold":3},{"level":2,"name":"7 Days","threshold":7},{"level":3,"name":"14 Days","threshold":14},{"level":4,"name":"30 Days","threshold":30}]'::jsonb
  ),
  (
    'first_help',
    'First Help',
    'milestone',
    'Completed your first mutual aid task on KindLink',
    '/badges/first_help.svg',
    true,
    '[{"level":1,"name":"Completed","threshold":1}]'::jsonb
  ),
  (
    'verified_member',
    'Verified Member',
    'verification',
    'Identity verified with government or community credentials',
    '/badges/verified_member.svg',
    false,
    '[{"level":1,"name":"Verified","threshold":1}]'::jsonb
  ),
  (
    'verified_student',
    'Verified Student Member',
    'verification',
    'Enrolled student verified with college/institution ID',
    '/badges/verified_student.svg',
    false,
    '[{"level":1,"name":"Verified","threshold":1}]'::jsonb
  ),
  (
    'verified_doctor',
    'Verified Doctor',
    'verification',
    'Licensed medical doctor verified with registration council',
    '/badges/verified_doctor.svg',
    false,
    '[{"level":1,"name":"Verified","threshold":1}]'::jsonb
  ),
  (
    'verified_nurse',
    'Verified Nurse or Paramedic',
    'verification',
    'Certified nursing or paramedic healthcare provider',
    '/badges/verified_nurse.svg',
    false,
    '[{"level":1,"name":"Verified","threshold":1}]'::jsonb
  ),
  (
    'verified_pharmacist',
    'Verified Pharmacist',
    'verification',
    'Registered pharmacist verified with state pharmacy council',
    '/badges/verified_pharmacist.svg',
    false,
    '[{"level":1,"name":"Verified","threshold":1}]'::jsonb
  ),
  (
    'verified_teacher',
    'Verified Teacher or Mentor',
    'verification',
    'Educator or mentor verified with academic institution',
    '/badges/verified_teacher.svg',
    false,
    '[{"level":1,"name":"Verified","threshold":1}]'::jsonb
  ),
  (
    'verified_organisation',
    'Verified Organisation or NGO',
    'verification',
    'Registered non-profit or community service organisation',
    '/badges/verified_organisation.svg',
    false,
    '[{"level":1,"name":"Verified","threshold":1}]'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  icon_path = EXCLUDED.icon_path,
  is_automatic = EXCLUDED.is_automatic,
  levels = EXCLUDED.levels;


-- ----------------------------------------------------------------------------
-- 9. SINGLE SOURCE OF TRUTH SUMMARY FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_profile_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_helps_given integer := 0;
  v_requests_made integer := 0;
  v_requests_open integer := 0;
  v_hours_volunteered numeric(8, 2) := 0.0;
  v_neighbours_supported integer := 0;
  v_distance_covered_km numeric(8, 2) := 0.0;
  v_trust_score numeric(3, 2) := NULL;
  v_ratings_count integer := 0;
  v_requester_rating numeric(3, 2) := NULL;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
BEGIN
  -- 1. helps_given: COUNT of completed requests where accepted_helper_id = p_user_id
  SELECT COUNT(*) INTO v_helps_given
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 2. requests_made: COUNT of requests where requester_id = p_user_id
  SELECT COUNT(*) INTO v_requests_made
  FROM public.requests
  WHERE requester_id = p_user_id;

  -- 3. requests_open: COUNT of requests where requester_id = p_user_id AND status = 'open'
  SELECT COUNT(*) INTO v_requests_open
  FROM public.requests
  WHERE requester_id = p_user_id AND status = 'open';

  -- 4. hours_volunteered: SUM of LEAST(EXTRACT(EPOCH FROM (completed_at - accepted_at)) / 3600.0, 12.0)
  SELECT COALESCE(ROUND(SUM(
    GREATEST(0.1, LEAST(EXTRACT(EPOCH FROM (completed_at - accepted_at)) / 3600.0, 12.0))
  )::numeric, 1), 0.0) INTO v_hours_volunteered
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed'
    AND completed_at IS NOT NULL AND accepted_at IS NOT NULL;

  -- 5. neighbours_supported: COUNT(DISTINCT requester_id)
  SELECT COUNT(DISTINCT requester_id) INTO v_neighbours_supported
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 6. distance_covered_km: SUM of COALESCE(travel_distance_km, 0)
  SELECT COALESCE(ROUND(SUM(COALESCE(travel_distance_km, 0))::numeric, 2), 0.0) INTO v_distance_covered_km
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 7. trust_score & ratings_count: Requester ratings for this helper
  SELECT
    ROUND(AVG(COALESCE(r.rating_score, r.stars::numeric))::numeric, 2),
    COUNT(*)::integer
  INTO v_trust_score, v_ratings_count
  FROM public.ratings r
  WHERE r.ratee_id = p_user_id;

  -- If no ratings in table, fallback to profile rating_average if present
  IF v_trust_score IS NULL THEN
    SELECT rating_average, rating_count INTO v_trust_score, v_ratings_count
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  -- 8. requester_rating: AVG of helper ratings for this user as requester
  SELECT ROUND(AVG(COALESCE(r.rating_score, r.stars::numeric))::numeric, 2)
  INTO v_requester_rating
  FROM public.ratings r
  JOIN public.requests req ON req.id = r.request_id
  WHERE req.requester_id = p_user_id AND r.ratee_id = p_user_id;

  IF v_requester_rating IS NULL THEN
    v_requester_rating := 5.0;
  END IF;

  -- 9. Streaks: current_streak_days and best_streak_days
  WITH dates AS (
    SELECT DISTINCT (completed_at AT TIME ZONE 'UTC')::date AS d
    FROM public.requests
    WHERE accepted_helper_id = p_user_id AND status = 'completed' AND completed_at IS NOT NULL
  ),
  groups AS (
    SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::integer AS grp
    FROM dates
  ),
  streak_lengths AS (
    SELECT grp, COUNT(*) AS len, MAX(d) AS max_d, MIN(d) AS min_d
    FROM groups
    GROUP BY grp
  )
  SELECT
    COALESCE(MAX(len), 0),
    COALESCE((
      SELECT len FROM streak_lengths
      WHERE max_d >= CURRENT_DATE - 1
      ORDER BY max_d DESC LIMIT 1
    ), 0)
  INTO v_best_streak, v_current_streak
  FROM streak_lengths;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'helps_given', COALESCE(v_helps_given, 0),
    'requests_made', COALESCE(v_requests_made, 0),
    'requests_open', COALESCE(v_requests_open, 0),
    'hours_volunteered', COALESCE(v_hours_volunteered, 0.0),
    'neighbours_supported', COALESCE(v_neighbours_supported, 0),
    'distance_covered_km', COALESCE(v_distance_covered_km, 0.0),
    'trust_score', COALESCE(v_trust_score, 5.0),
    'ratings_count', COALESCE(v_ratings_count, 0),
    'requester_rating', COALESCE(v_requester_rating, 5.0),
    'current_streak_days', COALESCE(v_current_streak, 0),
    'best_streak_days', COALESCE(v_best_streak, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_summary(uuid) TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 10. MEMBER PROFILE VIEW / FUNCTION (With Visibility & Privacy Rules)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_member_profile(p_target_username text, p_viewer_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_is_self boolean := false;
  v_is_admin boolean := false;
  v_is_matched boolean := false;
  v_show_phone boolean := false;
  v_show_email boolean := false;
  v_show_organisation boolean := false;
  v_show_area boolean := false;
  v_badges jsonb := '[]'::jsonb;
  v_summary jsonb;
  v_contacts jsonb := '[]'::jsonb;
BEGIN
  IF p_target_username IS NULL OR trim(p_target_username) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE lower(username) = lower(trim(p_target_username));

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Determine viewer context
  IF p_viewer_id IS NOT NULL THEN
    IF p_viewer_id = v_profile.id THEN
      v_is_self := true;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = p_viewer_id AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_self THEN
      -- Check if matched via accepted/completed request or offer exchange
      SELECT EXISTS (
        SELECT 1 FROM public.requests r
        WHERE (
          (r.requester_id = v_profile.id AND r.accepted_helper_id = p_viewer_id)
          OR
          (r.requester_id = p_viewer_id AND r.accepted_helper_id = v_profile.id)
        )
        AND r.status IN ('accepted', 'completed')
      ) OR EXISTS (
        SELECT 1 FROM public.offers o
        JOIN public.requests r ON r.id = o.request_id
        WHERE (
          (r.requester_id = v_profile.id AND o.helper_id = p_viewer_id)
          OR
          (r.requester_id = p_viewer_id AND o.helper_id = v_profile.id)
        )
        AND (o.status IN ('pending', 'accepted') OR r.status IN ('open', 'accepted', 'completed'))
      ) INTO v_is_matched;
    END IF;
  END IF;

  -- Evaluate field-level visibility
  -- Rule: 'members' requires logged-in viewer; 'matched' requires mutual interaction; 'private' requires self/admin
  v_show_phone := v_is_self OR v_is_admin OR (v_profile.visibility_phone = 'members' AND p_viewer_id IS NOT NULL) OR (v_profile.visibility_phone = 'matched' AND v_is_matched);
  v_show_email := v_is_self OR v_is_admin OR (v_profile.visibility_email = 'members' AND p_viewer_id IS NOT NULL) OR (v_profile.visibility_email = 'matched' AND v_is_matched);
  v_show_organisation := v_is_self OR v_is_admin OR (v_profile.visibility_organisation = 'members' AND p_viewer_id IS NOT NULL) OR (v_profile.visibility_organisation = 'matched' AND v_is_matched);
  v_show_area := v_is_self OR v_is_admin OR (v_profile.visibility_area = 'members' AND p_viewer_id IS NOT NULL) OR (v_profile.visibility_area = 'matched' AND v_is_matched);

  -- Fetch user badges
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'badge_id', ub.badge_id,
    'title', bd.title,
    'category', bd.category,
    'description', bd.description,
    'icon_path', bd.icon_path,
    'current_level', ub.current_level,
    'current_count', ub.current_count,
    'is_pinned', ub.is_pinned,
    'earned_at', ub.earned_at,
    'award_reason', ub.award_reason,
    'levels', bd.levels
  ) ORDER BY ub.is_pinned DESC, ub.earned_at DESC), '[]'::jsonb)
  INTO v_badges
  FROM public.user_badges ub
  JOIN public.badge_definitions bd ON bd.id = ub.badge_id
  WHERE ub.user_id = v_profile.id;

  -- Fetch summary metrics
  v_summary := public.get_profile_summary(v_profile.id);

  -- Emergency contacts are strictly private to user or admin
  IF v_is_self OR v_is_admin THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ec.id,
      'name', ec.name,
      'relationship', ec.relationship,
      'custom_relationship', ec.custom_relationship,
      'phone_e164', ec.phone_e164,
      'phone_country_code', ec.phone_country_code,
      'created_at', ec.created_at
    ) ORDER BY ec.created_at ASC), '[]'::jsonb)
    INTO v_contacts
    FROM public.emergency_contacts ec
    WHERE ec.user_id = v_profile.id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_profile.id,
    'username', v_profile.username,
    'display_name', v_profile.display_name,
    'bio', v_profile.bio,
    'avatar_url', v_profile.avatar_url,
    'role', v_profile.role,
    'verification_status', v_profile.verification_status,
    'rating_average', v_profile.rating_average,
    'rating_count', v_profile.rating_count,
    'languages', v_profile.languages,
    'pinned_badges', v_profile.pinned_badges,
    'last_active_at', v_profile.last_active_at,
    'created_at', v_profile.created_at,
    'phone', CASE WHEN v_show_phone THEN COALESCE(v_profile.phone_e164, v_profile.phone) ELSE NULL END,
    'phone_country_code', CASE WHEN v_show_phone THEN v_profile.phone_country_code ELSE NULL END,
    'phone_national', CASE WHEN v_show_phone THEN v_profile.phone_national ELSE NULL END,
    'phone_e164', CASE WHEN v_show_phone THEN COALESCE(v_profile.phone_e164, v_profile.phone) ELSE NULL END,
    'email', CASE WHEN v_show_email THEN v_profile.email ELSE NULL END,
    'organisation', CASE WHEN v_show_organisation THEN v_profile.organisation ELSE NULL END,
    'area_name', CASE WHEN v_show_area THEN v_profile.area_name ELSE NULL END,
    'visibility_phone', v_profile.visibility_phone,
    'visibility_email', v_profile.visibility_email,
    'visibility_organisation', v_profile.visibility_organisation,
    'visibility_area', v_profile.visibility_area,
    'badges', v_badges,
    'stats', v_summary,
    'emergency_contacts', v_contacts,
    'is_self', v_is_self
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_profile(text, uuid) TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- EMERGENCY CONTACTS
DROP POLICY IF EXISTS "emergency_contacts_select_own_or_admin" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_select_own_or_admin"
  ON public.emergency_contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "emergency_contacts_insert_own" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_insert_own"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "emergency_contacts_update_own" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_update_own"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "emergency_contacts_delete_own" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_delete_own"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- BADGE DEFINITIONS
DROP POLICY IF EXISTS "badge_definitions_select_all" ON public.badge_definitions;
CREATE POLICY "badge_definitions_select_all"
  ON public.badge_definitions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "badge_definitions_admin_write" ON public.badge_definitions;
CREATE POLICY "badge_definitions_admin_write"
  ON public.badge_definitions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- USER BADGES
DROP POLICY IF EXISTS "user_badges_select_all" ON public.user_badges;
CREATE POLICY "user_badges_select_all"
  ON public.user_badges FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "user_badges_insert_admin_or_self" ON public.user_badges;
CREATE POLICY "user_badges_insert_admin_or_self"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "user_badges_update_admin_or_self" ON public.user_badges;
CREATE POLICY "user_badges_update_admin_or_self"
  ON public.user_badges FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "user_badges_delete_admin" ON public.user_badges;
CREATE POLICY "user_badges_delete_admin"
  ON public.user_badges FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- PROFESSIONAL PROOFS
DROP POLICY IF EXISTS "professional_proofs_select_own_or_admin" ON public.professional_proofs;
CREATE POLICY "professional_proofs_select_own_or_admin"
  ON public.professional_proofs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "professional_proofs_insert_own" ON public.professional_proofs;
CREATE POLICY "professional_proofs_insert_own"
  ON public.professional_proofs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "professional_proofs_update_admin" ON public.professional_proofs;
CREATE POLICY "professional_proofs_update_admin"
  ON public.professional_proofs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ACCOUNT DELETION REQUESTS
DROP POLICY IF EXISTS "deletion_requests_select_own_or_admin" ON public.account_deletion_requests;
CREATE POLICY "deletion_requests_select_own_or_admin"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "deletion_requests_insert_own" ON public.account_deletion_requests;
CREATE POLICY "deletion_requests_insert_own"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "deletion_requests_update_admin" ON public.account_deletion_requests;
CREATE POLICY "deletion_requests_update_admin"
  ON public.account_deletion_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ADMIN AUDIT LOGS
DROP POLICY IF EXISTS "admin_audit_logs_admin_only" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_only"
  ON public.admin_audit_logs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 12. ROLE GRANTS
-- ----------------------------------------------------------------------------
GRANT ALL ON TABLE public.emergency_contacts TO authenticated, service_role;
GRANT SELECT ON TABLE public.badge_definitions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.badge_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_badges TO authenticated, service_role;
GRANT SELECT ON TABLE public.user_badges TO anon;
GRANT ALL ON TABLE public.professional_proofs TO authenticated, service_role;
GRANT ALL ON TABLE public.account_deletion_requests TO authenticated, service_role;
GRANT ALL ON TABLE public.admin_audit_logs TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_profile_summary(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_member_profile(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_emergency_contacts_limit() TO authenticated, service_role;

-- End of 14_profile_overhaul.sql

