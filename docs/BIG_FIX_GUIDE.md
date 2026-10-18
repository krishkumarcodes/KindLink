# KindLink - Big Fix & Production Deployment Guide

A comprehensive, production-ready guide detailing the database migrations, environment configurations, testing procedures, blank map root cause & fix architecture, and step-by-step phone tap-through testing checklist.

---

## 1. Database Migrations (Section 11)

All PostgreSQL migrations are strictly **idempotent**, non-destructive, and wrapped in safety checks (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

### Execution Order in Supabase SQL Editor:

1. **`supabase/sql/19_request_categories_and_tags.sql`**
   - Creates `public.request_categories` table (15 data-driven categories).
   - Configures RLS: public read for everyone, write restricted to platform admins.
   - Alters `public.requests`: converts `category` to `text`, adds `custom_category_label text`, adds `tags text[] DEFAULT '{}'::text[]`.
   - Creates GIN index `requests_tags_gin_idx` on `public.requests(tags)`.
   - Seeds 15 standard categories with field schemas, color tokens, and suggested tags.

2. **`supabase/sql/20_reports_and_moderation.sql`**
   - Creates `public.reports` table for community reporting and moderation.
   - Enforces unique constraint `UNIQUE (reporter_id, request_id)` to prevent duplicate reporting.
   - Adds auto-flagging trigger (flags requests with $\ge 3$ reports for admin review).
   - Grants safe RLS policies for reporter insert, own-reports select, and admin full management.

3. **`supabase/sql/21_location_cleanup_and_feed_updates.sql`**
   - Updates `public.nearby_requests` RPC function to accept `filter_cat text` and `filter_tag text`.
   - Adds `public.get_hourly_activity_24h()` RPC for the Community Pulse and 24h Activity trend.
   - Performs safe, obfuscated database cleanup of legacy college defaults in profiles and saved places.

> **Consolidated Migration Option:**
> Alternatively, execute `supabase/sql/all_in_one.sql`, which contains all schema definitions and migrations (including 19, 20, and 21) in one coherent execution block.

---

## 2. Environment Variables Setup

Ensure your `.env.local` or Supabase project environment includes the following keys:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>

# App Base URL
NEXT_PUBLIC_APP_URL=https://kindlink.org

# Optional: Map & Geocoding Caching
MAP_CACHE_ENABLED=true
MAP_CACHE_TTL_SECONDS=86400

# Optional: Emergency SMS Service
EMERGENCY_SMS_ENABLED=true
```

---

## 3. Automated Test Suites & Verification

To verify full system integrity, run the following automated test suites:

```bash
# 1. Clean architecture & purge verification audit (Urgency > Proximity > Waiting Time)
npm run check:clean

# 2. Viewport layout & overflow audit across 320px–1440px viewports (47/47 passing)
npm run check:layout

# 3. 15-Category system, WCAG AA contrast (>= 4.5:1), moderation & Home view test
npm run test:categories

# 4. Request details sheet, own-request guard, route maps, and notifications audit
npm run test:requests

# 5. Emergency SOS SMS generator and URI builder test
npm run test:sms
```

---

## 4. Blank Map Root Cause & Fix Architecture

### Root Cause Analysis:
1. **Leaflet Container Zero-Height Sizing**:
   Leaflet maps calculate pixel dimensions synchronously on initialization. When rendered inside modals, collapsible drawers, or flex child containers without an explicit height or before CSS layouts calculate, the container height evaluates to `0px`. Consequently, Leaflet loads zero map tiles, appearing as an empty blank grey square.
2. **Nominatim / OSM Rate-Limiting**:
   Direct client-side geocoding requests to Nominatim without custom `User-Agent` headers or with frequent keystroke events triggered HTTP `429 Too Many Requests` or CORS drops, preventing markers from rendering.
3. **CSP & Tile Subdomain Blocking**:
   Missing OpenStreetMap tile server origins (`*.tile.openstreetmap.org`) in Content Security Policy (CSP) headers resulted in browser network blocks for tile assets.
4. **Unhandled Geolocation Fallback**:
   When GPS permissions were denied or timed out on mobile devices, unhandled null coordinates left the map centered at `[0, 0]` in the Atlantic Ocean.

### Fixes Implemented:
1. **Dynamic Container Resize Observer**:
   Added a `ResizeObserver` and an explicit `map.invalidateSize()` call delayed by 150ms after container mount and whenever modal visibility transitions.
2. **Backend Geocoding Proxy & In-Memory / Supabase Cache**:
   All reverse geocoding and landmark lookups now route through `/api/maps/geocode` with an internal caching layer (`map_cache`), debounced queries, and compliant `KindLink/4.5` user agent headers.
3. **Solid Base Height & Safe Dimensions**:
   Enforced strict `min-h-[220px]` or `min-h-[300px]` CSS rules with relative positioning on all map wrappers (`MapView.tsx`, `RequestRouteMiniMap.tsx`, `NewRequestWizard.tsx`).
4. **Deterministic Coordinates Fallback**:
   When geolocation is unavailable, coordinates gracefully fall back to the community hub center ($23.68886^\circ\text{ N}, 86.96606^\circ\text{ E}$) with explicit user notifications.

---

## 5. Mobile Tap-Through Test Checklist

Perform this step-by-step checklist on your mobile device (or in mobile emulation):

### 📋 Section A: Home Page & Community Pulse
- [ ] Open Home tab at 360px viewport: confirm zero horizontal scrolling.
- [ ] Tap the **Community Pulse Refresh Button**:
  - [ ] Button spins 360 degrees smoothly.
  - [ ] Disabled during loading state.
  - [ ] Transitions to a green checkmark tick upon completion.
  - [ ] Displays a success toast notification.
- [ ] Inspect the **Status Bar** (`Live Nearby` + `Last 24h` chip):
  - [ ] Text wraps gracefully without being clipped on small screens.
  - [ ] Tap `Last 24h` chip: opens the **Last 24 Hours Sheet**.
- [ ] In the **Last 24 Hours Sheet**:
  - [ ] Verify 3 stat tiles with full labels: `"Requests posted"`, `"Helps completed"`, `"Average reply time"`.
  - [ ] Verify the hourly dual-bar chart renders emerald (requests) and rose (helps) bars.
  - [ ] Tap any hourly bar to display the timestamp tooltip.
  - [ ] Press `Escape` or tap outside/drag handle to dismiss sheet.

### 📋 Section B: Category Tiles & All Categories Modal
- [ ] On the Home page, verify exactly 4 primary category tiles:
  - [ ] Blood Donation
  - [ ] Medical Gear
  - [ ] Elderly Care
  - [ ] Study Books
- [ ] Verify the 5th tile **"More categories" / "11 more categories"** spans across columns.
- [ ] Tap the 5th tile: opens the **All Aid Categories Modal**.
  - [ ] Verify all 15 categories are visible.
  - [ ] Type in the live search bar (e.g., `"food"`, `"flood"`, `"repair"`): list filters instantly.
  - [ ] Verify each category card displays response expectation, open count, and suggested tags.
  - [ ] Tap **"Browse requests"** on any category: navigates to Requests feed filtered to that category.

### 📋 Section C: Urgent Near You Feed Cards
- [ ] Verify cards display a category-tinted left border and icon circle.
- [ ] Verify no titles or detail chips are truncated with ellipsis.
- [ ] Verify dynamic category chips render correctly (e.g., blood group + units, equipment duration, etc.).
- [ ] Verify requester row displays requester name and verified shield.
- [ ] Tap **"Details"**: opens the Request Details Sheet.
- [ ] Tap **"I can help"**: opens the Help Offer Sheet with the category color theme.

### 📋 Section D: New Request Wizard (5-Step Flow)
- [ ] Tap the **"Post a Request"** Floating Action Button or header button.
- [ ] **Step 1 (Category Selection)**:
  - [ ] Verify 15 category cards with urgency hints.
  - [ ] Select **"Other (custom)"**: verify custom category input field appears.
  - [ ] Type a label < 3 chars (e.g. `"AB"`): verify error message.
  - [ ] Type a valid label (e.g. `"Community Kitchen"`): checkmark highlights card.
- [ ] **Step 2 (Details & Tags)**:
  - [ ] Verify dynamic category fields render based on chosen category.
  - [ ] Type in the tags input and tap **"Add"** or press Enter.
  - [ ] Tap suggested tag chips: chips add into the active tags row.
  - [ ] Add 5 tags: verify 6th tag attempt is disabled or informs max 5 tags reached.
- [ ] **Step 3 (Urgency & Contact)**:
  - [ ] Select urgency level (Critical, High, Medium, Low).
  - [ ] Enter contact name and phone number.
- [ ] **Step 4 (Location)**:
  - [ ] Verify location selector displays `savedPlaces` (Home, Work, Community Hospital) with zero legacy hardcoded campus strings.
  - [ ] Confirm map renders with marker and radius circle.
- [ ] **Step 5 (Review & Post)**:
  - [ ] Verify summary badge displays category color token, tags chips, and custom specifications.
  - [ ] Confirm comfortable bottom clearance (`pb-36`) so bottom navigation bar does not cover the Submit button.
  - [ ] Tap **"Publish Request"**: confirms toast notification and adds request to live feed.

### 📋 Section E: Requests View & Tag Filtering
- [ ] Open the **Requests Feed** tab.
- [ ] Tap the **Filters button**: drawer opens smoothly.
- [ ] Under **"Filter by Tag"**, tap a popular tag:
  - [ ] Drawer updates selection.
  - [ ] Feed filters requests matching the tag.
  - [ ] Active filter chips row at the top displays `#{tag}` with a close `×` button.
  - [ ] Tap `×` or "Clear all filters": resets feed to all requests.
