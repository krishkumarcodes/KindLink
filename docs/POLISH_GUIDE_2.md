# KindLink Polish & Verification Guide (Phase 2)

Welcome to the **KindLink Polish & Verification Guide**!

This guide explains all the shiny new features, bug fixes, and safety improvements we built to make KindLink feel smooth, fast, and easy to use on any phone or computer.

Everything here is written in simple, friendly words (like you are explaining it to a smart 12-year-old friend). You can follow this guide to test the app with your fingers, run the database scripts, and test on two phones side-by-side.

---

## Table of Contents
1. [The 8 Big Improvements Explained Simply](#the-8-big-improvements-explained-simply)
   - [1. The Magic Popup Shield (Overlay System)](#1-the-magic-popup-shield-overlay-system)
   - [2. The Super Clean Header Bar](#2-the-super-clean-header-bar)
   - [3. The Quick Profile Menu](#3-the-quick-profile-menu)
   - [4. The Smart Notification Bell](#4-the-smart-notification-bell)
   - [5. Instant Language Switcher (English, Hindi, Bengali)](#5-instant-language-switcher-english-hindi-bengali)
   - [6. Safe Emergency SOS & Secret 2-Hour Live Links](#6-safe-emergency-sos--secret-2-hour-live-links)
   - [7. Saved Places That Never Disappear (Migration 16)](#7-saved-places-that-never-disappear-migration-16)
   - [8. Home Screen Tune-Up & Spinning Pulse](#8-home-screen-tune-up--spinning-pulse)
2. [Database Update Guide (Supabase SQL)](#database-update-guide-supabase-sql)
   - [Exact Run Order of Migration Files](#exact-run-order-of-migration-files)
   - [How to Run Migration 16 in Supabase](#how-to-run-migration-16-in-supabase)
   - [How to Test the Database Locally with Bash](#how-to-test-the-database-locally-with-bash)
3. [Step-by-Step Finger Tap Test Guide](#step-by-step-finger-tap-test-guide)
   - [Test 1: Opening Popups on Small Phones (No Jumping!)](#test-1-opening-popups-on-small-phones-no-jumping)
   - [Test 2: Tapping the Header Buttons](#test-2-tapping-the-header-buttons)
   - [Test 3: Changing Your Language](#test-3-changing-your-language)
   - [Test 4: Ringing the Notification Bell](#test-4-ringing-the-notification-bell)
   - [Test 5: Saving Home & Work Places (Up to 10 Places)](#test-5-saving-home--work-places-up-to-10-places)
   - [Test 6: Sounding the Emergency SOS Beacon](#test-6-sounding-the-emergency-sos-beacon)
   - [Test 7: Checking Home Pulse & Spinning Refresh](#test-7-checking-home-pulse--spinning-refresh)
   - [Test 8: Reading "How KindLink Works" Without Dots](#test-8-reading-how-kindlink-works-without-dots)
4. [Testing on Two Devices Side-by-Side](#testing-on-two-devices-side-by-side)
   - [Device A: The Requester / SOS Beacon](#device-a-the-requester--sos-beacon)
   - [Device B: The Helper / Responder](#device-b-the-helper--responder)
   - [What Should Happen in Real Time](#what-should-happen-in-real-time)

---

## The 8 Big Improvements Explained Simply

### 1. The Magic Popup Shield (Overlay System)
- **What was annoying before:** When you tapped a menu or a popup, the whole website behind it would sometimes jump around or twitch. On small phone screens, menus would get cut off at the bottom of the screen.
- **How we fixed it:** We built a new tool called `OverlayPortal` (`components/ui/OverlayPortal.tsx`). It lifts all popups and menus to the very top layer of the screen. 
  - **No screen jumping:** It locks the background gently without moving your page even 1 single pixel.
  - **Smart flipping:** If a menu doesn't have room at the bottom of your screen, it automatically flips upside-down to show above your finger instead!
  - **Easy close:** Tapping anywhere outside or pressing the `Escape` key closes it right away.

### 2. The Super Clean Header Bar
- **What was annoying before:** On skinny phones (like iPhone SE or small Androids measuring 360 pixels wide), the top bar was crammed. Buttons overlapped each other, or the logo got squeezed.
- **How we fixed it:** We redesigned the top header (`components/shell/Header.tsx`) so everything fits neatly on one line:
  - The KindLink logo is on the left.
  - The location button is a neat circle with a tiny green dot that pulses when live GPS is active.
  - The red SOS button, Language button, Bell button, and Profile circle all have generous finger-tapping areas (at least 44 by 44 pixels) so you never tap the wrong thing by accident.

### 3. The Quick Profile Menu
- **What was annoying before:** If you wanted to check your rating or change settings, you had to leave the page you were looking at and wait for a new page to load.
- **How we fixed it:** Tapping your profile photo in the top right now opens a neat floating card (`components/shell/ProfileQuickMenu.tsx`). It tells you:
  - Your name and `@username`.
  - Your badge status (like *Verified Volunteer*).
  - Quick shortcuts to view your profile, edit your bio, change settings, or sign out.
  - Tapping outside smoothly closes it.

### 4. The Smart Notification Bell
- **What was annoying before:** Notifications said weird things like *"168 min ago"* (who counts time like that?!). Also, old alerts got mixed up with emergency alarms.
- **How we fixed it:**
  - We gave the bell a new, friendly time teller (`lib/utils/formatTime.ts`). Now it says normal human things: *"just now"*, *"14 min ago"*, *"2 h 48 min ago"*, or *"Yesterday"*.
  - There are tidy tabs for **All**, **Requests**, and **SOS Alerts** so you can find what matters in a snap.
  - When you read an alert, the little red badge number disappears right away.

### 5. Instant Language Switcher (English, Hindi, Bengali)
- **What was annoying before:** Changing language was tucked away and sometimes forgot your choice after you refreshed the page.
- **How we fixed it:**
  - Tapping the **EN / अ / অ** button in the header opens a clear dialog (`components/shell/LanguageModal.tsx`).
  - You see big, beautiful cards for:
    1. **English** (English)
    2. **हिंदी** (Hindi)
    3. **বাংলা** (Bengali)
  - When you pick one, the whole app instantly switches to that language.
  - If you are logged in, KindLink also saves your choice to your database profile so your phone remembers it forever.

### 6. Safe Emergency SOS & Secret 2-Hour Live Links
- **What was annoying before:** An emergency SOS needs to tell helpers crucial medical facts, but people were afraid of strangers permanently seeing their private phone numbers or health conditions.
- **How we fixed it:**
  - **Granular Privacy Toggles:** In your profile settings, you can choose whether or not to share your blood group, phone number, and brief medical notes (up to 200 letters) during an emergency.
  - **Secret 2-Hour Live Link:** When an SOS is triggered, KindLink creates a special tracking link. This link **expires and turns off after exactly 2 hours**!
  - **Database Security Gate:** Our new SQL function `get_active_sos_details` strictly hides emergency medical notes if the SOS is finished or cancelled. Strangers cannot snoop on your private health notes.

### 7. Saved Places That Never Disappear (Migration 16)
- **What was annoying before:** Saved places (like *Home*, *Work*, or *College Clinic*) were only stored in your browser's private memory. If you logged in on another phone or cleared your browser history, all your saved places vanished.
- **How we fixed it:**
  - We created a permanent `saved_places` table in Supabase PostgreSQL (`supabase/sql/16_saved_places_and_emergency_privacy.sql`).
  - **Owner-Only Privacy:** Only you can see and edit your saved places. Other users cannot see where you live.
  - **10 Places Limit:** A smart database trigger lets you save up to 10 places. If you try to save an 11th, it politely reminds you to remove an old one first.
  - **Syncs Everywhere:** Places you save on your laptop automatically show up on your phone!

### 8. Home Screen Tune-Up & Spinning Pulse
- **What was annoying before:** On the home screen, the little "LIVE" dot and the "Last 24h" pill were slightly crooked. Also, long text in "How KindLink Works" was getting cut off with ugly dots (`...`).
- **How we fixed it:**
  - Both pills are now locked to the exact same 36-pixel height and perfectly vertically centered.
  - The refresh button spins nicely when loading fresh stats.
  - The activity strip rotates every 6 seconds to show acts of community kindness and pauses if you touch or hover your mouse over it.
  - All text wraps naturally without getting chopped off.

---

## Database Update Guide (Supabase SQL)

### Exact Run Order of Migration Files
If you are setting up a fresh database, run the SQL files in this exact order:

```text
1.  01_extensions.sql
2.  02_types.sql
3.  03_tables.sql
4.  04_indexes.sql
5.  05_functions.sql
6.  06_triggers.sql
7.  07_rls_policies.sql
8.  08_storage.sql
9.  09_realtime.sql
10. 10_make_me_admin.sql
11. 12_remove_physics_and_update_ranking.sql
12. 13_map_cache_and_usage.sql
13. 14_account_deletion_requests.sql
14. 14_profile_overhaul.sql
15. 14_profile_summary.sql
16. 14_verification_professional_proofs_and_audit.sql
17. 15_ratings_and_reviews_enhancements.sql
18. 16_saved_places_and_emergency_privacy.sql   <--- BRAND NEW!
```

*(Tip: If you are setting up a brand-new Supabase project from scratch, you can also just run `supabase/sql/all_in_one.sql` once, because it has all 18 migrations combined together!)*

### How to Run Migration 16 in Supabase
If your database already has migrations 01 through 15:
1. Open your **Supabase Dashboard** in your web browser.
2. Click on the **SQL Editor** tab (the little `>_` terminal icon on the left menu).
3. Click **New query**.
4. Open the file `supabase/sql/16_saved_places_and_emergency_privacy.sql` from the KindLink project folder.
5. Copy all the text inside and paste it into the Supabase query box.
6. Click the green **Run** button.
7. You should see `Success. No rows returned`. That's it! Your database is now updated!

### How to Test the Database Locally with Bash
We built an automated test runner that checks all 35 security rules and tests:
```bash
bash supabase/tests/run_tests.sh
```
What this script does for you:
1. Creates a local test database.
2. Applies all migrations from 01 through 16.
3. Re-applies all migrations a second time to make sure nothing crashes (proving idempotency).
4. Runs 35 automated security assertions covering RLS, 10-item limits, emergency health privacy, and active SOS link expiration.
5. Tears down and tests `all_in_one.sql` on a fresh database.
6. When it finishes, it will print: `All tests passed successfully!`

---

## Step-by-Step Finger Tap Test Guide

Grab your phone or open your computer browser and follow these 8 easy tests:

### Test 1: Opening Popups on Small Phones (No Jumping!)
1. Open your phone browser (or open Chrome on your laptop, press `F12`, and toggle the device toolbar to an **iPhone SE (375px)** or **Android (360px)**).
2. Scroll halfway down the home screen.
3. Tap the **Profile Photo** in the top right.
4. **Notice:** The screen does NOT jerk or bounce. The quick menu pops up smoothly below your photo.
5. Tap anywhere on the dark background. The menu closes instantly.
6. Press the `Escape` key on your keyboard. The menu closes cleanly.

### Test 2: Tapping the Header Buttons
1. Look at the top bar.
2. Try tapping the **Location pin button**:
   - Notice the little green status dot (pulsing when GPS is on, or amber when using a set landmark).
   - Tapping it opens the Location dialog smoothly.
3. Close it and tap the **EN** language button:
   - Notice the button is easy to hit with your thumb and doesn't squeeze the logo.

### Test 3: Changing Your Language
1. Tap the **Language** button in the header.
2. Tap on **हिंदी** (Hindi).
   - The app instantly switches to Hindi! Buttons and headings update without a reload.
3. Tap the language button again and tap **বাংলা** (Bengali).
   - Everything smoothly switches to Bengali!
4. Tap it once more and switch back to **English**.

### Test 4: Ringing the Notification Bell
1. Tap the **Bell** icon in the header.
2. Notice the clean card that drops down:
   - Notice the time stamps say human phrases like *"just now"*, *"14 min ago"*, or *"2 h ago"*.
   - Tap between the **All**, **Requests**, and **SOS Alerts** tabs.
   - If there is an unread dot, tap *"Mark all as read"*. The dot disappears smoothly.

### Test 5: Saving Home & Work Places (Up to 10 Places)
1. Tap the **Location pin** in the header.
2. Tap **"Saved Places"** tab.
3. Type *"Home"* and pick an area (e.g. *Kalyanpur Housing, Asansol*). Tap **Save**.
4. Notice your place appears with a neat icon and address.
5. Try saving 10 different places (e.g., *Campus Gate*, *District Hospital*, *Work*, *Library*).
   - All 10 places are saved neatly.
6. Try saving an 11th place.
   - A friendly notification tells you: *"You have reached the maximum limit of 10 saved places. Remove one to add another."*
7. Delete one place by tapping the little trash can icon. Now you can add your new place!

### Test 6: Sounding the Emergency SOS Beacon
1. Tap the big red **SOS** button in the header.
2. You will see a safety warning screen with a **5-second countdown**.
3. Tap **"Test Beacon"** or wait for the countdown.
4. The beacon activates:
   - Your screen pulses red with an active distress beacon.
   - You see a **Copy Live Link** button and a **Share to WhatsApp** button.
   - Tap **Copy Live Link**. It gives you a special link like `https://kindlink.org/sos/live/e0000...`.
5. Tap **"I Am Safe Now / Resolve SOS"**.
   - The emergency beacon immediately turns off.
   - The live link is instantly deactivated so your private location stops broadcasting!

### Test 7: Checking Home Pulse & Spinning Refresh
1. Go to the **Home** tab.
2. Look at the **Realtime Community Pulse** section.
3. Tap the round **Refresh** button next to the title.
   - Notice the circle arrow icon spins smoothly while checking for new data.
4. Look at Row 2 right below it:
   - The green **LIVE** dot and the **Last 24h** button line up horizontally.
   - Tap **Last 24h**. A detailed activity sheet slides up from the bottom showing hourly community help stats.

### Test 8: Reading "How KindLink Works" Without Dots
1. Scroll down the Home tab to the **"How KindLink Works"** box.
2. Look at the title and subtitle:
   - There are NO ugly three dots (`...`) cutting off words!
   - Every word like *"Neighbours helping neighbours, free for everyone"* is fully visible and readable.
3. Tap the card to expand it:
   - Notice the smooth step-by-step numbers (1, 2, 3) connected by a neat vertical line.
   - Tap it again to fold it up. Refresh the page — KindLink remembers whether you left it open or closed!

---

## Testing on Two Devices Side-by-Side

To see the magic of KindLink's real-time community coordination, test with two phones or two browser windows side-by-side!

### Device A: The Requester / SOS Beacon
1. Open KindLink on Phone A (or an Incognito window).
2. Sign in as `priya_test` (or create a requester account).
3. Go to **Settings > Safety & Medical Details**:
   - Set Blood Group to **O+**.
   - Add note: *"Asthma, carries inhaler"*.
   - Check the box: *"Share blood group with emergency helpers"*.
4. Return to the home screen and tap the red **SOS** button.
5. Tap **Activate SOS Beacon**.
6. Tap **Share** to copy the Live Link URL.

### Device B: The Helper / Responder
1. Open KindLink on Phone B (or normal window).
2. Sign in as a verified helper (like `amit_test`).
3. Notice:
   - A high-priority emergency notification pops up in the Notification Bell!
   - Opening the notification shows the active SOS emergency in Asansol.
4. Now, open the secret Live Link from Device A in a new tab:
   - Because the SOS is currently **active**, Phone B can see the location, the O+ blood group, and the emergency notes!
5. Now on **Device A**, tap **"I Am Safe Now"**.
6. On **Device B**, refresh the Live Link:
   - Because Device A ended the emergency, the active details are gone! The screen displays *"This SOS event has concluded safely"*. Private emergency health details are hidden again.

---

## Verification Commands Cheat-Sheet

You can run all automated checks from your terminal with these commands:

| Command | What it Tests |
| :--- | :--- |
| `npm run type-check` | Verifies zero TypeScript errors across all files |
| `npm run check:clean` | Verifies zero clean code and banned patterns |
| `npm run check:layout` | Audits all 47 layout, padding, and alignment checks |
| `npm run test:scroll` | Verifies zero screen jump and scroll restoration |
| `npm run test:visibility`| Verifies contact privacy (members vs matched vs private) |
| `node scripts/test-time-formatter.mjs` | Verifies human friendly time phrases |
| `node scripts/test-overlay-system.mjs` | Verifies popover bounding boxes and flipping |
| `node scripts/test-header-layout.mjs` | Verifies header fits within 360px without wrapping |
| `node scripts/test-sos-links.mjs` | Verifies 2-hour SOS live links and WhatsApp text |
| `node scripts/test-saved-places-sync.mjs` | Verifies saved places 10-item cap and DB syncing |
| `bash supabase/tests/run_tests.sh` | Runs all 35 PostgreSQL & PostGIS database tests |

*All checks are 100% green and verified.*
