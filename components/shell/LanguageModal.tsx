'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Globe,
  Search,
  X,
  RotateCcw,
  Loader2,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  SUPPORTED_LANGUAGES,
  INDIAN_LANGUAGES,
  INTERNATIONAL_LANGUAGES,
  LanguageOption,
  changeLanguageInstantly,
  getCurrentLanguageCode,
} from '@/lib/translate/googleTranslate';

export interface LanguageModalProps {
  open: boolean;
  onClose: () => void;
}

export function LanguageModal({ open, onClose }: LanguageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<'all' | 'indian' | 'international'>('all');
  const [translatingCode, setTranslatingCode] = useState<string | null>(null);
  const [lastUsedLangCode, setLastUsedLangCode] = useState<string | null>(null);
  const [langSource, setLangSource] = useState<'auto' | 'user' | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('kindlink_last_lang');
      if (stored) {
        setLastUsedLangCode(stored);
      }
      const storedSource = localStorage.getItem('kindlink_lang_source') as 'auto' | 'user' | null;
      if (storedSource === 'auto' || storedSource === 'user') {
        setLangSource(storedSource);
      }
    } catch {}

    const handleSourceChange = (e: Event) => {
      const custom = e as CustomEvent<{ source: 'auto' | 'user' }>;
      if (custom.detail?.source) {
        setLangSource(custom.detail.source);
      }
    };

    window.addEventListener('kindlink:lang-source-change', handleSourceChange);
    return () => {
      window.removeEventListener('kindlink:lang-source-change', handleSourceChange);
    };
  }, []);

  // Lock body scroll and handle Escape key while open
  useEffect(() => {
    if (!open) return;

    // Reset search query and state on open
    setSearchQuery('');
    setTranslatingCode(null);

    try {
      const stored = localStorage.getItem('kindlink_last_lang');
      if (stored) setLastUsedLangCode(stored);
      const storedSource = localStorage.getItem('kindlink_lang_source') as 'auto' | 'user' | null;
      setLangSource(storedSource === 'auto' ? 'auto' : storedSource === 'user' ? 'user' : null);
    } catch {}

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !translatingCode) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, translatingCode]);

  const currentCode = getCurrentLanguageCode();
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentCode);

  // Filter languages based on search query (English name, native name, code, script, or region)
  const filteredIndian = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return INDIAN_LANGUAGES;
    return INDIAN_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.script.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredInternational = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return INTERNATIONAL_LANGUAGES;
    return INTERNATIONAL_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.script.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const totalFilteredCount = filteredIndian.length + filteredInternational.length;

  // 4 Popular languages: English, Hindi, Bengali, Last used (or regional fallback)
  const popularLanguages = useMemo(() => {
    const en = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
    const hi = SUPPORTED_LANGUAGES.find((l) => l.code === 'hi');
    const bn = SUPPORTED_LANGUAGES.find((l) => l.code === 'bn');

    let fourth: LanguageOption | undefined;

    // Check last used language if different from en, hi, bn
    if (lastUsedLangCode && !['en', 'hi', 'bn'].includes(lastUsedLangCode)) {
      fourth = SUPPORTED_LANGUAGES.find((l) => l.code === lastUsedLangCode);
    }

    // Check active language if different
    if (!fourth && currentCode && !['en', 'hi', 'bn'].includes(currentCode)) {
      fourth = SUPPORTED_LANGUAGES.find((l) => l.code === currentCode);
    }

    // Regional fallback if no previous selection (Santali - indigenous language of Bengal/Jharkhand)
    if (!fourth) {
      fourth = SUPPORTED_LANGUAGES.find((l) => l.code === 'sat') || SUPPORTED_LANGUAGES.find((l) => l.code === 'bho');
    }

    return [en, hi, bn, fourth].filter(Boolean) as LanguageOption[];
  }, [lastUsedLangCode, currentCode]);

  const handleSelect = (lang: LanguageOption) => {
    if (translatingCode) return;

    setTranslatingCode(lang.code);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    try {
      localStorage.setItem('kindlink_last_lang', lang.code);
      localStorage.setItem('kindlink_lang_source', 'user');
      setLastUsedLangCode(lang.code);
      setLangSource('user');
      window.dispatchEvent(
        new CustomEvent('kindlink:lang-source-change', { detail: { source: 'user' } })
      );
    } catch {}

    changeLanguageInstantly(lang.code);

    // Persist to database profile via /api/auth/profile
    fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: lang.code }),
    }).catch(() => {});

    setTimeout(() => {
      toast.success('Language updated');
      setTranslatingCode(null);
      onClose();
    }, 450);
  };

  const handleSwitchToEnglish = () => {
    const enLang = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
    if (enLang) {
      handleSelect(enLang);
    }
  };

  if (!open || !mounted) return null;

  const renderLanguageRow = (lang: LanguageOption) => {
    const isSelected = currentCode === lang.code;
    const isThisTranslating = translatingCode === lang.code;

    return (
      <button
        key={lang.code}
        type="button"
        disabled={Boolean(translatingCode)}
        onClick={() => handleSelect(lang)}
        className={`relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-150 touch-target group min-w-0 w-full min-h-[56px] select-none ${
          isSelected
            ? 'border-primary bg-primary/10 dark:bg-primary/15 text-foreground font-semibold ring-2 ring-primary/25 shadow-xs'
            : 'border-border/70 bg-card/70 hover:bg-muted/70 hover:border-primary/40 text-foreground'
        } ${isThisTranslating ? 'opacity-85 ring-2 ring-primary' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
          {/* 2-letter Code Badge */}
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
            }`}
          >
            {isThisTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary notranslate" />
            ) : (
              <span className="notranslate" translate="no">
                {lang.code.slice(0, 2)}
              </span>
            )}
          </div>

          {/* Language name in native script and English name on one line */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                translate="no"
                className="notranslate text-sm font-bold text-foreground tracking-tight break-words"
              >
                {lang.nativeName}
              </span>
              {lang.nativeName !== lang.name && (
                <span className="text-xs text-muted-foreground font-medium truncate">
                  ({lang.name})
                </span>
              )}
              {lang.dir === 'rtl' && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border shrink-0">
                  RTL
                </span>
              )}
            </div>

            {/* Small muted script name */}
            <div className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
              <span>{lang.script}</span>
            </div>
          </div>
        </div>

        {/* Selected Checkmark or Arrow / Loading spinner */}
        <div className="shrink-0 flex items-center pl-2">
          {isThisTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary notranslate" />
          ) : isSelected ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
              <Check className="h-3.5 w-3.5 stroke-[2.5] notranslate" />
            </div>
          ) : null}
        </div>
      </button>
    );
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !translatingCode) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Single Clean Sheet (No outer card peeking, no double scroll container) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(100% - 24px, 480px)' }}
        className="relative max-h-[85dvh] rounded-3xl bg-card border border-border/80 shadow-2xl text-card-foreground flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 mb-2 sm:mb-0"
      >
        {/* Translating Spinner Overlay */}
        {translatingCode && (
          <div className="absolute inset-0 z-50 bg-card/80 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="px-5 py-3.5 rounded-2xl bg-card border border-border/80 shadow-2xl flex items-center gap-3 animate-in zoom-in-95 duration-150">
              <Loader2 className="h-5 w-5 text-primary animate-spin notranslate" />
              <span className="text-sm font-bold text-foreground">
                Translating...
              </span>
            </div>
          </div>
        )}

        {/* Sticky Top Header */}
        <div className="px-4 pt-3.5 pb-2.5 shrink-0 border-b border-border/70 bg-card/95 backdrop-blur-xs space-y-2.5">
          {/* Title Row with accessible close button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Globe className="h-4 w-4 notranslate" />
              </div>
              <h2
                id="language-modal-title"
                className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate"
              >
                Select Language
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(translatingCode)}
              className="flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
              aria-label="Close language selector"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>

          {/* One compact line: "Current: English" (or current active language) */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 truncate">
              <span className="font-medium text-muted-foreground">Current:</span>
              <span
                translate="no"
                className="notranslate font-bold text-foreground truncate"
              >
                {currentLang ? `${currentLang.name} (${currentLang.nativeName})` : 'English'}
              </span>
            </p>

            {currentCode !== 'en' && (
              <button
                type="button"
                onClick={handleSwitchToEnglish}
                disabled={Boolean(translatingCode)}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline hover:text-primary/90 transition-colors py-0.5 px-1.5 rounded-md hover:bg-primary/10"
              >
                <RotateCcw className="h-3 w-3 notranslate" />
                <span>Reset to English</span>
              </button>
            )}
          </div>

          {/* Auto-detected language location hint badge */}
          {langSource === 'auto' && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/25 px-2.5 py-0.5 rounded-full w-fit animate-in fade-in slide-in-from-top-1 duration-150 select-none">
              <MapPin className="h-3 w-3 shrink-0 notranslate text-teal-600 dark:text-teal-400" />
              <span>Chosen from your location</span>
            </div>
          )}

          {/* Search field with short placeholder "Search languages" */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none notranslate" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages"
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-muted/50 border border-border/70 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground touch-target"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 notranslate" />
              </button>
            )}
          </div>

          {/* Single-row Segmented Control: "All", "Indian", "International" with counts (fits cleanly on 360px without wrapping) */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/50 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              className={`py-1.5 px-1 rounded-lg text-center whitespace-nowrap truncate transition-all ${
                activeGroup === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              All ({totalFilteredCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup('indian')}
              className={`py-1.5 px-1 rounded-lg text-center whitespace-nowrap truncate transition-all ${
                activeGroup === 'indian'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              Indian ({filteredIndian.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup('international')}
              className={`py-1.5 px-1 rounded-lg text-center whitespace-nowrap truncate transition-all ${
                activeGroup === 'international'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              International ({filteredInternational.length})
            </button>
          </div>
        </div>

        {/* Scrollable Language List with Non-sticking natural inline group headings */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 p-3 sm:p-4 space-y-4">
          {/* Popular Quick Row (Shown when not searching) */}
          {!searchQuery && (
            <div className="space-y-1.5 pb-1 border-b border-border/50">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="h-3 w-3 text-primary notranslate" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Popular Quick Access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {popularLanguages.map((lang) => {
                  const isSelected = currentCode === lang.code;
                  const isTranslating = translatingCode === lang.code;
                  return (
                    <button
                      key={`popular-${lang.code}`}
                      type="button"
                      disabled={Boolean(translatingCode)}
                      onClick={() => handleSelect(lang)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all touch-target select-none min-h-[44px] ${
                        isSelected
                          ? 'border-primary bg-primary/10 dark:bg-primary/15 text-foreground font-semibold ring-1 ring-primary/30 shadow-xs'
                          : 'border-border/70 bg-card/70 hover:bg-muted/70 hover:border-primary/40 text-foreground'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black uppercase ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isTranslating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary notranslate" />
                        ) : (
                          <span className="notranslate" translate="no">
                            {lang.code.slice(0, 2)}
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">
                          <span translate="no" className="notranslate">
                            {lang.nativeName}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate font-normal">
                          {lang.name}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 stroke-[2.5] notranslate" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 1: Indian Languages */}
          {(activeGroup === 'all' || activeGroup === 'indian') && filteredIndian.length > 0 && (
            <div className="space-y-2">
              {/* Natural Inline Group Header (NOT sticky, does NOT float over the list) */}
              <div className="h-7 sm:h-8 flex items-center justify-between gap-2 px-1 select-none">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    Indian Languages
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 shrink-0">
                    {filteredIndian.length}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/75 truncate text-right">
                  Bengal • Bihar • Jharkhand • Pan-India
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {filteredIndian.map(renderLanguageRow)}
              </div>
            </div>
          )}

          {/* Section 2: International Languages */}
          {(activeGroup === 'all' || activeGroup === 'international') &&
            filteredInternational.length > 0 && (
              <div className="space-y-2">
                {/* Natural Inline Group Header (NOT sticky, does NOT float over the list) */}
                <div className="h-7 sm:h-8 flex items-center justify-between gap-2 px-1 select-none">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                      International Languages
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 shrink-0">
                      {filteredInternational.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/75 truncate text-right">
                    Global Community
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {filteredInternational.map(renderLanguageRow)}
                </div>
              </div>
            )}

          {/* Empty Search Results */}
          {filteredIndian.length === 0 && filteredInternational.length === 0 && (
            <div className="py-10 text-center space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground mx-auto">
                <Search className="h-5 w-5 notranslate" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                No matching languages found
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                No language found matching &quot;{searchQuery}&quot;. Try searching for &quot;Hindi&quot;, &quot;Bengali&quot;, or &quot;Santali&quot;.
              </p>
            </div>
          )}
        </div>

        {/* Slim Footer: Translated by Google & Close Button (Safe-area bottom padding) */}
        <div className="px-4 py-2.5 sm:py-3 border-t border-border/80 bg-card/95 backdrop-blur-xs shrink-0 flex items-center justify-between gap-3 text-xs pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Translated by Google</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(translatingCode)}
            className="px-4 py-1.5 min-h-[36px] rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all touch-target text-xs ml-auto shadow-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
