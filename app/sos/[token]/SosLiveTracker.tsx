'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { SosEvent } from '@/lib/data/types';

interface SosLiveTrackerProps {
  initialEvent: SosEvent;
  token: string;
}

function maskName(name?: string): string {
  if (!name) return 'KindLink Citizen';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 1) return part;
      return part[0] + '*'.repeat(Math.max(2, Math.min(part.length - 1, 5)));
    })
    .join(' ');
}

function maskPhone(phone?: string): string {
  if (!phone) return '+91 ••••• •••••';
  const digits = phone.trim();
  if (digits.length <= 6) return digits;
  return digits.slice(0, 7) + ' •••••';
}

export function SosLiveTracker({ initialEvent, token }: SosLiveTrackerProps) {
  const [event, setEvent] = useState<SosEvent>(initialEvent);
  const [elapsedText, setElapsedText] = useState<string>('0m 0s');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live elapsed time counter (updates every 1s)
  useEffect(() => {
    const updateElapsed = () => {
      const createdTime = new Date(event.createdAt).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - createdTime);
      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (hours > 0) {
        setElapsedText(`${hours}h ${mins}m ${secs}s`);
      } else {
        setElapsedText(`${mins}m ${secs}s`);
      }
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [event.createdAt]);

  // Poll for location updates every 10 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchUpdate = async () => {
      try {
        setIsRefreshing(true);
        const res = await fetch(`/api/sos/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.event && isMounted) {
            setEvent(data.event);
            setLastUpdated(new Date());
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    };

    const interval = setInterval(fetchUpdate, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  const lat = event.latitude;
  const lng = event.longitude;
  const maskedRequesterName = maskName(event.userName);
  const maskedRequesterPhone = maskPhone(event.userPhone);

  const delta = 0.009;
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Emergency Responder Banner */}
      <div className="bg-urgency-critical text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Radio className="h-5 w-5 animate-pulse shrink-0 notranslate" />
            <div className="truncate">
              <span className="font-black text-sm tracking-wide block uppercase truncate">
                EMERGENCY SOS TRACKING • ASANSOL
              </span>
              <span className="text-[11px] opacity-90 block truncate">
                Public Live Feed for Emergency Responders &amp; Volunteers
              </span>
            </div>
          </div>
          <a
            href="tel:112"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-urgency-critical font-black text-xs hover:bg-zinc-100 transition shadow-xs shrink-0 touch-target"
            aria-label="Call 112 Police immediately"
          >
            <Phone className="h-3.5 w-3.5 notranslate" />
            <span>Call 112</span>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Urgent Status Card */}
        <section
          aria-labelledby="status-title"
          className="rounded-3xl border-2 border-urgency-critical bg-card p-5 sm:p-6 shadow-xl text-card-foreground"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-urgency-critical text-white shadow-md shrink-0">
                <AlertTriangle className="h-6 w-6 animate-pulse notranslate" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 id="status-title" className="text-xl sm:text-2xl font-black tracking-tight">
                    Active SOS Beacon
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-urgency-critical/15 text-urgency-critical border border-urgency-critical/30 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-urgency-critical" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Token ID: <span className="font-mono text-foreground">{token}</span>
                </p>
              </div>
            </div>

            {/* Elapsed Time Counter */}
            <div className="flex items-center gap-2 p-2.5 px-4 rounded-2xl bg-muted/80 border border-border shrink-0">
              <Clock className="h-4 w-4 text-primary notranslate" />
              <div className="text-right sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Elapsed Time
                </span>
                <span className="text-sm font-black text-foreground font-mono block">
                  {elapsedText}
                </span>
              </div>
            </div>
          </div>

          {/* Requester Details (Masked for Privacy) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-muted/60 border border-border">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Requester (Masked for Privacy)
              </span>
              <span className="text-base font-extrabold text-foreground block mt-0.5">
                {maskedRequesterName}
              </span>
              <span className="text-xs text-muted-foreground block mt-0.5">
                Contact: {maskedRequesterPhone}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/60 border border-border">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Last Known Location
              </span>
              <span className="text-sm font-extrabold text-foreground block mt-0.5 flex items-center gap-1.5 truncate">
                <MapPin className="h-4 w-4 text-primary shrink-0 notranslate" />
                <span className="truncate">{event.addressText || 'Asansol Region, WB'}</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono block mt-0.5">
                GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 notranslate" />
              Identity protected by KindLink Emergency Privacy Shield
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw
                className={`h-3 w-3 notranslate ${isRefreshing ? 'animate-spin text-primary' : ''}`}
              />
              Auto-refreshing every 10s
            </span>
          </div>
        </section>

        {/* Live Map Section (OpenStreetMap iframe - no API key needed) */}
        <section
          aria-labelledby="map-section-title"
          className="rounded-3xl border border-border bg-card p-5 shadow-lg text-card-foreground"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary notranslate" />
              <div>
                <h2 id="map-section-title" className="text-base font-extrabold">
                  Live Location Map
                </h2>
                <span className="text-xs text-muted-foreground">
                  Powered by OpenStreetMap (Direct GPS Pin)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-xs touch-target"
              >
                <Navigation className="h-3.5 w-3.5 notranslate" />
                <span>Navigate in Google Maps</span>
              </a>
              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition touch-target"
              >
                <ExternalLink className="h-3.5 w-3.5 notranslate" />
                <span>Full OSM</span>
              </a>
            </div>
          </div>

          {/* OpenStreetMap iframe */}
          <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-border shadow-inner bg-muted">
            <iframe
              src={iframeSrc}
              className="w-full h-full border-0"
              title="OpenStreetMap Live Emergency Beacon Location"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Location centered around {event.addressText || 'Asansol'}.</span>
            <span>Last checked: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </section>

        {/* Rapid Responder Action Hotline Deck */}
        <section
          aria-labelledby="responder-actions-title"
          className="rounded-3xl border border-border bg-card p-5 shadow-lg text-card-foreground"
        >
          <h2 id="responder-actions-title" className="text-base font-extrabold mb-3">
            Emergency Responder Quick Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Call 112 */}
            <a
              href="tel:112"
              className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-urgency-critical text-white font-black hover:bg-red-700 transition shadow-md touch-target"
            >
              <Phone className="h-6 w-6 mb-1 notranslate" />
              <span className="text-base uppercase tracking-wider">CALL 112</span>
              <span className="text-[11px] opacity-90 font-medium">Police &amp; Emergency</span>
            </a>

            {/* Call 108 */}
            <a
              href="tel:108"
              className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition shadow-md touch-target"
            >
              <Phone className="h-6 w-6 mb-1 notranslate" />
              <span className="text-base uppercase tracking-wider">CALL 108</span>
              <span className="text-[11px] opacity-90 font-medium">National Ambulance</span>
            </a>

            {/* Call 100 */}
            <a
              href="tel:100"
              className="flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-border bg-muted hover:bg-muted/80 text-foreground font-black transition shadow-xs touch-target"
            >
              <ShieldCheck className="h-6 w-6 mb-1 text-primary notranslate" />
              <span className="text-base uppercase tracking-wider">CALL 100</span>
              <span className="text-[11px] text-muted-foreground font-medium">Police Control Room</span>
            </a>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-muted/60 border border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Asansol District Hospital Desk: 0341-2202611</span>
            <a
              href="tel:03412202611"
              className="font-bold text-primary hover:underline"
            >
              Call Hospital Desk
            </a>
          </div>
        </section>

        {/* Public Access Notice */}
        <footer className="text-center py-4 text-xs text-muted-foreground">
          <p>
            KindLink Emergency SOS • Open for emergency responders without login • Asansol, West
            Bengal
          </p>
        </footer>
      </main>
    </div>
  );
}
