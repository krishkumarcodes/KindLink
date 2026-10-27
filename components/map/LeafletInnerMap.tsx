'use client';

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { MapTileLayer } from './MapTileLayer';
import { HelpRequest, UserProfile } from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { MedicalFacility, MedicalAmenityType } from '@/lib/geo/hospitals';
import { RoadRouteResult } from '@/lib/geo/osrm';

// Interop with Supercluster constructor across ESM/CJS bundles
const SuperclusterConstructor = ((Supercluster as any)?.default || Supercluster) as typeof Supercluster;

export interface MapLayersState {
  requests: boolean;
  hospitals: boolean;
  clinics?: boolean;
  pharmacies: boolean;
  bloodBanks: boolean;
}

export type MapUnifiedItem =
  | { kind: 'request'; data: HelpRequest; position: [number, number] }
  | { kind: 'facility'; data: MedicalFacility; position: [number, number] };

interface LeafletInnerMapProps {
  center: [number, number];
  zoom: number;
  requests: HelpRequest[];
  radiusMeters: number;
  selectedRequest: HelpRequest | null;
  selectedFacility?: MedicalFacility | null;
  onSelectRequest: (req: HelpRequest) => void;
  onSelectFacility?: (fac: MedicalFacility) => void;
  draggableMode?: boolean;
  draggablePosition?: [number, number];
  onDraggablePositionChange?: (pos: [number, number]) => void;
  medicalFacilities?: MedicalFacility[];
  layers?: MapLayersState;
  activeRoute?: RoadRouteResult | null;
  transportTripRoute?: RoadRouteResult | null;
  userProfile?: UserProfile | null;
  baseMapMode?: 'auto' | 'light' | 'dark' | 'satellite' | 'outdoor';
  onTimeToFirstTile?: (latencyMs: number) => void;
  userHeading?: number | null;
  userAccuracyMeters?: number;
  bottomSheetSnap?: 'peek' | 'half' | 'full';
  onViewportBoundsChange?: (bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => void;
}

/**
 * Controller component to smoothly pan and call map.invalidateSize()
 */
function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    // Multi-stage timers ensure map size invalidates properly across mobile safe-area / layout transitions
    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 150),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
      setTimeout(() => map.invalidateSize(), 1200),
    ];

    let observer: ResizeObserver | null = null;
    const container = map.getContainer();
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          map.invalidateSize();
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

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  return null;
}

/**
 * Auto-fits map bounds when an active road route is calculated
 */
function RouteBoundsController({
  activeRoute,
  transportTripRoute,
}: {
  activeRoute?: RoadRouteResult | null;
  transportTripRoute?: RoadRouteResult | null;
}) {
  const map = useMap();

  useEffect(() => {
    const route = transportTripRoute || activeRoute;
    if (route && route.coordinates && route.coordinates.length > 1) {
      try {
        const bounds = L.latLngBounds(route.coordinates);
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 16,
          animate: true,
        });
      } catch {
        // Ignore bounds error
      }
    }
  }, [map, activeRoute, transportTripRoute]);

  return null;
}

/**
 * Smoothly eases map into view with padding when a pin is selected,
 * guaranteeing the pin is never obscured by the mobile bottom sheet or desktop sidebar.
 */
function SelectedPinCameraController({
  selectedCoords,
  bottomSheetSnap,
}: {
  selectedCoords: [number, number] | null;
  bottomSheetSnap?: 'peek' | 'half' | 'full';
}) {
  const map = useMap();
  const lastAnimatedPosRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedCoords) {
      lastAnimatedPosRef.current = null;
      return;
    }

    const key = `${selectedCoords[0].toFixed(5)},${selectedCoords[1].toFixed(5)}-${bottomSheetSnap}`;
    if (lastAnimatedPosRef.current === key) return;
    lastAnimatedPosRef.current = key;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    let targetOffsetX = 0;
    let targetOffsetY = 0;

    if (isMobile) {
      // On mobile: bottom sheet covers the lower portion of the screen
      // If half: ~46vh + 64px tab bar.
      // If peek: ~88px + 64px tab bar.
      const sheetHeight =
        bottomSheetSnap === 'half'
          ? size.y * 0.46 + 64
          : bottomSheetSnap === 'full'
          ? size.y * 0.52
          : 152;
      const visibleCenterY = (size.y - sheetHeight) / 2;
      const actualCenterY = size.y / 2;
      targetOffsetY = actualCenterY - visibleCenterY;
    } else {
      // On desktop: left panel is 380px wide
      const panelWidth = 380;
      const visibleCenterX = panelWidth + (size.x - panelWidth) / 2;
      const actualCenterX = size.x / 2;
      targetOffsetX = actualCenterX - visibleCenterX;
    }

    try {
      const targetPoint = map.project(selectedCoords, map.getZoom());
      const adjustedPoint = L.point(targetPoint.x - targetOffsetX, targetPoint.y + targetOffsetY);
      const adjustedLatLng = map.unproject(adjustedPoint, map.getZoom());

      map.panTo(adjustedLatLng, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    } catch {
      // Ignore pan error
    }
  }, [selectedCoords, bottomSheetSnap, map]);

  return null;
}

/**
 * Privacy guarantee: For unverified requesters, apply deterministic jitter
 * (~200m offset) so that their exact coordinates are not exposed publicly.
 */
export function getPrivacyPreservingCoords(req: HelpRequest): [number, number] {
  if (req.verified) {
    return [req.latitude, req.longitude];
  }

  let hash = 0;
  for (let i = 0; i < req.id.length; i++) {
    hash = (hash << 5) - hash + req.id.charCodeAt(i);
    hash |= 0;
  }
  const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
  const offsetRadius = 0.0022; // ~240 meters
  const latOffset = Math.sin(angle) * offsetRadius;
  const lngOffset = Math.cos(angle) * offsetRadius;

  return [req.latitude + latOffset, req.longitude + lngOffset];
}

/**
 * Returns Category SVG icon path for request teardrop pin
 */
function getCategoryIconSvg(category?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('blood')) {
    return `<path d="M18 10a4 4 0 0 0 4 4c0 1.2-.5 2.2-1.6 3A3.9 3.9 0 0 1 18 18a3.9 3.9 0 0 1-2.4-1c-1.1-.8-1.6-1.8-1.6-3a4 4 0 0 0 4-4z" fill="#FFFFFF"/>`;
  }
  if (cat.includes('medic') || cat.includes('pharm') || cat.includes('health') || cat.includes('hospital')) {
    return `<path d="M18 10v12M12 16h12" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  if (cat.includes('food') || cat.includes('grocer') || cat.includes('meal')) {
    return `<path d="M13 13h10v7a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-7zm2-3a3 3 0 0 1 6 0v3h-6v-3z" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  }
  if (cat.includes('shelter') || cat.includes('disaster') || cat.includes('flood') || cat.includes('repair')) {
    return `<path d="M12 15 18 10l6 5v6a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-6z" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  }
  if (cat.includes('transit') || cat.includes('transport') || cat.includes('ride')) {
    return `<path d="M12 17h12M13 13l2-3h6l2 3M14 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  }
  if (cat.includes('book') || cat.includes('study') || cat.includes('edu')) {
    return `<path d="M12 11 18 8l6 3-6 3-6-3zm0 4 6 3 6-3" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  }
  if (cat.includes('elder') || cat.includes('companion') || cat.includes('care')) {
    return `<circle cx="18" cy="12" r="3" stroke="#FFFFFF" stroke-width="2" fill="none"/><path d="M13 21v-2a5 5 0 0 1 10 0v2" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  }
  // Default aid heart icon
  return `<path d="M18 11.5a3 3 0 0 0-4.2 0 3 3 0 0 0 0 4.2l4.2 4.3 4.2-4.3a3 3 0 0 0 0-4.2 3 3 0 0 0-4.2 0z" fill="#FFFFFF"/>`;
}

/**
 * High-contrast category colors matching design system
 */
function getCategoryPinColor(category?: string, urgency?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('blood')) return '#DC2626'; // Red
  if (cat.includes('food')) return '#059669'; // Emerald
  if (cat.includes('medic') || cat.includes('health') || cat.includes('hospital')) return '#2563EB'; // Blue
  if (cat.includes('shelter') || cat.includes('disaster')) return '#D97706'; // Amber
  if (cat.includes('book') || cat.includes('study') || cat.includes('edu')) return '#7C3AED'; // Violet
  if (cat.includes('transit') || cat.includes('transport')) return '#F59E0B'; // Amber
  if (cat.includes('elder') || cat.includes('companion')) return '#0284C7'; // Sky
  if (cat.includes('repair')) return '#EA580C'; // Orange
  if (cat.includes('clothes')) return '#0D9488'; // Teal

  if (urgency === 'critical') return '#DC2626';
  if (urgency === 'high') return '#EA580C';
  if (urgency === 'medium') return '#D97706';
  return '#0D9488';
}

/**
 * Crisp SVG Teardrop Request Pin:
 * - Category color + icon inside
 * - Crisp white outline (2.5px / 3.5px when selected)
 * - Critical requests get soft pulsing beacon (respects reduced motion)
 * - Selected state scales up and adds an outer cyan-teal highlight ring
 * - User's own request pin has distinct marker (#4F46E5) with 'YOU' badge and star icon
 */
function createRequestMarkerIcon(req: HelpRequest, isSelected: boolean, isOwner: boolean) {
  const color = isOwner ? '#4F46E5' : getCategoryPinColor(req.category, req.urgency);
  const isCritical = req.urgency === 'critical';
  const width = isSelected ? 46 : 36;
  const height = isSelected ? 58 : 46;

  // Soft pulse beacon for Critical requests (respects reduced motion)
  const pulseHtml =
    isCritical && !isOwner
      ? `<span class="kindlink-pin-pulse" aria-hidden="true" style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); width: 28px; height: 28px; border-radius: 50%; background: rgba(220, 38, 38, 0.45); pointer-events: none;"></span>`
      : '';

  // Selected state: Glowing outer highlight ring
  const highlightRing = isSelected
    ? `<span class="pin-selected-ring" aria-hidden="true" style="position: absolute; top: 38%; left: 50%; transform: translate(-50%, -50%); width: ${width + 16}px; height: ${width + 16}px; border-radius: 50%; border: 3px solid #0D9488; box-shadow: 0 0 16px rgba(13,148,136,0.65); pointer-events: none; z-index: 1;"></span>`
    : '';

  const ownerBadge = isOwner
    ? `<div style="position: absolute; top: -6px; right: -6px; background: #4F46E5; color: #FFF; font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 6px; border: 1.5px solid #FFF; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 4;">YOU</div>`
    : '';

  const svgIcon = isOwner
    ? `<path d="M18 9.5l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="#FFFFFF"/>`
    : getCategoryIconSvg(req.category);

  const html = `
    <div style="position: relative; width: ${width}px; height: ${height}px; transform: translate(-50%, -100%); cursor: pointer; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.38)); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
      ${pulseHtml}
      ${highlightRing}
      ${ownerBadge}
      <svg width="${width}" height="${height}" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; position: relative; z-index: 2;">
        <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="${isSelected ? 3.5 : 2.5}"/>
        <circle cx="18" cy="18" r="11" fill="rgba(255,255,255,0.2)"/>
        ${svgIcon}
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: `custom-request-pin ${isSelected ? 'pin-selected' : ''}`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
  });
}

/**
 * Distinct facility pins:
 * - Hospital: Red (#DC2626) with cross
 * - Clinic: Blue (#2563EB) with stethoscope
 * - Pharmacy: Emerald (#059669) with pill
 * - Blood bank: Crimson (#991B1B) with blood drop
 * - Selected state: grows and adds outer cyan-teal highlight ring
 */
function createMedicalMarkerIcon(type: MedicalAmenityType, isSelected: boolean = false) {
  let bg = '#DC2626'; // hospital (red)
  let svgIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

  if (type === 'clinic') {
    bg = '#2563EB'; // blue stethoscope
    svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`;
  } else if (type === 'pharmacy') {
    bg = '#059669'; // emerald pill
    svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`;
  } else if (type === 'blood_bank') {
    bg = '#991B1B'; // crimson blood drop
    svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`;
  }

  const size = isSelected ? 44 : 36;
  const highlightRing = isSelected
    ? `<span class="pin-selected-ring" aria-hidden="true" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${size + 14}px; height: ${size + 14}px; border-radius: 50%; border: 3px solid #0D9488; box-shadow: 0 0 14px rgba(13,148,136,0.65); pointer-events: none; z-index: 1;"></span>`
    : '';

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-50%, -50%); cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
      ${highlightRing}
      <div style="
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: ${bg};
        border: ${isSelected ? '3.5px' : '2.5px'} solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      ">
        ${svgIcon}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: `custom-facility-${type} ${isSelected ? 'pin-selected' : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * User location: Blue dot with heading arrow and accuracy circle
 */
function createUserMarkerIcon(heading?: number | null) {
  const hasHeading = typeof heading === 'number' && !isNaN(heading);
  const rot = hasHeading ? heading : 0;

  // Directional heading cone & sharp arrowhead pointing according to heading
  const headingArrowSvg = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      width: 44px;
      height: 44px;
      transform: translate(-50%, -50%) rotate(${rot}deg);
      pointer-events: none;
      z-index: 1;
    ">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 22 L11 4 A22 22 0 0 1 33 4 Z" fill="url(#headingConeGrad)" opacity="0.45"/>
        <polygon points="22,6 18,14 26,14" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="headingConeGrad" x1="22" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
            <stop stop-color="#2563EB" stop-opacity="0.8"/>
            <stop offset="1" stop-color="#3B82F6" stop-opacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  `;

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      transform: translate(-50%, -50%);
    ">
      ${headingArrowSvg}
      <span class="user-location-pulse" style="
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.25);
        pointer-events: none;
        z-index: 2;
      "></span>
      <div style="
        position: relative;
        z-index: 3;
        width: 18px;
        height: 18px;
        background: #2563EB;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 4px; height: 4px; background: #FFFFFF; border-radius: 50%;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-location-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Draggable pin icon for manual location selection
 */
function createDraggableMarkerIcon() {
  const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -100%);
      cursor: grab;
    ">
      <div style="
        background: #F59E0B;
        color: #111827;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 8px;
        border: 1px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        margin-bottom: 2px;
        white-space: nowrap;
      ">
        Drag to Move
      </div>
      <div style="
        width: 30px;
        height: 30px;
        background: #D97706;
        border: 3px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(217,119,6,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-draggable-pin',
    iconSize: [36, 52],
    iconAnchor: [18, 52],
  });
}

/**
 * Supercluster Cluster Marker Icon with urgency badge
 */
function createClusterMarkerIcon(
  count: number,
  highestUrgency: string | null,
  hasFacilities: boolean
) {
  let bg = '#0D9488'; // teal default
  if (highestUrgency === 'critical') {
    bg = '#DC2626'; // red
  } else if (highestUrgency === 'high') {
    bg = '#EA580C'; // orange
  } else if (highestUrgency === 'medium') {
    bg = '#D97706'; // amber
  } else if (hasFacilities) {
    bg = '#2563EB'; // blue for facility clusters
  }

  const size = count >= 25 ? 48 : count >= 10 ? 42 : 36;
  const pulse =
    highestUrgency === 'critical'
      ? `<span class="kindlink-pin-pulse" style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(220, 38, 38, 0.45); pointer-events: none;"></span>`
      : '';

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      ${pulse}
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
        background: ${bg};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        cursor: pointer;
        position: relative;
        z-index: 2;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: ${size >= 42 ? '13px' : '11px'};
        font-weight: 800;
        color: #ffffff;
        user-select: none;
        transform: translate(-50%, -50%);
        transition: transform 0.2s ease;
      ">
        ${count}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-cluster-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Draggable Marker Component
 */
function DraggableMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (pos: [number, number]) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onPositionChange([lat, lng]);
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={createDraggableMarkerIcon()}
    >
      <Popup minWidth={160}>
        <div className="p-1 text-center notranslate">
          <strong className="text-xs text-amber-700 block font-bold">Selected Pin Location</strong>
          <span className="text-[11px] text-slate-700 dark:text-slate-200 block mt-0.5">
            {position[0].toFixed(4)}° N, {position[1].toFixed(4)}° E
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
            Drag to reposition your base neighborhood
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Supercluster Fast Clustering Layer
 * Converts all requests and facilities into indexed GeoJSON points and computes clusters in O(log N).
 */
function SuperclusterMarkersLayer({
  requests,
  facilities,
  selectedRequest,
  selectedFacility,
  onSelectRequest,
  onSelectFacility,
  userProfile,
}: {
  requests: HelpRequest[];
  facilities: MedicalFacility[];
  selectedRequest: HelpRequest | null;
  selectedFacility?: MedicalFacility | null;
  onSelectRequest: (req: HelpRequest) => void;
  onSelectFacility?: (fac: MedicalFacility) => void;
  userProfile?: UserProfile | null;
}) {
  const map = useMap();
  const [mapBounds, setMapBounds] = useState(() => map.getBounds());
  const [zoom, setZoom] = useState(() => Math.floor(map.getZoom()));

  // Listen to map viewport movements
  useMapEvents({
    moveend: () => {
      setMapBounds(map.getBounds());
      setZoom(Math.floor(map.getZoom()));
    },
    zoomend: () => {
      setMapBounds(map.getBounds());
      setZoom(Math.floor(map.getZoom()));
    },
  });

  // Build GeoJSON features
  const points = useMemo(() => {
    const list: Array<GeoJSON.Feature<GeoJSON.Point, any>> = [];

    requests.forEach((req) => {
      const coords = getPrivacyPreservingCoords(req);
      list.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [coords[1], coords[0]], // [lng, lat] for GeoJSON
        },
        properties: {
          id: req.id,
          kind: 'request',
          itemData: req,
          urgency: req.urgency,
          category: req.category,
          title: req.title,
          isOwner: isRequestOwner(req, userProfile),
        },
      });
    });

    facilities.forEach((fac) => {
      list.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [fac.longitude, fac.latitude],
        },
        properties: {
          id: fac.id,
          kind: 'facility',
          itemData: fac,
          facilityType: fac.type,
          name: fac.name,
          emergency: fac.emergency,
          phone: fac.phone,
          address: fac.address,
        },
      });
    });

    return list;
  }, [requests, facilities, userProfile]);

  // Index points with Supercluster
  const clusterIndex = useMemo(() => {
    try {
      const index = new SuperclusterConstructor({
        radius: 54,
        maxZoom: 16,
        map: (props: any) => ({
          highestUrgency: props.urgency || null,
          hasFacilities: props.kind === 'facility',
          isOwner: Boolean(props.isOwner),
          items: [
            {
              id: props.id,
              kind: props.kind,
              title: props.title || props.name,
              urgency: props.urgency,
              facilityType: props.facilityType,
              data: props.itemData,
            },
          ],
        }),
        reduce: (acc: any, props: any) => {
          acc.hasFacilities = acc.hasFacilities || props.hasFacilities;
          if (props.highestUrgency === 'critical' || acc.highestUrgency === 'critical') {
            acc.highestUrgency = 'critical';
          } else if (props.highestUrgency === 'high' || acc.highestUrgency === 'high') {
            acc.highestUrgency = 'high';
          } else if (props.highestUrgency === 'medium' || acc.highestUrgency === 'medium') {
            acc.highestUrgency = 'medium';
          }
          if (props.items && acc.items.length < 8) {
            acc.items.push(...props.items);
          }
        },
      });

      index.load(points);
      return index;
    } catch (err) {
      console.warn('[MapEngine] Supercluster initialization fallback:', err);
      return null;
    }
  }, [points]);

  // Query clusters for current viewport bbox and zoom
  const clusters = useMemo(() => {
    if (!clusterIndex) return [];
    try {
      const bbox: [number, number, number, number] = [
        mapBounds.getWest(),
        mapBounds.getSouth(),
        mapBounds.getEast(),
        mapBounds.getNorth(),
      ];
      return clusterIndex.getClusters(bbox, zoom);
    } catch {
      return [];
    }
  }, [clusterIndex, mapBounds, zoom]);

  return (
    <>
      {clusters.map((feature: any) => {
        const [lng, lat] = feature.geometry.coordinates;
        const isCluster = feature.properties.cluster === true;

        // CLUSTER PIN
        if (isCluster) {
          const clusterId = feature.properties.cluster_id;
          const count = feature.properties.point_count;
          const highestUrgency = feature.properties.highestUrgency || null;
          const hasFacilities = Boolean(feature.properties.hasFacilities);
          const leaves = clusterIndex ? clusterIndex.getLeaves(clusterId, 8) : [];

          return (
            <Marker
              key={`cluster-${clusterId}-${count}`}
              position={[lat, lng]}
              icon={createClusterMarkerIcon(count, highestUrgency, hasFacilities)}
              eventHandlers={{
                click: () => {
                  if (clusterIndex) {
                    const expansionZoom = Math.min(
                      clusterIndex.getClusterExpansionZoom(clusterId),
                      17
                    );
                    map.setView([lat, lng], expansionZoom, { animate: true });
                  }
                },
              }}
            >
              <Popup minWidth={220}>
                <div className="p-1.5 space-y-2 notranslate max-w-[240px]">
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {count} Items in this area
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Click to zoom
                    </span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {leaves.map((leaf: any) => {
                      const item = leaf.properties.itemData;
                      const isReq = leaf.properties.kind === 'request';
                      const title = isReq ? item.title : item.name;
                      const badge = isReq ? item.urgency : item.type?.replace('_', ' ');

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (isReq) onSelectRequest(item);
                            else if (onSelectFacility) onSelectFacility(item);
                          }}
                          className="w-full text-left p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px] flex items-center justify-between gap-1 border border-border/60"
                        >
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {title}
                          </span>
                          <span className="text-[9px] px-1 py-0.5 rounded font-bold uppercase shrink-0 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }

        // INDIVIDUAL ITEM PIN
        if (feature.properties.kind === 'request') {
          const req: HelpRequest = feature.properties.itemData;
          const isSelected = selectedRequest?.id === req.id;
          const isOwner = Boolean(feature.properties.isOwner);

          return (
            <Marker
              key={`req-${req.id}`}
              position={[lat, lng]}
              icon={createRequestMarkerIcon(req, isSelected, isOwner)}
              eventHandlers={{
                click: () => onSelectRequest(req),
              }}
            >
              <Popup>
                <div className="p-1 space-y-1.5 notranslate max-w-[210px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                      {req.urgency}
                    </span>
                    {isOwner ? (
                      <span className="text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded">
                        ★ Your Request
                      </span>
                    ) : req.verified ? (
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        Approx Area
                      </span>
                    )}
                  </div>
                  <strong className="text-xs text-slate-900 dark:text-slate-100 block leading-tight">
                    {req.title}
                  </strong>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 m-0">
                    {req.locationName}
                  </p>
                  {!req.verified && !isOwner && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 m-0 leading-tight">
                      🔒 Approximate location to protect unverified requester privacy.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectRequest(req)}
                    className={`mt-1.5 w-full py-1.5 px-2 rounded-lg text-white text-[11px] font-bold transition ${
                      isOwner
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    {isOwner ? 'Manage Your Request' : 'View Details'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        }

        // MEDICAL FACILITY PIN
        const fac: MedicalFacility = feature.properties.itemData;
        const isSelected = selectedFacility?.id === fac.id;
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${fac.latitude},${fac.longitude}`;

        return (
          <Marker
            key={`fac-${fac.id}`}
            position={[lat, lng]}
            icon={createMedicalMarkerIcon(fac.type, isSelected)}
            eventHandlers={{
              click: () => {
                if (onSelectFacility) onSelectFacility(fac);
              },
            }}
          >
            <Popup>
              <div className="p-1 space-y-1.5 notranslate max-w-[220px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {fac.type.replace('_', ' ')}
                  </span>
                  {fac.emergency && (
                    <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                      24/7 ER
                    </span>
                  )}
                </div>
                <strong className="text-xs text-slate-900 dark:text-slate-100 block leading-tight">
                  {fac.name}
                </strong>
                {fac.address && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 m-0 line-clamp-2">
                    {fac.address}
                  </p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  {fac.phone && (
                    <a
                      href={`tel:${fac.phone.replace(/[^0-9+]/g, '')}`}
                      className="flex-1 py-1 text-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                    >
                      Call
                    </a>
                  )}
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1 text-center rounded-md bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold"
                  >
                    Maps
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function LeafletInnerMap({
  center,
  zoom,
  requests,
  radiusMeters,
  selectedRequest,
  selectedFacility,
  onSelectRequest,
  onSelectFacility,
  draggableMode = false,
  draggablePosition,
  onDraggablePositionChange,
  medicalFacilities = [],
  layers = {
    requests: true,
    hospitals: true,
    clinics: true,
    pharmacies: true,
    bloodBanks: true,
  },
  activeRoute,
  transportTripRoute,
  userProfile,
  baseMapMode = 'auto',
  onTimeToFirstTile,
  userHeading,
  userAccuracyMeters = 30,
  bottomSheetSnap,
}: LeafletInnerMapProps) {
  // Filter visible medical facilities according to active layers
  const visibleFacilities = useMemo(() => {
    return medicalFacilities.filter((f) => {
      if (f.type === 'hospital') return layers.hospitals;
      if (f.type === 'clinic') return layers.clinics ?? layers.hospitals;
      if (f.type === 'pharmacy') return layers.pharmacies;
      if (f.type === 'blood_bank') return layers.bloodBanks;
      return true;
    });
  }, [medicalFacilities, layers]);

  const visibleRequests = useMemo(() => {
    if (!layers.requests) return [];
    return requests;
  }, [requests, layers.requests]);

  // Selected Coordinates for the camera controller
  const selectedCoords = useMemo<[number, number] | null>(() => {
    if (selectedRequest) {
      return getPrivacyPreservingCoords(selectedRequest);
    }
    if (selectedFacility) {
      return [selectedFacility.latitude, selectedFacility.longitude];
    }
    return null;
  }, [selectedRequest, selectedFacility]);

  return (
    <>
      {/* Global CSS for Animations & Reduced Motion */}
      <style>{`
        @keyframes kindlink-beacon-ping {
          0% { transform: translate(-50%, 50%) scale(0.8); opacity: 0.85; }
          100% { transform: translate(-50%, 50%) scale(2.4); opacity: 0; }
        }
        .kindlink-pin-pulse {
          animation: kindlink-beacon-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes kindlink-ring-pulse {
          0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(0.95); opacity: 0.9; }
        }
        .pin-selected-ring {
          animation: kindlink-ring-pulse 2s ease-in-out infinite;
        }
        @keyframes user-location-sonar {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .user-location-pulse {
          animation: user-location-sonar 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .kindlink-pin-pulse,
          .pin-selected-ring,
          .user-location-pulse {
            animation: none !important;
            opacity: 0.5 !important;
          }
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={true}
        className="h-full w-full notranslate kindlink-map-has-bottom-nav"
        style={{ height: '100%', width: '100%' }}
      >
        {/* Primary OpenFreeMap Layer with Failover to MapTiler & OSM */}
        <MapTileLayer
          hasBottomNav={true}
          baseMapMode={baseMapMode}
          onTimeToFirstTile={onTimeToFirstTile}
        />

        {/* Camera Position & Size Controller */}
        <MapController center={center} zoom={zoom} />

        {/* Selected Pin Easing Controller: Eases pin into view with padding */}
        <SelectedPinCameraController
          selectedCoords={selectedCoords}
          bottomSheetSnap={bottomSheetSnap}
        />

        {/* Route Bounds Controller */}
        <RouteBoundsController
          activeRoute={activeRoute}
          transportTripRoute={transportTripRoute}
        />

        {/* User Location: Blue Dot with Accuracy Circle and Heading Arrow */}
        {!draggableMode && (
          <>
            {/* GPS Accuracy Circle */}
            <Circle
              center={center}
              radius={Math.max(20, Math.min(100, userAccuracyMeters))}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
            {/* Blue Dot with Heading Arrow */}
            <Marker position={center} icon={createUserMarkerIcon(userHeading)}>
              <Popup>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 notranslate">
                  Your Current Location Hub
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Draggable Pin Mode */}
        {draggableMode && draggablePosition && onDraggablePositionChange && (
          <DraggableMarker
            position={draggablePosition}
            onPositionChange={onDraggablePositionChange}
          />
        )}

        {/* Geofence Proximity Circle */}
        <Circle
          center={draggableMode && draggablePosition ? draggablePosition : center}
          radius={radiusMeters}
          pathOptions={{
            color: '#0D9488',
            fillColor: '#0D9488',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '4, 8',
          }}
        />

        {/* Dual-Tone Teal Route Line with Outline for High Contrast */}
        {activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0 && (
          <>
            {/* Dark Outline / Casing Polyline */}
            <Polyline
              positions={activeRoute.coordinates}
              pathOptions={{
                color: '#042F2E',
                weight: 8,
                opacity: 0.75,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Foreground Teal Polyline */}
            <Polyline
              positions={activeRoute.coordinates}
              pathOptions={{
                color: '#0D9488',
                weight: 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: activeRoute.isFallback || activeRoute.source === 'straight-line' ? '6, 8' : undefined,
              }}
            />
          </>
        )}

        {/* Transport Request Trip Polyline (Pickup to Dropoff) */}
        {transportTripRoute &&
          transportTripRoute.coordinates &&
          transportTripRoute.coordinates.length > 0 && (
            <Polyline
              positions={transportTripRoute.coordinates}
              pathOptions={{
                color: '#8B5CF6',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

        {/* Fast Supercluster Markers Layer */}
        <SuperclusterMarkersLayer
          requests={visibleRequests}
          facilities={visibleFacilities}
          selectedRequest={selectedRequest}
          selectedFacility={selectedFacility}
          onSelectRequest={onSelectRequest}
          onSelectFacility={onSelectFacility}
          userProfile={userProfile}
        />
      </MapContainer>
    </>
  );
}
