'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  HandHeart,
  Bell,
  MapPin,
  ArrowRight,
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
    title: 'Ask for help',
    description: 'Tell us what you need and where. It takes under a minute.',
    icon: HandHeart,
  },
  {
    step: 2,
    title: 'Neighbours get an alert',
    description:
      'Verified helpers nearby see your request. The most urgent ones come first.',
    icon: Bell,
  },
  {
    step: 3,
    title: 'Help arrives',
    description: 'Pick a helper, follow them on the map, and say thanks.',
    icon: MapPin,
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
      className={`rounded-3xl border border-border bg-card shadow-soft transition-all overflow-hidden ${className}`}
    >
      {/* Collapsed state header: fully tappable, vertically centered */}
      <button
        type="button"
        id="how-it-works-toggle"
        aria-expanded={isOpen}
        aria-controls="how-it-works-content"
        onClick={handleToggle}
        className="group flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Tinted icon chip */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5 notranslate" />
          </div>

          <div className="min-w-0">
            {/* Title on ONE line with inline "3 steps" pill on same row */}
            <div className="flex items-center gap-2 flex-nowrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground whitespace-nowrap">
                How KindLink Works
              </h3>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0 whitespace-nowrap">
                3 steps
              </span>
            </div>

            {/* One-line subtitle in plain language */}
            <p className="text-xs text-muted-foreground mt-0.5">
              Neighbours helping neighbours, free for everyone
            </p>
          </div>
        </div>

        {/* 44px round chevron button */}
        <div
          className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full flex items-center justify-center bg-muted text-muted-foreground group-hover:bg-muted/80 transition-colors"
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
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-6 pt-2 sm:px-6 border-t border-border/60">
            {/* Vertical stepper with numbered circles connected by a thin line */}
            <div className="pt-2">
              {STEPS.map((step, idx) => {
                const isLast = idx === STEPS.length - 1;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.step}
                    className="flex items-stretch gap-3.5 pb-5 last:pb-0"
                  >
                    {/* Numbered circle + connecting line */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                        {step.step}
                      </div>
                      {!isLast && (
                        <div
                          className="w-[2px] flex-1 bg-border my-1.5 min-h-[20px]"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Step details */}
                    <div className="min-w-0 flex-1 pt-0.5 pb-0.5">
                      <div className="flex items-center gap-2">
                        <StepIcon
                          className="h-4 w-4 text-primary notranslate shrink-0"
                          aria-hidden="true"
                        />
                        <h4 className="text-sm font-semibold text-foreground leading-snug">
                          {step.title}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Small trust line + Ask for Help text button */}
            <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <ShieldCheck
                  className="h-3.5 w-3.5 text-primary notranslate shrink-0"
                  aria-hidden="true"
                />
                <span>Every helper is verified.</span>
              </div>

              <button
                type="button"
                onClick={handleAskForHelp}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md py-1 px-1.5 -mr-1.5 cursor-pointer"
              >
                <span>Ask for Help</span>
                <ArrowRight className="h-3.5 w-3.5 notranslate" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowItWorksCard;
