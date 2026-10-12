'use client';

import React, { useState } from 'react';
import {
  Heart,
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Flame,
  AlertTriangle,
  PlusCircle,
  Atom,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpCategory, HelpRequest } from '@/lib/data/types';
import { EmergencySosModal } from '../shell/EmergencySosModal';

export function HomeView() {
  const {
    requests,
    userProfile,
    setCurrentView,
    setSelectedRequestId,
    setFilterCategory,
  } = useKindLinkStore();

  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  // Top 3 urgent requests sorted by Help Gravity score descending
  const urgentNearYou = [...requests]
    .sort((a, b) => b.helpGravityScore - a.helpGravityScore)
    .slice(0, 3);

  const categories: { key: HelpCategory; label: string; icon: React.ReactNode; count: number }[] = [
    {
      key: 'blood',
      label: 'Blood Donation',
      icon: <Droplets className="h-4 w-4 text-rose-500 notranslate" />,
      count: requests.filter((r) => r.category === 'blood').length,
    },
    {
      key: 'equipment',
      label: 'Medical Gear',
      icon: <Stethoscope className="h-4 w-4 text-teal-500 notranslate" />,
      count: requests.filter((r) => r.category === 'equipment').length,
    },
    {
      key: 'elderly',
      label: 'Elderly Care',
      icon: <Users className="h-4 w-4 text-blue-500 notranslate" />,
      count: requests.filter((r) => r.category === 'elderly').length,
    },
    {
      key: 'books',
      label: 'Books & Study',
      icon: <BookOpen className="h-4 w-4 text-emerald-500 notranslate" />,
      count: requests.filter((r) => r.category === 'books').length,
    },
    {
      key: 'transport',
      label: 'Emergency Transit',
      icon: <Car className="h-4 w-4 text-amber-500 notranslate" />,
      count: requests.filter((r) => r.category === 'transport').length,
    },
  ];

  const handleCategoryClick = (cat: HelpCategory) => {
    setFilterCategory(cat);
    setCurrentView('requests');
  };

  const handleRequestClick = (req: HelpRequest) => {
    setSelectedRequestId(req.id);
    setCurrentView('requests');
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 sm:pb-8">
      {/* 1. Hero Greeting Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 border border-border shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 notranslate" />
              <span>Help is just next door</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Namaste, {userProfile.name} 🙏
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              Burnpur & Asansol Hub · 48 verified local helpers on active standby. No cost, 100% community run.
            </p>
          </div>

          {/* Big Action Buttons Duo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentView('new')}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-white shadow-soft transition hover:bg-primary/90 active:scale-98 touch-target"
            >
              <PlusCircle className="h-5 w-5 notranslate" />
              <span>Ask for Help</span>
            </button>
            <button
              onClick={() => setSosModalOpen(true)}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-urgency-critical px-6 py-4 text-base font-bold text-white shadow-soft transition hover:bg-red-700 active:scale-98 touch-target animate-beacon"
            >
              <AlertTriangle className="h-5 w-5 notranslate" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>

        {/* 2. Live Community Stats Bar */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-border">
          <div className="p-3.5 rounded-2xl bg-background border border-border/80 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground leading-none">48</p>
              <p className="text-xs text-muted-foreground mt-0.5">Helpers Nearby</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border border-border/80 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Zap className="h-5 w-5 notranslate" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground leading-none">8 min</p>
              <p className="text-xs text-muted-foreground mt-0.5">Avg Response</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border border-border/80 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Heart className="h-5 w-5 notranslate" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground leading-none">1,240+</p>
              <p className="text-xs text-muted-foreground mt-0.5">Acts in Asansol</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border border-border/80 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <ShieldCheck className="h-5 w-5 notranslate" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground leading-none">98.4%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trust Match</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category Filter Chips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Browse Aid by Category</h2>
          <button
            onClick={() => {
              setFilterCategory('all');
              setCurrentView('requests');
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            See all categories →
          </button>
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryClick(cat.key)}
              className="flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition text-foreground text-xs font-semibold shadow-sm touch-target"
            >
              {cat.icon}
              <span>{cat.label}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-bold">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Urgent Near You Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-urgency-critical/10 text-urgency-critical">
              <Flame className="h-4 w-4 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Urgent Near You</h2>
              <p className="text-xs text-muted-foreground">Ranked by Newtonian Help Gravity equation</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('requests')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All ({requests.length})</span>
            <ArrowRight className="h-3.5 w-3.5 notranslate" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {urgentNearYou.map((req) => (
            <div
              key={req.id}
              onClick={() => handleRequestClick(req)}
              className="group rounded-3xl border border-border bg-card p-5 shadow-soft hover:shadow-md hover:border-primary/50 transition cursor-pointer flex flex-col justify-between text-left"
            >
              <div>
                {/* Header row with badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                      req.urgency === 'critical'
                        ? 'bg-urgency-critical/10 text-urgency-critical border border-urgency-critical/20'
                        : req.urgency === 'high'
                        ? 'bg-urgency-high/10 text-urgency-high border border-urgency-high/20'
                        : req.urgency === 'medium'
                        ? 'bg-urgency-medium/10 text-urgency-medium border border-urgency-medium/20'
                        : 'bg-urgency-low/10 text-urgency-low border border-urgency-low/20'
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3 notranslate" />
                    {req.urgency}
                  </span>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Atom className="h-3 w-3 notranslate" />
                    <span>Score: {req.helpGravityScore}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                  {req.title}
                </h3>

                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                  {req.description}
                </p>

                {/* Specific category details */}
                {req.bloodGroup && (
                  <div className="mt-3 inline-block px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    Blood Group: {req.bloodGroup} ({req.unitsNeeded || 1} units)
                  </div>
                )}
                {req.itemType && (
                  <div className="mt-3 inline-block px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
                    Item: {req.itemType}
                  </div>
                )}
              </div>

              {/* Footer with distance & button */}
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs">
                <div className="space-y-0.5 text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary notranslate" />
                    <span className="truncate max-w-[130px] sm:max-w-[160px]">{req.locationName}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3 notranslate" />
                    <span>{req.distanceKm} km away · waiting {req.waitingMinutes}m</span>
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestClick(req);
                  }}
                  className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition shadow-sm touch-target"
                >
                  Help
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Collapsible 'How KindLink Works' (3 Steps) */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft transition-all">
        <button
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="flex w-full items-center justify-between text-left touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">How KindLink Works in 3 Steps</h3>
              <p className="text-xs text-muted-foreground">Community mutual aid with zero middleman and full transparency</p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-muted text-muted-foreground">
            {howItWorksOpen ? <ChevronUp className="h-4 w-4 notranslate" /> : <ChevronDown className="h-4 w-4 notranslate" />}
          </div>
        </button>

        {howItWorksOpen && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-background border border-border">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black mb-3">
                1
              </span>
              <h4 className="text-sm font-bold text-foreground">Post Request in 30s</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Describe the urgent requirement (blood, wheelchair, medication, books, transport). No complex signups required.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black mb-3">
                2
              </span>
              <h4 className="text-sm font-bold text-foreground">Physics Urgency Match</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Our Newton-inspired algorithm ranks nearest and most time-critical needs, alerting verified local student and citizen helpers.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black mb-3">
                3
              </span>
              <h4 className="text-sm font-bold text-foreground">Safe & Dignified Delivery</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Direct hand-off with OTP and volunteer badges. 100% free with strict anti-exploitation checks.
              </p>
            </div>
          </div>
        )}
      </div>

      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </div>
  );
}
