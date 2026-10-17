'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  Globe,
  Search,
  X,
  ChevronRight,
  RotateCcw,
  Loader2,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<'all' | 'indian' | 'international'>('all');
  const [translatingCode, setTranslatingCode] = useState<string | null>(null);

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

  if (!open) return null;

  const handleSelect = (lang: LanguageOption) => {
    if (translatingCode) return;

    setTranslatingCode(lang.code);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }

    changeLanguageInstantly(lang.code);

    // Persist to database profile via /api/auth/profile
    fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: lang.code }),
    }).catch(() => {});

    setTimeout(() => {
      toast.success(`Switched to ${lang.name} (${lang.nativeName})`);
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

  const renderLanguageButton = (lang: LanguageOption) => {
    const isSelected = currentCode === lang.code;
    const isThisTranslating = translatingCode === lang.code;

    return (
      <button
        key={lang.code}
        type="button"
        disabled={Boolean(translatingCode)}
        onClick={() => handleSelect(lang)}
        className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-150 touch-target group min-w-0 w-full min-h-[56px] select-none ${
          isSelected
            ? 'border-primary bg-primary/10 dark:bg-teal-500/15 text-foreground font-semibold ring-2 ring-primary/25 shadow-xs'
            : 'border-border/80 bg-card/70 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-primary/40 text-foreground'
        } ${isThisTranslating ? 'opacity-80 ring-2 ring-primary' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
          {/* Avatar / Code indicator */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black uppercase transition-all ${
              isSelected
                ? 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-[0_0_10px_rgba(13,148,136,0.35)]'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
            }`}
          >
            {isThisTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary notranslate" />
            ) : (
              <span className="notranslate">{lang.code.slice(0, 2)}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Native script and font - ONLY this keeps translate="no" */}
              <span
                translate="no"
                className="notranslate text-base font-bold text-foreground tracking-tight break-words"
              >
                {lang.nativeName}
              </span>

              {/* RTL Badge */}
              {lang.dir === 'rtl' && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border shrink-0">
                  RTL
                </span>
              )}
            </div>

            {/* English name in smaller subtitle */}
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium truncate">{lang.name}</span>
              <span>•</span>
              <span className="text-[11px] opacity-80 truncate">{lang.script}</span>
            </div>
          </div>
        </div>

        {/* Selected Checkmark or Arrow / Loading spinner */}
        <div className="shrink-0 flex items-center pl-2">
          {isThisTranslating ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary notranslate" />
          ) : isSelected ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-xs">
              <Check className="h-4 w-4 stroke-[2.5] notranslate" />
            </div>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 notranslate" />
          )}
        </div>
      </button>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop click to close */}
      <div
        className="fixed inset-0 -z-10"
        onClick={() => {
          if (!translatingCode) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog on Desktop / Clean Bottom Sheet on Mobile */}
      <div className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-card/98 dark:bg-slate-950/98 border-t sm:border border-border/80 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-card-foreground flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
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

        {/* Mobile Swipe/Drag Handle */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Sticky Header: Title "Select language" and close button */}
        <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/80 bg-card/90 dark:bg-slate-950/90 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Globe className="h-5 w-5 notranslate" />
              </div>
              <h2
                id="language-modal-title"
                className="text-lg sm:text-xl font-black text-foreground truncate"
              >
                Select language
              </h2>
            </div>

            <button
              onClick={onClose}
              disabled={Boolean(translatingCode)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors touch-target"
              aria-label="Close language selector"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>

          {/* Current language card at the top with 1-tap "Switch to English" shortcut */}
          {currentCode !== 'en' ? (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Globe className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary block">
                    Active Language
                  </span>
                  <div className="text-sm font-bold text-foreground truncate">
                    <span translate="no" className="notranslate font-black">
                      {currentLang?.nativeName || currentCode}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground font-medium">
                      ({currentLang?.name || 'Translated'})
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSwitchToEnglish}
                disabled={Boolean(translatingCode)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 touch-target active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5 notranslate" />
                <span>Switch to English</span>
              </button>
            </div>
          ) : (
            <div className="p-2.5 sm:p-3 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Active Language
                  </span>
                  <span className="text-sm font-bold text-foreground truncate block">
                    <span translate="no" className="notranslate font-black">English</span>{' '}
                    <span className="text-xs text-muted-foreground font-normal">(Default / Pan-India)</span>
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                Active
              </span>
            </div>
          )}

          {/* Search Box: Fits without truncation on 360px */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none notranslate" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages"
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-background/90 border border-border/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground touch-target"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 notranslate" />
              </button>
            )}
          </div>

          {/* Category Tabs: All, Indian, International with Counts */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
                activeGroup === 'all'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              All ({totalFilteredCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup('indian')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
                activeGroup === 'indian'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Indian ({filteredIndian.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup('international')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
                activeGroup === 'international'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              International ({filteredInternational.length})
            </button>
          </div>
        </div>

        {/* Scrollable Language List with Sticky Group Headers */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Section 1: Indian Languages */}
          {(activeGroup === 'all' || activeGroup === 'indian') && filteredIndian.length > 0 && (
            <div className="space-y-3">
              {/* Sticky Group Header */}
              <div className="sticky top-0 z-10 bg-card/95 dark:bg-slate-950/95 backdrop-blur-md py-1.5 pb-2 border-b border-border/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black tracking-wider uppercase text-primary truncate">
                    Indian Languages
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {filteredIndian.length}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground truncate">
                  Bengal • Bihar • Jharkhand • Pan-India
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredIndian.map(renderLanguageButton)}
              </div>
            </div>
          )}

          {/* Section 2: International Languages */}
          {(activeGroup === 'all' || activeGroup === 'international') &&
            filteredInternational.length > 0 && (
              <div className="space-y-3">
                {/* Sticky Group Header */}
                <div className="sticky top-0 z-10 bg-card/95 dark:bg-slate-950/95 backdrop-blur-md py-1.5 pb-2 border-b border-border/60 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black tracking-wider uppercase text-foreground truncate">
                      International Languages
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                      {filteredInternational.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">
                    Global Community
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredInternational.map(renderLanguageButton)}
                </div>
              </div>
            )}

          {/* Empty Search Results */}
          {filteredIndian.length === 0 && filteredInternational.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mx-auto">
                <Search className="h-6 w-6 notranslate" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                No matching languages found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No language found matching &quot;{searchQuery}&quot;. Try searching for &quot;Hindi&quot;, &quot;Bengali&quot;, or &quot;Santali&quot;.
              </p>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="p-3.5 sm:p-4 border-t border-border/80 bg-card/90 dark:bg-slate-950/90 shrink-0 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Automatic Google translation</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(translatingCode)}
            className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all touch-target shadow-xs ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
