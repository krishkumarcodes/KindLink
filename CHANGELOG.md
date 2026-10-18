# Changelog

All notable changes to **KindLink** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v4.4.0] - 2026-10-18 - Request Details Overhaul, Route Map Fix, Offer Help Redesign, Own-Request Rules, Circular Badges & Filter Sheet 🚀

### Summary
Release v4.4.0 is a comprehensive overhaul and polish of the Request Details experience, Offer Help workflow, mini-map route rendering, own-request prevention rules across UI/API/Database, circular badge medal geometry, and the Requests page filter bottom sheet.

### 🌟 Key Highlights & Enhancements
- **Request Details Sheet Redesign**: Portal-rendered bottom sheet with sticky top bar, sticky bottom action bar, visible gap below status bar (`pt-[max(12px,calc(env(safe-area-inset-top)+12px))]`), 3 equal-width info tiles (Waiting, Needed by, Distance), category detail chips, and live Supabase Realtime progress tracker (Open -> Offered -> Accepted -> On the way -> Arrived -> Completed).
- **Route Map Card & Blank Grey Map Root-Cause Fix**: Resolved 0x0 container size during modal transitions using `ResizeObserver` and multi-stage `invalidateSize()` calls; added multi-tier fallback (MapTiler -> Carto Voyager/Dark -> OSM) with `referrerPolicy="strict-origin-when-cross-origin"`; teal 6px route polyline with outline; 3-button segmented control (Bike, Walking, Car) updating distance and ETA live.
- **Nearby Places Section**: Capped at 3 places relative to real request coordinates (<35 km), with conditional Call buttons rendered only when phone numbers are available.
- **Offers Received & Action Buttons**: Unified WCAG AA contrast category-coloured buttons (Blood `#C62828`, Medical gear `#0F766E`, Elderly care `#4F46E5`, Books `#047857`, Transit `#B45309`); requester offers section with count pill, action needed tag, quote blocks, 48px Decline and Accept buttons, accept confirmation sheet, and decline modal.
- **Own-Request Prevention**: Multi-layered enforcement preventing users from helping their own requests across UI ("Your request" badge with owner actions), Store/Adapters (`own_request` code), Server API (`403 Forbidden`), and PostgreSQL database trigger `trg_prevent_self_offer` on `public.offers`.
- **Offer Help Sheet Redesign**: Shared portal bottom sheet with visual viewport keyboard adaptation, "You are offering as" card, auto-growing message textarea (0/300) with category-specific quick replies, arrival time picker, optional live location switch, and 52px category-coloured "Send offer" button.
- **Badge Medals & Profile Location Polish**: True circular medals (`border-radius: 50%`, `overflow: hidden`, 1:1 aspect ratio) with zero square dark corners and zero yellow haze; pin button moved outside level pills; profile location line resolves live GPS area or saved home neighborhood, removing hard-coded college fallbacks.
- **Requests Page & Filter Sheet**: Search placeholder shortened to `"Search requests"`; filter panel moved into shared portal bottom sheet with sticky header and footer, simplified distance slider labels (`1 km Nearby, 10 km, 25 km City, 50 km Wide`), individual coloured urgency dots, and accessible `SwitchRow`.

---

## [v3.0.0] - 2026-10-14 - Design, Location, Clean Architecture & Internationalization Upgrade 🚀

### Summary
Major Release v3.0.0 brings an end-to-end design, typography, live location, and language upgrade to KindLink. It introduces self-hosted typography via `next/font`, an aligned Home action hero with equalized Emergency SOS and Ask for Help buttons, responsive Community Pulse metrics with zero truncation, brand-customized SVG illustrations in the Profile center, real road routing via OSRM, a hospital locator via Overpass OSM, Google Translate as the single translation engine (29 verified languages), and the complete eradication of legacy experimental algorithms and sensor triggers from the entire codebase and database.

### 🌟 Key Highlights & Enhancements

#### 1. Self-Hosted Typography & Sans-Serif System
- **Self-Hosted Next.js Fonts**: `Plus Jakarta Sans` for headings and `Inter` for body copy loaded via `next/font/google` (`display: swap`, CSS variables `--font-heading` and `--font-sans`).
- **Zero Serif Fallbacks**: Completely eliminated serif typography across all views; standard fallback stack uses `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
- **Automated Typography QA**: Verified via Playwright and automated font verification suite (`npm run check:fonts`).

#### 2. Header & Location Redesign
- **Icon-Only Location Button**: Replaced truncated "K..." chip with a 44px touch-target icon button (map-pin icon, pulsing green dot when live GPS is active, orange dot when off/denied, tooltip and accessible aria-label "Change location").
- **Enhanced Header SOS Button**: Red button with siren icon, 48px height aligned with header controls, and subtle inner glow pulse complying with `prefers-reduced-motion`.
- **Location Modal / Bottom Sheet**:
  - Edge-to-edge bottom sheet on mobile (`<640px`) with drag handle, sticky header, sticky footer, and internal scroll; centered modal on desktop.
  - Three single-line tabs: "Search", "Drop pin", "Saved".
  - Prominent "Use my live location" with GPS accuracy display and browser permission instructions.
  - Real Nominatim autocomplete with in-memory caching and OpenStreetMap attribution.
  - Draggable Leaflet Pin Drop tab with reverse geocoding.
  - Saved places backed strictly by authentic user-saved locations (add, rename, delete).
  - Search radius slider (1 to 50 km) syncing with Home, Requests feed, and Map in real time.

#### 3. Emergency SOS System (End-to-End)
- **Non-Truncating Sheet Layout**: Sticky header, area name subtitle, full safe-area bottom padding (`pb-36`).
- **User Card**: Displays user's full name (wraps onto 2 lines if long), phone number (with "Add your phone number" prompt if missing), and verification badge on its own line.
- **Hold-to-Activate Button**: 2-second hold with circular SVG progress ring, haptic vibration (`navigator.vibrate`), release-to-cancel, and accessible keyboard alternative.
- **Real Activation Logic**:
  - Queries high-accuracy location from `LocationProvider` / `navigator.geolocation`.
  - Dispatches `sos_events` database record and creates a `CRITICAL` urgency request.
  - Broadcasts live alert to nearby verified helpers over Supabase Realtime WebSocket channel.
  - Displays "SOS is active" screen with running elapsed stopwatch, live count of helpers notified, number of accepted helpers with distance & ETA, and nearest helper route mini-map.
  - "Share my live location" panel with one-tap WhatsApp, SMS, and Copy-link actions for saved emergency contacts (truthful tap-to-send wording).
  - Public token-based tracking URL `/sos/[token]` (noindex, 2-hour expiry, stoppable via "I am safe").
  - Emergency lines directory: 112 (National Emergency), 108/102 (Ambulance), 100 (Police), 101 (Fire) with fixed single-line Call buttons and nearest OpenStreetMap hospital list.

#### 4. Themed High-Contrast Live Map
- **Dynamic Tile Provider**: Switches between CARTO Dark Matter in dark mode and CARTO Positron in light mode.
- **Solid High-Contrast Floating Controls**: WCAG AA contrast on top bar, filter chips, right control stack (44px touch targets), and bottom preview card in separated safe zones.
- **Honest Pin Counters**: Honest counts based on real database records and selected area (`${userAreaName}: ${requestsCount} requests • ${placesCount} places`).
- **Pin Clustering & Routing**: Marker clustering for requests and facilities; tap preview card with distance, "Directions" (OSRM road routes for walk, bike, car), and "Call".

#### 5. Realtime Community Pulse & Category Grid
- **Community Pulse**: Animated number counters, ticking relative timestamp ("updated 5s ago"), pulsing live dot, 24h inline SVG sparkline, and anonymized activity ticker. 4 cards with matching `h-[154px]` heights and identical baselines.
- **Truthful Metrics**: "Trust match" displays `"—"` with "Not enough ratings yet" until at least 5 ratings exist in the database.
- **Browse Aid by Category**: Clean 2-column mobile grid (3/5 columns on desktop) with 5 cards (Blood Donation, Medical Gear, Elderly Care, Books and Study, Emergency Transit) displaying live request counts, urgency dots, and opening filtered requests. Includes "See all categories" modal.
- **Wizard Cleanliness**: Eradicated all leftover numeric score/weight ranking labels from category cards and UI strings; replaced with friendly urgency hints.

#### 6. Profile, Notifications & Security
- **Authentic Profile**: Purged all fake demo personas ("Dr. Ananya Roy", fake phone numbers, fake stats). Displays real display name, username, verification stepper, real joined date, and authentic stats.
- **Edit Profile**: Avatar upload, username availability check, Indian phone validation (`+91...`), and spoken languages chip picker.
- **Notification Center**: Bottom sheet on mobile / popover on desktop, unread count synced with header bell, "Mark all as read", filter chips, Today/Earlier groupings, and push notification prompt.
- **Readability & Settings**: 3 Text Size Modes (Compact, Standard, Elderly Large with $\ge$52px touch targets via rem scaling), Light/Dark/System themes, reduce motion toggle, PWA install prompt, and server-verified password updates.

#### 7. Language Engine Root Cause Resolution
- **Static `<html lang="en">`**: Fixed bug where dynamic `html lang` caused Google Translate to believe the document was already in the target language.
- **29 Verified Languages**: 17 Indian + 12 International languages with full RTL support for Urdu (`ur`) and Arabic (`ar`).
- **Dynamic Content MutationObserver**: Automatically translates dynamic modals, sheets, toasts, and feed updates.
- **Service Worker Bypass**: `public/sw.js` explicitly bypasses translation APIs and scripts from caching.

#### 8. Complete Clean Architecture & Database Purge
- **Zero Forbidden Concepts**: Eradicated all experimental scoring models and sensor triggers across all files (`npm run check:clean`).
- **Urgency Dispatch Ranking**: Requests strictly prioritized by Urgency Level (Critical > High > Medium > Low), then nearest road/geodesic distance, then waiting time.
- **Pitch Day Scripts**: Added `npm run seed:demo` and `npm run seed:demo:remove`.
- **Operations Guide**: Created `docs/UPDATE_GUIDE_3.md` covering architecture, SQL migrations, deployment, and tap-through QA checklist.

---

## [v2.0.0] - 2026-10-13 - Comprehensive UI/UX Enhancement & Clean Architecture 🚀

### Summary
Major Release v2.0.0 introduces a comprehensive multi-agent UI/UX overhaul across all core views, a unified PostGIS & native GoTrue authentication architecture, universal multi-size favicon and brand logo integration, tactile mobile haptics, slow-network fallbacks, and real-time database probes.

### 🌟 Key Highlights & Enhancements

#### 1. Full UI/UX Design & Micro-Interaction Overhaul
- **Input Fields & Form Polish**: Upgraded input placeholder contrast to `placeholder-slate-400` across dark themes, glowing teal focus rings (`focus:ring-2 focus:ring-teal-500/40`), and icon container focus transitions.
- **Micro-Hover & Tactile Interactions**: Enhanced primary buttons and tab selectors with vibrant gradient highlights (`from-teal-600 to-emerald-600`), soft glowing shadows (`shadow-teal-900/40`), and `active:scale-[0.98]` tactile press responses.
- **Showcase Demo Account Cards**: Elevated persona cards with frosted glass styling (`backdrop-blur-md bg-slate-900/80 border-slate-800`), distinct role badges (`Responder`, `Need Aid`, `Super Admin`), and 1-click Quick Sign In buttons.
- **Request Feed & Urgent Cards**: Frosted borders, semantic urgency gradient pills (Critical, High, Medium, Low), structured waiting-time badges, and dual tactile buttons ("I Can Help" & "Details").
- **Community Pulse KPIs**: 4 interactive stat cards with glowing borders, hover elevation, and interactive frosted popovers on desktop and mobile.
- **New Request Wizard**: Compact responsive breadcrumbs (`Step X of 5`) on narrow screens `<360px` preventing label truncation, upgraded input fields, and tactile navigation controls.

#### 2. Native Supabase GoTrue Auth & Cloud-Safe Master Schema
- **Master Pure DDL Schema (`supabase/sql/all_in_one.sql`)**: 100% idempotent public schema setup with PostGIS spatial indexes, RLS security policies, and zero direct tampering with GoTrue internal generated columns.
- **Official GoTrue Admin Seeder (`scripts/seed-demo-users.mjs`)**: Automated provisioning of primary and alias demo accounts via official GoTrue Admin API with HTTP 200 verification.
- **Removal of Legacy Fragmentation**: Eradicated obsolete numbered migrations and legacy `auth_fix` folders from both local and git trees.
- **Dynamic Real-Time Health Probe (`/api/health`)**: Configured with `force-dynamic` to evaluate live PostgreSQL connectivity and latency on every request without build-time caching.

#### 3. Universal Multi-Format Favicon & Official Logo Architecture
- **Multi-Resolution Favicon (`favicon.ico`)**: Generated 64x64, 48x48, 32x32, 16x16 icon layers for universal desktop and legacy browser tab recognition.
- **Vector SVG Favicon (`favicon.svg` / `icon.svg`)**: Crisp vector representation of the community network orbitals and heart beacon for high-DPI displays and Next.js 14 App Router native resolution.
- **Brand Consistency**: Configured the official vector SVG logo mark in `AuthPageContent.tsx`, `WelcomeModal.tsx`, `app/layout.tsx`, and PWA `manifest.json`.

#### 4. Mobile Ergonomics & Low-Bandwidth Resilience
- **Tactile Haptic Feedback**: Integrated `navigator.vibrate([200, 100, 200])` on Emergency SOS countdown ticks, trigger, and cancellation.
- **2G/3G Map Fallback**: Provided an immediate "Switch to List View" button on the Leaflet map loading spinner so users on low-bandwidth networks can bypass tile loading immediately.
- **Interactive Map & Routing**: Multi-modal travel time calculations (walking, cycling, vehicle) with turn-by-turn road route visualization.

---

## [v1.0.0] - 2026-10-13 - First Stable Production Release 🎉

### Summary
The initial official, production-hardened release of **KindLink** — an ultra-resilient community mutual aid and emergency response platform built for KindLink Community Initiative, West Bengal, and scalable to communities worldwide.

### 🌟 Key Highlights & Systems

#### 1. Real-Time Emergency SOS & Beacon Dispatch
- **Live SOS Tracking Engine**: Token-based unauthenticated and authenticated SOS dispatch (`/sos/[token]`).
- **Emergency Alert System**: Automated safety countdown with emergency contact notification and rapid dispatch triggers.
- **Heartbeat & Responder Tracking**: Live coordinate broadcaster and volunteer transit location sharing over Supabase Realtime WebSocket channels.

#### 2. Urgency Dispatch & Geodesic Routing Engines
- **Urgency Dispatch Engine**: Multi-tiered prioritization scoring requests by urgency level and distance.
- **Great-Circle Geodesic Distance Matrix**: Sub-second routing and transit ETA calculations.
- **Interactive Community Simulator**: In-browser simulator demonstrating real-time aid matching and dispatch ranking.

#### 3. Supabase PostGIS & GoTrue Auth Architecture
- **Cloud-Safe Migrations**:
  - `supabase/sql/auth_fix/17_fix_showcase_auth_identities.sql`: GoTrue `auth.identities` synchronization resolving password login for demo accounts.
  - `supabase/sql/all_in_one_v2.sql`: Single atomic master migration with PostGIS GiST spatial indexing, RLS security policies, and cleanup functions.
  - `supabase/sql/06_triggers.sql`: Collision-safe `handle_new_user()` trigger protecting against username race conditions.
- **Showcase Demo Accounts & Dual-Credential Aliases**:
  - Volunteer: `kind_volunteer` / `volunteer@kindlink.demo` (`KindLink#Volunteer2026` or `KindLink#2026`)
  - Requester: `need_aid` / `requester@kindlink.demo` (`KindLink#Requester2026` or `KindLink#2026`)
  - Platform Admin: `admin_kindlink` / `admin@kindlink.demo` (`KindLink#Admin2026` or `KindLink#2026`)

#### 4. Internationalization & Regional Localization
- **34 Languages Supported**:
  - 17 Official & Regional Indian Languages (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.)
  - 5 Jharkhand Regional Dialects (Santhali, Kurmali, Khortha, Ho, Mundari)
  - 12 International Languages with full Right-to-Left (RTL) Arabic/Persian/Urdu script support.

#### 5. Cloud Deployment & Docker Production Runtime
- **Multi-Stage Dockerfile**: Node.js 20 Alpine standalone output bundle with security user non-root isolation.
- **Render Cloud Service Blueprint**: `render.yaml` infrastructure-as-code specification with automated `/api/health` monitoring.
- **Resilient Key Resolvers**: Universal support for both legacy JWT keys and modern 2024+ format (`sb_publishable_...` and `sb_secret_...`).
