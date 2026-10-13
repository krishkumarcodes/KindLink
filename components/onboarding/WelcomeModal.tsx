'use client';

import React, { useState } from 'react';
import {
  Globe,
  HeartHandshake,
  Atom,
  ShieldCheck,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import {
  SUPPORTED_LANGUAGES,
  changeLanguageInstantly,
  getCurrentLanguageCode,
} from '@/lib/translate/googleTranslate';
import { dataAdapter } from '@/lib/data';

export function WelcomeModal() {
  const { welcomeSeen, setWelcomeSeen } = useKindLinkStore();
  const [slide, setSlide] = useState<0 | 1 | 2 | 3>(0);
  const [selectedLang, setSelectedLang] = useState<string>(getCurrentLanguageCode() || 'en');
  const [stats, setStats] = useState<{
    openRequests: number;
    verifiedHelpers: number;
    completedRequests: number;
    totalVolunteers: number;
  }>({ openRequests: 14, verifiedHelpers: 120, completedRequests: 85, totalVolunteers: 210 });

  React.useEffect(() => {
    dataAdapter.getPublicStats().then((res) => {
      if (res) setStats(res);
    }).catch(() => {});
  }, []);

  // If already seen, don't show
  if (welcomeSeen) return null;

  const handleLangChoose = (code: string) => {
    setSelectedLang(code);
    changeLanguageInstantly(code);
  };

  const handleFinish = () => {
    setWelcomeSeen(true);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-2xl text-card-foreground">
        {/* SLIDE 0: CHOOSE YOUR LANGUAGE */}
        {slide === 0 && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-2">
                <Globe className="h-7 w-7 notranslate" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Choose your language
              </h2>
              <p className="text-xs text-muted-foreground">
                अपनी भाषा चुनें / আপনার ভাষা নির্বাচন করুন
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLangChoose(lang.code)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition touch-target ${
                      isSelected
                        ? 'border-primary bg-primary text-white font-bold shadow-soft'
                        : 'border-border bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <div>
                      <span className="text-sm block">{lang.nativeName}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {lang.name}
                      </span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-white notranslate" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSlide(1)}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition shadow-soft flex items-center justify-center gap-2 touch-target"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4 notranslate" />
            </button>
          </div>
        )}

        {/* SLIDE 1: INTRO 1 - HELP IS JUST NEXT DOOR */}
        {slide === 1 && (
          <div className="text-center space-y-5 animate-in slide-in-from-right duration-200">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center mx-auto drop-shadow-md">
              <svg viewBox="0 0 64 64" className="h-20 w-20 select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="welcome-kl-grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0F766E" />
                    <stop offset="40%" stopColor="#0D9488" />
                    <stop offset="75%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <radialGradient id="welcome-kl-beacon" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </radialGradient>
                </defs>
                <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#welcome-kl-grad)" />
                <rect x="2.5" y="2.5" width="59" height="59" rx="15.5" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1" />
                <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(-25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                <circle cx="32" cy="32" r="18" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.5" />
                <path d="M22 28 C18 22, 12 25, 12 32 C12 39, 24 46, 32 50 C40 46, 52 39, 52 32 C52 25, 46 22, 42 28 C39 32, 35 34, 32 34 C29 34, 25 32, 22 28 Z" fill="#FFFFFF" fillOpacity="0.96" />
                <circle cx="32" cy="32" r="5" fill="url(#welcome-kl-beacon)" />
                <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Community Mutual Aid
              </span>
              <h2 className="text-2xl font-black text-foreground">Help is just next door</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                KindLink connects everyday neighbors across Asansol, Burnpur, and Durgapur for urgent tasks: emergency blood, medical gear, elderly care, and study books.
              </p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-1.5">
                <span className="h-2 w-6 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full bg-muted" />
                <span className="h-2 w-2 rounded-full bg-muted" />
              </div>
              <button
                onClick={() => setSlide(2)}
                className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-soft hover:bg-primary/90 transition touch-target"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 2: INTRO 2 - RANKED BY PHYSICS */}
        {slide === 2 && (
          <div className="text-center space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary mx-auto">
              <Atom className="h-10 w-10 notranslate" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Asansol Engineering College Capstone
              </span>
              <h2 className="text-2xl font-black text-foreground">Ranked by Physics, Driven by Trust</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Using Newtonian inverse-square gravitation models, our Help Gravity engine ranks the nearest and most critical needs first to maximize lives saved.
              </p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted" />
                <span className="h-2 w-6 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full bg-muted" />
              </div>
              <button
                onClick={() => setSlide(3)}
                className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-soft hover:bg-primary/90 transition touch-target"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 3: INTRO 3 - 100% FREE & VERIFIED */}
        {slide === 3 && (
          <div className="text-center space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 mx-auto">
              <ShieldCheck className="h-10 w-10 notranslate" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                100% Free & Verified
              </span>
              <h2 className="text-2xl font-black text-foreground">Zero Middlemen, Full Dignity</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                No subscription, no paid listings, and zero commercial fees. Powered by student and citizen volunteers committed to selfless aid.
              </p>

              {/* Real Public Platform Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                <div className="p-2.5 rounded-2xl bg-muted/50 border border-border">
                  <span className="block text-lg font-black text-primary">{stats.openRequests}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active Needs</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-muted/50 border border-border">
                  <span className="block text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.verifiedHelpers}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Verified</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-muted/50 border border-border">
                  <span className="block text-lg font-black text-foreground">{stats.completedRequests}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Helped</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-muted/50 border border-border">
                  <span className="block text-lg font-black text-foreground">{stats.totalVolunteers}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Volunteers</span>
                </div>
              </div>
            </div>


            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted" />
                <span className="h-2 w-2 rounded-full bg-muted" />
                <span className="h-2 w-6 rounded-full bg-primary" />
              </div>
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-8 py-3.5 rounded-2xl bg-primary text-white text-sm font-black shadow-soft hover:bg-primary/90 transition active:scale-95 touch-target"
              >
                <Sparkles className="h-4 w-4 notranslate" />
                <span>Get Started</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
