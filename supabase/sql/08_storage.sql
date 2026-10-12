-- ============================================================================
-- KindLink - Database Migration 08: Supabase Storage Configuration & Policies
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Create private 'verification-docs' bucket for government IDs,
--          enforcing 5MB file limits and strictly scoped user folders.
-- Safety: Completely idempotent (INSERT ON CONFLICT DO NOTHING, DROP POLICY IF EXISTS).
-- ============================================================================

-- 1. Create the private 'verification-docs' bucket if it does not already exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'verification-docs',
      'verification-docs',
      false,
      5242880, -- 5 MB in bytes
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  END IF;
END $$;

-- 2. Storage Policies on storage.objects
-- Note: User upload path is strictly {user_id}/{filename}

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN

    -- A. Users can view their own documents; Admins can view all documents
    DROP POLICY IF EXISTS "verification_docs_select" ON storage.objects;
    CREATE POLICY "verification_docs_select"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'verification-docs'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.is_admin()
        )
      );

    -- B. Users can upload only into their own folder
    DROP POLICY IF EXISTS "verification_docs_insert" ON storage.objects;
    CREATE POLICY "verification_docs_insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- C. Users can update their own documents in their folder
    DROP POLICY IF EXISTS "verification_docs_update" ON storage.objects;
    CREATE POLICY "verification_docs_update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- D. Users can delete their own documents; Admins can delete any document
    DROP POLICY IF EXISTS "verification_docs_delete" ON storage.objects;
    CREATE POLICY "verification_docs_delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'verification-docs'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.is_admin()
        )
      );

  END IF;
END $$;

-- End of 08_storage.sql
