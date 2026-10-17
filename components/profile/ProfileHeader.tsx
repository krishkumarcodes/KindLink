'use client';

import React from 'react';
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
  Building2,
  Stethoscope,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';

export type ProfileTab = 'overview' | 'activity' | 'badges' | 'impact' | 'verification' | 'settings';

interface ProfileHeaderProps {
  onEditProfile: () => void;
  onSelectTab: (tab: ProfileTab) => void;
}

export function ProfileHeader({ onEditProfile, onSelectTab }: ProfileHeaderProps) {
  const { userProfile, requests, userCoords, userAreaName } = useKindLinkStore();

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
          text: `Check out ${displayName}'s profile and mutual aid record on KindLink`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share aborted; proceed with clipboard fallback if needed
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Profile link copied!', {
        description: shareUrl,
      });
    }
  };

  // Top role badge
  const getTopRoleBadge = () => {
    if (userProfile.badges?.some((b) => /doctor|physician|medical/i.test(b))) {
      return { label: 'Verified Doctor', icon: Stethoscope, color: 'emerald' };
    }
    if (userProfile.badges?.some((b) => /responder|first aid/i.test(b))) {
      return { label: 'First Responder', icon: ShieldCheck, color: 'indigo' };
    }
    if (userProfile.badges?.some((b) => /blood|life saver/i.test(b))) {
      return { label: 'Blood Hero', icon: Award, color: 'rose' };
    }
    if (userProfile.verificationState === 'verified') {
      return { label: 'Verified Volunteer', icon: ShieldCheck, color: 'teal' };
    }
    return null;
  };

  const topRole = getTopRoleBadge();

  // Pinned badges: up to 3 medal badges with level indicator
  const pinnedBadges = [
    {
      id: 'community-pillar',
      title: 'Community Pillar',
      icon: '/illustrations/badge-community-pillar.svg',
      level:
        (userProfile.helpsCount || 0) >= 20
          ? 'Level 3 Gold'
          : (userProfile.helpsCount || 0) >= 10
          ? 'Level 2 Silver'
          : 'Level 1 Bronze',
      levelVariant:
        (userProfile.helpsCount || 0) >= 20
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : (userProfile.helpsCount || 0) >= 10
          ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30'
          : 'bg-amber-700/10 text-amber-800 dark:text-amber-300 border-amber-700/30',
    },
    {
      id: 'trusted-neighbor',
      title: 'Trusted Neighbor',
      icon: '/illustrations/badge-trusted-neighbor.svg',
      level:
        hasEnoughRatings && (userProfile.rating ?? 0) >= 4.9
          ? 'Level 3 Gold'
          : hasEnoughRatings
          ? 'Level 2 Silver'
          : 'Level 1 Bronze',
      levelVariant:
        hasEnoughRatings && (userProfile.rating ?? 0) >= 4.9
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : hasEnoughRatings
          ? 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30'
          : 'bg-amber-700/10 text-amber-800 dark:text-amber-300 border-amber-700/30',
    },
    {
      id: 'urgent-hero',
      title: userProfile.badges?.some((b) => /blood|life saver/i.test(b))
        ? 'Life Saver'
        : userProfile.badges?.some((b) => /responder|first aid/i.test(b))
        ? 'First Responder'
        : userProfile.college
        ? 'Verified Student'
        : 'Study Mentor',
      icon: userProfile.badges?.some((b) => /blood|life saver/i.test(b))
        ? '/illustrations/badge-blood-hero.svg'
        : userProfile.badges?.some((b) => /responder|first aid/i.test(b))
        ? '/illustrations/badge-first-aid.svg'
        : userProfile.college
        ? '/illustrations/badge-student-verified.svg'
        : '/illustrations/badge-study-mentor.svg',
      level: 'Level 2 Silver',
      levelVariant: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30',
    },
  ].slice(0, 3);

  // Location logic
  const isLiveLocation = Boolean(userCoords?.isLive);
  const savedArea = userProfile.homeNeighborhood?.trim();
  const liveArea = userAreaName?.trim();
  const hasArea = Boolean(liveArea || savedArea);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-5 sm:p-8 shadow-soft">
      {/* Subtle decorative gradient accents (teal to indigo to emerald, light and dark responsive) */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-teal-500/15 via-indigo-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl" />

      <div className="relative flex flex-col items-center text-center space-y-4">
        {/* Centred avatar with verified shield badge neatly overlapping corner */}
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
        <div className="space-y-1 w-full max-w-xl">
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

        {/* Status chips: Verification status, top role badge, organisation chip */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Verification status chip */}
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
              userProfile.verificationState === 'verified'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : userProfile.verificationState === 'pending'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {userProfile.verificationState === 'verified' ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
                <span>Verified</span>
              </>
            ) : userProfile.verificationState === 'pending' ? (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-500 notranslate shrink-0" />
                <span>Pending review</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground notranslate shrink-0" />
                <span>Not verified</span>
              </>
            )}
          </span>

          {/* Top role badge (e.g. Verified Doctor, First Responder, Blood Hero, Verified Volunteer) */}
          {topRole && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-primary/10 text-primary border border-primary/20">
              <topRole.icon className="h-3.5 w-3.5 notranslate shrink-0" />
              <span>{topRole.label}</span>
            </span>
          )}

          {/* Organisation chip */}
          {userProfile.college && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
              <Building2 className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
              <span className="truncate max-w-[200px]">{userProfile.college}</span>
            </span>
          )}
        </div>

        {/* Pinned badges: up to 3 pinned medal badges shown under chips with level indicator */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
          {pinnedBadges.map((badge) => (
            <button
              key={badge.id}
              type="button"
              onClick={() => onSelectTab('badges')}
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-background/80 hover:bg-muted border border-border/80 shadow-xs transition-all touch-target text-left"
              title={`${badge.title} (${badge.level}) - View badges`}
            >
              <img
                src={badge.icon}
                alt={badge.title}
                className="w-5 h-5 object-contain shrink-0"
              />
              <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                {badge.title}
              </span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${badge.levelVariant}`}
              >
                {badge.level}
              </span>
            </button>
          ))}
        </div>

        {/* Location line & Member since */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
          {/* Location line */}
          {isLiveLocation ? (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="truncate max-w-[200px] sm:max-w-none text-foreground font-semibold">
                {liveArea || savedArea || 'Live Area'}
              </span>
            </span>
          ) : hasArea ? (
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5 text-rose-500 notranslate shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">
                {savedArea || liveArea}
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

        {/* Action row: Edit Profile button (h-10) & Share button (exact h-10 w-10 square, 0px offset error) */}
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

        {/* 4 Stat tiles in an even 2x2 grid (4 across on desktop). Tapping a tile switches to matching tab! */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full pt-4 border-t border-border/70">
          {/* Tile 1: Helps Given -> switches to Activity tab */}
          <button
            type="button"
            onClick={() => onSelectTab('activity')}
            className="p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
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
            className="p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
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
            className="p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
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
            className="p-3.5 rounded-2xl bg-background/80 hover:bg-muted/50 border border-border/80 flex flex-col items-center sm:items-start text-center sm:text-left transition-all group focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
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
    </div>
  );
}
