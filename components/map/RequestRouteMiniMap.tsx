'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapTileLayer } from './MapTileLayer';
import { UrgencyLevel } from '@/lib/data/types';

interface RequestRouteMiniMapProps {
  origin: [number, number];
  destination: [number, number];
  routeCoordinates: [number, number][];
  isStraightLine: boolean;
  urgency: UrgencyLevel;
  destinationLabel: string;
}



function BoundsController({
  origin,
  destination,
  routeCoordinates,
}: {
  origin: [number, number];
  destination: [number, number];
  routeCoordinates: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const points: [number, number][] =
      routeCoordinates.length > 1
        ? routeCoordinates
        : [origin, destination];

    try {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 15,
        animate: false,
      });
    } catch {
      // Ignore bounds errors
    }
  }, [map, origin, destination, routeCoordinates]);

  return null;
}

function createMiniPin(color: string, label: string) {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: ${color};
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: `mini-map-pin-${label.toLowerCase()}`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function RequestRouteMiniMap({
  origin,
  destination,
  routeCoordinates,
  isStraightLine,
  urgency,
  destinationLabel,
}: RequestRouteMiniMapProps) {
  let destColor = '#475569';
  if (urgency === 'critical') destColor = '#DC2626';
  else if (urgency === 'high') destColor = '#EA580C';
  else if (urgency === 'medium') destColor = '#D97706';

  const userIcon = createMiniPin('#0D9488', 'user');
  const destIcon = createMiniPin(destColor, 'dest');

  const polylineCoords =
    routeCoordinates.length > 0
      ? routeCoordinates
      : [origin, destination];

  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-border shadow-xs notranslate">
      <MapContainer
        center={origin}
        zoom={13}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <MapTileLayer />
        <BoundsController
          origin={origin}
          destination={destination}
          routeCoordinates={routeCoordinates}
        />

        {/* User Origin Pin */}
        <Marker position={origin} icon={userIcon}>
          <Popup>
            <span className="text-[11px] font-bold">Your Location</span>
          </Popup>
        </Marker>

        {/* Request Destination Pin */}
        <Marker position={destination} icon={destIcon}>
          <Popup>
            <span className="text-[11px] font-bold">{destinationLabel}</span>
          </Popup>
        </Marker>

        {/* Route Polyline */}
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: isStraightLine ? '#0D9488' : '#2563EB',
            weight: 4,
            opacity: 0.85,
            dashArray: isStraightLine ? '6, 8' : undefined,
          }}
        />
      </MapContainer>

      {/* Floating Mode indicator in top-left */}
      <div className="absolute top-2 left-2 z-[400] px-2.5 py-1 rounded-xl bg-card/90 backdrop-blur-md border border-border text-[10px] font-bold text-foreground shadow-xs flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            isStraightLine ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
        />
        <span>{isStraightLine ? 'Direct Geodesic Line' : 'Live OSRM Road Route'}</span>
      </div>
    </div>
  );
}
