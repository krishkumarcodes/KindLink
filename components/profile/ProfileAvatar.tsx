'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, Check } from 'lucide-react';

export type ProfileAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ProfileAvatarProps {
  /** Avatar photo image URL */
  avatarUrl?: string | null;
  /** User display name or full name for initials */
  name?: string | null;
  /** Verification state */
  verificationState?: 'verified' | 'pending' | 'unverified' | null;
  /** Size preset */
  size?: ProfileAvatarSize;
  /** Whether to show the corner verification badge */
  showVerificationBadge?: boolean;
  /** Custom outer container classes */
  className?: string;
  /** Custom image/initials classes */
  avatarClassName?: string;
}

const AVATAR_SIZES: Record<
  ProfileAvatarSize,
  {
    container: string;
    text: string;
    radius: string;
    badge: string;
    badgeIcon: string;
  }
> = {
  xs: {
    container: 'h-6 w-6 min-w-[24px]',
    text: 'text-[10px]',
    radius: 'rounded-lg',
    badge: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
    badgeIcon: 'h-2 w-2',
  },
  sm: {
    container: 'h-9 w-9 min-w-[36px]',
    text: 'text-xs',
    radius: 'rounded-xl',
    badge: 'h-3.5 w-3.5 -bottom-0.5 -right-0.5',
    badgeIcon: 'h-2.5 w-2.5',
  },
  md: {
    container: 'h-10 w-10 min-w-[40px]',
    text: 'text-sm',
    radius: 'rounded-2xl',
    badge: 'h-4 w-4 -bottom-0.5 -right-0.5',
    badgeIcon: 'h-3 w-3',
  },
  lg: {
    container: 'h-12 w-12 min-w-[48px]',
    text: 'text-base',
    radius: 'rounded-2xl',
    badge: 'h-5 w-5 -bottom-1 -right-1',
    badgeIcon: 'h-3.5 w-3.5',
  },
  xl: {
    container: 'h-20 w-20 sm:h-24 sm:w-24 min-w-[80px]',
    text: 'text-2xl sm:text-3xl',
    radius: 'rounded-3xl',
    badge: 'h-7 w-7 sm:h-8 sm:w-8 -bottom-1 -right-1',
    badgeIcon: 'h-4 w-4',
  },
  '2xl': {
    container: 'h-24 w-24 sm:h-28 sm:w-28 min-w-[96px]',
    text: 'text-3xl sm:text-4xl',
    radius: 'rounded-3xl',
    badge: 'h-8 w-8 -bottom-1 -right-1',
    badgeIcon: 'h-4 w-4',
  },
};

export function ProfileAvatar({
  avatarUrl,
  name,
  verificationState,
  size = 'md',
  showVerificationBadge = false,
  className = '',
  avatarClassName = '',
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const cfg = AVATAR_SIZES[size];

  // Derive 1-2 letter initial
  const cleanName = (name || 'KindLink').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase()
      : cleanName.charAt(0).toUpperCase() || 'K';

  const hasValidImage = Boolean(avatarUrl && !imageError);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {hasValidImage ? (
        <img
          src={avatarUrl!}
          alt={cleanName}
          onError={() => setImageError(true)}
          className={`object-cover border-2 border-primary/25 shadow-md ring-2 sm:ring-4 ring-background ${cfg.container} ${cfg.radius} ${avatarClassName}`}
        />
      ) : (
        <div
          className={`flex items-center justify-center font-black text-white bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 shadow-md ring-2 sm:ring-4 ring-background select-none relative overflow-hidden ${cfg.container} ${cfg.radius} ${cfg.text} ${avatarClassName}`}
        >
          {/* Micro-specular top highlight sheen */}
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]"
            aria-hidden="true"
          />
          {/* Bottom subtle ambient shade */}
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent rounded-b-[inherit]"
            aria-hidden="true"
          />
          <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            {initials}
          </span>
        </div>
      )}

      {/* Verification status corner badge */}
      {showVerificationBadge && verificationState && (
        <div
          className={`absolute flex items-center justify-center rounded-2xl shadow-xs text-white ring-2 ring-background ${cfg.badge} ${
            verificationState === 'verified'
              ? 'bg-emerald-500'
              : verificationState === 'pending'
              ? 'bg-amber-500'
              : 'bg-muted-foreground/80'
          }`}
          title={`Verification: ${verificationState}`}
        >
          {verificationState === 'verified' ? (
            <ShieldCheck className={`${cfg.badgeIcon} stroke-[2.2] notranslate`} />
          ) : verificationState === 'pending' ? (
            <Clock className={`${cfg.badgeIcon} stroke-[2.2] notranslate`} />
          ) : (
            <ShieldAlert className={`${cfg.badgeIcon} stroke-[2.2] notranslate`} />
          )}
        </div>
      )}
    </div>
  );
}
