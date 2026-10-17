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
