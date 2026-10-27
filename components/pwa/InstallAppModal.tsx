'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  Smartphone,
  Laptop,
  Apple,
  Zap,
  Siren,
  ShieldCheck,
} from 'lucide-react';
import { ModalOverlay } from '@/components/ui/OverlayPortal';
import { usePwaInstall } from '@/lib/pwa/usePwaInstall';

export interface InstallAppModalProps {
  open?: boolean;
  onClose?: () => void;
}

export function InstallAppModal({ open: explicitOpen, onClose: explicitOnClose }: InstallAppModalProps) {
  const {
    isInstalled,
    canPrompt,
    isIOS,
    isAndroid,
    isDesktop,
    isModalOpen: hookModalOpen,
    closeInstallModal: hookCloseModal,
    triggerInstall,
  } = usePwaInstall();

  // If explicit props are provided, use them; otherwise use hook state
  const isOpen = explicitOpen !== undefined ? explicitOpen : hookModalOpen;
  const handleClose = explicitOnClose || hookCloseModal;

  // Active platform tab
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('ios');

  useEffect(() => {
    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, [isIOS, isAndroid, isDesktop, isOpen]);

  if (!isOpen) return null;

  return (
    <ModalOverlay
      open={isOpen}
      onClose={handleClose}
      mobileVariant="sheet"
      maxWidthClass="max-w-lg"
      ariaLabel="Install KindLink App"
    >
      {/* Sticky Header: Clean single solid surface */}
      <div className="sticky top-0 z-10 p-4 sm:p-5 pb-3 border-b border-border/80 bg-card text-card-foreground shrink-0">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20">
              <Download className="h-5 w-5 notranslate" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate">
                Install KindLink App
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                Fast home screen access &amp; instant emergency aid
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-target shrink-0"
            aria-label="Close install app dialog"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 mt-3 bg-muted/60 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all touch-target ${
              platform === 'ios'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Apple className="h-3.5 w-3.5 shrink-0 notranslate" />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all touch-target ${
              platform === 'android'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 shrink-0 notranslate" />
            <span>Android</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('desktop')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all touch-target ${
              platform === 'desktop'
                ? 'bg-card text-foreground shadow-xs border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Laptop className="h-3.5 w-3.5 shrink-0 notranslate" />
            <span>Desktop</span>
          </button>
        </div>
      </div>

      {/* Body: Scrollable with overscroll-contain */}
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain max-h-[calc(85dvh-130px)] bg-card text-card-foreground">
        {/* 1-Tap native prompt banner if supported */}
        {canPrompt && !isInstalled && (
          <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 space-y-2.5">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-bold text-xs">
              <Zap className="h-4 w-4 text-teal-600 dark:text-teal-400 notranslate shrink-0" />
              <span>Direct 1-Tap Installation Available!</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your browser supports direct installation. Tap below to install immediately.
            </p>
            <button
              type="button"
              onClick={async () => {
                await triggerInstall();
                handleClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-soft transition touch-target"
            >
              <Download className="h-4 w-4 notranslate shrink-0" />
              <span>Install KindLink Now</span>
            </button>
          </div>
        )}

        {/* Step-by-Step Platform Guides */}
        {platform === 'ios' && (
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-foreground flex items-center gap-2">
              <Apple className="h-4 w-4 text-primary notranslate shrink-0" />
              <span>How to Install on iOS (Safari / iPhone / iPad)</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  1
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Tap the Share button</span>
                    <Share className="h-3.5 w-3.5 text-primary notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    In Safari&apos;s bottom toolbar, tap the square Share icon with the arrow pointing up.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  2
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Tap &quot;Add to Home Screen&quot;</span>
                    <PlusSquare className="h-3.5 w-3.5 text-primary notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Scroll down the actions list and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  3
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Tap &quot;Add&quot;</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Tap <strong>Add</strong> in the top-right corner. KindLink is now on your home screen!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {platform === 'android' && (
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary notranslate shrink-0" />
              <span>How to Install on Android (Chrome / Edge / Samsung)</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  1
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Open Browser Menu</span>
                    <MoreVertical className="h-3.5 w-3.5 text-primary notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Tap the three dots (⋮) in the top-right corner of Chrome or your browser.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  2
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Select &quot;Install app&quot;</span>
                    <Download className="h-3.5 w-3.5 text-primary notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  3
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Confirm Install</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Tap <strong>Install</strong> on the prompt. KindLink installs instantly!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {platform === 'desktop' && (
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-foreground flex items-center gap-2">
              <Laptop className="h-4 w-4 text-primary notranslate shrink-0" />
              <span>How to Install on Desktop (Chrome / Edge / Brave / Opera)</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  1
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Click Install in URL Bar</span>
                    <Download className="h-3.5 w-3.5 text-primary notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Look for the Install icon (⊕ or ⬇) in your browser address bar on the right.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  2
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Or use the Browser Menu</span>
                    <MoreVertical className="h-3.5 w-3.5 text-primary notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Click the three dots menu (⋮) &rarr; <strong>Save and share</strong> &rarr; <strong>Install KindLink...</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
                  3
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span>Launch Clean App Window</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate inline" />
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Click <strong>Install</strong>. KindLink runs in its own window with zero browser tab clutter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Badges */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/70">
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-muted/30">
            <Zap className="h-4 w-4 text-amber-500 notranslate mb-1" />
            <span className="text-[10px] font-bold text-foreground leading-tight">Instant 1-Tap Access</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-muted/30">
            <Siren className="h-4 w-4 text-rose-500 notranslate mb-1" />
            <span className="text-[10px] font-bold text-foreground leading-tight">Emergency SOS Alerts</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-muted/30">
            <ShieldCheck className="h-4 w-4 text-emerald-500 notranslate mb-1" />
            <span className="text-[10px] font-bold text-foreground leading-tight">Verified 100% Free</span>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 p-3 sm:p-4 border-t border-border/80 bg-card shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-xs shadow-xs transition touch-target"
        >
          Got it
        </button>
      </div>
    </ModalOverlay>
  );
}
