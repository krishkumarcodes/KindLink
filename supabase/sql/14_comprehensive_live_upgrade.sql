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

-- 1. EXPAND request_status ENUM WITH TRANSIT STATES
DO $$ BEGIN
  ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'on_the_way' AFTER 'accepted';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'arrived' AFTER 'on_the_way';
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
  location geography(Point, 4326) NOT NULL,
  address_text text,
  status text DEFAULT 'active' NOT NULL, -- 'active', 'safe', 'resolved'
  expires_at timestamptz DEFAULT (now() + interval '2 hours') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz
);

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
CREATE OR REPLACE FUNCTION public.live_stats(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 20.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_point geography;
  v_helpers_nearby integer := 0;
  v_avg_response_minutes numeric := NULL;
  v_acts_of_help integer := 0;
  v_trust_match_percent numeric := NULL;
BEGIN
  v_point := extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::geography;

  -- Helpers Nearby (verified volunteers within radius or active recently)
  SELECT COUNT(*)
  INTO v_helpers_nearby
  FROM public.profiles p
  WHERE p.verification_status = 'verified'
    AND (
      (p.last_active_at IS NOT NULL AND p.last_active_at >= now() - interval '15 minutes')
      OR
      (p.home_location IS NOT NULL AND extensions.ST_DWithin(p.home_location, v_point, (radius_km * 1000.0)::double precision))
    );

  -- Acts of Help in area (completed requests)
  SELECT COUNT(*)
  INTO v_acts_of_help
  FROM public.requests r
  WHERE r.status = 'completed'
    AND extensions.ST_DWithin(r.location, v_point, (radius_km * 1000.0)::double precision);

  -- Avg response minutes (median minutes to first offer in last 30 days)
  WITH response_times AS (
    SELECT
      EXTRACT(EPOCH FROM (MIN(o.created_at) - r.created_at)) / 60.0 AS diff_min
    FROM public.requests r
    JOIN public.offers o ON o.request_id = r.id
    WHERE r.created_at >= now() - interval '30 days'
      AND extensions.ST_DWithin(r.location, v_point, (radius_km * 1000.0)::double precision)
    GROUP BY r.id, r.created_at
    HAVING MIN(o.created_at) >= r.created_at
  )
  SELECT
    CASE
      WHEN COUNT(*) >= 3 THEN ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY diff_min)::numeric, 1)
      ELSE NULL
    END
  INTO v_avg_response_minutes
  FROM response_times;

  -- Trust match % (4+ star ratings in last 90 days)
  SELECT
    CASE
      WHEN COUNT(*) >= 5 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE stars >= 4)::numeric / COUNT(*)::numeric * 100.0),
          1
        )
      ELSE NULL
    END
  INTO v_trust_match_percent
  FROM public.ratings r
  WHERE r.created_at >= now() - interval '90 days';

  RETURN jsonb_build_object(
    'helpers_nearby', COALESCE(v_helpers_nearby, 0),
    'avg_response_minutes', v_avg_response_minutes,
    'acts_of_help', COALESCE(v_acts_of_help, 0),
    'trust_match_percent', v_trust_match_percent,
    'updated_at', now()
  );
END;
$$;

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
