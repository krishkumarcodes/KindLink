-- ============================================================================
-- KindLink - Database Migration 02: Enumerated Types & Statuses
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Create fixed enum types for user roles, statuses, and urgency levels.
-- Safety: Completely idempotent (safe to re-run multiple times).
-- ============================================================================

-- 1. User Roles (standard volunteer user vs community platform admin)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Verification Status for Volunteer Identity Trust
DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Aid Task Categories
DO $$ BEGIN
  CREATE TYPE help_category AS ENUM (
    'blood',
    'equipment',
    'elderly_help',
    'books',
    'transport'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Urgency Priority Levels
DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Help Request Lifecycle Status
DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. Volunteer Offer Status
DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. Community Report Moderation Status
DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- End of 02_types.sql
