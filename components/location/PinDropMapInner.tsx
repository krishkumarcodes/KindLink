'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapTileLayer } from '@/components/map/MapTileLayer';

interface PinDropMapInnerProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  className?: string;
}



// Controller to smoothly pan to center when modified externally
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);

  return null;
}

// Map click listener to relocate pin on tap
function MapClickHandler({
  onPositionChange,
}: {
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Custom draggable pin icon with pointer tip
function createDraggablePinIcon() {
  const html = `
    <div style="position: relative; width: 36px; height: 44px; transform: translate(-50%, -100%);">
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
        <path d="M18 0C8.05888 0 0 8.05888 0 18C0 29.5 18 44 18 44C18 44 36 29.5 36 18C36 8.05888 27.9411 0 18 0Z" fill="#0D9488"/>
        <path d="M18 2C9.16344 2 2 9.16344 2 18C2 28.2 17.5 41.5 18 41.9C18.5 41.5 34 28.2 34 18C34 9.16344 26.8366 2 18 2Z" fill="#0F766E"/>
        <circle cx="18" cy="18" r="7" fill="#FFFFFF"/>
        <circle cx="18" cy="18" r="3.5" fill="#0D9488"/>
      </svg>
      <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; border-radius: 50%; background: rgba(13, 148, 136, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'kindlink-pin-drop-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  });
}

export default function PinDropMapInner({
  lat,
  lng,
  onPositionChange,
  className = 'h-64 sm:h-72 w-full',
}: PinDropMapInnerProps) {
  const pinIcon = useMemo(() => createDraggablePinIcon(), []);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border/80 shadow-inner ${className}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full z-0 notranslate"
        attributionControl={false}
      >
        <MapTileLayer />
        <MapRecenter lat={lat} lng={lng} />
        <MapClickHandler onPositionChange={onPositionChange} />
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              onPositionChange(position.lat, position.lng);
            },
          }}
        />
      </MapContainer>

      {/* Floating interactive tooltip */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] pointer-events-none flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium shadow-md border border-white/10">
          <span>Tap anywhere or drag the pin to position</span>
        </span>
      </div>
    </div>
  );
}
