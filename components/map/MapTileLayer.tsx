'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';

export interface MapTileLayerProps {
  /**
   * If true, offsets bottom attribution and logo controls to ensure they are never
   * hidden or obstructed by the mobile bottom navigation tab bar or center '+' button.
   * Defaults to false.
   */
  hasBottomNav?: boolean;
  /**
   * Optional custom class name for attribution container.
   */
  className?: string;
  /**
   * Optional callback triggered when fallback status changes.
   */
  onFallbackChange?: (isFallback: boolean) => void;
}

interface MapRuntimeConfig {
  provider?: 'maptiler' | 'osm';
  maptilerApiKey?: string | null;
  key?: string | null;
  maptilerKey?: string | null;
  styleLight?: string;
  styleDark?: string;
  lightStyleId?: string;
  darkStyleId?: string;
  attribution?:
    | {
        maptiler?: string;
        osm?: string;
      }
    | string;
  bounds?: [[number, number], [number, number]];
  minZoom?: number;
  maxZoom?: number;
}

// ============================================================================
// Constants & Defaults
// ============================================================================
export const CIRCUIT_BREAKER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes (600,000 ms)
export const CONSECUTIVE_FAILURES_THRESHOLD = 3;
const SESSION_STORAGE_KEY = 'kindlink_maptiler_circuit_tripped';

export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0], // Southwest corner (Southern tip of India / Arabian Sea)
  [35.5, 97.5], // Northeast corner (Kashmir / Arunachal Pradesh border)
];

const DEFAULT_CONFIG: MapRuntimeConfig = {
  provider: process.env.NEXT_PUBLIC_MAPTILER_API_KEY ? 'maptiler' : 'osm',
  maptilerApiKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || null,
  styleLight: 'streets-v2',
  styleDark: 'dataviz-dark',
  bounds: INDIA_BOUNDS,
  minZoom: 4,
  maxZoom: 19,
};

// ============================================================================
// Shared Circuit Breaker (Module Scope)
// ============================================================================
class TileCircuitBreaker {
  private isTripped: boolean = false;
  private trippedAt: number = 0;
  private consecutiveFailures: number = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private listeners = new Set<(tripped: boolean) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const timestamp = parseInt(saved, 10);
          const elapsed = Date.now() - timestamp;
          if (elapsed < CIRCUIT_BREAKER_COOLDOWN_MS) {
            this.isTripped = true;
            this.trippedAt = timestamp;
            this.scheduleRetry(CIRCUIT_BREAKER_COOLDOWN_MS - elapsed);
          } else {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch {
        // Ignore storage access restrictions
      }
    }
  }

  public subscribe(listener: (tripped: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isTripped);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getIsTripped(): boolean {
    return this.isTripped;
  }

  public recordSuccess(): void {
    if (this.consecutiveFailures > 0) {
      this.consecutiveFailures = 0;
    }
    if (this.isTripped) {
      this.reset();
    }
  }

  public recordError(status?: number): void {
    // Immediate circuit breaker trip on HTTP 403 (Forbidden / Quota) or HTTP 429 (Rate Limited)
    if (status === 403 || status === 429) {
      this.trip(`HTTP ${status}`);
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
      this.trip(`Repeated tile errors (${this.consecutiveFailures} consecutive)`);
    }
  }

  public trip(reason?: string): void {
    if (this.isTripped) return;
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[MapTileLayer] MapTiler circuit breaker tripped: ${reason || 'tile loading errors'}. Switching to OpenStreetMap backup tiles for 10 minutes.`
      );
    }
    this.isTripped = true;
    this.trippedAt = Date.now();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, String(this.trippedAt));
      } catch {
        // Ignore storage error
      }
    }
    this.scheduleRetry(CIRCUIT_BREAKER_COOLDOWN_MS);
    this.notify();
  }

  private scheduleRetry(delayMs: number): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.retryTimer = setTimeout(() => {
      this.reset();
    }, delayMs);
  }

  public reset(): void {
    this.isTripped = false;
    this.trippedAt = 0;
    this.consecutiveFailures = 0;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // Ignore storage error
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        '[MapTileLayer] MapTiler 10-minute cooldown elapsed. Automatically retrying MapTiler primary tiles.'
      );
    }
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      listener(this.isTripped);
    });
  }
}

export const mapTileCircuitBreaker = new TileCircuitBreaker();

// ============================================================================
// Runtime Config Fetcher (Shared Singleton Promise)
// ============================================================================
let cachedConfigPromise: Promise<MapRuntimeConfig> | null = null;
let resolvedConfig: MapRuntimeConfig | null = null;

export function fetchMapRuntimeConfig(): Promise<MapRuntimeConfig> {
  if (resolvedConfig) return Promise.resolve(resolvedConfig);
  if (cachedConfigPromise) return cachedConfigPromise;

  cachedConfigPromise = fetch('/api/maps/config')
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as MapRuntimeConfig;
      resolvedConfig = data;
      return data;
    })
    .catch(() => {
      resolvedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    });

  return cachedConfigPromise;
}

// ============================================================================
// MapTileLayer Component
// ============================================================================
export function MapTileLayer({
  hasBottomNav = false,
  className = '',
  onFallbackChange,
}: MapTileLayerProps) {
  const { resolvedTheme } = useTheme();
  const map = useMap();
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const activeProviderRef = useRef<'maptiler' | 'osm' | null>(null);

  const [runtimeConfig, setRuntimeConfig] = useState<MapRuntimeConfig>(
    resolvedConfig || DEFAULT_CONFIG
  );
  const [isCircuitTripped, setIsCircuitTripped] = useState<boolean>(() =>
    mapTileCircuitBreaker.getIsTripped()
  );

  const isDark = resolvedTheme === 'dark';

  // 1. Fetch runtime map config on mount
  useEffect(() => {
    let mounted = true;
    fetchMapRuntimeConfig().then((cfg) => {
      if (mounted) {
        setRuntimeConfig(cfg);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Subscribe to shared circuit breaker state
  useEffect(() => {
    const unsubscribe = mapTileCircuitBreaker.subscribe((tripped) => {
      setIsCircuitTripped(tripped);
    });
    return unsubscribe;
  }, []);

  // 3. Determine active provider & API key
  const apiKey = useMemo(() => {
    return (
      runtimeConfig.maptilerApiKey ||
      runtimeConfig.maptilerKey ||
      runtimeConfig.key ||
      process.env.NEXT_PUBLIC_MAPTILER_API_KEY ||
      ''
    ).trim();
  }, [runtimeConfig]);

  const hasApiKey = apiKey.length > 0;
  const isFallback = !hasApiKey || isCircuitTripped;
  const currentProvider = isFallback ? 'osm' : 'maptiler';

  // Notify parent component if callback provided
  useEffect(() => {
    onFallbackChange?.(isFallback);
  }, [isFallback, onFallbackChange]);

  // 4. Configure map constraints: clamp zoom and set India bounds
  useEffect(() => {
    if (!map) return;
    const minZoom = runtimeConfig.minZoom ?? 4;
    const maxZoom = runtimeConfig.maxZoom ?? 19;
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);

    const bounds = L.latLngBounds(runtimeConfig.bounds || INDIA_BOUNDS);
    map.setMaxBounds(bounds);
  }, [map, runtimeConfig.minZoom, runtimeConfig.maxZoom, runtimeConfig.bounds]);

  // 5. Hide default Leaflet attribution box to avoid duplicate text
  useEffect(() => {
    if (map.attributionControl) {
      map.attributionControl.setPrefix(false);
      const container = map.attributionControl.getContainer();
      if (container) {
        container.style.display = 'none';
      }
    }
  }, [map]);

  // 6. Compute Tile URL and parameters
  const lightStyle =
    runtimeConfig.styleLight || runtimeConfig.lightStyleId || 'streets-v2';
  const darkStyle =
    runtimeConfig.styleDark || runtimeConfig.darkStyleId || 'dataviz-dark';
  const selectedStyle = isDark ? darkStyle : lightStyle;

  const tileUrl = useMemo(() => {
    if (currentProvider === 'maptiler') {
      return `https://api.maptiler.com/maps/${selectedStyle}/{z}/{x}/{y}{r}.png?key=${apiKey}`;
    }
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  }, [currentProvider, selectedStyle, apiKey]);

  // 7. Manage Leaflet TileLayer lifecycle and CSS dark filter
  useEffect(() => {
    if (!map) return;

    const isMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0);

    const indiaLatLngBounds = L.latLngBounds(
      runtimeConfig.bounds || INDIA_BOUNDS
    );

    const attributionText =
      currentProvider === 'maptiler'
        ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

    const providerChanged = activeProviderRef.current !== currentProvider;

    // If provider changed (e.g. MapTiler 512px <-> OSM 256px), recreate layer to respect correct tileSize & zoomOffset
    if (!tileLayerRef.current || providerChanged) {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      const options: L.TileLayerOptions =
        currentProvider === 'maptiler'
          ? {
              tileSize: 512,
              zoomOffset: -1,
              detectRetina: true,
              minZoom: runtimeConfig.minZoom ?? 4,
              maxZoom: runtimeConfig.maxZoom ?? 19,
              bounds: indiaLatLngBounds,
              keepBuffer: isMobile ? 1 : 2,
              updateWhenIdle: true,
              crossOrigin: true,
              attribution: attributionText,
            }
          : {
              tileSize: 256,
              zoomOffset: 0,
              detectRetina: false,
              minZoom: runtimeConfig.minZoom ?? 4,
              maxZoom: runtimeConfig.maxZoom ?? 19,
              bounds: indiaLatLngBounds,
              keepBuffer: isMobile ? 1 : 2,
              updateWhenIdle: true,
              attribution: attributionText,
            };

      const newLayer = L.tileLayer(tileUrl, options);

      // Listen for tile errors
      newLayer.on('tileerror', (e: L.TileErrorEvent) => {
        if (currentProvider !== 'maptiler') return;

        const tileImg = e.tile as HTMLImageElement | undefined;
        const failedSrc = tileImg?.src || tileUrl;

        // Perform lightweight HEAD probe to detect HTTP 403 or 429
        if (
          typeof window !== 'undefined' &&
          typeof window.fetch === 'function' &&
          failedSrc
        ) {
          fetch(failedSrc, { method: 'HEAD' })
            .then((res) => {
              if (res.status === 403 || res.status === 429) {
                mapTileCircuitBreaker.recordError(res.status);
              } else {
                mapTileCircuitBreaker.recordError();
              }
            })
            .catch(() => {
              mapTileCircuitBreaker.recordError();
            });
        } else {
          mapTileCircuitBreaker.recordError();
        }
      });

      // Reset failure counter on successful tile load
      newLayer.on('tileload', () => {
        if (currentProvider === 'maptiler') {
          mapTileCircuitBreaker.recordSuccess();
        }
      });

      newLayer.addTo(map);
      tileLayerRef.current = newLayer;
      activeProviderRef.current = currentProvider;
    } else {
      // Same provider: update URL smoothly (e.g. style change in MapTiler)
      tileLayerRef.current.setUrl(tileUrl);
    }

    // Apply CSS Dark Filter for OSM tiles in dark mode
    const container = tileLayerRef.current.getContainer();
    if (container) {
      if (currentProvider === 'osm' && isDark) {
        container.style.filter =
          'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
        container.classList.add('osm-dark-tiles');
      } else {
        container.style.filter = '';
        container.classList.remove('osm-dark-tiles');
      }
    }
  }, [
    map,
    currentProvider,
    tileUrl,
    isDark,
    runtimeConfig.minZoom,
    runtimeConfig.maxZoom,
    runtimeConfig.bounds,
  ]);

  // Clean up layer on unmount
  useEffect(() => {
    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
        activeProviderRef.current = null;
      }
    };
  }, [map]);

  return (
    <>
      {/* Subtle, Non-intrusive "Using backup map" Pill */}
      {isFallback && (
        <div
          className={`absolute z-[400] pointer-events-auto transition-all duration-300 left-2.5 ${
            hasBottomNav
              ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+104px)] sm:bottom-8'
              : 'bottom-8'
          }`}
        >
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/35 backdrop-blur-md shadow-xs select-none"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Using backup map</span>
          </div>
        </div>
      )}

      {/* Attribution & MapTiler Logo Bar */}
      <div
        className={`absolute z-[400] pointer-events-none transition-all duration-300 left-2 right-2 flex items-center justify-between ${
          hasBottomNav
            ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] sm:bottom-1.5'
            : 'bottom-1.5'
        } ${className}`}
      >
        {/* MapTiler Logo (Mandatory for Free Tier when MapTiler is active) */}
        <div className="pointer-events-auto flex items-center">
          {!isFallback && (
            <a
              href="https://www.maptiler.com"
              target="_blank"
              rel="noopener noreferrer"
              title="MapTiler - Maps for developers"
              aria-label="MapTiler logo"
              className="opacity-90 hover:opacity-100 transition-opacity bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs px-1.5 py-0.5 rounded-sm shadow-2xs inline-flex items-center"
            >
              {/* Remote official MapTiler SVG with inline fallback text if offline */}
              <img
                src="https://api.maptiler.com/resources/logo.svg"
                alt="MapTiler logo"
                className="h-4 sm:h-5 w-auto"
                loading="lazy"
              />
            </a>
          )}
        </div>

        {/* Text Attribution */}
        <div className="pointer-events-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded-sm text-[10px] text-slate-700 dark:text-slate-300 shadow-2xs select-none">
          {!isFallback ? (
            <>
              <a
                href="https://www.maptiler.com/copyright/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-slate-800 dark:text-slate-200"
              >
                &copy; MapTiler
              </a>{' '}
              &copy;{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-slate-800 dark:text-slate-200"
              >
                OpenStreetMap contributors
              </a>
            </>
          ) : (
            <>
              &copy;{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-slate-800 dark:text-slate-200"
              >
                OpenStreetMap contributors
              </a>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default MapTileLayer;
