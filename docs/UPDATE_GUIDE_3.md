# KindLink Update & Operations Guide (Version 3.0.0) 🚀

Welcome to **KindLink v3.0.0**. This guide outlines all recent architectural enhancements, database maintenance steps, pitch day demonstration scripts, Render deployment instructions, and a complete tap-through QA checklist.

---

## 1. Release Overview & Highlights

Version 3.0.0 is a milestone upgrade focused on production-grade reliability, truthful real-time community data, WCAG AA accessibility, and multilingual accessibility across 29 languages.

### Major Upgrades
1. **Header & Navigation**:
   - Clean 44px icon-only location button with live GPS status indicator (pulsing green dot when live GPS is active, orange dot when off/denied).
   - Upgraded 48px Header Emergency SOS button with subtle inner pulse (prefers-reduced-motion compliant).
   - Zero layout clipping or text truncation down to 360px viewport width.
2. **Location System (Bottom Sheet & Modal)**:
   - Mobile-first bottom sheet (<640px) with drag handle, sticky header, and sticky footer; centered dialog on desktop.
   - Real Nominatim autocomplete with in-memory caching and OSM attribution.
   - Draggable Leaflet Pin Drop tab with reverse-geocoding.
   - Saved Places tab backed strictly by authentic user data (add, rename, delete).
   - 1 to 50 km search radius slider synchronizing with Home, Requests feed, and Map in real time.
3. **Emergency SOS System**:
   - 2-second hold-to-activate button with circular SVG progress ring and mobile haptic vibration (`navigator.vibrate`).
   - Real database dispatch (`sos_events` + `CRITICAL` urgency request) broadcasting over Supabase Realtime WebSocket channels.
   - Live SOS screen with elapsed stopwatch, live responder counts, and nearest helper route mini-map.
   - Honest "Tap to send" WhatsApp, SMS, and live location links for emergency contacts.
   - Public unguessable tracking URL `/sos/[token]` (expires in 2 hours, stoppable by requester).
   - Accessible emergency helplines (112, 108/102, 100, 101) with single-line Call buttons and OpenStreetMap hospital directory.
4. **Themed High-Contrast Map**:
   - Dynamic CARTO tile theming (Positron for light theme, Dark Matter for dark theme).
   - Solid, high-contrast floating control backgrounds with separated safe zones (no overlapping controls).
   - Marker clustering for requests and healthcare facilities (Hospitals, Clinics, Pharmacies, Blood Banks).
   - Real road routing via OSRM with distance, duration, and transit mode toggles (walk, bike, car).
5. **Realtime Community Pulse & Categories**:
   - Animated counter transitions, ticking "updated Xs ago" indicator, and 24-hour inline SVG sparklines.
   - Strictly truthful stats: "Trust match" displays `"—"` with "Not enough ratings yet" until at least 5 ratings exist.
   - 2-column mobile category grid (3/5 columns on desktop) with live request counts and urgency dots.
   - Complete eradication of legacy numeric score/weight ranking labels across the wizard and category cards (replaced with friendly urgency hints).
6. **Profile, Settings & Security**:
   - Purged all hardcoded mock profile data ("Dr. Ananya Roy", fake phone numbers, fake stats).
   - Verified 3-step verification stepper, avatar upload, and Indian phone validation (`+91...`).
   - Single clean Emergency Contacts card supporting up to 3 contacts.
   - 3 Text Size Modes: Compact, Standard, and Elderly Large ($\ge$52px touch targets, rem scaling).
   - PWA Install App prompt with Safari iOS guidance.
   - Server-verified password updates via Supabase GoTrue.
7. **Google Translate Engine**:
   - Root cause fix: preserved `<html lang="en">` as source language so Google Translate never falsely considers the document pre-translated.
   - 29 verified languages (17 Indian + 12 International).
   - Native RTL support for Urdu (`ur`) and Arabic (`ar`).
   - Dynamic `MutationObserver` auto-translating newly opened modals and real-time feed updates.

---

## 2. Supabase SQL & Database Maintenance

### Verifying Migration 12
Ensure migration 12 has been executed in your Supabase SQL Editor. This migration dropped all legacy score columns and created the clean urgency-first ranking engine:

```sql
-- File: supabase/sql/12_remove_physics_and_update_ranking.sql
-- Run this in the Supabase Dashboard -> SQL Editor if not previously executed:
```

### Removing Old Demo / Mock Data
If your Supabase database has leftover demo users, legacy requests, or mock ratings, clean them with one simple script:

```bash
# Clean all demo data from Supabase:
npm run seed:demo:remove
```

Alternatively, you can run this SQL query directly in your Supabase SQL Editor:
```sql
DELETE FROM public.ratings WHERE id IN (
  SELECT id FROM public.ratings WHERE comment LIKE '%KindLink%' OR comment LIKE '%quick help%'
);

DELETE FROM public.notifications WHERE title LIKE '%KindLink%' OR title LIKE '%demo%';

DELETE FROM public.offers WHERE helper_id IN (
  SELECT id FROM public.profiles WHERE username IN ('kind_volunteer', 'swati_durgapur', 'priya_nurse', 'amit_dhanbad')
);

DELETE FROM public.requests WHERE requester_id IN (
  SELECT id FROM public.profiles WHERE username IN ('need_aid', 'vikram_driver', 'rahul_aec', 'priya_nurse', 'amit_dhanbad')
);

DELETE FROM public.profiles WHERE username IN (
  'kind_volunteer', 'need_aid', 'admin_kindlink', 'swati_durgapur', 'priya_nurse', 'vikram_driver', 'rahul_aec', 'amit_dhanbad'
);
```

---

## 3. Pitch Day Demonstration Scripts

For pitch day demonstrations, you can seed realistic, geographic data across Asansol, Durgapur, and Dhanbad, and wipe it instantly after the presentation.

### 1. Seed Demo Data
```bash
npm run seed:demo
```
**What this populates:**
- **Demo Accounts** (Password for all: `KindLink#2026`):
  - Volunteer: `volunteer@kindlink.demo` / `kind_volunteer`
  - Requester: `requester@kindlink.demo` / `need_aid`
  - Admin: `admin@kindlink.demo` / `admin_kindlink`
- **25 Realistic Mutual Aid Requests** across Asansol (District Hospital, Ushagram, Burnpur, Kalyanpur), Durgapur (City Centre, Benachity, Bidhannagar), and Dhanbad (SNMMCH, Bank More).
- **Active Offers & Notifications** demonstrating real-time matching.

### 2. Remove Demo Data
```bash
npm run seed:demo:remove
```
Immediately purges all demo records and returns the platform to a pristine state.

---

## 4. Render Redeployment Guide

KindLink is hosted on Render via Docker (`https://kindlink-gd8e.onrender.com/`).

### Step-by-Step Deployment:
1. **Push Changes to GitHub**:
   ```bash
   git push origin main --tags
   ```
2. **Render Dashboard**:
   - Navigate to [Render Dashboard](https://dashboard.render.com).
   - Select your Web Service: `kindlink-gd8e`.
   - Click **Manual Deploy** -> **Deploy latest commit**.
3. **Verify Environment Variables**:
   Ensure the following environment variables are configured in the Render settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Public Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (for demo seeding and administrative actions)
   - `NEXT_PUBLIC_SITE_URL`: `https://kindlink-gd8e.onrender.com`
   - `NODE_ENV`: `production`

---

## 5. Comprehensive Tap-Through QA Checklist

Use this checklist on mobile and desktop browsers to verify every screen:

### 1. Header & Location
- [ ] Tapping the map-pin location button opens the "Your location" bottom sheet on mobile and modal on desktop.
- [ ] The location button shows a green status dot when GPS is active and an orange dot when off.
- [ ] Tapping "Use my live location" asks for GPS permission and displays accuracy (e.g. `±12m`).
- [ ] Search input autocompletes real addresses (e.g., typing "Asansol Railway Station" shows OSM results).
- [ ] "Drop pin" tab opens an interactive map with a draggable pin; clicking "Confirm location" updates your area.
- [ ] Changing the radius slider (1 to 50 km) updates the distance radius for requests and map pins.
- [ ] Header SOS button has a 48px height, red background, siren icon, and subtle inner glow.

### 2. Emergency SOS
- [ ] Opening Emergency SOS displays the user card with full name and verified badge.
- [ ] Holding the SOS button for 2 seconds fills the progress ring, triggers haptic vibration, and activates the SOS beacon.
- [ ] Active SOS screen displays:
  - Running elapsed timer.
  - Live count of helpers notified.
  - Distance and ETA of nearest accepted helper.
  - Route mini-map.
  - WhatsApp, SMS, and Copy Link buttons with truthful tap-to-send wording.
- [ ] Tapping "I am safe" deactivates the beacon and notifies responders.
- [ ] Emergency helpline cards (112, 108/102, 100, 101) display single-line Call buttons.
- [ ] Nearest hospitals list displays real OSM hospitals with Call and Directions buttons.

### 3. Themed Live Map
- [ ] In Dark Mode, map renders CARTO Dark Matter tiles.
- [ ] In Light Mode, map renders CARTO Positron tiles.
- [ ] All floating controls have solid, high-contrast backgrounds (no unreadable glass-on-white).
- [ ] Markers cluster cleanly without piling on top of each other.
- [ ] Tapping a marker opens a preview card with distance, "Directions" (OSRM route line), "Call", and "View details".

### 4. Home View
- [ ] Realtime Community Pulse cards have aligned baselines and identical heights.
- [ ] "Trust match" displays `"—"` with "Not enough ratings yet" when under 5 ratings exist.
- [ ] "Browse Aid by Category" displays a clean 2-column grid on phones (5 cards) with live request counts.
- [ ] Tapping "See all categories" opens the complete categories modal.

### 5. Requests Feed & Filter Sheet
- [ ] Search input has a vertically centered search icon.
- [ ] Filter sheet allows filtering by category, urgency, radius (1-50 km), and verified requesters.
- [ ] Active filters show as removable chips.
- [ ] If filters hide requests, displays truthful empty state: `"N requests are hidden by your filters"` with a working `"Clear all filters"` button.

### 6. Profile & Settings
- [ ] Profile displays authentic user name, verification status, joined date, and stats (no fake names like "Dr. Ananya Roy").
- [ ] Edit Profile allows editing avatar, username, bio, and phone number (`+91...`).
- [ ] Up to 3 emergency contacts can be added, edited, or deleted.
- [ ] Settings allows switching between Light, Dark, and System themes.
- [ ] Text size switcher supports Compact, Standard, and Elderly Large ($\ge$52px touch targets).
- [ ] Change Password verifies current password before updating.

### 7. Multilingual Google Translate
- [ ] Opening language picker shows 29 clean languages (17 Indian + 12 International).
- [ ] Selecting Hindi (`hi`), Bengali (`bn`), or German (`de`) translates UI labels.
- [ ] Selecting Urdu (`ur`) or Arabic (`ar`) switches layout direction to RTL (`dir="rtl"`).
- [ ] "Switch to English" shortcut instantly restores original English content.

---

## 6. Google Translate Troubleshooting

If Google Translate does not translate on a client device:
1. **Adblocker / Privacy Extensions**:
   - Some browser extensions block scripts from `translate.google.com` or `translate.googleapis.com`. Whitelist the domain or test in an incognito window without extensions.
2. **Network / Firewall Restrictions**:
   - Verify that your network allows outgoing HTTPS connections to `translate.googleapis.com` and `www.gstatic.com`.
3. **Cookie Verification**:
   - KindLink sets the official cookie: `googtrans=/en/${targetCode}`. Open Developer Tools -> Application -> Cookies and verify `googtrans` is present.
4. **Hard Reset to English**:
   - Click the language icon in the header -> tap **"Switch to English"**. This clears the `googtrans` cookie and restores native English.
