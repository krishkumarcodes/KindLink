'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  HeartPulse,
  AlertOctagon,
  MapPin,
  MessageSquare,
  Clock,
  Volume2,
  Shield,
  Sparkles,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/components/ui/OverlayPortal';

export interface NotificationSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationSettingsSheet({ open, onClose }: NotificationSettingsSheetProps) {
  useBodyScrollLock(open);

  // Permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Notification types
  const [bloodAlerts, setBloodAlerts] = useState(true);
  const [sosAlerts, setSosAlerts] = useState(true);
  const [nearbyRequests, setNearbyRequests] = useState(true);
  const [nearbyDistanceKm, setNearbyDistanceKm] = useState(5);
  const [repliesAlerts, setRepliesAlerts] = useState(true);
  const [updatesAlerts, setUpdatesAlerts] = useState(true);
  const [soundSirens, setSoundSirens] = useState(true);

  // Quiet hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    try {
      const getPref = (key: string, def: boolean) => {
        const val = localStorage.getItem(key);
        return val !== null ? val === 'true' : def;
      };

      setBloodAlerts(getPref('kindlink_notif_blood', true));
      setSosAlerts(getPref('kindlink_notif_sos', true));
      setNearbyRequests(getPref('kindlink_notif_nearby', true));
      setRepliesAlerts(getPref('kindlink_notif_replies', true));
      setUpdatesAlerts(getPref('kindlink_notif_updates', true));
      setSoundSirens(getPref('kindlink_notif_sound', true));
      setQuietHoursEnabled(getPref('kindlink_quiet_hours_enabled', false));

      const rad = localStorage.getItem('kindlink_notif_radius');
      if (rad) setNearbyDistanceKm(Number(rad));

      const qStart = localStorage.getItem('kindlink_quiet_hours_start');
      if (qStart) setQuietHoursStart(qStart);

      const qEnd = localStorage.getItem('kindlink_quiet_hours_end');
      if (qEnd) setQuietHoursEnd(qEnd);
    } catch {}
  }, [open]);

  const savePref = (key: string, val: any) => {
    try {
      localStorage.setItem(key, String(val));
    } catch {}
  };

  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push notifications are not supported on this browser.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        toast.success('Notification permission granted!');
        try {
          new Notification('KindLink Community', {
            body: 'You are now ready to receive live community alerts.',
            icon: '/icon.svg',
          });
        } catch {}
      } else if (perm === 'denied') {
        toast.error('Notification permission was blocked in browser settings.');
      }
    } catch {
      toast.error('Could not request notification permission.');
    }
  };

  const handleSendTestNotification = () => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('KindLink Community Alert', {
          body: 'Test alert: Emergency blood, volunteer offers, and neighbor updates will appear here.',
          icon: '/icon.svg',
        });
      } catch {}
    }
    toast.success('Test notification sent!', {
      description: 'Alerts will appear on your device when neighbors respond.',
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Notification Settings"
    >
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg max-h-[85dvh] flex flex-col rounded-3xl bg-card text-card-foreground border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 px-5 py-4 border-b border-border bg-card shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bell className="h-4.5 w-4.5 notranslate" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Notification Settings
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage alerts, radius, and quiet hours
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition touch-target"
            aria-label="Close notification settings"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Scrollable Middle Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          {/* Push Status Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Browser Push Alerts</span>
                <p className="text-[11px] text-muted-foreground">
                  Receive instant alerts even when the app is in the background
                </p>
              </div>

              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                <span className="capitalize">
                  {notificationPermission === 'granted'
                    ? 'Enabled'
                    : notificationPermission === 'denied'
                    ? 'Blocked'
                    : 'Not enabled'}
                </span>
              </span>
            </div>

            {notificationPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPushPermission}
                className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs touch-target"
              >
                Enable Browser Notifications
              </button>
            )}
          </div>

          {/* Section: Notification Types */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Notification Types
            </h4>

            {/* 1. Emergency & SOS */}
            <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <HeartPulse className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Emergency &amp; SOS Alerts</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600">
                      Critical
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    Urgent blood requests, platelet needs, and neighbor distress beacons
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={sosAlerts && bloodAlerts}
                onChange={(e) => {
                  const val = e.target.checked;
                  setSosAlerts(val);
                  setBloodAlerts(val);
                  savePref('kindlink_notif_sos', val);
                  savePref('kindlink_notif_blood', val);
                }}
                className="h-5 w-5 rounded text-primary focus:ring-primary shrink-0 cursor-pointer"
                aria-label="Toggle emergency and SOS alerts"
              />
            </div>

            {/* 2. New Requests Near You with Radius */}
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 notranslate" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-xs font-bold text-foreground">New Requests Near You</span>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      Community requests for study gear, companion help, and essentials
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={nearbyRequests}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setNearbyRequests(val);
                    savePref('kindlink_notif_nearby', val);
                  }}
                  className="h-5 w-5 rounded text-primary focus:ring-primary shrink-0 cursor-pointer"
                  aria-label="Toggle nearby request alerts"
                />
              </div>

              {nearbyRequests && (
                <div className="pt-2 border-t border-border/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-bold text-muted-foreground">Alert radius:</span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 5, 10].map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => {
                          setNearbyDistanceKm(km);
                          savePref('kindlink_notif_radius', km);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition touch-target ${
                          nearbyDistanceKm === km
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {km} km
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Replies & Offers */}
            <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Replies to Requests &amp; Offers</span>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    When neighbors offer to help or confirm aid handover
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={repliesAlerts}
                onChange={(e) => {
                  const val = e.target.checked;
                  setRepliesAlerts(val);
                  savePref('kindlink_notif_replies', val);
                }}
                className="h-5 w-5 rounded text-primary focus:ring-primary shrink-0 cursor-pointer"
                aria-label="Toggle replies and offers alerts"
              />
            </div>

            {/* 4. Updates & Badges */}
            <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Community Updates &amp; Badges</span>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    Trust verification updates, earned badges, and milestone announcements
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={updatesAlerts}
                onChange={(e) => {
                  const val = e.target.checked;
                  setUpdatesAlerts(val);
                  savePref('kindlink_notif_updates', val);
                }}
                className="h-5 w-5 rounded text-primary focus:ring-primary shrink-0 cursor-pointer"
                aria-label="Toggle updates and badges alerts"
              />
            </div>
          </div>

          {/* Section: Quiet Hours */}
          <div className="p-3.5 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Quiet Hours</span>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    Mutes non-emergency notifications while you rest. Critical SOS alerts always bypass quiet hours.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setQuietHoursEnabled(val);
                  savePref('kindlink_quiet_hours_enabled', val);
                }}
                className="h-5 w-5 rounded text-primary focus:ring-primary shrink-0 cursor-pointer"
                aria-label="Toggle quiet hours"
              />
            </div>

            {quietHoursEnabled && (
              <div className="pt-2 border-t border-border/80 flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground">From:</span>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => {
                      setQuietHoursStart(e.target.value);
                      savePref('kindlink_quiet_hours_start', e.target.value);
                    }}
                    className="px-2 py-1 rounded-lg border border-border bg-background text-foreground font-mono text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground">To:</span>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => {
                      setQuietHoursEnd(e.target.value);
                      savePref('kindlink_quiet_hours_end', e.target.value);
                    }}
                    className="px-2 py-1 rounded-lg border border-border bg-background text-foreground font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Notification Action */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="px-3.5 py-2 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition touch-target flex items-center justify-center gap-2"
            >
              <Bell className="h-4 w-4 text-primary notranslate" />
              <span>Send test notification</span>
            </button>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-teal-600 notranslate shrink-0" />
              <span>Tokens encrypted &amp; private</span>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-20 p-4 border-t border-border bg-card shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-xs touch-target"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
