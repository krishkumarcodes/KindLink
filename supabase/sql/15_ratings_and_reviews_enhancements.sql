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
