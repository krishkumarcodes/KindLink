'use client';

import React, { useState } from 'react';
import {
  Globe,
  Moon,
  Sun,
  Type,
  Info,
  Atom,
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

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === getCurrentLanguageCode());

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
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full pb-24 sm:pb-8">
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
              <p className="text-xs text-muted-foreground">
                Current: {currentLang?.nativeName} ({currentLang?.name})
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

        {/* 4. About KindLink Physics Project Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Atom className="h-6 w-6 notranslate" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">About KindLink</h3>
                <p className="text-xs text-muted-foreground">
                  A Physics Project for B.Tech CSE · Asansol Engineering College
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            KindLink was conceptualized and developed as an engineering capstone exploring how principles of classical physics—spherical kinematics, Newtonian inverse-square gravitation, and accelerometer inertial sensors—can solve high-urgency community mutual aid challenges in Tier-2 Indian cities with high efficiency and dignity.
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
              <span className="text-muted-foreground block text-[11px]">Key Physics Principles:</span>
              <strong className="text-foreground">Inverse-Square Gravitation & Kinematics</strong>
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
