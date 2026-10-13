-- ============================================================================
-- KindLink - Database Migration 01: PostgreSQL Extensions
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Enable cryptographic functions, UUID generation, and PostGIS geometry.
-- Safety: Completely idempotent (safe to run multiple times).
-- ============================================================================

-- 1. UUID generation extension (used for unique identifiers)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Cryptographic functions (used for hashing and token generation)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. PostGIS extension (used for geospatial geography points, distance calculations, and radar queries)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 4. PostGIS helper: ensure ST_DWithin resolves gracefully if tolerance is passed as numeric
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    CREATE OR REPLACE FUNCTION extensions.st_dwithin(
      geog1 extensions.geography,
      geog2 extensions.geography,
      tolerance numeric
    )
    RETURNS boolean
    LANGUAGE sql
    IMMUTABLE
    AS $f$
      SELECT extensions.ST_DWithin(geog1, geog2, tolerance::double precision);
    $f$;

    CREATE OR REPLACE FUNCTION public.st_dwithin(
      geog1 extensions.geography,
      geog2 extensions.geography,
      tolerance numeric
    )
    RETURNS boolean
    LANGUAGE sql
    IMMUTABLE
    AS $f$
      SELECT extensions.ST_DWithin(geog1, geog2, tolerance::double precision);
    $f$;
  END IF;
END $$;

-- End of 01_extensions.sql
