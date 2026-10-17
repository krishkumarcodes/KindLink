# KindLink - Complete Maps & Geolocation Setup Guide

> **Target Reading Level:** Simple, clear, step-by-step instructions (suitable for a 12-year-old or anyone new to web development).

---

## 🗺️ Welcome! What Does This Guide Help You Do?

KindLink has an interactive neighborhood map that lets community members:
1. **See their neighborhood** on a high-definition street map (in both crisp Light Mode and dark high-contrast Emergency Mode).
2. **Search for places** (like "Asansol Railway Station" or "Kalla Hospital") and convert street names into GPS pins.
3. **Calculate travel routes** for volunteers walking, biking, or driving to deliver medicine, blood, or aid.
4. **Locate urgent medical facilities** (hospitals, pharmacies, and blood banks).

To do this, KindLink uses three popular map services:
- **MapTiler**: Draws the map tiles (the roads, parks, buildings, and colors).
- **Geoapify**: Converts typed address names into GPS numbers (geocoding) and finds nearby clinics.
- **OpenRouteService (ORS)**: Computes turn-by-turn routes and tells volunteers how many minutes it will take to get there.

---

## 💰 Do I Have to Pay Anything?

**No! Every single service used by KindLink has a 100% Free Tier forever.**
You do not need to enter a credit card or pay any money.

### 🛡️ What if I don't want to set up any API keys right now?
**KindLink still works!**
KindLink includes built-in **automatic community fallbacks**:
- If MapTiler is missing, it automatically loads **OpenStreetMap standard tiles**.
- If Geoapify is missing, it automatically uses **Photon** and **Nominatim**.
- If OpenRouteService is missing, it automatically routes with **Project OSRM**.

Your app will never crash just because an API key is missing. Adding the keys just gives you higher resolution vector maps, faster search speeds, and custom dark mode styling!

---

## 📋 Quick Summary of Free Tiers

| Service | What It Does For KindLink | Free Tier Allowance | Credit Card Needed? |
| :--- | :--- | :--- | :---: |
| **MapTiler** | Map background tiles (Light & Dark) | **100,000 tile requests** per month | **No** |
| **Geoapify** | Address search & hospital lookup | **3,000 credit requests** per day | **No** |
| **OpenRouteService** | Walking, cycling & driving route times | **2,000 route calculations** per day | **No** |

---

## 1️⃣ Provider 1: MapTiler (Map Background & Colors)

MapTiler draws the pretty map roads, labels, and dark-mode graphics.

### Step 1: Sign up for a free account
1. Open your browser and go to: **[https://cloud.maptiler.com/account/create/](https://cloud.maptiler.com/account/create/)**
2. Sign up using your email address, or click **"Continue with Google"** / **"Continue with GitHub"**.
3. Choose the **"Free Plan"** (Cost: $0/month).

### Step 2: Find your API Key
1. Once logged into the dashboard, look at the left sidebar menu.
2. Click on **"API Keys"** (or visit **[https://cloud.maptiler.com/account/keys/](https://cloud.maptiler.com/account/keys/)**).
3. You will see a key already created for you (often called `Default key`).
4. Click the small **Copy** icon next to the key string (it looks like a random string of numbers and letters, e.g., `aBcDeFgHiJkLmNoPqRsT`).

### Step 3: Restrict your key to your website domain (Important Security Step!)
To make sure nobody else steals your free map quota on their own websites, you can tell MapTiler to only allow your domain:
1. Click on the name of your key in the MapTiler dashboard to open its settings.
2. Scroll down to the section named **"Allowed HTTP origins"** (sometimes called *Key restrictions* or *Allowed domains*).
3. Type in your websites, one per line:
   ```text
   http://localhost:3000
   http://localhost:*
   https://kindlink-gd8e.onrender.com
   https://*.onrender.com
   ```
   *(If you have a custom domain like `https://kindlink.org`, add that too!)*
4. Click the blue **"Save"** button at the bottom.

### 📜 MapTiler Terms of Service Note (Non-Commercial Community Use)
MapTiler's free plan allows non-commercial, evaluation, and community open-source use.
Because KindLink is a **free academic capstone community mutual-aid project** built at Asansol Engineering College that charges zero user fees and displays zero ads, it strictly complies with MapTiler's free tier terms.

---

## 2️⃣ Provider 2: Geoapify (Address Search & Nearby Hospitals)

Geoapify turns words like *"Asansol Bus Stand"* into exact latitude and longitude coordinates.

### Step 1: Sign up for a free account
1. Open your browser and go to: **[https://myprojects.geoapify.com/](https://myprojects.geoapify.com/)**
2. Click **"Sign Up"** in the top right.
3. Enter your email and a password, then verify your email.
4. Select the **Free Plan** (gives you **3,000 free request credits every day**).

### Step 2: Create a Project and Copy your API Key
1. After logging in, you will be on the **Projects** page.
2. If there is already a default project, click on it. If not, click **"+ New Project"**, name it `KindLink`, and click **Create**.
3. Inside your project, click the **"API Keys"** tab.
4. Click the **Copy** icon next to your API Key.
5. Keep this key handy for the next step!

---

## 3️⃣ Provider 3: OpenRouteService (ORS) (Walking & Driving Routes)

OpenRouteService (created by the Heidelberg Institute for Geoinformation Technology) calculates how long it takes to walk or bike to a neighbor who needs help, and draws the route line on the map.

### Step 1: Sign up for a free developer account
1. Open your browser and go to: **[https://openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)**
2. Fill out the registration form:
   - User Name
   - Email address
   - Password
3. Open your email inbox and click the verification link they send you.

### Step 2: Log in and generate a Token
1. Log in at: **[https://openrouteservice.org/dev/#/login](https://openrouteservice.org/dev/#/login)**
2. On the top navigation bar, click on **"Tokens"**.
3. Scroll down to the box labeled **"Request a token"**:
   - **Token type:** Select **"Free"** (or Standard).
   - **Token name:** Type `KindLink-MapRoute`.
4. Click the blue button labeled **"CREATE TOKEN"**.
5. Your new token will appear in the list above. Click the **Copy** icon next to it.
   *(The token is a long string of letters and numbers, about 64 characters long).*

---

## 4️⃣ Where to Paste Your Keys

Now that you have your three keys, here is where to put them!

### Option A: For Local Development on your Computer (`.env.local`)

1. Open your code editor in the KindLink project folder.
2. In the root directory, create a file named `.env.local` if it does not already exist (you can copy `.env.example`).
3. Scroll down to **Section 7** (Maps Configuration) and paste your keys:

```dotenv
# ------------------------------------------------------------------------------
# 7. MAPS, GEOCODING, ROUTING & PLACES CONFIGURATION
# ------------------------------------------------------------------------------
GEOAPIFY_API_KEY=your_actual_geoapify_key_here
ORS_API_KEY=your_actual_openrouteservice_token_here
MAPTILER_API_KEY=your_actual_maptiler_key_here
NEXT_PUBLIC_MAPTILER_API_KEY=your_actual_maptiler_key_here

MAPS_CONTACT_EMAIL=maps-admin@kindlink.app
MAPTILER_STYLE_LIGHT=streets-v2
MAPTILER_STYLE_DARK=dataviz-dark
MAP_BOUNDS=23.50,86.70,23.85,87.20
```

4. Save the file!
5. If your local development server is running (`npm run dev`), stop it by pressing `Ctrl + C`, then start it again with `npm run dev`.

---

### Option B: For Cloud Deployment on Render ([dashboard.render.com](https://dashboard.render.com))

When hosting KindLink on Render:

1. Open your web browser and go to the **[Render Dashboard](https://dashboard.render.com)**.
2. Click on your **KindLink Web Service**.
3. In the left-hand sidebar menu, click on the **Environment** tab (it has a key 🔑 icon).
4. You will see your list of environment variables.
5. Click the button labeled **"Add Environment Variable"** and add each of these:

| Key Name | Value |
| :--- | :--- |
| `GEOAPIFY_API_KEY` | *(Paste your Geoapify key)* |
| `ORS_API_KEY` | *(Paste your OpenRouteService token)* |
| `MAPTILER_API_KEY` | *(Paste your MapTiler key)* |
| `NEXT_PUBLIC_MAPTILER_API_KEY` | *(Paste your MapTiler key again)* |
| `MAPS_CONTACT_EMAIL` | `maps-admin@kindlink.app` |
| `MAPTILER_STYLE_LIGHT` | `streets-v2` |
| `MAPTILER_STYLE_DARK` | `dataviz-dark` |
| `MAP_BOUNDS` | `23.50,86.70,23.85,87.20` |
| `MAP_TILE_PROVIDERS` | `maptiler,osm` |
| `GEOCODE_PROVIDERS` | `geoapify,photon,nominatim` |
| `ROUTE_PROVIDERS` | `ors,geoapify,osrm` |
| `PLACES_PROVIDERS` | `geoapify,overpass` |

6. Scroll down to the bottom and click the blue **"Save Changes"** button!

---

## 5️⃣ How to Redeploy on Render (Crucial Step!)

Next.js is a high-performance framework that bakes client keys (variables starting with `NEXT_PUBLIC_`) directly into HTML and JavaScript files when building the website container.

Whenever you add or change your map keys, you **must trigger a clean rebuild**:

1. In your Render dashboard for KindLink, look at the top right corner.
2. Click the blue button labeled **"Manual Deploy"**.
3. In the dropdown, choose **"Clear build cache & deploy"** (do NOT choose ordinary deploy; always pick *Clear build cache*).
4. Render will start rebuilding your Docker container. Wait 2 to 4 minutes until you see:
   ```text
   ==> Uploading build...
   ==> Build successful 🎉
   ==> Deploying...
   ==> Your service is live! 🚀
   ```

---

## 6️⃣ How to Test Everything with `npm run maps:check`

KindLink includes an automated diagnostic tool that tests all your keys and network connections in one command!

In your terminal, run:
```bash
npm run maps:check
```

### How to Read the Output:

The test tool checks each provider and shows you a clean, colored report:

```text
================================================================
 KindLink Geospatial Health & Provider Diagnostics Check        
================================================================

1. Configuration & Environment Variables:
   Tile Providers Chain   : maptiler ➔ osm
   Geocode Providers Chain: geoapify ➔ photon ➔ nominatim
   Route Providers Chain  : ors ➔ geoapify ➔ osrm
   Places Providers Chain : geoapify ➔ overpass
   Contact Email (OSM)    : maps-admin@kindlink.app
   Map Bounds (Asansol)   : 23.50,86.70,23.85,87.20

2. Provider API Key Status & Live Ping Tests:
   • [Tile] MapTiler               : ✔ ACTIVE (aBcD...pQrS) - HTTP 200 [142ms]
   • [Tile Fallback] OpenStreetMap : ✔ REACHABLE - HTTP 200 [210ms]
   • [Geocode] Geoapify            : ✔ ACTIVE (xY12...99zA) - HTTP 200 [315ms]
   • [Geocode Fallback] Photon     : ✔ REACHABLE - HTTP 200 [280ms]
   • [Route] OpenRouteService (ORS): ✔ ACTIVE (5839...c481) - HTTP 200 [412ms]
   • [Route Fallback] Project OSRM : ✔ REACHABLE - HTTP 200 [195ms]

3. Summary Verdict:
   ✔ FULL CAPACITY: All commercial provider keys (MapTiler, Geoapify, ORS) are verified and operational.
```

### The Three Possible Verdicts:

1. **🟢 FULL CAPACITY**:
   All three keys are present, valid, and responding fast. KindLink is operating at top performance with custom dark-mode vector cartography!
2. **🟡 HYBRID OPERATION**:
   One or two keys are working, while the missing ones automatically fall back to free community services. Everything works normally for users.
3. **🔵 COMMUNITY FALLBACK MODE**:
   No commercial keys were found. KindLink is running 100% on free community services (OpenStreetMap, Photon, and OSRM). The app works completely, without paying a single rupee!

---

## 7️⃣ Understanding Soft Limits & Fallback Magic

KindLink has a built-in safety system called **Circuit Breakers and Soft Limits**.

### What is a "Soft Limit"?
Think of a soft limit like the yellow fuel light in a car. It doesn't stop the car; it just warns you that you are getting close to the end of the tank.

KindLink sets default daily and monthly limits:
- **MapTiler**: 100,000 tiles per month (`MAPTILER_MONTHLY_LIMIT=100000`)
- **Geoapify**: 3,000 requests per day (`GEOAPIFY_DAILY_LIMIT=3000`)
- **OpenRouteService**: 2,000 requests per day (`ORS_DAILY_LIMIT=2000`)

### What happens when 80% of a quota is used?
KindLink logs an alert so admins know your community is very active!

### What happens if a free quota runs out or a provider goes down?
**KindLink will never show an error screen to a user.**
Instead, the server instantly and silently switches over to the next provider in the chain:
- **Map tiles:** If MapTiler runs out ➔ Switches to **OpenStreetMap** standard tiles.
- **Address search:** If Geoapify runs out ➔ Switches to **Photon (Komoot)** ➔ then **Nominatim**.
- **Route calculation:** If ORS runs out ➔ Switches to **Geoapify** ➔ then **Project OSRM**.
- **Hospital search:** If Geoapify runs out ➔ Switches to **Overpass API**.

When the clock resets at midnight (or the next month begins), KindLink automatically switches back to the primary providers!

---

## 8️⃣ Privacy: How KindLink Protects Neighbors

KindLink is built with a strict **Privacy-First** principle:
1. **Server Proxies (`/api/maps/*`):** Your phone or computer browser **never talks directly** to MapTiler, Geoapify, or OpenRouteService. All searches go through KindLink's server. External companies only see KindLink's server IP, never your device or home IP address.
2. **Rounded Coordinates:** When calculating walking routes, GPS numbers are rounded so external companies cannot see an exact house number or hospital bed.
3. **Zero Personal Data:** Names, phone numbers, and logins are completely stripped before asking map services for road directions.

---

## 9️⃣ Troubleshooting Checklist

If something doesn't look right, check these quick fixes:

### ❌ Problem: The map is gray or tiles aren't loading
- **Check 1:** Run `npm run maps:check` in your terminal to see if MapTiler returned an error.
- **Check 2:** Did you restrict the key to `Allowed HTTP origins` in MapTiler? Make sure `http://localhost:3000` (for local dev) and your Render domain `https://*.onrender.com` are listed.
- **Check 3:** Ensure `NEXT_PUBLIC_MAPTILER_API_KEY` is spelled correctly in `.env.local` or Render.

### ❌ Problem: Address autocomplete shows "No places found"
- **Check 1:** Make sure your search text is spelled reasonably well (e.g., "Asansol" or "Durgapur").
- **Check 2:** In `npm run maps:check`, verify that Geoapify or Photon is showing `✔ ACTIVE` or `✔ REACHABLE`.
- **Check 3:** If searching outside Asansol, remember that `MAP_BOUNDS` biases searches to the Paschim Bardhaman district.

### ❌ Problem: Route line doesn't appear between two points
- **Check 1:** Check if the distance between points is walkable or reachable by road (e.g. within West Bengal).
- **Check 2:** Verify `ORS_API_KEY` token is active in the OpenRouteService dashboard.
- **Check 3:** If ORS is offline, KindLink falls back to Project OSRM automatically.

### ❌ Problem: I updated keys on Render, but the site still says keys are missing
- **Fix:** Did you click **"Clear build cache & deploy"**? Next.js needs a full rebuild to pack new `NEXT_PUBLIC_` keys into the website bundle!

---

## 🔗 Official Links & Reference Documentation

- **MapTiler Dashboard:** [https://cloud.maptiler.com/](https://cloud.maptiler.com/)
- **Geoapify Dashboard:** [https://myprojects.geoapify.com/](https://myprojects.geoapify.com/)
- **OpenRouteService Dashboard:** [https://openrouteservice.org/dev/#/home](https://openrouteservice.org/dev/#/home)
- **OpenStreetMap Project:** [https://www.openstreetmap.org/](https://www.openstreetmap.org/)
- **KindLink Credits Page:** [https://kindlink-gd8e.onrender.com/credits](https://kindlink-gd8e.onrender.com/credits)
- **KindLink Privacy Policy:** [https://kindlink-gd8e.onrender.com/privacy](https://kindlink-gd8e.onrender.com/privacy)

---
*Created with care by the KindLink Engineering Team at Asansol Engineering College.*
