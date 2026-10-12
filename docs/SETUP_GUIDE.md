# KindLink Complete Setup & Operations Guide

Welcome to the beginner-friendly setup guide for **KindLink** — an open-source, hyperlocal peer-to-peer mutual aid and emergency response platform.

This guide walks you step-by-step through setting up Supabase, configuring security and real-time subscriptions, running KindLink locally, seeding demo accounts, and deploying to Render. Every single step contains exact button names, menu navigation, and a **"What to do if it fails"** rescue note.

---

## Quick Navigation

1. [Step 1: Create a Free Supabase Project & Select Region](#step-1-create-a-free-supabase-project--select-region)
2. [Step 2: Turn OFF 'Confirm Email' in Supabase Auth (CRITICAL)](#step-2-turn-off-confirm-email-in-supabase-auth-critical)
3. [Step 3: Enable the PostGIS Geospatial Extension](#step-3-enable-the-postgis-geospatial-extension)
4. [Step 4: Run SQL Schema Migrations & Verify Tables](#step-4-run-sql-schema-migrations--verify-tables)
5. [Step 5: Verify Storage Bucket 'verification-docs' & Realtime Publication](#step-5-verify-storage-bucket-verification-docs--realtime-publication)
6. [Step 6: Copy Project URL, Anon Key, and Secret Service Role Key](#step-6-copy-project-url-anon-key-and-secret-service-role-key)
7. [Step 7: Configure .env.local & Run KindLink Locally](#step-7-configure-envlocal--run-kindlink-locally)
8. [Step 8: Populate Demo Data with npm run seed](#step-8-populate-demo-data-with-npm-run-seed)
9. [Step 9: Create Your Account & Promote to Administrator](#step-9-create-your-account--promote-to-administrator)
10. [Step 10: Configure Environment Variables on Render & Redeploy](#step-10-configure-environment-variables-on-render--redeploy)
11. [Step 11: End-to-End Testing Verification Checklist](#step-11-end-to-end-testing-verification-checklist)
12. [Step 12: How to Manually Reset a User's Password in Supabase](#step-12-how-to-manually-reset-a-users-password-in-supabase)
13. [Step 13: Troubleshooting Matrix for Common Issues](#step-13-troubleshooting-matrix-for-common-issues)

---

## Prerequisites Before You Begin

Ensure you have the following installed and accessible:
- **Node.js**: Version 18.17+ or 20+ ([Download Node.js](https://nodejs.org/))
- **Git**: Installed on your operating system ([Download Git](https://git-scm.com/))
- **A Free Supabase Account**: Sign up at [https://supabase.com](https://supabase.com) (No credit card required)
- **A Free Render Account (Optional for cloud deployment)**: Sign up at [https://render.com](https://render.com)

---

## Step 1: Create a Free Supabase Project & Select Region

Supabase provides the PostgreSQL database, real-time sync, file storage, and authentication for KindLink.

### Numbered Action Steps:
1. Open your browser and go to **[https://supabase.com](https://supabase.com)**.
2. Click the green button labeled **Sign in** (or **Start your project**) at the top right. Log in with your GitHub account.
3. Once inside the Supabase Dashboard, click the green button labeled **+ New project**.
4. In the project creation form, fill in the following details:
   - **Organization**: Choose your default organization (or your personal username).
   - **Name**: Enter `KindLink-Production` (or `kindlink-dev`).
   - **Database Password**: Click **Generate a password** or type a strong password. **Important:** Copy and store this password in a secure place.
   - **Region**: Click the dropdown menu and select **Tokyo (ap-northeast-1)** or the region closest to your target users (e.g., **Singapore (ap-southeast-1)** or **Mumbai / Central India (ap-south-1)**). Choosing a close region ensures ultra-fast real-time emergency pings.
   - **Pricing Plan**: Choose **Free** ($0 / month).
5. Click the green button labeled **Create new project** at the bottom right.
6. Wait 1 to 2 minutes while Supabase sets up your dedicated PostgreSQL database. When setup finishes, the dashboard will display your project overview.

> ⚠️ **What to do if it fails:**
> - If you receive an error stating *"You have reached the maximum number of active projects on the Free Plan"*, Supabase permits up to 2 free projects per account. From your Supabase home dashboard, pause or delete an old project that you no longer need, then try creating the KindLink project again.
> - If the Tokyo region is temporarily at capacity, select **Singapore (ap-southeast-1)** or **Mumbai (ap-south-1)**. Any Asian region provides low latency for West Bengal and Jharkhand users.

---

## Step 2: Turn OFF 'Confirm Email' in Supabase Auth (CRITICAL)

> [!CAUTION]
> **CRITICAL CONFIGURATION STEP:**
> KindLink is built for rapid community emergency aid (e.g., urgent blood units, elderly medical transport). It features **instant login without waiting for email verification**. If you skip this step, newly registered users will be blocked from logging in with an `"Email not confirmed"` error!

### Numbered Action Steps:
1. In your Supabase project dashboard, look at the **left-hand vertical navigation sidebar**.
2. Click on the icon labeled **Authentication** (person with key icon).
3. In the Authentication submenu on the left, click **Providers**.
4. You will see a list of authentication providers. The first provider is **Email** (which is enabled by default).
5. Click directly on the **Email** row to expand its configuration panel.
6. Scroll down until you see the toggle labeled **Confirm email**.
7. Click the toggle switch to turn it **OFF** (the switch will turn from green to grey).
8. Scroll down to the bottom of the Email section and click the green button labeled **Save**.

> ⚠️ **What to do if it fails:**
> - If the "Save" button appears greyed out, make sure you toggled the switch and did not accidentally clear other required fields like minimum password length.
> - If users are signing up but receiving an error saying *"Email not confirmed"* or login fails, navigate back to **Authentication -> Providers -> Email**, verify the **Confirm email** toggle is switched **OFF**, and click **Save** again.
> - If a user registered while this setting was still ON, go to **Authentication -> Users**, find their row, click the **...** (three dots) on the far right, and select **Confirm user**.

---

## Step 3: Enable the PostGIS Geospatial Extension

KindLink relies on the PostgreSQL **PostGIS** extension to calculate real-world physical distances, calculate Help Gravity scores ($G = M \cdot (1 + \lambda t) / (1 + d)^2$), and power the interactive GPS Radar map.

### Numbered Action Steps:
1. In the left-hand navigation sidebar, click on **Database** (database cylinder icon).
2. In the Database submenu, click on **Extensions**.
3. In the search box at the top right of the extensions list, type `postgis`.
4. Locate the card titled **postgis** (description: *"PostGIS geometry and geography spatial types and functions"*).
5. Click the toggle switch on the PostGIS card to turn it **ON**.
6. A confirmation modal will appear. Ensure the schema is set to `public`, then click the green button labeled **Enable extension**.
7. The toggle will turn green, indicating PostGIS is active.

> ⚠️ **What to do if it fails:**
> - If you receive an error saying *"Failed to enable extension"*, do not worry: our database migration script `01_extensions.sql` contains `CREATE EXTENSION IF NOT EXISTS "postgis";` with administrator privileges. When you run the SQL migration in Step 4, it will automatically enable PostGIS.

---

## Step 4: Run SQL Schema Migrations & Verify Tables

Now we create the KindLink database schema, including tables, custom types, spatial indexes, triggers, stored procedures, Row Level Security (RLS) policies, storage configuration, and real-time CDC rules.

You can choose either **Option A (Recommended: All-in-One)** or **Option B (Numbered Modular Steps)**.

### Option A: Run `all_in_one.sql` in One Step (Recommended)
1. On your computer, navigate to your KindLink repository folder and open the file:
   [supabase/sql/all_in_one.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/all_in_one.sql)
2. Select all text (`Ctrl+A` or `Cmd+A`) and copy it (`Ctrl+C` or `Cmd+C`).
3. In your Supabase project dashboard, click on **SQL Editor** in the left sidebar (icon looks like `>_`).
4. Click the green button labeled **+ New query** in the top left.
5. Paste the copied SQL into the editor window (`Ctrl+V` or `Cmd+V`).
6. Click the green button labeled **Run** in the bottom right corner (or press `Ctrl+Enter` / `Cmd+Enter`).
7. Wait 5 to 10 seconds. You will see a green status badge at the bottom stating **Success. No rows returned**.

### Option B: Run Files 01 through 09 in Order
If you prefer running modular migrations, create a **+ New query** in the SQL Editor and execute these files in sequential order:
1. [supabase/sql/01_extensions.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/01_extensions.sql) — PostGIS, pgcrypto, uuid-ossp
2. [supabase/sql/02_types.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/02_types.sql) — User roles, verification status, categories, urgency enums
3. [supabase/sql/03_tables.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/03_tables.sql) — Core tables: profiles, requests, offers, ratings, reports, etc.
4. [supabase/sql/04_indexes.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/04_indexes.sql) — Spatial GIST index, composite query indexes
5. [supabase/sql/05_functions.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/05_functions.sql) — `nearby_requests`, `submit_offer`, `accept_offer`, `complete_request`, `submit_rating`, `is_admin`
6. [supabase/sql/06_triggers.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/06_triggers.sql) — Profile auto-creation, updated_at, rating sync
7. [supabase/sql/07_rls_policies.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/07_rls_policies.sql) — Row-level security for requests, offers, reports, private contacts
8. [supabase/sql/08_storage.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/08_storage.sql) — Private bucket `verification-docs` and folder security
9. [supabase/sql/09_realtime.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/09_realtime.sql) — Replica identity FULL and `supabase_realtime` publication

### How to Verify That All Tables Were Created:
1. In the left navigation sidebar, click on **Table Editor** (grid icon with rows and columns).
2. In the schema dropdown menu at the top, ensure **public** is selected.
3. Confirm that all **8 KindLink tables** are listed:
   - `profiles` — User accounts, roles, trust ratings, and home coordinates.
   - `verification_requests` — Private identity document submissions for admin verification.
   - `requests` — Hyperlocal emergency and mutual-aid requests.
   - `offers` — Helper offers connected to open requests.
   - `notifications` — Real-time in-app alerts and notifications.
   - `ratings` — 1-to-5 star post-completion peer trust reviews.
   - `reports` — Community safety moderation reports.
   - `sos_events` — Accelerometer kinetic fall detection SOS alerts.
4. Click on `profiles` and verify the columns: `id`, `username`, `display_name`, `phone`, `role`, `verification_status`, `home_location`, `rating_average`.

> ⚠️ **What to do if it fails:**
> - If you receive an error stating `"relation already exists"` or `"type already exists"`, this is completely safe: all scripts use `IF NOT EXISTS` guards. You can safely re-run them without wiping existing data.
> - If an error mentions `permission denied for schema storage`, check that you are running the script with default Superuser / postgres role in the SQL editor (do not run as an authenticated non-admin user).
> - If you see an error like `function postgis... does not exist`, verify that Step 3 (PostGIS extension) was enabled.

---

## Step 5: Verify Storage Bucket 'verification-docs' & Realtime Publication

KindLink stores government and student verification documents in a secure, private bucket and pushes live updates through PostgreSQL Change Data Capture (CDC).

### 1. Verify Storage Bucket:
1. In the left navigation sidebar, click on **Storage** (cloud/folder icon).
2. Under **Buckets**, locate the bucket named **`verification-docs`**.
3. Look at the privacy badge next to it:
   - It **MUST** say **Private** (with a lock icon).
   - If it says "Public", click the **...** (three dots) next to `verification-docs`, select **Edit bucket**, toggle **Public bucket** to **OFF**, and click **Save**.
4. Click on **verification-docs** and select the **Policies** tab. Confirm that policies `verification_docs_select`, `verification_docs_insert`, `verification_docs_update`, and `verification_docs_delete` are active.

### 2. Verify Realtime Publication:
1. In the left sidebar, click **Database** -> **Replication** (or **Publications** in newer Supabase versions).
2. Find the publication named **`supabase_realtime`**.
3. Confirm that the following tables have realtime enabled (toggle is green):
   - `requests` (Toggled ON)
   - `offers` (Toggled ON)
   - `notifications` (Toggled ON)
4. If any of these are toggled off, click the toggle to turn them ON, and click **Save**.

> ⚠️ **What to do if it fails:**
> - If the `verification-docs` bucket does not exist, open the **SQL Editor**, open [supabase/sql/08_storage.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/08_storage.sql), paste it, and click **Run**.
> - If the bucket still does not appear, click **+ New bucket** in the Storage UI, enter bucket name `verification-docs`, leave **Public bucket** unchecked, set Allowed MIME types to `image/jpeg, image/png, image/webp, application/pdf`, set Maximum file size to `5MB`, and click **Create bucket**.

---

## Step 6: Copy Project URL, Anon Key, and Secret Service Role Key

You need three credentials to connect the KindLink web application to your Supabase project.

### Numbered Action Steps:
1. In the left navigation sidebar, scroll to the bottom and click on **Project Settings** (gear icon ⚙️).
2. In the settings menu, click on **API** (under Configuration).
3. Under the section titled **Project URL**:
   - Find the field labeled **URL** (it looks like `https://abcdefghijklmnopqrst.supabase.co`).
   - Click the **Copy** button. This is your `NEXT_PUBLIC_SUPABASE_URL`.
4. Under the section titled **Project API keys**:
   - Find the key labeled **`anon` `public`** (a long string starting with `eyJ...`).
   - Click the **Copy** button. This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Find the key labeled **`service_role` `secret`**.
   - Click the **Reveal** button (eye icon) to unhide the secret key.
   - Click the **Copy** button. This is your `SUPABASE_SERVICE_ROLE_KEY`.

### Security Distinction: Anon vs. Service Role Key
| Key Name | Prefix / Scope | Can Be Public? | Purpose |
| :--- | :--- | :--- | :--- |
| **`anon` Key** | `NEXT_PUBLIC_...` | **YES** (Public) | Used by client browsers in React. Actions are strictly restricted by Row Level Security (RLS) policies. Safe in GitHub code. |
| **`service_role` Key** | `SUPABASE_...` | **NO! (STRICT SECRET)** | Master administrator key. **Bypasses ALL Row Level Security**. Only used by seed scripts and admin background workers. **NEVER commit to Git!** |

> [!WARNING]
> Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`. Any environment variable prefixed with `NEXT_PUBLIC_` is baked into the browser JavaScript bundle and visible to any user who inspects page source!

> ⚠️ **What to do if it fails:**
> - If the API page is blank or will not display keys, verify you are logged in as the project owner.
> - If you accidentally commit your `service_role` key to a public GitHub repository, immediately go to **Project Settings -> API**, click **Generate new secret key** under `service_role`, and update your `.env.local` and Render settings.

---

## Step 7: Configure .env.local & Run KindLink Locally

Now connect your local development environment to your live Supabase project.

### Numbered Action Steps:
1. Open your terminal in the KindLink workspace directory:
   ```bash
   cd /path/to/KindLink
   ```
2. Create your local environment configuration by copying `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
3. Open `.env.local` in your code editor and populate your keys:
   ```env
   # KindLink Server Configuration
   PORT=3000
   NODE_ENV=development

   # Supabase Public Keys (Browser Accessible)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Supabase Private Admin Key (Server & Seed Script ONLY)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Verify that dependencies are installed:
   ```bash
   npm install
   ```
5. Start the local development server:
   ```bash
   npm run dev
   ```
6. Open your web browser and go to **[http://localhost:3000](http://localhost:3000)**.
7. You should see the KindLink Home Dashboard with the live GPS radar, category filters, and active community requests!

> ⚠️ **What to do if it fails:**
> - If you receive `Error: listen EADDRINUSE: address already in use :::3000`, another application is using port 3000. Run on port 3001 with `PORT=3001 npm run dev` or free port 3000 with `npx kill-port 3000`.
> - If you see `TypeError: Failed to construct 'URL': Invalid URL`, open `.env.local` and verify `NEXT_PUBLIC_SUPABASE_URL` begins with `https://` and has no trailing quotation marks or leading spaces.
> - Whenever you modify `.env.local`, you must restart the dev server (`Ctrl+C` followed by `npm run dev`) for changes to take effect.

---

## Step 8: Populate Demo Data with npm run seed

To test KindLink with realistic data, run the automated seed script. It provisions **8 demo accounts** with pre-configured verified statuses, realistic locations across Asansol, Durgapur, Dhanbad, and Kolkata, and **25 localized emergency requests**.

### Numbered Action Steps:
1. In your terminal in the KindLink root directory, run:
   ```bash
   npm run seed
   ```
2. Watch the terminal output. The script will log user creation and request insertion:
   ```text
   🚀 Starting KindLink Demo Seed Provisioning...
   👤 Processing user: priya_nurse (priya.nurse@kindlink.demo)...
      ✅ Profile synced: priya_nurse (Role: user, Status: verified)
   👤 Processing user: rahul_aec (rahul.aec@kindlink.demo)...
      ✅ Profile synced: rahul_aec (Role: user, Status: verified)
   ...
   📝 Provisioning Demo Requests...
      ✅ Created request: "O+ Blood Urgently Needed (2 Units)"
      ✅ Created request: "Emergency Patient Transport Escort"
   🎉 Demo Seed Completed Successfully!
   ```

### Demo Accounts Reference Table:
All demo accounts share the same universal password: **`KindLink#2026`**

| Username | Email Address | Role | Status | Description / Location |
| :--- | :--- | :--- | :--- | :--- |
| `priya_nurse` | `priya.nurse@kindlink.demo` | `user` | Verified | Emergency ICU Nurse at Asansol District Hospital |
| `rahul_aec` | `rahul.aec@kindlink.demo` | `user` | Verified | AEC College Student & Blood Donor, Kalyanpur |
| `dr_sen` | `dr.sen@kindlink.demo` | `user` | Verified | Registered Medical Physician (MD), Asansol |
| `amit_dhanbad` | `amit.dhanbad@kindlink.demo` | `user` | Unverified | Volunteer Blood Donor, Dhanbad |
| `swati_durgapur` | `swati.durgapur@kindlink.demo` | `user` | Verified | NGO Community Coordinator, Durgapur |
| `vikram_driver` | `vikram.driver@kindlink.demo` | `user` | Verified | Emergency Transport Driver, Ushagram |
| `ananya_books` | `ananya.books@kindlink.demo` | `user` | Unverified | Student Book & Notes Donor, Kolkata |
| `admin_kindlink`| `admin@kindlink.demo` | `admin`| Verified | KindLink Platform Administrator & Moderator |

### Resetting / Cleaning Demo Data:
If you ever want to wipe the demo accounts and start fresh, run:
```bash
npm run seed -- --clean
```

> ⚠️ **What to do if it fails:**
> - If the script prints `❌ Missing environment variables! Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local`, double-check that `.env.local` exists in the project root and that `SUPABASE_SERVICE_ROLE_KEY` is populated.
> - If you receive an error `AuthApiError: Email address invalid or provider disabled`, make sure you completed Step 2 (turning OFF Confirm email) and that Email provider is enabled.
> - The seed script is completely **idempotent**: you can run it multiple times safely without duplicate key errors.

---

## Step 9: Create Your Account & Promote to Administrator

Next, create your personal user account and promote it to an Administrator using SQL migration script `10_make_me_admin.sql`.

### 1. Create Your Personal Account:
1. Open your browser and navigate to **[http://localhost:3000/signup](http://localhost:3000/signup)**.
2. Fill out the signup form:
   - **Full Name**: Enter your name (e.g., `Krish Kumar`).
   - **Username**: Choose a unique lowercase handle between 3 and 20 characters (e.g., `krish_dev`).
   - **Email Address**: Enter your email (e.g., `krish@example.com`).
   - **Phone Number**: Enter your mobile number (e.g., `+91 98765 43210`).
   - **Password**: Enter a strong password (at least 8 characters).
3. Click the button labeled **Create Account**.
4. You will be instantly logged in and redirected to the Home Radar.

### 2. Promote Your Account to Admin:
1. In your browser, switch back to the **Supabase Dashboard**.
2. Click on **SQL Editor** in the left sidebar.
3. Click **+ New query**.
4. Open the migration file [supabase/sql/10_make_me_admin.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/10_make_me_admin.sql) or copy the snippet below:
   ```sql
   DO $$
   DECLARE
     target_username text := 'YOUR_USERNAME_HERE'; -- <-- REPLACE WITH YOUR USERNAME
     rows_updated integer;
   BEGIN
     UPDATE public.profiles
     SET role = 'admin',
         verification_status = 'verified',
         updated_at = now()
     WHERE lower(username) = lower(target_username);

     GET DIAGNOSTICS rows_updated = ROW_COUNT;

     IF rows_updated = 0 THEN
       RAISE NOTICE 'No profile found with username: % (Ensure you have signed up in the app first)', target_username;
     ELSE
       RAISE NOTICE 'Success! User % is now an Administrator and Verified Helper.', target_username;
     END IF;
   END $$;
   ```
5. Replace `'YOUR_USERNAME_HERE'` with your exact signup username (e.g., `'krish_dev'`).
6. Click the green button labeled **Run**.
7. In the Messages box at the bottom, verify the notice:
   `Success! User krish_dev is now an Administrator and Verified Helper.`
8. In your browser, open **[http://localhost:3000/admin](http://localhost:3000/admin)**.
9. You now have full access to the Administrator Moderation Console to review identity verifications and moderate safety reports!

> ⚠️ **What to do if it fails:**
> - If the output displays `No profile found with username: ...`, check that you completed sign-up on the website first, and ensure the username in the script matches what you registered (usernames in KindLink are lowercase).
> - If visiting `/admin` displays *"Access Denied"* or redirects you to login, log out in the website and log back in so your session token refreshes with the new `admin` role claim.

---

## Step 10: Configure Environment Variables on Render & Redeploy

When you are ready to publish KindLink to production on [Render](https://render.com):

### Numbered Action Steps:
1. Log in to your **Render Dashboard** at **[https://dashboard.render.com](https://dashboard.render.com)**.
2. Click on your **KindLink** Web Service (configured from your GitHub repo using `render.yaml` or Docker).
3. In the left navigation menu of your web service, click **Environment** (key icon).
4. Click the button labeled **Add Environment Variable** to add the required production values:
   - **`PORT`**: `3000`
   - **`NODE_ENV`**: `production`
   - **`NEXT_PUBLIC_SUPABASE_URL`**: `https://your-project-id.supabase.co`
   - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: `your-anon-key-here`
   - **`SUPABASE_SERVICE_ROLE_KEY`**: `your-service-role-key-here`
5. Click the blue button labeled **Save Changes** at the bottom of the environment section.
6. In the top right header of the Render page, click the button labeled **Manual Deploy**.
7. From the dropdown menu, select **Deploy latest commit** (or **Clear build cache & deploy** to force a clean build with the new environment variables).
8. Monitor the deploy logs. You should see the Docker container build successfully:
   ```text
   ==> Starting service with 'node server.js'
   Listening on port 3000
   ```
9. Test the live health check endpoint by visiting:
   `https://your-kindlink-service.onrender.com/api/health`
   You should receive a healthy JSON response:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-10-12T11:00:00.000Z",
     "uptime": 42.15
   }
   ```

> ⚠️ **What to do if it fails:**
> - If the Render build fails with `Out of memory`, ensure your Dockerfile uses multi-stage builds and that `output: 'standalone'` is set in `next.config.mjs` (already pre-configured in the repository).
> - If the site loads on Render but shows a blank screen or console errors, trigger a **Clear build cache & deploy**: Next.js bakes `NEXT_PUBLIC_` variables into client-side JS at compile time, so changing environment variables requires a fresh build.

---

## Step 11: End-to-End Testing Verification Checklist

Run through this complete 12-point testing checklist to verify all KindLink features:

```
[ ] 1. Sign Up a New User
[ ] 2. Login with Email
[ ] 3. Login with Username
[ ] 4. Change Password in Settings
[ ] 5. Post a New Emergency Request
[ ] 6. Volunteer & Offer Help
[ ] 7. Accept the Helper Offer
[ ] 8. Verify Contact Reveal (Privacy Check)
[ ] 9. Mark Request as Completed
[ ] 10. Submit Mutual 5-Star Rating & Review
[ ] 11. Upload Verification Document (Govt ID / Student ID)
[ ] 12. Admin Review & Approve Verification
```

### Detailed Testing Steps:

#### 1. Sign Up a New User:
- Navigate to `/signup`.
- Enter: Name: `Test Tester`, Username: `tester_123`, Email: `test@tester.local`, Phone: `+91 98765 00000`, Password: `TestPassword#123`.
- Click **Create Account**.
- **Expected Result**: Successfully created and redirected to Home Radar.
- ⚠️ *If it fails*: Check Supabase SQL Editor and ensure `06_triggers.sql` ran to trigger `handle_new_user`.

#### 2. Login with Email:
- Log out (Settings -> Log Out).
- Go to `/login`. Enter `test@tester.local` and `TestPassword#123`.
- Click **Sign In**.
- **Expected Result**: Instant login without email verification prompt.
- ⚠️ *If it fails*: Verify Step 2 ("Confirm email" toggle is OFF in Supabase).

#### 3. Login with Username:
- Log out again.
- Go to `/login`. In the Email / Username field, type the handle `tester_123`.
- Enter `TestPassword#123` and click **Sign In**.
- **Expected Result**: The app automatically resolves `tester_123` to `test@tester.local` and logs you in.
- ⚠️ *If it fails*: Check `/api/auth/login` network response in developer tools for username resolution errors.

#### 4. Change Password:
- While logged in, click the **Settings** gear icon in the navigation bar.
- Scroll down to the **Security** section.
- Under **Change Password**, enter current password `TestPassword#123` and new password `NewPassword#2026`.
- Click **Update Password**.
- **Expected Result**: Success toast appears: *"Password updated successfully"*. Test logging in with the new password.
- ⚠️ *If it fails*: Passwords must be at least 8 characters long.

#### 5. Post a New Emergency Help Request:
- Click the glowing orange button labeled **+ Request Help** in the header or bottom navigation.
- Category: Select **Blood** (or **Equipment**).
- Title: Enter `Need 1 Unit A+ Blood at Asansol Hospital`.
- Urgency: Select **Critical**.
- Location: Click on the interactive map or enter `Asansol District Hospital`.
- Click **Submit Request**.
- **Expected Result**: Request appears immediately on the Home Radar with a pulsing critical red ring.
- ⚠️ *If it fails*: Check browser console for PostGIS spatial error; verify `01_extensions.sql` and `05_functions.sql` were executed.

#### 6. Volunteer & Offer Help:
- Open an Incognito/Private browser window and go to `http://localhost:3000/login`.
- Log in as demo user `priya_nurse` (Email: `priya.nurse@kindlink.demo`, Password: `KindLink#2026`).
- Find the request created in Step 5 and click on it to open the details modal.
- Click the green button labeled **Offer Help**.
- Enter message: `I am currently on duty at Asansol Hospital and can assist.`
- Click **Submit Offer**.
- **Expected Result**: Offer submitted confirmation appears.
- ⚠️ *If it fails*: A user cannot offer help on their own request (`requester_id != helper_id`). Ensure you are logged into a different account.

#### 7. Accept the Helper Offer:
- Switch back to the requester's browser window (`tester_123`).
- Open the details modal for your request.
- Under **Volunteer Responses**, locate Priya's offer.
- Click the blue button labeled **Accept Offer**.
- **Expected Result**: Request status transitions to **Matched / In Progress**.
- ⚠️ *If it fails*: Check Supabase SQL Editor and ensure `accept_offer` function in `05_functions.sql` is present.

#### 8. Verify Contact Reveal (Privacy Check):
- With the offer accepted, inspect the contact section in the request detail modal:
  - Both requester and helper can now see each other's direct verified phone numbers and direct **Call Volunteer** / **Call Requester** buttons.
  - In a separate browser logged out or logged into a third account (`amit_dhanbad`), view the same request: phone numbers remain private and hidden (`***-***-****`).
- **Expected Result**: Phone privacy is protected by Row Level Security and only revealed between accepted parties.

#### 9. Mark Request as Completed:
- As either requester or helper, click the button labeled **Mark as Completed** inside the request modal.
- Confirm completion in the prompt.
- **Expected Result**: Status updates to **Completed** (green badge).
- ⚠️ *If it fails*: Only the original requester or the accepted helper can complete a request.

#### 10. Submit Mutual 5-Star Rating & Review:
- Upon completion, the review dialog will appear (or click **Rate Helper**).
- Click 5 stars and enter comment: `Outstanding support, very timely and professional!`
- Click **Submit Review**.
- **Expected Result**: Toast shows *"Thank you! +5 Trust points awarded"*. The helper's profile rating updates.
- ⚠️ *If it fails*: Ratings can only be submitted once per request per user (`unique_rating_per_request_rater` constraint).

#### 11. Upload Verification Document:
- In your browser, log in as `amit_dhanbad` (Email: `amit.dhanbad@kindlink.demo`, Password: `KindLink#2026`).
- Go to **Settings** -> **Identity Verification**.
- Click **Choose File** and select any sample image or PDF file (`id_card.png` or `student_id.pdf`).
- Enter contact phone number and click **Submit for Verification**.
- **Expected Result**: Document uploads to private `verification-docs` storage bucket and submission status shows **Pending Review**.
- ⚠️ *If it fails*: Verify `08_storage.sql` has created the `verification-docs` bucket and that file size is under 5MB.

#### 12. Admin Review & Approve Verification:
- Log in as Admin (`admin@kindlink.demo` with password `KindLink#2026`, or your promoted account).
- Navigate to **[http://localhost:3000/admin](http://localhost:3000/admin)**.
- Under the tab labeled **Pending Identity Verifications**, locate Amit Mahato's submission.
- Click the button labeled **Review Document** to view the securely signed document URL.
- Click the green button labeled **Approve**.
- **Expected Result**: Amit's profile immediately receives a green **Verified** badge across the platform.
- ⚠️ *If it fails*: Ensure your user profile role is set to `admin` in `public.profiles`.

---

## Step 12: How to Manually Reset a User's Password in Supabase

If a user forgets their password or cannot log in, an administrator can quickly reset it directly from the Supabase dashboard.

### Numbered Action Steps:
1. Open your **Supabase Project Dashboard**.
2. In the left navigation sidebar, click on **Authentication** (person with key icon).
3. Click on **Users** in the submenu.
4. In the search bar at the top, type the user's email address or username.
5. In the search results table, locate the user and look at the far right column.
6. Click the **...** (three horizontal dots) button on that user's row.
7. You have two options:

#### Option A: Send a Password Reset Email
- Click **Send password reset**.
- Supabase sends an email containing a secure password reset link to the user.

#### Option B: Instantly Set a New Password (Direct Admin Override)
- Click **Edit user** from the menu.
- A slide-out panel will open on the right side of the screen.
- Locate the field labeled **Password**.
- Type a new temporary password (for example: `KindLink#Temp2026`).
- Click the green button labeled **Save user** (or **Update user**).
- Provide the temporary password securely to the user and ask them to immediately update it in **Settings -> Security**.

> ⚠️ **What to do if it fails:**
> - If the user does not receive the reset email when using Option A, Supabase's default free mailer has an hourly rate limit (3 emails per hour). Use **Option B (Direct Admin Override)** to set a temporary password immediately without relying on email delivery.
> - Ensure the new password meets the 8-character minimum requirement.

---

## Step 13: Troubleshooting Matrix for Common Issues

Use this quick-reference troubleshooting matrix whenever you encounter an error during development or deployment.

| Error / Symptom | Root Cause | Exact Solution |
| :--- | :--- | :--- |
| **"User already registered"** | An account with this email address or username already exists in `auth.users` or `public.profiles`. | In Supabase **Authentication -> Users**, search for the email and delete it, or choose a different email and username during signup. |
| **"Email not confirmed"** on login | The "Confirm email" setting in Supabase Auth is enabled. | Go to **Authentication -> Providers -> Email**, switch **Confirm email** toggle **OFF**, and click **Save** (see Step 2). In **Users**, manually click **Confirm user** for stuck accounts. |
| **"function nearby_requests does not exist"** | The PostGIS spatial stored procedures in migration 05 were not executed. | Open Supabase **SQL Editor**, open and paste [supabase/sql/05_functions.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/05_functions.sql), and click **Run**. |
| **"42501: new row violates row-level security policy"** | Row Level Security (RLS) blocked the operation because the user is unauthenticated or unauthorized. | Ensure user is signed in with a valid token. If inserting requests, check that `requester_id` equals `auth.uid()`. Check policies in [supabase/sql/07_rls_policies.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/07_rls_policies.sql). |
| **"Storage bucket not found: verification-docs"** | The storage bucket migration has not run yet. | In **SQL Editor**, run [supabase/sql/08_storage.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/08_storage.sql) or create a private bucket named `verification-docs` in the **Storage** dashboard. |
| **Realtime radar or notifications do not update** | Tables have not been added to the `supabase_realtime` publication or Replica Identity is not set. | In **SQL Editor**, run [supabase/sql/09_realtime.sql](file:///data/data/com.termux/files/home/storage/downloads/KindLink/supabase/sql/09_realtime.sql). Also check browser console for WebSocket connection status. |
| **"429 Too Many Requests"** on login/signup | In-memory API rate limiter triggered (5 signups per 15 min, 10 logins per 15 min per IP). | Wait 15 minutes for the rate limit bucket to reset, or restart your local development server (`npm run dev`) to reset in-memory counters. |
| **Render Deploy Error: "Exit code 137 (OOM Killed)"** | Docker build ran out of RAM on the Render free tier during compilation. | Ensure Docker multi-stage caching is enabled and `standalone` output mode is configured in `next.config.mjs`. |
| **Admin Portal displays "Access Denied"** | The logged-in user profile does not have `role = 'admin'`. | Run `10_make_me_admin.sql` in the Supabase SQL editor with your username, then log out and log back in to refresh claims. |

---

## Congratulations! 🚀

Your **KindLink** instance is now fully configured with a live PostgreSQL backend, PostGIS spatial radar queries, secure private file storage, real-time sync, and administrative moderation tools.

For further assistance, feature requests, or community discussions, contact:
- **Lead Developer**: krishkumarcodes@gmail.com
- **Project Repository**: [KindLink on GitHub](https://github.com/krishkumarcodes/KindLink)
