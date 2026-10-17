# KindLink - Automatic IP Language Detection & IPinfo Setup Guide

> **Target Reading Level:** Simple, clear, step-by-step instructions written for a 12-year-old or anyone learning web development.

---

## 🌍 Welcome! What Does This Feature Do?

Imagine someone in Paris, France opens KindLink for the very first time. Instead of seeing everything in English and wondering where the language button is, KindLink automatically greets them in **French**!

If someone visits from Tokyo, Japan, they get **Japanese**. If someone visits from Asansol or anywhere in India, they get **English** (the shared common language across all Indian states on KindLink).

### How does KindLink do this safely?
1. **One-Time Check:** On a visitor's very first visit, KindLink asks **IPinfo** which country the visitor is connecting from.
2. **Instant Translation:** KindLink looks up the country in a rulebook (`config/country-language.json`) and sets the starting language.
3. **Saved in a Cookie:** KindLink saves their choice in a browser cookie (`kindlink_lang`). Next time they visit, KindLink reads the cookie immediately—it never has to ask IPinfo again!
4. **User Always in Control:** If the visitor wants a different language, they can change it anytime with the Language button. Their personal choice **always wins** and stays locked.

---

## 🔒 Privacy Rules: How We Protect You

We believe mutual aid should always protect people's privacy. Here are the 4 unbreakable rules we built into KindLink:

1. **Zero Logging & Zero Tracking:** KindLink **never** saves your IP address in a database, log file, analytics tool, or cookie.
2. **Ephemeral Use Only:** The visitor's IP address is only used in memory for a split-second to look up the 2-letter country code (like `FR` or `IN`), and then it is immediately forgotten.
3. **No Secret Client Exposure:** The secret `IPINFO_TOKEN` stays strictly on the private server. It is **never** given to the web browser (no `NEXT_PUBLIC_` prefix allowed!).
4. **Speed Guarantee (600ms Timeout):** If IPinfo is slow or offline, KindLink doesn't freeze or make you wait. After 600 milliseconds, it simply stops waiting and defaults to English.

---

## 💰 Do I Have to Pay Anything?

**No! IPinfo has a 100% Free Tier forever.**

| Feature | IPinfo Free Tier | What KindLink Needs |
| :--- | :--- | :--- |
| **Monthly Cost** | **$0 / month** | $0 (Free) |
| **Requests Allowed** | **50,000 lookups per month** | ~500 to 5,000 for a local community |
| **Credit Card Required?** | **No** | None |
| **What happens if no token?** | Falls back to English silently | Zero crashes |

Even if you don't add an IPinfo token, KindLink still works normally and defaults to English.

---

## 🔑 1. How to Get Your Free IPinfo Token

Getting a free token takes about 60 seconds:

1. Open your web browser and go to: **[https://ipinfo.io/signup](https://ipinfo.io/signup)**
2. Enter your email address and create a password, or sign in with **Google** or **GitHub**.
3. Once logged into your dashboard, you will see your **Access Token** on the home screen (it looks like a short string of letters and numbers, such as `3bceff41ceb2e5`).
4. Click the **Copy** button to copy your token to your clipboard.

---

## ⚙️ 2. Where to Configure Your Token

### Option A: Local Development on Your Computer

1. Open the file named `.env.local` in the root folder of KindLink.
2. Look for the IPinfo configuration section at the bottom:

```env
# ------------------------------------------------------------------------------
# 7. IPINFO & GEO-IP LANGUAGE DETECTION (Server-Only, Private)
# ------------------------------------------------------------------------------
IPINFO_TOKEN=3bceff41ceb2e5
IPINFO_TIMEOUT_MS=600
IPINFO_MODE=api
ALLOW_TEST_COUNTRY=false
```

3. Replace `3bceff41ceb2e5` with your own token if you have one.
4. Save the file.

> [!WARNING]
> **Never** rename this variable to `NEXT_PUBLIC_IPINFO_TOKEN`. Any variable starting with `NEXT_PUBLIC_` gets downloaded into every visitor's web browser, exposing your secret key to the world!

---

### Option B: Cloud Hosting on Render

When deploying your KindLink app to the web with Render:

1. Go to your **[Render Dashboard](https://dashboard.render.com)**.
2. Click on your **KindLink Web Service**.
3. Click on **Environment** in the left sidebar menu.
4. Click **Add Environment Variable**:
   - **Key:** `IPINFO_TOKEN`
   - **Value:** Paste your IPinfo token (e.g., `3bceff41ceb2e5`)
5. Check that the other helper variables are set (these are pre-configured in `render.yaml`):
   - `IPINFO_TIMEOUT_MS` = `600`
   - `IPINFO_MODE` = `api`
   - `ALLOW_TEST_COUNTRY` = `false`
6. Click **Save Changes**. Render will automatically restart your app with the new settings.

---

## 🧪 3. Running the CLI Verification Tool

KindLink comes with a command-line test tool that checks your token and validates your country mappings:

Run this command in your terminal:

```bash
npm run lang:check-ip
```

### What You Should See:

```text
🌐 KindLink IPinfo & Language Detection Verification Tool

--- 1. Validating Country-to-Language Rules ---
[PASS] Country map contains 28 countries (meets 20+ countries requirement).
[PASS] All 28 countries map to valid supported languages in lib/translate/googleTranslate.ts.
[PASS] Default fallback language is "en" (valid).

--- 2. Checking IPinfo Lite Token & Live Lookups ---
[PASS] IPINFO_TOKEN detected (3bce...2e5). Private server-side configuration confirmed.
[PASS] IPinfo Lite query for 8.8.8.8 (Google Public DNS) -> Country: US -> Language: en (English).
[PASS] IPinfo Lite query for 1.1.1.1 (Cloudflare Public DNS) -> Country: AU -> Language: en (English).

--- Verification Summary ---
All IP & language checks passed successfully!
```

If you don't have a token set, it will safely tell you:
```text
[SKIPPED] No IPINFO_TOKEN set (falling back to English).
```

---

## 🗺️ 4. How to Edit Country-to-Language Mappings

All country-to-language mappings are stored in a simple JSON file:
📁 **`config/country-language.json`**

Open that file in your text editor. It looks like this:

```json
{
  "default": "en",
  "IN": "en",
  "US": "en",
  "GB": "en",
  "BD": "bn",
  "NP": "ne",
  "PK": "ur",
  "FR": "fr",
  "ES": "es",
  "DE": "de",
  "JP": "ja"
}
```

### How to Add or Change a Country:
1. Find the 2-letter country code (ISO 3166-1 alpha-2). For example, `IT` for Italy or `KR` for South Korea.
2. Pick one of the **29 supported language codes** in KindLink (like `it`, `ko`, `es`, `fr`, `hi`, `bn`).
3. Add a new line in the format: `"COUNTRY_CODE": "language_code",`
4. Save the file and run `npm run lang:check-ip` to make sure your changes are valid!

---

## 💻 5. How to Test Locally on Your Computer

Testing IP lookups on `localhost` (your laptop or desktop) can be tricky because your local IP address is `127.0.0.1` or `localhost`, not a public IP.

Here are 2 simple ways to test:

### Method 1: Use `DEV_FORCE_COUNTRY` (Fastest!)

You can tell KindLink to pretend you are visiting from another country:

1. In `.env.local`, enable testing:
   ```env
   ALLOW_TEST_COUNTRY=true
   ```
2. Start the dev server with a simulated country:
   ```bash
   DEV_FORCE_COUNTRY=FR npm run dev
   ```
3. Open your browser in **Incognito / Private Window** (so no previous cookies exist) and visit:
   `http://localhost:3000`
4. The page will open in **French** and display a friendly notice banner:
   *"We set your language to Français based on your location."*
5. Try `DEV_FORCE_COUNTRY=BD` (Bengali), `DEV_FORCE_COUNTRY=DE` (German), or `DEV_FORCE_COUNTRY=JP` (Japanese)!

> [!IMPORTANT]
> `ALLOW_TEST_COUNTRY` is strictly disabled in production (`ALLOW_TEST_COUNTRY=false`). It only works when explicitly permitted for development.

### Method 2: Use a VPN

1. Turn on a VPN and connect to a server in France, Germany, or Japan.
2. Open a new **Incognito Window** in your browser.
3. Visit your live site (e.g. `https://kindlink-gd8e.onrender.com`).
4. KindLink will detect your VPN's public IP address through IPinfo and select the corresponding language automatically.

---

## 📜 6. Legal Attribution & Privacy Rules

Under IPinfo's free attribution license, apps must acknowledge IPinfo.

KindLink includes official attribution in four places:
1. **Credits Page:** [KindLink Credits & Map Attributions](https://kindlink-gd8e.onrender.com/credits)
2. **Privacy Policy:** [KindLink Privacy Policy](https://kindlink-gd8e.onrender.com/privacy)
3. **Terms of Service:** [KindLink Terms](https://kindlink-gd8e.onrender.com/terms)
4. **App Settings:** Inside the app under **Settings > About KindLink**.

### Required Attribution Notice:
> **IP address data powered by [IPinfo](https://ipinfo.io)**

Whenever you mention IPinfo in the UI, ensure it includes an active link to `https://ipinfo.io` with `target="_blank" rel="noopener noreferrer"`.

---

## 🍪 7. Cookie List Summary

KindLink uses only functional cookies (zero advertising trackers):

| Cookie Name | Purpose | Lifespan |
| :--- | :--- | :--- |
| `kindlink_lang` | Remembers your chosen language code | 1 year |
| `kindlink_lang_source` | Remembers if the language was auto-detected (`auto`) or chosen by you (`user`) | 1 year |
| `kindlink_locale` | Synchronizes language between server and browser | 1 year |
| `googtrans` | Used by Google Translate engine | 1 year |

If a visitor manually clicks any language in the Language Menu, `kindlink_lang_source` is permanently switched to `'user'`. Once set to `'user'`, the automatic detector will **never** override the user's choice again!
