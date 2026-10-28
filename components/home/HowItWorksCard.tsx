'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  HandHeart,
  Bell,
  MapPin,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';

export interface HowItWorksCardProps {
  /** Optional callback when user clicks the "Ask for Help" button */
  onAskForHelp?: () => void;
  /** Optional className for the root container */
  className?: string;
  /** Optional override for default open state */
  defaultOpen?: boolean;
}

const STORAGE_KEY_VISITS = 'kindlink_home_visits';
const STORAGE_KEY_OPEN = 'kindlink_how_it_works_open';

const STEPS = [
  {
    step: 1,
    number: '01',
    title: 'Ask for help',
    description: 'Tell us what you need and where. It takes under a minute.',
    icon: HandHeart,
    badgeColor: 'from-teal-400 via-teal-500 to-emerald-600 shadow-teal-500/25',
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    chipText: '⚡ Under 1 min',
  },
  {
    step: 2,
    number: '02',
    title: 'Neighbours get an alert',
    description:
      'Verified helpers nearby see your request. The most urgent ones come first.',
    icon: Bell,
    badgeColor: 'from-amber-400 via-amber-500 to-orange-500 shadow-amber-500/25',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    chipText: '📍 Hyperlocal radar',
  },
  {
    step: 3,
    number: '03',
    title: 'Help arrives',
    description: 'Pick a helper, follow them on the map, and say thanks.',
    icon: MapPin,
    badgeColor: 'from-rose-500 via-rose-600 to-indigo-600 shadow-rose-500/25',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    chipText: '🛡️ Verified & free',
  },
];

export function HowItWorksCard({
  onAskForHelp,
  className = '',
  defaultOpen,
}: HowItWorksCardProps) {
  const { setCurrentView } = useKindLinkStore();
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const visitCountedRef = useRef(false);

  useEffect(() => {
    if (visitCountedRef.current) return;
    visitCountedRef.current = true;

    try {
      const rawVisits = localStorage.getItem(STORAGE_KEY_VISITS);
      const visits = rawVisits ? parseInt(rawVisits, 10) : 0;
      const currentVisits = Number.isFinite(visits) && visits >= 0 ? visits : 0;
      const newVisits = currentVisits + 1;
      localStorage.setItem(STORAGE_KEY_VISITS, String(newVisits));

      const savedOpenChoice = localStorage.getItem(STORAGE_KEY_OPEN);
      if (savedOpenChoice !== null) {
        setIsOpen(savedOpenChoice === 'true');
      } else if (defaultOpen !== undefined) {
        setIsOpen(defaultOpen);
      } else {
        // Show it expanded the first 2 times a new user opens Home, collapsed after that
        setIsOpen(newVisits <= 2);
      }
    } catch {
      // LocalStorage might be disabled in private browsing modes
      if (defaultOpen !== undefined) {
        setIsOpen(defaultOpen);
      }
    }
  }, [defaultOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_OPEN, String(next));
      } catch {
        // Ignore storage write failure
      }
      return next;
    });
  };

  const handleAskForHelp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAskForHelp) {
      onAskForHelp();
    } else {
      setCurrentView('new');
    }
  };

  return (
    <div
      className={`group/card relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 bg-card/85 dark:bg-card/75 backdrop-blur-md transform-gpu shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
    >
      {/* Specular top rim micro-highlight line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Crystal water sheen reflection overlay */}
      <div
        className="crystal-card-sheen crystal-card-ambient-sheen pointer-events-none transform-gpu"
        aria-hidden="true"
      />

      {/* Ambient luminous corner glow */}
      <div
        className="pointer-events-none absolute -top-14 -right-14 w-36 h-36 rounded-full blur-xl transform-gpu opacity-20 dark:opacity-25 bg-gradient-to-br from-teal-400 via-emerald-400 to-indigo-500 z-0"
        aria-hidden="true"
      />

      {/* Collapsed state header: fully tappable, vertically centered */}
      <button
        type="button"
        id="how-it-works-toggle"
        aria-expanded={isOpen}
        aria-controls="how-it-works-content"
        onClick={handleToggle}
        className="group flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset transition-colors cursor-pointer select-none relative z-10"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Luminous crystal shield badge with specular sheen */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 via-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-inset ring-white/30 overflow-hidden">
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 via-white/10 to-transparent"
              aria-hidden="true"
            />
            <ShieldCheck className="h-5 w-5 notranslate text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] stroke-[2.3]" />
          </div>

          <div className="min-w-0">
            {/* Title on ONE line with inline "3 steps" pill on same row */}
            <div className="flex items-center gap-2 flex-nowrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground whitespace-nowrap">
                How KindLink Works
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0 whitespace-nowrap shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                3 steps
              </span>
            </div>

            {/* One-line subtitle in plain language */}
            <p className="text-xs text-muted-foreground mt-0.5">
              Neighbours helping neighbours, free for everyone
            </p>
          </div>
        </div>

        {/* 44px round glassmorphic chevron button */}
        <div
          className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full flex items-center justify-center bg-muted/70 dark:bg-muted/40 border border-border/70 dark:border-white/10 text-muted-foreground group-hover:text-foreground group-hover:bg-muted/90 group-hover:border-primary/40 transition-all duration-200"
          aria-hidden="true"
        >
          <ChevronDown
            className={`h-5 w-5 notranslate transition-transform duration-300 ease-out motion-reduce:transition-none ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded state: smooth height animation, reduced motion respected, aria-expanded set */}
      <div
        id="how-it-works-content"
        role="region"
        aria-labelledby="how-it-works-toggle"
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none relative z-10 ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-5 pt-3 sm:px-6 sm:pb-6 border-t border-border/60 dark:border-white/10">
            {/* 3 Refined Numbered Step Cards in a modern responsive layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.step}
                    className="relative overflow-hidden rounded-2xl p-4 bg-muted/40 dark:bg-muted/20 border border-border/70 dark:border-white/10 backdrop-blur-xs hover:border-primary/40 hover:bg-muted/60 transition-all duration-200 group/step flex flex-col justify-between"
                  >
                    {/* Top specular highlight line on each cardlet */}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent"
                      aria-hidden="true"
                    />

                    {/* Step Card Header: Glowing Numbered Badge + HD Icon + Duration Chip */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Glowing numbered badge */}
                        <div
                          className={`relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${step.badgeColor} text-white text-xs font-black shadow-md ring-1 ring-inset ring-white/40 overflow-hidden shrink-0`}
                        >
                          <span
                            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent"
                            aria-hidden="true"
                          />
                          <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                            {step.number}
                          </span>
                        </div>

                        {/* HD Icon Chip */}
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border ${step.iconBg} shrink-0`}
                        >
                          <StepIcon className="h-4 w-4 notranslate stroke-[2.2]" aria-hidden="true" />
                        </div>
                      </div>

                      {/* Micro Chip */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-background/80 dark:bg-card/80 border border-border/70 text-foreground/80 shadow-2xs whitespace-nowrap">
                        {step.chipText}
                      </span>
                    </div>

                    {/* Step Content */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {step.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Small trust line + Ask for Help CTA button */}
            <div className="mt-4 pt-3.5 border-t border-border/60 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5 notranslate" aria-hidden="true" />
                </div>
                <span>Every helper is verified. Community-run &amp; 100% free.</span>
              </div>

              <button
                type="button"
                onClick={handleAskForHelp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 dark:from-amber-400 dark:via-rose-400 dark:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_6px_20px_rgba(244,63,94,0.32)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_8px_24px_rgba(244,63,94,0.42)] hover:brightness-105 active:scale-[0.97] transition-all duration-200 border border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 cursor-pointer select-none touch-target"
              >
                <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Ask for Help</span>
                <ArrowRight className="h-3.5 w-3.5 notranslate text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowItWorksCard;
