-- ==============================================================================
-- KindLink - Database Migration 18: Handover Confirmation PIN & Organization Endorsements
-- Purpose:
--   1. Handover Confirmation PIN:
--      - 4-digit security PIN for physical equipment loans and book handovers
--      - Columns: handover_pin, requires_handover_pin, handover_confirmed_at
--      - Function: public.verify_handover_pin(p_request_id, p_pin)
--      - Trigger: auto-generate 4-digit PIN for equipment & books categories
--   2. Organization / NGO Endorsements:
--      - Organization profile credentials on public.profiles
--      - Table public.request_endorsements with RLS and unique constraint
--      - Columns on public.requests: is_organization_endorsed, endorsements_count, endorsed_by_org_names
--      - Sync trigger: auto-update request endorsement count and org names
-- Idempotent & Non-Destructive. Safe to execute multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD HANDOVER PIN COLUMNS TO REQUESTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'handover_pin'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN handover_pin varchar(4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'requires_handover_pin'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN requires_handover_pin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'handover_confirmed_at'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN handover_confirmed_at timestamptz;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ADD ORGANIZATION PROFILE COLUMNS TO PROFILES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_organization'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_organization boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_registration_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_registration_number text;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ADD ENDORSEMENT COLUMNS TO REQUESTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'is_organization_endorsed'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN is_organization_endorsed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'endorsements_count'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN endorsements_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'requests' AND column_name = 'endorsed_by_org_names'
  ) THEN
    ALTER TABLE public.requests ADD COLUMN endorsed_by_org_names text[] DEFAULT '{}'::text[];
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. CREATE REQUEST_ENDORSEMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  endorser_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_endorsement_per_org UNIQUE (request_id, endorser_id)
);

CREATE INDEX IF NOT EXISTS idx_request_endorsements_req ON public.request_endorsements(request_id);
CREATE INDEX IF NOT EXISTS idx_request_endorsements_org ON public.request_endorsements(endorser_id);

-- Enable RLS
ALTER TABLE public.request_endorsements ENABLE ROW LEVEL SECURITY;

-- Policies for request_endorsements
DROP POLICY IF EXISTS "Public can view endorsements" ON public.request_endorsements;
CREATE POLICY "Public can view endorsements"
  ON public.request_endorsements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can endorse requests" ON public.request_endorsements;
CREATE POLICY "Authenticated users can endorse requests"
  ON public.request_endorsements
  FOR INSERT
  WITH CHECK (auth.uid() = endorser_id);

DROP POLICY IF EXISTS "Organizations can remove their own endorsement" ON public.request_endorsements;
CREATE POLICY "Organizations can remove their own endorsement"
  ON public.request_endorsements
  FOR DELETE
  USING (auth.uid() = endorser_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGER: SYNC REQUEST ENDORSEMENTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_request_endorsements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id uuid;
  v_count integer;
  v_names text[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_req_id := OLD.request_id;
  ELSE
    v_req_id := NEW.request_id;
  END IF;

  -- Count total endorsements
  SELECT count(*) INTO v_count
  FROM public.request_endorsements
  WHERE request_id = v_req_id;

  -- Collect organization names
  SELECT array_agg(COALESCE(p.organization_name, p.display_name, p.username, 'Community Partner'))
  INTO v_names
  FROM public.request_endorsements re
  JOIN public.profiles p ON p.id = re.endorser_id
  WHERE re.request_id = v_req_id;

  -- Update requests table
  UPDATE public.requests
  SET
    endorsements_count = v_count,
    is_organization_endorsed = (v_count > 0),
    endorsed_by_org_names = COALESCE(v_names, '{}'::text[])
  WHERE id = v_req_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_endorsements ON public.request_endorsements;
CREATE TRIGGER trg_sync_request_endorsements
  AFTER INSERT OR UPDATE OR DELETE ON public.request_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_request_endorsements();

-- ------------------------------------------------------------------------------
-- 6. TRIGGER: AUTO-GENERATE HANDOVER PIN FOR EQUIPMENT AND BOOKS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_handover_pin_requirement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default requires_handover_pin to TRUE for equipment and books
  IF NEW.category IN ('equipment', 'books') THEN
    IF NEW.requires_handover_pin IS NULL OR NEW.requires_handover_pin = false THEN
      NEW.requires_handover_pin := true;
    END IF;
  END IF;

  -- Auto-generate 4-digit PIN if required and empty
  IF NEW.requires_handover_pin = true AND (NEW.handover_pin IS NULL OR trim(NEW.handover_pin) = '') THEN
    NEW.handover_pin := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  END IF;

  -- Mirror inside details JSONB for backward compatibility
  IF NEW.requires_handover_pin = true THEN
    NEW.details := jsonb_set(COALESCE(NEW.details, '{}'::jsonb), '{requires_handover_pin}', 'true'::jsonb, true);
    IF NEW.handover_pin IS NOT NULL THEN
      NEW.details := jsonb_set(NEW.details, '{handover_pin}', to_jsonb(NEW.handover_pin), true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_handover_pin_requirement ON public.requests;
CREATE TRIGGER trg_check_handover_pin_requirement
  BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_handover_pin_requirement();

-- ------------------------------------------------------------------------------
-- 7. FUNCTION: verify_handover_pin(p_request_id, p_pin)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_handover_pin(
  p_request_id uuid,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests%ROWTYPE;
  v_expected_pin text;
  v_requires_pin boolean;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  v_requires_pin := COALESCE(
    v_req.requires_handover_pin,
    (v_req.details->>'requires_handover_pin')::boolean,
    (v_req.category IN ('equipment', 'books'))
  );

  v_expected_pin := COALESCE(
    v_req.handover_pin,
    v_req.details->>'handover_pin'
  );

  -- If PIN is required, verify match
  IF v_requires_pin = true AND v_expected_pin IS NOT NULL THEN
    IF trim(p_pin) != trim(v_expected_pin) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Incorrect 4-digit PIN. Please ask the requester for the PIN shown on their screen.'
      );
    END IF;
  END IF;

  -- Mark as completed with timestamp
  UPDATE public.requests
  SET
    status = 'completed',
    completed_at = v_now,
    handover_confirmed_at = v_now,
    details = jsonb_set(
      COALESCE(details, '{}'::jsonb),
      '{handover_confirmed_at}',
      to_jsonb(v_now::text),
      true
    )
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Handover confirmed and request completed successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_handover_pin(uuid, text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. BACKFILL EXISTING EQUIPMENT & BOOKS REQUESTS WITH PIN
-- ------------------------------------------------------------------------------
UPDATE public.requests
SET
  requires_handover_pin = true,
  handover_pin = COALESCE(handover_pin, lpad(floor(random() * 9000 + 1000)::text, 4, '0'))
WHERE category IN ('equipment', 'books')
  AND (handover_pin IS NULL OR requires_handover_pin IS NULL OR requires_handover_pin = false);
