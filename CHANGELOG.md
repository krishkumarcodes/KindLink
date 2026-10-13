# Changelog

All notable changes to **KindLink** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.0.0] - 2026-10-13 - Comprehensive UI/UX Enhancement & Clean Architecture 🚀

### Summary
Major Release v2.0.0 introduces a comprehensive multi-agent UI/UX overhaul across all core views, a unified PostGIS & native GoTrue authentication architecture, universal multi-size favicon and brand logo integration, tactile mobile haptics, slow-network fallbacks, and real-time database probes.

### 🌟 Key Highlights & Enhancements

#### 1. Full UI/UX Design & Micro-Interaction Overhaul
- **Input Fields & Form Polish**: Upgraded input placeholder contrast to `placeholder-slate-400` across dark themes, glowing teal focus rings (`focus:ring-2 focus:ring-teal-500/40`), and icon container focus transitions.
- **Micro-Hover & Tactile Physics**: Enhanced primary buttons and tab selectors with vibrant gradient highlights (`from-teal-600 to-emerald-600`), soft glowing shadows (`shadow-teal-900/40`), and `active:scale-[0.98]` physical press responses.
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
- **Vector SVG Favicon (`favicon.svg` / `icon.svg`)**: Crisp vector representation of the celestial Help Gravity orbitals and heart beacon for high-DPI displays and Next.js 14 App Router native resolution.
- **Brand Consistency**: Configured the official vector SVG logo mark in `AuthPageContent.tsx`, `WelcomeModal.tsx`, `app/layout.tsx`, and PWA `manifest.json`.

#### 4. Mobile Ergonomics & Low-Bandwidth Resilience
- **Tactile Haptic Feedback**: Integrated `navigator.vibrate([200, 100, 200])` on Emergency SOS countdown ticks, trigger, and cancellation, as well as IMU Fall Detection alerts.
- **2G/3G Map Fallback**: Provided an immediate "Switch to List View" button on the Leaflet map loading spinner so users on low-bandwidth networks can bypass tile loading immediately.
- **Physics Lab Simulator**: Interactive kinematics velocity sliders (2 to 60 km/h) with real-time arrival estimates and step-by-step formula breakdown cards.

---

## [v1.0.0] - 2026-10-13 - First Stable Production Release 🎉

### Summary
The initial official, production-hardened release of **KindLink** — an ultra-resilient community mutual aid and emergency response platform built for Asansol Engineering College, West Bengal, and scalable to communities worldwide.

### 🌟 Key Highlights & Systems

#### 1. Real-Time Emergency SOS & Beacon Dispatch
- **Live SOS Tracking Engine**: Token-based unauthenticated and authenticated SOS dispatch (`/sos/[token]`).
- **Inertial Dynamic Fall Detector**: Hardware accelerometer calibration ($|\vec{a}_{\text{net}}| > 22.0\text{ m/s}^2 \approx 2.24g$) with an automated 10-second safety countdown.
- **Heartbeat & Responder Tracking**: Live coordinate broadcaster and volunteer transit location sharing over Supabase Realtime WebSocket channels.

#### 2. Physics & Geodesic Calculation Engines
- **Help Gravity Model**: Inverse-square Newtonian proximity engine scoring requests by urgency weight and distance:
  $$G_{\text{score}} = \frac{W_{\text{category}} \times M_{\text{urgency}}}{d^2 + \epsilon}$$
- **Haversine Geodesic Distance Matrix**: Sub-second Great-Circle routing and transit ETA calculations.
- **Interactive Physics Lab**: In-browser simulator demonstrating real-time vector forces and gravitational ranking.

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
