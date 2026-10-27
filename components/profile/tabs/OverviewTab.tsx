'use client';

import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Locate,
  Info,
  X,
  Loader2,
  Star,
  HeartHandshake,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { EmergencyContact } from '@/lib/data/types';
import { ProfileTab } from '../ProfileHeader';
import { EmergencyContactModal } from '../EmergencyContactModal';

interface OverviewTabProps {
  onEditProfile: () => void;
  onSelectTab: (tab: ProfileTab) => void;
}

type VisibilitySetting = 'all' | 'matched' | 'private';

export function OverviewTab({ onEditProfile, onSelectTab }: OverviewTabProps) {
  const {
    userProfile,
    userCoords,
    userAreaName,
    setUserCoords,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
  } = useKindLinkStore();

  // Bio card read more toggle
  const [bioExpanded, setBioExpanded] = useState(false);

  // Live location fetching state
  const [isLocating, setIsLocating] = useState(false);

  // Emergency contact modal state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  // Field privacy visibility settings (Defaults: phone & email to 'all' with honest notice)
  const [phoneVisibility, setPhoneVisibility] = useState<VisibilitySetting>('all');
  const [emailVisibility, setEmailVisibility] = useState<VisibilitySetting>('all');
  const [orgVisibility, setOrgVisibility] = useState<VisibilitySetting>('all');
  const [areaVisibility, setAreaVisibility] = useState<VisibilitySetting>('all');

  const emergencyContacts = userProfile.emergencyContacts || [];
  const bio = userProfile.bio?.trim() || '';
  const isLongBio = bio.length > 220 || bio.split('\n').length > 4;

  // Use Live Location button handler
  const handleUseLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your device browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let detectedArea = 'Live GPS Area';

        try {
          const res = await fetch(
            `/api/maps/reverse?lat=${latitude}&lng=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            detectedArea =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.city ||
              data.address?.town ||
              data.displayName?.split(',')[0] ||
              'Live GPS Area';
          }
        } catch {
          // Fallback to coordinates
        }

        setUserCoords({ lat: latitude, lng: longitude, isLive: true }, detectedArea);
        setIsLocating(false);
        toast.success('Live location activated', {
          description: detectedArea,
        });
      },
      (err) => {
        setIsLocating(false);
        toast.error(err.message || 'Unable to retrieve your current location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          0. OVERVIEW USER IDENTITY CARD
             - Luminous multi-stop border gradient avatar with status pulse pip
             - Verified volunteer or organization metallic badge
             - Quick community stats & handle
             - Clean layout with zero overlap or clipping
          ========================================================================= */}
      {(() => {
        const isOrg = Boolean(userProfile.isOrganization || userProfile.organizationVerified);
        const isVerified = userProfile.verificationState === 'verified';
        const displayName =
          userProfile.displayName ||
          userProfile.name ||
          (userProfile.username ? `@${userProfile.username}` : 'KindLink Member');
        const displayUsername = userProfile.username || 'volunteer';
        const initial = (displayName.charAt(0) || 'K').toUpperCase();

        return (
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft">
            {/* Subtle luminous accent glow */}
            <div
              className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl opacity-40 ${
                isOrg
                  ? 'bg-gradient-to-br from-violet-600 via-indigo-500 to-transparent'
                  : isVerified
                  ? 'bg-gradient-to-br from-emerald-500 via-teal-400 to-transparent'
                  : 'bg-gradient-to-br from-primary/30 via-teal-500/20 to-transparent'
              }`}
            />

            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
              {/* Avatar with luminous multi-stop border gradient and corner status pip */}
              <div className="relative shrink-0">
                <div
                  className={`p-[2.5px] rounded-2xl transition-all ${
                    isOrg
                      ? 'bg-gradient-to-tr from-violet-600 via-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/10'
                      : isVerified
                      ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 shadow-md shadow-teal-500/20 ring-2 ring-teal-500/10'
                      : 'bg-gradient-to-tr from-border via-primary/30 to-border ring-2 ring-primary/5'
                  }`}
                >
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-[13px] sm:rounded-[14px] bg-card overflow-hidden">
                    {userProfile.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white font-black text-2xl sm:text-3xl shadow-inner">
                        {initial}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status pulse pip: live online / community responder */}
                <span
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center"
                  title="Live Community Responder"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-card" />
                </span>
              </div>

              {/* Identity & Verification Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight break-words">
                        {displayName}
                      </h2>
                      {/* Refined metallic verification chip */}
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-2xs">
                          <span className="relative flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-tr from-amber-200 via-emerald-200 to-teal-400 p-[1px] shadow-2xs">
                            <span className="flex h-full w-full items-center justify-center rounded-full bg-emerald-600 text-white">
                              <ShieldCheck className="h-2 w-2 stroke-[2.8] notranslate" />
                            </span>
                          </span>
                          <span>{isOrg ? 'Verified Org' : 'Verified Volunteer'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                          <ShieldAlert className="h-3 w-3 notranslate shrink-0" />
                          <span>Standard Member</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-mono font-semibold text-muted-foreground mt-0.5">
                      @{displayUsername}
                    </p>
                  </div>

                  {/* Edit profile action */}
                  <button
                    type="button"
                    onClick={onEditProfile}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold transition shadow-xs touch-target self-center sm:self-start shrink-0"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground notranslate shrink-0" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                {/* Quick stats mini-row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/40 border border-border/60">
                    <HeartHandshake className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
                    <span className="font-bold text-foreground">{userProfile.helpsCount ?? 0}</span>
                    <span>helps given</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/40 border border-border/60">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 notranslate shrink-0" />
                    <span className="font-bold text-foreground">{(userProfile.rating ?? 5.0).toFixed(1)}</span>
                    <span>rating</span>
                  </span>
                  {userAreaName && userAreaName !== 'Set your area' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/40 border border-border/60 max-w-[200px] truncate">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 notranslate shrink-0" />
                      <span className="truncate font-semibold text-foreground">{userAreaName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* =========================================================================
          1. COMMUNITY BIO CARD
             - Preserved line breaks
             - "Read more" / "Show less" after 4 lines
             - "Edit" action button
             - 500 characters max limit
             - Clean empty state with ONE clear "Add bio" button
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <User className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Community Bio</h2>
              <p className="text-xs text-muted-foreground">About you and how you help neighbors</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEditProfile}
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 touch-target shrink-0"
          >
            <Edit3 className="h-3.5 w-3.5 notranslate" />
            <span>{bio ? 'Edit' : 'Add Bio'}</span>
          </button>
        </div>

        {bio ? (
          <div className="bg-muted/30 p-4 rounded-2xl border border-border/60 space-y-2">
            <p
              className={`text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line ${
                !bioExpanded && isLongBio ? 'line-clamp-4' : ''
              }`}
            >
              {bio}
            </p>

            {isLongBio && (
              <button
                type="button"
                onClick={() => setBioExpanded(!bioExpanded)}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-1"
              >
                <span>{bioExpanded ? 'Show less' : 'Read more'}</span>
                {bioExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 notranslate" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 notranslate" />
                )}
              </button>
            )}

            <div className="text-right pt-1 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground font-mono">
                {bio.length} / 500 characters
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border text-center space-y-3">
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              No bio added yet. Tell neighbors what community help, skills, tools, or supplies you can offer (up to 500 characters).
            </p>
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-background border border-border text-xs font-bold text-primary hover:bg-muted transition shadow-xs touch-target"
            >
              <Plus className="h-3.5 w-3.5 notranslate" />
              <span>Add Bio</span>
            </button>
          </div>
        )}

        {/* Stepper Prompt to Continue Verification if unverified */}
        {userProfile.verificationState !== 'verified' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <strong className="text-xs font-bold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 notranslate shrink-0" />
                <span>Account Verification Incomplete</span>
              </strong>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                Verify your student or citizen ID to accept high-urgency blood and medical emergency tasks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('verification')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition touch-target shrink-0 self-start sm:self-auto"
            >
              <span>Continue Verification</span>
              <ChevronRight className="h-3.5 w-3.5 notranslate" />
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. CONTACT INFORMATION CARD
             - Mobile phone, Email, Organisation, Area
             - Rename "College / Organization" to "Organisation" everywhere
             - Status chip: "Verified" ONLY if truly verified, else "Added"
             - Visibility selector dropdown per row
             - Default phone & email to "All KindLink members" with honest notice
             - Area shows saved home area + "Use my live location" button
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <Phone className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Contact Information</h2>
            <p className="text-xs text-muted-foreground">
              Coordinates and privacy visibility controls
            </p>
          </div>
        </div>

        {/* Honest notice regarding default visibility */}
        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5 notranslate" />
          <p className="leading-relaxed">
            By default, registered mobile phone and email are set to{' '}
            <strong className="text-foreground font-semibold">All KindLink members</strong> so
            nearby neighbors in distress can directly call or reach you for emergency help.
            You can restrict visibility to matched helpers or only yourself at any time below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Row 1: Mobile Phone */}
          <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                  <Phone className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Mobile Phone
                  </span>
                  <strong className="text-foreground font-mono text-xs block truncate">
                    {userProfile.phone || 'Not provided'}
                  </strong>
                </div>
              </div>

              {/* Status Chip: "Verified" ONLY if truly verified, else "Added" */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                  userProfile.phoneVerified
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : userProfile.phone
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-muted/50 text-muted-foreground/60 border-transparent'
                }`}
              >
                {userProfile.phoneVerified ? 'Verified' : userProfile.phone ? 'Added' : 'Unset'}
              </span>
            </div>

            {/* Visibility Selector */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Visibility:</span>
              <select
                value={phoneVisibility}
                onChange={(e) => setPhoneVisibility(e.target.value as VisibilitySetting)}
                className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border text-foreground text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
                aria-label="Mobile phone visibility"
              >
                <option value="all">All KindLink members</option>
                <option value="matched">People I am matched with</option>
                <option value="private">Only me</option>
              </select>
            </div>
          </div>

          {/* Row 2: Email Address */}
          <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Mail className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Email Address
                  </span>
                  <strong className="text-foreground font-mono text-xs block truncate">
                    {userProfile.email || 'Not provided'}
                  </strong>
                </div>
              </div>

              {/* Status Chip: "Verified" ONLY if truly verified, else "Added" */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                  userProfile.emailVerified
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : userProfile.email
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-muted/50 text-muted-foreground/60 border-transparent'
                }`}
              >
                {userProfile.emailVerified ? 'Verified' : userProfile.email ? 'Added' : 'Unset'}
              </span>
            </div>

            {/* Visibility Selector */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Visibility:</span>
              <select
                value={emailVisibility}
                onChange={(e) => setEmailVisibility(e.target.value as VisibilitySetting)}
                className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border text-foreground text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
                aria-label="Email address visibility"
              >
                <option value="all">All KindLink members</option>
                <option value="matched">People I am matched with</option>
                <option value="private">Only me</option>
              </select>
            </div>
          </div>

          {/* Row 3: Organisation (renamed from College / Organization) */}
          <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
                  <Building2 className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Organisation
                  </span>
                  <strong className="text-foreground text-xs block truncate">
                    {userProfile.college || 'Not specified'}
                  </strong>
                </div>
              </div>

              {/* Status Chip */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                  userProfile.verificationState === 'verified' && userProfile.college
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : userProfile.college
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-muted/50 text-muted-foreground/60 border-transparent'
                }`}
              >
                {userProfile.verificationState === 'verified' && userProfile.college
                  ? 'Verified'
                  : userProfile.college
                  ? 'Added'
                  : 'Unset'}
              </span>
            </div>

            {/* Visibility Selector */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Visibility:</span>
              <select
                value={orgVisibility}
                onChange={(e) => setOrgVisibility(e.target.value as VisibilitySetting)}
                className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border text-foreground text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
                aria-label="Organisation visibility"
              >
                <option value="all">All KindLink members</option>
                <option value="matched">People I am matched with</option>
                <option value="private">Only me</option>
              </select>
            </div>
          </div>

          {/* Row 4: Area (with saved home area + "Use my live location" button) */}
          <div className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                  <MapPin className="h-4 w-4 notranslate" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Area
                    </span>
                    {userCoords?.isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  <strong className="text-foreground text-xs block truncate">
                    {userProfile.homeNeighborhood ||
                      (userAreaName && userAreaName !== 'Set your area' ? userAreaName : 'Not specified')}
                  </strong>
                </div>
              </div>

              {/* Status Chip */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                  userCoords?.isLive
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : userProfile.homeNeighborhood || (userAreaName && userAreaName !== 'Set your area')
                    ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-muted/50 text-muted-foreground/60 border-transparent'
                }`}
              >
                {userCoords?.isLive ? 'Live GPS' : 'Home Area'}
              </span>
            </div>

            {/* Actions: Live location button + Visibility Selector */}
            <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleUseLiveLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition border border-primary/20 disabled:opacity-50 touch-target"
                title="Detect and use current device location"
              >
                {isLocating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin notranslate" />
                ) : (
                  <Locate className="h-3.5 w-3.5 notranslate" />
                )}
                <span>{isLocating ? 'Locating...' : 'Use my live location'}</span>
              </button>

              <select
                value={areaVisibility}
                onChange={(e) => setAreaVisibility(e.target.value as VisibilitySetting)}
                className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border text-foreground text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
                aria-label="Area visibility"
              >
                <option value="all">All KindLink members</option>
                <option value="matched">People I am matched with</option>
                <option value="private">Only me</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. EMERGENCY CONTACTS SECTION
             - Fix duplicate rendering bug: exactly ONE empty state illustration
               and ONE "Add First Emergency Contact" button when count is 0.
             - Grid of up to 3 contact cards when present, with edit and delete buttons.
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 shrink-0">
              <AlertCircle className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Emergency SOS Contacts</h2>
              <p className="text-xs text-muted-foreground">
                When you start an SOS you can send your live location to these contacts in one tap on WhatsApp or SMS.
              </p>
            </div>
          </div>

          {/* Only show top "Add Contact" button if at least 1 contact already exists */}
          {emergencyContacts.length > 0 && emergencyContacts.length < 3 && (
            <button
              type="button"
              onClick={() => {
                setEditingContact(null);
                setContactModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-soft touch-target shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4 notranslate" />
              <span>Add Contact ({emergencyContacts.length}/3)</span>
            </button>
          )}

          {emergencyContacts.length >= 3 && (
            <span className="text-[11px] font-bold text-muted-foreground bg-muted px-3 py-1 rounded-xl self-start sm:self-auto border border-border">
              Maximum 3 contacts reached
            </span>
          )}
        </div>

        {/* Exactly ONE clean empty state illustration and ONE "Add First Emergency Contact" button */}
        {emergencyContacts.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-3">
            <div className="mx-auto w-32 h-24 relative">
              <img
                src="/illustrations/empty-contacts.svg"
                alt="No emergency contacts"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">No Emergency Contacts Registered</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                When you start an SOS you can send your live location to these contacts in one tap on WhatsApp or SMS.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingContact(null);
                setContactModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-soft touch-target"
            >
              <Plus className="h-4 w-4 notranslate" />
              <span>Add First Emergency Contact</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {emergencyContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 rounded-2xl border border-border bg-background shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm font-bold text-foreground truncate">
                      {contact.name}
                    </strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 shrink-0">
                      {contact.relationship}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  {/* One-tap WhatsApp & Phone actions */}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        'KindLink Emergency SOS alert: I may need urgent assistance.'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition touch-target"
                      title="Send WhatsApp SOS message"
                      aria-label={`Send WhatsApp message to ${contact.name}`}
                    >
                      <MessageCircle className="h-4 w-4 notranslate" />
                    </a>
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition touch-target"
                      title={`Call ${contact.name}`}
                      aria-label={`Call ${contact.name}`}
                    >
                      <Phone className="h-4 w-4 notranslate" />
                    </a>
                  </div>

                  {/* Edit and Delete actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact(contact);
                        setContactModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition touch-target"
                      title="Edit contact"
                      aria-label="Edit contact"
                    >
                      <Edit3 className="h-3.5 w-3.5 notranslate" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeEmergencyContact(contact.id);
                        toast.success('Emergency contact removed');
                      }}
                      className="p-2 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition touch-target"
                      title="Remove contact"
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-3.5 w-3.5 notranslate" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Contact Modal */}
      <EmergencyContactModal
        open={contactModalOpen}
        contact={editingContact}
        onClose={() => {
          setContactModalOpen(false);
          setEditingContact(null);
        }}
      />
    </div>
  );
}
