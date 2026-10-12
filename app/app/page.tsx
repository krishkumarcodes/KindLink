'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { Header } from '@/components/shell/Header';
import { Sidebar } from '@/components/shell/Sidebar';
import { BottomTabBar } from '@/components/shell/BottomTabBar';
import { HomeView } from '@/components/home/HomeView';
import { RequestsView } from '@/components/requests/RequestsView';
import { MapView } from '@/components/map/MapView';
import { NewRequestWizard } from '@/components/wizard/NewRequestWizard';
import { PhysicsLabView } from '@/components/physics/PhysicsLabView';
import { ProfileView } from '@/components/profile/ProfileView';
import { SettingsView } from '@/components/settings/SettingsView';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';

import { initializeRealtime } from '@/lib/supabase/realtime';

export default function KindLinkApp() {
  const {
    currentView,
    addNotification,
    hasSimulatedUrgentAlert,
    fetchLiveRequests,
    fetchLiveProfile,
    fetchLiveNotifications,
  } = useKindLinkStore();

  // Load real backend data and bind realtime subscriptions on mount
  useEffect(() => {
    fetchLiveRequests();
    fetchLiveProfile();
    fetchLiveNotifications();
    const cleanupRealtime = initializeRealtime();

    return () => {
      cleanupRealtime?.();
    };
  }, [fetchLiveRequests, fetchLiveProfile, fetchLiveNotifications]);

  useEffect(() => {
    if (hasSimulatedUrgentAlert) return;

    const timer = setTimeout(() => {
      const incomingNotif = {
        id: `notif-realtime-${Date.now()}`,
        title: '🔴 Critical O- Blood Alert (1.1 km)',
        message: 'Accident emergency at Asansol Sub-Divisional Hospital. Urgent O-negative donor required immediately.',
        timeAgo: 'Just now',
        timestamp: Date.now(),
        unread: true,
        urgency: 'critical' as const,
        requestId: 'req-1',
      };

      addNotification(incomingNotif);
      useKindLinkStore.setState({ hasSimulatedUrgentAlert: true });

      toast.error('URGENT AID ALERT NEAR YOU!', {
        description: 'Critical O- Negative Blood needed at Asansol Hospital (1.1 km away). Help Gravity: 4.12.',
        duration: 8000,
        action: {
          label: 'View',
          onClick: () => {
            useKindLinkStore.getState().setCurrentView('requests');
          },
        },
      });
    }, 20000);

    return () => clearTimeout(timer);
  }, [addNotification, hasSimulatedUrgentAlert]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top App Bar */}
      <Header />

      {/* Main Container Layout */}
      <div className="flex-1 flex max-w-[1920px] w-full mx-auto">
        {/* Left Sidebar on tablet, laptop, desktop */}
        <Sidebar />

        {/* Dynamic Center Stage Views */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {currentView === 'home' && <HomeView />}
          {currentView === 'requests' && <RequestsView />}
          {currentView === 'map' && <MapView />}
          {currentView === 'new' && <NewRequestWizard />}
          {currentView === 'physics' && <PhysicsLabView />}
          {currentView === 'profile' && <ProfileView />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />

      {/* First Visit Onboarding Modal */}
      <WelcomeModal />
    </div>
  );
}
