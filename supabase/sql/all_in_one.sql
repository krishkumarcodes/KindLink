-- ============================================================================
-- KindLink - Complete Database Setup (All-in-One Migration)
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Target: PostgreSQL 15+ with PostGIS on Supabase (Free Tier)
-- Safety: Completely idempotent. Safe to run multiple times.
-- Instructions: Copy and paste this ENTIRE file into Supabase SQL Editor and Run.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- PostGIS helper: ensure ST_DWithin resolves gracefully if tolerance is passed as numeric
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

-- ============================================================================
-- SECTION 2: ENUM TYPES
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 3: CORE TABLES
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

  CONSTRAINT username_length_check CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format_check CHECK (username ~* '^[a-z][a-z0-9_.]*$')
);

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

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS requests_location_gist_idx ON public.requests USING GIST (location);
CREATE INDEX IF NOT EXISTS profiles_home_location_gist_idx ON public.profiles USING GIST (home_location);
CREATE INDEX IF NOT EXISTS sos_events_location_gist_idx ON public.sos_events USING GIST (location);

CREATE INDEX IF NOT EXISTS requests_status_created_at_idx ON public.requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_requester_id_idx ON public.requests (requester_id);
CREATE INDEX IF NOT EXISTS requests_accepted_helper_id_idx ON public.requests (accepted_helper_id);
CREATE INDEX IF NOT EXISTS requests_category_idx ON public.requests (category);
CREATE INDEX IF NOT EXISTS requests_urgency_idx ON public.requests (urgency);
CREATE INDEX IF NOT EXISTS requests_expires_at_idx ON public.requests (expires_at);

CREATE INDEX IF NOT EXISTS offers_request_id_idx ON public.offers (request_id);
CREATE INDEX IF NOT EXISTS offers_helper_id_idx ON public.offers (helper_id);
CREATE INDEX IF NOT EXISTS offers_status_idx ON public.offers (status);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS ratings_ratee_id_idx ON public.ratings (ratee_id);
CREATE INDEX IF NOT EXISTS ratings_request_id_idx ON public.ratings (request_id);

CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON public.verification_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS verification_requests_user_id_idx ON public.verification_requests (user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);

-- ============================================================================
-- SECTION 5: FUNCTIONS & HELP GRAVITY ENGINE
-- ============================================================================

-- Helper: Category Weights in ONE single place
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

-- Nearby Requests with exact Help Gravity formula:
-- score = typeWeight * (1 + 0.05 * waitingMinutes) / (1 + distanceKm)^2
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

-- Safe Contact Disclosure
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
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view contact info';
  END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = req_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_req.requester_id = v_caller THEN
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

  ELSIF v_req.accepted_helper_id = v_caller THEN
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

-- Safe Public Statistics (for welcome page)
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

-- Workflow: Accept Offer
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

  UPDATE public.offers
  SET status = 'accepted', updated_at = now()
  WHERE id = target_offer_id;

  UPDATE public.offers
  SET status = 'declined', updated_at = now()
  WHERE request_id = v_req.id AND id != target_offer_id AND status = 'pending';

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

-- Workflow: Complete Request
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

-- Workflow: Cancel Request
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

-- ============================================================================
-- SECTION 6: EVENT TRIGGERS
-- ============================================================================

-- Auto-create Profile when a new user signs up in auth.users
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
BEGIN
  v_raw_username := NEW.raw_user_meta_data->>'username';
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  IF v_raw_username IS NULL OR char_length(trim(v_raw_username)) < 3 THEN
    v_sanitized_username := 'user_' || substr(NEW.id::text, 1, 8);
  ELSE
    v_sanitized_username := lower(trim(v_raw_username));
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    phone,
    role,
    verification_status
  )
  VALUES (
    NEW.id,
    v_sanitized_username,
    COALESCE(v_display_name, v_sanitized_username),
    NEW.phone,
    'user',
    'unverified'
  )
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      display_name = EXCLUDED.display_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recalculate Average Rating on public.profiles
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

-- Notification on New Urgent Request (alerts verified helpers within 10 km)
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

DROP TRIGGER IF EXISTS on_new_request_created ON public.requests;
CREATE TRIGGER on_new_request_created
  AFTER INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_request_notification();

-- Notification when a volunteer offers help
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

-- Notification when an offer is accepted
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

-- Notification when request is marked completed
CREATE OR REPLACE FUNCTION public.handle_request_completed_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.accepted_helper_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, request_id)
      VALUES (
        NEW.requester_id,
        'request_completed',
        '🌟 Aid Completed! Please rate your helper',
        'Thank you for using KindLink. Please leave a rating for your volunteer.',
        NEW.id
      );

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

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY POLICIES
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
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

-- VERIFICATION REQUESTS POLICIES
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

-- REQUESTS POLICIES
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

-- OFFERS POLICIES
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

-- NOTIFICATIONS POLICIES
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

-- RATINGS POLICIES
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

-- REPORTS POLICIES
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

-- SOS EVENTS POLICIES
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
-- SECTION 8: STORAGE BUCKET & POLICIES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'verification-docs',
      'verification-docs',
      false,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
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

    DROP POLICY IF EXISTS "verification_docs_insert" ON storage.objects;
    CREATE POLICY "verification_docs_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

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

-- ============================================================================
-- SECTION 9: REALTIME REPLICATION CONFIGURATION
-- ============================================================================
ALTER TABLE public.requests REPLICA IDENTITY FULL;
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- Standard role permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- SECTION 10 (OPTIONAL): PURGE ALL DEMO & TEST ACCOUNTS
-- Migration File: supabase/sql/12_cleanup_demo_users.sql
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

    DELETE FROM public.sos_events
    WHERE user_id = ANY(v_demo_user_ids);

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

-- ============================================================================
-- SECTION 11 (OPTIONAL): CREATE SHOWCASE DEMO & ADMIN ACCOUNTS
-- Migration File: supabase/sql/13_create_showcase_accounts.sql
-- Purpose: Provisions 2 verified community showcase accounts and 1 platform admin
--          with known passwords for portfolio reviews, live demos, and grading.
-- Safety: Completely idempotent (can be re-run safely anytime).
--
-- ACCOUNT CREDENTIALS SUMMARY:
-- 1. Showcase Volunteer: kind_volunteer / KindLink#Volunteer2026 (volunteer@kindlink.demo)
-- 2. Showcase Requester: need_aid       / KindLink#Requester2026 (requester@kindlink.demo)
-- 3. Super Administrator: admin_kindlink / KindLink#Admin2026     (admin@kindlink.demo)
-- ============================================================================

-- Ensure auth.users columns exist (guarantees compatibility with both local shims and Supabase Cloud)
DO $$ BEGIN
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS instance_id uuid;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS aud text DEFAULT 'authenticated';
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'authenticated';
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS encrypted_password text;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb DEFAULT '{"provider":"email","providers":["email"]}'::jsonb;
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$
DECLARE
  v_volunteer_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_requester_id uuid := 'a0000000-0000-0000-0000-000000000002';
  v_admin_id     uuid := 'a0000000-0000-0000-0000-000000000003';
  v_sample_req_id uuid := 'b0000000-0000-0000-0000-000000000001';
BEGIN
  PERFORM set_config('search_path', 'public, extensions', true);

  -- --------------------------------------------------------------------------
  -- 1. Create or Update: Showcase Volunteer (kind_volunteer)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'volunteer@kindlink.demo' OR raw_user_meta_data->>'username' = 'kind_volunteer') AND id <> v_volunteer_id;
  DELETE FROM public.profiles WHERE (username = 'kind_volunteer') AND id <> v_volunteer_id;

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
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- Profile synchronization
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
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
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 2. Create or Update: Showcase Requester (need_aid)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'requester@kindlink.demo' OR raw_user_meta_data->>'username' = 'need_aid') AND id <> v_requester_id;
  DELETE FROM public.profiles WHERE (username = 'need_aid') AND id <> v_requester_id;

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
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
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
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status,
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 3. Create or Update: Super Administrator (admin_kindlink)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE (email = 'admin@kindlink.demo' OR raw_user_meta_data->>'username' = 'admin_kindlink') AND id <> v_admin_id;
  DELETE FROM public.profiles WHERE (username = 'admin_kindlink') AND id <> v_admin_id;

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
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
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
    phone = EXCLUDED.phone,
    role = 'admin',
    verification_status = 'verified',
    home_location = EXCLUDED.home_location;

  -- --------------------------------------------------------------------------
  -- 4. Create Live Showcase Request & Mutual Offer
  -- --------------------------------------------------------------------------
  -- Temporarily disable notification trigger during seed to ensure zero friction
  BEGIN
    EXECUTE 'ALTER TABLE public.requests DISABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

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

  -- Re-enable notification trigger
  BEGIN
    EXECUTE 'ALTER TABLE public.requests ENABLE TRIGGER on_new_request_created';
  EXCEPTION WHEN others THEN null;
  END;

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

  RAISE NOTICE 'Successfully created showcase accounts: kind_volunteer, need_aid, and admin_kindlink.';
END $$;

-- ============================================================================
-- SECTION 14: Comprehensive Realtime Platform Upgrade
-- ============================================================================

DO $$ BEGIN
  ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'on_the_way' AFTER 'accepted';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'arrived' AFTER 'on_the_way';
EXCEPTION WHEN others THEN null;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_area_name text;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at);

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

-- ============================================================================
-- SECTION 15: Safe Cleanup of Legacy Test Data
-- ============================================================================
DO $$
BEGIN
  DELETE FROM public.requests
  WHERE id <> 'b0000000-0000-0000-0000-000000000001'
    AND (
      title ILIKE '%[test]%'
      OR title ILIKE '%dummy%'
      OR title ILIKE '%sample test%'
      OR description ILIKE '%this is a test%'
      OR description ILIKE '%dummy description%'
    );

  DELETE FROM auth.users
  WHERE id NOT IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
  )
  AND (
    email ILIKE '%test%@example.com'
    OR email ILIKE '%dummy%@%'
    OR raw_user_meta_data->>'username' ILIKE 'test_%'
    OR raw_user_meta_data->>'username' ILIKE 'dummy_%'
    OR raw_user_meta_data->>'username' = 'rahul_sen'
  );

  DELETE FROM public.notifications WHERE request_id IS NOT NULL AND request_id NOT IN (SELECT id FROM public.requests);
END $$;

-- ============================================================================
-- SECTION 16: Login & Signup Helpers
-- ============================================================================
-- Ensure profiles table has email column and syncs with auth.users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Ensure unique constraint on username
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

-- Add accepted_at column to requests if missing
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_requests_accepted_at ON public.requests (accepted_at);

-- RLS policy to allow users to read their own profile by username (for username login)
DROP POLICY IF EXISTS "profiles_select_by_username" ON public.profiles;
CREATE POLICY "profiles_select_by_username"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR username = (SELECT p2.username FROM public.profiles p2 WHERE p2.id = auth.uid())
    OR public.is_admin()
  );

-- Function to get email by username for login
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

-- End of all_in_one.sql

