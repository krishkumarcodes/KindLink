'use client';

import React, { useState, useMemo } from 'react';
import { Check, Globe, Search, X, ChevronRight, RotateCcw } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  INDIAN_LANGUAGES,
  INTERNATIONAL_LANGUAGES,
  LanguageOption,
  changeLanguageInstantly,
  getCurrentLanguageCode,
} from '@/lib/translate/googleTranslate';

interface LanguageModalProps {
  open: boolean;
  onClose: () => void;
}

export function LanguageModal({ open, onClose }: LanguageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<'all' | 'indian' | 'international'>('all');

  const currentCode = getCurrentLanguageCode();
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentCode);

  // Filtered languages based on search query
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
        l.script.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!open) return null;

  const handleSelect = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    changeLanguageInstantly(code);
    onClose();
  };

  const renderLanguageButton = (lang: LanguageOption) => {
    const isSelected = currentCode === lang.code;

    return (
      <button
        key={lang.code}
        type="button"
        onClick={() => handleSelect(lang.code)}
        translate="no"
        className={`notranslate relative flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-150 touch-target group min-w-0 w-full ${
          isSelected
            ? 'border-primary bg-primary/10 dark:bg-teal-500/15 text-foreground font-semibold ring-2 ring-primary/25 shadow-xs'
            : 'border-border/80 bg-card/70 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-primary/40 text-foreground'
        }`}
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
            {lang.code.slice(0, 2)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-foreground tracking-tight break-words">
                {lang.nativeName}
              </span>

              {/* RTL Badge */}
              {lang.dir === 'rtl' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                  RTL
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium truncate">{lang.name}</span>
              <span>•</span>
              <span className="text-[11px] opacity-80 truncate">{lang.script}</span>
            </div>
          </div>
        </div>

        {/* Selected Checkmark or Arrow */}
        <div className="shrink-0 flex items-center pl-2">
          {isSelected ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-xs">
              <Check className="h-4 w-4 stroke-[2.5]" />
            </div>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Backdrop click to close */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog / Bottom Sheet on Mobile */}
      <div
        translate="no"
        className="notranslate w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-card/95 dark:bg-slate-950/95 border border-border/80 dark:border-slate-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-card-foreground flex flex-col max-h-[88vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
      >
        {/* Mobile Swipe/Drag Handle */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border/80 bg-card/80 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Globe className="h-5 w-5 notranslate" />
              </div>
              <div className="min-w-0">
                <h2 id="language-modal-title" className="text-lg sm:text-xl font-black text-foreground truncate">
                  Choose your language
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  अपनी भाषा चुनें / আপনার ভাষা নির্বাচন করুন / اپنی زبان منتخب کریں
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors touch-target"
              aria-label="Close language selector dialog"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>

          {/* Quick Switch back to English Banner (when non-English active) */}
          {currentCode !== 'en' && (
            <div className="mt-3.5 p-2.5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-4 w-4 text-primary shrink-0 notranslate" />
                <span className="text-xs text-foreground truncate">
                  Active: <strong>{currentLang?.nativeName || currentCode}</strong> ({currentLang?.name || 'Translated'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelect('en')}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 touch-target"
              >
                <RotateCcw className="h-3.5 w-3.5 notranslate" />
                <span>Switch to English</span>
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative mt-3.5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none notranslate" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by language, script, or state (e.g. Hindi, বাংলা, Santali)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-background/90 border border-border/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground touch-target"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 notranslate" />
              </button>
            )}
          </div>

          {/* Group Filter Tabs */}
          <div className="flex items-center gap-2 mt-3 pt-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveGroup('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
                activeGroup === 'all'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              All ({filteredIndian.length + filteredInternational.length})
            </button>
            <button
              onClick={() => setActiveGroup('indian')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
                activeGroup === 'indian'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Indian Languages ({filteredIndian.length})
            </button>
            <button
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

        {/* Scrollable Language List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* SECTION 1: Indian Languages */}
          {(activeGroup === 'all' || activeGroup === 'indian') && filteredIndian.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/60 gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-extrabold tracking-wider uppercase text-primary truncate">
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
                {filteredIndian.map((lang) => renderLanguageButton(lang))}
              </div>
            </div>
          )}

          {/* SECTION 2: International Languages */}
          {(activeGroup === 'all' || activeGroup === 'international') &&
            filteredInternational.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border/60 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-extrabold tracking-wider uppercase text-foreground truncate">
                      International Languages
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                      {filteredInternational.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">Global Community</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredInternational.map((lang) => renderLanguageButton(lang))}
                </div>
              </div>
            )}

          {/* Empty search results */}
          {filteredIndian.length === 0 && filteredInternational.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mx-auto">
                <Search className="h-6 w-6 notranslate" />
              </div>
              <h3 className="text-base font-bold text-foreground">No matching languages found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                We couldn&apos;t find any language matching &quot;{searchQuery}&quot;. Try searching for &quot;Hindi&quot;, &quot;Bengali&quot;, or &quot;Santali&quot;.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 bg-card/80 dark:bg-slate-950/80 shrink-0 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Translated automatically by Google</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all touch-target shadow-xs ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
