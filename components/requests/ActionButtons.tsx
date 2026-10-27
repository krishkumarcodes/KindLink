'use client';

import React from 'react';
import { Loader2, Share2, Flag, LucideIcon } from 'lucide-react';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { HelpCategory } from '@/lib/data/types';

export interface PrimaryHelpButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  category: HelpCategory | string;
  size?: 'card' | 'details' | 'offer';
  label?: string;
  icon?: LucideIcon;
  isLoading?: boolean;
}

export function PrimaryHelpButton({
  category,
  size = 'details',
  label,
  icon,
  isLoading = false,
  disabled,
  className = '',
  onClick,
  style,
  ...rest
}: PrimaryHelpButtonProps) {
  const token = getCategoryToken(category);
  const IconComponent = icon || token.icon;
  const defaultLabel = size === 'details' ? 'Offer help' : 'I can help';
  const displayLabel = label || defaultLabel;

  const heightClass =
    size === 'details' ? 'h-[52px]' : size === 'offer' ? 'h-[48px]' : 'h-[44px]';

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      style={{
        backgroundColor: token.primary,
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${token.glow}`,
        ...style,
      }}
      className={`group/btn relative overflow-hidden inline-flex items-center justify-center gap-2 px-5 ${heightClass} rounded-[16px] font-bold text-white text-sm bg-gradient-to-r ${token.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${token.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      {...rest}
    >
      {/* Specular top rim micro-highlight */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent z-10"
        aria-hidden="true"
      />
      {/* Micro-specular crystal sheen reflection */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]"
        aria-hidden="true"
      />
      {/* Ambient bottom depth shade */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]"
        aria-hidden="true"
      />

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0 notranslate relative z-10 stroke-[2.2]" />
      ) : (
        <IconComponent className="h-4 w-4 shrink-0 notranslate relative z-10 stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
      )}
      <span className="whitespace-nowrap truncate font-bold text-center leading-none relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
        {displayLabel}
      </span>
    </button>
  );
}

export interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'card' | 'details' | 'offer';
  variant?: 'outline' | 'destructive-outline' | 'subtle';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export function SecondaryButton({
  size = 'details',
  variant = 'outline',
  icon: IconComponent,
  isLoading = false,
  disabled,
  className = '',
  children,
  onClick,
  ...rest
}: SecondaryButtonProps) {
  const heightClass =
    size === 'details' ? 'h-[52px]' : size === 'offer' ? 'h-[48px]' : 'h-[44px]';

  const variantClass =
    variant === 'destructive-outline'
      ? 'border border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_8px_rgba(244,63,94,0.06)] hover:border-rose-500/60 hover:bg-rose-500/15 hover:shadow-md hover:shadow-rose-500/15'
      : variant === 'subtle'
      ? 'border border-border/60 bg-muted/60 dark:bg-muted/40 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.03)] hover:border-border hover:bg-muted/90 hover:shadow-sm'
      : 'border border-border/80 dark:border-white/15 bg-card/85 dark:bg-card/75 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.04)] hover:border-primary/40 hover:bg-muted/80 hover:shadow-md hover:shadow-primary/10';

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 ${heightClass} rounded-[16px] backdrop-blur-md font-semibold text-sm active:scale-[0.98] transition-all duration-150 touch-target disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClass} ${className}`}
      {...rest}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0 notranslate stroke-[2.2]" />}
      {!isLoading && IconComponent && <IconComponent className="h-4 w-4 shrink-0 notranslate stroke-[2.2]" />}
      <span className="whitespace-nowrap truncate leading-none">{children}</span>
    </button>
  );
}

export interface ShareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onShare: (e: React.MouseEvent) => void;
  size?: 'standard' | 'large';
}

export function ShareButton({
  onShare,
  size = 'standard',
  className = '',
  ...rest
}: ShareButtonProps) {
  // 48px square icon button with crystal glassmorphic styling
  return (
    <button
      type="button"
      onClick={onShare}
      className={`h-[48px] w-[48px] min-w-[48px] rounded-[16px] backdrop-blur-md bg-card/85 dark:bg-card/75 border border-border/80 dark:border-white/15 text-foreground flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.04)] hover:border-primary/40 hover:bg-muted/80 hover:shadow-md hover:shadow-primary/10 active:scale-[0.98] transition-all duration-150 touch-target shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      title="Share request"
      aria-label="Share request"
      {...rest}
    >
      <Share2 className="h-5 w-5 notranslate stroke-[2.2]" />
    </button>
  );
}

export interface ReportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onReport: (e: React.MouseEvent) => void;
}

export function ReportButton({
  onReport,
  className = '',
  ...rest
}: ReportButtonProps) {
  // 48px square icon button with crystal glassmorphic styling
  return (
    <button
      type="button"
      onClick={onReport}
      className={`h-[48px] w-[48px] min-w-[48px] rounded-[16px] backdrop-blur-md bg-card/85 dark:bg-card/75 border border-border/80 dark:border-white/15 text-muted-foreground hover:text-rose-500 hover:border-rose-500/40 hover:bg-rose-500/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:shadow-rose-500/10 active:scale-[0.98] transition-all duration-150 touch-target shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${className}`}
      title="Report request"
      aria-label="Report request"
      {...rest}
    >
      <Flag className="h-5 w-5 notranslate stroke-[2.2]" />
    </button>
  );
}
