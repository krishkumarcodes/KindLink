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

-- 4. PostGIS helper: ensure ST_DWithin resolves gracefully if tolerance is passed as numeric
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    CREATE OR REPLACE FUNCTION extensions.st_dwithin(
      geog1 extensions.geography,
      geog2 extensions.geography,
      tolerance numeric
    )
    RETURNS boolean
    LANGUAGE sql
    IMMUTABLE
    AS $f$
      SELECT extensions.ST_DWithin(geog1, geog2, tolerance::double precision);
    $f$;

    CREATE OR REPLACE FUNCTION public.st_dwithin(
      geog1 extensions.geography,
      geog2 extensions.geography,
      tolerance numeric
    )
    RETURNS boolean
    LANGUAGE sql
    IMMUTABLE
    AS $f$
      SELECT extensions.ST_DWithin(geog1, geog2, tolerance::double precision);
    $f$;
  END IF;
END $$;

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

-- 8. SOS EVENTS TABLE (Kinetic accelerometer fall detection triggers & Emergency SOS)
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
-- KindLink - Database Migration 05: Core Stored Procedures & Physics Engines
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Implement the Newtonian Help Gravity algorithm in SQL, safe contact
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

-- 2. NEARBY REQUESTS WITH NEWTONIAN HELP GRAVITY ENGINE
-- Formula: score = typeWeight * (1 + 0.05 * waitingMinutes) / (1 + distanceKm)^2
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
  help_gravity_score double precision,
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
    ROUND((public.category_weight(c.category) * (1.0 + 0.05 * c.waiting_minutes) / power(1.0 + c.distance_km, 2))::numeric, 2)::double precision AS help_gravity_score,
    c.accepted_helper_id,
    c.created_at
  FROM computed c
  ORDER BY help_gravity_score DESC, c.created_at DESC
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

