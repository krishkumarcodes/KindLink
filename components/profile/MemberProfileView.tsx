'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  Star,
  Award,
  MapPin,
  GraduationCap,
  Languages,
  Phone,
  Mail,
  Lock,
  Flag,
  Ban,
  Share2,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  HeartHandshake,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Select } from '@/components/ui/Select';
import { OrganizationType } from '@/lib/data/types';
import { OrganizationBadge } from './OrganizationBadge';
import { BadgeMedalIcon } from './BadgeMedalIcon';

export interface PublicMemberProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  role: 'user' | 'admin';
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  bio?: string | null;
  college?: string | null;
  organisation?: string | null;
  homeNeighborhood?: string | null;
  area_name?: string | null;
  languages?: string[] | null;
  badges?: string[] | null;
  phone?: string | null;
  email?: string | null;
  phoneVisible: boolean;
  emailVisible: boolean;
  orgVisible?: boolean;
  areaVisible?: boolean;
  visibility_phone?: string;
  visibility_email?: string;
  visibility_organisation?: string;
  visibility_area?: string;
  isSelf: boolean;
  isOrganization?: boolean;
  organizationName?: string | null;
  organizationType?: OrganizationType | null;
  organizationVerified?: boolean;
  organizationRegistrationNumber?: string | null;
}

interface MemberProfileViewProps {
  member: PublicMemberProfile;
}

const BLOCKED_USERS_KEY = 'kindlink_blocked_users';

export function MemberProfileView({ member }: MemberProfileViewProps) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Suspicious or fake account');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Check blocked state on mount
  useEffect(() => {
    try {
      const blockedRaw = localStorage.getItem(BLOCKED_USERS_KEY);
      if (blockedRaw) {
        const blockedList: string[] = JSON.parse(blockedRaw);
        if (blockedList.includes(member.username.toLowerCase())) {
          setIsBlocked(true);
        }
      }
    } catch {}
  }, [member.username]);

  // Handle blocking/unblocking
  const handleToggleBlock = () => {
    try {
      const blockedRaw = localStorage.getItem(BLOCKED_USERS_KEY);
      let blockedList: string[] = blockedRaw ? JSON.parse(blockedRaw) : [];
      const cleanUser = member.username.toLowerCase();

      if (isBlocked) {
        blockedList = blockedList.filter((u) => u !== cleanUser);
        localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedList));
        setIsBlocked(false);
        toast.success(`Unblocked @${member.username}`);
      } else {
        if (!blockedList.includes(cleanUser)) {
          blockedList.push(cleanUser);
        }
        localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedList));
        setIsBlocked(true);
        toast.success(`Blocked @${member.username}. You will not see notifications or offers from this user.`);
      }
    } catch {
      toast.error('Failed to update blocked members.');
    }
  };

  // Handle report submission
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason) return;
    setIsSubmittingReport(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: member.id,
          reportedUsername: member.username,
          reason: reportReason,
          details: reportDetails,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit report.');
        setIsSubmittingReport(false);
        return;
      }

      toast.success('Report submitted. KindLink moderators will review this account within 24 hours.');
      setReportModalOpen(false);
      setReportDetails('');
      setIsSubmittingReport(false);
    } catch {
      toast.error('Connection error. Please try again.');
      setIsSubmittingReport(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${member.displayName} (@${member.username}) on KindLink`,
          text: `Check out ${member.displayName}'s verified volunteer profile on KindLink Asansol!`,
          url,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard!');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  // Format creation date
  const formattedMemberSince = () => {
    try {
      const d = new Date(member.createdAt);
      if (isNaN(d.getTime())) return 'Active Member';
      return `Member since ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } catch {
      return 'Active Member';
    }
  };

  // Trust score calculation
  const hasEnoughRatings = member.ratingCount >= 5;
  const trustScore = hasEnoughRatings ? member.ratingAverage.toFixed(1) : '—';

  // Badges
  const pinnedBadges = [
    {
      id: 'life_saver',
      title: 'Life Saver',
      desc: 'Critical emergency blood and hospital transport assistance',
      tier: 'gold' as const,
      unlocked: member.badges?.some((b) => /blood|saver/i.test(b)) ?? false,
    },
    {
      id: 'community_pillar',
      title: 'Community Pillar',
      desc: 'Completed multiple verified community help requests in neighborhood',
      tier: 'gold' as const,
      unlocked: member.badges?.some((b) => /pillar|first|neighbor/i.test(b)) ?? member.ratingCount > 0,
    },
    {
      id: 'study_mentor',
      title: 'Study & Mentor',
      desc: 'Assisting peers with study materials, notes, and guidance',
      tier: 'silver' as const,
      unlocked: Boolean(member.college),
    },
    {
      id: 'verified_member',
      title: 'Identity Verified',
      desc: 'Government or student ID audited and approved by moderators',
      tier: 'platinum' as const,
      unlocked: member.verificationStatus === 'verified',
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full pb-36 lg:pb-16 text-foreground">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition touch-target"
        >
          <ArrowLeft className="h-4 w-4 notranslate" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition touch-target"
            aria-label="Share profile"
            title="Share profile"
          >
            <Share2 className="h-4 w-4 notranslate" />
          </button>

          {!member.isSelf && (
            <>
              <button
                onClick={() => setReportModalOpen(true)}
                className="p-2 rounded-xl border border-border bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition touch-target"
                aria-label="Report member"
                title="Report member"
              >
                <Flag className="h-4 w-4 notranslate" />
              </button>

              <button
                onClick={handleToggleBlock}
                className={`p-2 rounded-xl border text-xs font-bold transition touch-target ${
                  isBlocked
                    ? 'border-rose-500 bg-rose-500 text-white'
                    : 'border-border bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600'
                }`}
                aria-label={isBlocked ? 'Unblock member' : 'Block member'}
                title={isBlocked ? 'Unblock member' : 'Block member'}
              >
                <Ban className="h-4 w-4 notranslate" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Blocked State Banner */}
      {isBlocked && (
        <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0">
              <Ban className="h-4 w-4 notranslate" />
            </div>
            <div>
              <strong className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 block">
                You have blocked @{member.username}
              </strong>
              <p className="text-[11px] text-muted-foreground">
                Their offers and requests are hidden from your feed.
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleBlock}
            className="px-3.5 py-1.5 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-foreground transition shrink-0"
          >
            Unblock
          </button>
        </div>
      )}

      {/* Profile Header Hero Card */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft relative overflow-hidden">
        {/* Subtle decorative gradient top banner */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-teal-500/15 via-teal-600/10 to-indigo-500/15" />

        <div className="relative pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative shrink-0">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-card shadow-soft"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-primary/10 border-4 border-card shadow-soft flex items-center justify-center text-primary text-3xl font-extrabold uppercase">
                {member.displayName.slice(0, 2) || member.username.slice(0, 2)}
              </div>
            )}
            {member.verificationStatus === 'verified' && (
              <div
                className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 text-white rounded-xl shadow-md border-2 border-card"
                title="Verified Volunteer"
              >
                <ShieldCheck className="h-4 w-4 notranslate" />
              </div>
            )}
          </div>

          {/* Identity & Badges */}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
                {member.displayName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-primary notranslate">
                @{member.username}
              </p>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
              {Boolean(member.isOrganization || member.organizationVerified) && (
                <OrganizationBadge
                  organizationName={member.organizationName || member.displayName}
                  organizationType={member.organizationType}
                  organizationVerified={member.organizationVerified}
                  organizationRegistrationNumber={member.organizationRegistrationNumber}
                />
              )}

              {member.role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <ShieldCheck className="h-3 w-3 notranslate" />
                  <span>KindLink Admin</span>
                </span>
              )}

              {member.verificationStatus === 'verified' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3 notranslate" />
                  <span>Verified Volunteer</span>
                </span>
              ) : member.verificationStatus === 'pending' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="h-3 w-3 notranslate" />
                  <span>ID Under Review</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                  <span>Community Volunteer</span>
                </span>
              )}

              {member.college && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  <GraduationCap className="h-3 w-3 notranslate" />
                  <span className="truncate max-w-[200px]">{member.college}</span>
                </span>
              )}
            </div>

            {/* Member Since */}
            <p className="text-[11px] text-muted-foreground flex items-center justify-center sm:justify-start gap-1 pt-1">
              <Calendar className="h-3 w-3 notranslate text-muted-foreground" />
              <span>{formattedMemberSince()}</span>
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-border">
          {/* Trust Score */}
          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Trust Score
            </span>
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400 notranslate shrink-0" />
              <strong className="text-base font-extrabold text-foreground">{trustScore}</strong>
            </div>
            <span className="text-[10px] text-muted-foreground block">
              {hasEnoughRatings ? `${member.ratingCount} reviews` : 'Score unlocked at 5 reviews'}
            </span>
          </div>

          {/* Ratings Count */}
          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Community Reviews
            </span>
            <strong className="text-base font-extrabold text-foreground block">
              {member.ratingCount}
            </strong>
            <span className="text-[10px] text-muted-foreground block">
              Verified Post-Task Ratings
            </span>
          </div>

          {/* Verification Level */}
          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Safety Verification
            </span>
            <strong className="text-sm font-bold text-foreground block capitalize">
              {member.verificationStatus === 'verified' ? 'Level 2 (ID Verified)' : 'Level 1 (Phone)'}
            </strong>
            <span className="text-[10px] text-muted-foreground block">
              {member.verificationStatus === 'verified' ? 'Identity Audited' : 'Standard Member'}
            </span>
          </div>
        </div>
      </div>

      {/* Bio & Details Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <span>About Member</span>
        </h2>

        {/* Bio */}
        <p className="text-xs sm:text-sm text-foreground leading-relaxed">
          {member.bio ? member.bio : (
            <span className="italic text-muted-foreground">
              This member has not written a personal bio yet.
            </span>
          )}
        </p>

        {/* Organization & Location details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {member.orgVisible === false ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border">
              <div className="p-2 rounded-xl bg-muted text-muted-foreground notranslate shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Organisation
                </span>
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Private
                </p>
              </div>
            </div>
          ) : (member.organisation || member.college) ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 notranslate shrink-0">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Organisation
                </span>
                <p className="text-xs font-bold text-foreground truncate">{member.organisation || member.college}</p>
              </div>
            </div>
          ) : null}

          {member.areaVisible === false ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border">
              <div className="p-2 rounded-xl bg-muted text-muted-foreground notranslate shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Community Area
                </span>
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Private
                </p>
              </div>
            </div>
          ) : (member.area_name || member.homeNeighborhood) ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border">
              <div className="p-2 rounded-xl bg-primary/10 text-primary notranslate shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Community Area
                </span>
                <p className="text-xs font-bold text-foreground truncate">{member.area_name || member.homeNeighborhood}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Languages Spoken */}
        {member.languages && member.languages.length > 0 && (
          <div className="pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Languages
            </span>
            <div className="flex flex-wrap gap-1.5">
              {member.languages.map((lang) => (
                <span
                  key={lang}
                  className="px-2.5 py-1 rounded-xl bg-background border border-border text-xs font-medium text-foreground"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pinned & Community Badges */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 notranslate">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Community Badges</h2>
              <p className="text-xs text-muted-foreground">Recognitions earned through verified acts of community help</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {pinnedBadges.map((b) => (
            <div
              key={b.id}
              className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                b.unlocked
                  ? 'bg-background border-border shadow-xs'
                  : 'bg-muted/30 border-border/60 opacity-60'
              }`}
            >
              <div className="shrink-0">
                <BadgeMedalIcon
                  badgeId={b.id}
                  title={b.title}
                  tier={b.unlocked ? b.tier : 'locked'}
                  size="sm"
                  isEarned={b.unlocked}
                />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-bold text-foreground block truncate">
                    {b.title}
                  </strong>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.unlocked
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {b.unlocked ? 'Earned' : 'Locked'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact & Database Privacy Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary notranslate">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">Contact &amp; Privacy</h2>
            <p className="text-xs text-muted-foreground">
              Strict database privacy rules safeguard personal member channels
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Phone row */}
          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3 notranslate" />
              Phone Number
            </span>
            {member.phoneVisible && member.phone ? (
              <a
                href={`tel:${member.phone}`}
                className="text-xs font-bold text-primary hover:underline block truncate"
              >
                {member.phone}
              </a>
            ) : (
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3 text-muted-foreground notranslate" />
                  •••••• ••••
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Protected for privacy. Visible to helpers once an emergency task is matched.
                </p>
              </div>
            )}
          </div>

          {/* Email row */}
          <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3 notranslate" />
              Email Address
            </span>
            {member.emailVisible && member.email ? (
              <a
                href={`mailto:${member.email}`}
                className="text-xs font-bold text-primary hover:underline block truncate"
              >
                {member.email}
              </a>
            ) : (
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3 text-muted-foreground notranslate" />
                  ••••••@••••••
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Private to prevent spam. Official updates sent via KindLink in-app notifications.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REPORT MEMBER MODAL */}
      {reportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                  <Flag className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Report @{member.username}</h3>
                  <p className="text-xs text-muted-foreground">Confidential moderation report</p>
                </div>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Reason for reporting:
                </label>
                <Select
                  value={reportReason}
                  onChange={(val) => setReportReason(val)}
                  options={[
                    { value: 'Suspicious or fake account', label: 'Suspicious or fake account' },
                    { value: 'Harassment or inappropriate message', label: 'Harassment or inappropriate message' },
                    { value: 'No-show on accepted emergency task', label: 'No-show on accepted emergency task' },
                    { value: 'Demanding payment or commercial solicitation', label: 'Demanding payment / Commercial solicitation' },
                    { value: 'Inaccurate identity documents', label: 'Inaccurate identity details' },
                    { value: 'Other safety concern', label: 'Other safety concern' },
                  ]}
                  variant="form"
                  aria-label="Reason for reporting"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Additional Details (Optional):
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context or description to assist moderator review..."
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  disabled={isSubmittingReport}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition touch-target"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50 touch-target flex items-center justify-center gap-2"
                >
                  {isSubmittingReport && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
                  <span>{isSubmittingReport ? 'Submitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
