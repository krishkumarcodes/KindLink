-- ============================================================================
-- KindLink - Database Migration 14: Profile Summary & Mutual Aid Statistics
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Real calculated stats: helps given, requests made, open requests,
--          hours active, neighbours supported, distance covered, trust score,
--          ratings count, requester rating, current streak, best streak,
--          category breakdown, and monthly activity.
-- Safety: Completely idempotent (CREATE OR REPLACE FUNCTION).
-- ============================================================================

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

  -- 9. Ratings & Trust Score
  -- Total ratings received
  SELECT COUNT(*) INTO v_ratings_count
  FROM public.ratings
  WHERE ratee_id = p_user_id;

  -- Helper ratings (received from requesters)
  SELECT
    ROUND(AVG(r.stars)::numeric, 2),
    COUNT(*)
  INTO v_helper_rating, v_helper_ratings_count
  FROM public.ratings r
  JOIN public.requests req ON r.request_id = req.id
  WHERE r.ratee_id = p_user_id AND req.accepted_helper_id = p_user_id;

  -- Requester ratings (received from helpers when user was requester)
  SELECT
    ROUND(AVG(r.stars)::numeric, 2),
    COUNT(*)
  INTO v_requester_rating, v_requester_ratings_count
  FROM public.ratings r
  JOIN public.requests req ON r.request_id = req.id
  WHERE r.ratee_id = p_user_id AND req.requester_id = p_user_id;

  -- Trust score: overall average or helper average if >= 5 ratings, else overall
  IF v_ratings_count >= 5 THEN
    v_trust_score := COALESCE(v_helper_rating, v_profile.rating_average, 5.0);
  ELSIF v_ratings_count > 0 THEN
    v_trust_score := COALESCE(v_helper_rating, v_profile.rating_average, 5.0);
  ELSE
    v_trust_score := NULL;
  END IF;

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
    'monthly_activity', COALESCE(v_monthly_activity, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_summary(uuid) TO anon, authenticated, service_role;
