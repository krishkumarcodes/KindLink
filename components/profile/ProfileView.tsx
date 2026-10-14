'use client';

import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Star,
  HeartHandshake,
  FileCheck,
  Phone,
  Upload,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  X,
  Mail,
  MapPin,
  GraduationCap,
  Plus,
  Trash2,
  Share2,
  AlertCircle,
  Edit3,
  Sliders,
  TrendingUp,
  Droplet,
  BookOpen,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';
import { EmergencyContact } from '@/lib/data/types';
import { EditProfileModal } from './EditProfileModal';
import { SettingsView } from '@/components/settings/SettingsView';

type ProfileTab = 'overview' | 'activity' | 'badges' | 'impact' | 'verification' | 'settings';

export function ProfileView() {
  const {
    userProfile,
    updateVerificationState,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
    requests,
    setCurrentView,
  } = useKindLinkStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [activitySubTab, setActivitySubTab] = useState<'all' | 'history' | 'my-requests'>('all');

  // Modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  // Verification upload state
  const [phoneInput, setPhoneInput] = useState(userProfile.phone || '');
  const [docTypeInput, setDocTypeInput] = useState('Student ID Card');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Real requests created by this user
  const myActiveRequests = (requests || []).filter(
    (r) =>
      (userProfile.id && r.id && (r as any).requesterId === userProfile.id) ||
      (userProfile.name && r.contactName && r.contactName.toLowerCase() === userProfile.name.toLowerCase()) ||
      (userProfile.phone && r.phone && r.phone === userProfile.phone)
  );

  // Real completed helps where current user was the helper
  const myCompletedHelps = (requests || []).filter(
    (r) =>
      r.status === 'completed' &&
      ((userProfile.id && r.acceptedHelperId === userProfile.id) ||
        (userProfile.name && r.acceptedHelperName && r.acceptedHelperName.toLowerCase() === userProfile.name.toLowerCase()))
  );

  // Calculated display values - ONLY REAL DATA
  const displayName = userProfile.displayName || userProfile.name || (userProfile.username ? `@${userProfile.username}` : 'KindLink Member');
  const displayUsername = userProfile.username || 'user';
  const emergencyContacts = userProfile.emergencyContacts || [];

  // Account creation date formatting
  const formatAccountCreatedDate = () => {
    const rawDate = userProfile.createdAt || userProfile.created_at;
    if (!rawDate) return 'Active Member';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return 'Active Member';
      return `Member since ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } catch {
      return 'Active Member';
    }
  };

  // Real Trust Score formatting (dash "—" until at least 5 ratings exist)
  const ratingCount = userProfile.ratingCount || 0;
  const hasEnoughRatings = ratingCount >= 5;
  const trustScoreDisplay = hasEnoughRatings ? (userProfile.rating ?? 5.0).toFixed(1) : '—';

  // Badges catalog evaluated against REAL data
  const masterBadges = [
    {
      id: 'blood-hero',
      title: 'Life Saver (Blood Donor)',
      category: 'Emergency',
      description: 'Donated blood or coordinated urgent units for emergency hospital patients.',
      icon: '/illustrations/badge-blood-hero.svg',
      earned: userProfile.badges?.some((b) => /blood|life saver/i.test(b)) ?? false,
      progress: userProfile.badges?.some((b) => /blood|life saver/i.test(b)) ? 100 : 0,
      progressLabel: userProfile.badges?.some((b) => /blood|life saver/i.test(b))
        ? 'Verified Blood Transfer'
        : '0/1 Emergency Blood Transfer',
    },
    {
      id: 'first-aid',
      title: 'Emergency First Responder',
      category: 'Urgent Care',
      description: 'Responded to critical high-urgency community distress calls within 15 minutes.',
      icon: '/illustrations/badge-first-aid.svg',
      earned: userProfile.badges?.some((b) => /responder|first aid/i.test(b)) ?? false,
      progress: userProfile.badges?.some((b) => /responder|first aid/i.test(b)) ? 100 : 0,
      progressLabel: userProfile.badges?.some((b) => /responder|first aid/i.test(b))
        ? 'Active Responder'
        : '0/3 Critical Distress Responses',
    },
    {
      id: 'student-verified',
      title: 'Verified Student Member',
      category: 'Education',
      description: 'Academic student identity authenticated with official college credentials.',
      icon: '/illustrations/badge-student-verified.svg',
      earned: userProfile.verificationState === 'verified' && !!userProfile.college,
      progress: userProfile.verificationState === 'verified' && !!userProfile.college ? 100 : 0,
      progressLabel: userProfile.college ? `${userProfile.college} Verified` : 'College ID Pending',
    },
    {
      id: 'trusted-neighbor',
      title: 'Trusted Local Neighbor',
      category: 'Community',
      description: 'Maintained a 4.8+ Trust Score across at least 5 verified acts of mutual aid.',
      icon: '/illustrations/badge-trusted-neighbor.svg',
      earned: hasEnoughRatings && (userProfile.rating ?? 0) >= 4.8,
      progress: Math.min(100, Math.round((ratingCount / 5) * 100)),
      progressLabel: hasEnoughRatings ? `${ratingCount} Verified Reviews` : `${ratingCount} of 5 Reviews needed`,
    },
    {
      id: 'community-pillar',
      title: 'Community Pillar',
      category: 'Leadership',
      description: 'Completed 10 or more acts of verified mutual assistance for local neighbors.',
      icon: '/illustrations/badge-community-pillar.svg',
      earned: (userProfile.helpsCount ?? 0) >= 10,
      progress: Math.min(100, Math.round(((userProfile.helpsCount ?? 0) / 10) * 100)),
      progressLabel: `${userProfile.helpsCount ?? 0} of 10 Helps Given`,
    },
    {
      id: 'study-mentor',
      title: 'Study & Books Mentor',
      category: 'Education',
      description: 'Shared semester engineering textbooks or study guides with junior students.',
      icon: '/illustrations/badge-study-mentor.svg',
      earned: userProfile.badges?.some((b) => /study|mentor|books/i.test(b)) ?? false,
      progress: userProfile.badges?.some((b) => /study|mentor|books/i.test(b)) ? 100 : 0,
      progressLabel: userProfile.badges?.some((b) => /study|mentor|books/i.test(b))
        ? 'Course Booksets Shared'
        : '0/1 Study Material Loan',
    },
  ];

  const earnedBadgesCount = masterBadges.filter((b) => b.earned).length;

  // Upload ID to private storage
  const handleUploadId = async () => {
    if (!phoneInput || phoneInput.trim().length < 10) {
      toast.error('Please enter a valid 10-digit Indian phone number');
      return;
    }
    if (!selectedFile) {
      toast.error('Please choose a valid ID document (JPG, PNG, or PDF)');
      return;
    }

    setUploading(true);
    try {
      const res = await dataAdapter.uploadVerificationDoc(phoneInput.trim(), selectedFile);
      if (!res.success) {
        toast.error(res.error || 'Failed to submit verification document');
        setUploading(false);
        return;
      }

      updateVerificationState('pending', selectedFile.name, docTypeInput);
      setIdModalOpen(false);
      toast.success('Document Submitted for Verification!', {
        description: 'Uploaded to private storage. Admin will review and verify your account.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full pb-36 lg:pb-16 text-foreground overflow-x-hidden">
      {/* =========================================================================
          1. HEADER CARD: User's full name (wraps onto 2 lines, never cut off),
             username, verification badge, location, and quick stats in 2x2 grid.
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-soft">
        {/* Subtle decorative background gradient accent */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 text-center md:text-left">
          {/* Avatar / Uppercase Initial */}
          <div className="relative shrink-0">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={displayName}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover border-2 border-primary/30 shadow-soft"
              />
            ) : (
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white text-3xl sm:text-4xl font-black shadow-soft ring-4 ring-primary/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Corner Verification Shield Icon */}
            <div
              className={`absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-2xl shadow-xs text-white ${
                userProfile.verificationState === 'verified'
                  ? 'bg-emerald-500 ring-2 ring-background'
                  : userProfile.verificationState === 'pending'
                  ? 'bg-amber-500 ring-2 ring-background'
                  : 'bg-muted-foreground/80 ring-2 ring-background'
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

          {/* User Details & Identity */}
          <div className="space-y-3 flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                {/* Full name wrapping onto 2 lines if needed, never cut off */}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight break-words line-clamp-2 leading-tight">
                  {displayName}
                </h1>

                {/* Sub-identity: @username and Verification Status Pill */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
                  <span className="text-xs sm:text-sm font-semibold text-primary font-mono">
                    @{displayUsername}
                  </span>

                  {/* Truthful Verification Badge: Verified, Pending, or Not verified */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                      userProfile.verificationState === 'verified'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : userProfile.verificationState === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {userProfile.verificationState === 'verified' ? (
                      <>
                        <ShieldCheck className="h-3 w-3 text-emerald-500 notranslate" />
                        <span>Verified</span>
                      </>
                    ) : userProfile.verificationState === 'pending' ? (
                      <>
                        <Clock className="h-3 w-3 text-amber-500 notranslate" />
                        <span>Pending</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3 w-3 text-muted-foreground notranslate" />
                        <span>Not verified</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Edit Profile & Share Profile */}
              <div className="flex items-center justify-center md:justify-end gap-2 shrink-0">
                <button
                  onClick={() => setEditProfileOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted text-xs font-bold transition shadow-xs touch-target"
                >
                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground notranslate" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Profile link copied to clipboard!');
                    }
                  }}
                  className="p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition shadow-xs touch-target"
                  title="Share Profile"
                  aria-label="Share Profile"
                >
                  <Share2 className="h-4 w-4 notranslate" />
                </button>
              </div>
            </div>

            {/* Sub-identity row: College & Location */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-1.5 gap-x-4 text-xs text-muted-foreground font-medium">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500 notranslate shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-none">
                  {userProfile.homeNeighborhood || 'Asansol, West Bengal'}
                </span>
              </span>

              {userProfile.college && (
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{userProfile.college}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                <Clock className="h-3 w-3 notranslate shrink-0" />
                <span>{formatAccountCreatedDate()}</span>
              </span>
            </div>

            {/* Quick Stats: Evenly Aligned 2x2 Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-border/80">
              {/* Stat 1: Helps Given */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <HeartHandshake className="h-4 w-4 text-primary notranslate shrink-0" />
                  <span>Helps Given</span>
                </div>
                <span className="text-xl font-extrabold text-foreground mt-0.5">
                  {userProfile.helpsCount || 0}
                </span>
              </div>

              {/* Stat 2: Requests Posted */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <FileCheck className="h-4 w-4 text-teal-500 notranslate shrink-0" />
                  <span>Requests</span>
                </div>
                <span className="text-xl font-extrabold text-foreground mt-0.5">
                  {myActiveRequests.length || userProfile.requestsCount || 0}
                </span>
              </div>

              {/* Stat 3: Hours Active */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Clock className="h-4 w-4 text-indigo-500 notranslate shrink-0" />
                  <span>Hours Active</span>
                </div>
                <span className="text-xl font-extrabold text-foreground mt-0.5">
                  {userProfile.hoursVolunteered ?? 0}h
                </span>
              </div>

              {/* Stat 4: Trust Score (Dash "—" until at least 5 ratings exist) */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500 notranslate shrink-0" />
                  <span>Trust Score</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-extrabold text-foreground">
                    {trustScoreDisplay}
                  </span>
                  {hasEnoughRatings && (
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      / 5.0
                    </span>
                  )}
                  {!hasEnoughRatings && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      ({ratingCount}/5 reviews)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. TAB NAVIGATION BAR: Horizontally scrollable tab strip with smooth snap,
             clear active indicator, and labels never truncated.
         ========================================================================= */}
      <div className="snap-x snap-mandatory flex overflow-x-auto scrollbar-none gap-2 pb-2 px-1 border-b border-border">
        {[
          { id: 'overview' as const, label: 'Overview', icon: User },
          {
            id: 'activity' as const,
            label: 'Activity',
            icon: Clock,
            badge: myActiveRequests.length + myCompletedHelps.length,
          },
          {
            id: 'badges' as const,
            label: 'Badges',
            icon: Award,
            badge: earnedBadgesCount > 0 ? earnedBadgesCount : undefined,
          },
          { id: 'impact' as const, label: 'Impact', icon: TrendingUp },
          {
            id: 'verification' as const,
            label: 'Verification',
            icon: ShieldCheck,
            alert: userProfile.verificationState !== 'verified',
          },
          { id: 'settings' as const, label: 'Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`snap-start shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all touch-target ${
                isActive
                  ? 'bg-primary text-white shadow-soft ring-2 ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 notranslate shrink-0" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.alert && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          3. TAB 1: OVERVIEW (Real bio, verification stepper, contact info note,
             emergency contacts with single clean empty state)
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section A: Community Bio Card */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <User className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Community Bio</h2>
                  <p className="text-xs text-muted-foreground">About you and how you help neighbors</p>
                </div>
              </div>
              <button
                onClick={() => setEditProfileOpen(true)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 touch-target"
              >
                <Edit3 className="h-3.5 w-3.5 notranslate" />
                <span>{userProfile.bio ? 'Edit' : 'Add Bio'}</span>
              </button>
            </div>

            {userProfile.bio ? (
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-muted/30 p-4 rounded-2xl border border-border/60">
                "{userProfile.bio}"
              </p>
            ) : (
              <div className="p-4 rounded-2xl bg-muted/20 border border-dashed border-border text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  No bio added yet. Tell neighbors what mutual aid or skills you can offer.
                </p>
                <button
                  onClick={() => setEditProfileOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-bold text-primary hover:bg-muted transition"
                >
                  <Plus className="h-3.5 w-3.5 notranslate" />
                  <span>Add Community Bio</span>
                </button>
              </div>
            )}

            {/* Stepper Prompt to Continue Verification */}
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
                  onClick={() => setActiveTab('verification')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition touch-target shrink-0 self-start sm:self-auto"
                >
                  <span>Continue Verification</span>
                  <ChevronRight className="h-3.5 w-3.5 notranslate" />
                </button>
              </div>
            )}
          </div>

          {/* Section B: Contact Information Card */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Phone className="h-5 w-5 notranslate" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Contact Information</h2>
                <p className="text-xs text-muted-foreground">
                  Visible only to you and matched helpers during active aid requests
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Phone */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <Phone className="h-4 w-4 notranslate" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Mobile Phone</span>
                    <strong className="text-foreground font-mono text-xs block truncate">
                      {userProfile.phone || 'Not provided'}
                    </strong>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    userProfile.phone
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {userProfile.phone ? 'Registered' : 'Unset'}
                </span>
              </div>

              {/* Email */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Mail className="h-4 w-4 notranslate" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Email Address</span>
                    <strong className="text-foreground font-mono text-xs block truncate">
                      {userProfile.email || 'Not provided'}
                    </strong>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    userProfile.email
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {userProfile.email ? 'Registered' : 'Unset'}
                </span>
              </div>

              {/* College / Institution (with "Added by you" badge) */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
                    <GraduationCap className="h-4 w-4 notranslate" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">College / Organization</span>
                    <strong className="text-foreground text-xs block truncate">
                      {userProfile.college || 'Not specified'}
                    </strong>
                  </div>
                </div>
                {userProfile.college && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border shrink-0">
                    Added by you
                  </span>
                )}
              </div>

              {/* Neighborhood */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                    <MapPin className="h-4 w-4 notranslate" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Area / Neighborhood</span>
                    <strong className="text-foreground text-xs block truncate">
                      {userProfile.homeNeighborhood || 'Asansol, West Bengal'}
                    </strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
                  WB
                </span>
              </div>
            </div>
          </div>

          {/* Section C: Emergency Contacts List (Single clean empty state illustration, up to 3 contacts) */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600">
                  <AlertCircle className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Emergency SOS Contacts</h2>
                  <p className="text-xs text-muted-foreground">
                    When you start an SOS you can send your live location to these contacts in one tap on WhatsApp or SMS.
                  </p>
                </div>
              </div>

              {emergencyContacts.length < 3 ? (
                <button
                  onClick={() => {
                    setEditingContact(null);
                    setContactModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-soft touch-target shrink-0 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4 notranslate" />
                  <span>Add Contact ({emergencyContacts.length}/3)</span>
                </button>
              ) : (
                <span className="text-[11px] font-bold text-muted-foreground bg-muted px-3 py-1 rounded-xl self-start sm:self-auto">
                  Maximum 3 contacts reached
                </span>
              )}
            </div>

            {/* Exactly ONE clean empty state illustration */}
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
                        <strong className="text-sm font-bold text-foreground truncate">{contact.name}</strong>
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
                          href={`https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent('KindLink Emergency SOS alert: I may need urgent assistance.')}`}
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

                      <div className="flex items-center gap-1">
                        <button
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
        </div>
      )}

      {/* =========================================================================
          4. TAB 2: ACTIVITY (Real completed helps & real posted requests with honest illustrations)
         ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Sub-filter segmented control */}
          <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'all' as const, label: `All Activity (${myCompletedHelps.length + myActiveRequests.length})` },
              { id: 'history' as const, label: `Completed Helps (${myCompletedHelps.length})` },
              { id: 'my-requests' as const, label: `My Requests (${myActiveRequests.length})` },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActivitySubTab(sub.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition touch-target shrink-0 whitespace-nowrap ${
                  activitySubTab === sub.id
                    ? 'bg-foreground text-background shadow-xs'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Section 1: Completed Help Acts */}
          {(activitySubTab === 'all' || activitySubTab === 'history') && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 notranslate" />
                <span>Completed Mutual Aid Acts</span>
              </h3>

              {myCompletedHelps.length === 0 ? (
                <div className="p-8 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                  <div className="mx-auto w-32 h-24 relative">
                    <img
                      src="/illustrations/empty-history.svg"
                      alt="No completed helps"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">No Completed Helps Yet</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                      When you accept and complete urgent neighbor requests on the map or feed, your verified mutual aid acts will be cataloged here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {myCompletedHelps.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl border border-border bg-card shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{req.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
                            {req.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {req.locationName} · Completed with community OTP verification
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl self-start sm:self-center">
                        <CheckCircle2 className="h-3.5 w-3.5 notranslate" />
                        <span>Completed</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Active Requests Posted */}
          {(activitySubTab === 'all' || activitySubTab === 'my-requests') && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary notranslate" />
                <span>My Posted Requests ({myActiveRequests.length})</span>
              </h3>

              {myActiveRequests.length === 0 ? (
                <div className="p-8 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                  <div className="mx-auto w-32 h-24 relative">
                    <img
                      src="/illustrations/empty-requests.svg"
                      alt="No active requests"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">No Requests Posted</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                      You haven't posted any help requests yet. Need emergency blood, medical equipment, or elderly transport?
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentView('new')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-soft touch-target"
                  >
                    <Plus className="h-4 w-4 notranslate" />
                    <span>Create New Request</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myActiveRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl border border-border bg-card shadow-soft space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{req.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              req.urgency === 'critical'
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                : req.urgency === 'high'
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {req.urgency}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full uppercase self-start sm:self-auto">
                          Status: {req.status} ({req.helpersOffered || 0} offers)
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {req.locationName} · Created {req.createdAt}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          5. TAB 3: BADGES (Real earned badges or honest progress tracking)
         ========================================================================= */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <Award className="h-6 w-6 notranslate" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Community Trust Badges</h2>
                <p className="text-xs text-muted-foreground">
                  Credentials earned through verified in-person assistance and peer reviews
                </p>
              </div>
            </div>
            <div className="px-3.5 py-1.5 rounded-2xl bg-primary/10 text-primary font-extrabold text-xs self-start sm:self-auto">
              {earnedBadgesCount} of {masterBadges.length} Unlocked
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterBadges.map((badge) => (
              <div
                key={badge.id}
                className={`relative rounded-3xl border p-5 shadow-soft transition-all flex flex-col justify-between ${
                  badge.earned
                    ? 'border-primary/40 bg-card hover:border-primary/70'
                    : 'border-border/60 bg-muted/20 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        badge.earned
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {badge.earned ? 'Earned' : 'Locked'}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {badge.category}
                    </span>
                  </div>

                  <div className="flex justify-center my-3">
                    <div
                      className={`h-24 w-24 relative transition-transform ${
                        !badge.earned ? 'filter grayscale contrast-75 opacity-60' : ''
                      }`}
                    >
                      <img
                        src={badge.icon}
                        alt={badge.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="text-center space-y-1.5 mt-2">
                    <h4 className="text-sm font-bold text-foreground">{badge.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-muted-foreground">{badge.progressLabel}</span>
                    <span className={badge.earned ? 'text-emerald-600 font-bold' : 'text-primary font-bold'}>
                      {badge.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.earned ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          6. TAB 4: IMPACT (Honest real stats, hours, neighbors supported)
         ========================================================================= */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600">
                <TrendingUp className="h-6 w-6 notranslate" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Verified Mutual Aid Impact</h2>
                <p className="text-xs text-muted-foreground">
                  Record of emergency tasks completed and neighbors supported
                </p>
              </div>
            </div>
          </div>

          {/* 4 Real Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4 text-primary notranslate" />
                <span>Helps Delivered</span>
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                {userProfile.helpsCount || 0}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Verified acts of community help
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-500 notranslate" />
                <span>Hours Volunteered</span>
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                {userProfile.hoursVolunteered ?? 0}h
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Dedicated mutual aid time
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-rose-500 notranslate" />
                <span>Neighbors Supported</span>
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                {userProfile.helpsCount || 0}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Beneficiaries assisted directly
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-teal-500 notranslate" />
                <span>Distance Covered</span>
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                {userProfile.kilometersTraveled ?? 0} km
              </span>
              <span className="text-[11px] text-muted-foreground block">
                Hyperlocal transit logged
              </span>
            </div>
          </div>

          {/* Honest Impact Explanation */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-3">
            <h3 className="text-sm font-bold text-foreground">How Impact Tracking Works</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              KindLink records real mutual aid metrics only after both the requester and volunteer verify task completion via mutual OTP or delivery handshake. No estimated or simulated counts are credited.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. TAB 5: VERIFICATION (3-tier protocol & ID document upload)
         ========================================================================= */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <FileCheck className="h-6 w-6 notranslate" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Volunteer Verification</h2>
                <p className="text-xs text-muted-foreground">
                  Verification ensures safety during critical medical, transport, and equipment requests
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase self-start sm:self-auto ${
                userProfile.verificationState === 'verified'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}
            >
              <ShieldCheck className="h-4 w-4 notranslate" />
              <span>Status: {userProfile.verificationState}</span>
            </span>
          </div>

          {/* 3 Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Phone */}
            <div className="p-5 rounded-3xl bg-card border border-border shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <Phone className="h-4 w-4 text-primary notranslate" />
                    <span>Step 1: Phone Number</span>
                  </span>
                  {userProfile.phone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 notranslate" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground notranslate" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {userProfile.phone
                    ? `Registered as ${userProfile.phone}. Verified for dispatch calls.`
                    : 'Register your mobile number so matched beneficiaries can contact you.'}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600">
                  {userProfile.phone ? 'Phone Added' : 'Required'}
                </span>
                <button
                  onClick={() => setEditProfileOpen(true)}
                  className="text-xs font-bold text-primary hover:underline touch-target"
                >
                  {userProfile.phone ? 'Update →' : 'Add Phone →'}
                </button>
              </div>
            </div>

            {/* Step 2: Document */}
            <div className="p-5 rounded-3xl bg-card border border-border shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <Upload className="h-4 w-4 text-teal-500 notranslate" />
                    <span>Step 2: ID Document</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      userProfile.idDocumentName
                        ? 'text-emerald-600 bg-emerald-500/10'
                        : 'text-amber-600 bg-amber-500/10'
                    }`}
                  >
                    {userProfile.idDocumentName ? 'Uploaded' : 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {userProfile.idDocumentName
                    ? `${userProfile.idDocumentName} submitted for verification.`
                    : 'Upload a Student ID (AEC/MAKAUT) or Government Photo ID for identity authentication.'}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px]">
                  {userProfile.idDocumentName || 'No document'}
                </span>
                <button
                  onClick={() => setIdModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline touch-target"
                >
                  {userProfile.idDocumentName ? 'Replace ID →' : 'Upload ID →'}
                </button>
              </div>
            </div>

            {/* Step 3: Admin Review */}
            <div className="p-5 rounded-3xl bg-card border border-border shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <Award className="h-4 w-4 text-indigo-500 notranslate" />
                    <span>Step 3: Verification Review</span>
                  </span>
                  <CheckCircle2
                    className={`h-4 w-4 notranslate ${
                      userProfile.verificationState === 'verified'
                        ? 'text-emerald-500'
                        : 'text-muted-foreground/40'
                    }`}
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {userProfile.verificationState === 'verified'
                    ? 'Verified Volunteer badge unlocked. You can respond to emergency blood and medical transit tasks.'
                    : userProfile.verificationState === 'pending'
                    ? 'Your submission is under admin review. Verification typically takes under 24 hours.'
                    : 'Submit your document to initiate the verification review.'}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    userProfile.verificationState === 'verified'
                      ? 'text-emerald-600'
                      : userProfile.verificationState === 'pending'
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {userProfile.verificationState === 'verified'
                    ? 'Verified'
                    : userProfile.verificationState === 'pending'
                    ? 'Under Review'
                    : 'Not Submitted'}
                </span>
                {userProfile.verificationState !== 'verified' && (
                  <button
                    onClick={() => setIdModalOpen(true)}
                    className="text-xs font-bold text-primary hover:underline touch-target"
                  >
                    Submit Document →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. TAB 6: SETTINGS (Renders complete SettingsView component)
         ========================================================================= */}
      {activeTab === 'settings' && <SettingsView />}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />

      {/* ID UPLOAD MODAL */}
      {idModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Volunteer Identity Verification</h3>
                  <p className="text-xs text-muted-foreground">Upload official identification</p>
                </div>
              </div>
              <button
                onClick={() => setIdModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              To respond to urgent medical and blood requests, please provide your mobile number and student or citizen ID. Documents are stored in secure private storage.
            </p>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Verified Phone Number (10 digits)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98320 12345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Document Type</label>
              <select
                value={docTypeInput}
                onChange={(e) => setDocTypeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
              >
                <option value="Student ID Card">College Student ID (AEC / MAKAUT / University)</option>
                <option value="Government Photo ID">Government Photo ID (Aadhaar / Voter ID)</option>
                <option value="Driving License">Driving License</option>
                <option value="Healthcare Certificate">Healthcare / First Responder Certificate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Attach Document File (PDF, JPG, PNG - Max 5 MB)
              </label>
              <label className="p-5 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/60 transition">
                <Upload className="h-6 w-6 text-primary notranslate" />
                <span className="font-semibold text-foreground text-center">
                  {selectedFile ? selectedFile.name : 'Click to select document'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Secure Private Storage'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('File size exceeds 5 MB limit');
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIdModalOpen(false)}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition touch-target"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadId}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition disabled:opacity-50 touch-target"
              >
                {uploading ? 'Submitting...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY CONTACT ADD / EDIT MODAL */}
      {contactModalOpen && (
        <EmergencyContactFormModal
          contact={editingContact}
          onClose={() => {
            setContactModalOpen(false);
            setEditingContact(null);
          }}
          onSave={(contactData) => {
            if (editingContact) {
              updateEmergencyContact({
                id: editingContact.id,
                ...contactData,
              });
              toast.success('Emergency contact updated');
            } else {
              addEmergencyContact(contactData);
              toast.success('Emergency contact added');
            }
            setContactModalOpen(false);
            setEditingContact(null);
          }}
        />
      )}
    </div>
  );
}

{/* =========================================================================
    EMERGENCY CONTACT ADD / EDIT FORM MODAL
   ========================================================================= */}
function EmergencyContactFormModal({
  contact,
  onClose,
  onSave,
}: {
  contact?: EmergencyContact | null;
  onClose: () => void;
  onSave: (data: { name: string; phone: string; relationship: string }) => void;
}) {
  const [name, setName] = useState(contact?.name || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [relationship, setRelationship] = useState(contact?.relationship || 'Parent');

  const validateIndianPhone = (num: string): boolean => {
    const cleaned = num.replace(/[\s\-\(\)]/g, '');
    return /^(?:\+91)?[6-9]\d{9}$/.test(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter the contact full name');
      return;
    }

    if (!validateIndianPhone(phone)) {
      toast.error('Please enter a valid 10-digit Indian phone number (+91...)');
      return;
    }

    // Format phone
    let formattedPhone = phone.trim();
    const cleanDigits = formattedPhone.replace(/\D/g, '');
    if (cleanDigits.length === 10) {
      formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    }

    onSave({
      name: name.trim(),
      phone: formattedPhone,
      relationship,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <AlertCircle className="h-5 w-5 notranslate" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">
            Contact Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Sharma"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">Relationship</label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          >
            <option value="Parent">Parent</option>
            <option value="Spouse">Spouse / Partner</option>
            <option value="Sibling">Sibling</option>
            <option value="Child">Child</option>
            <option value="Friend">Close Friend</option>
            <option value="Neighbor">Local Neighbor</option>
            <option value="Colleague">Colleague / Peer</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">
            Phone Number (Indian Format) <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98320 12345"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition touch-target"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition touch-target"
          >
            Save Contact
          </button>
        </div>
      </form>
    </div>
  );
}
