'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Moon,
  Sun,
  Monitor,
  Type,
  Bell,
  Volume2,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Download,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  HeartPulse,
  AlertOctagon,
  MessageSquare,
  Clock,
  Shield,
  Layers,
  ExternalLink,
  MapPin,
  X,
  Sliders,
  Radio,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { LanguageModal } from '../shell/LanguageModal';
import { InstallAppModal } from '@/components/pwa/InstallAppModal';
import { usePwaInstall } from '@/lib/pwa/usePwaInstall';
import {
  getCurrentLanguageCode,
  SUPPORTED_LANGUAGES,
} from '@/lib/translate/googleTranslate';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { SwitchRow } from '@/components/ui/Switch';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { userProfile, updateUserProfile } = useKindLinkStore();
  const {
    isInstalled,
    triggerInstall,
    isModalOpen: pwaModalOpen,
    closeInstallModal: closePwaModal,
  } = usePwaInstall();

  // Modals
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showUnblockGuide, setShowUnblockGuide] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  // Text size state ('compact' | 'normal' | 'large')
  const [textSize, setTextSize] = useState<'compact' | 'normal' | 'large'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_text_size');
      if (saved === 'compact' || saved === 'large' || saved === 'normal') return saved;
    }
    return userProfile.textSize || 'normal';
  });

  // Reduce motion state
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_reduce_motion');
      if (saved !== null) return saved === 'true';
    }
    return userProfile.reduceMotion || false;
  });

  // Language state
  const [langCode, setLangCode] = useState(() => getCurrentLanguageCode());

  // Notification toggles & preferences
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [bloodAlerts, setBloodAlerts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_notif_blood');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [sosAlerts, setSosAlerts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_notif_sos');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [nearbyRequests, setNearbyRequests] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_notif_nearby');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [nearbyDistanceKm, setNearbyDistanceKm] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_notif_radius');
      if (saved) return Number(saved);
    }
    return 5;
  });
  const [repliesAlerts, setRepliesAlerts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_notif_replies');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [soundSirens, setSoundSirens] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_notif_sound');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // Quiet hours
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_quiet_hours_enabled');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });
  const [quietHoursStart, setQuietHoursStart] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kindlink_quiet_hours_start') || '22:00';
    }
    return '22:00';
  });
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kindlink_quiet_hours_end') || '07:00';
    }
    return '07:00';
  });


  // Sign out other devices loading
  const [revokingOthers, setRevokingOthers] = useState(false);

  // Deletion request status
  const [deletionStatus, setDeletionStatus] = useState<{
    id?: string;
    status: 'pending' | 'approved' | 'denied' | 'none';
    reason?: string;
    adminNote?: string;
    createdAt?: string;
  }>({ status: 'none' });
  const [isLastAdmin, setIsLastAdmin] = useState(false);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);

  // Emergency SOS Sharing Privacy (Profile > Settings > Emergency)
  // Off by default except Name and Live Location
  const [emergencySharePhone, setEmergencySharePhone] = useState<boolean>(() => {
    if (userProfile.emergencyPrivacy?.sharePhone !== undefined) {
      return Boolean(userProfile.emergencyPrivacy.sharePhone);
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_emergency_share_phone');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const [emergencyShareBlood, setEmergencyShareBlood] = useState<boolean>(() => {
    if (userProfile.emergencyPrivacy?.shareBloodGroup !== undefined) {
      return Boolean(userProfile.emergencyPrivacy.shareBloodGroup);
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_emergency_share_blood');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const [emergencyBloodGroup, setEmergencyBloodGroup] = useState<string>(() => {
    return userProfile.bloodGroup || '';
  });

  const [emergencyShareMedical, setEmergencyShareMedical] = useState<boolean>(() => {
    if (userProfile.emergencyPrivacy?.shareMedicalNote !== undefined) {
      return Boolean(userProfile.emergencyPrivacy.shareMedicalNote);
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_emergency_share_medical');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  const [emergencyMedicalNote, setEmergencyMedicalNote] = useState<string>(() => {
    return userProfile.emergencyPrivacy?.medicalNote || '';
  });

  const handleToggleEmergencyPhone = (checked: boolean) => {
    setEmergencySharePhone(checked);
    try { localStorage.setItem('kindlink_emergency_share_phone', String(checked)); } catch {}
    updateUserProfile({
      emergencyPrivacy: {
        ...(userProfile.emergencyPrivacy || {}),
        sharePhone: checked,
        shareBloodGroup: emergencyShareBlood,
        shareMedicalNote: emergencyShareMedical,
        medicalNote: emergencyMedicalNote,
      },
    });
    toast.success(`Emergency phone sharing ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleToggleEmergencyBlood = (checked: boolean) => {
    setEmergencyShareBlood(checked);
    try { localStorage.setItem('kindlink_emergency_share_blood', String(checked)); } catch {}
    updateUserProfile({
      bloodGroup: emergencyBloodGroup,
      emergencyPrivacy: {
        ...(userProfile.emergencyPrivacy || {}),
        sharePhone: emergencySharePhone,
        shareBloodGroup: checked,
        shareMedicalNote: emergencyShareMedical,
        medicalNote: emergencyMedicalNote,
      },
    });
    toast.success(`Emergency blood group sharing ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleBloodGroupSelect = (group: string) => {
    setEmergencyBloodGroup(group);
    updateUserProfile({
      bloodGroup: group,
      emergencyPrivacy: {
        ...(userProfile.emergencyPrivacy || {}),
        sharePhone: emergencySharePhone,
        shareBloodGroup: emergencyShareBlood,
        shareMedicalNote: emergencyShareMedical,
        medicalNote: emergencyMedicalNote,
      },
    });
    toast.success(`Blood group set to ${group}`);
  };

  const handleToggleEmergencyMedical = (checked: boolean) => {
    setEmergencyShareMedical(checked);
    try { localStorage.setItem('kindlink_emergency_share_medical', String(checked)); } catch {}
    updateUserProfile({
      emergencyPrivacy: {
        ...(userProfile.emergencyPrivacy || {}),
        sharePhone: emergencySharePhone,
        shareBloodGroup: emergencyShareBlood,
        shareMedicalNote: checked,
        medicalNote: emergencyMedicalNote,
      },
    });
    toast.success(`Emergency medical note sharing ${checked ? 'enabled' : 'disabled'}`);
  };

  const handleMedicalNoteChange = (text: string) => {
    const trimmed = text.slice(0, 200);
    setEmergencyMedicalNote(trimmed);
    updateUserProfile({
      emergencyPrivacy: {
        ...(userProfile.emergencyPrivacy || {}),
        sharePhone: emergencySharePhone,
        shareBloodGroup: emergencyShareBlood,
        shareMedicalNote: emergencyShareMedical,
        medicalNote: trimmed,
      },
    });
  };

  // Sync language listener
  useEffect(() => {
    setLangCode(getCurrentLanguageCode());
    const onLocaleChange = (e: Event) => {
      const custom = e as CustomEvent<{ locale?: string }>;
      if (custom.detail?.locale) {
        setLangCode(custom.detail.locale);
      }
    };
    window.addEventListener('kindlink:locale-change', onLocaleChange);
    return () => window.removeEventListener('kindlink:locale-change', onLocaleChange);
  }, [langModalOpen]);

  // Sync Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  // Fetch deletion status & admin role
  const fetchDeletionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/delete-account');
      if (res.ok) {
        const data = await res.json();
        if (data.request) {
          setDeletionStatus(data.request);
        } else {
          setDeletionStatus({ status: 'none' });
        }
        setIsLastAdmin(Boolean(data.isLastAdmin));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchDeletionStatus();
  }, [fetchDeletionStatus]);

  // Text size change handler
  const handleTextSizeChange = (size: 'compact' | 'normal' | 'large') => {
    setTextSize(size);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-text-size', size);
      if (size === 'compact') {
        document.documentElement.style.fontSize = '14px';
      } else if (size === 'large') {
        document.documentElement.style.fontSize = '18.5px';
      } else {
        document.documentElement.style.fontSize = '16px';
      }
      try {
        localStorage.setItem('kindlink_text_size', size);
      } catch {}
    }
    updateUserProfile({ textSize: size });
    toast.success(
      `Text size set to ${
        size === 'large' ? 'Elderly Large' : size === 'compact' ? 'Compact' : 'Standard'
      }`
    );
  };

  // Reduce motion change handler
  const handleReduceMotionToggle = (enabled: boolean) => {
    setReduceMotion(enabled);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-reduce-motion', enabled ? 'true' : 'false');
      try {
        localStorage.setItem('kindlink_reduce_motion', enabled ? 'true' : 'false');
      } catch {}
    }
    updateUserProfile({ reduceMotion: enabled });
    toast.success(`Reduced motion ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Notification preference savers
  const saveNotifPref = (key: string, val: any) => {
    try {
      localStorage.setItem(key, String(val));
    } catch {}
  };

  // Request browser push notification permission
  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push notifications are not supported on this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
        setShowUnblockGuide(false);
      } else if (permission === 'denied') {
        toast.error('Notification permission was blocked in browser settings.');
        setShowUnblockGuide(true);
      }
    } catch {
      toast.error('Could not request notification permission.');
    }
  };

  // Send test notification
  const handleSendTestNotification = () => {
    // 1. Play sound if audio alerts enabled
    if (soundSirens && typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {}
    }

    // 2. Trigger native Notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('KindLink Test Alert', {
          body: 'This is a test notification. Emergency blood and community help alerts will appear here.',
          icon: '/icon.svg',
          tag: 'kindlink-test',
        });
      } catch {}
    }

    // 3. Always show in-app toast preview
    toast.success('Test notification sent! Alerts will appear on your device when neighbors respond.', {
      duration: 4000,
      icon: <Bell className="h-4 w-4 text-primary notranslate" />,
    });
  };

  // Sign out of all other devices
  const handleSignOutOtherDevices = async () => {
    setRevokingOthers(true);
    try {
      const res = await fetch('/api/auth/sign-out-others', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to sign out other devices.');
      } else {
        toast.success('Signed out of all other devices! Your current session remains active.');
      }
    } catch {
      toast.error('Network error revoking other sessions.');
    } finally {
      setRevokingOthers(false);
    }
  };

  // Cancel deletion request
  const handleCancelDeletion = async () => {
    setCancellingDeletion(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to cancel deletion request.');
      } else {
        toast.success('Account deletion request has been cancelled.');
        fetchDeletionStatus();
      }
    } catch {
      toast.error('Network error cancelling deletion request.');
    } finally {
      setCancellingDeletion(false);
    }
  };

  // PWA install trigger
  const handleInstallPwa = async () => {
    await triggerInstall();
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);

  return (
    <div className="flex-1 space-y-3.5 sm:space-y-4 px-3 sm:px-4 py-4 sm:py-6 max-w-4xl mx-auto w-full pb-36 lg:pb-16 text-foreground">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Settings &amp; Security
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Customise appearance, text size, notifications, password, and privacy settings.
        </p>
      </div>

      <div className="space-y-3.5 sm:space-y-4">
        {/* =========================================================================
            1. APPEARANCE THEME (Light, Dark, System)
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Sun className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Appearance Theme</h2>
              <p className="text-xs text-muted-foreground">
                Choose a comfortable theme for daytime or night use
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = theme === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setTheme(m.id)}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-2 touch-target ${
                    isSelected
                      ? 'border-primary bg-primary text-white shadow-soft ring-2 ring-primary/20'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                  aria-pressed={isSelected}
                >
                  <Icon className="h-4 w-4 notranslate shrink-0" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            2. TEXT SIZE & READABILITY (Compact, Standard, Elderly Large)
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
              <Type className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Text Size
              </h2>
              <p className="text-xs text-muted-foreground">
                Make text easier to read across KindLink.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {[
              { id: 'compact' as const, label: 'Compact (14px)', desc: 'High density information view' },
              { id: 'normal' as const, label: 'Standard (16px)', desc: 'Balanced community default' },
              { id: 'large' as const, label: 'Elderly Large (18.5px)', desc: 'High visibility & ≥52px touch' },
            ].map((s) => {
              const isSelected = textSize === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleTextSizeChange(s.id)}
                  className={`p-3.5 rounded-2xl border text-left transition touch-target flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-bold'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">{s.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary notranslate shrink-0" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">{s.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Live Readability Preview
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-foreground leading-relaxed">
                Emergency Blood Request: <strong>O+ needed at Asansol District Hospital</strong> (1.2 km away)
              </p>
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-xs touch-target shrink-0 self-start sm:self-center"
              >
                Sample Button
              </button>
            </div>
          </div>

          {/* Reduce Motion Switch Row */}
          <div className="pt-2">
            <SwitchRow
              id="reduce-motion-switch"
              checked={reduceMotion}
              onCheckedChange={handleReduceMotionToggle}
              label="Reduce Animations & Motion"
              description="Disables animations and transitions across the app."
              icon={<Sliders className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* =========================================================================
            3. LANGUAGE SELECTOR & PERSISTENCE
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600">
              <Globe className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Language / भाषा / ভাষা</h2>
              <p className="text-xs text-muted-foreground notranslate">
                Active: <span className="font-bold text-foreground">{currentLang?.nativeName || 'English'}</span> ({currentLang?.name || 'English'})
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Your choice is saved on this device and your account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLangModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-background border border-border text-xs font-bold text-primary hover:bg-muted transition shadow-xs touch-target self-start sm:self-auto shrink-0"
          >
            Change Language
          </button>
        </div>

        {/* =========================================================================
            4. PUSH NOTIFICATIONS & REAL-TIME ALERTS (REDESIGNED)
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft space-y-3.5">
          {/* Header & Status Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
                <Bell className="h-5 w-5 notranslate" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Push Notifications &amp; Alerts</h2>
                <p className="text-xs text-muted-foreground">
                  Get alerts for urgent help and community requests near you
                </p>
              </div>
            </div>

            {/* Permission Status Pill & Action */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <span
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                <span>
                  {notificationPermission === 'granted'
                    ? 'Allowed'
                    : notificationPermission === 'denied'
                    ? 'Blocked'
                    : 'Not asked yet'}
                </span>
              </span>

              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition touch-target"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          </div>

          {/* If Blocked: Step-by-step unblock instructions for Chrome and Safari */}
          {(notificationPermission === 'denied' || showUnblockGuide) && (
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 notranslate shrink-0" />
                  <strong className="text-xs font-bold text-rose-700 dark:text-rose-300">
                    Notifications are currently blocked by your browser
                  </strong>
                </div>
                <button
                  onClick={() => setShowUnblockGuide(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Dismiss guide"
                >
                  <X className="h-4 w-4 notranslate" />
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                To receive urgent blood and emergency alerts, turn on notifications using these steps:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                {/* Android Chrome */}
                <div className="p-3 rounded-xl bg-background border border-border space-y-1.5">
                  <span className="font-bold text-foreground block flex items-center gap-1.5">
                    <span>🤖</span> Android / Chrome:
                  </span>
                  <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1">
                    <li>Tap the <strong>tune/lock icon</strong> (🔒) on the left side of the address bar.</li>
                    <li>Tap <strong>Permissions</strong> &rarr; <strong>Notifications</strong>.</li>
                    <li>Toggle switch to <strong>Allow</strong>.</li>
                  </ol>
                </div>

                {/* iPhone / Safari */}
                <div className="p-3 rounded-xl bg-background border border-border space-y-1.5">
                  <span className="font-bold text-foreground block flex items-center gap-1.5">
                    <span>🍏</span> iPhone / Safari:
                  </span>
                  <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1">
                    <li>Open your device <strong>Settings</strong> app.</li>
                    <li>Scroll down and tap <strong>Safari</strong> (or <strong>KindLink</strong> if installed as PWA).</li>
                    <li>Tap <strong>Notifications</strong> &rarr; switch to <strong>Allow Notifications</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Switch rows */}
          <div className="space-y-3 pt-1">
            {/* 1. Emergency blood & urgent medical */}
            <SwitchRow
              id="notif-blood-switch"
              checked={bloodAlerts}
              onCheckedChange={(checked) => {
                setBloodAlerts(checked);
                saveNotifPref('kindlink_notif_blood', checked);
                toast.success(`Emergency blood alerts ${checked ? 'enabled' : 'disabled'}`);
              }}
              label="Emergency alerts near you"
              description="Urgent alerts for emergency blood requests, platelet needs, and hospital transport."
              icon={<HeartPulse className="h-4 w-4 text-rose-500" />}
              badge={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  Critical
                </span>
              }
            />

            {/* 2. SOS from neighbours */}
            <SwitchRow
              id="notif-sos-switch"
              checked={sosAlerts}
              onCheckedChange={(checked) => {
                setSosAlerts(checked);
                saveNotifPref('kindlink_notif_sos', checked);
                toast.success(`SOS distress alerts ${checked ? 'enabled' : 'disabled'}`);
              }}
              label="SOS from neighbours"
              description="Instant emergency alert when a verified neighbor in your area asks for help."
              icon={<AlertOctagon className="h-4 w-4 text-amber-500" />}
              badge={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Urgent
                </span>
              }
            />

            {/* 3. New requests near you with Distance Picker */}
            <div className="p-3.5 rounded-2xl border border-border bg-background space-y-3">
              <SwitchRow
                id="notif-nearby-switch"
                checked={nearbyRequests}
                onCheckedChange={(checked) => {
                  setNearbyRequests(checked);
                  saveNotifPref('kindlink_notif_nearby', checked);
                  toast.success(`Nearby request alerts ${checked ? 'enabled' : 'disabled'}`);
                }}
                label="New requests near you"
                description="Community requests within your chosen distance (study materials, elder care, mobility items)."
                icon={<MapPin className="h-4 w-4 text-teal-600" />}
                className="p-0 border-0 bg-transparent hover:bg-transparent"
              />

              {nearbyRequests && (
                <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Alert Radius Distance:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 2, 5, 10].map((km) => {
                      const isSelected = nearbyDistanceKm === km;
                      return (
                        <button
                          key={km}
                          type="button"
                          onClick={() => {
                            setNearbyDistanceKm(km);
                            saveNotifPref('kindlink_notif_radius', km);
                            toast.success(`Alert radius set to ${km} km`);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition touch-target ${
                            isSelected
                              ? 'bg-primary text-white shadow-soft ring-1 ring-primary/30'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {km} km
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Replies to my requests and offers */}
            <SwitchRow
              id="notif-replies-switch"
              checked={repliesAlerts}
              onCheckedChange={(checked) => {
                setRepliesAlerts(checked);
                saveNotifPref('kindlink_notif_replies', checked);
                toast.success(`Task reply alerts ${checked ? 'enabled' : 'disabled'}`);
              }}
              label="Replies to my requests and offers"
              description="Notifications when community neighbors offer help or respond to your requests."
              icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
            />

            {/* 5. Alert sound when KindLink is open */}
            <SwitchRow
              id="notif-sound-switch"
              checked={soundSirens}
              onCheckedChange={(checked) => {
                setSoundSirens(checked);
                saveNotifPref('kindlink_notif_sound', checked);
                toast.success(`In-app alert sound ${checked ? 'enabled' : 'muted'}`);
              }}
              label="Alert sound when KindLink is open"
              description="Plays a sound when KindLink is open. (Phones control sound and vibration when the browser is closed)."
              icon={<Volume2 className="h-4 w-4 text-indigo-500" />}
            />
          </div>

          {/* Quiet hours for non-emergency alerts */}
          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-3">
            <SwitchRow
              id="quiet-hours-switch"
              checked={quietHoursEnabled}
              onCheckedChange={(checked) => {
                setQuietHoursEnabled(checked);
                saveNotifPref('kindlink_quiet_hours_enabled', checked);
                toast.success(`Quiet hours ${checked ? 'enabled' : 'disabled'}`);
              }}
              label="Quiet hours for non-emergency alerts"
              description="Pauses regular notifications during your sleep hours. Emergency blood requests and neighbor SOS alerts always bypass quiet hours."
              icon={<Clock className="h-4 w-4 text-purple-500" />}
              className="p-0 border-0 bg-transparent hover:bg-transparent"
            />

            {quietHoursEnabled && (
              <div className="pt-2 border-t border-border/80 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground">From:</span>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => {
                      setQuietHoursStart(e.target.value);
                      saveNotifPref('kindlink_quiet_hours_start', e.target.value);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-border bg-card text-foreground font-mono text-xs focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground">To:</span>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => {
                      setQuietHoursEnd(e.target.value);
                      saveNotifPref('kindlink_quiet_hours_end', e.target.value);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-border bg-card text-foreground font-mono text-xs focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test Notification Button & Privacy Note */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border">
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-primary transition touch-target self-start sm:self-auto"
            >
              <Bell className="h-4 w-4 notranslate" />
              <span>Send me a test notification</span>
            </button>

            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-teal-600 notranslate shrink-0" />
              <span>Your notification tokens are encrypted and your exact GPS location is never shared.</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. EMERGENCY SOS & PRIVACY SETTINGS
           ========================================================================= */}
        <div id="emergency" className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft space-y-3.5 scroll-mt-24">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Radio className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Emergency SOS &amp; Sharing Privacy
              </h2>
              <p className="text-xs text-muted-foreground">
                Control what optional personal details are shared with responders during an active SOS beacon
              </p>
            </div>
          </div>

          {/* Core Distress Beacon Note (Always Shared) */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 notranslate" />
                <span>Core Distress Beacon (Always Shared)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                Always active
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your <strong>Full Name</strong> and <strong>Live GPS Location</strong> are always broadcasted so verified emergency volunteers and first responders can find and reach you.
            </p>
          </div>

          {/* Toggle Switches for Optional Sharing (Off by default except Name and Live Location) */}
          <div className="space-y-3 pt-1">
            {/* 1. Phone sharing toggle */}
            <SwitchRow
              id="emergency-share-phone"
              checked={emergencySharePhone}
              onCheckedChange={handleToggleEmergencyPhone}
              label="Share phone number during SOS"
              description="Allows responders and contacts to call you back directly during the emergency."
              icon={<Phone className="h-4 w-4 text-primary" />}
              badge={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {emergencySharePhone ? 'Shared' : 'Hidden'}
                </span>
              }
            />

            {/* 2. Blood Group sharing toggle */}
            <div className="p-3.5 rounded-2xl border border-border bg-background space-y-3">
              <SwitchRow
                id="emergency-share-blood"
                checked={emergencyShareBlood}
                onCheckedChange={handleToggleEmergencyBlood}
                label="Share blood group during SOS"
                description="Helps first responders and hospital trauma units prepare transfusions without delay."
                icon={<HeartPulse className="h-4 w-4 text-rose-500" />}
                className="p-0 border-0 bg-transparent hover:bg-transparent"
                badge={
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {emergencyShareBlood ? 'Shared' : 'Hidden'}
                  </span>
                }
              />

              <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-[11px] font-bold text-muted-foreground">
                  Select Blood Group:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => {
                    const isSelected = emergencyBloodGroup === bg;
                    return (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => handleBloodGroupSelect(bg)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition touch-target ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-soft ring-1 ring-rose-500/40'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {bg}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Short Medical Note toggle */}
            <div className="p-3.5 rounded-2xl border border-border bg-background space-y-3">
              <SwitchRow
                id="emergency-share-medical"
                checked={emergencyShareMedical}
                onCheckedChange={handleToggleEmergencyMedical}
                label="Share short medical note (up to 200 chars)"
                description="Include vital emergency medical notes (e.g. allergies, asthma, diabetes, heart conditions)."
                icon={<AlertOctagon className="h-4 w-4 text-amber-500" />}
                className="p-0 border-0 bg-transparent hover:bg-transparent"
                badge={
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {emergencyShareMedical ? 'Shared' : 'Hidden'}
                  </span>
                }
              />

              <div className="pt-2 border-t border-border/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="emergency-medical-note-input" className="font-bold text-muted-foreground">
                    Medical Note for Responders:
                  </label>
                  <span className="font-mono text-muted-foreground font-semibold">
                    {emergencyMedicalNote.length} / 200 chars
                  </span>
                </div>
                <textarea
                  id="emergency-medical-note-input"
                  rows={2}
                  maxLength={200}
                  value={emergencyMedicalNote}
                  onChange={(e) => handleMedicalNoteChange(e.target.value)}
                  placeholder="e.g. Severe peanut allergy (carry EpiPen), diabetic on insulin, asthma..."
                  className="w-full p-2.5 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border">
            <Lock className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
            <span>
              All emergency details are private and shared only while an Emergency SOS beacon is active.
            </span>
          </div>
        </div>

        {/* =========================================================================
            6. PWA MOBILE APP CARD
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600">
              <Smartphone className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">KindLink Mobile App</h2>
              <p className="text-xs text-muted-foreground">
                {isInstalled
                  ? 'KindLink is installed on your device.'
                  : 'Add to your home screen for fast one-tap access and quick emergency alerts.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallPwa}
            disabled={isInstalled}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-soft transition touch-target self-start sm:self-auto shrink-0 ${
              isInstalled
                ? 'bg-muted text-muted-foreground cursor-default'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          >
            {isInstalled ? (
              <Check className="h-4 w-4 text-emerald-500 notranslate" />
            ) : (
              <Download className="h-4 w-4 notranslate" />
            )}
            <span>{isInstalled ? 'Already Installed ✓' : 'Install App'}</span>
          </button>
        </div>

        {/* =========================================================================
            6. ACCOUNT SECURITY ("Change your password" & Session control)
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
              <Lock className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Change Password</h2>
              <p className="text-xs text-muted-foreground">
                Enter your current password to choose a new secure password
              </p>
            </div>
          </div>

          <ChangePasswordForm />

          {/* Sign Out of All Other Devices Action */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong className="text-xs font-bold text-foreground block">
                Sign out of all other devices
              </strong>
              <p className="text-[11px] text-muted-foreground">
                Signs out all your other phones and computers while keeping you signed in here.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOutOtherDevices}
              disabled={revokingOthers}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-foreground transition touch-target self-start sm:self-auto shrink-0"
            >
              {revokingOthers && <Loader2 className="h-3.5 w-3.5 animate-spin notranslate" />}
              <span>{revokingOthers ? 'Signing Out...' : 'Sign Out Other Devices'}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            7. MAP DATA & CREDITS
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Layers className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Map Data &amp; Credits</h2>
              <p className="text-xs text-muted-foreground">
                Map tiles, search, and routes powering KindLink
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            All interactive maps and spatial calculations strictly comply with provider licenses. Coordinates are rounded and queries are proxied server-side to safeguard user privacy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 notranslate" />
                  MapTiler &amp; Map Data
                </span>
                <a
                  href="https://www.maptiler.com/copyright/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>License</span>
                  <ExternalLink className="h-2.5 w-2.5 notranslate" />
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground">
                High-definition vector and raster basemap tiles in light &amp; dark themes.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 notranslate" />
                  Geoapify &amp; OpenRouteService
                </span>
                <a
                  href="https://www.geoapify.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Website</span>
                  <ExternalLink className="h-2.5 w-2.5 notranslate" />
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Forward address search, geocoding, and walking/driving route computations.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 notranslate" />
                  IP Geolocation &amp; Language Detection
                </span>
                <a
                  href="https://ipinfo.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>IPinfo</span>
                  <ExternalLink className="h-2.5 w-2.5 notranslate" />
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground">
                <a
                  href="https://ipinfo.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline font-medium text-foreground"
                >
                  IP address data powered by IPinfo
                </a>
                . Used once on first visit to estimate country and suggest a local language. IP addresses are never logged or stored.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-t border-border">
            <span className="text-muted-foreground">KindLink v3.5 &bull; Open-source mutual aid platform</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAboutModalOpen(true)}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>About KindLink</span>
              </button>
              <span className="text-border">&bull;</span>
              <Link
                href="/credits"
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Credits &amp; Attributions</span>
                <ExternalLink className="h-3 w-3 notranslate" />
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            8. SESSION CONTROL & REQUEST ACCOUNT DELETION FLOW
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-3.5 sm:p-4 shadow-soft space-y-3.5">
          <h2 className="text-sm sm:text-base font-bold text-foreground">Session Control &amp; Danger Zone</h2>

          {/* Sign Out Button */}
          <div className="p-4 rounded-2xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong className="text-xs sm:text-sm font-bold text-foreground block">
                Sign Out of KindLink
              </strong>
              <p className="text-[11px] text-muted-foreground">
                Signs you out of KindLink on this device.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  localStorage.clear();
                  window.location.href = '/login';
                } catch {
                  window.location.href = '/login';
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-muted hover:bg-rose-500/10 text-xs font-bold text-muted-foreground hover:text-rose-600 transition touch-target self-start sm:self-auto"
            >
              <LogOut className="h-4 w-4 notranslate" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Request Account Deletion Card with Status */}
          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <strong className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 block flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-500 notranslate" />
                  <span>Request Account Deletion</span>
                </strong>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Submits an account closure request. Once processed, all personal data is deleted, active requests are cancelled, and past volunteer history is anonymised as &quot;Deleted user&quot;.
                </p>
              </div>

              {deletionStatus.status === 'none' && (
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-soft transition touch-target self-start sm:self-auto shrink-0"
                >
                  <span>Request Deletion</span>
                </button>
              )}
            </div>

            {/* If Status is PENDING */}
            {deletionStatus.status === 'pending' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 notranslate" />
                    Status: Pending Review
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Your request was submitted on{' '}
                    {deletionStatus.createdAt
                      ? new Date(deletionStatus.createdAt).toLocaleDateString()
                      : 'recently'}
                    . A moderator will review it shortly. You can cancel anytime before processing.
                  </p>
                  {deletionStatus.reason && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Reason provided: &quot;{deletionStatus.reason}&quot;
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCancelDeletion}
                  disabled={cancellingDeletion}
                  className="px-3 py-1.5 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-foreground transition touch-target shrink-0 self-start sm:self-auto"
                >
                  {cancellingDeletion ? 'Cancelling...' : 'Cancel Request'}
                </button>
              </div>
            )}

            {/* If Status is APPROVED */}
            {deletionStatus.status === 'approved' && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 notranslate" />
                    Status: Approved for Deletion
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Your account deletion request has been approved. Click to complete purging of your personal records.
                  </p>
                  {deletionStatus.adminNote && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Admin note: &quot;{deletionStatus.adminNote}&quot;
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/auth/delete-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'execute_approved', confirmation: 'DELETE' }),
                      });
                      if (res.ok) {
                        localStorage.clear();
                        window.location.href = '/login?deleted=true';
                      }
                    } catch {}
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition touch-target shrink-0 self-start sm:self-auto"
                >
                  Finalize Account Deletion
                </button>
              </div>
            )}

            {/* If Status is DENIED */}
            {deletionStatus.status === 'denied' && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1 animate-fade-in">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5 notranslate" />
                  Status: Deletion Request Denied
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Your request could not be processed at this time.
                </p>
                {deletionStatus.adminNote && (
                  <p className="text-[11px] text-foreground font-medium">
                    Admin note: &quot;{deletionStatus.adminNote}&quot;
                  </p>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Submit a new request with updated details
                  </button>
                </div>
              </div>
            )}

            {/* Last Admin warning */}
            {isLastAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 notranslate" />
                <span>
                  <strong>Admin Notice:</strong> You are currently the sole administrator of KindLink. You must promote another member to admin before your account can be deleted.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LANGUAGE MODAL (Saved on this device and your account) */}
      <LanguageModal open={langModalOpen} onClose={() => setLangModalOpen(false)} />

      {/* PWA INSTALLATION MODAL */}
      <InstallAppModal open={pwaModalOpen} onClose={closePwaModal} />

      {/* REQUEST ACCOUNT DELETION MODAL */}
      {deleteModalOpen && (
        <RequestAccountDeletionModal
          isLastAdmin={isLastAdmin}
          onSuccess={() => {
            setDeleteModalOpen(false);
            fetchDeletionStatus();
          }}
          onClose={() => setDeleteModalOpen(false)}
        />
      )}

      {/* ABOUT KINDLINK MODAL */}
      {aboutModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Shield className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">About KindLink</h3>
                  <p className="text-xs text-muted-foreground">Version 3.5.0 &bull; Mutual Aid Platform</p>
                </div>
              </div>
              <button
                onClick={() => setAboutModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              KindLink is a 100% free, open-source community mutual aid platform created to empower neighborhood support,
              emergency blood donor dispatch, and student resource sharing in West Bengal and beyond.
            </p>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2 text-xs">
              <strong className="text-foreground block font-semibold">Attributions &amp; Third-Party Services:</strong>
              <p className="text-[11px] text-muted-foreground">
                <a
                  href="https://ipinfo.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                >
                  IP address data powered by IPinfo
                </a>
                . Used strictly once on first visit to detect starting language; we never log, store, or track IP addresses.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Basemaps &amp; routing courtesy of MapTiler, OpenRouteService, Geoapify, and OpenStreetMap contributors.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <Link
                href="/credits"
                onClick={() => setAboutModalOpen(false)}
                className="p-2.5 rounded-xl border border-border hover:bg-muted text-teal-600 dark:text-teal-400 font-semibold transition"
              >
                Full Credits
              </Link>
              <Link
                href="/privacy"
                onClick={() => setAboutModalOpen(false)}
                className="p-2.5 rounded-xl border border-border hover:bg-muted text-teal-600 dark:text-teal-400 font-semibold transition"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                onClick={() => setAboutModalOpen(false)}
                className="p-2.5 rounded-xl border border-border hover:bg-muted text-teal-600 dark:text-teal-400 font-semibold transition"
              >
                Terms
              </Link>
            </div>

            <button
              onClick={() => setAboutModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft transition touch-target"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
    CHANGE PASSWORD FORM COMPONENT
   ========================================================================= */
function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasSpecialOrNumber = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Password strength calculation
  const getStrength = () => {
    if (!newPassword) return { score: 0, label: 'None', color: 'bg-muted' };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (newPassword.length >= 12) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (hasSpecialOrNumber) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasMinLength) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (!hasSpecialOrNumber) {
      setError('New password must contain at least one number or special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
          signOutOthers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update password.');
        setLoading(false);
        return;
      }

      setSuccess('Password updated successfully! Keep your new password secure.');
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0 text-rose-500 notranslate" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 notranslate" />
          <span>{success}</span>
        </div>
      )}

      {/* Current Password */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          Current Password <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showOld ? 'text' : 'password'}
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Enter current password"
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
          <button
            type="button"
            onClick={() => setShowOld(!showOld)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label={showOld ? 'Hide password' : 'Show password'}
          >
            {showOld ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          New Password <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label={showNew ? 'Hide password' : 'Show password'}
          >
            {showNew ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>

        {/* Password Strength Meter */}
        {newPassword && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-muted-foreground">Strength:</span>
              <span className="font-bold text-foreground">{strength.label}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirm New Password */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          Confirm New Password <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>
      </div>

      {/* Live Validation Checklist */}
      <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          {hasMinLength ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/60 notranslate shrink-0" />
          )}
          <span
            className={
              hasMinLength ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-muted-foreground'
            }
          >
            At least 8 characters
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasSpecialOrNumber ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/60 notranslate shrink-0" />
          )}
          <span
            className={
              hasSpecialOrNumber
                ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-muted-foreground'
            }
          >
            At least one number or special symbol
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {passwordsMatch ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/60 notranslate shrink-0" />
          )}
          <span
            className={
              passwordsMatch
                ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-muted-foreground'
            }
          >
            Passwords match
          </span>
        </div>
      </div>

      {/* Sign out of other devices switch row */}
      <div className="pt-1">
        <SwitchRow
          id="signout-others-switch"
          checked={signOutOthers}
          onCheckedChange={setSignOutOthers}
          label="Sign out of all other devices"
          description="Keep this device signed in while terminating sessions on all other phones and tablets."
          icon={<Lock className="h-4 w-4" />}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !hasMinLength || !hasSpecialOrNumber || !passwordsMatch}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition disabled:opacity-50 touch-target"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
        <span>{loading ? 'Verifying & Updating...' : 'Update Password'}</span>
      </button>
    </form>
  );
}

/* =========================================================================
    REQUEST ACCOUNT DELETION MODAL COMPONENT
   ========================================================================= */
function RequestAccountDeletionModal({
  isLastAdmin,
  onSuccess,
  onClose,
}: {
  isLastAdmin: boolean;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmationInput.trim().toUpperCase() === 'DELETE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    if (isLastAdmin) {
      setError('You are the last administrator on KindLink. Promote another admin before requesting deletion.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          confirmation: 'DELETE',
          action: 'request',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit account deletion request.');
        setIsSubmitting(false);
        return;
      }

      toast.success('Your deletion request has been submitted for review.');
      onSuccess();
    } catch {
      setError('Connection error. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md rounded-3xl bg-card border border-rose-500/30 p-6 shadow-2xl text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600">
            <AlertTriangle className="h-6 w-6 notranslate" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Request Account Deletion</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
              Permanent account closure flow
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Requesting deletion will submit your account for administrative review. Once approved:
        </p>

        <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-1">
          <li>Active help requests and volunteer offers will be immediately cancelled.</li>
          <li>Personal identity documents and phone numbers will be permanently deleted.</li>
          <li>Completed volunteer history and reviews are anonymised as &quot;Deleted user&quot;.</li>
        </ul>

        {isLastAdmin && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200">
            <strong>Action Blocked:</strong> You are the last administrator on this KindLink instance. You must assign another administrator before your account can be deleted.
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Reason for leaving (Optional):
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us why you are requesting account deletion..."
              className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Type <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 touch-target"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition touch-target"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isSubmitting || isLastAdmin}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-40 touch-target flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
              <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
