'use client';

import React, { useRef, useEffect } from 'react';
import {
  User,
  Clock,
  Award,
  TrendingUp,
  ShieldCheck,
  Sliders,
  LucideIcon,
} from 'lucide-react';

export type ProfileTab = 'overview' | 'activity' | 'badges' | 'impact' | 'verification' | 'settings';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  activityCount?: number;
  badgesCount?: number;
  hasVerificationAlert?: boolean;
}

interface TabItem {
  id: ProfileTab;
  label: string;
  icon: LucideIcon;
  count?: number;
  alert?: boolean;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  activityCount = 0,
  badgesCount = 0,
  hasVerificationAlert = false,
}: ProfileTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Record<ProfileTab, HTMLButtonElement | null>>({} as any);

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: User },
    {
      id: 'activity',
      label: 'Activity',
      icon: Clock,
      count: activityCount > 0 ? activityCount : undefined,
    },
    {
      id: 'badges',
      label: 'Badges',
      icon: Award,
      count: badgesCount > 0 ? badgesCount : undefined,
    },
    { id: 'impact', label: 'Impact', icon: TrendingUp },
    {
      id: 'verification',
      label: 'Verification',
      icon: ShieldCheck,
      alert: hasVerificationAlert,
    },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  // Auto scroll active tab into view smoothly inside horizontal container ONLY (never scroll window)
  useEffect(() => {
    const activeEl = tabButtonRefs.current[activeTab];
    const container = scrollContainerRef.current;
    if (container && activeEl) {
      const containerLeft = container.getBoundingClientRect().left;
      const activeLeft = activeEl.getBoundingClientRect().left;
      const offset = activeLeft - containerLeft - (container.clientWidth / 2 - activeEl.clientWidth / 2);
      container.scrollTo({ left: container.scrollLeft + offset, behavior: 'smooth' });
    }
  }, [activeTab]);

  // Keyboard navigation for tablist
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex >= 0) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      onTabChange(nextTab.id);
      tabButtonRefs.current[nextTab.id]?.focus({ preventScroll: true });
    }
  };

  return (
    <div
      id="profile-tabs-strip"
      className="sticky top-[var(--header-height)] z-20 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 bg-background/95 backdrop-blur-md border-b border-border/80 py-2.5 transition-colors"
    >
      <div className="relative max-w-5xl mx-auto">
        {/* Soft fade edges on left & right to indicate scrollability */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-background via-background/60 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-l from-background via-background/60 to-transparent z-10" />

        {/* Scrollable tab strip */}
        <div
          ref={scrollContainerRef}
          role="tablist"
          aria-label="Profile navigation tabs"
          className="snap-x snap-mandatory flex items-center overflow-x-auto no-scrollbar gap-2 px-1 py-1"
        >
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabButtonRefs.current[tab.id] = el;
                }}
                id={`profile-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`profile-tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`snap-start shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all touch-target select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'bg-primary text-white shadow-soft ring-2 ring-primary/25'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 notranslate shrink-0" />
                <span>{tab.label}</span>

                {/* Counter pill */}
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}

                {/* Verification alert indicator dot */}
                {tab.alert && (
                  <span
                    aria-label="Verification pending or unverified"
                    className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
