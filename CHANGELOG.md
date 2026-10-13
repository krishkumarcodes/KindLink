# Changelog

All notable changes to **KindLink** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
