'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import {
  MaplibreGLLayer,
  maplibreGLLayer,
  isWebGLSupported,
} from './leaflet-maplibre-layer';

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
  /**
   * Base map style requested:
   * - 'auto': follows Next.js theme (light in light mode, dark in dark mode)
   * - 'light': OpenFreeMap Liberty style
   * - 'dark': OpenFreeMap Dark style
   * - 'satellite': MapTiler Satellite (only if MapTiler API key is present)
   * - 'outdoor': MapTiler Outdoor (only if MapTiler API key is present)
   */
  baseMapMode?: 'auto' | 'light' | 'dark' | 'satellite' | 'outdoor';
  /**
   * Callback fired when the first tile/style renders, with latency in ms.
   */
  onTimeToFirstTile?: (latencyMs: number) => void;
}

export type ActiveTileProvider = 'openfreemap' | 'maptiler' | 'carto' | 'osm' | 'none';

interface MapRuntimeConfig {
  provider?: string;
  openfreemap?: {
    lightStyle?: string;
    darkStyle?: string;
    brightStyle?: string;
    positronStyle?: string;
  };
  maptilerApiKey?: string | null;
  key?: string | null;
  maptilerKey?: string | null;
  hasMaptiler?: boolean;
  styleLight?: string;
  styleDark?: string;
  bounds?: [[number, number], [number, number]];
  minZoom?: number;
  maxZoom?: number;
}

// ============================================================================
// Constants & Defaults
// ============================================================================
export const CIRCUIT_BREAKER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
export const PRIMARY_FAILOVER_TIMEOUT_MS = 4000; // 4-second failover chain timeout on desktop
export const MOBILE_FAILOVER_TIMEOUT_MS = 2500; // 2.5-second failover timeout on mobile / touch / constrained WebGL
const STORAGE_PREFIX = 'kindlink_map_circuit_';

/**
 * Detect mobile devices or touch screens where WebGL performance or slow network might cause hang
 */
export function isMobileOrTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const isTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const isSmallScreen = window.innerWidth <= 768;
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return isTouch || isSmallScreen || isMobileUa;
}

/**
 * Detects if WebGL context is constrained, software-emulated, or low-power
 */
export function isWebGLConstrained(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return true;
    const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbgRenderInfo) {
      const renderer = (gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
      if (/swiftshader|llvmpipe|software|mesa/i.test(renderer)) {
        return true;
      }
    }
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (typeof maxTextureSize === 'number' && maxTextureSize < 4096) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Checks for slow network conditions (2G/3G/Save-Data)
 */
export function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as any).connection;
  if (conn) {
    if (conn.saveData) return true;
    if (conn.effectiveType && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.effectiveType === '3g')) {
      return true;
    }
  }
  return false;
}

export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],
  [35.5, 97.5],
];

const DEFAULT_CONFIG: MapRuntimeConfig = {
  provider: 'openfreemap',
  openfreemap: {
    lightStyle: 'https://tiles.openfreemap.org/styles/liberty',
    darkStyle: 'https://tiles.openfreemap.org/styles/dark',
    brightStyle: 'https://tiles.openfreemap.org/styles/bright',
    positronStyle: 'https://tiles.openfreemap.org/styles/positron',
  },
  maptilerApiKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || null,
  hasMaptiler: Boolean(process.env.NEXT_PUBLIC_MAPTILER_API_KEY),
  styleLight: 'streets-v2',
  styleDark: 'dataviz-dark',
  bounds: INDIA_BOUNDS,
  minZoom: 4,
  maxZoom: 19,
};

// ============================================================================
// Shared Circuit Breaker (Module Scope)
// ============================================================================
class TileFailoverCircuitBreaker {
  private trippedProviders = new Set<string>();
  private trippedTimestamps = new Map<string, number>();
  private listeners = new Set<() => void>();
  private retryTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        ['openfreemap', 'maptiler', 'carto', 'osm'].forEach((p) => {
          const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${p}`);
          if (saved) {
            const timestamp = parseInt(saved, 10);
            const elapsed = Date.now() - timestamp;
            if (elapsed < CIRCUIT_BREAKER_COOLDOWN_MS) {
              this.trippedProviders.add(p);
              this.trippedTimestamps.set(p, timestamp);
              this.scheduleRetry(p, CIRCUIT_BREAKER_COOLDOWN_MS - elapsed);
            } else {
              sessionStorage.removeItem(`${STORAGE_PREFIX}${p}`);
            }
          }
        });
      } catch {
        // Ignore storage access restrictions
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isTripped(provider: string): boolean {
    return this.trippedProviders.has(provider);
  }

  public trip(provider: string, reason?: string): void {
    if (this.trippedProviders.has(provider)) return;
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[MapTileLayer] Provider '${provider}' tripped: ${reason || 'timeout / errors'}. Failing over.`
      );
    }
    this.trippedProviders.add(provider);
    const now = Date.now();
    this.trippedTimestamps.set(provider, now);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`${STORAGE_PREFIX}${provider}`, String(now));
      } catch {
        // Ignore storage error
      }
    }
    this.scheduleRetry(provider, CIRCUIT_BREAKER_COOLDOWN_MS);
    this.notify();
  }

  public resetAll(): void {
    this.trippedProviders.clear();
    this.trippedTimestamps.clear();
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.clear();
    if (typeof window !== 'undefined') {
      try {
        ['openfreemap', 'maptiler', 'carto', 'osm'].forEach((p) =>
          sessionStorage.removeItem(`${STORAGE_PREFIX}${p}`)
        );
      } catch {
        // Ignore storage error
      }
    }
    this.notify();
  }

  public reset(provider: string): void {
    this.trippedProviders.delete(provider);
    this.trippedTimestamps.delete(provider);
    const existing = this.retryTimers.get(provider);
    if (existing) {
      clearTimeout(existing);
      this.retryTimers.delete(provider);
    }
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
      } catch {
        // Ignore storage error
      }
    }
    this.notify();
  }

  private scheduleRetry(provider: string, delayMs: number): void {
    const existing = this.retryTimers.get(provider);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.reset(provider);
    }, delayMs);
    this.retryTimers.set(provider, timer);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const tileFailoverCircuitBreaker = new TileFailoverCircuitBreaker();

// ============================================================================
// Runtime Config Fetcher (Shared Singleton Promise)
// ============================================================================
let cachedConfigPromise: Promise<MapRuntimeConfig> | null = null;
let resolvedConfig: MapRuntimeConfig | null = null;

export function fetchMapRuntimeConfig(): Promise<MapRuntimeConfig> {
  if (typeof window === 'undefined') return Promise.resolve(DEFAULT_CONFIG);
  if (resolvedConfig) return Promise.resolve(resolvedConfig);
  if (cachedConfigPromise) return cachedConfigPromise;

  cachedConfigPromise = fetch('/api/maps/config')
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
// Main MapTileLayer Component
// ============================================================================
export function MapTileLayer({
  hasBottomNav = false,
  className = '',
  onFallbackChange,
  baseMapMode = 'auto',
  onTimeToFirstTile,
}: MapTileLayerProps) {
  const { resolvedTheme } = useTheme();
  const map = useMap();

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const glLayerRef = useRef<MaplibreGLLayer | null>(null);
  const activeProviderRef = useRef<ActiveTileProvider | null>(null);
  const mountTimeRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0
  );
  const firstTileReportedRef = useRef<boolean>(false);

  const [runtimeConfig, setRuntimeConfig] = useState<MapRuntimeConfig>(
    resolvedConfig || DEFAULT_CONFIG
  );
  const [, setCircuitVersion] = useState(0);
  const [firstTileLoaded, setFirstTileLoaded] = useState(false);

  const isDark =
    baseMapMode === 'dark'
      ? true
      : baseMapMode === 'light'
      ? false
      : resolvedTheme === 'dark';

  // 1. Fetch map runtime config on mount
  useEffect(() => {
    let mounted = true;
    fetchMapRuntimeConfig().then((cfg) => {
      if (mounted) setRuntimeConfig(cfg);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Subscribe to circuit breaker updates
  useEffect(() => {
    return tileFailoverCircuitBreaker.subscribe(() => {
      setCircuitVersion((v) => v + 1);
    });
  }, []);

  // 3. Resolve MapTiler API Key
  const maptilerApiKey = useMemo(() => {
    return (
      runtimeConfig.maptilerApiKey ||
      runtimeConfig.maptilerKey ||
      runtimeConfig.key ||
      process.env.NEXT_PUBLIC_MAPTILER_API_KEY ||
      ''
    ).trim();
  }, [runtimeConfig]);

  // 4. Cascade selection: OpenFreeMap -> MapTiler -> OSM -> None
  const webGLAvailable = useMemo(() => isWebGLSupported(), []);

  const activeProvider: ActiveTileProvider = useMemo(() => {
    // If user explicitly picked satellite or outdoor, use MapTiler if available
    if ((baseMapMode === 'satellite' || baseMapMode === 'outdoor') && maptilerApiKey) {
      if (!tileFailoverCircuitBreaker.isTripped('maptiler')) {
        return 'maptiler';
      }
    }

    // 1) Primary: OpenFreeMap (requires WebGL for vector tiles)
    if (webGLAvailable && !tileFailoverCircuitBreaker.isTripped('openfreemap')) {
      return 'openfreemap';
    }

    // 2) Secondary: MapTiler (only if API key is present)
    if (maptilerApiKey.length > 0 && !tileFailoverCircuitBreaker.isTripped('maptiler')) {
      return 'maptiler';
    }

    // 3) Tertiary: CartoDB Positron / Dark Matter (zero API key required)
    if (!tileFailoverCircuitBreaker.isTripped('carto')) {
      return 'carto';
    }

    // 4) Quaternary / Last Resort: OpenStreetMap Standard Raster
    if (!tileFailoverCircuitBreaker.isTripped('osm')) {
      return 'osm';
    }

    // 5) All failed
    return 'none';
  }, [baseMapMode, maptilerApiKey, webGLAvailable, setCircuitVersion]);

  const isFallback = activeProvider !== 'openfreemap';

  useEffect(() => {
    onFallbackChange?.(isFallback);
  }, [isFallback, onFallbackChange]);

  // Record time-to-first-tile
  const recordTileSuccess = useCallback(() => {
    if (!firstTileReportedRef.current) {
      firstTileReportedRef.current = true;
      const latency = Math.round(performance.now() - mountTimeRef.current);
      setFirstTileLoaded(true);
      if (typeof window !== 'undefined') {
        (window as any).__timeToFirstTile = latency;
      }
      onTimeToFirstTile?.(latency);
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[MapEngine] Time to first tile: ${latency}ms (provider: ${activeProvider})`);
      }
    } else {
      setFirstTileLoaded(true);
    }
  }, [activeProvider, onTimeToFirstTile]);

  // 5. Container ResizeObserver: Solves 0x0 size and sheet animation grey box
  useEffect(() => {
    if (!map) return;

    map.invalidateSize();

    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 150),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
    ];

    let observer: ResizeObserver | null = null;
    const container = map.getContainer();
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          map.invalidateSize();
          if (glLayerRef.current) {
            glLayerRef.current.getGLMap()?.resize();
          }
        }
      });
      observer.observe(container);
      if (container.parentElement) {
        observer.observe(container.parentElement);
      }
    }

    return () => {
      timers.forEach(clearTimeout);
      if (observer) observer.disconnect();
    };
  }, [map]);

  // 6. Configure map constraints: India bounds & zoom
  useEffect(() => {
    if (!map) return;
    const minZoom = runtimeConfig.minZoom ?? 4;
    const maxZoom = runtimeConfig.maxZoom ?? 19;
    map.setMinZoom(minZoom);
    map.setMaxZoom(maxZoom);

    const bounds = L.latLngBounds(runtimeConfig.bounds || INDIA_BOUNDS);
    map.setMaxBounds(bounds);
  }, [map, runtimeConfig.minZoom, runtimeConfig.maxZoom, runtimeConfig.bounds]);

  // 7. Hide default Leaflet attribution box
  useEffect(() => {
    if (map.attributionControl) {
      map.attributionControl.setPrefix(false);
      const container = map.attributionControl.getContainer();
      if (container) container.style.display = 'none';
    }
  }, [map]);

  // 8. OpenFreeMap Style Resolver
  const openFreeMapStyle = useMemo(() => {
    const ofm = runtimeConfig.openfreemap || DEFAULT_CONFIG.openfreemap!;
    if (isDark) {
      return ofm.darkStyle || 'https://tiles.openfreemap.org/styles/dark';
    }
    return ofm.lightStyle || 'https://tiles.openfreemap.org/styles/liberty';
  }, [isDark, runtimeConfig.openfreemap]);

  // 9. MapTiler URL Resolver
  const maptilerTileUrl = useMemo(() => {
    if (activeProvider !== 'maptiler') return '';
    let style = isDark ? runtimeConfig.styleDark || 'dataviz-dark' : runtimeConfig.styleLight || 'streets-v2';
    if (baseMapMode === 'satellite') style = 'satellite';
    if (baseMapMode === 'outdoor') style = 'outdoor';

    return `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}{r}.png?key=${maptilerApiKey}`;
  }, [activeProvider, isDark, runtimeConfig.styleDark, runtimeConfig.styleLight, baseMapMode, maptilerApiKey]);

  // Mobile/constrained WebGL detection for responsive failover
  const isConstrainedMobile = useMemo(() => {
    return isMobileOrTouchDevice() || isWebGLConstrained() || isSlowNetwork();
  }, []);

  const vectorFailoverTimeout = isConstrainedMobile
    ? MOBILE_FAILOVER_TIMEOUT_MS
    : PRIMARY_FAILOVER_TIMEOUT_MS;

  // 10. Failover Timer: 2.5s on mobile/touch/constrained WebGL, 4s on desktop
  useEffect(() => {
    if (activeProvider === 'openfreemap') {
      const timer = setTimeout(() => {
        if (!firstTileLoaded) {
          tileFailoverCircuitBreaker.trip(
            'openfreemap',
            isConstrainedMobile
              ? '2.5-second mobile/constrained vector tile load timeout elapsed'
              : '4-second tile load timeout elapsed'
          );
        }
      }, vectorFailoverTimeout);

      return () => clearTimeout(timer);
    }
  }, [activeProvider, firstTileLoaded, vectorFailoverTimeout, isConstrainedMobile]);

  // 11. Manage Map Layer Mounting & Failover Cascade
  useEffect(() => {
    if (!map) return;

    // A) In-place style update for OpenFreeMap when switching dark/light theme
    if (
      activeProvider === 'openfreemap' &&
      activeProviderRef.current === 'openfreemap' &&
      glLayerRef.current
    ) {
      try {
        glLayerRef.current.setStyle(openFreeMapStyle);
      } catch (err) {
        console.warn('[MapEngine] Style update failed, will rebuild:', err);
      }
      return;
    }

    // B) In-place URL update for CartoDB when switching dark/light theme
    if (
      activeProvider === 'carto' &&
      activeProviderRef.current === 'carto' &&
      tileLayerRef.current
    ) {
      const nextCartoUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current.setUrl(nextCartoUrl);
      return;
    }

    // C) In-place CSS filter update for OSM when switching dark/light theme
    if (
      activeProvider === 'osm' &&
      activeProviderRef.current === 'osm' &&
      tileLayerRef.current
    ) {
      const container = tileLayerRef.current.getContainer();
      if (container) {
        if (isDark) {
          container.style.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
          container.classList.add('osm-dark-tiles');
        } else {
          container.style.filter = '';
          container.classList.remove('osm-dark-tiles');
        }
      }
      return;
    }

    // Clean up previous layers on provider transition
    if (glLayerRef.current) {
      map.removeLayer(glLayerRef.current);
      glLayerRef.current = null;
    }
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    activeProviderRef.current = activeProvider;

    // A) OPENFREEMAP (Primary MapLibre Vector Bridge)
    if (activeProvider === 'openfreemap') {
      try {
        const glLayer = maplibreGLLayer({
          style: openFreeMapStyle,
          onTileLoaded: recordTileSuccess,
          onError: (err) => {
            console.warn('[MapEngine] OpenFreeMap error:', err);
            tileFailoverCircuitBreaker.trip('openfreemap', 'MapLibre style/tile error');
          },
        });
        if (glLayer && map) {
          glLayer.addTo(map);
          glLayerRef.current = glLayer;
        }
      } catch (err) {
        console.warn('[MapEngine] Failed to initialize OpenFreeMap layer:', err);
        tileFailoverCircuitBreaker.trip('openfreemap', 'Initialization failure');
      }
      return;
    }

    // Subclass TileLayer to enforce referrerPolicy="strict-origin-when-cross-origin"
    const ReferrerTileLayer = L.TileLayer.extend({
      createTile(coords: any, done: any) {
        const tile = (L.TileLayer.prototype as any).createTile.call(
          this,
          coords,
          done
        ) as HTMLImageElement;
        tile.referrerPolicy = 'strict-origin-when-cross-origin';
        return tile;
      },
    });

    // B) MAPTILER (Secondary)
    if (activeProvider === 'maptiler') {
      const layer = new (ReferrerTileLayer as any)(maptilerTileUrl, {
        tileSize: 512,
        zoomOffset: -1,
        detectRetina: true,
        minZoom: runtimeConfig.minZoom ?? 4,
        maxZoom: runtimeConfig.maxZoom ?? 19,
        bounds: L.latLngBounds(runtimeConfig.bounds || INDIA_BOUNDS),
        crossOrigin: true,
      });

      let errorCount = 0;
      layer.on('tileerror', (e: any) => {
        errorCount++;
        if (errorCount >= 2) {
          tileFailoverCircuitBreaker.trip('maptiler', 'Repeated tile errors (2+)');
        }
      });

      layer.on('tileload', recordTileSuccess);
      layer.addTo(map);
      tileLayerRef.current = layer;
      return;
    }

    // C) CARTODB (Tertiary Clean Vector-Styled Raster Fallback)
    if (activeProvider === 'carto') {
      const cartoUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      const layer = new (ReferrerTileLayer as any)(cartoUrl, {
        subdomains: 'abcd',
        tileSize: 256,
        zoomOffset: 0,
        detectRetina: true,
        minZoom: runtimeConfig.minZoom ?? 4,
        maxZoom: runtimeConfig.maxZoom ?? 19,
        bounds: L.latLngBounds(runtimeConfig.bounds || INDIA_BOUNDS),
        crossOrigin: true,
      });

      let errorCount = 0;
      layer.on('tileerror', () => {
        errorCount++;
        if (errorCount >= 2) {
          tileFailoverCircuitBreaker.trip('carto', 'CartoDB tile server unreachable (2+ errors)');
        }
      });

      layer.on('tileload', recordTileSuccess);
      layer.addTo(map);
      tileLayerRef.current = layer;
      return;
    }

    // D) OPENSTREETMAP (Quaternary Last Resort)
    if (activeProvider === 'osm') {
      const osmUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      const layer = new (ReferrerTileLayer as any)(osmUrl, {
        tileSize: 256,
        zoomOffset: 0,
        detectRetina: false,
        minZoom: runtimeConfig.minZoom ?? 4,
        maxZoom: runtimeConfig.maxZoom ?? 19,
        bounds: L.latLngBounds(runtimeConfig.bounds || INDIA_BOUNDS),
        crossOrigin: true,
      });

      let errorCount = 0;
      layer.on('tileerror', () => {
        errorCount++;
        if (errorCount >= 2) {
          tileFailoverCircuitBreaker.trip('osm', 'OSM tile server unreachable (2+ errors)');
        }
      });

      layer.on('tileload', recordTileSuccess);
      layer.addTo(map);
      tileLayerRef.current = layer;

      // Apply CSS Dark Filter for OSM raster tiles in dark mode
      const container = layer.getContainer();
      if (container) {
        if (isDark) {
          container.style.filter = 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
          container.classList.add('osm-dark-tiles');
        } else {
          container.style.filter = '';
          container.classList.remove('osm-dark-tiles');
        }
      }
    }
  }, [
    map,
    activeProvider,
    openFreeMapStyle,
    maptilerTileUrl,
    isDark,
    recordTileSuccess,
    runtimeConfig.minZoom,
    runtimeConfig.maxZoom,
    runtimeConfig.bounds,
  ]);

  // Clean up layer on unmount
  useEffect(() => {
    return () => {
      if (glLayerRef.current && map) {
        map.removeLayer(glLayerRef.current);
        glLayerRef.current = null;
      }
      if (tileLayerRef.current && map) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };
  }, [map]);

  const handleRetryAll = () => {
    mountTimeRef.current = typeof performance !== 'undefined' ? performance.now() : 0;
    firstTileReportedRef.current = false;
    setFirstTileLoaded(false);
    tileFailoverCircuitBreaker.resetAll();
    map?.invalidateSize();
  };

  const centerLatLng = map?.getCenter() || { lat: 23.6889, lng: 86.9661 };
  const googleMapsFallbackUrl = `https://www.google.com/maps/@${centerLatLng.lat},${centerLatLng.lng},14z`;

  return (
    <>
      {/* Mandatory CSS fix for Tailwind raster tile squashing */}
      <style>{`
        .leaflet-container img.leaflet-tile,
        .leaflet-tile-pane img {
          max-width: none !important;
          max-height: none !important;
          width: auto;
          padding: 0 !important;
        }
      `}</style>

      {/* Loading Skeleton with Soft Shimmer (fades away smoothly on first tile load) */}
      {!firstTileLoaded && activeProvider !== 'none' && (
        <div
          className="absolute inset-0 z-[350] pointer-events-none map-skeleton-shimmer transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Unobtrusive "Refresh tiles" pill in the corner when tile loading is interrupted */}
      {activeProvider === 'none' && (
        <div className="absolute top-20 right-3 sm:top-4 sm:right-20 z-[450] pointer-events-auto animate-in fade-in duration-200">
          <button
            type="button"
            onClick={handleRetryAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md backdrop-blur-md transition-all active:scale-95"
            aria-label="Refresh map tiles"
          >
            <RefreshCw className="w-3.5 h-3.5 notranslate" />
            <span>Refresh tiles</span>
          </button>
        </div>
      )}

      {/* Subtle, Non-intrusive "Using backup map" Pill */}
      {isFallback && activeProvider !== 'none' && (
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
            <span>Using backup map ({activeProvider === 'maptiler' ? 'MapTiler' : activeProvider === 'carto' ? 'CartoDB' : 'OpenStreetMap'})</span>
          </div>
        </div>
      )}

      {/* Text Attribution & MapTiler Logo Bar (always visible above bottom nav/sheet) */}
      <div
        className={`absolute z-[400] pointer-events-none transition-all duration-300 left-2 right-2 flex items-center justify-between ${
          hasBottomNav
            ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] sm:bottom-2'
            : 'bottom-2'
        } ${className}`}
      >
        {/* MapTiler Logo (Mandatory when MapTiler is active) */}
        <div className="pointer-events-auto flex items-center">
          {activeProvider === 'maptiler' && (
            <a
              href="https://www.maptiler.com"
              target="_blank"
              rel="noopener noreferrer"
              title="MapTiler - Maps for developers"
              aria-label="MapTiler logo"
              className="opacity-90 hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-1.5 py-0.5 rounded-sm shadow-2xs inline-flex items-center"
            >
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
        <div className="pointer-events-auto bg-white/85 dark:bg-slate-950/85 backdrop-blur-xs px-2 py-0.5 rounded-sm text-[10px] text-slate-700 dark:text-slate-300 shadow-2xs select-none ml-auto">
          {activeProvider === 'openfreemap' ? (
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
              ,{' '}
              <a
                href="https://openfreemap.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-slate-800 dark:text-slate-200"
              >
                OpenFreeMap
              </a>
            </>
          ) : activeProvider === 'maptiler' ? (
            <>
              &copy;{' '}
              <a
                href="https://www.maptiler.com/copyright/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-slate-800 dark:text-slate-200"
              >
                MapTiler
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
          ) : activeProvider === 'carto' ? (
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
              , &copy;{' '}
              <a
                href="https://carto.com/attributions"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium text-slate-800 dark:text-slate-200"
              >
                CARTO
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
