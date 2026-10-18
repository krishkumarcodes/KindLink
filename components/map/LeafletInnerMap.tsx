'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
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
import { MapTileLayer } from './MapTileLayer';
import { HelpRequest, UserProfile } from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { MedicalFacility, MedicalAmenityType } from '@/lib/geo/hospitals';
import { RoadRouteResult } from '@/lib/geo/osrm';

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
 * Privacy guarantee: For unverified requesters, apply deterministic jitter
 * (~200m offset) so that their exact coordinates are not exposed publicly.
 */
function getPrivacyPreservingCoords(req: HelpRequest): [number, number] {
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
 * Redesigned SVG Teardrop Request Pin:
 * - Category color + icon inside
 * - High-contrast crisp white outline (2.5px)
 * - Critical requests get soft pulsing beacon (reduced motion respected)
 * - Selected state scales up
 */
function createRequestMarkerIcon(req: HelpRequest, isSelected: boolean, isOwner: boolean) {
  const color = isOwner ? '#6366F1' : getCategoryPinColor(req.category, req.urgency);
  const isCritical = req.urgency === 'critical';
  const width = isSelected ? 44 : 36;
  const height = isSelected ? 56 : 46;

  const pulseHtml =
    isCritical && !isOwner
      ? `<span class="kindlink-pin-pulse" style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); width: 28px; height: 28px; border-radius: 50%; background: rgba(220, 38, 38, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></span>`
      : '';

  const ownerBadge = isOwner
    ? `<div style="position: absolute; top: -6px; right: -6px; background: #4F46E5; color: #FFF; font-size: 8px; font-weight: 900; padding: 1px 4px; border-radius: 6px; border: 1.5px solid #FFF; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">YOU</div>`
    : '';

  const svgIcon = isOwner
    ? `<path d="M18 9.5l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="#FFFFFF"/>`
    : getCategoryIconSvg(req.category);

  const html = `
    <div style="position: relative; width: ${width}px; height: ${height}px; transform: translate(-50%, -100%); cursor: pointer; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35)); transition: transform 0.2s ease;">
      ${pulseHtml}
      ${ownerBadge}
      <svg width="${width}" height="${height}" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.06 27.94 0 18 0Z" fill="${color}" stroke="#FFFFFF" stroke-width="${isSelected ? 3.5 : 2.5}"/>
        <circle cx="18" cy="18" r="11" fill="rgba(255,255,255,0.18)"/>
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
 * User location cyan-teal pulsing pin with accuracy circle
 */
function createUserMarkerIcon() {
  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: #0D9488;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(13,148,136,0.55);
      transform: translate(-50%, -50%);
    ">
      <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-pin',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * Proper SVG Facility Badges (No Letters! Cross, Stethoscope, Pill, Blood Drop):
 * - Hospital: Red (#DC2626) with cross
 * - Clinic: Blue (#2563EB) with stethoscope
 * - Pharmacy: Emerald (#059669) with pill
 * - Blood bank: Crimson (#991B1B) with blood drop
 */
function createMedicalMarkerIcon(type: MedicalAmenityType, isSelected: boolean = false) {
  let bg = '#DC2626'; // hospital (red)
  let svgIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

  if (type === 'clinic') {
    bg = '#2563EB'; // blue
    svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`;
  } else if (type === 'pharmacy') {
    bg = '#059669'; // emerald
    svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`;
  } else if (type === 'blood_bank') {
    bg = '#991B1B'; // crimson
    svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`;
  }

  const size = isSelected ? 42 : 36;

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      background: ${bg};
      border: ${isSelected ? '3.5px' : '2.5px'} solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      cursor: pointer;
      transform: translate(-50%, -50%);
      transition: all 0.2s ease;
    ">
      ${svgIcon}
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
 * Cluster Pin Icon
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

  const size = count >= 20 ? 46 : count >= 10 ? 42 : 36;
  const pulse =
    highestUrgency === 'critical'
      ? `<span style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
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
 * Clustered Markers Component
 * Groups close markers based on map zoom to prevent marker piles & overlapping
 */
function ClusteredMarkers({
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
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom()),
  });

  // Convert requests and facilities to MapUnifiedItems
  const allItems: MapUnifiedItem[] = useMemo(() => {
    const list: MapUnifiedItem[] = [];
    requests.forEach((req) => {
      const coords = getPrivacyPreservingCoords(req);
      list.push({
        kind: 'request',
        data: req,
        position: coords,
      });
    });
    facilities.forEach((fac) => {
      list.push({
        kind: 'facility',
        data: fac,
        position: [fac.latitude, fac.longitude],
      });
    });
    return list;
  }, [requests, facilities]);

  // Compute spatial clusters based on pixel distance
  const clusters = useMemo(() => {
    // When zoomed in deeply (zoom >= 16), allow pins to unpack
    const clusterPixelRadius = zoom >= 16 ? 24 : zoom >= 14 ? 40 : 54;

    const result: {
      id: string;
      position: [number, number];
      items: MapUnifiedItem[];
      bounds: L.LatLngBounds;
      highestUrgency: string | null;
      hasFacilities: boolean;
    }[] = [];

    for (const item of allItems) {
      const itemPixel = map.project(item.position, zoom);
      let matchedCluster: (typeof result)[0] | null = null;

      for (const cluster of result) {
        const clusterPixel = map.project(cluster.position, zoom);
        const dist = Math.hypot(itemPixel.x - clusterPixel.x, itemPixel.y - clusterPixel.y);
        if (dist <= clusterPixelRadius) {
          matchedCluster = cluster;
          break;
        }
      }

      if (matchedCluster) {
        matchedCluster.items.push(item);
        matchedCluster.bounds.extend(item.position);
        const n = matchedCluster.items.length;
        matchedCluster.position = [
          (matchedCluster.position[0] * (n - 1) + item.position[0]) / n,
          (matchedCluster.position[1] * (n - 1) + item.position[1]) / n,
        ];

        if (item.kind === 'request') {
          const u = item.data.urgency;
          if (u === 'critical') matchedCluster.highestUrgency = 'critical';
          else if (u === 'high' && matchedCluster.highestUrgency !== 'critical') {
            matchedCluster.highestUrgency = 'high';
          } else if (
            u === 'medium' &&
            matchedCluster.highestUrgency !== 'critical' &&
            matchedCluster.highestUrgency !== 'high'
          ) {
            matchedCluster.highestUrgency = 'medium';
          }
        } else {
          matchedCluster.hasFacilities = true;
        }
      } else {
        const bounds = L.latLngBounds(item.position, item.position);
        result.push({
          id: `${item.kind}-${item.data.id}`,
          position: [item.position[0], item.position[1]],
          items: [item],
          bounds,
          highestUrgency: item.kind === 'request' ? item.data.urgency : null,
          hasFacilities: item.kind === 'facility',
        });
      }
    }

    return result;
  }, [allItems, map, zoom]);

  return (
    <>
      {clusters.map((cluster) => {
        // Single Item: Render distinct pin
        if (cluster.items.length === 1) {
          const single = cluster.items[0];

          if (single.kind === 'request') {
            const req = single.data;
            const isSelected = selectedRequest?.id === req.id;
            const isOwner = isRequestOwner(req, userProfile);

            return (
              <Marker
                key={req.id}
                position={single.position}
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

          // Medical Facility
          const fac = single.data;
          const isSelected = selectedFacility?.id === fac.id;
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${fac.latitude},${fac.longitude}`;

          return (
            <Marker
              key={fac.id}
              position={single.position}
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
        }

        // Multiple Items: Render Cluster Pin
        return (
          <Marker
            key={`cluster-${cluster.id}-${cluster.items.length}`}
            position={cluster.position}
            icon={createClusterMarkerIcon(
              cluster.items.length,
              cluster.highestUrgency,
              cluster.hasFacilities
            )}
            eventHandlers={{
              click: () => {
                if (map.getZoom() < 17) {
                  map.fitBounds(cluster.bounds.pad(0.35), {
                    animate: true,
                    maxZoom: 17,
                  });
                }
              },
            }}
          >
            <Popup minWidth={220}>
              <div className="p-1.5 space-y-2 notranslate max-w-[240px]">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {cluster.items.length} Pins in this area
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Click to zoom
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {cluster.items.map((it) => (
                    <button
                      key={it.data.id}
                      type="button"
                      onClick={() => {
                        if (it.kind === 'request') onSelectRequest(it.data);
                        else if (onSelectFacility) onSelectFacility(it.data);
                      }}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px] flex items-center justify-between gap-1 border border-border/60"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {it.kind === 'request' ? it.data.title : it.data.name}
                      </span>
                      <span className="text-[9px] px-1 py-0.5 rounded font-bold uppercase shrink-0 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {it.kind === 'request' ? it.data.urgency : it.data.type.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
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

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      zoomControl={false}
      attributionControl={true}
      className="h-full w-full notranslate kindlink-map-has-bottom-nav"
      style={{ height: '100%', width: '100%' }}
    >
      {/* Primary OpenFreeMap Layer with 4s Failover to MapTiler & OSM */}
      <MapTileLayer
        hasBottomNav={true}
        baseMapMode={baseMapMode}
        onTimeToFirstTile={onTimeToFirstTile}
      />

      {/* Camera Position & Size Controller */}
      <MapController center={center} zoom={zoom} />

      {/* Route Bounds Controller */}
      <RouteBoundsController
        activeRoute={activeRoute}
        transportTripRoute={transportTripRoute}
      />

      {/* User Location Marker & Proximity Circle */}
      {!draggableMode && (
        <Marker position={center} icon={createUserMarkerIcon()}>
          <Popup>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 notranslate">
              Your Current Location Hub
            </div>
          </Popup>
        </Marker>
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

      {/* Active Navigation Road Route Polyline (Proxy / Straight line) */}
      {activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0 && (
        <Polyline
          positions={activeRoute.coordinates}
          pathOptions={{
            color: activeRoute.isFallback || activeRoute.source === 'straight-line' ? '#0D9488' : '#2563EB',
            weight: 5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: activeRoute.isFallback || activeRoute.source === 'straight-line' ? '6, 8' : undefined,
          }}
        />
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

      {/* Clustered Markers for Requests & Facilities (never piles up or overlaps) */}
      <ClusteredMarkers
        requests={visibleRequests}
        facilities={visibleFacilities}
        selectedRequest={selectedRequest}
        selectedFacility={selectedFacility}
        onSelectRequest={onSelectRequest}
        onSelectFacility={onSelectFacility}
        userProfile={userProfile}
      />
    </MapContainer>
  );
}
