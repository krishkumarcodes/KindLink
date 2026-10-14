'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/shell/Header';
import { Sidebar } from '@/components/shell/Sidebar';
import { BottomTabBar } from '@/components/shell/BottomTabBar';
import { HomeView } from '@/components/home/HomeView';
import { RequestsView } from '@/components/requests/RequestsView';
import { MapView } from '@/components/map/MapView';
import { NewRequestWizard } from '@/components/wizard/NewRequestWizard';
import { ProfileView } from '@/components/profile/ProfileView';
import { SettingsView } from '@/components/settings/SettingsView';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { initializeRealtime } from '@/lib/supabase/realtime';

export default function KindLinkApp() {
  const router = useRouter();
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

  const loadAppData = useCallback(async () => {
    await Promise.allSettled([
      fetchLiveProfile(),
      fetchLiveRequests(),
      fetchLiveStats(),
      fetchLiveNotifications(),
    ]);
  }, [fetchLiveProfile, fetchLiveRequests, fetchLiveStats, fetchLiveNotifications]);

  // 1 & 2. Check auth session on mount; if no session, redirect to /login
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error || !session?.user) {
          setIsAuthenticated(false);
          setAuthChecking(false);
          router.push('/login?redirect=/app');
          return;
        }

        // 3. If session exists, load user profile and show main app
        setIsAuthenticated(true);
        await loadAppData();
      } catch (err) {
        console.warn('Session verification exception:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          router.push('/login?redirect=/app');
        }
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    }

    checkAuthSession();

    // Listen to realtime auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setIsAuthenticated(true);
        setAuthChecking(false);
        await loadAppData();
      } else {
        setIsAuthenticated(false);
        setAuthChecking(false);
        router.push('/login?redirect=/app');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, router, loadAppData]);

  // Bind realtime subscriptions when session is confirmed
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
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/10">
            <Heart className="w-7 h-7 fill-teal-500 text-teal-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
            <span>Verifying secure session...</span>
          </div>
          <p className="text-xs text-slate-500">KindLink Asansol Mutual Aid Network</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: redirected to /login, showing fallback transition
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-center items-center px-4 py-8">
        <div className="text-center max-w-sm">
          <Loader2 className="h-6 w-6 animate-spin text-teal-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Redirecting to login...</p>
        </div>
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
