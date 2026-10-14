# 🚀 KindLink Live Upgrade Manual: Step-by-Step Production Guide

This guide is written in very simple, beginner-friendly language with exact steps, button names, and clear instructions for updating your live site at **`https://kindlink-gd8e.onrender.com`**.

---

## 📋 What Was Upgraded
1. **Real Live Data Only**: All hard-coded mock users ("Rahul Sen") and fake stats ("48 helpers", "8 min", "1,240+", "98.4%") are gone. The home screen now pulls live stats and real requests from your database.
2. **Revamped Header**: Location chip showing the user's real area name, modern red pill SOS button with pulsing ring, language selector, notifications bell with unread badge, and profile avatar. Theme toggle moved to Profile Settings.
3. **Emergency SOS System**: Real 112 / 108 / 100 emergency speed-dials, 2-second press-and-hold activation, 5-second cancel countdown, and unguessable live-tracking token URLs (`/sos/[token]`).
4. **End-to-End Help Flow**: Full status progression (`open` ➔ `offered` ➔ `accepted` ➔ `on_the_way` ➔ `arrived` ➔ `completed`) with bilateral ratings, contact reveals (call/WhatsApp), and volunteer live-location sharing.
5. **Multi-Factor Verification & OTP**: 6-digit email OTP verification, student/voter/license/Aadhaar document upload to Supabase private storage, and admin review portal.
6. **New Native Language Engine**: 17 Indian languages + 5 Jharkhand regional dialects (Nagpuri, Khortha, Kurukh, Mundari, Ho) + 12 international languages with instant switching, search filter, and RTL support for Urdu and Arabic.
7. **Correct Live Domain**: Standardized `NEXT_PUBLIC_SITE_URL` to `https://kindlink-gd8e.onrender.com`.

---

## 🗄️ STEP 1: Run the NEW SQL Files in Supabase SQL Editor

You have already run the earlier SQL files (01 to 13). You only need to run **two NEW SQL files** in this exact order:

### 1. Run Migration 14: Platform Upgrade
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and open your KindLink project.
2. Click **SQL Editor** (`>_` icon on the left sidebar).
3. Click **+ New query**.
4. Open the file [`supabase/sql/14_comprehensive_live_upgrade.sql`](supabase/sql/14_comprehensive_live_upgrade.sql) in this repository and copy its entire text.
5. Paste it into the Supabase SQL Editor and click **Run** (green button).
6. **Expected output**: `Success. No rows returned.` (Creates `live_stats`, `sos_events`, `emergency_contacts`, `active_transit_locations`, `user_badges`, `auth_otps`, `push_subscriptions`, and request state machine).

### 2. Run Migration 15: Safe Cleanup of Test Data
1. Click **+ New query** again.
2. Open [`supabase/sql/15_cleanup_test_data.sql`](supabase/sql/15_cleanup_test_data.sql) in this repository and copy its entire text.
3. Paste it into the editor and click **Run**.
4. **Expected output**: A notice stating:
   ```text
   Cleanup complete: removed X test requests and Y test users. Preserved official showcase accounts.
   ```
   > [!IMPORTANT]
   > Your official demo accounts (`kind_volunteer`, `need_aid`, `admin_kindlink`) are **NOT** deleted. They are safely kept for live showcases!

---

## 📧 STEP 2: Set Up Free Email Service for OTP (Brevo or Resend)

KindLink includes a 6-digit email OTP system for volunteer verification. You can use any free SMTP provider (Brevo gives 300 free emails/day; Resend gives 3,000/month).

### Option A: Using Brevo (Recommended, 100% Free)
1. Go to [brevo.com](https://www.brevo.com) and create a free account.
2. In the top right menu, go to **SMTP & API** ➔ **SMTP**.
3. Note your credentials:
   - **Host**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **User**: (Your Brevo login email)
   - **Password / Key**: Click **Generate a new SMTP key** and copy it.

### Option B: Local/Demo Mode (Zero Setup Needed)
If you don't enter SMTP credentials, KindLink runs in **simulated demo mode**: the 6-digit OTP will be printed directly in the browser developer console and in the API response, so testing and grading never block you!

---

## 🔔 STEP 3: Generate Web Push (VAPID) Keys

To enable real browser push notifications for urgent nearby requests:
1. Open your terminal and run:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. You will get two keys:
   - **Public Key**: starts with letters/numbers (around 87 characters)
   - **Private Key**: around 43 characters

---

## ☁️ STEP 4: Add New Environment Variables on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click on your KindLink web service (`kindlink-gd8e`).
3. Click on **Environment** in the left menu.
4. Add or update the following variables:

| Environment Variable | Value | Notes |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | `https://kindlink-gd8e.onrender.com` | **CRITICAL**: Replaces the old domain everywhere |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | *(Your VAPID Public Key from Step 3)* | Required for browser push subscriptions |
| `VAPID_PRIVATE_KEY` | *(Your VAPID Private Key from Step 3)* | Secret server key |
| `VAPID_SUBJECT` | `mailto:krishkumarcodes@gmail.com` | Contact email for push services |
| `SMTP_HOST` | `smtp-relay.brevo.com` *(optional)* | Brevo / Resend SMTP host |
| `SMTP_PORT` | `587` *(optional)* | Standard SMTP submission port |
| `SMTP_USER` | *(Your SMTP user / email)* *(optional)* | SMTP username |
| `SMTP_PASS` | *(Your SMTP password / key)* *(optional)* | SMTP password |
| `SMTP_FROM` | `KindLink <no-reply@kindlink.demo>` *(optional)* | Verified sender header |

5. Click **Save Changes**.

---

## 🔄 STEP 5: Redeploy on Render

Render automatically detects new pushes to GitHub `main`. To manually trigger a fresh deploy:
1. On your Render web service page, click the **Manual Deploy** button in the upper right.
2. Select **Clear build cache & deploy**.
3. Watch the logs. The Docker build will compile all Next.js pages and start the container cleanly.

---

## 👑 STEP 6: How to Make Yourself Admin

If you create your own account using your real email or username:
1. Open Supabase Dashboard ➔ **SQL Editor**.
2. Run this query (replace `your_username` with your chosen username):
   ```sql
   UPDATE public.profiles
   SET role = 'admin', verification_status = 'verified'
   WHERE username = 'your_username';
   ```
3. Or use the built-in super admin showcase account:
   - **Username**: `admin_kindlink`
   - **Email**: `admin@kindlink.demo`
   - **Password**: `KindLink#Admin2026`

---

## ✅ FINAL TAP-THROUGH CHECKLIST

Tap through these items on the live site (`https://kindlink-gd8e.onrender.com`):

- [ ] **Home Stats**: Check the 4 stat cards. They show live numbers (or `-` when not enough sample ratings exist), a green "Live" dot, and no hardcoded "48" or "Rahul Sen".
- [ ] **Header**:
  - [ ] Tap the **Location chip** (e.g., "Asansol, WB" / your area) — shows your location.
  - [ ] Tap **SOS Emergency** (red pill) — opens the full-screen emergency sheet.
  - [ ] Tap **Language (Globe)** — opens the 2-group picker (Indian + International) with search filter.
  - [ ] Tap **Notifications Bell** — shows live notifications sheet.
  - [ ] Tap **Profile avatar** — opens your profile view.
- [ ] **Theme Switcher**: Check that the Sun/Moon button is gone from the header and lives in **Profile ➔ Settings ➔ Appearance (Light, Dark, System)**.
- [ ] **Emergency SOS**:
  - [ ] Press and hold the big SOS button for 2 seconds (progress ring fills).
  - [ ] Tap **Confirm SOS** to trigger dispatch.
  - [ ] Notice the live-location tracking URL (`/sos/[token]`).
  - [ ] Test the **Call 112**, **Ambulance 108**, and **Police 100** speed-dial links.
  - [ ] Tap **I am safe** to cancel and close the event.
- [ ] **Ask for Help (+ Button)**:
  - [ ] Open the wizard. Step 1 (5 category cards).
  - [ ] Pick **Blood Donation** ➔ see blood group, hospital name, and units needed.
  - [ ] Pick **Transport** ➔ see pickup, destination, passenger count, and wheelchair toggle.
  - [ ] Review step shows urgency level priority and privacy disclaimer.
- [ ] **Help Flow**:
  - [ ] Log in as `kind_volunteer` (`KindLink#Volunteer2026`).
  - [ ] Open the sample critical blood request and tap **I can help**.
  - [ ] Log in as `need_aid` (`KindLink#Requester2026`) in another tab.
  - [ ] Accept the volunteer's offer ➔ see status advance to `Accepted`, phone/WhatsApp buttons unlock, and en-route transit sharing activate.
  - [ ] Complete the request and give a 5-star rating.
- [ ] **Profile & Verification**:
  - [ ] View unlocked badges (`First Help`, `Verified Volunteer`, `Life Saver`).
  - [ ] View impact metrics (people helped, hours, kilometers).
  - [ ] Test Email OTP verification stepper.
  - [ ] Upload a test ID document and log into `/admin` as `admin_kindlink` to approve it.
- [ ] **Language Switching**:
  - [ ] Switch to Hindi (हिन्दी) or Bengali (বাংলা) — UI switches instantly with zero page reload.
  - [ ] Switch to Urdu (اردو) or Arabic (العربية) — UI mirrors smoothly into right-to-left (RTL).
