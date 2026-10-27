# KindLink Mobile Map Interface & Phone Field Guide

A comprehensive architectural reference, diagnosis guide, SQL migration checklist, and mobile touch verification protocol for the KindLink map on smartphones and handheld devices.

---

## 1. Audit Summary

The KindLink mobile map experience is designed for mission-critical community mutual aid and emergency response under diverse real-world mobile network conditions (3G/4G, throttled cellular, and offline-first scenarios).

### Core Mobile Interface Hierarchy
```
┌────────────────────────────────────────────────────────┐
│  Status Bar & Notch Safe Area (env(safe-area-inset-top)│
├────────────────────────────────────────────────────────┤
│  Top Floating Zone: Search & Filter Overlay            │
│  - Location Pill / Search Input (<input type="search">)│
│  - Horizontal Category Chip Carousel (min-h: 44px)     │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    MapLibre Canvas                     │
│                (100dvh Dynamic Viewport)               │
│                                                        │
│  [Right Controls]                                      │
│  - Compass / North Arrow                               │
│  - Recenter GPS (Locate Me)                            │
│  - Layer Theme Toggle (Street/Satellite/Dark)          │
│  - Zoom In / Out (+ / -)                               │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Bottom Sheet / Pin Preview Drawer                     │
│  - Snap Point 1 (Peek): 72px handle & urgent count     │
│  - Snap Point 2 (Half): 45% screen height              │
│  - Snap Point 3 (Full): 85% screen height              │
├────────────────────────────────────────────────────────┤
│  Bottom Tab Bar Safe Zone (pb-24 / pb-36 clearance)   │
└────────────────────────────────────────────────────────┘
```

### Mobile Layout Zones & Viewport Specifications
- **Target Mobile Viewports:** 360×640 (entry Android), 390×844 (iPhone 12/13/14), 412×915 (Pixel / Samsung Galaxy), 430×932 (iPhone Pro Max).
- **Dynamic Viewport Unit:** Uses `100dvh` instead of standard `100vh` to prevent mobile browser URL bar resizing from jolting or truncating the map canvas.
- **Touch Targets:** Strictly adheres to WCAG 2.1 AA min 44×44px interactive touch targets for all zoom buttons, recenter triggers, and category chips.
- **Scroll Containment:** Uses `overscroll-behavior: contain` on bottom sheets and modal overlays to prevent background map panning while scrolling lists.

---

## 2. Root Cause of Blank Map & Solutions

During mobile deployment and browser testing, blank map screens typically stem from five specific frontend and networking bottlenecks:

### 2.1 Container Zero-Height & Mobile Layout Reflow
* **Problem:** In CSS Grid/Flex layouts, the map canvas container initializes before the mobile browser calculates final flex dimensions, resulting in a computed height of `0px` or `0%`. MapLibre GL creates an empty canvas and suspends tile fetching.
* **Root Cause:** Next.js client component hydration timing combined with dynamic tab switching (e.g. moving between "Home" and "Map" tabs).
* **Fix Applied:**
  1. The map container is styled with explicit `h-full min-h-[100dvh] w-full flex-1 relative`.
  2. Map instance monitors window resize and tab activation:
     ```typescript
     useEffect(() => {
       if (mapInstance.current) {
         requestAnimationFrame(() => {
           mapInstance.current?.resize();
         });
       }
     }, [activeTab]);
     ```
  3. A solid fallback surface `bg-muted` is applied underneath the canvas so users never see a white flash during layer initialization.

### 2.2 Content Security Policy (CSP) Tile & Font Blocking
* **Problem:** Strict CSP rules block font glyphs, sprite images, or vector protocol buffers from third-party tile CDNs.
* **Root Cause:** Next.js `headers()` configuration missing vector tile endpoints and worker scripts.
* **Fix Applied:** In `next.config.mjs`, CSP directives explicitly whitelist `worker-src 'self' blob:`, `child-src 'self' blob:`, and `img-src` / `connect-src` domains for `https://tiles.openfreemap.org`, `https://*.openfreemap.org`, `https://tile.openstreetmap.org`, and `https://*.maptiler.com`.

### 2.3 WebGL Context Loss on Budget Android Devices
* **Problem:** Lower-end devices running multiple tabs discard WebGL contexts when memory pressure spikes.
* **Fix Applied:** Event listeners for `webglcontextlost` and `webglcontextrestored` automatically trigger graceful re-rendering without crashing the application.

### 2.4 Missing API Keys
* **Problem:** Proprietary map providers (Mapbox, Google Maps) display blank grey canvases or watermark error screens when API keys expire or domain referrers mismatch.
* **Fix Applied:** Zero-key architecture cascade defaults to OpenFreeMap and OpenStreetMap raster tiles, guaranteeing 100% operational uptime without keys.

---

## 3. New SQL Migrations to Run

To support spatial proximity indexing, fast radius searches, and emergency SOS markers, run the migrations in exact numeric order:

| Step | Migration File | Purpose | PostGIS / Index |
|:---:|:---|:---|:---|
| **01** | `01_enable_postgis.sql` | Installs PostGIS extension for spatial geography computations | `CREATE EXTENSION IF NOT EXISTS postgis;` |
| **02** | `02_create_profiles.sql` | User profiles with location coordinates & trust stats | `location GEOGRAPHY(Point, 4326)` |
| **03** | `03_create_requests.sql` | Mutual aid requests schema | `location GEOGRAPHY(Point, 4326)`, `idx_requests_location_gist` |
| **04** | `04_create_offers.sql` | Responder offers & volunteer assignments | Foreign keys to profiles & requests |
| **05** | `05_create_ratings.sql` | Post-help reviews and trust ratings | Unique constraint per request-helper pair |
| **06** | `06_create_messages.sql` | Real-time coordination chat messages | Indexed by request_id |
| **07** | `07_create_sos_events.sql` | Emergency SOS records with shareable responder token | Spatial coordinate indexing & 2h expiry |
| **08** | `08_create_spatial_indexes.sql`| High-performance spatial indexing | `CREATE INDEX idx_requests_location_gist ON requests USING GIST (location);` |
| **09** | `09_create_nearby_requests_rpc.sql`| Sub-5ms proximity radius matching | `ST_DWithin`, `ST_Distance` calculations |
| **10** | `10_create_live_stats_rpc.sql` | Regional active helpers and response times | Spatial bounding box query |
| **11** | `11_create_saved_places.sql` | Saved user locations (Home, Work, Clinic) | Coordinates with 10-place limit per user |
| **12** | `12_remove_physics_and_update_ranking.sql` | Clean architecture purge & pure urgency sorting | Priority: Urgency > Proximity > Time |
| **13-18** | `13_...` to `18_...` | Admin verification, badges & security functions | Audit logs, verified responder tiers |
| **19** | `19_expand_categories.sql` | 15-category standard taxonomy & dynamic tags | Array support for `tags text[]` |
| **20** | `20_create_reports.sql` | Abuse reporting & content moderation | Anti-duplicate constraint |
| **21** | `21_update_nearby_requests_tags.sql` | Tag & category filtering in `nearby_requests` | Dynamic query filter with `get_hourly_activity_24h` |

> [!TIP]
> **One-Shot Migration Execution:**
> In Supabase SQL Editor, execute `supabase/all_in_one.sql` to apply all 21 idempotent migrations in a single transaction.

---

## 4. Phone Tap-Through Verification Checklist

Execute this verification checklist on a mobile browser (Chrome on Android or Safari on iOS):

- [ ] **1. Top Search Bar:**
  - [ ] Tap search input; keyboard opens smoothly without pushing bottom tab bar off-screen.
  - [ ] Type 3 characters (e.g. "Cou"); debounced autocomplete results appear in < 250ms.
  - [ ] Tap result item; map camera flies smoothly to selected coordinates with marker indicator.
  - [ ] Tap clear button ("✕"); input clears and map resets to user's local neighborhood.

- [ ] **2. Category Filter Carousel:**
  - [ ] Swipe horizontally along the chip bar; scrolling is fluid with no hitching.
  - [ ] Tap a category chip (e.g. "Blood Donation" or "Medicines"); active state changes color and badge counter updates.
  - [ ] Map pins immediately re-filter to show only selected category.
  - [ ] Tap "All" to reset; all active community pins re-render.

- [ ] **3. Map Controls & Touch Safe Zones:**
  - [ ] Tap **Zoom In (+)** and **Zoom Out (-)**; map zooms smoothly in single-level increments.
  - [ ] Double-tap map surface to zoom in; two-finger tap to zoom out.
  - [ ] Pinch-to-zoom and two-finger rotate; gestures respond with zero lag.
  - [ ] Tap **Recenter (GPS Locate)**; prompts for browser geolocation permission and centers map on current location.
  - [ ] Tap **Layer Switcher**; toggles between standard streets, high-contrast dark, and aerial views.
  - [ ] Verify controls are offset from top bar and bottom sheet by at least 16px.

- [ ] **4. Bottom Sheet & Snap Points:**
  - [ ] Initial state shows Peek header (72px) with number of nearby requests.
  - [ ] Drag handle upwards; sheet snaps to 45% screen height (Half Snap).
  - [ ] Drag handle further upwards; sheet snaps to 85% screen height (Full Snap).
  - [ ] Scroll inside the sheet at 85%; sheet contents scroll smoothly without dragging the sheet down.
  - [ ] Drag down from top of sheet; returns smoothly to Half and then Peek snap points.

- [ ] **5. Pin Previews & Request Interaction:**
  - [ ] Tap a cluster circle; map zooms into cluster and expands individual markers.
  - [ ] Tap an individual request pin; camera centers on pin and opens **PinPreviewCard**.
  - [ ] Card displays: Category icon & badge, Request Title, Proximity distance in km, Urgency pill.
  - [ ] Tap "View Details" button on card; opens full **RequestDetailModal** with complete task description.
  - [ ] Swipe down on PinPreviewCard; card dismisses and pin deselects.

- [ ] **6. Bottom Navigation Clearance:**
  - [ ] Verify that no map buttons or card elements overlap the bottom navigation bar (`pb-24` / `pb-36` padding).
  - [ ] Verify bottom navigation bar remains accessible and clickable at all times.

---

## 5. Zero-Key Architecture

KindLink runs out-of-the-box with **zero proprietary API keys**, ensuring anyone can deploy or self-host an emergency aid instance without paying cloud bills or configuring credit cards.

| Capability | Primary Open Provider | Fallback Open Provider | API Key Required? |
|:---|:---|:---|:---:|
| **Vector Map Tiles** | [OpenFreeMap](https://openfreemap.org) (MapLibre GL) | OpenStreetMap Standard Raster | **No (0 keys)** |
| **Raster Map Tiles** | [OpenStreetMap](https://tile.openstreetmap.org) | CartoDB Positron / Dark Matter | **No (0 keys)** |
| **Geocoding & Autocomplete** | [Komoot Photon](https://photon.komoot.io) (OSM Elasticsearch) | OpenStreetMap Nominatim | **No (0 keys)** |
| **Reverse Geocoding** | [Komoot Photon Reverse](https://photon.komoot.io/reverse) | OpenStreetMap Nominatim | **No (0 keys)** |
| **Turn-by-Turn Routing** | [OSRM Public Routing API](https://routing.openstreetmap.de) | Local Straight-Line Geodesic | **No (0 keys)** |
| **Medical & Hub Discovery** | [Overpass API](https://overpass-api.de) (OpenStreetMap) | Curated Offline Region Hubs | **No (0 keys)** |

### Optional Paid Upgrade Providers
For organizations that wish to use dedicated commercial infrastructure, KindLink supports seamless environment-variable overrides:
- `MAPTILER_API_KEY`: Enables MapTiler vector styles.
- `GEOAPIFY_API_KEY`: Enables Geoapify autocomplete and address geocoding.
- `ORS_API_KEY`: Enables openrouteservice multi-modal vehicle navigation.

If keys are absent, KindLink automatically and silently falls back to open zero-key providers.
