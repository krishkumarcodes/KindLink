'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { createClient } from '@/lib/supabase/client';
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
import { InlineAuthCard } from '@/components/auth/InlineAuthCard';
import { initializeRealtime } from '@/lib/supabase/realtime';

export default function KindLinkApp() {
  const {
    currentView,
    fetchLiveRequests,
    fetchLiveStats,
    fetchLiveProfile,
    fetchLiveNotifications,
  } = useKindLinkStore();

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = createClient();

  const handleAuthSuccess = useCallback(async () => {
    setIsAuthenticated(true);
    await fetchLiveProfile();
    await fetchLiveRequests();
    await fetchLiveStats();
    await fetchLiveNotifications();
  }, [fetchLiveProfile, fetchLiveRequests, fetchLiveStats, fetchLiveNotifications]);

  // Check Supabase authentication session on mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          setIsAuthenticated(true);
          await fetchLiveProfile();
          await fetchLiveRequests();
          await fetchLiveStats();
          await fetchLiveNotifications();
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Auth check error:', err);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setAuthChecking(false);
      }
    }

    checkAuthSession();

    // Listen to Supabase Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setIsAuthenticated(true);
        await fetchLiveProfile();
        await fetchLiveRequests();
        await fetchLiveStats();
        await fetchLiveNotifications();
      } else {
        setIsAuthenticated(false);
      }
      setAuthChecking(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, fetchLiveProfile, fetchLiveRequests, fetchLiveStats, fetchLiveNotifications]);

  // Bind realtime subscriptions when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanupRealtime = initializeRealtime();

    return () => {
      cleanupRealtime?.();
    };
  }, [isAuthenticated]);

  // 1. Loading state while checking authentication
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Connecting to KindLink...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render inline Login / Signup (NOT redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-8">
        <InlineAuthCard onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // 3. Authenticated: Render the main application shell
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
