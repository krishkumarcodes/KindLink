/**
 * KindLink Real-User Monitoring (RUM) Core Web Vitals Reporter
 *
 * Lightweight, privacy-first reporter that captures Core Web Vitals:
 * - LCP (Largest Contentful Paint)
 * - INP (Interaction to Next Paint)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 * - FCP (First Contentful Paint)
 *
 * Privacy Guarantees:
 * - 100% anonymous: No user ID, no IP address, no cookies, no PII.
 * - Strict 10% client-side sampling to preserve device bandwidth.
 * - Dispatched via navigator.sendBeacon during idle periods or pagehide.
 */

export type VitalMetricName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';
export type VitalRating = 'good' | 'needs-improvement' | 'poor';
export type DeviceClass = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface WebVitalMetric {
  name: VitalMetricName;
  value: number;
  rating: VitalRating;
  path: string;
  connection: string;
  deviceClass: DeviceClass;
  timestamp: number;
}

const SAMPLE_RATE = 0.1; // Sample 10% of page views
const VITALS_ENDPOINT = '/api/metrics/vitals';

function getDeviceClass(): DeviceClass {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getConnectionType(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const nav = navigator as unknown as { connection?: { effectiveType?: string } };
  return nav.connection?.effectiveType || 'unknown';
}

function getSanitizedPath(): string {
  if (typeof window === 'undefined') return '/';
  const pathname = window.location.pathname || '/';
  // Strip query parameters and hash, truncate to safe length
  return pathname.split('?')[0].split('#')[0].slice(0, 64) || '/';
}

function rateMetric(name: VitalMetricName, val: number): VitalRating {
  switch (name) {
    case 'LCP':
      return val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor';
    case 'INP':
      return val <= 200 ? 'good' : val <= 500 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return val <= 0.1 ? 'good' : val <= 0.25 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return val <= 800 ? 'good' : val <= 1800 ? 'needs-improvement' : 'poor';
    case 'FCP':
      return val <= 1800 ? 'good' : val <= 3000 ? 'needs-improvement' : 'poor';
    default:
      return 'good';
  }
}

// Internal metrics queue for idle-time batch dispatch
let metricsQueue: WebVitalMetric[] = [];
let dispatchScheduled = false;

function flushQueue() {
  if (metricsQueue.length === 0) return;
  const batch = [...metricsQueue];
  metricsQueue = [];
  dispatchScheduled = false;

  const payload = JSON.stringify(batch);

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon(VITALS_ENDPOINT, blob);
    if (sent) return;
  }

  if (typeof fetch === 'function') {
    fetch(VITALS_ENDPOINT, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Fail silently to never disrupt client experience
    });
  }
}

function scheduleFlush() {
  if (dispatchScheduled) return;
  dispatchScheduled = true;

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => flushQueue(), { timeout: 3000 });
  } else {
    setTimeout(flushQueue, 1500);
  }
}

export function reportWebVital(name: VitalMetricName, rawValue: number) {
  // Value formatting: CLS rounded to 3 decimals, timing metrics rounded to nearest ms
  const value = name === 'CLS' ? Math.round(rawValue * 1000) / 1000 : Math.round(rawValue);
  const metric: WebVitalMetric = {
    name,
    value,
    rating: rateMetric(name, value),
    path: getSanitizedPath(),
    connection: getConnectionType(),
    deviceClass: getDeviceClass(),
    timestamp: Date.now(),
  };

  metricsQueue.push(metric);
  scheduleFlush();
}

/**
 * Initializes privacy-respecting client-side Core Web Vitals collection.
 * Only activates for 10% sampled sessions.
 */
export function initWebVitals(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check 10% random sampling rate
  const isSampled = Math.random() < SAMPLE_RATE;
  if (!isSampled) {
    return () => {};
  }

  // 1. Navigation Timing (TTFB)
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      const ttfb = nav.responseStart - nav.requestStart;
      if (ttfb >= 0) {
        reportWebVital('TTFB', ttfb);
      }
    }
  } catch {}

  // 2. Paint Timing (FCP)
  let fcpObserver: PerformanceObserver | null = null;
  try {
    fcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          reportWebVital('FCP', entry.startTime);
          fcpObserver?.disconnect();
          break;
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {}

  // 3. Largest Contentful Paint (LCP)
  let lcpObserver: PerformanceObserver | null = null;
  let maxLcp = 0;
  try {
    lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      for (const entry of entries) {
        if (entry.startTime > maxLcp) {
          maxLcp = entry.startTime;
        }
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  // 4. Cumulative Layout Shift (CLS)
  let clsObserver: PerformanceObserver | null = null;
  let clsScore = 0;
  try {
    clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
        if (!entry.hadRecentInput && typeof entry.value === 'number') {
          clsScore += entry.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {}

  // 5. Interaction to Next Paint (INP)
  let inpObserver: PerformanceObserver | null = null;
  let maxInpDuration = 0;
  try {
    inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as (PerformanceEntry & { duration?: number })[]) {
        if (typeof entry.duration === 'number' && entry.duration > maxInpDuration) {
          maxInpDuration = entry.duration;
        }
      }
    });
    inpObserver.observe({ type: 'first-input', buffered: true });
  } catch {}

  // Flush remaining metrics when user navigates away or hides page
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      if (maxLcp > 0) reportWebVital('LCP', maxLcp);
      if (clsScore > 0) reportWebVital('CLS', clsScore);
      if (maxInpDuration > 0) reportWebVital('INP', maxInpDuration);
      flushQueue();
    }
  };

  const handlePageHide = () => {
    if (maxLcp > 0) reportWebVital('LCP', maxLcp);
    if (clsScore > 0) reportWebVital('CLS', clsScore);
    if (maxInpDuration > 0) reportWebVital('INP', maxInpDuration);
    flushQueue();
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);

  return () => {
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    fcpObserver?.disconnect();
    lcpObserver?.disconnect();
    clsObserver?.disconnect();
    inpObserver?.disconnect();
    flushQueue();
  };
}
