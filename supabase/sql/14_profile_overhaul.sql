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
