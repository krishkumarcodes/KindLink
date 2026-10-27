'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  FileText,
  Settings,
  Globe,
  Download,
  LogOut,
  Siren,
  ShieldCheck,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { getCurrentLanguageCode } from '@/lib/translate/googleTranslate';
import { AnchoredPopover } from '@/components/ui/OverlayPortal';
import { usePwaInstall } from '@/lib/pwa/usePwaInstall';

export interface ProfileQuickMenuProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  onOpenSos: () => void;
  onOpenLanguage: () => void;
}

export function ProfileQuickMenu({
  open,
  onClose,
  anchorRef,
  onOpenSos,
  onOpenLanguage,
}: ProfileQuickMenuProps) {
  const { userProfile, setCurrentView } = useKindLinkStore();
  const { isInstalled, triggerInstall } = usePwaInstall();
  const [copied, setCopied] = useState(false);
  const [currentLangCode, setCurrentLangCode] = useState('en');

  // Sync language code
  useEffect(() => {
    setCurrentLangCode(getCurrentLanguageCode());
  }, [open]);

  // Handle username 1-tap copy
  const handleCopyUsername = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const handle = `@${userProfile.username || 'volunteer'}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(handle);
        setCopied(true);
        toast.success(`Copied ${handle} to clipboard!`);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error('Failed to copy username');
    }
  };

  // Handle PWA installation
  const handleInstallApp = async () => {
    onClose();
    await triggerInstall();
  };

  // Handle sign out
  const handleSignOut = async () => {
    onClose();
    try {
      const supabaseClient = createClient();
      await supabaseClient.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.reload();
  };

  // Initials
  const initials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const helpsCount = userProfile.helpsCount ?? 0;
  const trustScore = userProfile.rating ? Number(userProfile.rating).toFixed(1) : '5.0';

  return (
    <AnchoredPopover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      align="right"
      offset={8}
      margin={12}
      role="menu"
      ariaLabel="Profile Quick Menu"
      style={{
        width: 'min(280px, calc(100vw - 20px))',
        maxHeight: 'calc(100dvh - 72px)',
      }}
      className="p-3 sm:p-3.5 select-none max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain backdrop-blur-xl bg-card/95 supports-[backdrop-filter]:bg-card/95 border border-border/80 shadow-2xl rounded-3xl"
    >
      {/* 1. User Header Summary: Avatar + Name (up to 2 lines) + @username (1-tap copy) + ONE verification chip */}
      {(() => {
        const isOrg = Boolean(userProfile.isOrganization || userProfile.organizationVerified);
        const isVerified = userProfile.verificationState === 'verified';
        return (
          <div className="flex items-start gap-3 p-1 pb-3 border-b border-border/80">
            {/* Luminous multi-stop border gradient Avatar with status pulse pip */}
            <div className="relative shrink-0">
              <div
                className={`p-[2px] rounded-2xl transition-all ${
                  isOrg
                    ? 'bg-gradient-to-tr from-violet-600 via-indigo-500 to-purple-500 shadow-sm shadow-indigo-500/25 ring-1 ring-indigo-400/30'
                    : isVerified
                    ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 shadow-sm shadow-teal-500/20 ring-1 ring-teal-400/30'
                    : 'bg-gradient-to-tr from-border via-primary/30 to-border'
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-card overflow-hidden">
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.name || 'User'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white font-black text-xs sm:text-sm shadow-inner">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Status pulse pip: live online / community responder */}
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center"
                title="Active Responder"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-card" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {/* Full display name (wraps up to 2 lines) */}
              <div className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug break-words">
                {userProfile.name || 'KindLink Member'}
              </div>

              {/* @username with 1-tap copy button */}
              <button
                type="button"
                onClick={handleCopyUsername}
                className="group/copy flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 touch-target py-0.5 text-left"
                title="Click to copy handle"
                aria-label={`Copy handle @${userProfile.username || 'volunteer'}`}
              >
                <span className="font-mono text-[11px] font-semibold text-primary/90">
                  @{userProfile.username || 'volunteer'}
                </span>
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500 shrink-0 notranslate animate-in zoom-in-75" />
                ) : (
                  <Copy className="h-3 w-3 opacity-60 group-hover/copy:opacity-100 shrink-0 notranslate transition-opacity" />
                )}
              </button>

              {/* ONE verification chip with refined metallic checkmark (DO NOT show organisation here) */}
              {isVerified && (
                <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-2xs">
                  <span className="relative flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-tr from-amber-200 via-emerald-200 to-teal-400 p-[1px] shadow-2xs">
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-emerald-600 text-white">
                      <ShieldCheck className="h-2 w-2 stroke-[2.8] notranslate" />
                    </span>
                  </span>
                  <span>{isOrg ? 'Verified Org' : 'Verified Volunteer'}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 2. Real Store Data Stats: "Helps given" and "Trust score" */}
      <div className="my-2 grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-muted/40 border border-border/60">
        <div className="text-center px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Helps given
          </span>
          <span className="text-xs sm:text-sm font-black text-foreground">
            {helpsCount}
          </span>
        </div>
        <div className="text-center px-1 border-l border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
            Trust score
          </span>
          <span className="text-xs sm:text-sm font-black text-primary flex items-center justify-center gap-1">
            <span>{trustScore}</span>
            <span className="text-amber-500 text-xs">★</span>
          </span>
        </div>
      </div>

      {/* 3. Navigation Rows: Equal Row Heights, Hover and Press States, Accessible Keyboard Navigation */}
      <div className="space-y-1">
        {/* Row 1: View profile and badges */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            setCurrentView('profile');
          }}
          className="flex w-full items-center gap-2.5 px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.99] transition-all text-left touch-target"
        >
          <User className="h-4 w-4 text-primary shrink-0 notranslate" />
          <span>View profile and badges</span>
        </button>

        {/* Row 2: My requests */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            setCurrentView('requests');
          }}
          className="flex w-full items-center gap-2.5 px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.99] transition-all text-left touch-target"
        >
          <FileText className="h-4 w-4 text-primary shrink-0 notranslate" />
          <span>My requests</span>
        </button>

        {/* Row 2.5: Quick Search & Commands (⌘K) */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('kindlink:open-command-palette'));
            }
          }}
          className="flex w-full items-center justify-between gap-2.5 px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.99] transition-all text-left touch-target"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="h-4 w-4 text-primary shrink-0 notranslate" />
            <span>Quick search</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground shadow-xs shrink-0">
            ⌘K
          </kbd>
        </button>

        {/* Row 3: Settings and appearance (Theme, text size, language) */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            setCurrentView('settings');
          }}
          className="flex w-full items-center gap-2.5 px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.99] transition-all text-left touch-target"
        >
          <Settings className="h-4 w-4 text-primary shrink-0 notranslate" />
          <div className="flex flex-col min-w-0">
            <span className="leading-tight">Settings & appearance</span>
            <span className="text-[10px] text-muted-foreground font-normal truncate">
              Theme, text size, language
            </span>
          </div>
        </button>

        {/* Row 4: Language (shows current code) */}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenLanguage();
          }}
          className="flex w-full items-center justify-between gap-2.5 px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.99] transition-all text-left touch-target"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe className="h-4 w-4 text-primary shrink-0 notranslate" />
            <span>Language</span>
          </div>
          <span className="notranslate px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider shrink-0">
            {currentLangCode}
          </span>
        </button>

        {/* Row 5: Install app or App Installed indicator */}
        {!isInstalled ? (
          <button
            type="button"
            role="menuitem"
            onClick={handleInstallApp}
            className="flex w-full items-center gap-2.5 px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.99] transition-all text-left touch-target"
          >
            <Download className="h-4 w-4 text-primary shrink-0 notranslate" />
            <span>Install app</span>
          </button>
        ) : (
          <div
            className="flex w-full items-center justify-between px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-muted-foreground bg-muted/30 select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Download className="h-4 w-4 text-emerald-500 shrink-0 notranslate" />
              <span>KindLink App</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              Installed ✓
            </span>
          </div>
        )}

        {/* Row 6: Sign out */}
        <button
          type="button"
          role="menuitem"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-2.5 h-10 min-h-[40px] rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.99] transition-all text-left touch-target"
        >
          <LogOut className="h-4 w-4 shrink-0 notranslate" />
          <span>Sign out</span>
        </button>
      </div>

      {/* 4. Separated red row "Open Emergency SOS" (opens SOS panel, does not trigger alert) */}
      <div className="pt-2 mt-1 border-t border-border/80">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenSos();
          }}
          className="flex w-full items-center justify-center gap-2 h-10 min-h-[40px] px-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 active:bg-rose-600/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all touch-target"
        >
          <Siren className="h-4 w-4 notranslate shrink-0 animate-pulse" />
          <span>Open Emergency SOS</span>
        </button>
      </div>
    </AnchoredPopover>
  );
}
