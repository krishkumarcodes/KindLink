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
        ...style,
      }}
      className={`relative inline-flex items-center justify-center gap-2 px-5 ${heightClass} rounded-[16px] font-bold text-white text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0 notranslate" />
      ) : (
        <IconComponent className="h-4 w-4 shrink-0 notranslate" />
      )}
      <span className="whitespace-nowrap truncate font-bold text-center leading-none">
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
      ? 'border border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/15'
      : variant === 'subtle'
      ? 'border border-border/60 bg-muted/50 hover:bg-muted text-foreground'
      : 'border border-border/80 dark:border-white/15 bg-background/80 hover:bg-muted text-foreground';

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 ${heightClass} rounded-[16px] font-semibold text-sm shadow-xs hover:shadow-sm active:scale-[0.98] transition-all duration-150 touch-target disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClass} ${className}`}
      {...rest}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0 notranslate" />}
      {!isLoading && IconComponent && <IconComponent className="h-4 w-4 shrink-0 notranslate" />}
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
  // 48px square icon button
  return (
    <button
      type="button"
      onClick={onShare}
      className={`h-[48px] w-[48px] min-w-[48px] rounded-[16px] border border-border/80 dark:border-white/15 bg-background/80 hover:bg-muted text-foreground flex items-center justify-center shadow-xs hover:shadow-sm active:scale-[0.98] transition-all duration-150 touch-target shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      title="Share request"
      aria-label="Share request"
      {...rest}
    >
      <Share2 className="h-5 w-5 notranslate" />
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
  // 48px square icon button
  return (
    <button
      type="button"
      onClick={onReport}
      className={`h-[48px] w-[48px] min-w-[48px] rounded-[16px] border border-border/80 dark:border-white/15 bg-background/80 hover:bg-muted text-muted-foreground hover:text-rose-500 flex items-center justify-center shadow-xs hover:shadow-sm active:scale-[0.98] transition-all duration-150 touch-target shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${className}`}
      title="Report request"
      aria-label="Report request"
      {...rest}
    >
      <Flag className="h-5 w-5 notranslate" />
    </button>
  );
}
