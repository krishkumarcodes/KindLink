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
