'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getCategoryToken, CategoryColorToken } from '@/lib/data/categoryColors';
import { CATEGORY_ICON_MAP } from '@/lib/data/categories';

export type CategoryEmblemSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type CategoryEmblemVariant = 'gradient' | 'luminous' | 'subtle';

export interface CategoryEmblemProps {
  /** The category key (e.g. 'blood', 'equipment', 'elderly', etc.) */
  category?: string | null;
  /** Optional custom category label for 'other' */
  customLabel?: string | null;
  /** Size presets: xs (24px), sm (32px), md (40px), lg (48px), xl (56px) */
  size?: CategoryEmblemSize;
  /** Visual variant: gradient (vibrant with white icon), luminous (tinted with colored icon), subtle (minimal) */
  variant?: CategoryEmblemVariant;
  /** Enable luminous ambient rim drop-glow */
  glow?: boolean;
  /** Enable micro-specular crystal sheen reflection */
  withSheen?: boolean;
  /** Custom classes for outer emblem wrapper */
  className?: string;
  /** Custom classes for Lucide icon */
  iconClassName?: string;
  /** Optional override icon */
  overrideIcon?: LucideIcon;
}

const SIZE_CONFIGS: Record<
  CategoryEmblemSize,
  {
    container: string;
    icon: string;
    radius: string;
  }
> = {
  xs: {
    container: 'h-6 w-6 min-w-[24px]',
    icon: 'h-3.5 w-3.5',
    radius: 'rounded-lg',
  },
  sm: {
    container: 'h-8 w-8 min-w-[32px]',
    icon: 'h-4 w-4',
    radius: 'rounded-xl',
  },
  md: {
    container: 'h-10 w-10 min-w-[40px]',
    icon: 'h-5 w-5',
    radius: 'rounded-2xl',
  },
  lg: {
    container: 'h-12 w-12 min-w-[48px]',
    icon: 'h-6 w-6',
    radius: 'rounded-2xl',
  },
  xl: {
    container: 'h-14 w-14 min-w-[56px]',
    icon: 'h-7 w-7',
    radius: 'rounded-3xl',
  },
};

export function CategoryEmblem({
  category,
  customLabel,
  size = 'md',
  variant = 'gradient',
  glow = true,
  withSheen = true,
  className = '',
  iconClassName = '',
  overrideIcon,
}: CategoryEmblemProps) {
  const token: CategoryColorToken = getCategoryToken(category, customLabel);
  const IconComponent = overrideIcon || token.icon || CATEGORY_ICON_MAP.HelpCircle;
  const cfg = SIZE_CONFIGS[size];

  if (variant === 'luminous') {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 border transition-all duration-200 shadow-2xs ${cfg.container} ${cfg.radius} ${className}`}
        style={{
          backgroundColor: token.lightBg,
          borderColor: token.border,
          color: token.primary,
        }}
        title={token.name}
      >
        <IconComponent className={`${cfg.icon} notranslate shrink-0 stroke-[2.2] ${iconClassName}`} />
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 bg-muted/60 text-muted-foreground border border-border/80 transition-all duration-200 ${cfg.container} ${cfg.radius} ${className}`}
        title={token.name}
      >
        <IconComponent className={`${cfg.icon} notranslate shrink-0 stroke-[2.2] ${iconClassName}`} />
      </div>
    );
  }

  // Default: 'gradient' emblem with vibrant multi-stop gradient, micro-specular rim glow, and white icon
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 text-white bg-gradient-to-br ${
        token.gradient
      } ${cfg.container} ${cfg.radius} ${
        glow ? `shadow-md ${token.glowTailwind}` : 'shadow-xs'
      } ring-1 ring-inset ring-white/25 overflow-hidden transition-all duration-200 group-hover:scale-105 select-none ${className}`}
      title={token.name}
    >
      {/* Micro-specular top-down highlight sheen */}
      {withSheen && (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]"
          aria-hidden="true"
        />
      )}

      {/* Ambient bottom depth shade */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent rounded-b-[inherit]"
        aria-hidden="true"
      />

      {/* Category Lucide Icon with drop shadow for extra luminescence */}
      <IconComponent
        className={`relative z-10 ${cfg.icon} notranslate shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] stroke-[2.2] ${iconClassName}`}
      />
    </div>
  );
}
