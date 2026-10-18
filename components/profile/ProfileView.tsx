'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { BadgesTab } from './tabs/BadgesTab';
import { BadgeMedalIcon } from './BadgeMedalIcon';
import { calculateBadgesForUser } from '@/lib/data/badges';
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
import { EmergencyContactModal } from './EmergencyContactModal';
import { PhoneInput } from './PhoneInput';
import { SettingsView } from '@/components/settings/SettingsView';
import { VerificationTab } from './tabs/VerificationTab';
import { ActivityTab, ActivityItem } from './tabs/ActivityTab';
import { ImpactTab, ImpactStats } from './tabs/ImpactTab';
import { ReviewsModal } from './ReviewsModal';
import { ProfileHeader } from './ProfileHeader';
import { ProfileTabs, ProfileTab } from './ProfileTabs';
import { OverviewTab } from './tabs/OverviewTab';

export function ProfileView() {
  const {
    userProfile,
    updateVerificationState,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
    requests,
    setCurrentView,
    profileActiveTab,
    setProfileActiveTab,
  } = useKindLinkStore();

  const [activeTab, setActiveTab] = useState<ProfileTab>(profileActiveTab || 'overview');

  useEffect(() => {
    if (profileActiveTab) {
      setActiveTab(profileActiveTab);
      setProfileActiveTab(undefined as any);
    }
  }, [profileActiveTab, setProfileActiveTab]);

  // Modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  // Guard scroll position across opening and closing modals & sheets (NEVER alter scrollY)
  const savedScrollYRef = useRef<number>(0);
  const anyModalOpen = editProfileOpen || contactModalOpen || reviewsModalOpen;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (anyModalOpen) {
      savedScrollYRef.current = window.scrollY;
    } else {
      const saved = savedScrollYRef.current;
      if (typeof window.scrollY === 'number' && window.scrollY !== saved) {
        window.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [anyModalOpen]);

  // Tab switching: Do NOT jump or scroll if near top; gently bring tab into view only if scrolled past
  const handleTabChange = useCallback((newTab: ProfileTab) => {
    setActiveTab(newTab);

    if (typeof window === 'undefined') return;

    const tabStrip = document.getElementById('profile-tabs-strip');
    const headerOffset = window.innerWidth >= 1024 ? 72 : 64;

    const mainEl = document.querySelector('main');
    if (mainEl && mainEl.scrollTop > 0) {
      if (tabStrip) {
        const rect = tabStrip.getBoundingClientRect();
        const mainRect = mainEl.getBoundingClientRect();
        const relativeTop = rect.top - mainRect.top;
        if (relativeTop < headerOffset - 4) {
          mainEl.scrollTo({
            top: Math.max(0, mainEl.scrollTop + relativeTop - headerOffset),
            behavior: 'smooth',
          });
        }
      }
      return;
    }

    if (tabStrip) {
      const rect = tabStrip.getBoundingClientRect();
      if (rect.top < headerOffset - 4) {
        const currentScrollY = window.scrollY;
        const targetScrollY = currentScrollY + rect.top - headerOffset;
        window.scrollTo({
          top: Math.max(0, targetScrollY),
          behavior: 'smooth',
        });
      }
    }
  }, []);

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

  // Summary stats with 100% agreement guarantee
  const [summaryStats, setSummaryStats] = useState<ImpactStats & {
    helpsGiven: number;
    requestsMade: number;
    openRequests: number;
    totalOffers: number;
    trustScore: number | null;
    ratingsCount: number;
    requesterRating: number | null;
  }>({
    helpsGiven: userProfile.helpsCount || myCompletedHelps.length,
    requestsMade: userProfile.requestsCount || myActiveRequests.length,
    openRequests: myActiveRequests.filter((r) => r.status === 'open').length,
    totalOffers: 0,
    hoursActive: userProfile.hoursVolunteered ?? Math.max(0, myCompletedHelps.length * 1.5),
    neighboursSupported: myCompletedHelps.length,
    distanceCovered: userProfile.kilometersTraveled ?? Math.round(myCompletedHelps.length * 2.4 * 10) / 10,
    trustScore: userProfile.rating ?? 5.0,
    ratingsCount: userProfile.ratingCount || 0,
    requesterRating: null,
    currentStreak: 0,
    bestStreak: 0,
    categoryBreakdown: {
      blood: myCompletedHelps.filter((r) => r.category === 'blood').length,
      equipment: myCompletedHelps.filter((r) => r.category === 'equipment').length,
      elderly: myCompletedHelps.filter((r) => r.category === 'elderly' || (r.category as any) === 'elderly_help').length,
      books: myCompletedHelps.filter((r) => r.category === 'books').length,
      transport: myCompletedHelps.filter((r) => r.category === 'transport').length,
    },
    monthlyActivity: [],
  });

  const [activityLists, setActivityLists] = useState<{
    completedHelps: ActivityItem[];
    myRequests: ActivityItem[];
    myOffers: ActivityItem[];
  }>(() => {
    const fallbackHelps: ActivityItem[] = myCompletedHelps.map((h) => ({
      id: h.id,
      type: 'help',
      requestId: h.id,
      category: h.category,
      title: h.title,
      status: h.status,
      date: h.createdAt,
      distanceKm: h.distanceKm || 1.8,
      otherPerson: {
        name: h.contactName || 'Community Member',
        role: 'Requester',
        rating: 5.0,
        isVerified: h.verified,
      },
    }));

    const fallbackRequests: ActivityItem[] = myActiveRequests.map((r) => ({
      id: r.id,
      type: 'request',
      requestId: r.id,
      category: r.category,
      title: r.title,
      status: r.status,
      date: r.createdAt,
      distanceKm: r.distanceKm || 0.5,
      otherPerson: r.acceptedHelperName
        ? {
            name: r.acceptedHelperName,
            role: 'Helper',
            rating: r.acceptedHelperRating,
            isVerified: true,
          }
        : undefined,
    }));

    return {
      completedHelps: fallbackHelps,
      myRequests: fallbackRequests,
      myOffers: [],
    };
  });

  const fetchSummary = async () => {
    try {
      const url = userProfile.id ? `/api/profile/summary?userId=${userProfile.id}` : '/api/profile/summary';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setSummaryStats(data.stats);
          if (data.activity) {
            setActivityLists(data.activity);
          }
        }
      }
    } catch {
      // Keep existing state
    }
  };

  React.useEffect(() => {
    fetchSummary();
  }, [userProfile.id]);

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
  const ratingCount = summaryStats.ratingsCount || userProfile.ratingCount || 0;
  const hasEnoughRatings = ratingCount >= 5;
  const trustScoreDisplay = hasEnoughRatings
    ? ((summaryStats.trustScore ?? userProfile.rating ?? 5.0)).toFixed(1)
    : '—';

  const totalActivityCount = summaryStats.helpsGiven + summaryStats.requestsMade + summaryStats.totalOffers;

  // Badges evaluated against real user profile and activity
  const allUserBadges = useMemo(() => calculateBadgesForUser(userProfile), [userProfile]);
  const earnedBadgesCount = allUserBadges.filter((b) => b.earned).length;
  const pinnedBadgesList = allUserBadges.filter((b) => b.isPinned);


  return (
    <div className="flex-1 space-y-6 p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full pb-36 lg:pb-16 text-foreground overflow-x-hidden">
      {/* =========================================================================
          1. PROFILE HEADER CARD
         ========================================================================= */}
      <ProfileHeader
        onEditProfile={() => setEditProfileOpen(true)}
        onSelectTab={(tab) => handleTabChange(tab)}
      />

      {/* =========================================================================
          2. TAB NAVIGATION BAR
         ========================================================================= */}
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        activityCount={totalActivityCount}
        badgesCount={earnedBadgesCount}
        hasVerificationAlert={userProfile.verificationState !== 'verified'}
      />

      {/* =========================================================================
          3. TAB 1: OVERVIEW
         ========================================================================= */}
      {activeTab === 'overview' && (
        <OverviewTab
          onEditProfile={() => setEditProfileOpen(true)}
          onSelectTab={(tab) => handleTabChange(tab)}
        />
      )}

      {/* =========================================================================
          4. TAB 2: ACTIVITY (Completed helps, my requests, my offers)
         ========================================================================= */}
      {activeTab === 'activity' && (
        <ActivityTab
          completedHelps={activityLists.completedHelps}
          myRequests={activityLists.myRequests}
          myOffers={activityLists.myOffers}
          onRefresh={fetchSummary}
        />
      )}

      {/* =========================================================================
          5. TAB 3: BADGES (Modern badges grid, level ladder, detail sheet)
         ========================================================================= */}
      {activeTab === 'badges' && (
        <BadgesTab userProfile={userProfile} />
      )}

      {/* =========================================================================
          6. TAB 4: IMPACT (Verified community impact, totals, breakdown, streak)
         ========================================================================= */}
      {activeTab === 'impact' && (
        <ImpactTab
          stats={summaryStats}
          userName={displayName}
          userHandle={displayUsername}
        />
      )}

      {/* =========================================================================
          7. TAB 5: VERIFICATION (3-tier protocol & ID document upload)
         ========================================================================= */}
      {activeTab === 'verification' && <VerificationTab />}


      {/* =========================================================================
          8. TAB 6: SETTINGS (Renders complete SettingsView component)
         ========================================================================= */}
      {activeTab === 'settings' && <SettingsView />}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />



      {/* EMERGENCY CONTACT ADD / EDIT MODAL */}
      <EmergencyContactModal
        open={contactModalOpen}
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

      {/* REVIEWS & TRUST SCORE MODAL */}
      <ReviewsModal
        open={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        userId={userProfile.id}
        trustScoreDisplay={trustScoreDisplay}
        ratingCount={summaryStats.ratingsCount}
      />
    </div>
  );
}

