-- ============================================================================
-- KindLink - Database Migration 13: Map Cache & Provider Daily Usage Tracking
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: High-performance caching for geocoding, reverse geocoding, routing,
--          and places queries to reduce latency and conserve API quotas/credits.
--          Atomic daily usage counters per provider for quota management.
--          Strict Row Level Security (service_role only).
-- Safety: Completely idempotent (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE,
--         DROP POLICY IF EXISTS).
-- ============================================================================

-- 1. MAP CACHE TABLE
-- Caches serialized results of map queries with TTL expiration
CREATE TABLE IF NOT EXISTS public.map_cache (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  category text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT map_cache_category_check CHECK (char_length(category) > 0)
);

-- Indexes for lightning-fast lookups, category filtering, and expiration sweeps
CREATE INDEX IF NOT EXISTS map_cache_expires_at_idx ON public.map_cache (expires_at);
CREATE INDEX IF NOT EXISTS map_cache_category_idx ON public.map_cache (category);
CREATE INDEX IF NOT EXISTS map_cache_lookup_idx ON public.map_cache (key, expires_at);

-- 2. MAP DAILY USAGE TRACKING TABLE
-- Aggregates request counts and credit consumption per provider per calendar day
CREATE TABLE IF NOT EXISTS public.map_daily_usage (
  provider text NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  request_count integer DEFAULT 0 NOT NULL,
  credit_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  PRIMARY KEY (provider, usage_date),
  CONSTRAINT request_count_non_negative CHECK (request_count >= 0),
  CONSTRAINT credit_count_non_negative CHECK (credit_count >= 0)
);

-- Index on usage_date for date-range analytics and daily quota reporting
CREATE INDEX IF NOT EXISTS map_daily_usage_date_idx ON public.map_daily_usage (usage_date);

-- 3. ATOMIC MAP USAGE INCREMENT FUNCTION
-- Upserts and atomically adds request_count and credit_count for provider and date
DROP FUNCTION IF EXISTS public.increment_map_usage(text, date, integer, integer);

CREATE OR REPLACE FUNCTION public.increment_map_usage(
  p_provider text,
  p_date date DEFAULT CURRENT_DATE,
  p_count integer DEFAULT 1,
  p_credits integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text := lower(trim(p_provider));
  v_date date := COALESCE(p_date, CURRENT_DATE);
  v_count integer := COALESCE(p_count, 1);
  v_credits integer := COALESCE(p_credits, 0);
BEGIN
  IF v_provider IS NULL OR v_provider = '' THEN
    RAISE EXCEPTION 'Map provider name must be a non-empty string';
  END IF;

  INSERT INTO public.map_daily_usage (
    provider,
    usage_date,
    request_count,
    credit_count,
    updated_at
  )
  VALUES (
    v_provider,
    v_date,
    GREATEST(0, v_count),
    GREATEST(0, v_credits),
    now()
  )
  ON CONFLICT (provider, usage_date)
  DO UPDATE SET
    request_count = public.map_daily_usage.request_count + EXCLUDED.request_count,
    credit_count = public.map_daily_usage.credit_count + EXCLUDED.credit_count,
    updated_at = now();
END;
$$;

-- 4. CLEANUP EXPIRED MAP CACHE FUNCTION
-- Purges stale records whose expiration timestamp has elapsed
DROP FUNCTION IF EXISTS public.cleanup_expired_map_cache();

CREATE OR REPLACE FUNCTION public.cleanup_expired_map_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.map_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS to protect internal cache entries and usage accounting
ALTER TABLE public.map_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_daily_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to guarantee idempotency
DROP POLICY IF EXISTS "map_cache_service_role_all" ON public.map_cache;
DROP POLICY IF EXISTS "map_cache_service_role_only" ON public.map_cache;
DROP POLICY IF EXISTS "map_daily_usage_service_role_all" ON public.map_daily_usage;
DROP POLICY IF EXISTS "map_daily_usage_service_role_only" ON public.map_daily_usage;

-- Explicit policy granting full access to service_role ONLY
CREATE POLICY "map_cache_service_role_only"
  ON public.map_cache
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "map_daily_usage_service_role_only"
  ON public.map_daily_usage
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. STRICT PERMISSION RESTRICTIONS
-- Revoke all table access from public, anon, and authenticated roles
REVOKE ALL ON TABLE public.map_cache FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.map_daily_usage FROM PUBLIC, anon, authenticated;

-- Grant all permissions strictly to service_role
GRANT ALL ON TABLE public.map_cache TO service_role;
GRANT ALL ON TABLE public.map_daily_usage TO service_role;

-- Restrict function execution permissions to service_role
REVOKE EXECUTE ON FUNCTION public.increment_map_usage(text, date, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_map_usage(text, date, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_map_cache() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_map_cache() TO service_role;
