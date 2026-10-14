'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Sparkles,
  Award,
  LogOut,
  ChevronRight,
  X,
  Mail,
  MapPin,
  GraduationCap,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  Sun,
  Moon,
  Monitor,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Download,
  TrendingUp,
  Droplet,
  BookOpen,
  Heart,
  Shield,
  Share2,
  AlertCircle,
  Check,
  Edit3,
  Sliders,
  Flame,
  Volume2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';
import { EmergencyContact } from '@/lib/data/types';
import { LanguageModal } from '@/components/shell/LanguageModal';
import { getCurrentLanguageCode, SUPPORTED_LANGUAGES } from '@/lib/translate/googleTranslate';

type ProfileTab = 'overview' | 'activity' | 'badges' | 'impact' | 'verification' | 'settings';

export function ProfileView() {
  const {
    userProfile,
    updateUserProfile,
    updateVerificationState,
    addEmergencyContact,
    removeEmergencyContact,
    requests,
  } = useKindLinkStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [activitySubTab, setActivitySubTab] = useState<'all' | 'history' | 'my-requests'>('all');

  // Modals
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);

  // Verification upload state
  const [phoneInput, setPhoneInput] = useState(userProfile.phone || '');
  const [docTypeInput, setDocTypeInput] = useState('Student ID Card');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Emergency contact state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('Parent');

  // Profile edit state
  const [editName, setEditName] = useState(userProfile.name || '');
  const [editUsername, setEditUsername] = useState(userProfile.username || '');
  const [editCollege, setEditCollege] = useState(userProfile.college || '');
  const [editNeighborhood, setEditNeighborhood] = useState(userProfile.homeNeighborhood || '');
  const [editBio, setEditBio] = useState('Dedicated community volunteer in Asansol. Ready to assist with emergency transport, blood drives, and student tutoring.');

  // Notification & Privacy toggles
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [maskPhone, setMaskPhone] = useState(true);
  const [transitGpsPrivacy, setTransitGpsPrivacy] = useState(true);

  // PWA deferred prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Sync PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsPwaInstalled(true);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('KindLink app installation initiated!');
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setPwaModalOpen(true);
    }
  };

  // Real requests created by this user
  const myActiveRequests = (requests || []).filter(
    (r) =>
      (userProfile.name && r.contactName.toLowerCase() === userProfile.name.toLowerCase()) ||
      (userProfile.phone && r.phone === userProfile.phone)
  );

  // Completed history sample
  const myHelpHistory = [
    {
      id: 'hist-1',
      title: 'Delivered Emergency Blood Unit to District Hospital',
      category: 'Blood Donation',
      categoryColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      date: 'Yesterday at 4:30 PM',
      rating: 5.0,
      beneficiary: 'Pritam K.',
      impact: 'Immediate matched transfusion supported',
    },
    {
      id: 'hist-2',
      title: 'Provided Foldable Wheelchair to Senior Citizen',
      category: 'Medical Equipment',
      categoryColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      date: '3 days ago',
      rating: 5.0,
      beneficiary: 'Ananya B.',
      impact: 'Mobility restored for medical checkup',
    },
    {
      id: 'hist-3',
      title: 'Assisted High School Student with Madhyamik Books',
      category: 'Books & Study',
      categoryColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      date: 'Last week',
      rating: 4.8,
      beneficiary: 'Bikash D.',
      impact: 'Standard-X syllabus materials shared',
    },
  ];

  // Upload ID to private storage
  const handleUploadId = async () => {
    if (!phoneInput || phoneInput.trim().length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
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

  // Add emergency contact handler
  const handleAddEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      toast.error('Please provide the contact full name');
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    addEmergencyContact({
      name: contactName.trim(),
      phone: contactPhone.trim(),
      relationship: contactRelation,
    });

    setContactName('');
    setContactPhone('');
    setAddContactOpen(false);
    toast.success('Emergency Contact Added', {
      description: `${contactName.trim()} will be alerted during SOS calls.`,
    });
  };

  // Save profile edits
  const handleSaveProfileEdits = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: editName.trim() || userProfile.name,
      username: editUsername.trim() || userProfile.username,
      college: editCollege.trim() || userProfile.college,
      homeNeighborhood: editNeighborhood.trim() || userProfile.homeNeighborhood,
    });
    setEditProfileOpen(false);
    toast.success('Profile updated successfully');
  };

  // Calculated display values
  const displayName = userProfile.name || userProfile.displayName || 'Community Member';
  const displayUsername = userProfile.username || displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'kindlink_member';
  const hoursVolunteered = userProfile.hoursVolunteered ?? Math.max(12, Math.round(userProfile.helpsCount * 2.5));
  const peopleSupported = Math.max(userProfile.helpsCount, 8);
  const emergencyContacts = userProfile.emergencyContacts || [];

  // Badges catalog
  const masterBadges = [
    {
      id: 'blood-hero',
      title: 'Life Saver (Blood Donor)',
      category: 'Emergency',
      description: 'Donated blood or coordinated urgent units for emergency hospital patients.',
      icon: '/illustrations/badge-blood-hero.svg',
      earned: userProfile.badges?.some((b) => /blood|life saver/i.test(b)) ?? false,
      progress: 100,
      progressLabel: 'Completed 1/1 Blood Transfer',
    },
    {
      id: 'first-aid',
      title: 'Emergency First Responder',
      category: 'Urgent Care',
      description: 'Responded to critical high-urgency community distress calls within 15 minutes.',
      icon: '/illustrations/badge-first-aid.svg',
      earned: userProfile.badges?.some((b) => /responder|first aid/i.test(b)) ?? false,
      progress: 66,
      progressLabel: '2 of 3 Urgent Responses',
    },
    {
      id: 'student-verified',
      title: 'Verified College Student',
      category: 'Education',
      description: 'Academic student identity authenticated at MAKAUT / Asansol Engineering College.',
      icon: '/illustrations/badge-student-verified.svg',
      earned: userProfile.verificationState === 'verified' || !!userProfile.college,
      progress: 100,
      progressLabel: 'AEC Student Authenticated',
    },
    {
      id: 'trusted-neighbor',
      title: 'Trusted Local Neighbor',
      category: 'Community',
      description: 'Maintained a 4.8+ Trust Score across verified acts of neighborly mutual aid.',
      icon: '/illustrations/badge-trusted-neighbor.svg',
      earned: (userProfile.rating ?? 5.0) >= 4.8,
      progress: 80,
      progressLabel: '4 of 5 Five-Star Reviews',
    },
    {
      id: 'community-pillar',
      title: 'Community Pillar',
      category: 'Leadership',
      description: 'Completed 10 or more acts of verified mutual assistance for local neighbors.',
      icon: '/illustrations/badge-community-pillar.svg',
      earned: (userProfile.helpsCount ?? 0) >= 10,
      progress: Math.min(100, Math.round(((userProfile.helpsCount ?? 3) / 10) * 100)),
      progressLabel: `${userProfile.helpsCount ?? 3} of 10 Helps Given`,
    },
    {
      id: 'study-mentor',
      title: 'Study & Books Mentor',
      category: 'Education',
      description: 'Shared semester engineering textbooks or study guides with junior students.',
      icon: '/illustrations/badge-study-mentor.svg',
      earned: userProfile.badges?.some((b) => /study|mentor|books/i.test(b)) ?? true,
      progress: 100,
      progressLabel: 'Shared 2 Course Booksets',
    },
  ];

  const earnedBadgesCount = masterBadges.filter((b) => b.earned).length;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full pb-36 lg:pb-16">
      {/* =========================================================================
          1. HEADER CARD: Avatar / Initials, Name, @username, Verification, Rating & Quick Stats
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
        {/* Subtle decorative background gradient accent */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          {/* Avatar / Uppercase Initials Badge */}
          <div className="relative shrink-0">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={displayName}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover border-2 border-primary/20 shadow-soft"
              />
            ) : (
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white text-3xl sm:text-4xl font-extrabold shadow-soft ring-4 ring-primary/20">
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
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {displayName}
                  </h1>
                  {/* Verification Status Pill */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      userProfile.verificationState === 'verified'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : userProfile.verificationState === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {userProfile.verificationState === 'verified' ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 notranslate" />
                        <span>Verified Volunteer</span>
                      </>
                    ) : userProfile.verificationState === 'pending' ? (
                      <>
                        <Clock className="h-3.5 w-3.5 text-amber-500 notranslate" />
                        <span>Verification In Review</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground notranslate" />
                        <span>Unverified Account</span>
                      </>
                    )}
                  </span>
                </div>
                {/* @username */}
                <p className="text-xs sm:text-sm font-semibold text-primary mt-0.5">
                  @{displayUsername}
                </p>
              </div>

              {/* Action Buttons: Edit Profile & Share */}
              <div className="flex items-center justify-center md:justify-end gap-2">
                <button
                  onClick={() => {
                    setEditName(displayName);
                    setEditUsername(displayUsername);
                    setEditCollege(userProfile.college || 'Asansol Engineering College');
                    setEditNeighborhood(userProfile.homeNeighborhood || 'Kalyanpur, Asansol');
                    setEditProfileOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-background text-foreground hover:bg-muted text-xs font-bold transition shadow-xs touch-target"
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
                <GraduationCap className="h-3.5 w-3.5 text-primary notranslate" />
                <span>{userProfile.college || 'Asansol Engineering College'}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500 notranslate" />
                <span>{userProfile.homeNeighborhood || 'Kalyanpur, Asansol'} · WB</span>
              </span>
              {(userProfile.phone || userProfile.email) && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="h-3.5 w-3.5 text-emerald-500 notranslate" />
                  <span>{userProfile.phone || userProfile.email}</span>
                </span>
              )}
            </div>

            {/* Quick Stats Row: Helps Given, Requests Posted, Hours Volunteered, Rating Star */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-border/80">
              {/* Stat 1: Helps Given */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <HeartHandshake className="h-4 w-4 text-primary notranslate" />
                  <span>Helps Given</span>
                </div>
                <span className="text-xl font-extrabold text-foreground mt-0.5">
                  {userProfile.helpsCount || 3}
                </span>
              </div>

              {/* Stat 2: Requests Posted */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <FileCheck className="h-4 w-4 text-teal-500 notranslate" />
                  <span>Requests</span>
                </div>
                <span className="text-xl font-extrabold text-foreground mt-0.5">
                  {userProfile.requestsCount || myActiveRequests.length || 1}
                </span>
              </div>

              {/* Stat 3: Hours Volunteered */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Clock className="h-4 w-4 text-indigo-500 notranslate" />
                  <span>Hours Active</span>
                </div>
                <span className="text-xl font-extrabold text-foreground mt-0.5">
                  {hoursVolunteered}h
                </span>
              </div>

              {/* Stat 4: Rating Star & Trust Score */}
              <div className="p-3 rounded-2xl bg-background/80 border border-border/80 flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500 notranslate" />
                  <span>Trust Score</span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-extrabold text-foreground">
                    {(userProfile.rating ?? 5.0).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    / 5.0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. TAB NAVIGATION BAR: Overview, Activity, Badges, Impact, Verification, Settings
         ========================================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border">
        {[
          { id: 'overview' as const, label: 'Overview', icon: User },
          { id: 'activity' as const, label: 'Activity', icon: Clock, badge: myActiveRequests.length + myHelpHistory.length },
          { id: 'badges' as const, label: 'Badges', icon: Award, badge: earnedBadgesCount },
          { id: 'impact' as const, label: 'Impact', icon: TrendingUp },
          { id: 'verification' as const, label: 'Verification', icon: ShieldCheck, alert: userProfile.verificationState !== 'verified' },
          { id: 'settings' as const, label: 'Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all touch-target shrink-0 ${
                isActive
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 notranslate" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
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
          3. TAB 1: OVERVIEW (Summary, Contact Info, Emergency Contacts List)
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section A: Profile Summary Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <User className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Community Bio & Presence</h2>
                  <p className="text-xs text-muted-foreground">Personal summary and public mutual aid profile</p>
                </div>
              </div>
              <button
                onClick={() => setEditProfileOpen(true)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Edit3 className="h-3.5 w-3.5 notranslate" />
                <span>Edit</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal bg-muted/30 p-4 rounded-2xl border border-border/60">
              "{editBio}"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-background border border-border flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary shrink-0 notranslate" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Member Since</span>
                  <strong className="text-foreground">October 2024</strong>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-background border border-border flex items-center gap-3">
                <Globe className="h-4 w-4 text-emerald-500 shrink-0 notranslate" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Languages Spoken</span>
                  <strong className="text-foreground">Bengali, Hindi, English</strong>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-background border border-border flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-teal-500 shrink-0 notranslate" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Verification Tier</span>
                  <strong className="text-foreground">
                    {userProfile.verificationState === 'verified' ? 'Tier-A Peer Authenticated' : 'Basic Member'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Contact Info Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Phone className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Verified Contact Information</h2>
                  <p className="text-xs text-muted-foreground">Encrypted channels for matched emergency responders</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Phone */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Phone className="h-4 w-4 notranslate" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Phone (Primary OTP)</span>
                    <strong className="text-foreground font-mono text-xs">
                      {userProfile.phone || '+91 98765 43210'}
                    </strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Verified
                </span>
              </div>

              {/* Email */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-4 w-4 notranslate" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Email Address</span>
                    <strong className="text-foreground font-mono text-xs truncate max-w-[160px] sm:max-w-none block">
                      {userProfile.email || 'volunteer@asansol.kindlink.org'}
                    </strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Verified
                </span>
              </div>

              {/* College / Institution */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                    <GraduationCap className="h-4 w-4 notranslate" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Academic College</span>
                    <strong className="text-foreground">
                      {userProfile.college || 'Asansol Engineering College (WB)'}
                    </strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  MAKAUT Affiliated
                </span>
              </div>

              {/* Neighborhood / Area */}
              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                    <MapPin className="h-4 w-4 notranslate" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Home Neighborhood</span>
                    <strong className="text-foreground">
                      {userProfile.homeNeighborhood || 'Kalyanpur, Asansol'}
                    </strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                  West Bengal
                </span>
              </div>
            </div>
          </div>

          {/* Section C: Emergency Contacts List with Quick Add/Remove */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600">
                  <AlertCircle className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Emergency SOS Contacts</h2>
                  <p className="text-xs text-muted-foreground">
                    Automatically notified via SMS & phone if you trigger an SOS distress call
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddContactOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-soft touch-target"
              >
                <Plus className="h-4 w-4 notranslate" />
                <span>Add Emergency Contact</span>
              </button>
            </div>

            {emergencyContacts.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                <div className="mx-auto w-36 h-28 relative">
                  <img
                    src="/illustrations/empty-contacts.svg"
                    alt="No emergency contacts"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">No Emergency Contacts Registered</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Add at least one family member or trusted local neighbor. They will receive automated SMS alerts with your live coordinates during emergencies.
                  </p>
                </div>
                <button
                  onClick={() => setAddContactOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-primary transition shadow-xs touch-target"
                >
                  <Plus className="h-4 w-4 notranslate" />
                  <span>Register Contact Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 rounded-2xl border border-border bg-background shadow-xs flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-foreground">{contact.name}</strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          {contact.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {contact.phone}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${contact.phone}`}
                        className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition touch-target"
                        title={`Call ${contact.name}`}
                        aria-label={`Call ${contact.name}`}
                      >
                        <Phone className="h-4 w-4 notranslate" />
                      </a>
                      <button
                        onClick={() => {
                          removeEmergencyContact(contact.id);
                          toast.success('Emergency contact removed');
                        }}
                        className="p-2 rounded-xl bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition touch-target"
                        title="Remove contact"
                        aria-label="Remove contact"
                      >
                        <Trash2 className="h-4 w-4 notranslate" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          4. TAB 2: ACTIVITY (Active Requests & Completed Help History)
         ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Sub-filter segmented control */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            {[
              { id: 'all' as const, label: `All Activity (${myHelpHistory.length + myActiveRequests.length})` },
              { id: 'history' as const, label: `Completed Helps (${myHelpHistory.length})` },
              { id: 'my-requests' as const, label: `My Requests (${myActiveRequests.length})` },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActivitySubTab(sub.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition touch-target ${
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 notranslate" />
                  <span>Completed Mutual Aid Acts</span>
                </h3>
                <span className="text-xs text-muted-foreground">
                  Verified with OTP and beneficiary signature
                </span>
              </div>

              {myHelpHistory.length === 0 ? (
                <div className="p-8 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                  <div className="mx-auto w-36 h-28 relative">
                    <img
                      src="/illustrations/empty-history.svg"
                      alt="No completed helps"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">No Completed Helps Yet</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Offer help to open requests on the map or home feed to start building your verified impact ledger!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {myHelpHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-border bg-card shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{item.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.categoryColor}`}>
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Assisted <strong className="text-foreground">{item.beneficiary}</strong> · {item.date} · {item.impact}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <div className="flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-xl text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 notranslate" />
                          <span>{item.rating.toFixed(1)} Trust</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="h-3.5 w-3.5 notranslate" />
                          <span>Verified</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Active Requests Posted */}
          {(activitySubTab === 'all' || activitySubTab === 'my-requests') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary notranslate" />
                  <span>My Posted Requests ({myActiveRequests.length})</span>
                </h3>
              </div>

              {myActiveRequests.length === 0 ? (
                <div className="p-8 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                  <div className="mx-auto w-36 h-28 relative">
                    <img
                      src="/illustrations/empty-requests.svg"
                      alt="No active requests"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">No Active Requests Posted</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      You haven't requested any assistance yet. Need emergency blood, medical equipment, or study books? Tap "New Request" anytime.
                    </p>
                  </div>
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
                            {req.urgency} urgency
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full uppercase self-start sm:self-auto">
                          Status: {req.status} ({req.helpersOffered || 0} offers)
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {req.locationName} · Posted {req.createdAt}
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
          5. TAB 3: BADGES (Earned Glowing & Locked Grayscale with Progress Bars)
         ========================================================================= */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                  <Award className="h-6 w-6 notranslate" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Verified Community Badges</h2>
                  <p className="text-xs text-muted-foreground">
                    Peer-reviewed trust credentials recognized across Asansol mutual aid networks
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-primary/10 text-primary font-extrabold text-xs self-start sm:self-auto">
                {earnedBadgesCount} of {masterBadges.length} Badges Unlocked
              </div>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterBadges.map((badge) => (
              <div
                key={badge.id}
                className={`relative rounded-3xl border p-5 shadow-soft transition-all ${
                  badge.earned
                    ? 'border-primary/30 bg-card hover:border-primary/60'
                    : 'border-border/60 bg-muted/20 opacity-80'
                }`}
              >
                {/* Glowing status tag */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      badge.earned
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {badge.earned ? 'Earned & Active' : 'Locked Badge'}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {badge.category}
                  </span>
                </div>

                {/* SVG Badge Illustration */}
                <div className="flex justify-center my-3">
                  <div
                    className={`h-24 w-24 relative transition-transform hover:scale-105 ${
                      !badge.earned ? 'filter grayscale contrast-75 opacity-70' : ''
                    }`}
                  >
                    <img
                      src={badge.icon}
                      alt={badge.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center space-y-1.5 mt-2">
                  <h4 className="text-sm font-bold text-foreground">{badge.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {badge.description}
                  </p>
                </div>

                {/* Progress / Status Bar */}
                <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-muted-foreground">{badge.progressLabel}</span>
                    <span className={badge.earned ? 'text-emerald-600' : 'text-primary'}>
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
          6. TAB 4: IMPACT (Community Impact Stats, Hours, Beneficiaries, CO2)
         ========================================================================= */}
      {activeTab === 'impact' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600">
                <TrendingUp className="h-6 w-6 notranslate" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Community Impact Analytics</h2>
                <p className="text-xs text-muted-foreground">
                  Empirical record of mutual aid delivered across Asansol city coordinates
                </p>
              </div>
            </div>
          </div>

          {/* 4 Primary High-Level Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Helps Provided */}
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <HeartHandshake className="h-5 w-5 notranslate" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  +25% this month
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                  {userProfile.helpsCount || 3}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Acts of Help Delivered
                </span>
              </div>
            </div>

            {/* Hours Volunteered */}
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
                  <Clock className="h-5 w-5 notranslate" />
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                  {hoursVolunteered}h
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Hours Volunteered
                </span>
              </div>
            </div>

            {/* People Supported */}
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600">
                  <Heart className="h-5 w-5 notranslate" />
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  Beneficiaries
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                  {peopleSupported}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Local Neighbors Supported
                </span>
              </div>
            </div>

            {/* Kilometers Traveled */}
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600">
                  <MapPin className="h-5 w-5 notranslate" />
                </div>
                <span className="text-[10px] font-bold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">
                  Kinematics
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground block">
                  {userProfile.kilometersTraveled ?? 42} km
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Transit Distance Covered
                </span>
              </div>
            </div>
          </div>

          {/* Categorical Breakdown & Environmental Efficiency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categorical Assistance Breakdown */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary notranslate" />
                <span>Assistance by Domain</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Droplet className="h-4 w-4 text-rose-500 notranslate" />
                    <span className="font-semibold text-foreground">Blood Donation Units</span>
                  </div>
                  <strong className="text-foreground font-mono">2 Units Emergency Blood</strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <HeartHandshake className="h-4 w-4 text-teal-500 notranslate" />
                    <span className="font-semibold text-foreground">Mobility & Wheelchair Aid</span>
                  </div>
                  <strong className="text-foreground font-mono">3 Items Loaned</strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-violet-500 notranslate" />
                    <span className="font-semibold text-foreground">Semester Study Textbooks</span>
                  </div>
                  <strong className="text-foreground font-mono">6 Textbooks Shared</strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-amber-500 notranslate" />
                    <span className="font-semibold text-foreground">Senior Citizen Companionship</span>
                  </div>
                  <strong className="text-foreground font-mono">4 Home Sessions</strong>
                </div>
              </div>
            </div>

            {/* Hyperlocal Efficiency & Carbon Offset */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500 notranslate" />
                  <span>Hyperlocal Aid & Green Footprint</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  By matching volunteers located within 2.5 km of distress points, KindLink minimizes motorized traffic and maximizes emergency response velocity.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Estimated Carbon Footprint Offset
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    ~14.2 kg CO₂e
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
                  Saved by routing critical assistance on bicycle and foot compared to commercial motorized dispatch.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Average Response Velocity:</span>
                <strong className="text-primary font-bold">11.4 Minutes in Asansol City</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. TAB 5: VERIFICATION (Step-by-Step Stepper & Document Upload Modal)
         ========================================================================= */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <FileCheck className="h-6 w-6 notranslate" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Volunteer Trust & Verification Stepper</h2>
                  <p className="text-xs text-muted-foreground">
                    Three-tier verification protocol required to respond to urgent blood and medical tasks
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  userProfile.verificationState === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}
              >
                <ShieldCheck className="h-4 w-4 notranslate" />
                <span>Current Status: {userProfile.verificationState}</span>
              </span>
            </div>
          </div>

          {/* Stepper Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Phone Verification */}
            <div className="p-5 rounded-3xl bg-card border border-border shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <Phone className="h-4 w-4 text-primary notranslate" />
                    <span>Step 1: Phone Verified</span>
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 notranslate" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {userProfile.phone
                    ? `Verified via OTP with ${userProfile.phone}. SMS alerts enabled.`
                    : 'Add and verify your mobile number for emergency notifications.'}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600">OTP Active</span>
                <button
                  onClick={() => setIdModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Update Phone →
                </button>
              </div>
            </div>

            {/* Step 2: ID Uploaded */}
            <div className="p-5 rounded-3xl bg-card border border-border shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <Upload className="h-4 w-4 text-teal-500 notranslate" />
                    <span>Step 2: ID Uploaded</span>
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
                    ? `${userProfile.idDocumentName} uploaded securely to encrypted storage.`
                    : 'Upload a student ID or Government photo card for identity verification.'}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px]">
                  {userProfile.idDocumentName || 'No document'}
                </span>
                <button
                  onClick={() => setIdModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {userProfile.idDocumentName ? 'Replace ID →' : 'Upload ID →'}
                </button>
              </div>
            </div>

            {/* Step 3: Admin Review & Community Peer Trust */}
            <div className="p-5 rounded-3xl bg-card border border-border shadow-soft space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-extrabold text-foreground">
                    <Award className="h-4 w-4 text-indigo-500 notranslate" />
                    <span>Step 3: Admin Review</span>
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
                    ? 'Verified Volunteer badge unlocked. You can accept high-urgency blood and transit tasks.'
                    : 'Admin review takes less than 4 hours. Peer endorsements speed up trust activation.'}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    userProfile.verificationState === 'verified'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {userProfile.verificationState === 'verified' ? 'Badge Unlocked' : 'Under Review'}
                </span>
                <button
                  onClick={() => setIdModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Check Status →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. TAB 6: SETTINGS (Theme, Language, Notifications, Privacy, PWA, Password, Sign Out)
         ========================================================================= */}
      {activeTab === 'settings' && (
        <ProfileSettingsSection
          smsAlerts={smsAlerts}
          setSmsAlerts={setSmsAlerts}
          pushAlerts={pushAlerts}
          setPushAlerts={setPushAlerts}
          soundAlerts={soundAlerts}
          setSoundAlerts={setSoundAlerts}
          maskPhone={maskPhone}
          setMaskPhone={setMaskPhone}
          transitGpsPrivacy={transitGpsPrivacy}
          setTransitGpsPrivacy={setTransitGpsPrivacy}
          onOpenLanguageModal={() => setLangModalOpen(true)}
          onInstallPwa={handleInstallPwa}
          isPwaInstalled={isPwaInstalled}
        />
      )}

      {/* =========================================================================
          MODALS & OVERLAYS
         ========================================================================= */}

      {/* MODAL 1: ID UPLOAD & VERIFICATION */}
      {idModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
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
              To respond to urgent medical and blood requests, please provide your contact number and student or citizen ID. Documents are stored encrypted in private storage.
            </p>

            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Verified Phone Number (10 digits)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Document Type Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Document Type
              </label>
              <select
                value={docTypeInput}
                onChange={(e) => setDocTypeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Student ID Card">College / University Student ID (AEC / MAKAUT)</option>
                <option value="Government Photo ID">Government Photo ID (Aadhaar / Voter ID)</option>
                <option value="Driving License">Driving License</option>
                <option value="Healthcare Certificate">Healthcare / First Responder Certificate</option>
              </select>
            </div>

            {/* File Picker */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Attach Document File (PDF, JPG, PNG - Max 5 MB)
              </label>
              <label className="p-5 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-xs text-muted-foreground flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/60 transition">
                <Upload className="h-6 w-6 text-primary notranslate" />
                <span className="font-semibold text-foreground text-center">
                  {selectedFile ? selectedFile.name : 'Click to select document'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Encrypted AES-256 Storage'}
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

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIdModalOpen(false)}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadId}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
              >
                {uploading ? 'Submitting...' : 'Submit Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EMERGENCY CONTACT */}
      {addContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleAddEmergencyContact}
            className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                  <AlertCircle className="h-5 w-5 notranslate" />
                </div>
                <h3 className="text-base font-bold text-foreground">Add Emergency Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddContactOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Contact Full Name
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Relationship
              </label>
              <select
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAddContactOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-soft transition"
              >
                Save Contact
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: EDIT PROFILE */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSaveProfileEdits}
            className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Edit3 className="h-5 w-5 notranslate" />
                </div>
                <h3 className="text-base font-bold text-foreground">Edit Profile Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Username (@handle)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                  @
                </span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Academic College / Institution
              </label>
              <input
                type="text"
                value={editCollege}
                onChange={(e) => setEditCollege(e.target.value)}
                placeholder="Asansol Engineering College"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Home Neighborhood
              </label>
              <input
                type="text"
                value={editNeighborhood}
                onChange={(e) => setEditNeighborhood(e.target.value)}
                placeholder="Kalyanpur, Asansol"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Community Bio
              </label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-soft transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: PWA INSTALL GUIDANCE */}
      {pwaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600">
                  <Download className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Install KindLink PWA</h3>
                  <p className="text-xs text-muted-foreground">Instant home screen access</p>
                </div>
              </div>
              <button
                onClick={() => setPwaModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              KindLink works offline and installs directly without going to app stores:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-background border border-border space-y-1">
                <strong className="text-foreground block">📱 On Chrome / Android:</strong>
                <p className="text-muted-foreground text-[11px]">
                  Tap browser menu (⋮) → Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-background border border-border space-y-1">
                <strong className="text-foreground block">🍏 On Safari / iOS:</strong>
                <p className="text-muted-foreground text-[11px]">
                  Tap Share (📤) → Select <strong>"Add to Home Screen"</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setPwaModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* LANGUAGE MODAL */}
      <LanguageModal open={langModalOpen} onClose={() => setLangModalOpen(false)} />
    </div>
  );
}

{/* =========================================================================
    SUB-COMPONENT: PROFILE SETTINGS SECTION
   ========================================================================= */}
interface ProfileSettingsProps {
  smsAlerts: boolean;
  setSmsAlerts: (v: boolean) => void;
  pushAlerts: boolean;
  setPushAlerts: (v: boolean) => void;
  soundAlerts: boolean;
  setSoundAlerts: (v: boolean) => void;
  maskPhone: boolean;
  setMaskPhone: (v: boolean) => void;
  transitGpsPrivacy: boolean;
  setTransitGpsPrivacy: (v: boolean) => void;
  onOpenLanguageModal: () => void;
  onInstallPwa: () => void;
  isPwaInstalled: boolean;
}

function ProfileSettingsSection({
  smsAlerts,
  setSmsAlerts,
  pushAlerts,
  setPushAlerts,
  soundAlerts,
  setSoundAlerts,
  maskPhone,
  setMaskPhone,
  transitGpsPrivacy,
  setTransitGpsPrivacy,
  onOpenLanguageModal,
  onInstallPwa,
  isPwaInstalled,
}: ProfileSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [textSize, setTextSize] = useState<'normal' | 'compact' | 'large'>('normal');

  const currentLangCode = getCurrentLanguageCode();
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode);

  const handleTextSizeChange = (size: 'normal' | 'compact' | 'large') => {
    setTextSize(size);
    if (typeof document !== 'undefined') {
      if (size === 'compact') {
        document.documentElement.style.fontSize = '14px';
      } else if (size === 'large') {
        document.documentElement.style.fontSize = '18px';
      } else {
        document.documentElement.style.fontSize = '16px';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Appearance & Theme Controls */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
            <Sun className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Appearance Theme</h3>
            <p className="text-xs text-muted-foreground">Switch between light, dark, or system follow</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = theme === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setTheme(m.id)}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 touch-target ${
                  isSelected
                    ? 'border-primary bg-primary text-white shadow-soft'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4 notranslate" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Text Size Accessibility */}
        <div className="pt-3 border-t border-border/60 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground block">
            Text Size & Readability
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact' as const, label: 'Compact' },
              { id: 'normal' as const, label: 'Standard' },
              { id: 'large' as const, label: 'Elderly Mode (Large)' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => handleTextSizeChange(s.id)}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition touch-target ${
                  textSize === s.id
                    ? 'border-primary bg-primary text-white shadow-soft'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Language Selector */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <Globe className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Language / भाषा / ভাষা</h3>
            <p className="text-xs text-muted-foreground">
              Current: <strong className="text-foreground">{currentLang?.nativeName || 'English'}</strong> ({currentLang?.name || 'English'})
            </p>
          </div>
        </div>
        <button
          onClick={onOpenLanguageModal}
          className="px-4 py-2 rounded-xl bg-background border border-border text-xs font-bold text-primary hover:bg-muted transition touch-target"
        >
          Change Language
        </button>
      </div>

      {/* 3. Notifications Controls */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
            <Bell className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Notification Preferences</h3>
            <p className="text-xs text-muted-foreground">Control how you receive urgent community alerts</p>
          </div>
        </div>

        <div className="space-y-3 pt-1 text-xs">
          {/* SMS Alerts */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
            <div>
              <strong className="text-foreground block">Emergency SMS Dispatches</strong>
              <span className="text-muted-foreground text-[11px]">
                Receive instant SMS OTPs and critical alerts even when offline
              </span>
            </div>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={(e) => {
                setSmsAlerts(e.target.checked);
                toast.success(`SMS alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
              }}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
          </div>

          {/* Browser Push */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
            <div>
              <strong className="text-foreground block">Browser Push Notifications</strong>
              <span className="text-muted-foreground text-[11px]">
                Pop-up notifications when urgent requests appear within your radius
              </span>
            </div>
            <input
              type="checkbox"
              checked={pushAlerts}
              onChange={async (e) => {
                const checked = e.target.checked;
                if (checked && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                  const perm = await Notification.requestPermission();
                  if (perm !== 'granted') {
                    toast.error('Browser push permission was denied');
                    return;
                  }
                }
                setPushAlerts(checked);
                toast.success(`Push notifications ${checked ? 'enabled' : 'disabled'}`);
              }}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
          </div>

          {/* Critical Sound Alarm */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
            <div>
              <strong className="text-foreground block">Critical Audio Siren for Blood & SOS</strong>
              <span className="text-muted-foreground text-[11px]">
                Plays resonant auditory beacon when critical blood requests match
              </span>
            </div>
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => {
                setSoundAlerts(e.target.checked);
                toast.success(`Audio alert sirens ${e.target.checked ? 'enabled' : 'muted'}`);
              }}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4. Privacy Controls */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Lock className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Privacy & Shield Controls</h3>
            <p className="text-xs text-muted-foreground">Manage your contact disclosure and transit telemetry</p>
          </div>
        </div>

        <div className="space-y-3 pt-1 text-xs">
          {/* Mask Phone */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
            <div>
              <strong className="text-foreground block">Mask Phone Number Until Match Confirmed</strong>
              <span className="text-muted-foreground text-[11px]">
                Keeps your direct phone number private until you mutually accept an aid request
              </span>
            </div>
            <input
              type="checkbox"
              checked={maskPhone}
              onChange={(e) => {
                setMaskPhone(e.target.checked);
                toast.success(`Phone masking ${e.target.checked ? 'activated' : 'deactivated'}`);
              }}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
          </div>

          {/* GPS Transit Telemetry */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
            <div>
              <strong className="text-foreground block">Real-time GPS Transit Sharing</strong>
              <span className="text-muted-foreground text-[11px]">
                Broadcast live kinematic transit coordinates only while en route to a beneficiary
              </span>
            </div>
            <input
              type="checkbox"
              checked={transitGpsPrivacy}
              onChange={(e) => {
                setTransitGpsPrivacy(e.target.checked);
                toast.success(`Transit GPS sharing ${e.target.checked ? 'enabled' : 'restricted'}`);
              }}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 5. Install PWA Button */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600">
            <Smartphone className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Install KindLink Web App</h3>
            <p className="text-xs text-muted-foreground">
              {isPwaInstalled
                ? 'App is currently installed and active on this device'
                : 'Access offline mode, full-screen UI, and faster emergency loading'}
            </p>
          </div>
        </div>
        <button
          onClick={onInstallPwa}
          disabled={isPwaInstalled}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-soft transition disabled:opacity-50 touch-target"
        >
          <Download className="h-4 w-4 notranslate" />
          <span>{isPwaInstalled ? 'Installed' : 'Install PWA'}</span>
        </button>
      </div>

      {/* 6. Change Password Form */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
            <ShieldCheck className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Security & Password</h3>
            <p className="text-xs text-muted-foreground">Update your account credentials safely</p>
          </div>
        </div>

        <ChangePasswordForm />
      </div>

      {/* 7. Sign Out Button & Session Control */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Session Control</h3>
          <p className="text-xs text-muted-foreground">Sign out of your active KindLink session</p>
        </div>
        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch {
              window.location.href = '/login';
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition touch-target"
        >
          <LogOut className="h-4 w-4 notranslate" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

{/* =========================================================================
    SUB-COMPONENT: CHANGE PASSWORD FORM
   ========================================================================= */}
function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
          signOutOthers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update password.');
        setLoading(false);
        return;
      }

      setSuccess('Password updated successfully! Next time you sign in, use your new password.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      {/* Old Password */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Current Password</label>
        <div className="relative">
          <input
            type={showOld ? 'text' : 'password'}
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowOld(!showOld)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            aria-label={showOld ? 'Hide password' : 'Show password'}
          >
            {showOld ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">New Password (min 8 chars)</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            aria-label={showNew ? 'Hide password' : 'Show password'}
          >
            {showNew ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>
      </div>

      {/* Confirm New Password */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>
      </div>

      {/* Sign out of other devices checkbox */}
      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={signOutOthers}
          onChange={(e) => setSignOutOthers(e.target.checked)}
          className="rounded border-border text-primary focus:ring-primary/20"
        />
        <span className="text-xs text-muted-foreground">Sign out of other devices</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition disabled:opacity-50 touch-target"
      >
        {loading ? 'Updating Password...' : 'Update Password'}
      </button>
    </form>
  );
}
