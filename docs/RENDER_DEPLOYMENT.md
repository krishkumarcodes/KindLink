# KindLink - Render Deployment & Environment Configuration Guide

This guide provides end-to-end instructions for deploying KindLink to **[Render](https://render.com)**, including one-click environment configuration, key format specifications, and Docker runtime verification.

---

## 1. Quick Copy-Paste Environment Variables Block

In the **Render Dashboard** ([dashboard.render.com](https://dashboard.render.com)):
1. Navigate to your **KindLink Web Service** -> **Environment** (key icon in the sidebar).
2. Click the button labeled **"Add from .env"**.
3. Copy and paste the entire block below into the dialog:

```dotenv
PORT=3000
NODE_ENV=production
DATA_SOURCE=supabase
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SITE_URL=https://kindlink-gd8e.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://hxrysrpymeleaipgofqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTIwMDgsImV4cCI6MjEwNzM2ODAwOH0.a7Vra1vcmPmxAr2zd9mOGRpWR9w34kcj7sEVbwdFFXg
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTIwMDgsImV4cCI6MjEwNzM2ODAwOH0.a7Vra1vcmPmxAr2zd9mOGRpWR9w34kcj7sEVbwdFFXg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTc5MjAwOCwiZXhwIjoyMTA3MzY4MDA4fQ.hdrH0c9RGEVLej2Cle-ukUyLewuZmqqGY1Z3QS7QIhM
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTc5MjAwOCwiZXhwIjoyMTA3MzY4MDA4fQ.hdrH0c9RGEVLej2Cle-ukUyLewuZmqqGY1Z3QS7QIhM
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_BING_SITE_VERIFICATION=
INDEXNOW_KEY=
```

4. Click **Save Changes**.
5. Trigger **Manual Deploy** -> **Clear build cache & deploy** (Next.js inlines `NEXT_PUBLIC_` variables at compile time; clearing the cache ensures the container is built with fresh keys).

---

## 2. Environment Variables Reference Table

| Variable Name | Required | Exposed to Browser | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Yes | No | Internal port Next.js standalone server listens on (`3000`). |
| `NODE_ENV` | Yes | Yes | Set to `production` for optimized minification, telemetry disabling, and React production builds. |
| `DATA_SOURCE` | Yes | No | Backend mode: `supabase` (live PostgreSQL/Auth) or `mock` (offline seed data). |
| `NEXT_PUBLIC_DATA_SOURCE` | Yes | Yes | Client-side indicator for data source switch (`supabase` or `mock`). |
| `NEXT_PUBLIC_SITE_URL` | Yes | Yes | Canonical production URL (e.g., `https://kindlink-gd8e.onrender.com`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project endpoint (`https://hxrysrpymeleaipgofqj.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Public anon key for client-side queries and RLS evaluation. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional | Yes | Alias for `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Supports legacy JWT or modern 2024+ format. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **NO (STRICT SECRET)** | Administrator service role key. Bypasses Row Level Security (RLS). Used by server actions and seed scripts. |
| `SUPABASE_SECRET_KEY` | Optional | **NO (STRICT SECRET)** | Alias for `SUPABASE_SERVICE_ROLE_KEY`. Supports legacy JWT or modern 2024+ format. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Optional | Yes | Google Search Console verification token. |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Optional | Yes | Bing Webmaster Tools verification meta tag token. |
| `INDEXNOW_KEY` | Optional | No | 32-character hex key for instant indexing submission. |

---

## 3. Understanding Supabase API Key Formats (Legacy JWT vs 2024+ Format)

KindLink is built with resilient configuration resolvers in `lib/supabase/client.ts` and `lib/supabase/admin.ts` that support both official Supabase key representations:

### A. Legacy JWT Keys (Recommended Default)
- **Public Anon Key (`role: anon`)**:
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTIwMDgsImV4cCI6MjEwNzM2ODAwOH0.a7Vra1vcmPmxAr2zd9mOGRpWR9w34kcj7sEVbwdFFXg
  ```
- **Service Role Secret Key (`role: service_role`)**:
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cnlzcnB5bWVsZWFpcGdvZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTc5MjAwOCwiZXhwIjoyMTA3MzY4MDA4fQ.hdrH0c9RGEVLej2Cle-ukUyLewuZmqqGY1Z3QS7QIhM
  ```
- **Why this is default**: Next.js SSR middleware and `@supabase/ssr` (v0.12+) decode JWT payload claims (`iss`, `ref`, `role`, `exp`) locally to establish auth context without network overhead.

### B. New Supabase 2024+ API Keys
- **Public Publishable Key**:
  ```text
  sb_publishable_jq9ovhxpDR7GDzXlKSBPvg_0lU2GP3P
  ```
- **Secret Key**:
  ```text
  sb_secret_your_secret_key_here
  ```
- **Compatibility**: If you prefer the new format, set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` and `SUPABASE_SECRET_KEY=sb_secret_...`. KindLink automatically detects and resolves them.

---

## 4. Deployment Methods on Render

### Method 1: Infrastructure as Code via `render.yaml` (Blueprint)
1. Fork or push the KindLink repository to your GitHub account.
2. In the Render Dashboard, click **Blueprints** -> **New Blueprint Instance**.
3. Select your repository. Render reads the root `render.yaml` file:
   - Sets environment to `docker`
   - Configures health check at `/api/health`
   - Sets port `3000`
   - Injects the required environment variables automatically
4. Click **Apply**.

### Method 2: Manual Web Service Creation
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `kindlink`
   - **Region**: Singapore or Oregon (choose closest to `ap-northeast-1` Tokyo)
   - **Branch**: `main`
   - **Runtime**: `Docker` (Render automatically detects the root `Dockerfile`)
   - **Instance Type**: `Free`
4. Under **Environment**, click **Add from .env** and paste the block from Section 1 above.
5. Under **Advanced Settings**:
   - **Health Check Path**: `/api/health`
   - **Auto-Deploy**: `Yes`
6. Click **Create Web Service**.

---

## 5. Deployment Verification & Health Check

### Health Check Endpoint
Once deployed, verify the container status by requesting the health check route:
```bash
curl -i https://kindlink-gd8e.onrender.com/api/health
```

Expected JSON response (HTTP 200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-10-13T04:30:00.000Z",
  "uptime": 24.52
}
```

### Live Statistics Endpoint
Verify that PostgreSQL RPC and table queries are functioning through Supabase:
```bash
curl -i https://kindlink-gd8e.onrender.com/api/stats/live
```

Expected JSON response:
```json
{
  "helpers": 0,
  "avg_response_min": null,
  "requests_completed": 0,
  "satisfaction_pct": null,
  "active_requests": 0,
  "live": true,
  "success": true
}
```

---

## 6. Common Render Troubleshooting Tips

1. **Stale Environment Variables**:
   Next.js compiles `NEXT_PUBLIC_` variables directly into JavaScript bundles during `npm run build`. Whenever you modify Supabase keys or site URLs, always click **Manual Deploy** -> **Clear build cache & deploy** to force Next.js to recompile the client bundle.

2. **Out of Memory (`Exit code 137 / OOM Killed`)**:
   Render Free Tier provides 512MB RAM. KindLink is optimized with:
   - `node:22-alpine` multi-stage build (low memory footprint)
   - `output: 'standalone'` in `next.config.mjs`
   - SWC minification without heavy source map generation

3. **Suspense Boundaries (`useSearchParams bailout`)**:
   All dynamic client pages (`/login`, `/signup`) wrap query parameter consumption in `<Suspense fallback={...}>` to prevent build-time static prerendering bailout errors.
