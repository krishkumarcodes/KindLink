'use client';

import React from 'react';
import { Atom, Info, X } from 'lucide-react';
import { HelpRequest } from '@/lib/data/types';
import { explainHelpGravity } from '@/lib/data/physics';

interface WhyThisRankModalProps {
  request: HelpRequest | null;
  open: boolean;
  onClose: () => void;
}

export function WhyThisRankModal({ request, open, onClose }: WhyThisRankModalProps) {
  if (!open || !request) return null;

  const breakdown = explainHelpGravity(
    request.category,
    request.waitingMinutes,
    request.distanceKm
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl text-card-foreground max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Atom className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Why This Rank?</h2>
              <p className="text-xs text-muted-foreground">Physics Urgency Engine Breakdown</p>
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

        {/* Big Score Summary Banner */}
        <div className="mt-4 p-5 rounded-3xl bg-primary/5 border border-primary/20 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Calculated Help Gravity Score
          </span>
          <div className="text-4xl font-black text-primary mt-1">{breakdown.score}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Higher gravitational score puts this aid request higher on every local volunteer&apos;s feed.
          </p>
        </div>

        {/* Formula Card */}
        <div className="mt-4 rounded-2xl bg-muted/60 p-4 border border-border">
          <div className="flex items-center justify-between text-xs font-bold text-foreground mb-2">
            <span>Newtonian Help Gravity Formula</span>
            <span className="text-[11px] font-normal text-muted-foreground">Physics Project Model</span>
          </div>
          <div className="bg-background rounded-xl p-3 text-center font-mono text-xs sm:text-sm text-foreground overflow-x-auto notranslate">
            Score = Weight × (1 + 0.05 × t) / (1 + r)²
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Inspired by Newton&apos;s Law of Gravitation (F = G·m₁·m₂/r²). Urgency scales with severity weight and waiting duration, but falls off quadratically with distance.
          </p>
        </div>

        {/* Variable Breakdown Table */}
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Current Request Parameters
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-background border border-border">
              <span className="text-muted-foreground block text-[11px]">Type Weight</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">
                {breakdown.typeWeight} / 10
              </span>
              <span className="text-[10px] text-primary">{breakdown.categoryName}</span>
            </div>

            <div className="p-3 rounded-2xl bg-background border border-border">
              <span className="text-muted-foreground block text-[11px]">Waiting Factor</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">
                {breakdown.timeFactor}x
              </span>
              <span className="text-[10px] text-muted-foreground">{breakdown.waitingMinutes} min waiting</span>
            </div>

            <div className="p-3 rounded-2xl bg-background border border-border">
              <span className="text-muted-foreground block text-[11px]">Distance Denominator</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">
                {breakdown.distanceDenominator}
              </span>
              <span className="text-[10px] text-muted-foreground">{breakdown.distanceKm} km proximity</span>
            </div>
          </div>
        </div>

        {/* Human explanation */}
        <div className="mt-4 rounded-2xl bg-background border border-border p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5 notranslate" />
          <p>{breakdown.explanation}</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition shadow-soft touch-target"
        >
          Understood
        </button>
      </div>
    </div>
  );
}
