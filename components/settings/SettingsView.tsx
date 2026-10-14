'use client';

import React, { useState } from 'react';
import {
  Globe,
  Moon,
  Sun,
  Type,
  Info,
  ShieldCheck,
  HeartHandshake,
  Github,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageModal } from '../shell/LanguageModal';
import { getCurrentLanguageCode, SUPPORTED_LANGUAGES } from '@/lib/translate/googleTranslate';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [textSize, setTextSize] = useState<'normal' | 'compact' | 'large'>('normal');
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  const [langCode, setLangCode] = useState(() => getCurrentLanguageCode());

  React.useEffect(() => {
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

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);

  const handleTextSizeChange = (size: 'normal' | 'compact' | 'large') => {
    setTextSize(size);
    if (typeof document !== 'undefined') {
      if (size === 'compact') {
        document.documentElement.style.fontSize = '14px';
      } else if (size === 'large') {
        document.documentElement.style.fontSize = '18px';
      } else {
        document.documentElement.style.fontSize = '16px';
      }
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full pb-36 lg:pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Customize KindLink appearance, language, font size and examine project details
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Language Option */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Language / भाषा / ভাষা</h3>
              <p className="text-xs text-muted-foreground notranslate">
                Current: <span className="font-semibold">{currentLang?.nativeName}</span> ({currentLang?.name})
              </p>
            </div>
          </div>
          <button
            onClick={() => setLangModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-background border border-border text-xs font-bold text-primary hover:bg-muted transition touch-target"
          >
            Change
          </button>
        </div>

        {/* 2. Theme Option */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <Sun className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Appearance Theme</h3>
              <p className="text-xs text-muted-foreground">Select light, dark, or follow device system</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {['light', 'dark', 'system'].map((m) => (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className={`py-2.5 rounded-xl border text-xs font-bold capitalize transition touch-target ${
                  theme === m
                    ? 'border-primary bg-primary text-white shadow-soft'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Text Size */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <Type className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Text Size & Accessibility</h3>
              <p className="text-xs text-muted-foreground">Optimize readability for elderly users</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { id: 'compact' as const, label: 'Compact' },
              { id: 'normal' as const, label: 'Standard (Default)' },
              { id: 'large' as const, label: 'Large (Elderly Mode)' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => handleTextSizeChange(s.id)}
                className={`py-2.5 rounded-xl border text-xs font-bold transition touch-target ${
                  textSize === s.id
                    ? 'border-primary bg-primary text-white shadow-soft'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Security & Change Password Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
              <ShieldCheck className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Security & Password</h3>
              <p className="text-xs text-muted-foreground">Update your account credentials safely</p>
            </div>
          </div>

          <ChangePasswordForm />
        </div>

        {/* 5. Account Session & Logout */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Session Control</h3>
            <p className="text-xs text-muted-foreground">Sign out of your active KindLink session</p>
          </div>
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              } catch {
                window.location.href = '/login';
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition touch-target"
          >
            Log Out
          </button>
        </div>

        {/* 6. About KindLink Project Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <HeartHandshake className="h-6 w-6 notranslate" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">About KindLink</h3>
                <p className="text-xs text-muted-foreground">
                  A student-built community project for B.Tech CSE · Asansol Engineering College
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            KindLink was conceptualized and developed as an engineering capstone exploring how modern verified mutual aid, transparent coordination, and rapid neighbor-to-neighbor dispatch can solve high-urgency community mutual aid challenges in Tier-2 Indian cities with high efficiency and dignity.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-background border border-border">
              <span className="text-muted-foreground block text-[11px]">Academic Institution:</span>
              <strong className="text-foreground">Asansol Engineering College (WB)</strong>
            </div>
            <div className="p-3 rounded-2xl bg-background border border-border">
              <span className="text-muted-foreground block text-[11px]">Department:</span>
              <strong className="text-foreground">Computer Science & Engineering</strong>
            </div>
            <div className="p-3 rounded-2xl bg-background border border-border">
              <span className="text-muted-foreground block text-[11px]">Key Platform Principles:</span>
              <strong className="text-foreground">Deterministic Urgency & Verified Trust</strong>
            </div>
            <div className="p-3 rounded-2xl bg-background border border-border">
              <span className="text-muted-foreground block text-[11px]">Developer Contact:</span>
              <strong className="text-foreground">krishkumarcodes@gmail.com</strong>
            </div>
          </div>
        </div>
      </div>


      <LanguageModal open={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  );
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
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

      setSuccess('Password updated successfully! Next time you sign in, use your new password.');
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
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      {/* Old Password */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Current Password</label>
        <div className="relative">
          <input
            type={showOld ? 'text' : 'password'}
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowOld(!showOld)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            {showOld ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">New Password (min 8 chars)</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            {showNew ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Confirm New Password */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            {showConfirm ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Sign out of other devices checkbox */}
      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={signOutOthers}
          onChange={(e) => setSignOutOthers(e.target.checked)}
          className="rounded border-border text-primary focus:ring-primary/20"
        />
        <span className="text-xs text-muted-foreground">Sign out of other devices</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition disabled:opacity-50"
      >
        {loading ? 'Updating Password...' : 'Update Password'}
      </button>
    </form>
  );
}

