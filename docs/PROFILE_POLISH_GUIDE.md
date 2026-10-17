# KindLink Profile, Trust & Polish Guide

Welcome to the **KindLink Profile, Trust & Polish Guide**! 

This guide explains all the updates, bug fixes, and new features added to make KindLink's volunteer profiles look great, feel fast, and protect everyone's privacy. Everything in this guide is written in simple, everyday language so anyone on the team can understand how it works, test it, and update the database.

---

## Table of Contents
1. [The 8 Major Improvements](#the-8-major-improvements)
   - [1. Scroll Position Fix (No More Jumping Pages!)](#1-scroll-position-fix-no-more-jumping-pages)
   - [2. Clean Profile Header & Pinned Badges Shelf](#2-clean-profile-header--pinned-badges-shelf)
   - [3. Edit Profile Alignment (Camera Button & @ Username)](#3-edit-profile-alignment-camera-button---username)
   - [4. Brand New Badges System (18 Medals & 4 Shiny Tiers)](#4-brand-new-badges-system-18-medals--4-shiny-tiers)
   - [5. Dropdown Menu & Contact Privacy Settings](#5-dropdown-menu--contact-privacy-settings)
   - [6. Ratings, Trust Score & Review Safety (Migration 15)](#6-ratings-trust-score--review-safety-migration-15)
   - [7. Impact Tab: 6-Month Activity Chart & Share Card](#7-impact-tab-6-month-activity-chart--share-card)
   - [8. Clean Settings Tab: Wide Cards & Simple English](#8-clean-settings-tab-wide-cards--simple-english)
2. [Step-by-Step Testing Guide](#step-by-step-testing-guide)
   - [How to Test Ratings & Reviews](#how-to-test-ratings--reviews)
   - [How to Test Privacy & Visibility](#how-to-test-privacy--visibility)
   - [How to Test Badges & Pinning](#how-to-test-badges--pinning)
3. [Supabase SQL Migration Guide](#supabase-sql-migration-guide)
   - [How to Run Migration 15 in Supabase](#how-to-run-migration-15-in-supabase)
   - [Quick Health Check Query](#quick-health-check-query)

---

## The 8 Major Improvements

### 1. Scroll Position Fix (No More Jumping Pages!)

#### The Problem
Before this fix, whenever you tapped a tab on your profile (like *Badges* or *Impact*), the whole webpage would suddenly jump or scroll up and down. If you refreshed the page or switched between screens, the app would sometimes forget where you were and bounce around.

#### Why It Happened
1. **Window-level scrolling:** The code previously used a browser function called `activeEl.scrollIntoView()`. That function tries to bring the tab into the center of your entire computer or phone screen, which made the whole window jerk vertically.
2. **Browser memory confusion:** Browsers have an automatic feature called "scroll restoration" that tries to remember where you scrolled. In a single-page app with dynamic tabs, this caused weird screen jumps when moving between pages.

#### How We Fixed It
- **Container-only scrolling:** We replaced `scrollIntoView()` with smart horizontal scrolling inside the tab bar container (`components/profile/ProfileTabs.tsx`). Now, only the tab strip slides left and right if you have lots of tabs. The rest of the page stays perfectly still!
- **Quiet keyboard focus:** When navigating using your keyboard arrow keys, we tell the browser `{ preventScroll: true }` so it highlights the tab without moving the screen.
- **Fresh start on page change:** In `app/app/page.tsx`, we told the browser to handle scroll restoration manually. When you switch between the Home, Requests, Map, or Profile screens, the page always smoothly starts at the very top (0 pixels).
- **Popups hold your spot:** When you open the Edit Profile screen or Reviews list, the background is locked in place so you never lose your spot.

---

### 2. Clean Profile Header & Pinned Badges Shelf

#### The Problem
The top card on the profile page was cluttered. Badges were mixed in with user names, the layout felt crowded on smaller phones, and it was hard to tell what was important.

#### How We Fixed It
1. **Centered Identity Block:**
   - **Photo Avatar:** A rounded square photo (96px on phones, 112px on computers) with a colorful green border.
   - **Verification Shield:** A small shield sits in the bottom corner of your photo. Green means you are a verified volunteer, amber means your ID is under review, and gray means not verified yet.
   - **Display Name:** Your name is written in large, bold text. If your name is long, it wraps cleanly across two lines without getting cut off with dots (`...`).
   - **One-Tap @Username Copy:** Your username (like `@rahul_sen`) has a little copy button next to it. Tap it once, and your username is copied to your clipboard with a friendly toast notification!
   - **One Single Status Pill:** Just one neat pill below your name tells everyone your status (such as *Verified Volunteer* or *Community Volunteer*). No duplicate pills!

2. **Dedicated Pinned Badges Shelf:**
   - We gave your favorite badges their own special "shelf" right above your statistics.
   - You can pin **up to 3 badges** that you are most proud of!
   - Each pinned badge shows a round 48px shiny medal with its name neatly printed underneath.
   - Tap any badge to open its full details and see how close you are to the next tier.
   - If you have not pinned any badges yet, the shelf displays three soft dotted circles with a friendly invitation: *"Pin your favourite badges"*. Tap it to pick your badges in one click!

3. **Four Clear Stat Tiles:**
   - At the bottom of your header card, four clean boxes show:
     - **Helps Given:** How many neighbors you have helped. Tapping this takes you straight to your *Activity* history.
     - **Requests:** How many requests you have posted.
     - **Hours Active:** How much time you have volunteered (written nicely as "2h 30m" instead of messy numbers).
     - **Trust Score:** Your star rating and number of reviews. Tapping this opens the full review breakdown!

---

### 3. Edit Profile Alignment (Camera Button & @ Username)

#### The Problem
When you opened the *Edit Profile* window:
1. The little camera button on the profile photo was misaligned and hard to tap on mobile touchscreens.
2. The `@` sign in the username box sat slightly higher or lower than the text next to it, making it look crooked.

#### How We Fixed It
- **Circular Camera Button:** 
  - The camera icon is now inside a circular button (40 pixels wide) with a crisp border that matches your background.
  - It has a generous 44-pixel touch target area so fingers can tap it easily on any phone.
  - Tapping it or pressing `Enter` immediately opens your file picker so you can upload a new photo (JPG, PNG, or WebP).
- **Centered `@` Symbol:**
  - We placed the `@` sign and the username input field inside a unified flex container.
  - Both use `leading-none` and equal heights, so the `@` symbol and your typing line up on the exact same vertical baseline with zero pixels of drift.
  - As you type your username, a live checker checks the database in the background and shows a green checkmark if the name is available, or a polite message if someone already has it.

---

### 4. Brand New Badges System (18 Medals & 4 Shiny Tiers)

#### The Problem
Previously, badges looked like simple flat emojis and lacked exciting milestones to encourage volunteers.

#### How We Fixed It
We created an entire custom badge collection made from scratch using scalable vector graphics (SVG).

```
 Bronze Level 1  ──>  Silver Level 2  ──>  Gold Level 3  ──>  Platinum Level 4
 (Warm Copper)       (Crisp Chrome)       (Radiant Gold)      (Icy Cyan & Violet)
```

1. **18 Custom Medal Glyphs (No Generic Emojis!):**
   - **Life Saver:** A bright blood droplet with a heart inside for blood donors.
   - **Community Pillar:** Classical triumvirate stone columns for active helpers.
   - **Emergency First Responder:** A lightning shield for urgent emergencies.
   - **Quick Responder:** A stopwatch with speed lines for fast replies.
   - **Trusted Neighbour:** Two hands clasped warmly in a handshake.
   - **Study Mentor:** An open book with a rising sun for teaching and notes.
   - **Medical Gear Lender:** A wheelchair and equipment icon.
   - **Elder Friend:** A walking stick and caring heart.
   - **Safe Ride Hero:** A car escort icon with motion trails.
   - **Helper Streak:** A dual-color energetic fire flame.
   - **First Help:** A four-point sparkle diamond star for your very first help.
   - **Verified Doctor:** A medical stethoscope with a verified badge.
   - **Verified Student:** A graduation cap with a tassel and verified seal.
   - **Verified Nurse:** An emergency medical cross with a caduceus heart.
   - **Verified Pharmacist:** A medicine mortar, pestle, and capsule.
   - **Verified Teacher:** A classroom blackboard and pointer.
   - **Verified NGO:** A community organization building.
   - **Verified Member:** A security shield with a bold checkmark.

2. **4 Metallic Tiers:**
   - **Bronze:** Warm copper and amber tones (`#B45309` to `#78350F`) with a soft sheen.
   - **Silver:** Cool chrome and polished slate tones (`#94A3B8` to `#475569`).
   - **Gold:** Radiant golden yellow tones (`#F59E0B` to `#B45309`) with a luminous glow.
   - **Platinum:** High-end icy cyan and royal violet gradients (`#38BDF8` to `#6366F1`).
   - **Locked:** A quiet, flat slate silhouette showing you what you can unlock next.

3. **Level Ring & Outer Bezel:**
   - Each medal has a circular metallic outer ring and a soft drop-shadow glow filter.

4. **Category Filter Chips in the Badges Tab:**
   - In the *Badges* tab, you can filter by category with a single row of chips: **All**, **Care**, **Community**, **Emergency**, **Campus**, and **Milestones**.
   - You can also search for any badge by name or switch between *All Badges* and *Earned Badges*.
   - Tapping any badge opens the **Badge Detail Sheet** showing you all 4 tiers, the exact number of helps needed to reach each level, and a button to pin it to your profile.

---

### 5. Dropdown Menu & Contact Privacy Settings

#### The Problem
Different parts of the app used ugly, hard-to-read default browser dropdown menus. People also want to know who can see their phone number and email address.

#### How We Fixed It
1. **Shared Accessible Select Component (`components/ui/Select.tsx`):**
   - We created a custom dropdown menu that looks modern in both Light and Dark themes.
   - Works with touchscreens and keyboard navigation (use `Up` / `Down` arrows, `Enter` to choose, and `Escape` to close).
   - Comes in two styles: a rounded "pill" button (great for quick filters) and a structured "form" box (great for reporting and settings).

2. **Contact Privacy Rules (3 Simple Levels):**
   You have complete control over who can see your contact information:
   - **All KindLink Members (`members`):** Any logged-in member can see this detail to coordinate volunteer work.
   - **People I am Matched With (`matched`):** Only someone who is actively helping you or receiving help from you on a completed request can see it.
   - **Only Me (`private`):** Hidden from everyone except you and platform safety admins.

3. **Safety Guardrails:**
   - **Phone & Email Masking:** If someone does not have permission to see your contact info, it is safely masked (e.g. `•••••• ••••` for phone numbers and `••••••@••••••` for emails).
   - **GPS Coordinates Are Never Shared:** Even if you share your neighborhood area name (like *"Asansol Market"*), the database **never** shares your exact GPS latitude or longitude with other users.

---

### 6. Ratings, Trust Score & Review Safety (Migration 15)

#### The Problem
To keep KindLink safe, honest, and friendly, ratings cannot be cheated, reviews must be fair, and inappropriate comments must be handled quickly.

#### How We Fixed It (Database Migration 15)
We wrote and deployed `supabase/sql/15_ratings_and_reviews_enhancements.sql`:

1. **Anti-Self-Rating Rule:**
   - You can **never rate yourself**. The database will immediately reject any attempt where the reviewer and the person being reviewed are the same person.
   - You can only rate someone after a mutual aid request has been marked **completed**.

2. **24-Hour Edit Window:**
   - You can edit your review or change your stars for up to **24 hours** after writing it (in case you made a typo or changed your mind).
   - After 24 hours, the review is permanently locked so nobody can change a good review into a bad one months later. Platform admins can still step in if needed.

3. **Report Bad Reviews & Moderation:**
   - If anyone writes a rude, abusive, or fake review, any member can tap the flag icon to report it.
   - Admins can hide inappropriate reviews from the admin panel.
   - Once a review is hidden, it is **immediately removed** from the user's average score calculation!

4. **Star Distribution Breakdown:**
   - A new database helper function (`get_user_rating_breakdown`) counts how many 5-star, 4-star, 3-star, 2-star, and 1-star ratings a person has received.
   - Volunteers only unlock a public Trust Score after receiving **at least 5 completed reviews**, ensuring that new members are not judged unfairly by a single review.

---

### 7. Impact Tab: 6-Month Activity Chart & Share Card

#### The Problem
Volunteers want to see the good they have done in their community and easily share their achievements with family, friends, and colleges.

#### How We Fixed It
1. **Live 6-Month Activity Bar Chart:**
   - The *Impact* tab shows an interactive vertical bar chart of your completed volunteer acts over the last 6 months (e.g. November through April).
   - Tapping any month highlights that bar and displays the exact number of neighbors you helped.

2. **Clean Empty State:**
   - If you are new and have not completed any requests yet, KindLink shows a cheerful illustration with an encouraging note: *"Your community impact starts here. Help a neighbor to see your stats grow!"*

3. **High-Resolution "Share My Impact" Card (`components/profile/ShareImpactModal.tsx`):**
   - Tapping **Share Impact** creates a high-resolution 1200x630 pixel graphic right inside your browser using an HTML5 Canvas!
   - The card features:
     - Rich dark teal and emerald gradient background with glowing radial accents.
     - Your display name, `@username`, and verified volunteer shield.
     - Your top 3 pinned medals.
     - Three big statistics: **Total Helps Given**, **Hours Volunteered**, and **Neighbours Supported**.
     - An official KindLink community watermark and website address.
   - **One-Tap Phone Sharing:** On mobile phones (iOS Safari and Android Chrome), tapping Share uses the phone's built-in share sheet to send the picture directly to WhatsApp, Instagram, or Messages!
   - **Download Fallback:** On laptops and computers, it offers a quick **Download Image (PNG)** button and a **Copy Profile Link** button.
   - **Always Points to the Right Website:** The link is read directly from your app's `NEXT_PUBLIC_SITE_URL` setting so it always directs friends to the right web address.

---

### 8. Clean Settings Tab: Wide Cards & Simple English

#### The Problem
The Settings screen used narrow cards that looked cramped on wide screens. Some of the text also sounded like complicated computer code (like *"ServiceWorker"*, *"FCM token"*, or *"WebSocket"*), which confused everyday users.

#### How We Fixed It
1. **Wider, Comfortable Cards:**
   - The Settings tab now spans up to `max-w-4xl` with generous padding and soft rounded corners (`rounded-3xl`).
   - Looks great on both tiny 360px phones and large 1440px desktop monitors!

2. **Compact Notification Rows:**
   - Notification options are organized into neat, compact switch rows with custom accessible toggles.
   - Shows your browser permission status in plain English: **Allowed** (green), **Blocked** (red), or **Not asked yet** (amber).
   - If notifications are blocked by your browser, KindLink shows a simple 3-step guide for Android Chrome and iPhone Safari showing you how to turn them back on.

3. **Complete Purge of Technical Jargon:**
   - We removed all developer jargon and replaced it with warm, friendly words:
     - Instead of *"Client-side theme persistence"*, we say: *"Choose a comfortable theme for daytime or night use"*.
     - Instead of *"Font-size scaling factor"*, we say: *"Text Size: Make text easier to read across KindLink"*.
     - Instead of *"Push notification daemon subscription"*, we say: *"Get alerts for urgent help and community requests near you"*.

---

## Step-by-Step Testing Guide

Follow these testing steps to verify that ratings, privacy, and badges work as expected.

### How to Test Ratings & Reviews

1. **Complete a Request:**
   - Log in with Account A (the requester) and post a simple help request (e.g. *"Need study notes for semester exam"*).
   - Log in with Account B (the volunteer) and offer help.
   - Have Account A accept the offer, and then mark the request as **Completed**.
2. **Submit a Rating:**
   - In Account A's notifications or profile, tap **Rate Volunteer**.
   - Pick 5 stars, select tags (like *"Punctual"* and *"Kind"*), write a short message (under 300 characters), and submit.
   - Open Account B's profile: verify that the review appears under the *As a Volunteer* list.
3. **Test Anti-Self-Rating Protection:**
   - Try to submit a rating where `rater_id` is equal to `ratee_id`.
   - The database trigger `validate_rating()` will immediately stop it with the error message: `Self-rating is strictly prohibited`.
4. **Test the 24-Hour Edit Window:**
   - Within 24 hours of posting your review, tap **Edit Review** and change your star rating or comment. The update will save without issue.
   - Any attempt to edit a review older than 24 hours will be rejected by the database.
5. **Test Review Reporting & Admin Hiding:**
   - On any review card, tap the flag icon to report it.
   - Open `/admin` with an admin account, locate the review report, and click **Hide Review**.
   - Check the volunteer's profile: verify that the hidden review is removed and their average score recalculates immediately.

---

### How to Test Privacy & Visibility

You can run our automated privacy test suite anytime with:
```bash
node scripts/test-visibility.mjs
```

To test manually in your browser:
1. **Change Visibility Setting:**
   - Go to your profile, tap **Edit Profile**, and scroll down to *Contact Details*.
   - Set **Phone Number** visibility to **Only me (`private`)**.
   - Tap **Save Changes**.
2. **View as a Guest / Unmatched User:**
   - Copy your profile link (e.g. `http://localhost:3000/u/your_username`).
   - Open a private/incognito browser window and paste the link.
   - Verify that your phone number is masked with `•••••• ••••` and shows a locked icon.
3. **View as a Matched Helper:**
   - Log in with an account that has an active or completed task with you.
   - If visibility is set to `matched`, verify that the phone number becomes visible as a clickable link.
4. **Verify Location Safety:**
   - Check the area field: verify that only your community name (like *"Asansol"*) is shown. No exact street addresses or GPS coordinates are ever revealed.

---

### How to Test Badges & Pinning

1. **Browse Badges:**
   - Go to your profile and tap the **Badges** tab.
   - Tap through the category filter chips (*All*, *Care*, *Emergency*, *Campus*, etc.) and verify that the badges filter smoothly without page reloads.
2. **Inspect Badge Details:**
   - Tap any badge card to open the **Badge Detail Sheet**.
   - Verify that all 4 metallic tiers (Bronze, Silver, Gold, Platinum) are listed with their requirements and that your progress bar is accurate.
3. **Pin Up to 3 Badges:**
   - Tap **Pin to Header** on your chosen badge.
   - Switch back to the *Overview* tab and look at the **Pinned Badges Shelf**: your badge will be displayed as a 48px medal.
   - Pin 2 more badges (total of 3).
   - Try pinning a 4th badge: verify that KindLink displays a helpful toast message explaining that 3 is the maximum.
   - Tap **Edit** on the shelf, unpin a badge, and verify that the slot frees up immediately.

---

## Supabase SQL Migration Guide

### How to Run Migration 15 in Supabase

Migration 15 sets up all the security rules for ratings, reviews, anti-self-rating checks, the 24-hour edit limit, and moderation logs.

1. Open your web browser and sign in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your **KindLink** project.
3. On the left-hand navigation sidebar, click on the **SQL Editor** icon (it looks like a small terminal with `>_`).
4. Click the **+ New query** button at the top.
5. Open the file `supabase/sql/15_ratings_and_reviews_enhancements.sql` in your project folder, copy all of the text, and paste it into the Supabase SQL Editor.
6. Click the green **Run** button (or press `Ctrl + Enter` / `Cmd + Enter`).
7. Wait a few seconds until you see the message: `Success. No rows returned`.

> [!NOTE]
> Migration 15 uses `IF NOT EXISTS` and `CREATE OR REPLACE` commands throughout. This means it is 100% safe to run multiple times without causing duplicate errors or overwriting existing user data.

---

### Quick Health Check Query

After running the migration, you can run this quick 5-second test query in your Supabase SQL Editor to confirm that everything was installed properly:

```sql
-- 1. Check if the review reports table and rating triggers exist
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'review_reports') AS has_review_reports,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'validate_rating') AS has_validation_trigger,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_user_rating_breakdown') AS has_rating_breakdown;
```

**Expected Result:**
All three columns should return `true`:

| has_review_reports | has_validation_trigger | has_rating_breakdown |
| :---: | :---: | :---: |
| **true** | **true** | **true** |

Congratulations! Your KindLink database is now completely up to date with full ratings safety, badge support, and privacy controls.
