-- ============================================================================
-- KindLink - Database Migration 14: Account Deletion Requests
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Track user account deletion requests, admin reviews, and audit trail.
-- Safety: Completely idempotent (CREATE TABLE IF NOT EXISTS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  status text DEFAULT 'pending' NOT NULL, -- 'pending' | 'approved' | 'denied' | 'cancelled'
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz
);

-- Index for lookup by user
CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx ON public.account_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx ON public.account_deletion_requests (status);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view and insert their own requests; Admins can view/update all
DROP POLICY IF EXISTS "users_own_deletion_requests" ON public.account_deletion_requests;
CREATE POLICY "users_own_deletion_requests"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

DROP POLICY IF EXISTS "users_create_deletion_requests" ON public.account_deletion_requests;
CREATE POLICY "users_create_deletion_requests"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "users_cancel_deletion_requests" ON public.account_deletion_requests;
CREATE POLICY "users_cancel_deletion_requests"
  ON public.account_deletion_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin()
  );
