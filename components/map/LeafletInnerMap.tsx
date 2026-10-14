'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { HelpRequest } from '@/lib/data/types';
import { MedicalFacility, MedicalAmenityType } from '@/lib/geo/hospitals';

export interface MapLayersState {
  requests: boolean;
  hospitals: boolean;
  pharmacies: boolean;
  bloodBanks: boolean;
}

interface LeafletInnerMapProps {
  center: [number, number];
  zoom: number;
  requests: HelpRequest[];
  radiusMeters: number;
  selectedRequest: HelpRequest | null;
  onSelectRequest: (req: HelpRequest) => void;
  draggableMode?: boolean;
  draggablePosition?: [number, number];
  onDraggablePositionChange?: (pos: [number, number]) => void;
  medicalFacilities?: MedicalFacility[];
  layers?: MapLayersState;
}

// Controller component to smoothly pan and call map.invalidateSize()
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
 * Privacy guarantee: For unverified requesters, apply deterministic jitter
 * (~200m offset) so that their exact home/street coordinates are not exposed publicly.
 */
function getPrivacyPreservingCoords(req: HelpRequest): [number, number] {
  if (req.verified) {
    return [req.latitude, req.longitude];
  }

  // Deterministic pseudo-random offset based on request id string
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

// Creates an SVG divIcon matching the urgency color
function createUrgencyMarkerIcon(urgency: string, isSelected: boolean) {
  let color = '#10B981'; // low
  if (urgency === 'critical') color = '#E5484D';
  else if (urgency === 'high') color = '#F59E0B';
  else if (urgency === 'medium') color = '#3B82F6';

  const size = isSelected ? 42 : 32;

  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-urgency-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// User location blue pulsing pin
function createUserMarkerIcon() {
  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #0D9488;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(13,148,136,0.5);
      transform: translate(-50%, -50%);
    ">
      <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-pin',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Medical facility pin (Hospital, Pharmacy, Blood Bank, Clinic)
function createMedicalMarkerIcon(type: MedicalAmenityType) {
  let bg = '#E11D48'; // red for hospital
  let symbol = 'H';

  if (type === 'pharmacy') {
    bg = '#059669'; // emerald
    symbol = 'Rx';
  } else if (type === 'blood_bank') {
    bg = '#991B1B'; // dark crimson
    symbol = '🩸';
  } else if (type === 'clinic') {
    bg = '#2563EB'; // blue
    symbol = 'C';
  }

  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: ${bg};
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      cursor: pointer;
      font-size: 11px;
      font-weight: 900;
      color: #ffffff;
      transform: translate(-50%, -50%);
    ">
      ${symbol}
    </div>
  `;

  return L.divIcon({
    html,
    className: `custom-medical-${type}`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Draggable pin icon for manual location selection
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
        padding: 2px 7px;
        border-radius: 6px;
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
    iconSize: [36, 50],
    iconAnchor: [18, 50],
  });
}

// Draggable Marker Component
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
          <span className="text-[11px] text-slate-700 block mt-0.5">
            {position[0].toFixed(4)}° N, {position[1].toFixed(4)}° E
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Drag to reposition your base neighborhood
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

export default function LeafletInnerMap({
  center,
  zoom,
  requests,
  radiusMeters,
  selectedRequest,
  onSelectRequest,
  draggableMode = false,
  draggablePosition,
  onDraggablePositionChange,
  medicalFacilities = [],
  layers = {
    requests: true,
    hospitals: true,
    pharmacies: true,
    bloodBanks: true,
  },
}: LeafletInnerMapProps) {
  // Filter medical facilities according to active layers
  const visibleFacilities = useMemo(() => {
    return medicalFacilities.filter((f) => {
      if (f.type === 'hospital' || f.type === 'clinic') return layers.hospitals;
      if (f.type === 'pharmacy') return layers.pharmacies;
      if (f.type === 'blood_bank') return layers.bloodBanks;
      return true;
    });
  }, [medicalFacilities, layers]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      className="h-full w-full notranslate"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController center={center} zoom={zoom} />

      {/* User Location Marker & Proximity Circle */}
      {!draggableMode && (
        <Marker position={center} icon={createUserMarkerIcon()}>
          <Popup>
            <div className="text-xs font-bold text-slate-900 notranslate">
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

      {/* Aid Request Markers (if requests layer enabled) */}
      {layers.requests &&
        requests.map((req) => {
          const isSelected = selectedRequest?.id === req.id;
          const displayCoords = getPrivacyPreservingCoords(req);

          return (
            <Marker
              key={req.id}
              position={displayCoords}
              icon={createUrgencyMarkerIcon(req.urgency, isSelected)}
              eventHandlers={{
                click: () => onSelectRequest(req),
              }}
            >
              <Popup>
                <div className="p-1 space-y-1.5 notranslate max-w-[200px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
                      {req.urgency}
                    </span>
                    {req.verified ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        Approx Area
                      </span>
                    )}
                  </div>
                  <strong className="text-xs text-slate-900 block leading-tight">
                    {req.title}
                  </strong>
                  <p className="text-[11px] text-slate-600 m-0">
                    {req.locationName}
                  </p>
                  {!req.verified && (
                    <p className="text-[10px] text-amber-700 m-0 leading-tight">
                      🔒 Approximate location to protect unverified requester privacy.
                    </p>
                  )}
                  <button
                    onClick={() => onSelectRequest(req)}
                    className="mt-1.5 w-full py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

      {/* Medical Amenities (Hospitals, Pharmacies, Blood Banks) */}
      {visibleFacilities.map((fac) => {
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${fac.latitude},${fac.longitude}`;

        return (
          <Marker
            key={fac.id}
            position={[fac.latitude, fac.longitude]}
            icon={createMedicalMarkerIcon(fac.type)}
          >
            <Popup>
              <div className="p-1 space-y-1.5 notranslate max-w-[210px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {fac.type.replace('_', ' ')}
                  </span>
                  {fac.emergency && (
                    <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      24/7 ER
                    </span>
                  )}
                </div>
                <strong className="text-xs text-slate-900 block leading-tight">
                  {fac.name}
                </strong>
                {fac.address && (
                  <p className="text-[11px] text-slate-600 m-0 line-clamp-2">
                    {fac.address}
                  </p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  {fac.phone && (
                    <a
                      href={`tel:${fac.phone.replace(/[^0-9+]/g, '')}`}
                      className="flex-1 py-1 text-center rounded-md bg-emerald-600 text-white text-[10px] font-bold"
                    >
                      Call
                    </a>
                  )}
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1 text-center rounded-md bg-slate-800 text-white text-[10px] font-bold"
                  >
                    Directions
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
