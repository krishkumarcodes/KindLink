'use client';

import { useState, useEffect } from 'react';

export interface DeviceCapability {
  isLowEnd: boolean;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  saveData: boolean;
  isSlowConnection: boolean;
  prefersReducedMotion: boolean;
  maxPinsLimit: number;
}

const LOW_END_PIN_LIMIT = 25;
const NORMAL_PIN_LIMIT = 100;

interface NetworkInformation extends EventTarget {
  saveData?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
}

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

/**
 * Detects device hardware and network capabilities.
 * Flags low-end mode automatically and silently when:
 * - navigator.deviceMemory <= 2 (2GB RAM or lower)
 * - navigator.hardwareConcurrency <= 4 (4 CPU cores or lower)
 * - navigator.connection.saveData === true (Data Saver enabled)
 * - slow connection (slow-2g, 2g, or 3g)
 *
 * Normal smartphones with modern multi-core chips, >2GB RAM, and 4G/WiFi
 * remain in high-fidelity mode.
 */
export function detectDeviceCapability(): DeviceCapability {
  if (typeof window === 'undefined') {
    return {
      isLowEnd: false,
      deviceMemory: null,
      hardwareConcurrency: null,
      saveData: false,
      isSlowConnection: false,
      prefersReducedMotion: false,
      maxPinsLimit: NORMAL_PIN_LIMIT,
    };
  }

  const nav = navigator as ExtendedNavigator;

  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const concurrency = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;

  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const effectiveType = connection?.effectiveType || '';
  const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

  // System & manual reduced motion check
  const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const systemReducedMotion = Boolean(mql && mql.matches);
  let manualReducedMotion = false;
  try {
    manualReducedMotion = localStorage.getItem('kindlink_reduce_motion') === 'true';
  } catch {
    manualReducedMotion = false;
  }
  const prefersReducedMotion = systemReducedMotion || manualReducedMotion;

  // Low-end determination:
  // Triggered only on constrained memory, low CPU cores, active Data Saver, or slow 2G/3G link
  const hasLowMemory = memory !== null && memory <= 2;
  const hasLowCpu = concurrency !== null && concurrency <= 4;
  const isLowEnd = hasLowMemory || hasLowCpu || saveData || isSlowConnection;

  return {
    isLowEnd,
    deviceMemory: memory,
    hardwareConcurrency: concurrency,
    saveData,
    isSlowConnection,
    prefersReducedMotion,
    maxPinsLimit: isLowEnd ? LOW_END_PIN_LIMIT : NORMAL_PIN_LIMIT,
  };
}

/**
 * Synchronizes low-end and motion attributes to documentElement so CSS rules
 * can neutralize expensive filters and glows instantly without layout thrashing.
 */
export function applyDeviceCapabilityToDom(cap?: DeviceCapability): DeviceCapability {
  const capability = cap || detectDeviceCapability();

  if (typeof document !== 'undefined') {
    const root = document.documentElement;

    if (capability.isLowEnd) {
      root.setAttribute('data-low-end', 'true');
      root.classList.add('low-end-device');
    } else {
      root.removeAttribute('data-low-end');
      root.classList.remove('low-end-device');
    }

    if (capability.prefersReducedMotion) {
      root.setAttribute('data-reduce-motion', 'true');
    }
  }

  return capability;
}

/**
 * Initializes device capability detection on app mount.
 */
export function initializeDeviceCapability(): DeviceCapability {
  const cap = applyDeviceCapabilityToDom();

  if (typeof window !== 'undefined') {
    // Listen for connection changes (e.g. user toggles Data Saver or drops to 2G)
    const nav = navigator as ExtendedNavigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', () => {
        applyDeviceCapabilityToDom();
      });
    }

    // Listen for system reduced motion change
    const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mql && typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', () => {
        applyDeviceCapabilityToDom();
      });
    }
  }

  return cap;
}

/**
 * Helper to check if current device is in low-end mode.
 */
export function isLowEndDevice(): boolean {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('low-end-device');
  }
  return detectDeviceCapability().isLowEnd;
}

/**
 * React hook to reactively consume device capability in components (e.g. map pins, animations).
 */
export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>(() => detectDeviceCapability());

  useEffect(() => {
    const cap = applyDeviceCapabilityToDom();
    setCapability(cap);

    const nav = navigator as ExtendedNavigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const handleUpdate = () => {
      setCapability(applyDeviceCapabilityToDom());
    };

    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', handleUpdate);
    }

    const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mql && typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleUpdate);
    }

    return () => {
      if (connection && typeof connection.removeEventListener === 'function') {
        connection.removeEventListener('change', handleUpdate);
      }
      if (mql && typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', handleUpdate);
      }
    };
  }, []);

  return capability;
}
