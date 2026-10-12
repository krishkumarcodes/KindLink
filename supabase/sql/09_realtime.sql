-- ============================================================================
-- KindLink - Database Migration 09: Realtime Subscriptions Configuration
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Enable PostgreSQL CDC (Change Data Capture) via Supabase Realtime
--          for live updates on requests, offers, and user notifications.
-- Safety: Completely idempotent (checked via system catalog).
-- ============================================================================

-- 1. Ensure REPLICA IDENTITY is set to FULL so that update/delete payloads
-- contain full previous record attributes
ALTER TABLE public.requests REPLICA IDENTITY FULL;
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Check and add requests
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
    END IF;

    -- Check and add offers
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
    END IF;

    -- Check and add notifications
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- End of 09_realtime.sql
