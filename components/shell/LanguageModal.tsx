'use client';

import React from 'react';
import { Check, Globe, Info, X } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  UNSUPPORTED_REGIONAL_LANGUAGES,
  changeLanguageInstantly,
  getCurrentLanguageCode,
} from '@/lib/translate/googleTranslate';

interface LanguageModalProps {
  open: boolean;
  onClose: () => void;
}

export function LanguageModal({ open, onClose }: LanguageModalProps) {
  if (!open) return null;

  const currentLang = getCurrentLanguageCode();

  const handleSelect = (code: string) => {
    changeLanguageInstantly(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-card-foreground max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Choose your language</h2>
              <p className="text-xs text-muted-foreground">अपनी भाषा चुनें / আপনার ভাষা নির্বাচন করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Supported Languages List */}
        <div className="mt-4 space-y-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`flex w-full items-center justify-between p-3.5 rounded-2xl border text-left transition-all touch-target ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-background hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold">{lang.nativeName}</span>
                  <span className="text-xs text-muted-foreground">({lang.name})</span>
                  {lang.dir === 'rtl' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      RTL
                    </span>
                  )}
                </div>
                {isSelected && <Check className="h-5 w-5 text-primary notranslate" />}
              </button>
            );
          })}
        </div>

        {/* Transparency note about regional and tribal languages */}
        <div className="mt-6 rounded-2xl bg-muted/60 p-4 border border-border">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5 notranslate" />
            <div>
              <h4 className="text-xs font-semibold text-foreground">Regional Dialect Verification Notice</h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                As per KindLink guidelines, languages not officially supported in the Google Translate widget
                (Santali Ol Chiki, Nagpuri, Khortha, Kurukh, Mundari, Ho) are not artificially faked to prevent broken translations.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {UNSUPPORTED_REGIONAL_LANGUAGES.map((l) => (
                  <span
                    key={l.code}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground"
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition touch-target"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
