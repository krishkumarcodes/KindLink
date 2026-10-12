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

export function WelcomeModal() {
  const { welcomeSeen, setWelcomeSeen } = useKindLinkStore();
  const [slide, setSlide] = useState<0 | 1 | 2 | 3>(0);
  const [selectedLang, setSelectedLang] = useState<string>(getCurrentLanguageCode() || 'en');

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
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary mx-auto">
              <HeartHandshake className="h-10 w-10 notranslate" />
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
