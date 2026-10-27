# KindLink Performance Baseline & Core Web Vitals Report

**Baseline Date:** 2026-10-27  
**Target Environment:** Next.js 14 Production Build (Asansol Mutual Aid Network)  
**Hardware Profile:** Mobile 4G Low-Tier / Mid-Tier Baseline (360px–1024px)  

---

## Executive Summary

KindLink enforces strict performance budgets to guarantee rapid accessibility during high-urgency community situations (blood requests, medical gear dispatch, emergency transit).

- **Home Screen Initial JS:** `145.1 KB` (Target Budget: `<= 170 KB`) ✅ **PASS**
- **Home Screen FCP:** `780 ms` (Target Budget: `<= 1500 ms`) ✅ **PASS**
- **Home Screen LCP:** `1420 ms` (Target Budget: `<= 2500 ms`) ✅ **PASS**
- **Home Screen CLS:** `0.012` (Target Budget: `<= 0.1`) ✅ **PASS**
- **Home Screen TBT:** `65 ms` (Target Budget: `<= 200 ms`) ✅ **PASS**

---

## 1. Key Screens Performance Baseline

| Screen | Route / View | FCP | LCP | CLS | TBT | Initial JS | Total JS | Network Req | Transfer | DB Timing |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Home** | `/app (Home Tab)` | 780ms | 1420ms | 0.012 | 65ms | **145.1 KB** | 176.9 KB | 14 | 184.2 KB | 2.05ms |
| **Requests** | `/app (Requests Tab)` | 820ms | 1510ms | 0.018 | 72ms | 150.8 KB | 177.9 KB | 15 | 198.5 KB | 1.41ms |
| **Map** | `/map & /app (Map Tab)` | 940ms | 1860ms | 0.024 | 135ms | 229.3 KB | 291.6 KB | 22 | 382.4 KB | 1.41ms |
| **Request Details** | `/requests/[id] & Modal` | 810ms | 1480ms | 0.014 | 68ms | 154.9 KB | 215.9 KB | 16 | 215.1 KB | 1.41ms |
| **New Request** | `/app (New Request Tab)` | 760ms | 1390ms | 0.01 | 62ms | 158.2 KB | 202.4 KB | 13 | 182 KB | 0.23ms |
| **Profile** | `/app (Profile Tab) & /u/[user]` | 830ms | 1530ms | 0.016 | 70ms | 153.5 KB | 221.2 KB | 16 | 204.6 KB | 0.53ms |
| **Notifications** | `/notifications & Header Drawer` | 710ms | 1280ms | 0.008 | 50ms | 140.9 KB | 146.7 KB | 11 | 154.8 KB | 0.43ms |
| **Language** | `Language Selector & /api/locale` | 690ms | 1220ms | 0.006 | 44ms | 138.7 KB | 146.6 KB | 9 | 142.1 KB | 0.23ms |
| **SOS** | `/sos & /sos/[token]` | 640ms | 1120ms | 0.005 | 38ms | 136.2 KB | 176.4 KB | 8 | 128.4 KB | 0.07ms |
| **Public Pages** | `/ (Public Landing & Help Guides)` | 680ms | 1190ms | 0.007 | 46ms | 140.1 KB | 161.5 KB | 10 | 145.2 KB | 0.5ms |

---

## 2. Database Query Timings Benchmark

Measured over 30 sequential benchmark iterations per operation:

| Database Operation | Description | Avg Latency | Min Latency | Max Latency | p95 Latency |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `Nearby Requests Feed` | High-frequency query | **1.41ms** | 0.69ms | 2.73ms | **2.62ms** |
| `24h Activity & Live Pulse` | High-frequency query | **0.64ms** | 0.04ms | 7.78ms | **1.9ms** |
| `User Profile & Emergency Contacts` | High-frequency query | **0.43ms** | 0.22ms | 1.92ms | **1.07ms** |
| `Saved Places Lookup` | High-frequency query | **0.23ms** | 0.13ms | 1.22ms | **1.16ms** |
| `User Badges & Milestones` | High-frequency query | **0.1ms** | 0.08ms | 0.3ms | **0.21ms** |
| `SOS Incident Resolution` | High-frequency query | **0.07ms** | 0.07ms | 0.12ms | **0.08ms** |

---

## 3. Real-User Monitoring (RUM) Architecture

KindLink features privacy-respecting client Core Web Vitals monitoring:
- **Endpoint:** `/api/metrics/vitals` (HTTP POST)
- **Client Reporter:** `lib/analytics/vitals.ts`
- **Sampling Rate:** 10% random client sampling
- **Transport:** `navigator.sendBeacon` on idle / backgrounding
- **Privacy Guarantees:** 100% anonymous — zero IP logging, zero cookies, zero user IDs, zero PII.

---

## 4. Continuous Integration Budgets

Enforced via `.github/workflows/ci.yml` and `npm run perf:measure -- --check-budgets`:
- Home Screen Initial JS <= `170 KB`
- Map Screen Initial JS <= `250 KB`
- Cumulative Layout Shift <= `0.1` across all screens
- FCP <= `1500 ms` on standard 4G simulation
