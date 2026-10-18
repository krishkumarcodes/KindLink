'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Edit3,
  Share2,
  MapPin,
  HeartHandshake,
  FileCheck,
  Star,
  Copy,
  Award,
  Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { calculateBadgesForUser, UserBadgeProgress } from '@/lib/data/badges';
import { BadgeMedalIcon } from './BadgeMedalIcon';
import { BadgeDetailSheet } from './BadgeDetailSheet';
import { BadgePinningModal } from './BadgePinningModal';

export type ProfileTab = 'overview' | 'activity' | 'badges' | 'impact' | 'verification' | 'settings';

interface ProfileHeaderProps {
  onEditProfile: () => void;
  onSelectTab: (tab: ProfileTab) => void;
}

export function ProfileHeader({ onEditProfile, onSelectTab }: ProfileHeaderProps) {
  const { userProfile, updateUserProfile, requests, userCoords, userAreaName } = useKindLinkStore();

  // State for Badge Detail Sheet and Pinning Modal
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeProgress | null>(null);
  const [isPinningOpen, setIsPinningOpen] = useState(false);

  // Display Name & Username
  const displayName =
    userProfile.displayName ||
    userProfile.name ||
    (userProfile.username ? `@${userProfile.username}` : 'KindLink Member');
  const displayUsername = userProfile.username || 'user';
  const initial = (displayName.charAt(0) || 'K').toUpperCase();

  // Requests calculation
  const myRequests = (requests || []).filter(
    (r) =>
      (userProfile.id && r.id && (r as any).requesterId === userProfile.id) ||
      (userProfile.name && r.contactName && r.contactName.toLowerCase() === userProfile.name.toLowerCase()) ||
      (userProfile.phone && r.phone && r.phone === userProfile.phone)
  );
  const requestsPostedCount = myRequests.length || userProfile.requestsCount || 0;
  const openRequestsCount = myRequests.filter(
    (r) => r.status === 'open' || r.status === 'offered'
  ).length;

  // Account creation date formatting
  const formatMemberSince = () => {
    const rawDate = userProfile.createdAt || userProfile.created_at;
    if (!rawDate) return 'Member since October 2026';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return 'Active Member';
      return `Member since ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } catch {
      return 'Active Member';
    }
  };

  // Hours active formatting (e.g. "1h 25m" or "0h")
  const formatHoursActive = (val?: number) => {
    if (!val || val <= 0) return '0h';
    const totalMinutes = Math.round(val * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Trust score calculations
  const ratingCount = userProfile.ratingCount || 0;
  const hasEnoughRatings = ratingCount >= 5;
  const ratingValue = (userProfile.rating ?? 5.0).toFixed(1);

  // 1-Tap Copy Username
  const handleCopyUsername = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`@${displayUsername}`);
      toast.success(`Copied @${displayUsername}`);
    }
  };

  // Share profile
  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/u/${displayUsername}`
        : `/u/${displayUsername}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} on KindLink`,
          text: `Check out ${displayName}'s profile and community impact on KindLink`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Profile link copied!', {
        description: shareUrl,
      });
    }
  };

  // Badges calculation and pinned list
  const allBadges = useMemo(() => calculateBadgesForUser(userProfile), [userProfile]);
  const pinnedBadges = useMemo(() => {
    return allBadges.filter((b) => b.isPinned).slice(0, 3);
  }, [allBadges]);

  // Handle pin toggle (Max 3 badges)
  const handleTogglePin = async (badgeId: string, willPin: boolean) => {
    const currentPinned = userProfile.pinnedBadges || [];

    if (willPin) {
      if (currentPinned.length >= 3) {
        toast.error('Maximum 3 badges can be pinned to your profile header card.');
        return;
      }
      const nextPinned = [...currentPinned, badgeId];
      updateUserProfile({ pinnedBadges: nextPinned });

      try {
        const res = await fetch('/api/badges/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badgeId, pinned: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error) toast.error(data.error);
        } else {
          toast.success('Badge pinned to profile header!');
        }
      } catch {
        // Optimistic store already updated
      }
    } else {
      const nextPinned = currentPinned.filter((id) => id !== badgeId);
      updateUserProfile({ pinnedBadges: nextPinned });

      try {
        await fetch('/api/badges/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badgeId, pinned: false }),
        });
        toast.success('Badge unpinned from profile header');
      } catch {
        // Handled
      }
    }
  };

  // Location logic strictly adhering to specification:
  // 1. If live GPS is on: show live area name (e.g. "Kalyanpur, Asansol")
  // 2. Else if user profile has saved home_neighborhood: show saved home area
  // 3. Else: show friendly prompt "Add your area" with link opening Edit Profile
  // Never show college name or hard-coded fallback!
  const isLiveGpsOn = Boolean(userCoords?.isLive && userAreaName?.trim());
  const savedHomeArea = (userProfile.homeNeighborhood || (userProfile as any).home_neighborhood)?.trim();
  const liveAreaName = userAreaName?.trim();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-4 sm:p-8 shadow-soft">
      {/* Subtle decorative gradient accents */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-teal-500/15 via-indigo-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl" />

      <div className="relative flex flex-col items-center text-center space-y-3.5">
        {/* =========================================================================
            1. CLEAN IDENTITY BLOCK: Avatar, Display Name, @username, Verification Chip
           ========================================================================= */}

        {/* Centered Avatar with Corner Verification Shield */}
        <div className="relative inline-flex items-center justify-center shrink-0">
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt={displayName}
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover border-2 border-primary/30 shadow-soft ring-4 ring-background"
            />
          ) : (
            <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white text-3xl sm:text-4xl font-black shadow-soft ring-4 ring-background">
              {initial}
            </div>
          )}

          {/* Overlapping corner verification shield badge */}
          <div
            className={`absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-2xl shadow-xs text-white ring-2 ring-background ${
              userProfile.verificationState === 'verified'
                ? 'bg-emerald-500'
                : userProfile.verificationState === 'pending'
                ? 'bg-amber-500'
                : 'bg-muted-foreground/80'
            }`}
            title={`Verification: ${userProfile.verificationState}`}
          >
            {userProfile.verificationState === 'verified' ? (
              <ShieldCheck className="h-4 w-4 stroke-[2.2] notranslate" />
            ) : userProfile.verificationState === 'pending' ? (
              <Clock className="h-4 w-4 stroke-[2.2] notranslate" />
            ) : (
              <ShieldAlert className="h-4 w-4 stroke-[2.2] notranslate" />
            )}
          </div>
        </div>

        {/* Display name: large text, wraps up to 2 lines, centered, never cut off */}
        <div className="space-y-1 w-full max-w-xl px-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight break-words line-clamp-2 leading-tight">
            {displayName}
          </h1>

          {/* @username with 1-tap copy action */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleCopyUsername}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all touch-target"
              title="Click to copy @username"
              aria-label={`Copy @${displayUsername}`}
            >
              <span className="font-mono">@{displayUsername}</span>
              <Copy className="h-3 w-3 opacity-60 shrink-0 notranslate" />
            </button>
          </div>
        </div>

        {/* ONE Small Verification Chip Only (Verified / Pending / Not verified) */}
        <div className="flex items-center justify-center pt-0.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide border shadow-2xs ${
              userProfile.verificationState === 'verified'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : userProfile.verificationState === 'pending'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {userProfile.verificationState === 'verified' ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0 stroke-[2.2]" />
                <span>Verified</span>
              </>
            ) : userProfile.verificationState === 'pending' ? (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-500 notranslate shrink-0 stroke-[2.2]" />
                <span>Pending review</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground notranslate shrink-0 stroke-[2.2]" />
                <span>Not verified</span>
              </>
            )}
          </span>
        </div>

        {/* Location line & Member since */}
        <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground pt-0.5">
          {/* Location line: Live GPS -> Saved home_neighborhood -> Friendly prompt "Add your area" */}
          {isLiveGpsOn ? (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="truncate max-w-[180px] sm:max-w-none text-foreground font-semibold">
                {liveAreaName}
              </span>
            </span>
          ) : savedHomeArea ? (
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5 text-rose-500 notranslate shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-none text-foreground">
                {savedHomeArea}
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline touch-target"
            >
              <MapPin className="h-3.5 w-3.5 notranslate text-primary shrink-0" />
              <span>Add your area</span>
            </button>
          )}

          {/* Member since */}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
            <Clock className="h-3 w-3 notranslate shrink-0" />
            <span>{formatMemberSince()}</span>
          </span>
        </div>

        {/* =========================================================================
            2. ACTION BUTTONS: Edit Profile & Share
           ========================================================================= */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onEditProfile}
            className="h-10 inline-flex items-center justify-center gap-2 px-5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs sm:text-sm font-bold transition shadow-xs touch-target"
          >
            <Edit3 className="h-4 w-4 text-muted-foreground notranslate shrink-0" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-10 w-10 shrink-0 inline-flex items-center justify-center p-0 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition shadow-xs touch-target"
            title="Share Profile"
            aria-label="Share Profile"
          >
            <Share2 className="h-4 w-4 block notranslate" />
          </button>
        </div>

        {/* =========================================================================
            3. DEDICATED PINNED BADGES SHELF
            Placed between the action buttons and the four stat tiles
           ========================================================================= */}
        <div className="w-full max-w-md mx-auto pt-3 pb-1">
          {/* Shelf Header */}
          <div className="flex items-center justify-between px-1.5 mb-2.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
              <span>Pinned Badges</span>
              {pinnedBadges.length > 0 && (
                <span className="text-[10px] font-semibold text-muted-foreground/80 normal-case">
                  ({pinnedBadges.length}/3)
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setIsPinningOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline touch-target"
              title="Customize pinned badges"
            >
              <Pin className="h-3 w-3 notranslate shrink-0" />
              <span>{pinnedBadges.length > 0 ? 'Edit' : 'Pin'}</span>
            </button>
          </div>

          {pinnedBadges.length > 0 ? (
            /* Displays up to 3 round medals (48px diameter with metallic level ring) */
            <div className="flex items-start justify-center gap-3 sm:gap-6 w-full mx-auto">
              {pinnedBadges.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => setSelectedBadge(badge)}
                  className="flex flex-col items-center text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl p-1.5 transition flex-1 max-w-[104px] hover:bg-muted/40 touch-target"
                  title={`${badge.title} (${badge.currentTierName} Level ${badge.currentLevel}) - View details`}
                >
                  <div className="relative transform transition group-hover:scale-110">
                    <BadgeMedalIcon
                      size="shelf"
                      badgeId={badge.id}
                      title={badge.title}
                      iconName={badge.icon}
                      tier={badge.currentTier}
                      isEarned={badge.earned}
                    />
                  </div>
                  {/* Each medal has its short title under it (centered, 1-2 lines, text-xs font-medium, never cut off with ellipsis) */}
                  <span className="mt-2 text-xs font-medium text-foreground leading-snug text-center break-words w-full">
                    {badge.title}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* If no badges are pinned: show 3 soft dashed/tinted circular empty medal slots (48px) with friendly prompt */
            <div
              onClick={() => setIsPinningOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsPinningOpen(true);
                }
              }}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-muted/20 border border-dashed border-border hover:border-primary/40 hover:bg-muted/40 transition cursor-pointer group"
              title="Click to pin badges"
            >
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                {[0, 1, 2].map((slot) => (
                  <div
                    key={`empty-slot-${slot}`}
                    className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 bg-background/60 flex items-center justify-center text-muted-foreground/40 group-hover:border-primary/50 group-hover:text-primary/70 transition"
                  >
                    <Award className="h-5 w-5 notranslate opacity-60" />
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition text-center">
                Pin your favourite badges
              </p>
            </div>
          )}
        </div>

        {/* =========================================================================
            4. FOUR STAT TILES: Helps Given, Requests, Hours Active, Trust Score
           ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full pt-4 border-t border-border/70">
          {/* Tile 1: Helps Given -> switches to Activity tab */}
          <button
            type="button"
            onClick={() => onSelectTab('activity')}
            className="p-3 sm:p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors font-semibold">
              <HeartHandshake className="h-4 w-4 text-primary notranslate shrink-0" />
              <span>Helps Given</span>
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
              {userProfile.helpsCount || 0}
            </span>
          </button>

          {/* Tile 2: Requests Posted -> switches to Activity tab */}
          <button
            type="button"
            onClick={() => onSelectTab('activity')}
            className="p-3 sm:p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-teal-600 transition-colors font-semibold">
              <FileCheck className="h-4 w-4 text-teal-500 notranslate shrink-0" />
              <span>Requests</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl sm:text-2xl font-extrabold text-foreground">
                {requestsPostedCount}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {openRequestsCount} open
              </span>
            </div>
          </button>

          {/* Tile 3: Hours Active -> switches to Impact tab */}
          <button
            type="button"
            onClick={() => onSelectTab('impact')}
            className="p-3 sm:p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-indigo-600 transition-colors font-semibold">
              <Clock className="h-4 w-4 text-indigo-500 notranslate shrink-0" />
              <span>Hours Active</span>
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
              {formatHoursActive(userProfile.hoursVolunteered)}
            </span>
          </button>

          {/* Tile 4: Trust Score -> switches to Badges tab */}
          <button
            type="button"
            onClick={() => onSelectTab('badges')}
            className="p-3 sm:p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-amber-500 transition-colors font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500 notranslate shrink-0" />
              <span>Trust Score</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              {hasEnoughRatings ? (
                <>
                  <span className="text-xl sm:text-2xl font-extrabold text-foreground">
                    {ratingValue}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    from {ratingCount} ratings
                  </span>
                </>
              ) : (
                <span className="text-sm sm:text-base font-bold text-muted-foreground">
                  — No ratings yet
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* =========================================================================
          5. BADGE DETAIL SHEET (When a pinned medal is tapped)
         ========================================================================= */}
      <BadgeDetailSheet
        badge={selectedBadge}
        open={Boolean(selectedBadge)}
        onClose={() => setSelectedBadge(null)}
        onTogglePin={handleTogglePin}
        isPinned={
          selectedBadge
            ? (userProfile.pinnedBadges || []).includes(selectedBadge.id) ||
              (userProfile.pinnedBadges || []).includes(selectedBadge.key)
            : false
        }
        pinnedCount={(userProfile.pinnedBadges || []).length}
      />

      {/* =========================================================================
          6. BADGE PINNING SELECTOR MODAL
         ========================================================================= */}
      <BadgePinningModal
        open={isPinningOpen}
        onClose={() => setIsPinningOpen(false)}
        badges={allBadges}
        pinnedIds={userProfile.pinnedBadges || []}
        onTogglePin={handleTogglePin}
        onViewAllBadges={() => onSelectTab('badges')}
      />
    </div>
  );
}

export default ProfileHeader;
