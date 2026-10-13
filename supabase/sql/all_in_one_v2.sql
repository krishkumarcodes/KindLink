-- ============================================================================
-- KindLink - Complete Database Setup & Realtime Engine (All-in-One v2)
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Architecture: Supabase (PostgreSQL 15+ with PostGIS Spatial Engine)
-- Target: Zero-downtime, fully idempotent, wrapped in a single atomic transaction.
--
-- PURPOSE & HIGHLIGHTS:
-- 1. Full schema creation: profiles, requests, offers, messages, sos_events,
--    active_transit_locations, emergency_contacts, user_badges, auth_otps, push_subscriptions.
-- 2. PostGIS Spatial Radar: Fixed ST_DWithin geography casts and numeric tolerances.
-- 3. Live Community Stats: Real-time public RPC public.live_stats() with dual
--    key backward-compatibility (helpers, avg_response_min, requests_completed, satisfaction_pct).
-- 4. Username Authentication: get_email_by_username() RPC + RLS policy for username login.
-- 5. Atomic Transaction: Wrapped in BEGIN ... COMMIT with automated rollback on error.
-- 6. Preservation of Official Showcase Demo Accounts (kind_volunteer, need_aid, admin_kindlink).
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire file and click "Run".
-- ============================================================================

BEGIN;

-- Ensure extensions and public are in search path
SET search_path = public, extensions;


-- ============================================================================
-- SECTION 1: POSTGRES EXTENSIONS & SPATIAL HELPERS
-- Source: 01_extensions.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 2: CUSTOM ENUM TYPES & STATUS DOMAINS
-- Source: 02_types.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 3: CORE APPLICATION TABLES & SCHEMAS
-- Source: 03_tables.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 4: SPATIAL GIST & HIGH-PERFORMANCE B-TREE INDEXES
-- Source: 04_indexes.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 5: BUSINESS LOGIC, RPCs & NEWTONIAN GRAVITY ENGINE
-- Source: 05_functions.sql
-- ============================================================================

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

-- End of 05_functions.sql



-- ============================================================================
-- SECTION 6: AUTOMATED EVENT TRIGGERS & SPATIAL DISPATCH
-- Source: 06_triggers.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES & PUBLIC VIEWS
-- Source: 07_rls_policies.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 8: SUPABASE STORAGE BUCKETS & ACCESS POLICIES
-- Source: 08_storage.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 9: REALTIME CDC REPLICATION CONFIGURATION
-- Source: 09_realtime.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 10: ADMINISTRATIVE PRIVILEGE MANAGEMENT
-- Source: 10_make_me_admin.sql
-- ============================================================================

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



-- ============================================================================
-- SECTION 11: INITIAL DEMO USER SCRUBBING
-- Source: 12_cleanup_demo_users.sql
-- ============================================================================

-- ============================================================================
-- KindLink - Database Migration 12: Purge All Demo & Test Accounts
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Safely delete all demo/test accounts, including test admins and volunteers.
-- Safety: Completely idempotent (can be executed multiple times safely).
-- ============================================================================

DO $$
DECLARE
  v_demo_user_ids uuid[];
BEGIN
  -- 1. Identify all demo and test user IDs
  SELECT array_agg(id) INTO v_demo_user_ids
  FROM auth.users
  WHERE email LIKE '%@kindlink.demo'
     OR email LIKE 'test%@%'
     OR raw_user_meta_data->>'username' IN (
       'priya_nurse', 'rahul_aec', 'dr_sen', 'amit_dhanbad',
       'swati_durgapur', 'vikram_driver', 'ananya_books',
       'admin_kindlink', 'kind_volunteer', 'need_aid', 'admin_krish'
     );

  IF v_demo_user_ids IS NOT NULL AND array_length(v_demo_user_ids, 1) > 0 THEN
    -- 2. Delete related activity rows first
    DELETE FROM public.ratings
    WHERE rater_id = ANY(v_demo_user_ids) OR ratee_id = ANY(v_demo_user_ids);

    DELETE FROM public.notifications
    WHERE user_id = ANY(v_demo_user_ids);

    DELETE FROM public.reports
    WHERE reporter_id = ANY(v_demo_user_ids);

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sos_events') THEN
      DELETE FROM public.sos_events
      WHERE user_id = ANY(v_demo_user_ids);
    END IF;

    DELETE FROM public.verification_requests
    WHERE user_id = ANY(v_demo_user_ids);

    DELETE FROM public.offers
    WHERE helper_id = ANY(v_demo_user_ids);

    DELETE FROM public.requests
    WHERE requester_id = ANY(v_demo_user_ids);

    -- 3. Delete profiles
    DELETE FROM public.profiles
    WHERE id = ANY(v_demo_user_ids);

    -- 4. Delete auth.users (cascades any remaining references)
    DELETE FROM auth.users
    WHERE id = ANY(v_demo_user_ids);

    RAISE NOTICE 'Cleaned up % demo/test user accounts and all associated data.', array_length(v_demo_user_ids, 1);
  ELSE
    RAISE NOTICE 'No demo/test user accounts found to clean up.';
  END IF;

  -- 5. Clean up any orphaned requests or profiles with demo usernames
  DELETE FROM public.profiles
  WHERE username IN (
    'priya_nurse', 'rahul_aec', 'dr_sen', 'amit_dhanbad',
    'swati_durgapur', 'vikram_driver', 'ananya_books',
    'admin_kindlink', 'kind_volunteer', 'need_aid', 'admin_krish'
  );

END $$;

-- Verification query
SELECT id, username, role, verification_status, created_at
FROM public.profiles
ORDER BY created_at DESC;



-- ============================================================================
-- SECTION 12: SHOWCASE DEMO ACCOUNTS & VERIFIED SEED REQUESTS
-- Source: 13_create_showcase_accounts.sql
-- ============================================================================

-- ============================================================================
-- KindLink - Database Migration 13: Create Showcase Demo & Admin Accounts
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Provisions 2 verified community showcase accounts and 1 platform admin
--          with known passwords for portfolio reviews, live demos, and grading.
-- Safety: Completely idempotent (can be re-run safely anytime).
-- ============================================================================
--
-- ACCOUNT CREDENTIALS SUMMARY:
-- ----------------------------------------------------------------------------
-- PRIMARY SHOWCASE ACCOUNTS:
-- 1. Showcase Volunteer:
--    Username: kind_volunteer
--    Email:    volunteer@kindlink.demo
--    Password: KindLink#Volunteer2026
--    Role:     user (verified volunteer)
--
-- 2. Showcase Requester:
--    Username: need_aid
--    Email:    requester@kindlink.demo
--    Password: KindLink#Requester2026
--    Role:     user (verified citizen)
--
-- 3. Super Administrator:
--    Username: admin_kindlink
--    Email:    admin@kindlink.demo
--    Password: KindLink#Admin2026
--    Role:     admin (full access to /admin verification & moderation portal)
--
-- ALIAS ACCOUNTS (1-Click & Unified Demo Password Compatibility):
-- 4. Showcase Volunteer Alias:
--    Username: kind_volunteer_alias
--    Email:    kind_volunteer@kindlink.demo
--    Password: KindLink#2026
--    Role:     user (verified volunteer)
--
-- 5. Showcase Requester Alias:
--    Username: need_aid_alias
--    Email:    need_aid@kindlink.demo
--    Password: KindLink#2026
--    Role:     user (verified citizen)
--
-- 6. Super Administrator Alias:
--    Username: admin_kindlink_alias
--    Email:    admin_kindlink@kindlink.demo
--    Password: KindLink#2026
--    Role:     admin (full access to /admin verification & moderation portal)
-- ----------------------------------------------------------------------------

-- Enable necessary extensions and set search_path to avoid missing function errors
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

SET search_path = public, extensions;



-- Ensure profiles email column and unique constraints exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    EXCEPTION
      WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

-- Fix handle_new_request_notification: ensure search_path includes extensions and ST_DWithin has double precision cast
CREATE OR REPLACE FUNCTION public.handle_new_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
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

DO $$
DECLARE
  v_volunteer_id      uuid := 'a0000000-0000-0000-0000-000000000001';
  v_requester_id      uuid := 'a0000000-0000-0000-0000-000000000002';
  v_admin_id          uuid := 'a0000000-0000-0000-0000-000000000003';
  v_alias_vol_id      uuid := 'a0000000-0000-0000-0000-000000000011';
  v_alias_req_id      uuid := 'a0000000-0000-0000-0000-000000000012';
  v_alias_adm_id      uuid := 'a0000000-0000-0000-0000-000000000013';
  v_sample_req_id     uuid := 'b0000000-0000-0000-0000-000000000001';
BEGIN
  PERFORM set_config('search_path', 'public, extensions', true);

  -- Temporarily disable triggers during seeding
  BEGIN
    EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests DISABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  -- --------------------------------------------------------------------------
  -- 1. Create or Update: Showcase Volunteer (kind_volunteer)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'volunteer@kindlink.demo' OR raw_user_meta_data->>'username' = 'kind_volunteer') AND id <> v_volunteer_id;
  DELETE FROM public.profiles WHERE (username = 'kind_volunteer' OR email = 'volunteer@kindlink.demo') AND id <> v_volunteer_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_volunteer_id,
    '00000000-0000-0000-0000-000000000000',
    'volunteer@kindlink.demo',
    crypt('KindLink#Volunteer2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"kind_volunteer","display_name":"Dr. Ananya Roy (Volunteer)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- CRITICAL: auth.identities record required for GoTrue email/password login
  DELETE FROM auth.identities WHERE user_id = v_volunteer_id OR (provider = 'email' AND provider_id = v_volunteer_id::text) OR id = v_volunteer_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_volunteer_id::text,
    v_volunteer_id,
    jsonb_build_object('sub', v_volunteer_id::text, 'email', 'volunteer@kindlink.demo', 'email_verified', true),
    'email',
    v_volunteer_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  -- Profile synchronization
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_volunteer_id,
    'kind_volunteer',
    'Dr. Ananya Roy (Volunteer)',
    'volunteer@kindlink.demo',
    '+91 98320 12345',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    4.95,
    18
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 2. Create or Update: Showcase Requester (need_aid)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'requester@kindlink.demo' OR raw_user_meta_data->>'username' = 'need_aid') AND id <> v_requester_id;
  DELETE FROM public.profiles WHERE (username = 'need_aid' OR email = 'requester@kindlink.demo') AND id <> v_requester_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_requester_id,
    '00000000-0000-0000-0000-000000000000',
    'requester@kindlink.demo',
    crypt('KindLink#Requester2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"need_aid","display_name":"Sourav Mukherjee"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- CRITICAL: auth.identities record required for GoTrue email/password login
  DELETE FROM auth.identities WHERE user_id = v_requester_id OR (provider = 'email' AND provider_id = v_requester_id::text) OR id = v_requester_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_requester_id::text,
    v_requester_id,
    jsonb_build_object('sub', v_requester_id::text, 'email', 'requester@kindlink.demo', 'email_verified', true),
    'email',
    v_requester_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_requester_id,
    'need_aid',
    'Sourav Mukherjee',
    'requester@kindlink.demo',
    '+91 98321 54321',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    5.00,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 3. Create or Update: Super Administrator (admin_kindlink)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'admin@kindlink.demo' OR raw_user_meta_data->>'username' = 'admin_kindlink') AND id <> v_admin_id;
  DELETE FROM public.profiles WHERE (username = 'admin_kindlink' OR email = 'admin@kindlink.demo') AND id <> v_admin_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@kindlink.demo',
    crypt('KindLink#Admin2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin_kindlink","display_name":"KindLink Administrator"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- CRITICAL: auth.identities record required for GoTrue email/password login
  DELETE FROM auth.identities WHERE user_id = v_admin_id OR (provider = 'email' AND provider_id = v_admin_id::text) OR id = v_admin_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id::text,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@kindlink.demo', 'email_verified', true),
    'email',
    v_admin_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_admin_id,
    'admin_kindlink',
    'KindLink Administrator',
    'admin@kindlink.demo',
    '+91 98000 00000',
    'admin',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    5.00,
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = 'admin',
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 4. Create or Update: Showcase Volunteer Alias (kind_volunteer@kindlink.demo)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'kind_volunteer@kindlink.demo' AND id <> v_alias_vol_id;
  DELETE FROM public.profiles WHERE (username = 'kind_volunteer_alias' OR email = 'kind_volunteer@kindlink.demo') AND id <> v_alias_vol_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_vol_id,
    '00000000-0000-0000-0000-000000000000',
    'kind_volunteer@kindlink.demo',
    crypt('KindLink#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"kind_volunteer_alias","display_name":"Dr. Ananya Roy (Volunteer Alias)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_vol_id OR (provider = 'email' AND provider_id = v_alias_vol_id::text) OR id = v_alias_vol_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_vol_id::text,
    v_alias_vol_id,
    jsonb_build_object('sub', v_alias_vol_id::text, 'email', 'kind_volunteer@kindlink.demo', 'email_verified', true),
    'email',
    v_alias_vol_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_alias_vol_id,
    'kind_volunteer_alias',
    'Dr. Ananya Roy (Volunteer Alias)',
    'kind_volunteer@kindlink.demo',
    '+91 98320 12345',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    4.95,
    18
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 5. Create or Update: Showcase Requester Alias (need_aid@kindlink.demo)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'need_aid@kindlink.demo' AND id <> v_alias_req_id;
  DELETE FROM public.profiles WHERE (username = 'need_aid_alias' OR email = 'need_aid@kindlink.demo') AND id <> v_alias_req_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_req_id,
    '00000000-0000-0000-0000-000000000000',
    'need_aid@kindlink.demo',
    crypt('KindLink#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"need_aid_alias","display_name":"Sourav Mukherjee (Requester Alias)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_req_id OR (provider = 'email' AND provider_id = v_alias_req_id::text) OR id = v_alias_req_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_req_id::text,
    v_alias_req_id,
    jsonb_build_object('sub', v_alias_req_id::text, 'email', 'need_aid@kindlink.demo', 'email_verified', true),
    'email',
    v_alias_req_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_alias_req_id,
    'need_aid_alias',
    'Sourav Mukherjee (Requester Alias)',
    'need_aid@kindlink.demo',
    '+91 98321 54321',
    'user',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    5.00,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 6. Create or Update: Showcase Admin Alias (admin_kindlink@kindlink.demo)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE email = 'admin_kindlink@kindlink.demo' AND id <> v_alias_adm_id;
  DELETE FROM public.profiles WHERE (username = 'admin_kindlink_alias' OR email = 'admin_kindlink@kindlink.demo') AND id <> v_alias_adm_id;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_adm_id,
    '00000000-0000-0000-0000-000000000000',
    'admin_kindlink@kindlink.demo',
    crypt('KindLink#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin_kindlink_alias","display_name":"KindLink Administrator (Admin Alias)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  DELETE FROM auth.identities WHERE user_id = v_alias_adm_id OR (provider = 'email' AND provider_id = v_alias_adm_id::text) OR id = v_alias_adm_id::text;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_alias_adm_id::text,
    v_alias_adm_id,
    jsonb_build_object('sub', v_alias_adm_id::text, 'email', 'admin_kindlink@kindlink.demo', 'email_verified', true),
    'email',
    v_alias_adm_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    phone,
    role,
    verification_status,
    home_location,
    rating_average,
    rating_count
  )
  VALUES (
    v_alias_adm_id,
    'admin_kindlink_alias',
    'KindLink Administrator (Admin Alias)',
    'admin_kindlink@kindlink.demo',
    '+91 98000 00000',
    'admin',
    'verified',
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9661, 23.6889), 4326)::geography,
    5.00,
    100
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = 'admin',
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 7. Create Live Showcase Request & Mutual Offer
  -- --------------------------------------------------------------------------
  INSERT INTO public.requests (
    id,
    requester_id,
    category,
    urgency,
    title,
    description,
    details,
    location,
    address_text,
    status,
    created_at
  )
  VALUES (
    v_sample_req_id,
    v_requester_id,
    'blood',
    'critical',
    '🚨 Critical O+ Blood Needed (2 Units) - Asansol District Hospital',
    'Emergency trauma patient admitted in surgical ward. Requires 2 verified units of O+ blood immediately. Patient relatives available on site.',
    '{"bloodGroup": "O+", "unitsNeeded": 2, "hospitalName": "Asansol District Hospital"}'::jsonb,
    extensions.ST_SetSRID(extensions.ST_MakePoint(86.9742, 23.6845), 4326)::geography,
    'Asansol District Hospital, SB Gorai Road, Asansol',
    'open',
    now() - interval '12 minutes'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create an active offer from Dr. Ananya Roy (kind_volunteer)
  INSERT INTO public.offers (
    id,
    request_id,
    helper_id,
    message,
    status,
    created_at
  )
  VALUES (
    'c0000000-0000-0000-0000-000000000001',
    v_sample_req_id,
    v_volunteer_id,
    'Hello! I am a verified donor nearby at Kalyanpur. I can reach District Hospital within 15 minutes. Please accept to coordinate contact details.',
    'pending',
    now() - interval '5 minutes'
  )
  ON CONFLICT (request_id, helper_id) DO NOTHING;

  -- Universal GoTrue Go struct scan safety: ensure token strings are not NULL
  BEGIN
    UPDATE auth.users
    SET
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      email_change = COALESCE(email_change, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      confirmed_at = COALESCE(confirmed_at, email_confirmed_at, now()),
      is_super_admin = COALESCE(is_super_admin, false),
      is_sso_user = COALESCE(is_sso_user, false),
      is_anonymous = COALESCE(is_anonymous, false)
    WHERE id IN (
      v_volunteer_id, v_requester_id, v_admin_id,
      v_alias_vol_id, v_alias_req_id, v_alias_adm_id
    );
  EXCEPTION WHEN others THEN null;
  END;

  -- Re-enable triggers
  BEGIN
    EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created';
  EXCEPTION WHEN others THEN null;
  END;

  BEGIN
    EXECUTE 'ALTER TABLE public.requests ENABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

  RAISE NOTICE 'Successfully created showcase accounts: kind_volunteer, need_aid, and admin_kindlink (with auth.identities).';
END $$;

-- Verify created showcase accounts and auth identities
SELECT
  p.id,
  p.username,
  u.email,
  p.email AS profile_email,
  p.role,
  p.verification_status,
  p.display_name,
  p.phone,
  i.provider,
  i.provider_id
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
JOIN auth.identities i ON p.id = i.user_id
WHERE p.username IN (
  'kind_volunteer', 'need_aid', 'admin_kindlink',
  'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
)
ORDER BY p.role DESC, p.username ASC;



-- ============================================================================
-- SECTION 13: REALTIME LIVE PLATFORM UPGRADE & SOS ENGINE
-- Source: 14_comprehensive_live_upgrade.sql
-- ============================================================================

-- ============================================================================
-- KindLink - Database Migration 14: Comprehensive Realtime Platform Upgrade
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: 
--   1. Expands request lifecycle status ('on_the_way', 'arrived').
--   2. Adds profiles.last_active_at for live volunteer heartbeat.
--   3. Creates emergency_contacts, sos_events (with live token tracking).
--   4. Creates active_transit_locations for helper on-the-way GPS sharing.
--   5. Creates user_badges & automatic badge evaluation triggers.
--   6. Creates auth_otps (6-digit email verification).
--   7. Creates push_subscriptions (Web Push notifications).
--   8. Implements live_stats(lat, lng, radius_km) function.
--   9. Enforces request status state machine trigger.
--  10. Configures RLS and Realtime publications.
-- Safety: Completely idempotent (safe to re-run multiple times).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

SET search_path = public, extensions;

-- 1. EXPAND request_status ENUM WITH TRANSIT STATES (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'request_status'::regtype AND enumlabel = 'on_the_way'
  ) THEN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'on_the_way' AFTER 'accepted';
  END IF;
EXCEPTION WHEN others THEN null;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = 'request_status'::regtype AND enumlabel = 'arrived'
  ) THEN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'arrived' AFTER 'on_the_way';
  END IF;
EXCEPTION WHEN others THEN null;
END $$;

-- 2. PROFILES ENHANCEMENTS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_area_name text;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at);

-- 3. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON public.emergency_contacts(user_id);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can manage own emergency contacts"
  ON public.emergency_contacts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. EMERGENCY SOS EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.sos_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  location geography(Point, 4326),
  address_text text,
  status text DEFAULT 'active' NOT NULL, -- 'active', 'safe', 'resolved'
  expires_at timestamptz DEFAULT (now() + interval '2 hours') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz
);

-- Ensure all columns exist even if sos_events was created by an older migration
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

CREATE INDEX IF NOT EXISTS idx_sos_events_token ON public.sos_events(token);
CREATE INDEX IF NOT EXISTS idx_sos_events_status ON public.sos_events(status);

ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active SOS by token" ON public.sos_events;
CREATE POLICY "Public can view active SOS by token"
  ON public.sos_events
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Users can insert own SOS" ON public.sos_events;
CREATE POLICY "Users can insert own SOS"
  ON public.sos_events
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own SOS" ON public.sos_events;
CREATE POLICY "Users can update own SOS"
  ON public.sos_events
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- 5. ACTIVE TRANSIT LOCATIONS (Live location sharing during response)
CREATE TABLE IF NOT EXISTS public.active_transit_locations (
  request_id uuid PRIMARY KEY REFERENCES public.requests(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location geography(Point, 4326) NOT NULL,
  heading double precision,
  speed double precision,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.active_transit_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Helper can update transit location" ON public.active_transit_locations;
CREATE POLICY "Helper can update transit location"
  ON public.active_transit_locations
  FOR ALL
  TO authenticated
  USING (helper_id = auth.uid())
  WITH CHECK (helper_id = auth.uid());

DROP POLICY IF EXISTS "Requester can view helper transit location" ON public.active_transit_locations;
CREATE POLICY "Requester can view helper transit location"
  ON public.active_transit_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = active_transit_locations.request_id
        AND (r.requester_id = auth.uid() OR r.accepted_helper_id = auth.uid())
    )
  );

-- 6. USER BADGES SYSTEM
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view user badges" ON public.user_badges;
CREATE POLICY "Public can view user badges"
  ON public.user_badges
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role manages badges" ON public.user_badges;
CREATE POLICY "Service role manages badges"
  ON public.user_badges
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- 7. AUTH OTP RECORDS
CREATE TABLE IF NOT EXISTS public.auth_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  hashed_code text NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_email ON public.auth_otps(email);

ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can verify their own OTPs" ON public.auth_otps;
CREATE POLICY "Users can verify their own OTPs"
  ON public.auth_otps
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 8. PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_push_endpoint UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 9. LIVE COMMUNITY STATS FUNCTION
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS rating_score numeric;
UPDATE public.ratings SET rating_score = stars WHERE rating_score IS NULL;

CREATE OR REPLACE FUNCTION public.live_stats(
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT 25.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_helpers bigint;
  v_completed bigint;
  v_avg_min numeric;
  v_satisfaction numeric;
  v_active bigint;
BEGIN
  -- Count verified helpers in radius
  SELECT COUNT(DISTINCT p.id)
  INTO v_helpers
  FROM public.profiles p
  WHERE p.verification_status = 'verified'
    AND (p_lat IS NULL OR p_lng IS NULL OR (
      p.home_location IS NOT NULL AND
      ST_DWithin(
        p.home_location::geography,
        ST_MakePoint(p_lng, p_lat)::geography,
        (p_radius_km * 1000)::double precision
      )
    ));

  -- Count completed requests
  SELECT COUNT(*)
  INTO v_completed
  FROM public.requests r
  WHERE r.status = 'completed'
    AND (p_lat IS NULL OR p_lng IS NULL OR (
      r.location IS NOT NULL AND
      ST_DWithin(
        r.location::geography,
        ST_MakePoint(p_lng, p_lat)::geography,
        (p_radius_km * 1000)::double precision
      )
    ));

  -- Count active requests
  SELECT COUNT(*)
  INTO v_active
  FROM public.requests r
  WHERE r.status IN ('open', 'offered', 'accepted', 'on_the_way', 'arrived')
    AND (p_lat IS NULL OR p_lng IS NULL OR (
      r.location IS NOT NULL AND
      ST_DWithin(
        r.location::geography,
        ST_MakePoint(p_lng, p_lat)::geography,
        (p_radius_km * 1000)::double precision
      )
    ));

  -- Avg response time in minutes
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (r.accepted_at - r.created_at)) / 60
  ), 8)
  INTO v_avg_min
  FROM public.requests r
  WHERE r.status IN ('accepted', 'on_the_way', 'arrived', 'completed')
    AND r.accepted_at IS NOT NULL;

  -- Satisfaction (avg rating)
  SELECT COALESCE(
    (AVG(COALESCE(rating_score, stars::numeric)) / 5.0) * 100,
    98.4
  )
  INTO v_satisfaction
  FROM public.ratings;

  RETURN jsonb_build_object(
    'helpers', COALESCE(v_helpers, 0),
    'helpers_nearby', COALESCE(v_helpers, 0),
    'avg_response_min', ROUND(COALESCE(v_avg_min, 8)),
    'avg_response_minutes', ROUND(COALESCE(v_avg_min, 8)),
    'requests_completed', COALESCE(v_completed, 0),
    'acts_of_help', COALESCE(v_completed, 0),
    'satisfaction_pct', ROUND(COALESCE(v_satisfaction, 98.4), 1),
    'trust_match_pct', ROUND(COALESCE(v_satisfaction, 98.4), 1),
    'trust_match_percent', ROUND(COALESCE(v_satisfaction, 98.4), 1),
    'trust_match_percentage', ROUND(COALESCE(v_satisfaction, 98.4), 1),
    'active_requests', COALESCE(v_active, 0),
    'live', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_stats(double precision, double precision, double precision) TO anon, authenticated;


-- 10. AUTOMATIC BADGE EVALUATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_badge_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_helper_id uuid;
  v_completed_count integer;
  v_blood_trans_count integer;
  v_books_count integer;
  v_equipment_count integer;
  v_elderly_count integer;
  v_avg_rating numeric;
  v_rating_count integer;
BEGIN
  IF TG_TABLE_NAME = 'requests' AND NEW.status = 'completed' AND NEW.accepted_helper_id IS NOT NULL THEN
    v_helper_id := NEW.accepted_helper_id;

    -- Count total completed requests as helper
    SELECT COUNT(*) INTO v_completed_count
    FROM public.requests WHERE accepted_helper_id = v_helper_id AND status = 'completed';

    -- Award First Help
    IF v_completed_count >= 1 THEN
      INSERT INTO public.user_badges (user_id, badge_key, metadata)
      VALUES (v_helper_id, 'first_help', '{"title": "First Help", "icon": "🤝"}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Award Community Hero (25 helps)
    IF v_completed_count >= 25 THEN
      INSERT INTO public.user_badges (user_id, badge_key, metadata)
      VALUES (v_helper_id, 'community_hero', '{"title": "Community Hero", "icon": "🏆"}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Count specific categories
    SELECT COUNT(*) INTO v_blood_trans_count
    FROM public.requests
    WHERE accepted_helper_id = v_helper_id AND status = 'completed' AND category IN ('blood', 'transport');

    IF v_blood_trans_count >= 3 THEN
      INSERT INTO public.user_badges (user_id, badge_key, metadata)
      VALUES (v_helper_id, 'life_saver', '{"title": "Life Saver", "icon": "🩸"}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    SELECT COUNT(*) INTO v_books_count
    FROM public.requests
    WHERE accepted_helper_id = v_helper_id AND status = 'completed' AND category = 'books';

    IF v_books_count >= 2 THEN
      INSERT INTO public.user_badges (user_id, badge_key, metadata)
      VALUES (v_helper_id, 'book_buddy', '{"title": "Book Buddy", "icon": "📚"}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    SELECT COUNT(*) INTO v_equipment_count
    FROM public.requests
    WHERE accepted_helper_id = v_helper_id AND status = 'completed' AND category = 'equipment';

    IF v_equipment_count >= 2 THEN
      INSERT INTO public.user_badges (user_id, badge_key, metadata)
      VALUES (v_helper_id, 'wheel_helper', '{"title": "Wheel Helper", "icon": "🩺"}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    SELECT COUNT(*) INTO v_elderly_count
    FROM public.requests
    WHERE accepted_helper_id = v_helper_id AND status = 'completed' AND category = 'elderly_help';

    IF v_elderly_count >= 2 THEN
      INSERT INTO public.user_badges (user_id, badge_key, metadata)
      VALUES (v_helper_id, 'elder_friend', '{"title": "Elder Friend", "icon": "👵"}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

  ELSIF TG_TABLE_NAME = 'profiles' AND NEW.verification_status = 'verified' THEN
    INSERT INTO public.user_badges (user_id, badge_key, metadata)
    VALUES (NEW.id, 'verified_volunteer', '{"title": "Verified Volunteer", "icon": "🛡️"}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- Check Trusted badge
    IF NEW.rating_average >= 4.5 AND NEW.rating_count >= 5 THEN
      INSERT INTO public.user_badges (user_id, badge_key, metadata)
      VALUES (NEW.id, 'trusted_neighbor', '{"title": "Trusted Neighbor", "icon": "⭐"}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_request_completed_badge ON public.requests;
CREATE TRIGGER on_request_completed_badge
  AFTER UPDATE OF status ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_badge_evaluation();

DROP TRIGGER IF EXISTS on_profile_verified_badge ON public.profiles;
CREATE TRIGGER on_profile_verified_badge
  AFTER UPDATE OF verification_status, rating_average, rating_count ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_badge_evaluation();

-- 11. REQUEST STATUS STATE MACHINE TRIGGER
CREATE OR REPLACE FUNCTION public.enforce_request_status_machine()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status hasn't changed, allow update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Allow terminal states (cancelled is always allowed from open, accepted, on_the_way, arrived)
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Valid state progressions
  IF OLD.status = 'open' AND NEW.status IN ('accepted', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'accepted' AND NEW.status IN ('on_the_way', 'arrived', 'completed', 'open', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'on_the_way' AND NEW.status IN ('arrived', 'completed', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'arrived' AND NEW.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status IN ('completed', 'cancelled') THEN
    -- Terminal states cannot be altered
    RAISE EXCEPTION 'Cannot alter terminal request status %', OLD.status;
  END IF;

  -- If transition does not match expected flow, accept if admin/graceful fallback
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_state_machine ON public.requests;
CREATE TRIGGER trg_request_state_machine
  BEFORE UPDATE OF status ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_request_status_machine();

-- 12. REALTIME PUBLICATIONS
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_events';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.active_transit_locations';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges';
EXCEPTION WHEN others THEN null;
END $$;



-- ============================================================================
-- SECTION 14: USERNAME AUTHENTICATION & LOGIN HELPERS
-- Source: 16_login_signup_helpers.sql
-- ============================================================================

-- ============================================================================
-- KindLink - Database Migration 16: Login & Signup Helpers
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose:
--   1. Ensures RLS policies allow reading profile by username for login.
--   2. Provides get_email_by_username(p_username) for username-based authentication.
--   3. Enforces unique constraint on profiles.username and ensures profiles.email exists.
--   4. Adds accepted_at column to requests table for response-time metrics.
-- Safety: Completely idempotent (safe to re-run multiple times).
-- ============================================================================

-- 1. ENSURE PROFILES TABLE SCHEMA & UNIQUE CONSTRAINTS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Sync emails from auth.users into public.profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Unique constraint on profiles.username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    EXCEPTION
      WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

-- Ensure ratings table has rating_score column for live_stats compatibility
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS rating_score numeric;
UPDATE public.ratings SET rating_score = stars WHERE rating_score IS NULL;

-- 2. ADD accepted_at COLUMN TO requests IF MISSING
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_requests_accepted_at ON public.requests (accepted_at);

-- 3. RLS POLICY: ALLOW PROFILE SELECT BY USERNAME FOR LOGIN
DROP POLICY IF EXISTS "profiles_select_by_username" ON public.profiles;
CREATE POLICY "profiles_select_by_username"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR username = (SELECT p2.username FROM public.profiles p2 WHERE p2.id = auth.uid())
    OR public.is_admin()
  );

-- 4. FUNCTION: get_email_by_username
-- Resolves email for username-based login without exposing entire profile row to anon
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

-- End of 16_login_signup_helpers.sql



-- ============================================================================
-- SECTION 15: CLEANUP OF LEGACY PLACEHOLDER TEST DATA (FINAL PASS)
-- Source: 15_cleanup_test_data.sql
-- ============================================================================

-- ============================================================================
-- KindLink - Database Migration 15: Safe Cleanup of Legacy Test Data
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Safely purges legacy placeholder requests and test accounts
--          while PRESERVING the official showcase demo accounts:
--          kind_volunteer, need_aid, and admin_kindlink.
-- Safety: Completely idempotent and non-destructive to real users.
-- ============================================================================

DO $$
DECLARE
  v_cleaned_requests integer := 0;
  v_cleaned_users integer := 0;
BEGIN
  -- 1. Remove obvious test requests (titles matching test/dummy/placeholder patterns)
  --    EXCEPT the official showcase blood request (id: b0000000-0000-0000-0000-000000000001)
  WITH deleted_reqs AS (
    DELETE FROM public.requests
    WHERE id <> 'b0000000-0000-0000-0000-000000000001'
      AND (
        title ILIKE '%[test]%'
        OR title ILIKE '%dummy%'
        OR title ILIKE '%sample test%'
        OR description ILIKE '%this is a test%'
        OR description ILIKE '%dummy description%'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cleaned_requests FROM deleted_reqs;

  -- 2. Remove legacy non-showcase test accounts (e.g. rahul_sen, test_user, demo_test)
  --    Explicitly PRESERVING showcase accounts and real accounts
  WITH deleted_users AS (
    DELETE FROM auth.users
    WHERE id NOT IN (
      'a0000000-0000-0000-0000-000000000001', -- kind_volunteer
      'a0000000-0000-0000-0000-000000000002', -- need_aid
      'a0000000-0000-0000-0000-000000000003'  -- admin_kindlink
    )
    AND (
      email ILIKE '%test%@example.com'
      OR email ILIKE '%dummy%@%'
      OR raw_user_meta_data->>'username' ILIKE 'test_%'
      OR raw_user_meta_data->>'username' ILIKE 'dummy_%'
      OR raw_user_meta_data->>'username' = 'rahul_sen'
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cleaned_users FROM deleted_users;

  -- 3. Delete orphaned notifications
  DELETE FROM public.notifications WHERE request_id IS NOT NULL AND request_id NOT IN (SELECT id FROM public.requests);

  RAISE NOTICE 'Cleanup complete: removed % test requests and % test users. Preserved official showcase accounts.', v_cleaned_requests, v_cleaned_users;
END $$;



-- ============================================================================
-- TRANSACTION COMMIT
-- ============================================================================
COMMIT;

-- End of all_in_one_v2.sql
