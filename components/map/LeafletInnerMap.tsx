'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { HelpRequest } from '@/lib/data/types';

interface LeafletInnerMapProps {
  center: [number, number];
  zoom: number;
  requests: HelpRequest[];
  radiusMeters: number;
  selectedRequest: HelpRequest | null;
  onSelectRequest: (req: HelpRequest) => void;
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

export default function LeafletInnerMap({
  center,
  zoom,
  requests,
  radiusMeters,
  selectedRequest,
  onSelectRequest,
}: LeafletInnerMapProps) {
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
      <Marker position={center} icon={createUserMarkerIcon()}>
        <Popup>
          <div className="text-xs font-bold text-slate-900 notranslate">
            Your Location (Asansol Hub)
          </div>
        </Popup>
      </Marker>

      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{
          color: '#0D9488',
          fillColor: '#0D9488',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '4, 8',
        }}
      />

      {/* Aid Request Markers */}
      {requests.map((req) => {
        const isSelected = selectedRequest?.id === req.id;
        return (
          <Marker
            key={req.id}
            position={[req.latitude, req.longitude]}
            icon={createUrgencyMarkerIcon(req.urgency, isSelected)}
            eventHandlers={{
              click: () => onSelectRequest(req),
            }}
          >
            <Popup>
              <div className="p-1 space-y-1 notranslate">
                <span className="text-[10px] font-bold uppercase tracking-wide text-rose-600 block">
                  {req.urgency} • Score {req.helpGravityScore}
                </span>
                <strong className="text-xs text-slate-900 block leading-tight">{req.title}</strong>
                <p className="text-[11px] text-slate-600 m-0">{req.locationName}</p>
                <button
                  onClick={() => onSelectRequest(req)}
                  className="mt-2 w-full py-1 px-2 rounded-lg bg-teal-600 text-white text-[11px] font-bold"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
