# KindLink Showcase Auth & Identity Fix Guide

> **Target Script:** `supabase/sql/auth_fix/17_fix_showcase_auth_identities.sql`  
> **Applicable Environments:** Supabase Cloud, Local Supabase Docker CLI, Custom PostgreSQL instances

---

## 1. Why `auth.identities` Is Required in Supabase GoTrue

When using Supabase Auth (GoTrue engine), developers often assume that inserting a row directly into `auth.users` with a valid bcrypt hash (`crypt('password', gen_salt('bf'))`) is sufficient for email/password authentication. 

**This is not the case in Supabase GoTrue.**

### GoTrue's Internal Authentication Flow:
1. When a client calls `supabase.auth.signInWithPassword({ email, password })`, GoTrue queries `auth.users` to find the user record and verify the password hash.
2. Crucially, GoTrue then looks up linked identity providers in `auth.identities`:
   ```sql
   SELECT * FROM auth.identities 
   WHERE user_id = <user.id> AND provider = 'email';
   ```
3. **If no row exists in `auth.identities`:**
   GoTrue considers the account unlinked / orphaned from its identity provider and rejects the request with:
   ```json
   {
     "error": "invalid_grant",
     "error_description": "Invalid login credentials"
   }
   ```
4. Even if the email and password in `auth.users` match the database exactly, authentication fails without this identity record!

---

## 2. What `17_fix_showcase_auth_identities.sql` Resolves

1. **Creates Required `auth.identities` Rows:**
   For every showcase account, an identity record is inserted with:
   - `id`: `<user_id>`
   - `user_id`: `<user_id>`
   - `provider`: `'email'`
   - `provider_id`: `<user_id>` (or user email)
   - `identity_data`: `{"sub": "<user_id>", "email": "<email>", "email_verified": true}`

2. **Synchronizes `public.profiles`:**
   - Ensures the `email` column exists and is populated for every user.
   - Enforces unique constraint on `username` and unique lowercase index on `lower(username)`.
   - Sets `verification_status = 'verified'` for all showcase users.
   - Sets `role = 'admin'` for Super Administrator accounts so they have full access to `/admin`.

3. **Dual-Credential Alias Support (Universal Login Guarantee):**
   - In documentation (`README.md`, `docs/SETUP_GUIDE.md`), showcase accounts are documented with emails `volunteer@kindlink.demo`, `requester@kindlink.demo`, `admin@kindlink.demo` and passwords `KindLink#Volunteer2026`, `KindLink#Requester2026`, `KindLink#Admin2026`.
   - In UI quick demo cards (`AuthPageContent.tsx`), accounts are referenced with emails `kind_volunteer@kindlink.demo`, `need_aid@kindlink.demo`, `admin_kindlink@kindlink.demo` and unified password `KindLink#2026`.
   - **Fix:** Migration 17 creates **both** primary and alias accounts with valid `auth.identities` so **any** documented email, username, or password combination logs in successfully!

---

## 3. Account Credentials Matrix

| Account Type | Username | Email | Password | Role | Verification |
|:---|:---|:---|:---|:---|:---|
| **Volunteer (Primary)** | `kind_volunteer` | `volunteer@kindlink.demo` | `KindLink#Volunteer2026` | `user` | Verified |
| **Volunteer (Alias)** | `kind_volunteer_alias` | `kind_volunteer@kindlink.demo` | `KindLink#2026` | `user` | Verified |
| **Requester (Primary)** | `need_aid` | `requester@kindlink.demo` | `KindLink#Requester2026` | `user` | Verified |
| **Requester (Alias)** | `need_aid_alias` | `need_aid@kindlink.demo` | `KindLink#2026` | `user` | Verified |
| **Admin (Primary)** | `admin_kindlink` | `admin@kindlink.demo` | `KindLink#Admin2026` | `admin` | Verified |
| **Admin (Alias)** | `admin_kindlink_alias` | `admin_kindlink@kindlink.demo` | `KindLink#2026` | `admin` | Verified |

---

## 4. How to Execute the Fix

### Option A: Supabase Cloud Dashboard (Recommended)
1. Open your project dashboard at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open `supabase/sql/auth_fix/17_fix_showcase_auth_identities.sql` and copy its entire contents.
5. Paste into the SQL editor and click **Run**.
6. The query output will return the verified list of synchronized profiles and identities.

### Option B: Supabase CLI
```bash
supabase db execute --file supabase/sql/auth_fix/17_fix_showcase_auth_identities.sql
```

### Option C: Direct PostgreSQL Connection (`psql`)
```bash
psql "$DATABASE_URL" -f supabase/sql/auth_fix/17_fix_showcase_auth_identities.sql
```

---

## 5. Verification After Execution

Run this query to confirm that all identities and profiles are properly linked:

```sql
SELECT
  p.id,
  p.username,
  u.email,
  p.email AS profile_email,
  p.role,
  p.verification_status,
  i.provider,
  i.provider_id
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
JOIN auth.identities i ON p.id = i.user_id
WHERE p.username IN (
  'kind_volunteer', 'need_aid', 'admin_kindlink',
  'kind_volunteer_alias', 'need_aid_alias', 'admin_kindlink_alias'
)
ORDER BY p.role DESC, p.username ASC;
```

All 6 rows should be returned with `provider = 'email'` and `verification_status = 'verified'`.
