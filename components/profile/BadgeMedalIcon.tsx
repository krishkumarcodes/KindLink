'use client';

import React from 'react';
import {
  Award,
  HeartPulse,
  Zap,
  Timer,
  Star,
  BookOpen,
  Stethoscope,
  HeartHandshake,
  Car,
  Flame,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  PlusCircle,
  Pill,
  Building2,
  LucideIcon,
  Shield,
  Medal,
  Lock,
} from 'lucide-react';
import { BadgeTier } from '@/lib/data/badges';

interface BadgeMedalIconProps {
  iconName: string;
  tier: BadgeTier | 'locked';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isEarned?: boolean;
  className?: string;
  showLevelRing?: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  HeartPulse,
  Zap,
  Timer,
  Star,
  BookOpen,
  Stethoscope,
  HeartHandshake,
  Car,
  Flame,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Cross: PlusCircle,
  Pill,
  Building2,
  Shield,
  Medal,
};

export function BadgeMedalIcon({
  iconName,
  tier,
  size = 'md',
  isEarned = true,
  className = '',
  showLevelRing = true,
}: BadgeMedalIconProps) {
  const IconComponent = ICON_MAP[iconName] || Medal;

  // Size styling
  const sizeStyles = {
    sm: {
      container: 'h-10 w-10 min-w-10 min-h-10 text-xs',
      icon: 'h-5 w-5',
      ringWidth: 2,
      svgSize: 40,
    },
    md: {
      container: 'h-16 w-16 min-w-16 min-h-16 text-sm',
      icon: 'h-7 w-7',
      ringWidth: 3,
      svgSize: 64,
    },
    lg: {
      container: 'h-24 w-24 min-w-24 min-h-24 text-base',
      icon: 'h-11 w-11',
      ringWidth: 3.5,
      svgSize: 96,
    },
    xl: {
      container: 'h-28 w-28 min-w-28 min-h-28 text-lg',
      icon: 'h-14 w-14',
      ringWidth: 4,
      svgSize: 112,
    },
  }[size];

  // Tier color styling
  const tierConfig: Record<
    BadgeTier | 'locked',
    {
      ringColor: string;
      ringBg: string;
      iconColor: string;
      glowClass: string;
      gradientId: string;
      stop1: string;
      stop2: string;
    }
  > = {
    bronze: {
      ringColor: '#b45309', // amber-700
      ringBg: 'bg-gradient-to-br from-amber-700/20 via-amber-800/15 to-amber-950/20',
      iconColor: 'text-amber-700 dark:text-amber-500',
      glowClass: 'shadow-[0_0_15px_rgba(180,83,9,0.25)]',
      gradientId: 'bronze-grad',
      stop1: '#d97706',
      stop2: '#78350f',
    },
    silver: {
      ringColor: '#94a3b8', // slate-400
      ringBg: 'bg-gradient-to-br from-slate-200/40 via-slate-300/20 to-slate-500/20 dark:from-slate-700/40 dark:to-slate-900/40',
      iconColor: 'text-slate-600 dark:text-slate-200',
      glowClass: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]',
      gradientId: 'silver-grad',
      stop1: '#cbd5e1',
      stop2: '#64748b',
    },
    gold: {
      ringColor: '#eab308', // amber-500
      ringBg: 'bg-gradient-to-br from-amber-400/25 via-yellow-500/15 to-amber-600/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      glowClass: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]',
      gradientId: 'gold-grad',
      stop1: '#fde047',
      stop2: '#b45309',
    },
    platinum: {
      ringColor: '#06b6d4', // cyan-500
      ringBg: 'bg-gradient-to-br from-cyan-400/25 via-sky-500/15 to-indigo-600/25',
      iconColor: 'text-cyan-600 dark:text-cyan-300',
      glowClass: 'shadow-[0_0_22px_rgba(6,182,212,0.45)]',
      gradientId: 'plat-grad',
      stop1: '#67e8f9',
      stop2: '#3b82f6',
    },
    locked: {
      ringColor: '#9ca3af',
      ringBg: 'bg-muted/40',
      iconColor: 'text-muted-foreground/40',
      glowClass: '',
      gradientId: 'locked-grad',
      stop1: '#9ca3af',
      stop2: '#6b7280',
    },
  };

  const currentTier = !isEarned ? 'locked' : tier;
  const config = tierConfig[currentTier];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-300 select-none ${
        sizeStyles.container
      } ${config.ringBg} ${isEarned ? config.glowClass : 'opacity-70 grayscale'} ${className}`}
    >
      {showLevelRing && (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none -rotate-90"
          viewBox={`0 0 ${sizeStyles.svgSize} ${sizeStyles.svgSize}`}
        >
          <defs>
            <linearGradient id={`${config.gradientId}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.stop1} />
              <stop offset="100%" stopColor={config.stop2} />
            </linearGradient>
          </defs>
          <circle
            cx={sizeStyles.svgSize / 2}
            cy={sizeStyles.svgSize / 2}
            r={sizeStyles.svgSize / 2 - sizeStyles.ringWidth}
            fill="none"
            stroke={isEarned ? `url(#${config.gradientId}-${size})` : 'currentColor'}
            strokeWidth={sizeStyles.ringWidth}
            strokeDasharray={isEarned ? undefined : '3 3'}
            className={!isEarned ? 'text-muted-foreground/30' : ''}
          />
        </svg>
      )}

      {/* Main Icon */}
      <IconComponent
        className={`${sizeStyles.icon} ${config.iconColor} transition-transform duration-300 group-hover:scale-110 notranslate`}
        strokeWidth={2}
      />

      {/* Locked overlay lock symbol for locked badges */}
      {!isEarned && (
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground shadow-xs">
          <Lock className="h-2.5 w-2.5 notranslate" />
        </div>
      )}
    </div>
  );
}
