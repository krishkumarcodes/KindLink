# 🚀 KindLink Live Upgrade Manual 2.0: Three-Key Urgency Ranking & Mobile Alignment

This guide is written in very simple, beginner-friendly language with exact steps, button names, and clear instructions for updating and verifying your live KindLink platform at **`https://kindlink-gd8e.onrender.com`**.

---

## 📋 What Changed in Simple English

1. **Clean Civic Mutual Aid Architecture**:
   - We removed all legacy scoring columns and experimental sensor hooks, transitioning to a streamlined civic platform.
   - KindLink is now presented as a clean, student-built community mutual aid platform created for **KindLink Community Initiative**.
2. **Pure, Real-World Aid Ranking**:
   - Needs are now ranked by what truly matters in an emergency:
     1. **Urgency Level** (Critical ➔ High ➔ Medium ➔ Low)
     2. **Proximity / Distance** (Closest neighbors shown first, e.g. "1.2 km away")
     3. **Waiting Time** (Those waiting longest receive priority attention)
3. **Flawless Mobile Alignment at 360px**:
   - The top header has been re-architected so that all **6 key items** (Logo, Location Chip, SOS Circle, Language Button, Bell, and Avatar) fit on narrow mobile screens (360px width) with **zero overlap**, **zero text clipping**, and **zero horizontal scrolling**.
4. **Generous Bottom Clearance (`pb-36`+)**:
   - All scrollable views now include `pb-36` (144px) bottom padding. No buttons or text will ever get hidden behind the bottom tab bar or the raised `+` action button.
5. **Instant Google Translate Integration**:
   - The language system now translates instantly using Google Translate with cookie persistence and graceful fallbacks, supporting Indian regional languages, Jharkhand dialects, and international languages.

---

## 🗄️ STEP 1: Run the NEW SQL Migration in Supabase

You only need to run **ONE NEW SQL file** in your Supabase SQL Editor.

### Migration File: Migration 12 (Urgency Ranking Upgrade)

Follow these easy steps:

1. Open your internet browser and log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click on your **KindLink** project.
3. In the left-hand sidebar menu, click on the **SQL Editor** (icon looks like `>_`).
4. Click on the **+ New query** button at the top.
5. In this repository, open the file:
   `supabase/sql/12_*.sql` (Urgency Ranking Upgrade migration)
6. Copy the entire contents of that file.
7. Paste the code into the big text box in the Supabase SQL Editor.
8. Click the green **Run** button in the lower right (or press `Ctrl + Enter` / `Cmd + Enter`).
9. **Expected result**: You should see:
   ```text
   Success. No rows returned.
   ```
10. **What this did**: It safely dropped legacy scoring database objects and updated the `nearby_requests` database view/function so that requests are ordered strictly by urgency, distance, and waiting time.

---

## 🔐 STEP 2: Environment Variables (None Changed!)

Good news! **No environment variables were changed or added.**

Your existing Render setup already contains all required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (`https://kindlink-gd8e.onrender.com`)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`

You do not need to edit or re-enter any environment variables in Render.

---

## 🔄 STEP 3: How to Redeploy on Render

Render automatically redeploys whenever new code is pushed to your GitHub `main` branch. If you want to trigger a manual deploy or clear the build cache:

1. Open your browser and go to [dashboard.render.com](https://dashboard.render.com).
2. Click on your KindLink web service: **`kindlink-gd8e`**.
3. In the top right corner, click the blue **Manual Deploy** button.
4. Select **Clear build cache & deploy** (recommended to ensure all new font and style assets are freshly bundled).
5. Watch the deployment logs. In about 3–4 minutes, you will see:
   ```text
   ==> Uploading build...
   ==> Build successful 🎉
   ==> Deploying...
   ==> Your service is live 🚀
   ```
6. Open your live app at **`https://kindlink-gd8e.onrender.com`**.

---

## 📱 STEP 4: Step-by-Step Tap-Through Test Checklist

Perform this quick 5-minute walkthrough on your mobile phone or in desktop Chrome DevTools (set device to **iPhone SE** or **Android 360px**):

### 1. Home Screen & Header Fit (360px Width Test)
- [ ] Open the app on a narrow screen (360px width).
- [ ] Look at the top navigation bar. Verify all 6 elements fit cleanly side-by-side:
  1. **KindLink Logo**: Gradient square emblem and "KindLink" brand title.
  2. **Location Chip**: Pulsing green dot, pin icon, and area name (e.g. `Asansol ▾`).
  3. **Emergency SOS Circle**: Bright red circular button with pulsing ring and siren icon.
  4. **Language Button**: Globe icon and current language code (e.g. `EN`).
  5. **Notifications Bell**: Bell icon with red unread counter badge.
  6. **Avatar**: Circular badge with user initials and verified green checkmark.
- [ ] Confirm there is **no horizontal scrollbar**, no overlapping buttons, and no cut-off text.
- [ ] Check the greeting banner: Personalized "Namaste, [First Name]" or "Namaste, Friend".
- [ ] Check the two 64px tall action buttons: **Ask for Help** (teal) and **Emergency SOS** (red).
- [ ] Check the **Realtime Community Pulse** section: displays 4 cards (Helpers nearby, Avg. response, Acts of help, Trust match) in a clean 2x2 grid on mobile and 4-across on desktop.
- [ ] Scroll all the way to the bottom: verify the bottom content is completely visible above the bottom navigation bar (thanks to `pb-36` padding).

### 2. Location Features
- [ ] Tap the **Location Chip** in the top header (`📍 Asansol ▾`).
- [ ] The **Location Modal** will appear smoothly.
- [ ] Tap **"Use My Live GPS"** or pick a neighborhood from the search list (e.g., *Burnpur*, *Kalyanpur*, *Sen Raleigh Road*).
- [ ] Tap **"Save Location"**.
- [ ] Verify that the header location chip immediately updates to your selected area!

### 3. Language Switching
- [ ] Tap the **Language Button** in the header (`🌐 EN`).
- [ ] The **Language Selector Modal** opens with a search bar and language grid.
- [ ] Tap on another language, such as **हिन्दी (Hindi)**, **বাংলা (Bengali)**, or **اردو (Urdu)**.
- [ ] The page will reload/refresh seamlessly, and text across buttons, cards, and headings will now be in your selected language!

### 4. Emergency SOS Button
- [ ] Tap the red **Emergency SOS** button in the header or on the Home screen.
- [ ] The **Emergency SOS Modal** opens.
- [ ] Verify speed-dial emergency numbers are visible: **112 (National)**, **108 (Ambulance)**, **100 (Police)**.
- [ ] Press and hold the big red center button for 2 seconds.
- [ ] A 5-second countdown timer will begin with haptic feedback vibration.
- [ ] Tap **"Cancel Emergency"** during the countdown to safely stop the alarm.

### 5. Profile Tabs
- [ ] Tap the **Profile** tab in the bottom navigation bar (or left sidebar on desktop).
- [ ] Look at the Profile Header Card: verifies your initials, name, phone, verified volunteer badge, and star rating.
- [ ] Tap through each sub-tab:
  - **Overview**: Personal summary and quick metrics.
  - **Activity**: History of aid delivered.
  - **Badges**: Beautiful earned badges (*Lifesaver Donor*, *First Responder*, *Student Verified*).
  - **Impact**: Lives touched, blood units donated, and community rating.
  - **Verification**: Student ID / Aadhaar document upload status.
  - **Settings**: Theme toggle (Dark / Light mode) and notification preferences.
- [ ] Verify that each tab scrolls smoothly with full bottom clearance above the navigation bar.

---

## 🌐 STEP 5: What to Do If a Language Does Not Translate

KindLink uses Google Translate's official web translation engine. If text remains in English after switching languages:

1. **Check Your Internet Connection**: Google Translate scripts load from Google's secure servers (`translate.google.com`). Ensure you have an active internet connection.
2. **Disable Aggressive Ad-Blockers / Brave Shields**:
   - Some ad-blockers (like uBlock Origin or Brave Shields) block external translation scripts by default.
   - If using Brave: Click the Lion icon in the address bar and toggle **Shields DOWN** for KindLink.
   - If using an ad-blocker extension: Whitelist `kindlink-gd8e.onrender.com`.
3. **Hard Refresh the Browser**:
   - On Desktop: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac).
   - On Mobile: Pull down from the top of the screen to refresh.
4. **Reset Your Language Cookie**:
   - If the language seems stuck, open your browser settings ➔ Cookies ➔ Search for `googtrans` ➔ Click Delete.
   - Refresh the page and select your language again from the KindLink header.
5. **Automatic Fallback Protection**:
   - Even if Google Translate is completely blocked by your corporate network or firewall, KindLink **will never crash or show blank pages**. The app automatically falls back to crisp English terminology so you can continue requesting or offering aid without disruption!

---

## 🖼️ Visual Verification Screenshots

Automated layout screenshots have been generated and saved to [`docs/screenshots/`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/):
- **360px Mobile (Narrow Smartphone)**:
  - [`home-360px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/home-360px.png)
  - [`requests-360px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/requests-360px.png)
  - [`profile-360px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/profile-360px.png)
- **768px Tablet**:
  - [`home-768px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/home-768px.png)
  - [`requests-768px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/requests-768px.png)
  - [`profile-768px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/profile-768px.png)
- **1280px Desktop / Laptop**:
  - [`home-1280px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/home-1280px.png)
  - [`requests-1280px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/requests-1280px.png)
  - [`profile-1280px.png`](file:///data/data/com.termux/files/home/storage/downloads/KindLink/docs/screenshots/profile-1280px.png)

---

## 🛠️ Verification Commands

You can verify the entire project at any time by running:

```bash
# 1. Audit layout constraints and generate screenshots
npm run check:layout

# 2. Verify TypeScript type safety
npm run type-check

# 3. Verify clean production build
npm run build
```

Every command is tested to pass with **0 errors**. Happy helping!
