# KindLink - Help is just next door

A verified community mutual aid platform for urgent tasks, engineered as a physics project for **B.Tech CSE (Asansol Engineering College)**.

KindLink links neighbors across Asansol, Burnpur, Durgapur, Dhanbad, and surrounding areas for small but critical community tasks:
- 🩸 **Emergency Blood Donation & Platelets**
- 🩺 **Wheelchairs & Medical Equipment** (Oxygen concentrators, walkers, nebulizers)
- 👵 **Elderly Care & Medicine Delivery**
- 📚 **Textbooks & Study Materials** (WBBSE, CBSE, College)
- 🚑 **Emergency Patient Transport**

---

## ⚡ Physics Features (Applied Classical Mechanics)

KindLink incorporates three real physics features:

1. **Kinematics & Haversine Distance Engine**:
   - Calculates true great-circle spherical distance across Earth's surface ($R = 6,371\text{ km}$):
     $$d = 2R \arcsin\left(\sqrt{\sin^2(\Delta\phi/2) + \cos\phi_1 \cos\phi_2 \sin^2(\Delta\lambda/2)}\right)$$
   - Computes dynamic arrival time ($v = d / t \implies t = d / v$) with selectable travel velocities:
     - 🚶 Walking: $5\text{ km/h}$
     - 🚲 Bicycle: $15\text{ km/h}$
     - 🚗 Vehicle / Ambulance: $30\text{ km/h}$

2. **Help Gravity Urgency Score (Newtonian Proximity Model)**:
   - Inspired by Newton's Universal Law of Gravitation ($F = G \frac{m_1 m_2}{r^2}$), where closer emergencies exert a stronger gravitational pull on local helpers:
     $$\text{Score} = \frac{\text{TypeWeight} \times (1 + 0.05 \times \text{waitingMinutes})}{(1 + \text{distanceKm})^2}$$
   - **Type Weights**:
     - Blood Donation: $10$
     - Emergency Transport: $9$
     - Elderly Care: $6$
     - Medical Equipment: $5$
     - Books & Study: $2$
   - Explored interactively with real-time sliders in the **Physics Lab**.

3. **Inertial Sensor Calibration & Fall Detector**:
   - Uses the HTML5 `DeviceMotion` API.
   - **Step 1 (Calibration)**: 3-second stationary baseline measurement subtracting structural sensor error bias ($\Delta x, \Delta y, \Delta z$).
   - **Step 2 (Signal Processing)**: Discrete low-pass filter ($\alpha = 0.3$) to suppress noise and jitter.
   - **Step 3 (Impact & Kinetic Spike Detection)**: Detects deceleration spikes exceeding threshold ($|\vec{a}| > 22\text{ m/s}^2$) followed by stillness, triggering a 10-second safety countdown with automatic SOS beacon dispatch. Includes a desktop fall simulation mode for testing.

---

## 🌐 Multilingual System & Google Translate Engine

- **Default Language**: English (`en`).
- **Supported Languages**:
  - English (`en`)
  - हिन्दी (Hindi, `hi`)
  - বাংলা (Bengali, `bn`)
  - भोजपुरी (Bhojpuri, `bho`)
  - मैथिली (Maithili, `mai`)
  - नेपाली (Nepali, `ne`)
  - اردو (Urdu, `ur` with full RTL layout support)
- **Zero UI Flicker**: Completely hides Google Translate banners, tooltips, and highlights via CSS.
- **Instant Switching**: Updates `googtrans` cookies and activates client translations without page reloads.
- **Crash Prevention**: Patches `Node.prototype.removeChild` and `Node.prototype.insertBefore` against React Virtual DOM mismatches.
- **Regional Dialect Notice**: Tribal dialects not officially included in the legacy Google Translate widget (such as Santali Ol Chiki, Nagpuri, Khortha, Kurukh, Mundari, Ho) are documented transparently rather than artificially faked.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript, Standalone output)
- **Styling**: Tailwind CSS with custom KindLink design tokens
- **Map & GIS**: React Leaflet + Leaflet + OpenStreetMap tiles (`ssr: false`)
- **State**: Zustand with `persist` localStorage synchronization
- **Theme**: `next-themes` (Light, Dark, and System modes)
- **Toasts**: Sonner
- **Icons**: Lucide React
- **Fonts**: Plus Jakarta Sans (Headings), Inter (Body), Noto Sans Devanagari, Bengali, Urdu fallbacks

---

## 🚀 Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/krishkumarcodes/KindLink.git
cd KindLink

# 2. Install dependencies
npm install

# 3. Start the Next.js development server
npm run dev

# 4. Open in browser
# http://localhost:3000
```

---

## 🐳 Docker Build & Run

KindLink features a multi-stage Dockerfile using Node 20 Alpine and Next.js standalone output, running under a non-root user (`nextjs`).

```bash
# Build the Docker image
docker build -t kindlink .

# Run the container (binds to port 3000)
docker run -p 3000:3000 -e PORT=3000 kindlink

# Test health check endpoint
curl http://localhost:3000/api/health
```

---

## ☁️ Deploying to Render

KindLink includes a ready-to-use `render.yaml` blueprint:

1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Web Service** or select **Blueprints** and point to `render.yaml`.
3. Set the build environment to **Docker**.
4. Health check path is automatically configured as `/api/health`.

---

## 📄 License & Attribution

Developed as a B.Tech CSE Physics Capstone Project at **Asansol Engineering College (WB, India)**. Open-source, non-profit, community-first.
