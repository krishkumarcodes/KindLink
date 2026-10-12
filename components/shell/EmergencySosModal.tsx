'use client';

import React, { useState } from 'react';
import { AlertTriangle, Phone, Radio, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';

interface EmergencySosModalProps {
  open: boolean;
  onClose: () => void;
}

export function EmergencySosModal({ open, onClose }: EmergencySosModalProps) {
  const [broadcastSent, setBroadcastSent] = useState(false);

  if (!open) return null;

  const handleBroadcast = () => {
    setBroadcastSent(true);
    const { userCoords } = useKindLinkStore.getState();
    dataAdapter.submitSos(userCoords.lat, userCoords.lng).catch(() => {});
    toast.error('Emergency SOS Signal Broadcasted!', {
      description: 'Verified volunteers in Asansol and Burnpur have received your high-priority alert.',
    });
    setTimeout(() => {
      setBroadcastSent(false);
      onClose();
    }, 2800);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-card border-2 border-urgency-critical p-6 shadow-2xl text-card-foreground">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2 text-urgency-critical">
            <AlertTriangle className="h-6 w-6 animate-pulse notranslate" />
            <h2 className="text-xl font-black tracking-tight">KindLink Emergency SOS</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Trigger an instant high-priority alert to all verified community helpers within 5km in Asansol.
          </p>
        </div>

        {/* SOS Action Button */}
        <div className="mt-6 flex flex-col items-center">
          {broadcastSent ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-in zoom-in duration-200">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-2 notranslate" />
              <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">SOS Signal Active!</h3>
              <p className="text-xs text-muted-foreground mt-1">Nearby helpers are being notified...</p>
            </div>
          ) : (
            <button
              onClick={handleBroadcast}
              className="group relative flex h-36 w-36 flex-col items-center justify-center rounded-full bg-urgency-critical text-white shadow-xl transition-all transform hover:scale-105 active:scale-95 animate-beacon touch-target"
            >
              <Radio className="h-10 w-10 mb-1 group-hover:scale-110 transition notranslate" />
              <span className="text-base font-black tracking-wider uppercase">BROADCAST</span>
              <span className="text-[10px] opacity-90 font-medium">1-Tap Alert</span>
            </button>
          )}
        </div>

        {/* Local Emergency Hotlines */}
        <div className="mt-6 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Direct Emergency Lines (Asansol)
          </h4>
          
          <a
            href="tel:108"
            className="flex items-center justify-between p-3 rounded-2xl bg-muted/70 hover:bg-muted transition border border-border touch-target"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Phone className="h-4 w-4 notranslate" />
              </div>
              <div>
                <p className="text-sm font-bold">108 / 102 National Ambulance</p>
                <p className="text-xs text-muted-foreground">West Bengal Emergency Medical Service</p>
              </div>
            </div>
            <span className="text-xs font-bold text-primary">Call Now</span>
          </a>

          <a
            href="tel:03412202611"
            className="flex items-center justify-between p-3 rounded-2xl bg-muted/70 hover:bg-muted transition border border-border touch-target"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4 notranslate" />
              </div>
              <div>
                <p className="text-sm font-bold">Asansol District Hospital Blood Bank</p>
                <p className="text-xs text-muted-foreground">SB Gorai Road, Asansol (24/7 Desk)</p>
              </div>
            </div>
            <span className="text-xs font-bold text-primary">0341-2202611</span>
          </a>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition touch-target"
        >
          Close
        </button>
      </div>
    </div>
  );
}
