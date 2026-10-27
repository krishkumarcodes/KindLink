'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Heart, Loader2 } from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/shell/Header';
import { Sidebar } from '@/components/shell/Sidebar';
import { BottomTabBar } from '@/components/shell/BottomTabBar';
import { HomeView } from '@/components/home/HomeView';
import { RequestsView } from '@/components/requests/RequestsView';
import { AutoLanguageNotice } from '@/components/locale/AutoLanguageNotice';
import { initializeRealtime } from '@/lib/supabase/realtime';

// Dynamically split heavy non-initial views & modals
const MapView = dynamic(
  () => import('@/components/map/MapView').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100dvh-var(--header-height))] w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-teal-500/20 border-t-teal-600" />
        <p className="mt-3 text-sm font-semibold text-foreground">Loading Aid Map...</p>
      </div>
    ),
  }
);

const NewRequestWizard = dynamic(
  () => import('@/components/wizard/NewRequestWizard').then((mod) => mod.NewRequestWizard),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Preparing New Request Form...</p>
      </div>
    ),
  }
);

const ProfileView = dynamic(
  () => import('@/components/profile/ProfileView').then((mod) => mod.ProfileView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Loading Profile...</p>
      </div>
    ),
  }
);

const SettingsView = dynamic(
  () => import('@/components/settings/SettingsView').then((mod) => mod.SettingsView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Loading Settings...</p>
      </div>
    ),
  }
);

const WelcomeModal = dynamic(
  () => import('@/components/onboarding/WelcomeModal').then((mod) => mod.WelcomeModal),
  { ssr: false }
);

const CommandPalette = dynamic(
  () => import('@/components/shell/CommandPalette').then((mod) => mod.CommandPalette),
  { ssr: false }
);

export default function KindLinkApp() {
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);
  const {
    currentView,
    fetchLiveRequests,
    fetchLiveStats,
    fetchLiveProfile,
    fetchLiveNotifications,
    setCurrentView,
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

  // Handle map deep link parameters (?request=..., ?route=..., ?lat=..., ?lng=..., ?view=map)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.has('request') ||
        params.has('route') ||
        params.has('lat') ||
        params.has('lng') ||
        params.get('view') === 'map'
      ) {
        setCurrentView('map');
      }
    }
  }, [setCurrentView]);

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

  // Sync initial view from URL query params (e.g. /app?view=map)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get('view');
      if (v === 'map' || v === 'requests' || v === 'new' || v === 'profile' || v === 'settings' || v === 'home') {
        setCurrentView(v);
      }
    }
  }, [setCurrentView]);

  // Set manual scroll restoration on mount while preserving browser back/forward if history state has a position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }

      const handlePopState = (event: PopStateEvent) => {
        if (event.state && typeof event.state.scrollY === 'number') {
          window.scrollTo(0, event.state.scrollY);
          if (mainRef.current && typeof event.state.mainScrollTop === 'number') {
            mainRef.current.scrollTop = event.state.mainScrollTop;
          }
        }
      };

      window.addEventListener('popstate', handlePopState);

      const state = window.history.state;
      if (state && typeof state.scrollY === 'number') {
        window.scrollTo(0, state.scrollY);
        if (mainRef.current && typeof state.mainScrollTop === 'number') {
          mainRef.current.scrollTop = state.mainScrollTop;
        }
      } else {
        window.scrollTo(0, 0);
        if (mainRef.current) {
          mainRef.current.scrollTop = 0;
        }
      }

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

  // When switching currentView (e.g. from home to profile, or between views), ensure window.scrollTo(0, 0) and reset main scroll position to 0
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentView]);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      {/* Top App Bar */}
      <Header />

      {/* Main Container Layout */}
      <div className="flex-1 flex max-w-[1920px] w-full mx-auto min-w-0 overflow-x-hidden">
        {/* Left Sidebar on tablet, laptop, desktop */}
        <Sidebar />

        {/* Dynamic Center Stage Views */}
        <main
          ref={mainRef}
          className={`flex-1 flex flex-col min-w-0 overflow-x-hidden ${
            currentView === 'map' ? 'overflow-hidden overscroll-none' : 'overflow-y-auto'
          }`}
        >
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

      {/* First-Time Auto-Language Notice Banner */}
      <AutoLanguageNotice />

      {/* Global Command Palette & Quick Action Navigator */}
      <CommandPalette />
    </div>
  );
}
