# Changelog

All notable changes to **KindLink** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v3.0.0] - 2026-10-14 - Design, Location, Clean Architecture & Internationalization Upgrade 🚀

### Summary
Major Release v3.0.0 brings an end-to-end design, typography, live location, and language upgrade to KindLink. It introduces self-hosted typography via `next/font`, an aligned Home action hero with equalized Emergency SOS and Ask for Help buttons, responsive Community Pulse metrics with zero truncation, brand-customized SVG illustrations in the Profile center, real road routing via OSRM, a hospital locator via Overpass OSM, Google Translate as the single translation engine (29 verified languages), and the complete eradication of legacy experimental algorithms and sensor triggers from the entire codebase and database.

### 🌟 Key Highlights & Enhancements

#### 1. Self-Hosted Typography & Sans-Serif System
- **Self-Hosted Next.js Fonts**: `Plus Jakarta Sans` for headings and `Inter` for body copy loaded via `next/font/google` (`display: swap`, CSS variables `--font-heading` and `--font-sans`).
- **Zero Serif Fallbacks**: Completely eliminated serif typography across all views; standard fallback stack uses `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
- **Automated Typography QA**: Verified via Playwright and automated font verification suite (`npm run check:fonts`).

#### 2. Redesigned Home Screen & Action Ergonomics
- **Dynamic Personalized Greeting**: Greets users with their real first name, contextual time-of-day greeting ("Good morning", "Good afternoon", "Good evening"), and authenticated database role indicator (purged hard-coded personas).
- **Synchronized Location Subtitle**: Hero subtitle shares the exact same live source of truth as the header location chip ("Kalyanpur · Verified community aid").
- **Aligned Action Controls**: Equal-dimensioned 64px primary buttons for "Ask for Help" and "Emergency SOS", stacked on mobile (<640px) with 12px gap and side-by-side on tablet/desktop. Emergency SOS features an inset pulsing ring glow (zero layout shift) and hold-to-activate 2s timer.
- **Realtime Community Pulse**: Streamlined header with single live pill and 44px refresh button; 4 non-truncated cards (2x2 on mobile, 4 across on desktop) with tabular numerals, interactive info sheets, and "— Not enough data yet" empty states.
- **Overflow & Tab Spacing**: Applied `pb-36` bottom padding across all scrolling containers, eliminating tab bar and floating action button overlap.

#### 3. Single-Source-of-Truth Location System & Road Routing
- **Unified Location Provider**: `LocationProvider` tracks position with throttled high-accuracy `watchPosition` (pausing on hidden tabs), accuracy display, and localStorage persistence.
- **Location Sheet**: "Use my live location", address autocomplete (Nominatim with caching & rate-limiting), and interactive draggable Pin Drop map.
- **OSRM Road Distance & Travel Times**: Real road distances and multimodal travel durations (walking, cycling, driving) with fallback straight-line geodesic calculations and route mini-map.
- **Overpass OSM Hospital Finder**: Real-time hospital, blood bank, and clinic directory with 1-tap "Call" and "Directions" actions, backed by 12 curated Asansol healthcare centers.

#### 4. Internationalization & Google Translate Engine
- **Single Translation Engine**: Clean integration of Google Translate via official client architecture (`#google_translate_element`), CSP whitelist in `next.config.mjs`, and cookie persistence (`googtrans=/en/${code}`).
- **29 Verified Languages**: 17 Indian languages and 12 international languages with full RTL layout support for Urdu and Arabic.
- **Zero Dictionary Bloat**: Deleted 33 legacy non-English JSON files, reducing bundle weight while enabling instant translation switching across the entire app.

#### 5. Complete Clean Architecture & Database Purge
- **Zero Legacy Concepts**: Eradicated all legacy experimental scoring models, motion sensor triggers, and academic calculation engines across all components, styles, tests, docs, and metadata. Verified by automated gate (`npm run check:clean`).
- **Urgency Dispatch Ranking**: Requests strictly prioritized by Urgency Level (Critical > High > Medium > Low), then nearest road/geodesic distance, then waiting time.
- **Database Migration 12**: `supabase/sql/12_remove_physics_and_update_ranking.sql` drops legacy score columns and updates `nearby_requests` with 100% test pass on PostgreSQL.

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
The initial official, production-hardened release of **KindLink** — an ultra-resilient community mutual aid and emergency response platform built for Asansol Engineering College, West Bengal, and scalable to communities worldwide.

### 🌟 Key Highlights & Systems

#### 1. Real-Time Emergency SOS & Beacon Dispatch
- **Live SOS Tracking Engine**: Token-based unauthenticated and authenticated SOS dispatch (`/sos/[token]`).
- **Emergency Alert System**: Automated safety countdown with emergency contact notification and rapid dispatch triggers.
- **Heartbeat & Responder Tracking**: Live coordinate broadcaster and volunteer transit location sharing over Supabase Realtime WebSocket channels.

#### 2. Urgency Dispatch & Geodesic Routing Engines
- **Urgency Dispatch Engine**: Multi-tiered prioritization scoring requests by urgency weight and distance.
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
