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
CREATE INDEX IF NOT EXISTS requests_tags_gin_idx ON public.requests USING gin(tags);

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
