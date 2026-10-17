# KindLink Profile, Admin & Database Setup Guide

Welcome to the **KindLink Profile & Community Trust System** guide. This guide is written in plain, simple English so anyone can manage the platform, approve volunteers, run database updates, and get demo accounts ready for pitch day.

---

## 1. New SQL Files to Run (In Supabase)

If you are updating an existing Supabase project, open your [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Select your Project &rarr; Click **SQL Editor** in the left menu.

Run this new migration file:

### `supabase/sql/14_profile_overhaul.sql`
- **What it does**:
  1. Adds profile bio, organisation, area name, international phone fields, and privacy visibility settings to `public.profiles`.
  2. Creates the `emergency_contacts` table (max 3 contacts rule).
  3. Creates `badge_definitions` and `user_badges` tables, and seeds 18 badges.
  4. Creates `professional_proofs` (for doctors, nurses, pharmacists, teachers, students, NGOs).
  5. Creates `account_deletion_requests` and `admin_audit_logs`.
  6. Creates `get_profile_summary` (the single calculation for all stats).
  7. Creates `get_member_profile` (protects private phone/email).
- **How to run**:
  - Open `supabase/sql/14_profile_overhaul.sql`.
  - Copy all the SQL text.
  - Paste it into the Supabase SQL Editor and click **Run**.
  - It is completely safe to run multiple times (`IF NOT EXISTS` guards).

---

## 2. How to Make Yourself an Admin

Admins can review ID documents, approve doctors and nurses, and review deletion requests.

1. Open the Supabase SQL Editor.
2. Run this simple query (replace with your real account email):
```sql
UPDATE public.profiles
SET role = 'admin', verification_status = 'verified'
WHERE email = 'your-email@example.com';
```
3. Refresh the KindLink website. You will see the **Admin Panel** link in your navigation bar and at `/admin`.

> [!NOTE]
> For security, **admins cannot approve their own verification or deletion requests**. A different admin must review it, or you can verify your account directly in SQL as shown above.

---

## 3. How to Approve a New User

When a new user signs up, they are placed in the admin review queue.

1. Go to `https://kindlink-gd8e.onrender.com/admin` (or `http://localhost:3000/admin`).
2. Click the **Verification Requests** tab.
3. You will see a list of pending requests with their name, phone, email, organisation, and area.
4. If they attached an ID card, click **View Document** (opens a secure link that expires automatically in 15 minutes).
5. Choose one of the three actions:
   - **Approve**: Instantly gives the volunteer their green **Verified** badge. They can now offer help to neighbours.
   - **Ask for More Info**: Opens a box to write a note (e.g. *"Please upload a clearer picture of your college ID"*). The user sees this note on their profile.
   - **Reject**: Declines the request with a polite reason. The user can fix their details and resubmit.

---

## 4. How to Review Professional Proofs & Deletion Requests

### A. Professional Proofs (Doctors, Nurses, Pharmacists, Teachers, Students, NGOs)
1. In `/admin`, click the **Professional Proofs** tab.
2. You will see the volunteer's profession, their registration number (e.g. WBMC Medical Council registration), and their uploaded document.
3. Check the document.
4. Click **Approve**. The volunteer immediately receives the special badge (e.g. *Verified Doctor* or *Verified Student Member*) on their profile and next to their name in emergency requests.

### B. Account Deletion Requests
1. In `/admin`, click the **Account Deletions** tab.
2. You will see the user's name, email, and their reason for leaving.
3. Click **Approve Deletion**.
   - KindLink cancels any open requests or offers.
   - KindLink removes their personal profile, phone, email, and documents.
   - Past completed helps are kept for public safety but renamed to **"Deleted user"** so no personal data remains.
   - KindLink writes an immutable audit record to `admin_audit_logs`.

---

## 5. How to Add a New Badge

All badge rules and milestone ladders are stored in the database. You can add a new badge in one SQL command without writing any frontend code!

Run this in the Supabase SQL Editor:
```sql
INSERT INTO public.badge_definitions (id, title, category, description, icon_path, is_automatic, levels)
VALUES (
  'winter-warmth-hero',
  'Winter Warmth Hero',
  'Care',
  'Delivered warm clothes, blankets, or shelter supplies to neighbours during cold waves.',
  '/illustrations/badge-care.svg',
  true,
  '[
    {"level": 1, "name": "Bronze", "threshold": 2},
    {"level": 2, "name": "Silver", "threshold": 5},
    {"level": 3, "name": "Gold", "threshold": 15},
    {"level": 4, "name": "Platinum", "threshold": 30}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, levels = EXCLUDED.levels;
```
The new badge will immediately appear on all user badge grids and detail sheets!

---

## 6. How to Prepare Demo Accounts for Pitch Day

For presentations, you want pre-approved accounts with full, realistic, consistent data (no missing stats, no 0h bugs, no strange numbers).

### Quick 1-Step Demo Reset
In the Supabase SQL Editor, run:
- `supabase/sql/seed_demo_accounts.sql`

This creates **3 clean showcase accounts**:

1. **Dr. Ananya Roy** (Top Volunteer)
   - **Login**: `volunteer@kindlink.demo` / `KindLink#Volunteer2026`
   - **Status**: Verified Volunteer & Doctor.
   - **Stats**: 5 completed helps, 5.0 ⭐ Trust Score (5 reviews), 6-day help streak, ~10 km covered, 1.8 hours active.
   - **Badges**: Life Saver (Blood), First Help, Community Pillar, Verified Doctor, Verified Member.
   - **Emergency Contacts**: 2 registered contacts (Spouse and Local neighbour).
   - **Activity**: 5 real completed helps that match the stats 100%.

2. **Sourav Mukherjee** (Neighbour in Need)
   - **Login**: `need_aid@kindlink.demo` / `KindLink#Requester2026`
   - **Status**: Verified Student Member (Community).
   - **Requests**: 1 urgent open blood donation request ready for a live volunteer offer during demo!

3. **KindLink Administrator** (Platform Staff)
   - **Login**: `admin@kindlink.demo` / `KindLink#Admin2026`
   - **Status**: Admin. Can open `/admin` to show live moderation tools on stage.

---

## 7. Tap-Through Testing Checklist

Before showing KindLink to anyone, tap through these 10 items:

- [ ] **1. Header & Share Button**: Open the Profile tab. Check that the share button is square, the share icon is centered, and tapping it shares or copies your link (`/u/[username]`).
- [ ] **2. Four Stat Tiles**: Look at Helps Given, Requests, Hours, and Trust Score. Tap each tile:
  - Tapping Helps Given jumps to the Activity tab.
  - Tapping Requests jumps to Activity &rarr; My Requests.
  - Tapping Hours jumps to the Impact tab.
  - Tapping Trust Score opens the Reviews list.
- [ ] **3. Sticky Tab Strip**: Scroll down. The tab strip stays sticky below the top bar without hiding under it, and you can swipe tabs smoothly without a thick grey scrollbar.
- [ ] **4. Community Bio**: Check that long bios show a "Read more" button after 4 lines, and tapping "Edit" opens the bio editor.
- [ ] **5. Edit Profile Modal**: Tap "Edit Profile":
  - Full Name, Username, Bio, Organisation, Area, Phone, and Languages each show **only once**.
  - The `@` symbol in the username is vertically centered.
  - Try the Phone Input: tap the country flag, search for "United States" or "Bangladesh", see the flag change.
  - Save: see the green toast appear.
- [ ] **6. Emergency Contacts**: Check that you see **only one** empty state and **only one** "Add First Emergency Contact" button. Tap it, select relationship "Custom", type "Doctor", enter a phone number, and save.
- [ ] **7. Badges Grid**: Tap the Badges tab. Check that badges show levels (Bronze, Silver, Gold, Platinum). Tap any card to open the level ladder. Pin a badge and see it appear on your header card.
- [ ] **8. Activity & Impact Tabs**: Tap Activity to see your 4 sub-tabs (All, Completed, Requests, Offers). Tap Impact to see your streak and 6-month chart.
- [ ] **9. Settings & Switches**: Tap Settings. Look at the toggles: they are modern 52×32px switches, not blue checkboxes. Test "Reduce animations and motion". Test language change: it stays active when you refresh.
- [ ] **10. Member Profile Page**: Open `https://kindlink-gd8e.onrender.com/u/kind_volunteer`. You will see their public profile with contact numbers safely protected.

---

## 8. What to Do If Something Fails

| Problem | Cause | How to Fix |
| :--- | :--- | :--- |
| **"Permission denied" when viewing a document** | The signed URL expired (15-min limit) | Refresh the admin page to generate a fresh signed link. |
| **Stats on profile show 0** | Account has no completed requests in database | Run `supabase/sql/seed_demo_accounts.sql` to populate sample requests. |
| **Admin page says "403 Forbidden"** | Your user role is not 'admin' | Run the SQL in Section 2 to set `role = 'admin'` for your email. |
| **Phone number says invalid** | Number does not match selected country code | Check the country flag matches the phone number (e.g. +91 for 10-digit Indian numbers). |
| **Page flashed in English before my language loaded** | Cache cleared | Normal on very first load; subsequent reloads read `kindlink_locale` cookie instantly. |
