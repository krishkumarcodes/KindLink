'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Crosshair,
  RotateCcw,
  Search,
  Check,
  X,
  Building2,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
}

interface LocalityPreset {
  name: string;
  subtext: string;
  lat: number;
  lng: number;
}

const ASANSOL_LOCALITIES: LocalityPreset[] = [
  {
    name: 'Asansol Engineering College, Kalyanpur',
    subtext: 'Primary Hub · AEC Campus',
    lat: ASANSOL_CENTER.lat,
    lng: ASANSOL_CENTER.lng,
  },
  {
    name: 'Asansol District Hospital / Court',
    subtext: 'SB Gorai Road · Central Medical Hub',
    lat: 23.6845,
    lng: 86.9742,
  },
  {
    name: 'Ushagram & GT Road',
    subtext: 'HLG Hospital Area · South Asansol',
    lat: 23.6791,
    lng: 86.983,
  },
  {
    name: 'Burnpur & IISCO Steel Town',
    subtext: 'Riverside · West Asansol',
    lat: 23.6667,
    lng: 86.9333,
  },
  {
    name: 'Raniganj Bazar & Coalfield Belt',
    subtext: 'East Highway Corridor · 18km',
    lat: 23.6238,
    lng: 87.1128,
  },
  {
    name: 'Kulti, Neamatpur & Barakar',
    subtext: 'Border Zone · West Corridor',
    lat: 23.7314,
    lng: 86.8488,
  },
  {
    name: 'Durgapur City Center',
    subtext: 'Neighboring Industrial Metro',
    lat: 23.5204,
    lng: 87.3119,
  },
];

export function LocationModal({ open, onClose }: LocationModalProps) {
  const { userCoords, userAreaName, setUserCoords, setUserAreaName } = useKindLinkStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  if (!open) return null;

  // GPS Locate Me handler with reverse geocoding
  const handleGpsLocate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by this browser', {
        description: 'Defaulting to Asansol Engineering College hub.',
      });
      return;
    }

    setIsLocating(true);
    toast.info('Acquiring live GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let detectedArea = 'Live GPS Location';

        // Attempt lightweight reverse geocoding
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const locality =
              addr.suburb ||
              addr.neighbourhood ||
              addr.residential ||
              addr.city_district ||
              addr.city ||
              addr.town ||
              addr.village ||
              addr.county ||
              '';
            const state = addr.state_code || addr.state || '';
            if (locality) {
              detectedArea = state ? `${locality}, ${state}` : locality;
            } else if (data.display_name) {
              const parts = data.display_name.split(',');
              detectedArea = parts.slice(0, 2).join(',').trim();
            }
          }
        } catch {
          // If reverse geocoding network fails, fall back to localized string
          detectedArea = `GPS (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`;
        }

        setUserCoords({ lat: latitude, lng: longitude, isLive: true }, detectedArea);
        setIsLocating(false);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }
        toast.success(`Location updated to ${detectedArea}!`, {
          description: 'Recalculated nearest mutual aid requests in real time.',
        });
        onClose();
      },
      () => {
        setIsLocating(false);
        toast.warning('GPS permission denied or unavailable', {
          description: 'Staying at current locality.',
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Recenter to Default AEC Hub
  const handleRecenterDefault = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    setUserCoords(
      { lat: ASANSOL_CENTER.lat, lng: ASANSOL_CENTER.lng, isLive: false },
      'Asansol Engineering College, Kalyanpur'
    );
    toast.success('Recentered to Asansol Engineering College Hub');
    onClose();
  };

  // Select Preset Locality
  const handleSelectPreset = (preset: LocalityPreset) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    setUserCoords({ lat: preset.lat, lng: preset.lng, isLive: false }, preset.name);
    toast.success(`Location set to ${preset.name}`);
    onClose();
  };

  // Custom Search Query Submit
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    setUserAreaName(query);
    toast.success(`Location updated to "${query}"`);
    setSearchQuery('');
    onClose();
  };

  const filteredLocalities = ASANSOL_LOCALITIES.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.subtext.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-card/95 dark:bg-slate-950/95 border border-border/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-card-foreground max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <MapPin className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 id="location-dialog-title" className="text-base sm:text-lg font-bold text-foreground">
                Change Area or Recenter
              </h2>
              <p className="text-xs text-muted-foreground">
                Current:{' '}
                <span className="font-semibold text-primary">
                  {userAreaName || 'Asansol, WB'}
                </span>
                {userCoords.isLive && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live GPS
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target transition-colors"
            aria-label="Close location selector"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* GPS Quick Action Row */}
        <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0 border-b border-border/60">
          <button
            type="button"
            onClick={handleGpsLocate}
            disabled={isLocating}
            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/25 hover:shadow-teal-600/35 active:scale-[0.98] transition-all min-h-[46px] touch-target disabled:opacity-60"
          >
            {isLocating ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4 shrink-0 notranslate" />
            )}
            <span>{isLocating ? 'Acquiring GPS...' : 'Use My GPS Location'}</span>
          </button>

          <button
            type="button"
            onClick={handleRecenterDefault}
            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/80 hover:border-primary/40 text-foreground font-semibold text-xs sm:text-sm transition-all min-h-[46px] touch-target active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4 text-primary shrink-0 notranslate" />
            <span>Reset to AEC Hub</span>
          </button>
        </div>

        {/* Search Input for filtering or custom locality */}
        <form onSubmit={handleCustomSubmit} className="pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground notranslate pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or enter area name (e.g. Ushagram, Burnpur)..."
              className="w-full pl-10 pr-20 py-2.5 rounded-2xl border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[44px] transition-all"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold hover:from-teal-500 hover:to-emerald-500 transition-all touch-target shadow-xs"
              >
                Set
              </button>
            )}
          </div>
        </form>

        {/* Localities Preset List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
            Asansol &amp; Nearby Neighborhoods
          </div>

          {filteredLocalities.map((preset) => {
            const isSelected =
              userAreaName === preset.name ||
              (Math.abs(userCoords.lat - preset.lat) < 0.002 &&
                Math.abs(userCoords.lng - preset.lng) < 0.002);

            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`flex w-full items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-150 touch-target ${
                  isSelected
                    ? 'border-primary bg-primary/10 dark:bg-teal-500/15 text-foreground font-semibold ring-2 ring-primary/25 shadow-xs'
                    : 'border-border/80 bg-card/70 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-primary/40 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                      isSelected
                        ? 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-[0_0_8px_rgba(13,148,136,0.3)]'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Building2 className="h-4 w-4 notranslate" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold truncate text-foreground">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {preset.subtext}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary shrink-0 notranslate stroke-[2.5]" />
                )}
              </button>
            );
          })}

          {filteredLocalities.length === 0 && searchQuery.trim() && (
            <div className="text-center py-6 px-4 rounded-2xl bg-muted/40 border border-border/80">
              <p className="text-xs text-muted-foreground mb-3">
                No preset matching &ldquo;{searchQuery}&rdquo;. Set this as your custom location name?
              </p>
              <button
                type="button"
                onClick={() => {
                  setUserAreaName(searchQuery.trim());
                  toast.success(`Location set to "${searchQuery.trim()}"`);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold hover:from-teal-500 hover:to-emerald-500 transition-all shadow-sm"
              >
                Use &ldquo;{searchQuery.trim()}&rdquo;
              </button>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="pt-3 border-t border-border/80 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Navigation className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
            <span>Hyperlocal radius: 1km &ndash; 25km</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
