-- ============================================================================
-- KindLink - Database Migration 04: Spatial & Performance Indexes
-- Author: KindLink Engineering (krishkumarcodes@gmail.com)
-- Purpose: Create GiST spatial indexes for PostGIS geography calculations
--          and B-Tree indexes for fast feed filtering, foreign keys, and sorting.
-- Safety: Completely idempotent (CREATE INDEX IF NOT EXISTS).
-- ============================================================================

-- 1. SPATIAL GIST INDEXES (Essential for fast Haversine/ST_DWithin radar lookups)
CREATE INDEX IF NOT EXISTS requests_location_gist_idx ON public.requests USING GIST (location);
CREATE INDEX IF NOT EXISTS profiles_home_location_gist_idx ON public.profiles USING GIST (home_location);
CREATE INDEX IF NOT EXISTS sos_events_location_gist_idx ON public.sos_events USING GIST (location);

-- 2. REQUESTS FILTERING & SORTING INDEXES
CREATE INDEX IF NOT EXISTS requests_status_created_at_idx ON public.requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_requester_id_idx ON public.requests (requester_id);
CREATE INDEX IF NOT EXISTS requests_accepted_helper_id_idx ON public.requests (accepted_helper_id);
CREATE INDEX IF NOT EXISTS requests_category_idx ON public.requests (category);
CREATE INDEX IF NOT EXISTS requests_urgency_idx ON public.requests (urgency);
CREATE INDEX IF NOT EXISTS requests_expires_at_idx ON public.requests (expires_at);

-- 3. OFFERS INDEXES
CREATE INDEX IF NOT EXISTS offers_request_id_idx ON public.offers (request_id);
CREATE INDEX IF NOT EXISTS offers_helper_id_idx ON public.offers (helper_id);
CREATE INDEX IF NOT EXISTS offers_status_idx ON public.offers (status);

-- 4. NOTIFICATIONS INDEXES
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id, is_read, created_at DESC);

-- 5. RATINGS INDEXES
CREATE INDEX IF NOT EXISTS ratings_ratee_id_idx ON public.ratings (ratee_id);
CREATE INDEX IF NOT EXISTS ratings_request_id_idx ON public.ratings (request_id);

-- 6. VERIFICATION REQUESTS & REPORTS INDEXES (Admin lookups)
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON public.verification_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS verification_requests_user_id_idx ON public.verification_requests (user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);

-- End of 04_indexes.sql
