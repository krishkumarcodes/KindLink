-- ============================================================================
-- KindLink - Database Migration 14: Verification, Professional Proofs & Audit
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Support professional proofs, account deletion workflow, and administrative audit logging.
-- ============================================================================

-- 1. Ensure verification_status enum includes 'needs_info'
DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'needs_info';
EXCEPTION
  WHEN others THEN null;
END $$;

-- 2. Enhance verification_requests table
ALTER TABLE public.verification_requests ALTER COLUMN id_document_path DROP NOT NULL;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS document_expires_at timestamptz;
ALTER TABLE public.verification_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Professional Proofs Table
CREATE TABLE IF NOT EXISTS public.professional_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profession_type text NOT NULL, -- 'Doctor', 'Nurse', 'Pharmacist', 'Teacher', 'Student', 'Organisation'
  registration_number text NOT NULL,
  document_path text NOT NULL,
  document_name text,
  status text DEFAULT 'pending' NOT NULL, -- 'pending', 'verified', 'needs_info', 'rejected'
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  document_expires_at timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Account Deletion Requests Table
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected', 'needs_info'
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL, -- 'verification_request', 'professional_proof', 'deletion_request'
  target_id uuid NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS professional_proofs_user_id_idx ON public.professional_proofs(user_id);
CREATE INDEX IF NOT EXISTS professional_proofs_status_idx ON public.professional_proofs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS deletion_requests_user_id_idx ON public.deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS deletion_requests_status_idx ON public.deletion_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_id_idx ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON public.admin_audit_logs(created_at DESC);

-- 7. RLS Policies
ALTER TABLE public.professional_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- professional_proofs policies
DROP POLICY IF EXISTS "professional_proofs_select" ON public.professional_proofs;
CREATE POLICY "professional_proofs_select" ON public.professional_proofs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "professional_proofs_insert" ON public.professional_proofs;
CREATE POLICY "professional_proofs_insert" ON public.professional_proofs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "professional_proofs_update" ON public.professional_proofs;
CREATE POLICY "professional_proofs_update" ON public.professional_proofs
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "professional_proofs_delete" ON public.professional_proofs;
CREATE POLICY "professional_proofs_delete" ON public.professional_proofs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- deletion_requests policies
DROP POLICY IF EXISTS "deletion_requests_select" ON public.deletion_requests;
CREATE POLICY "deletion_requests_select" ON public.deletion_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "deletion_requests_insert" ON public.deletion_requests;
CREATE POLICY "deletion_requests_insert" ON public.deletion_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "deletion_requests_update" ON public.deletion_requests;
CREATE POLICY "deletion_requests_update" ON public.deletion_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- admin_audit_logs policies
DROP POLICY IF EXISTS "admin_audit_logs_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_select" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_audit_logs_insert" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_insert" ON public.admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- 8. Add to Realtime Publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.professional_proofs;
EXCEPTION WHEN others THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deletion_requests;
EXCEPTION WHEN others THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_logs;
EXCEPTION WHEN others THEN null;
END $$;
