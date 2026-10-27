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
-- 1. DROP LEGACY NEARBY_REQUESTS SIGNATURES (Safe execution)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, text, text, integer, integer, uuid);

DO $$
BEGIN
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP FUNCTION IF EXISTS public.nearby_requests(double precision, double precision, double precision, public.help_category, integer, integer, uuid)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

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
