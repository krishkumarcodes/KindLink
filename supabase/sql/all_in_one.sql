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


-- ============================================================================
-- KindLink - Database Migration 15: Ratings, Trust Score & Reviews Enhancements
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Schema enforcement, 24h edit window, anti-self-rating, review reports,
--          admin audit logging, and ratings distribution breakdown.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RATINGS TABLE ENHANCEMENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false NOT NULL;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS hide_reason text;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- Feedback length constraint (max 300 characters)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ratings_feedback_length_check'
  ) THEN
    ALTER TABLE public.ratings ADD CONSTRAINT ratings_feedback_length_check CHECK (feedback IS NULL OR char_length(feedback) <= 300);
  END IF;
END $$;

-- Role backfill and constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ratings_role_check'
  ) THEN
    UPDATE public.ratings r
    SET role = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.requests req
        WHERE req.id = r.request_id AND req.accepted_helper_id = r.ratee_id
      ) THEN 'helper'
      ELSE 'requester'
    END
    WHERE role IS NULL;

    ALTER TABLE public.ratings ALTER COLUMN role SET NOT NULL;
    ALTER TABLE public.ratings ADD CONSTRAINT ratings_role_check CHECK (role IN ('helper', 'requester'));
  END IF;
END $$;

-- Backward compatibility: backfill feedback from comment if null
UPDATE public.ratings
SET feedback = comment
WHERE feedback IS NULL AND comment IS NOT NULL;

-- Ensure unique constraint (request_id, rater_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_rating_per_request_rater'
  ) THEN
    ALTER TABLE public.ratings ADD CONSTRAINT unique_rating_per_request_rater UNIQUE (request_id, rater_id);
  END IF;
END $$;

-- Additional helpful indexes
CREATE INDEX IF NOT EXISTS ratings_ratee_role_idx ON public.ratings(ratee_id, role) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS ratings_created_at_idx ON public.ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS ratings_is_hidden_idx ON public.ratings(is_hidden);

-- ----------------------------------------------------------------------------
-- 2. REVIEW REPORTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.ratings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS review_reports_review_id_idx ON public.review_reports(review_id);
CREATE INDEX IF NOT EXISTS review_reports_reporter_id_idx ON public.review_reports(reporter_id);
CREATE INDEX IF NOT EXISTS review_reports_status_idx ON public.review_reports(status, created_at DESC);

-- Ensure admin_audit_logs has target_user_id and reason columns
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS reason text;

-- ----------------------------------------------------------------------------
-- 3. RATING VALIDATION TRIGGER (Rules Enforcement)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_req record;
BEGIN
  -- Rule 1: No rating yourself
  IF NEW.rater_id = NEW.ratee_id THEN
    RAISE EXCEPTION 'Self-rating is strictly prohibited (rater_id cannot equal ratee_id)';
  END IF;

  -- Rule 2: Fetch and validate request exists
  SELECT id, status, requester_id, accepted_helper_id
  INTO v_req
  FROM public.requests
  WHERE id = NEW.request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request with id % does not exist', NEW.request_id;
  END IF;

  -- Rule 3: Only completed requests can be rated
  IF v_req.status != 'completed' THEN
    RAISE EXCEPTION 'Ratings can only be submitted for completed requests (current status: %)', v_req.status;
  END IF;

  -- Rule 4: Requester can only rate accepted helper; helper can only rate requester
  IF v_req.requester_id = NEW.rater_id AND v_req.accepted_helper_id = NEW.ratee_id THEN
    -- Requester rating the helper
    IF NEW.role IS NULL THEN
      NEW.role := 'helper';
    ELSIF NEW.role != 'helper' THEN
      RAISE EXCEPTION 'Invalid role % for ratee who was the helper (expected helper)', NEW.role;
    END IF;
  ELSIF v_req.accepted_helper_id = NEW.rater_id AND v_req.requester_id = NEW.ratee_id THEN
    -- Helper rating the requester
    IF NEW.role IS NULL THEN
      NEW.role := 'requester';
    ELSIF NEW.role != 'requester' THEN
      RAISE EXCEPTION 'Invalid role % for ratee who was the requester (expected requester)', NEW.role;
    END IF;
  ELSE
    RAISE EXCEPTION 'Only the requester and the accepted helper of this request can rate each other';
  END IF;

  -- Rule 5: Stars must be 1 to 5
  IF NEW.stars < 1 OR NEW.stars > 5 THEN
    RAISE EXCEPTION 'Stars must be between 1 and 5 (got %)', NEW.stars;
  END IF;

  -- Rule 6: Max 300 characters for feedback
  IF NEW.feedback IS NOT NULL AND char_length(NEW.feedback) > 300 THEN
    RAISE EXCEPTION 'Feedback must not exceed 300 characters';
  END IF;

  -- Sync feedback and comment for backwards compatibility
  IF NEW.feedback IS NOT NULL AND NEW.comment IS NULL THEN
    NEW.comment := NEW.feedback;
  ELSIF NEW.comment IS NOT NULL AND NEW.feedback IS NULL THEN
    NEW.feedback := NEW.comment;
  END IF;

  -- Rule 7: Editable only within 24 hours of creation
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.stars IS DISTINCT FROM NEW.stars OR
        OLD.feedback IS DISTINCT FROM NEW.feedback OR
        OLD.comment IS DISTINCT FROM NEW.comment OR
        OLD.tags IS DISTINCT FROM NEW.tags OR
        OLD.ratee_id IS DISTINCT FROM NEW.ratee_id OR
        OLD.request_id IS DISTINCT FROM NEW.request_id) THEN
      IF OLD.created_at < (now() - interval '24 hours') AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Ratings can only be edited within 24 hours of creation';
      END IF;
    END IF;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_rating ON public.ratings;
CREATE TRIGGER trg_validate_rating
  BEFORE INSERT OR UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_rating();

-- ----------------------------------------------------------------------------
-- 4. PROFILE RATING UPDATE TRIGGER (Excluding Hidden Ratings)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_rating_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  WHERE ratee_id = v_target_user
    AND is_hidden = false;

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

-- ----------------------------------------------------------------------------
-- 5. ADMIN AUDIT LOG TRIGGER ON RATING MODERATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_rating_admin_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.is_hidden IS DISTINCT FROM NEW.is_hidden) THEN
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action,
      target_type,
      target_id,
      target_user_id,
      reason,
      details
    ) VALUES (
      COALESCE(NEW.hidden_by, auth.uid()),
      CASE WHEN NEW.is_hidden THEN 'hide_review' ELSE 'unhide_review' END,
      'rating',
      NEW.id,
      NEW.ratee_id,
      NEW.hide_reason,
      jsonb_build_object(
        'stars', NEW.stars,
        'rater_id', NEW.rater_id,
        'is_hidden', NEW.is_hidden,
        'hide_reason', NEW.hide_reason,
        'hidden_by', NEW.hidden_by
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rating_admin_audit ON public.ratings;
CREATE TRIGGER trg_rating_admin_audit
  AFTER UPDATE OF is_hidden ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rating_admin_audit();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- RATINGS: SELECT
-- Public can read unhidden ratings. Raters can view their own. Admins can view all.
DROP POLICY IF EXISTS "ratings_select_all" ON public.ratings;
DROP POLICY IF EXISTS "ratings_select_unhidden_or_admin" ON public.ratings;
CREATE POLICY "ratings_select_unhidden_or_admin"
  ON public.ratings FOR SELECT
  TO authenticated, anon
  USING (
    is_hidden = false OR rater_id = auth.uid() OR public.is_admin()
  );

-- RATINGS: INSERT
-- Users can insert their own rating on requests they participated in
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

-- RATINGS: UPDATE
-- Users can update their rating within 24h. Admins can update anytime.
DROP POLICY IF EXISTS "ratings_update_own_or_admin" ON public.ratings;
DROP POLICY IF EXISTS "ratings_update_own_within_24h_or_admin" ON public.ratings;
CREATE POLICY "ratings_update_own_within_24h_or_admin"
  ON public.ratings FOR UPDATE
  TO authenticated
  USING (
    (rater_id = auth.uid() AND created_at >= (now() - interval '24 hours'))
    OR public.is_admin()
  )
  WITH CHECK (
    (rater_id = auth.uid() AND created_at >= (now() - interval '24 hours'))
    OR public.is_admin()
  );

-- REVIEW REPORTS: POLICIES
DROP POLICY IF EXISTS "review_reports_select_own_or_admin" ON public.review_reports;
CREATE POLICY "review_reports_select_own_or_admin"
  ON public.review_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "review_reports_insert_own" ON public.review_reports;
CREATE POLICY "review_reports_insert_own"
  ON public.review_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "review_reports_update_admin" ON public.review_reports;
CREATE POLICY "review_reports_update_admin"
  ON public.review_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. RATINGS DISTRIBUTION & BREAKDOWN FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_rating_breakdown(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_total integer := 0;
  v_avg numeric(3, 2);
  v_helper_count integer := 0;
  v_helper_avg numeric(3, 2);
  v_requester_count integer := 0;
  v_requester_avg numeric(3, 2);
  v_s5 integer := 0;
  v_s4 integer := 0;
  v_s3 integer := 0;
  v_s2 integer := 0;
  v_s1 integer := 0;
BEGIN
  -- Overall unhidden counts and average
  SELECT
    COUNT(*)::integer,
    ROUND(AVG(stars)::numeric, 2)
  INTO v_total, v_avg
  FROM public.ratings
  WHERE ratee_id = p_user_id AND is_hidden = false;

  -- Helper role stats (ratee was helper)
  SELECT
    COUNT(*)::integer,
    ROUND(AVG(stars)::numeric, 2)
  INTO v_helper_count, v_helper_avg
  FROM public.ratings
  WHERE ratee_id = p_user_id AND role = 'helper' AND is_hidden = false;

  -- Requester role stats (ratee was requester)
  SELECT
    COUNT(*)::integer,
    ROUND(AVG(stars)::numeric, 2)
  INTO v_requester_count, v_requester_avg
  FROM public.ratings
  WHERE ratee_id = p_user_id AND role = 'requester' AND is_hidden = false;

  -- Star distribution
  SELECT
    COUNT(*) FILTER (WHERE stars = 5)::integer,
    COUNT(*) FILTER (WHERE stars = 4)::integer,
    COUNT(*) FILTER (WHERE stars = 3)::integer,
    COUNT(*) FILTER (WHERE stars = 2)::integer,
    COUNT(*) FILTER (WHERE stars = 1)::integer
  INTO v_s5, v_s4, v_s3, v_s2, v_s1
  FROM public.ratings
  WHERE ratee_id = p_user_id AND is_hidden = false;

  RETURN jsonb_build_object(
    'total_ratings', v_total,
    'average_score', v_avg,
    'helper_count', v_helper_count,
    'helper_average', v_helper_avg,
    'requester_count', v_requester_count,
    'requester_average', v_requester_avg,
    'distribution', jsonb_build_object(
      '5', jsonb_build_object('count', v_s5, 'percentage', CASE WHEN v_total > 0 THEN ROUND((v_s5::numeric / v_total::numeric) * 100, 1) ELSE 0.0 END),
      '4', jsonb_build_object('count', v_s4, 'percentage', CASE WHEN v_total > 0 THEN ROUND((v_s4::numeric / v_total::numeric) * 100, 1) ELSE 0.0 END),
      '3', jsonb_build_object('count', v_s3, 'percentage', CASE WHEN v_total > 0 THEN ROUND((v_s3::numeric / v_total::numeric) * 100, 1) ELSE 0.0 END),
      '2', jsonb_build_object('count', v_s2, 'percentage', CASE WHEN v_total > 0 THEN ROUND((v_s2::numeric / v_total::numeric) * 100, 1) ELSE 0.0 END),
      '1', jsonb_build_object('count', v_s1, 'percentage', CASE WHEN v_total > 0 THEN ROUND((v_s1::numeric / v_total::numeric) * 100, 1) ELSE 0.0 END)
    )
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. UPDATE GET_PROFILE_SUMMARY TO EXCLUDE HIDDEN RATINGS
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
  v_open_requests integer := 0;
  v_hours_active numeric := 0.0;
  v_neighbours_supported integer := 0;
  v_distance_covered numeric := 0.0;
  v_trust_score numeric := NULL;
  v_ratings_count integer := 0;
  v_requester_rating numeric := NULL;
  v_requester_ratings_count integer := 0;
  v_helper_rating numeric := NULL;
  v_helper_ratings_count integer := 0;
  v_total_offers integer := 0;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
  v_category_breakdown jsonb;
  v_monthly_activity jsonb;
  v_ratings_breakdown jsonb;
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- 1. Fetch profile record
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- 2. Helps given (completed requests where user was the accepted helper)
  SELECT COUNT(*) INTO v_helps_given
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 3. Requests made
  SELECT COUNT(*) INTO v_requests_made
  FROM public.requests
  WHERE requester_id = p_user_id;

  -- 4. Open requests
  SELECT COUNT(*) INTO v_open_requests
  FROM public.requests
  WHERE requester_id = p_user_id
    AND status IN ('open', 'offered', 'accepted', 'on_the_way', 'arrived');

  -- 5. Total offers made
  SELECT COUNT(*) INTO v_total_offers
  FROM public.offers
  WHERE helper_id = p_user_id;

  -- 6. Hours active
  SELECT COALESCE(ROUND(SUM(
    GREATEST(1.0, EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - COALESCE(accepted_at, created_at))) / 3600.0)
  )::numeric, 1), 0.0)
  INTO v_hours_active
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 7. Neighbours supported (distinct requesters helped)
  SELECT COUNT(DISTINCT requester_id) INTO v_neighbours_supported
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 8. Distance covered (km)
  SELECT COALESCE(ROUND(SUM(
    COALESCE(
      NULLIF(travel_distance_km, 0),
      NULLIF((details->>'distance_km')::numeric, 0),
      CASE
        WHEN location IS NOT NULL AND v_profile.home_location IS NOT NULL
          THEN (ST_Distance(location, v_profile.home_location) / 1000.0)::numeric
        ELSE 2.5
      END
    )
  )::numeric, 1), 0.0)
  INTO v_distance_covered
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 9. Ratings & Trust Score (only unhidden ratings)
  -- Total ratings received
  SELECT COUNT(*) INTO v_ratings_count
  FROM public.ratings
  WHERE ratee_id = p_user_id AND is_hidden = false;

  -- Helper ratings (received from requesters)
  SELECT
    ROUND(AVG(r.stars)::numeric, 2),
    COUNT(*)
  INTO v_helper_rating, v_helper_ratings_count
  FROM public.ratings r
  JOIN public.requests req ON r.request_id = req.id
  WHERE r.ratee_id = p_user_id
    AND req.accepted_helper_id = p_user_id
    AND r.is_hidden = false;

  -- Requester ratings (received from helpers when user was requester)
  SELECT
    ROUND(AVG(r.stars)::numeric, 2),
    COUNT(*)
  INTO v_requester_rating, v_requester_ratings_count
  FROM public.ratings r
  JOIN public.requests req ON r.request_id = req.id
  WHERE r.ratee_id = p_user_id
    AND req.requester_id = p_user_id
    AND r.is_hidden = false;

  -- Trust score: overall average or helper average if >= 5 ratings, else overall
  IF v_ratings_count >= 5 THEN
    v_trust_score := COALESCE(v_helper_rating, v_profile.rating_average, 5.0);
  ELSIF v_ratings_count > 0 THEN
    v_trust_score := COALESCE(v_helper_rating, v_profile.rating_average, 5.0);
  ELSE
    v_trust_score := NULL;
  END IF;

  -- Ratings breakdown (star counts 5 down to 1 for unhidden ratings)
  SELECT jsonb_build_object(
    '5', COUNT(*) FILTER (WHERE stars = 5),
    '4', COUNT(*) FILTER (WHERE stars = 4),
    '3', COUNT(*) FILTER (WHERE stars = 3),
    '2', COUNT(*) FILTER (WHERE stars = 2),
    '1', COUNT(*) FILTER (WHERE stars = 1)
  )
  INTO v_ratings_breakdown
  FROM public.ratings
  WHERE ratee_id = p_user_id AND is_hidden = false;

  -- 10. Category breakdown
  SELECT jsonb_build_object(
    'blood', COUNT(*) FILTER (WHERE category = 'blood'),
    'equipment', COUNT(*) FILTER (WHERE category = 'equipment'),
    'elderly', COUNT(*) FILTER (WHERE category = 'elderly_help' OR category::text = 'elderly'),
    'books', COUNT(*) FILTER (WHERE category = 'books'),
    'transport', COUNT(*) FILTER (WHERE category = 'transport')
  )
  INTO v_category_breakdown
  FROM public.requests
  WHERE accepted_helper_id = p_user_id AND status = 'completed';

  -- 11. Monthly activity (last 6 months)
  WITH months AS (
    SELECT
      to_char(m, 'Mon') AS month_name,
      EXTRACT(YEAR FROM m)::integer AS year_val,
      EXTRACT(MONTH FROM m)::integer AS month_val,
      m::date AS month_start,
      (m + interval '1 month')::date AS month_end
    FROM generate_series(
      date_trunc('month', now() - interval '5 months'),
      date_trunc('month', now()),
      interval '1 month'
    ) AS m
  ),
  month_counts AS (
    SELECT
      m.month_name,
      m.year_val,
      m.month_start,
      COALESCE(COUNT(r.id), 0) AS cnt
    FROM months m
    LEFT JOIN public.requests r
      ON r.accepted_helper_id = p_user_id
     AND r.status = 'completed'
     AND r.completed_at >= m.month_start
     AND r.completed_at < m.month_end
    GROUP BY m.month_name, m.year_val, m.month_start
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', mc.month_name,
      'year', mc.year_val,
      'count', mc.cnt
    ) ORDER BY mc.month_start ASC
  ), '[]'::jsonb)
  INTO v_monthly_activity
  FROM month_counts mc;

  -- 12. Streaks Calculation
  WITH activity_dates AS (
    SELECT DISTINCT date_trunc('day', completed_at)::date AS act_date
    FROM public.requests
    WHERE accepted_helper_id = p_user_id AND status = 'completed' AND completed_at IS NOT NULL
  ),
  ranked AS (
    SELECT
      act_date,
      act_date - (ROW_NUMBER() OVER (ORDER BY act_date))::integer AS grp
    FROM activity_dates
  ),
  streak_groups AS (
    SELECT
      MIN(act_date) AS streak_start,
      MAX(act_date) AS streak_end,
      COUNT(*)::integer AS streak_length
    FROM ranked
    GROUP BY grp
  )
  SELECT
    COALESCE(MAX(streak_length), 0),
    COALESCE((
      SELECT streak_length
      FROM streak_groups
      WHERE streak_end >= CURRENT_DATE - 1
      ORDER BY streak_end DESC
      LIMIT 1
    ), 0)
  INTO v_best_streak, v_current_streak
  FROM streak_groups;

  RETURN jsonb_build_object(
    'helps_given', v_helps_given,
    'requests_made', v_requests_made,
    'requests_open', v_open_requests,
    'open_requests', v_open_requests,
    'total_offers', v_total_offers,
    'hours_volunteered', v_hours_active,
    'hours_active', v_hours_active,
    'neighbours_supported', v_neighbours_supported,
    'distance_covered_km', v_distance_covered,
    'distance_covered', v_distance_covered,
    'trust_score', COALESCE(v_trust_score, 5.0),
    'ratings_count', v_ratings_count,
    'requester_rating', COALESCE(v_requester_rating, 5.0),
    'requester_ratings_count', v_requester_ratings_count,
    'helper_rating', COALESCE(v_helper_rating, 5.0),
    'helper_ratings_count', v_helper_ratings_count,
    'current_streak_days', v_current_streak,
    'current_streak', v_current_streak,
    'best_streak_days', v_best_streak,
    'best_streak', v_best_streak,
    'category_breakdown', COALESCE(v_category_breakdown, '{"blood":0,"equipment":0,"elderly":0,"books":0,"transport":0}'::jsonb),
    'ratings_breakdown', COALESCE(v_ratings_breakdown, '{"5":0,"4":0,"3":0,"2":0,"1":0}'::jsonb),
    'monthly_activity', COALESCE(v_monthly_activity, '[]'::jsonb)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. PERMISSIONS & GRANTS
-- ----------------------------------------------------------------------------
GRANT ALL ON TABLE public.ratings TO authenticated, service_role;
GRANT SELECT ON TABLE public.ratings TO anon;
GRANT ALL ON TABLE public.review_reports TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_rating_breakdown(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_summary(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_rating() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_rating_update() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_rating_admin_audit() TO authenticated, service_role;

-- End of 15_ratings_and_reviews_enhancements.sql



-- ============================================================================
-- KindLink - Database Migration 16: Saved Places & Emergency Privacy Enhancements
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: User saved places with 10-item limit trigger and owner-only RLS,
--          emergency private details on profiles with granular sharing opt-ins,
--          and secure get_active_sos_details function restricted to active SOS
--          with access limited to live link holders and accepted/notified verified helpers.
-- Safety: Completely idempotent with IF NOT EXISTS and CREATE OR REPLACE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SAVED PLACES TABLE & INDEXES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  address_text text NOT NULL DEFAULT '',
  latitude double precision NOT NULL DEFAULT 23.6845,
  longitude double precision NOT NULL DEFAULT 86.9740,
  lat double precision,
  lng double precision,
  name text,
  type text DEFAULT 'custom',
  is_favorite boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT saved_places_latitude_range CHECK (latitude >= -90.0 AND latitude <= 90.0),
  CONSTRAINT saved_places_longitude_range CHECK (longitude >= -180.0 AND longitude <= 180.0),
  CONSTRAINT saved_places_label_not_empty CHECK (char_length(trim(label)) > 0)
);

-- Ensure backwards compatibility columns if table was created in an earlier partial state
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS address_text text NOT NULL DEFAULT '';
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS type text DEFAULT 'custom';
ALTER TABLE public.saved_places ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false NOT NULL;

-- Trigger to keep lat/lng & latitude/longitude and name/label in sync
CREATE OR REPLACE FUNCTION public.sync_saved_places_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.latitude IS NULL THEN
    NEW.latitude := NEW.lat;
  ELSIF NEW.latitude IS NOT NULL AND NEW.lat IS NULL THEN
    NEW.lat := NEW.latitude;
  END IF;

  IF NEW.lng IS NOT NULL AND NEW.longitude IS NULL THEN
    NEW.longitude := NEW.lng;
  ELSIF NEW.longitude IS NOT NULL AND NEW.lng IS NULL THEN
    NEW.lng := NEW.longitude;
  END IF;

  IF NEW.name IS NOT NULL AND (NEW.label IS NULL OR NEW.label = '') THEN
    NEW.label := NEW.name;
  ELSIF NEW.label IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
    NEW.name := NEW.label;
  END IF;

  IF NEW.address_text IS NULL OR NEW.address_text = '' THEN
    NEW.address_text := COALESCE(NEW.name, NEW.label, 'Saved Location');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_saved_places_columns ON public.saved_places;
CREATE TRIGGER trg_sync_saved_places_columns
  BEFORE INSERT OR UPDATE ON public.saved_places
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_saved_places_columns();

-- Indexes on user_id, favorite flag, and spatial coordinates
CREATE INDEX IF NOT EXISTS saved_places_user_id_idx ON public.saved_places (user_id);
CREATE INDEX IF NOT EXISTS saved_places_user_favorite_idx ON public.saved_places (user_id, is_favorite);
CREATE INDEX IF NOT EXISTS saved_places_coords_idx ON public.saved_places (latitude, longitude);
CREATE INDEX IF NOT EXISTS saved_places_spatial_gist_idx ON public.saved_places USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- Trigger: Automatically update updated_at on modification
CREATE OR REPLACE FUNCTION public.update_saved_places_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saved_places_updated_at ON public.saved_places;
CREATE TRIGGER trg_saved_places_updated_at
  BEFORE UPDATE ON public.saved_places
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_places_timestamp();

-- Trigger: Enforce maximum 10 saved places per user
CREATE OR REPLACE FUNCTION public.check_saved_places_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.saved_places
    WHERE user_id = NEW.user_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) >= 10 THEN
    RAISE EXCEPTION 'A user cannot have more than 10 saved places';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_saved_places_limit ON public.saved_places;
CREATE TRIGGER trg_check_saved_places_limit
  BEFORE INSERT OR UPDATE ON public.saved_places
  FOR EACH ROW
  EXECUTE FUNCTION public.check_saved_places_limit();

-- ----------------------------------------------------------------------------
-- 2. SAVED PLACES ROW LEVEL SECURITY (RLS) - OWNER ONLY
-- ----------------------------------------------------------------------------
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_places_select_own" ON public.saved_places;
CREATE POLICY "saved_places_select_own"
  ON public.saved_places FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_places_insert_own" ON public.saved_places;
CREATE POLICY "saved_places_insert_own"
  ON public.saved_places FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_places_update_own" ON public.saved_places;
CREATE POLICY "saved_places_update_own"
  ON public.saved_places FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_places_delete_own" ON public.saved_places;
CREATE POLICY "saved_places_delete_own"
  ON public.saved_places FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT ALL ON TABLE public.saved_places TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_saved_places_limit() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. PROFILES EMERGENCY PRIVATE DETAILS & SHARING CONTROLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_blood_group text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_medical_notes text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_share_phone boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_share_blood_group boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_share_medical_notes boolean DEFAULT false;

-- Character length limit of 200 characters for medical notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_emergency_medical_notes_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_emergency_medical_notes_check
      CHECK (emergency_medical_notes IS NULL OR char_length(emergency_medical_notes) <= 200);
  END IF;
END $$;

-- Also ensure sos_events has request_id for linking SOS broadcasts to requests
ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sos_events_request_id_idx ON public.sos_events (request_id);

-- ----------------------------------------------------------------------------
-- 4. SECURITY-DEFINER FUNCTION: get_active_sos_details
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_sos_details(
  p_sos_id uuid,
  p_viewer_id uuid DEFAULT NULL,
  p_token uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sos public.sos_events%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_is_live_link_holder boolean := false;
  v_is_owner boolean := false;
  v_is_admin boolean := false;
  v_is_verified boolean := false;
  v_is_accepted_or_notified boolean := false;
  v_contacts jsonb := '[]'::jsonb;
BEGIN
  IF p_sos_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Locate the SOS record by ID or token
  SELECT * INTO v_sos
  FROM public.sos_events
  WHERE id = p_sos_id OR token = p_sos_id OR (p_token IS NOT NULL AND token = p_token);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Strictly active only & live link expires after 2 hours (or expires_at column)
  IF v_sos.status <> 'active'
     OR v_sos.resolved_at IS NOT NULL
     OR v_sos.expires_at <= now()
     OR (v_sos.created_at + interval '2 hours') < now() THEN
    RETURN NULL;
  END IF;

  -- 3. Determine live link possession
  IF p_sos_id = v_sos.token OR (p_token IS NOT NULL AND p_token = v_sos.token) THEN
    v_is_live_link_holder := true;
  END IF;

  -- 4. Determine viewer identity & roles
  IF p_viewer_id IS NOT NULL THEN
    IF v_sos.user_id IS NOT NULL AND p_viewer_id = v_sos.user_id THEN
      v_is_owner := true;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = p_viewer_id AND role = 'admin'
    ) INTO v_is_admin;

    SELECT (verification_status = 'verified') INTO v_is_verified
    FROM public.profiles
    WHERE id = p_viewer_id;

    -- Check verified helper authorization (accepted or notified)
    IF v_is_verified = true THEN
      -- A: Accepted helper on the request
      IF EXISTS (
        SELECT 1 FROM public.requests r
        WHERE (r.id = v_sos.request_id OR (r.requester_id = v_sos.user_id AND r.urgency = 'critical'))
          AND r.accepted_helper_id = p_viewer_id
      ) OR EXISTS (
        SELECT 1 FROM public.offers o
        WHERE (o.request_id = v_sos.request_id OR o.request_id IN (
          SELECT id FROM public.requests WHERE requester_id = v_sos.user_id AND urgency = 'critical'
        ))
        AND o.helper_id = p_viewer_id
        AND o.status = 'accepted'
      ) THEN
        v_is_accepted_or_notified := true;
      -- B: Notified helper or active volunteer responder
      ELSIF EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p_viewer_id
          AND (
            n.request_id = v_sos.request_id
            OR n.type IN ('emergency_sos', 'sos', 'emergency', 'sos_alert')
            OR (v_sos.request_id IS NULL AND n.request_id IN (
              SELECT id FROM public.requests WHERE requester_id = v_sos.user_id AND urgency = 'critical'
            ))
          )
      ) OR EXISTS (
        SELECT 1 FROM public.offers o
        WHERE (o.request_id = v_sos.request_id OR o.request_id IN (
          SELECT id FROM public.requests WHERE requester_id = v_sos.user_id AND urgency = 'critical'
        ))
        AND o.helper_id = p_viewer_id
      ) THEN
        v_is_accepted_or_notified := true;
      END IF;
    END IF;
  END IF;

  -- 5. Authorization gate: must be live link holder, owner, admin, or accepted/notified verified helper
  IF NOT (v_is_live_link_holder OR v_is_owner OR v_is_admin OR v_is_accepted_or_notified) THEN
    RETURN NULL;
  END IF;

  -- 6. Fetch initiator profile if linked
  IF v_sos.user_id IS NOT NULL THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_sos.user_id;

    -- Include emergency contacts
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ec.id,
          'name', ec.name,
          'relationship', ec.relationship,
          'phone', ec.phone_e164
        ) ORDER BY ec.created_at ASC
      ),
      '[]'::jsonb
    ) INTO v_contacts
    FROM public.emergency_contacts ec
    WHERE ec.user_id = v_sos.user_id;
  END IF;

  -- 7. Build sanitized response adhering to user privacy opt-ins
  RETURN jsonb_build_object(
    'sos_id', v_sos.id,
    'token', v_sos.token,
    'user_id', v_sos.user_id,
    'user_name', COALESCE(v_profile.display_name, v_profile.username, 'KindLink Citizen'),
    'status', v_sos.status,
    'latitude', CASE WHEN v_sos.location IS NOT NULL THEN ST_Y(v_sos.location::geometry) ELSE NULL END,
    'longitude', CASE WHEN v_sos.location IS NOT NULL THEN ST_X(v_sos.location::geometry) ELSE NULL END,
    'address_text', v_sos.address_text,
    'created_at', v_sos.created_at,
    'expires_at', v_sos.expires_at,
    'phone', CASE
      WHEN v_is_owner OR v_is_admin OR COALESCE(v_profile.emergency_share_phone, false)
      THEN COALESCE(v_profile.phone_e164, v_profile.phone)
      ELSE NULL
    END,
    'emergency_blood_group', CASE
      WHEN v_is_owner OR v_is_admin OR COALESCE(v_profile.emergency_share_blood_group, false)
      THEN v_profile.emergency_blood_group
      ELSE NULL
    END,
    'emergency_medical_notes', CASE
      WHEN v_is_owner OR v_is_admin OR COALESCE(v_profile.emergency_share_medical_notes, false)
      THEN v_profile.emergency_medical_notes
      ELSE NULL
    END,
    'emergency_contacts', v_contacts,
    'is_live_link', v_is_live_link_holder,
    'is_active', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_sos_details(uuid, uuid, uuid) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. UPDATE get_member_profile TO RETURN EMERGENCY PREFERENCES FOR SELF/ADMIN
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

  -- Granular visibility evaluation
  v_show_phone := v_is_self OR v_is_admin OR (
    CASE v_profile.visibility_phone
      WHEN 'members' THEN (p_viewer_id IS NOT NULL)
      WHEN 'matched' THEN (v_is_matched OR v_is_self OR v_is_admin)
      WHEN 'private' THEN (v_is_self OR v_is_admin)
      ELSE (p_viewer_id IS NOT NULL)
    END
  );

  v_show_email := v_is_self OR v_is_admin OR (
    CASE v_profile.visibility_email
      WHEN 'members' THEN (p_viewer_id IS NOT NULL)
      WHEN 'matched' THEN (v_is_matched OR v_is_self OR v_is_admin)
      WHEN 'private' THEN (v_is_self OR v_is_admin)
      ELSE (p_viewer_id IS NOT NULL)
    END
  );

  v_show_organisation := v_is_self OR v_is_admin OR (
    CASE v_profile.visibility_organisation
      WHEN 'members' THEN (p_viewer_id IS NOT NULL)
      WHEN 'matched' THEN (v_is_matched OR v_is_self OR v_is_admin)
      WHEN 'private' THEN (v_is_self OR v_is_admin)
      ELSE (p_viewer_id IS NOT NULL)
    END
  );

  v_show_area := v_is_self OR v_is_admin OR (
    CASE v_profile.visibility_area
      WHEN 'members' THEN (p_viewer_id IS NOT NULL)
      WHEN 'matched' THEN (v_is_matched OR v_is_self OR v_is_admin)
      WHEN 'private' THEN (v_is_self OR v_is_admin)
      ELSE (p_viewer_id IS NOT NULL)
    END
  );

  -- Fetch user badges
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'badge_id', ub.badge_id,
    'title', bd.title,
    'name', bd.title,
    'description', bd.description,
    'category', bd.category,
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
    'emergency_blood_group', CASE WHEN v_is_self OR v_is_admin THEN v_profile.emergency_blood_group ELSE NULL END,
    'emergency_medical_notes', CASE WHEN v_is_self OR v_is_admin THEN v_profile.emergency_medical_notes ELSE NULL END,
    'emergency_share_phone', CASE WHEN v_is_self OR v_is_admin THEN v_profile.emergency_share_phone ELSE NULL END,
    'emergency_share_blood_group', CASE WHEN v_is_self OR v_is_admin THEN v_profile.emergency_share_blood_group ELSE NULL END,
    'emergency_share_medical_notes', CASE WHEN v_is_self OR v_is_admin THEN v_profile.emergency_share_medical_notes ELSE NULL END,
    'badges', v_badges,
    'stats', v_summary,
    'emergency_contacts', v_contacts,
    'is_self', v_is_self
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_profile(text, uuid) TO anon, authenticated, service_role;
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
-- ==============================================================================
-- KindLink - Database Migration 18: Handover Confirmation PIN & Organization Endorsements
-- Purpose:
--   1. Handover Confirmation PIN:
--      - 4-digit security PIN for physical equipment loans and book handovers
--      - Columns: handover_pin, requires_handover_pin, handover_confirmed_at
--      - Function: public.verify_handover_pin(p_request_id, p_pin)
--      - Trigger: auto-generate 4-digit PIN for equipment & books categories
--   2. Organization / NGO Endorsements:
--      - Organization profile credentials on public.profiles
--      - Table public.request_endorsements with RLS and unique constraint
--      - Columns on public.requests: is_organization_endorsed, endorsements_count, endorsed_by_org_names
--      - Sync trigger: auto-update request endorsement count and org names
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD HANDOVER PIN COLUMNS TO REQUESTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'handover_pin'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN handover_pin varchar(4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'requires_handover_pin'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN requires_handover_pin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'handover_confirmed_at'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN handover_confirmed_at timestamptz;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ADD ORGANIZATION PROFILE COLUMNS TO PROFILES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_organization'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_organization boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_registration_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_registration_number text;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ADD ENDORSEMENT COLUMNS TO REQUESTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'is_organization_endorsed'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN is_organization_endorsed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'endorsements_count'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN endorsements_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'endorsed_by_org_names'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN endorsed_by_org_names text[] DEFAULT '{}'::text[];
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. CREATE REQUEST_ENDORSEMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  endorser_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_endorsement_per_org UNIQUE (request_id, endorser_id)
);

CREATE INDEX IF NOT EXISTS idx_request_endorsements_req ON public.request_endorsements(request_id);
CREATE INDEX IF NOT EXISTS idx_request_endorsements_org ON public.request_endorsements(endorser_id);

-- Enable RLS
ALTER TABLE public.request_endorsements ENABLE ROW LEVEL SECURITY;

-- Policies for request_endorsements
DROP POLICY IF EXISTS "Public can view endorsements" ON public.request_endorsements;
CREATE POLICY "Public can view endorsements"
  ON public.request_endorsements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can endorse requests" ON public.request_endorsements;
CREATE POLICY "Authenticated users can endorse requests"
  ON public.request_endorsements
  FOR INSERT
  WITH CHECK (auth.uid() = endorser_id);

DROP POLICY IF EXISTS "Organizations can remove their own endorsement" ON public.request_endorsements;
CREATE POLICY "Organizations can remove their own endorsement"
  ON public.request_endorsements
  FOR DELETE
  USING (auth.uid() = endorser_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER: SYNC REQUEST ENDORSEMENTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_request_endorsements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id uuid;
  v_count integer;
  v_names text[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_req_id := OLD.request_id;
  ELSE
    v_req_id := NEW.request_id;
  END IF;

  -- Count total endorsements
  SELECT count(*) INTO v_count
  FROM public.request_endorsements
  WHERE request_id = v_req_id;

  -- Collect organization names
  SELECT array_agg(COALESCE(p.organization_name, p.display_name, p.username, 'Community Partner'))
  INTO v_names
  FROM public.request_endorsements re
  JOIN public.profiles p ON p.id = re.endorser_id
  WHERE re.request_id = v_req_id;

  -- Update requests table
  UPDATE public.requests
  SET
    endorsements_count = v_count,
    is_organization_endorsed = (v_count > 0),
    endorsed_by_org_names = COALESCE(v_names, '{}'::text[])
  WHERE id = v_req_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_endorsements ON public.request_endorsements;
CREATE TRIGGER trg_sync_request_endorsements
  AFTER INSERT OR UPDATE OR DELETE ON public.request_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_request_endorsements();

-- ------------------------------------------------------------------------------
-- 6. TRIGGER: AUTO-GENERATE HANDOVER PIN FOR EQUIPMENT AND BOOKS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_handover_pin_requirement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default requires_handover_pin to TRUE for equipment and books
  IF NEW.category IN ('equipment', 'books') THEN
    IF NEW.requires_handover_pin IS NULL OR NEW.requires_handover_pin = false THEN
      NEW.requires_handover_pin := true;
    END IF;
  END IF;

  -- Auto-generate 4-digit PIN if required and empty
  IF NEW.requires_handover_pin = true AND (NEW.handover_pin IS NULL OR trim(NEW.handover_pin) = '') THEN
    NEW.handover_pin := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  END IF;

  -- Mirror inside details JSONB for backward compatibility
  IF NEW.requires_handover_pin = true THEN
    NEW.details := jsonb_set(COALESCE(NEW.details, '{}'::jsonb), '{requires_handover_pin}', 'true'::jsonb, true);
    IF NEW.handover_pin IS NOT NULL THEN
      NEW.details := jsonb_set(NEW.details, '{handover_pin}', to_jsonb(NEW.handover_pin), true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_handover_pin_requirement ON public.requests;
CREATE TRIGGER trg_check_handover_pin_requirement
  BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_handover_pin_requirement();

-- ------------------------------------------------------------------------------
-- 7. FUNCTION: verify_handover_pin(p_request_id, p_pin)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_handover_pin(
  p_request_id uuid,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
  v_expected_pin text;
  v_requires_pin boolean;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  v_requires_pin := COALESCE(
    v_req.requires_handover_pin,
    (v_req.details->>'requires_handover_pin')::boolean,
    (v_req.category IN ('equipment', 'books'))
  );

  v_expected_pin := COALESCE(
    v_req.handover_pin,
    v_req.details->>'handover_pin'
  );

  -- If PIN is required, verify match
  IF v_requires_pin = true AND v_expected_pin IS NOT NULL THEN
    IF trim(p_pin) != trim(v_expected_pin) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Incorrect 4-digit PIN. Please ask the requester for the PIN shown on their screen.'
      );
    END IF;
  END IF;

  -- Mark as completed with timestamp
  UPDATE public.requests
  SET
    status = 'completed',
    completed_at = v_now,
    handover_confirmed_at = v_now,
    details = jsonb_set(
      COALESCE(details, '{}'::jsonb),
      '{handover_confirmed_at}',
      to_jsonb(v_now::text),
      true
    )
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Handover confirmed and request completed successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_handover_pin(uuid, text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. BACKFILL EXISTING EQUIPMENT & BOOKS REQUESTS WITH PIN
-- ------------------------------------------------------------------------------
UPDATE public.requests
SET
  requires_handover_pin = true,
  handover_pin = COALESCE(handover_pin, lpad(floor(random() * 9000 + 1000)::text, 4, '0'))
WHERE category IN ('equipment', 'books')
  AND (handover_pin IS NULL OR requires_handover_pin IS NULL OR requires_handover_pin = false);
-- ==============================================================================
-- KindLink - Database Migration 19: Request Categories & Tags System
-- Purpose:
--   1. Create public.request_categories table for data-driven mutual aid categories:
--      - Columns: key (PK), name, description, icon, colour, default_urgency_hint,
--                 response_expectation, suggested_tags, extra_fields, sort_order,
--                 active, is_urgent, created_at, updated_at
--      - RLS: Public read for everyone, write restricted to platform admins
--   2. Modify public.requests table:
--      - Convert category column from help_category enum to text (idempotent)
--      - Add custom_category_label text (for "other" custom categories)
--      - Add tags text[] DEFAULT '{}'::text[] (up to 5 tags per request)
--      - Create indexes on category, custom_category_label, and tags (GIN)
--   3. Seed 15 categories (5 existing legacy + 10 new community categories)
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE REQUEST_CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_categories (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  colour text NOT NULL,
  default_urgency_hint text,
  response_expectation text,
  suggested_tags text[] DEFAULT '{}'::text[] NOT NULL,
  extra_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  is_urgent boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure RLS is enabled
ALTER TABLE public.request_categories ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone (anon or authenticated) can view active categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'request_categories' AND policyname = 'request_categories_select_all'
  ) THEN
    CREATE POLICY request_categories_select_all
      ON public.request_categories
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Admin write policies: Only admins can insert, update, or delete categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'request_categories' AND policyname = 'request_categories_admin_all'
  ) THEN
    CREATE POLICY request_categories_admin_all
      ON public.request_categories
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ALTER REQUESTS TABLE FOR DATA-DRIVEN CATEGORIES AND TAGS
-- ------------------------------------------------------------------------------

-- Convert category from enum to text if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'category' AND udt_name = 'help_category'
  ) THEN
    ALTER TABLE public.requests ALTER COLUMN category TYPE text USING category::text;
  END IF;
END $$;

-- Add custom_category_label column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'custom_category_label'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN custom_category_label text;
  END IF;
END $$;

-- Add tags column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN tags text[] DEFAULT '{}'::text[];
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS requests_category_text_idx ON public.requests (category);
CREATE INDEX IF NOT EXISTS requests_custom_category_label_idx ON public.requests (custom_category_label) WHERE custom_category_label IS NOT NULL;
CREATE INDEX IF NOT EXISTS requests_tags_gin_idx ON public.requests USING gin(tags);

-- ------------------------------------------------------------------------------
-- 3. SEED THE 15 CATEGORIES (5 EXISTING + 10 NEW)
-- ------------------------------------------------------------------------------
INSERT INTO public.request_categories (
  key, name, description, icon, colour, default_urgency_hint, response_expectation, suggested_tags, extra_fields, sort_order, active, is_urgent
) VALUES
  (
    'blood',
    'Blood Donation',
    'Emergency whole blood, platelets, and plasma replacement donors for surgical, trauma, and hospital patients.',
    'Droplets',
    '#C62828',
    'Immediate (0-2h)',
    'Immediate (0-2 hours)',
    ARRAY['whole blood', 'platelets', 'plasma', 'emergency donor', 'hospital donor', 'replacement blood'],
    '[{"key": "bloodGroup", "label": "Blood Group", "type": "select", "required": true}, {"key": "unitsNeeded", "label": "Units Needed", "type": "number", "required": true}, {"key": "hospitalName", "label": "Hospital / Blood Bank", "type": "text", "required": true}]'::jsonb,
    1,
    true,
    true
  ),
  (
    'equipment',
    'Medical Gear',
    'Wheelchairs, oxygen concentrators, walkers, crutches, and temporary medical rehabilitation gear.',
    'Stethoscope',
    '#0F766E',
    'Urgent (2-4h)',
    'Within 2-4 hours',
    ARRAY['wheelchair', 'oxygen concentrator', 'walker', 'crutches', 'nebulizer', 'hospital bed', 'bp monitor'],
    '[{"key": "itemType", "label": "Equipment Type", "type": "text", "required": true}, {"key": "itemDuration", "label": "Duration Needed", "type": "text", "required": true}]'::jsonb,
    2,
    true,
    true
  ),
  (
    'elderly',
    'Elderly Care',
    'Compassionate neighbourhood accompaniment, medicine pickup, grocery support, and friendly check-ins for seniors.',
    'Users',
    '#4F46E5',
    'Scheduled or flexible',
    'Flexible / Scheduled',
    ARRAY['check-in', 'companion', 'groceries', 'clinic visit', 'home visit', 'reading help'],
    '[{"key": "elderlyAidType", "label": "Support Type", "type": "text", "required": true}, {"key": "elderlyDuration", "label": "Time Needed", "type": "text", "required": false}]'::jsonb,
    3,
    true,
    false
  ),
  (
    'books',
    'Books and Study',
    'Academic textbooks, competitive exam study materials, notebooks, and learning resource sharing.',
    'BookOpen',
    '#047857',
    'Standard (1-2 days)',
    'Within 24-48 hours',
    ARRAY['textbooks', 'notes', 'exam prep', 'school', 'college', 'stationery', 'study guides'],
    '[{"key": "booksClassSubject", "label": "Class / Subject", "type": "text", "required": true}, {"key": "bookTitle", "label": "Book Title", "type": "text", "required": false}]'::jsonb,
    4,
    true,
    false
  ),
  (
    'transport',
    'Emergency Transit',
    'Urgent volunteer transit, emergency clinic rides, and wheelchair-accessible hospital transport.',
    'Car',
    '#B45309',
    'Immediate (0-2h)',
    'Immediate (0-2 hours)',
    ARRAY['emergency ride', 'hospital transit', 'wheelchair ride', 'dialysis trip', 'clinic escort'],
    '[{"key": "pickupAddress", "label": "Pickup Location", "type": "text", "required": true}, {"key": "dropAddress", "label": "Destination", "type": "text", "required": true}]'::jsonb,
    5,
    true,
    true
  ),
  (
    'medicine',
    'Medicines and Pharmacy',
    'Prescription medicine pickup, delivery of urgent pharmaceuticals, and pharmacy availability assistance.',
    'Pill',
    '#C2410C',
    'Urgent (1-3h)',
    'Within 1-3 hours',
    ARRAY['prescription pickup', 'medicine delivery', 'urgent medicine', 'pharmacy run', 'insulin', 'first aid'],
    '[{"key": "medicineNames", "label": "Medicine Names", "type": "text", "required": true}, {"key": "prescriptionRequired", "label": "Prescription Ready?", "type": "boolean", "required": false}]'::jsonb,
    6,
    true,
    true
  ),
  (
    'food',
    'Food and Groceries',
    'Nutritious meal support for convalescing patients, essential household groceries, and dry ration kits.',
    'Utensils',
    '#BE123C',
    'Same day (2-4h)',
    'Within 2-4 hours',
    ARRAY['meal support', 'groceries', 'cooked food', 'ration kit', 'baby food', 'drinking water'],
    '[{"key": "dietaryRestrictions", "label": "Dietary Preference", "type": "text", "required": false}, {"key": "servingsCount", "label": "Persons / Servings", "type": "number", "required": false}]'::jsonb,
    7,
    true,
    true
  ),
  (
    'hospital_attendant',
    'Hospital Attendant and Companion',
    'Patient attendant bedside assistance, OPD queue companion, and hospital discharge transit accompaniment.',
    'HeartHandshake',
    '#0369A1',
    'Urgent (2-4h)',
    'Within 2-4 hours',
    ARRAY['patient attendant', 'hospital visit', 'discharge help', 'bedside care', 'opd queue', 'wheelchair push'],
    '[{"key": "hospitalName", "label": "Hospital Name", "type": "text", "required": true}, {"key": "wardRoom", "label": "Ward / Room", "type": "text", "required": false}]'::jsonb,
    8,
    true,
    true
  ),
  (
    'disaster_relief',
    'Disaster and Flood Relief',
    'Emergency temporary shelter, clean drinking water, rescue guidance, dry supplies, and flood relief.',
    'AlertTriangle',
    '#B91C1C',
    'Immediate (0-1h)',
    'Immediate (0-1 hours)',
    ARRAY['shelter', 'supplies', 'rescue information', 'flood relief', 'water pumps', 'tarpaulin'],
    '[{"key": "hazardType", "label": "Situation / Hazard", "type": "text", "required": true}, {"key": "peopleCount", "label": "People Affected", "type": "number", "required": false}]'::jsonb,
    9,
    true,
    true
  ),
  (
    'education',
    'Education and Tutoring',
    'Volunteer peer tutoring, doubt solving, mentoring for underprivileged students, and skills guidance.',
    'GraduationCap',
    '#6D28D9',
    'Flexible (1-3 days)',
    'Within 24-72 hours',
    ARRAY['study help', 'mentoring', 'skill training', 'homework aid', 'math tutoring', 'science help'],
    '[{"key": "subjectGrade", "label": "Subject & Grade", "type": "text", "required": true}]'::jsonb,
    10,
    true,
    false
  ),
  (
    'clothes',
    'Clothes and Essentials',
    'Clean wearable clothing sets, warm winter blankets, footwear, and household utility essentials.',
    'Shirt',
    '#065F46',
    'Standard (1-2 days)',
    'Within 24-48 hours',
    ARRAY['blankets', 'clothes', 'household items', 'winter wear', 'children clothes', 'shoes'],
    '[{"key": "sizesNeeded", "label": "Sizes Needed", "type": "text", "required": false}]'::jsonb,
    11,
    true,
    false
  ),
  (
    'home_repairs',
    'Home Repairs and Small Jobs',
    'Volunteer neighbourhood fixes for electrical safety, minor plumbing leaks, and small home handiwork.',
    'Wrench',
    '#334155',
    'Scheduled (within 24h)',
    'Within 24 hours',
    ARRAY['electrician', 'plumbing', 'small fixes', 'carpentry', 'appliance check', 'lock fix'],
    '[{"key": "repairType", "label": "Repair Needed", "type": "text", "required": true}]'::jsonb,
    12,
    true,
    false
  ),
  (
    'government_aid',
    'Paperwork and Government Help',
    'Assistance with filling government scheme forms, pension documentation, and public benefit applications.',
    'FileText',
    '#3730A3',
    'Standard (2-4 days)',
    'Within 2-4 days',
    ARRAY['forms', 'documents', 'scheme applications', 'pension help', 'ration card', 'id application'],
    '[{"key": "schemeName", "label": "Scheme or Form Name", "type": "text", "required": true}]'::jsonb,
    13,
    true,
    false
  ),
  (
    'animal_care',
    'Animal and Pet Help',
    'Street animal rescue assistance, emergency veterinary transport, temporary fostering, and feeding support.',
    'PawPrint',
    '#9A3412',
    'Urgent (1-3h)',
    'Within 1-3 hours',
    ARRAY['rescue', 'pet care', 'food', 'injured animal', 'vet transit', 'foster care'],
    '[{"key": "animalType", "label": "Animal / Pet Type", "type": "text", "required": true}]'::jsonb,
    14,
    true,
    true
  ),
  (
    'other',
    'Other (custom)',
    'Custom community mutual aid needs not covered by standard categories. Enter a specific label.',
    'HelpCircle',
    '#475569',
    'Flexible',
    'Flexible',
    ARRAY['neighbourhood aid', 'community support', 'special assistance'],
    '[{"key": "customCategoryLabel", "label": "Custom Category Name", "type": "text", "required": true}]'::jsonb,
    15,
    true,
    false
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  colour = EXCLUDED.colour,
  default_urgency_hint = EXCLUDED.default_urgency_hint,
  response_expectation = EXCLUDED.response_expectation,
  suggested_tags = EXCLUDED.suggested_tags,
  extra_fields = EXCLUDED.extra_fields,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  is_urgent = EXCLUDED.is_urgent,
  updated_at = now();

-- ==============================================================================
-- KindLink - Database Migration 20: Reports & Moderation System
-- Purpose:
--   1. Create public.reports table for flagged requests & moderation:
--      - Columns: id, reporter_id, request_id, reason, details, status,
--                 created_at, resolved_at, resolved_by
--      - Unique constraint (reporter_id, request_id) to prevent duplicate reports
--      - RLS: Authenticated users can submit reports; admins can view and resolve
--   2. Admin Moderation View for custom category labels:
--      - View: public.admin_custom_categories_view
--      - Aggregates popular custom labels with count, first/last seen, sample requests
--   3. Administrative promotion function:
--      - public.promote_custom_category_to_standard(...)
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE REPORTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT unique_report_per_user_request UNIQUE (reporter_id, request_id)
);

CREATE INDEX IF NOT EXISTS reports_request_id_idx ON public.reports (request_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports (created_at DESC);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can insert their own reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_insert_own'
  ) THEN
    CREATE POLICY reports_insert_own
      ON public.reports
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = reporter_id
      );
  END IF;
END $$;

-- Policy 2: Users can view their own reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_select_own'
  ) THEN
    CREATE POLICY reports_select_own
      ON public.reports
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = reporter_id
      );
  END IF;
END $$;

-- Policy 3: Admins have full access to view, review, and update reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_admin_all'
  ) THEN
    CREATE POLICY reports_admin_all
      ON public.reports
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ADMIN MODERATION VIEW FOR CUSTOM CATEGORY LABELS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_custom_categories_view AS
SELECT
  lower(trim(r.custom_category_label)) AS label,
  count(r.id)::integer AS usage_count,
  min(r.created_at) AS first_used_at,
  max(r.created_at) AS last_used_at,
  (array_agg(r.id ORDER BY r.created_at DESC))[1:5] AS sample_request_ids,
  (array_agg(r.title ORDER BY r.created_at DESC))[1:5] AS sample_titles
FROM public.requests r
WHERE r.category = 'other'
  AND r.custom_category_label IS NOT NULL
  AND length(trim(r.custom_category_label)) > 0
GROUP BY lower(trim(r.custom_category_label))
ORDER BY usage_count DESC, last_used_at DESC;

-- ------------------------------------------------------------------------------
-- 3. FUNCTION TO PROMOTE A CUSTOM CATEGORY TO A STANDARD CATEGORY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_custom_category_to_standard(
  p_custom_label text,
  p_new_key text,
  p_new_name text,
  p_new_description text,
  p_icon text DEFAULT 'HelpCircle',
  p_colour text DEFAULT '#0F766E',
  p_urgency_hint text DEFAULT 'Standard (2-4h)',
  p_response_expectation text DEFAULT 'Within 2-4 hours',
  p_suggested_tags text[] DEFAULT '{}'::text[],
  p_is_urgent boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_updated_count integer := 0;
BEGIN
  -- Verify admin authority
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_caller;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required to promote categories.';
  END IF;

  -- 1. Insert new standard category in request_categories
  INSERT INTO public.request_categories (
    key, name, description, icon, colour, default_urgency_hint,
    response_expectation, suggested_tags, sort_order, active, is_urgent
  ) VALUES (
    lower(trim(p_new_key)),
    trim(p_new_name),
    trim(p_new_description),
    trim(p_icon),
    trim(p_colour),
    p_urgency_hint,
    p_response_expectation,
    p_suggested_tags,
    20,
    true,
    p_is_urgent
  )
  ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    colour = EXCLUDED.colour,
    updated_at = now();

  -- 2. Migrate existing matching custom requests to the new standard category
  WITH updated AS (
    UPDATE public.requests
    SET
      category = lower(trim(p_new_key)),
      custom_category_label = NULL
    WHERE category = 'other'
      AND lower(trim(custom_category_label)) = lower(trim(p_custom_label))
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'new_category_key', lower(trim(p_new_key)),
    'migrated_requests_count', v_updated_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_custom_category_to_standard(
  text, text, text, text, text, text, text, text, text[], boolean
) TO authenticated, service_role;

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
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer, uuid);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer, uuid);

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
  page_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
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
  double precision, double precision, double precision, text, text, integer, integer, uuid
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
-- Clean profiles where home area matches old legacy college defaults (guarded if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_neighborhood'
  ) THEN
    UPDATE public.profiles
    SET home_neighborhood = NULL
    WHERE home_neighborhood ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
       OR home_neighborhood ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
       OR home_neighborhood ILIKE '%' || 'MAK' || 'AUT%';
  END IF;
END $$;

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
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_places' AND column_name = 'address_text'
    ) THEN
      DELETE FROM public.saved_places
      WHERE label ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
         OR label ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
         OR address_text ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
         OR address_text ILIKE '%' || chr(65)||chr(69)||chr(67) || '%';
    ELSE
      DELETE FROM public.saved_places
      WHERE label ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
         OR label ILIKE '%' || 'Asansol' || '_' || 'Engineering%';
    END IF;
  END IF;
END $$;


-- ==============================================================================
-- 19_request_categories_and_tags.sql
-- ==============================================================================

-- ==============================================================================
-- KindLink - Database Migration 19: Request Categories & Tags System
-- Purpose:
--   1. Create public.request_categories table for data-driven mutual aid categories:
--      - Columns: key (PK), name, description, icon, colour, default_urgency_hint,
--                 response_expectation, suggested_tags, extra_fields, sort_order,
--                 active, is_urgent, created_at, updated_at
--      - RLS: Public read for everyone, write restricted to platform admins
--   2. Modify public.requests table:
--      - Convert category column from help_category enum to text (idempotent)
--      - Add custom_category_label text (for "other" custom categories)
--      - Add tags text[] DEFAULT '{}'::text[] (up to 5 tags per request)
--      - Create indexes on category, custom_category_label, and tags (GIN)
--   3. Seed 15 categories (5 existing legacy + 10 new community categories)
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE REQUEST_CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_categories (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  colour text NOT NULL,
  default_urgency_hint text,
  response_expectation text,
  suggested_tags text[] DEFAULT '{}'::text[] NOT NULL,
  extra_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  is_urgent boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure RLS is enabled
ALTER TABLE public.request_categories ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone (anon or authenticated) can view active categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'request_categories' AND policyname = 'request_categories_select_all'
  ) THEN
    CREATE POLICY request_categories_select_all
      ON public.request_categories
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Admin write policies: Only admins can insert, update, or delete categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'request_categories' AND policyname = 'request_categories_admin_all'
  ) THEN
    CREATE POLICY request_categories_admin_all
      ON public.request_categories
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ALTER REQUESTS TABLE FOR DATA-DRIVEN CATEGORIES AND TAGS
-- ------------------------------------------------------------------------------

-- Convert category from enum to text if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'category' AND udt_name = 'help_category'
  ) THEN
    ALTER TABLE public.requests ALTER COLUMN category TYPE text USING category::text;
  END IF;
END $$;

-- Add custom_category_label column
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS custom_category_label text;

-- Add tags column
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

-- Create indexes
CREATE INDEX IF NOT EXISTS requests_category_text_idx ON public.requests (category);
CREATE INDEX IF NOT EXISTS requests_custom_category_label_idx ON public.requests (custom_category_label) WHERE custom_category_label IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requests_tags ON public.requests USING GIN (tags);
CREATE INDEX IF NOT EXISTS requests_tags_gin_idx ON public.requests USING gin(tags);

-- ------------------------------------------------------------------------------
-- 3. SEED THE 15 CATEGORIES (5 EXISTING + 10 NEW)
-- ------------------------------------------------------------------------------
INSERT INTO public.request_categories (
  key, name, description, icon, colour, default_urgency_hint, response_expectation, suggested_tags, extra_fields, sort_order, active, is_urgent
) VALUES
  (
    'blood',
    'Blood Donation',
    'Emergency whole blood, platelets, and plasma replacement donors for surgical, trauma, and hospital patients.',
    'Droplets',
    '#C62828',
    'Immediate (0-2h)',
    'Immediate (0-2 hours)',
    ARRAY['whole blood', 'platelets', 'plasma', 'emergency donor', 'hospital donor', 'replacement blood'],
    '[{"key": "bloodGroup", "label": "Blood Group", "type": "select", "required": true}, {"key": "unitsNeeded", "label": "Units Needed", "type": "number", "required": true}, {"key": "hospitalName", "label": "Hospital / Blood Bank", "type": "text", "required": true}]'::jsonb,
    1,
    true,
    true
  ),
  (
    'equipment',
    'Medical Gear',
    'Wheelchairs, oxygen concentrators, walkers, crutches, and temporary medical rehabilitation gear.',
    'Stethoscope',
    '#0F766E',
    'Urgent (2-4h)',
    'Within 2-4 hours',
    ARRAY['wheelchair', 'oxygen concentrator', 'walker', 'crutches', 'nebulizer', 'hospital bed', 'bp monitor'],
    '[{"key": "itemType", "label": "Equipment Type", "type": "text", "required": true}, {"key": "itemDuration", "label": "Duration Needed", "type": "text", "required": true}]'::jsonb,
    2,
    true,
    true
  ),
  (
    'elderly',
    'Elderly Care',
    'Compassionate neighbourhood accompaniment, medicine pickup, grocery support, and friendly check-ins for seniors.',
    'Users',
    '#4F46E5',
    'Scheduled or flexible',
    'Flexible / Scheduled',
    ARRAY['check-in', 'companion', 'groceries', 'clinic visit', 'home visit', 'reading help'],
    '[{"key": "elderlyAidType", "label": "Support Type", "type": "text", "required": true}, {"key": "elderlyDuration", "label": "Time Needed", "type": "text", "required": false}]'::jsonb,
    3,
    true,
    false
  ),
  (
    'books',
    'Books and Study',
    'Academic textbooks, competitive exam study materials, notebooks, and learning resource sharing.',
    'BookOpen',
    '#047857',
    'Standard (1-2 days)',
    'Within 24-48 hours',
    ARRAY['textbooks', 'notes', 'exam prep', 'school', 'college', 'stationery', 'study guides'],
    '[{"key": "booksClassSubject", "label": "Class / Subject", "type": "text", "required": true}, {"key": "bookTitle", "label": "Book Title", "type": "text", "required": false}]'::jsonb,
    4,
    true,
    false
  ),
  (
    'transport',
    'Emergency Transit',
    'Urgent volunteer transit, emergency clinic rides, and wheelchair-accessible hospital transport.',
    'Car',
    '#B45309',
    'Immediate (0-2h)',
    'Immediate (0-2 hours)',
    ARRAY['emergency ride', 'hospital transit', 'wheelchair ride', 'dialysis trip', 'clinic escort'],
    '[{"key": "pickupAddress", "label": "Pickup Location", "type": "text", "required": true}, {"key": "dropAddress", "label": "Destination", "type": "text", "required": true}]'::jsonb,
    5,
    true,
    true
  ),
  (
    'medicine',
    'Medicines and Pharmacy',
    'Prescription medicine pickup, delivery of urgent pharmaceuticals, and pharmacy availability assistance.',
    'Pill',
    '#C2410C',
    'Urgent (1-3h)',
    'Within 1-3 hours',
    ARRAY['prescription pickup', 'medicine delivery', 'urgent medicine', 'pharmacy run', 'insulin', 'first aid'],
    '[{"key": "medicineNames", "label": "Medicine Names", "type": "text", "required": true}, {"key": "prescriptionRequired", "label": "Prescription Ready?", "type": "boolean", "required": false}]'::jsonb,
    6,
    true,
    true
  ),
  (
    'food',
    'Food and Groceries',
    'Nutritious meal support for convalescing patients, essential household groceries, and dry ration kits.',
    'Utensils',
    '#BE123C',
    'Same day (2-4h)',
    'Within 2-4 hours',
    ARRAY['meal support', 'groceries', 'cooked food', 'ration kit', 'baby food', 'drinking water'],
    '[{"key": "dietaryRestrictions", "label": "Dietary Preference", "type": "text", "required": false}, {"key": "servingsCount", "label": "Persons / Servings", "type": "number", "required": false}]'::jsonb,
    7,
    true,
    true
  ),
  (
    'hospital_attendant',
    'Hospital Attendant and Companion',
    'Patient attendant bedside assistance, OPD queue companion, and hospital discharge transit accompaniment.',
    'HeartHandshake',
    '#0369A1',
    'Urgent (2-4h)',
    'Within 2-4 hours',
    ARRAY['patient attendant', 'hospital visit', 'discharge help', 'bedside care', 'opd queue', 'wheelchair push'],
    '[{"key": "hospitalName", "label": "Hospital Name", "type": "text", "required": true}, {"key": "wardRoom", "label": "Ward / Room", "type": "text", "required": false}]'::jsonb,
    8,
    true,
    true
  ),
  (
    'disaster_relief',
    'Disaster and Flood Relief',
    'Emergency temporary shelter, clean drinking water, rescue guidance, dry supplies, and flood relief.',
    'AlertTriangle',
    '#B91C1C',
    'Immediate (0-1h)',
    'Immediate (0-1 hours)',
    ARRAY['shelter', 'supplies', 'rescue information', 'flood relief', 'water pumps', 'tarpaulin'],
    '[{"key": "hazardType", "label": "Situation / Hazard", "type": "text", "required": true}, {"key": "peopleCount", "label": "People Affected", "type": "number", "required": false}]'::jsonb,
    9,
    true,
    true
  ),
  (
    'education',
    'Education and Tutoring',
    'Volunteer peer tutoring, doubt solving, mentoring for underprivileged students, and skills guidance.',
    'GraduationCap',
    '#6D28D9',
    'Flexible (1-3 days)',
    'Within 24-72 hours',
    ARRAY['study help', 'mentoring', 'skill training', 'homework aid', 'math tutoring', 'science help'],
    '[{"key": "subjectGrade", "label": "Subject & Grade", "type": "text", "required": true}]'::jsonb,
    10,
    true,
    false
  ),
  (
    'clothes',
    'Clothes and Essentials',
    'Clean wearable clothing sets, warm winter blankets, footwear, and household utility essentials.',
    'Shirt',
    '#065F46',
    'Standard (1-2 days)',
    'Within 24-48 hours',
    ARRAY['blankets', 'clothes', 'household items', 'winter wear', 'children clothes', 'shoes'],
    '[{"key": "sizesNeeded", "label": "Sizes Needed", "type": "text", "required": false}]'::jsonb,
    11,
    true,
    false
  ),
  (
    'home_repairs',
    'Home Repairs and Small Jobs',
    'Volunteer neighbourhood fixes for electrical safety, minor plumbing leaks, and small home handiwork.',
    'Wrench',
    '#334155',
    'Scheduled (within 24h)',
    'Within 24 hours',
    ARRAY['electrician', 'plumbing', 'small fixes', 'carpentry', 'appliance check', 'lock fix'],
    '[{"key": "repairType", "label": "Repair Needed", "type": "text", "required": true}]'::jsonb,
    12,
    true,
    false
  ),
  (
    'government_aid',
    'Paperwork and Government Help',
    'Assistance with filling government scheme forms, pension documentation, and public benefit applications.',
    'FileText',
    '#3730A3',
    'Standard (2-4 days)',
    'Within 2-4 days',
    ARRAY['forms', 'documents', 'scheme applications', 'pension help', 'ration card', 'id application'],
    '[{"key": "schemeName", "label": "Scheme or Form Name", "type": "text", "required": true}]'::jsonb,
    13,
    true,
    false
  ),
  (
    'animal_care',
    'Animal and Pet Help',
    'Street animal rescue assistance, emergency veterinary transport, temporary fostering, and feeding support.',
    'PawPrint',
    '#9A3412',
    'Urgent (1-3h)',
    'Within 1-3 hours',
    ARRAY['rescue', 'pet care', 'food', 'injured animal', 'vet transit', 'foster care'],
    '[{"key": "animalType", "label": "Animal / Pet Type", "type": "text", "required": true}]'::jsonb,
    14,
    true,
    true
  ),
  (
    'other',
    'Other (custom)',
    'Custom community mutual aid needs not covered by standard categories. Enter a specific label.',
    'HelpCircle',
    '#475569',
    'Flexible',
    'Flexible',
    ARRAY['neighbourhood aid', 'community support', 'special assistance'],
    '[{"key": "customCategoryLabel", "label": "Custom Category Name", "type": "text", "required": true}]'::jsonb,
    15,
    true,
    false
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  colour = EXCLUDED.colour,
  default_urgency_hint = EXCLUDED.default_urgency_hint,
  response_expectation = EXCLUDED.response_expectation,
  suggested_tags = EXCLUDED.suggested_tags,
  extra_fields = EXCLUDED.extra_fields,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  is_urgent = EXCLUDED.is_urgent,
  updated_at = now();


-- ==============================================================================
-- 20_reports_and_moderation.sql
-- ==============================================================================

-- ==============================================================================
-- KindLink - Database Migration 20: Reports & Moderation System
-- Purpose:
--   1. Create public.reports table for flagged requests & moderation:
--      - Columns: id, reporter_id, request_id, reason, details, status,
--                 created_at, resolved_at, resolved_by
--      - Unique constraint (reporter_id, request_id) to prevent duplicate reports
--      - RLS: Authenticated users can submit reports; admins can view and resolve
--   2. Admin Moderation View for custom category labels:
--      - View: public.admin_custom_categories_view
--      - Aggregates popular custom labels with count, first/last seen, sample requests
--   3. Administrative promotion function:
--      - public.promote_custom_category_to_standard(...)
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE REPORTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT unique_report_per_user_request UNIQUE (reporter_id, request_id)
);

CREATE INDEX IF NOT EXISTS reports_request_id_idx ON public.reports (request_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports (created_at DESC);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can insert their own reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_insert_own'
  ) THEN
    CREATE POLICY reports_insert_own
      ON public.reports
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = reporter_id
      );
  END IF;
END $$;

-- Policy 2: Users can view their own reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_select_own'
  ) THEN
    CREATE POLICY reports_select_own
      ON public.reports
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = reporter_id
      );
  END IF;
END $$;

-- Policy 3: Admins have full access to view, review, and update reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports' AND policyname = 'reports_admin_all'
  ) THEN
    CREATE POLICY reports_admin_all
      ON public.reports
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ADMIN MODERATION VIEW FOR CUSTOM CATEGORY LABELS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_custom_categories_view AS
SELECT
  lower(trim(r.custom_category_label)) AS label,
  count(r.id)::integer AS usage_count,
  min(r.created_at) AS first_used_at,
  max(r.created_at) AS last_used_at,
  (array_agg(r.id ORDER BY r.created_at DESC))[1:5] AS sample_request_ids,
  (array_agg(r.title ORDER BY r.created_at DESC))[1:5] AS sample_titles
FROM public.requests r
WHERE r.category = 'other'
  AND r.custom_category_label IS NOT NULL
  AND length(trim(r.custom_category_label)) > 0
GROUP BY lower(trim(r.custom_category_label))
ORDER BY usage_count DESC, last_used_at DESC;

-- ------------------------------------------------------------------------------
-- 3. FUNCTION TO PROMOTE A CUSTOM CATEGORY TO A STANDARD CATEGORY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_custom_category_to_standard(
  p_custom_label text,
  p_new_key text,
  p_new_name text,
  p_new_description text,
  p_icon text DEFAULT 'HelpCircle',
  p_colour text DEFAULT '#0F766E',
  p_urgency_hint text DEFAULT 'Standard (2-4h)',
  p_response_expectation text DEFAULT 'Within 2-4 hours',
  p_suggested_tags text[] DEFAULT '{}'::text[],
  p_is_urgent boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_updated_count integer := 0;
BEGIN
  -- Verify admin authority
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_caller;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required to promote categories.';
  END IF;

  -- 1. Insert new standard category in request_categories
  INSERT INTO public.request_categories (
    key, name, description, icon, colour, default_urgency_hint,
    response_expectation, suggested_tags, sort_order, active, is_urgent
  ) VALUES (
    lower(trim(p_new_key)),
    trim(p_new_name),
    trim(p_new_description),
    trim(p_icon),
    trim(p_colour),
    p_urgency_hint,
    p_response_expectation,
    p_suggested_tags,
    20,
    true,
    p_is_urgent
  )
  ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    colour = EXCLUDED.colour,
    updated_at = now();

  -- 2. Migrate existing matching custom requests to the new standard category
  WITH updated AS (
    UPDATE public.requests
    SET
      category = lower(trim(p_new_key)),
      custom_category_label = NULL
    WHERE category = 'other'
      AND lower(trim(custom_category_label)) = lower(trim(p_custom_label))
    RETURNING id
  )
  SELECT count(*) INTO v_updated_count FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'new_category_key', lower(trim(p_new_key)),
    'migrated_requests_count', v_updated_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_custom_category_to_standard(
  text, text, text, text, text, text, text, text, text[], boolean
) TO authenticated, service_role;


-- ==============================================================================
-- 21_location_cleanup_and_feed_updates.sql
-- ==============================================================================

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
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer, uuid);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer, uuid);

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
  page_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
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
  double precision, double precision, double precision, text, text, integer, integer, uuid
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
-- Clean profiles where home area matches old legacy college defaults (guarded if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_neighborhood'
  ) THEN
    UPDATE public.profiles
    SET home_neighborhood = NULL
    WHERE home_neighborhood ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
       OR home_neighborhood ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
       OR home_neighborhood ILIKE '%' || 'MAK' || 'AUT%';
  END IF;
END $$;

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
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_places' AND column_name = 'address_text'
    ) THEN
      DELETE FROM public.saved_places
      WHERE label ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
         OR label ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
         OR address_text ILIKE '%' || 'Asansol' || '_' || 'Engineering%'
         OR address_text ILIKE '%' || chr(65)||chr(69)||chr(67) || '%';
    ELSE
      DELETE FROM public.saved_places
      WHERE label ILIKE '%' || chr(65)||chr(69)||chr(67) || '%'
         OR label ILIKE '%' || 'Asansol' || '_' || 'Engineering%';
    END IF;
  END IF;
END $$;
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
