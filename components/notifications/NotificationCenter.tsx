'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/components/ui/OverlayPortal';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
  HeartHandshake,
  UserCheck,
  Sparkles,
  Siren,
  Settings,
  Star,
  ShieldCheck,
  Award,
  Navigation,
  ChevronRight,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { NotificationItem } from '@/lib/data/types';
import { BadgeMedalIcon } from '@/components/profile/BadgeMedalIcon';
import { NotificationSettingsSheet } from './NotificationSettingsSheet';

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  anchor?: 'bell' | 'dialog';
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export type NotificationCategory = 'requests' | 'offers' | 'updates' | 'emergency';
export type FilterType = 'all' | NotificationCategory;
export type NotificationDateGroup = 'today' | 'yesterday' | 'earlier';

export type ItemVisualType =
  | 'sos'
  | 'request'
  | 'offer'
  | 'accepted'
  | 'on_the_way'
  | 'completed'
  | 'rating'
  | 'verification'
  | 'badge'
  | 'update';

export interface VisualConfig {
  type: ItemVisualType;
  icon: React.ReactNode;
  bgCircle: string;
  badgeLabel: string;
  actionLabel?: string;
  isEmergency: boolean;
}

/**
 * Human relative time formatted with the shared time formatter
 * (e.g. "2 h 48 min ago", "just now", "Yesterday")
 */
export function formatNotificationRelativeTime(
  timestamp?: number,
  fallbackTimeAgo?: string
): string {
  if (!timestamp) return fallbackTimeAgo || 'just now';

  const now = Date.now();
  const diffMs = now - timestamp;
  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 45) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }
  if (diffHour < 24) {
    const remainingMin = diffMin % 60;
    if (remainingMin > 0 && diffHour < 6) {
      return `${diffHour} h ${remainingMin} min ago`;
    }
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

/**
 * Group notifications into "Today", "Yesterday", and "Earlier"
 */
export function getItemDateGroup(item: NotificationItem): NotificationDateGroup {
  const now = new Date();

  if (item.timestamp) {
    const itemDate = new Date(item.timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

    if (itemDay.getTime() === today.getTime()) {
      return 'today';
    }
    if (itemDay.getTime() === yesterday.getTime()) {
      return 'yesterday';
    }
    return 'earlier';
  }

  const time = (item.timeAgo || '').toLowerCase();
  if (
    time.includes('just now') ||
    time.includes('min') ||
    time.includes('hr') ||
    time.includes('hour') ||
    time.includes('sec')
  ) {
    return 'today';
  }
  if (time.includes('yesterday')) {
    return 'yesterday';
  }
  return 'earlier';
}

/**
 * Filter classification
 */
export function getItemCategory(item: NotificationItem): NotificationCategory {
  const t = (item.type || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const msg = (item.message || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();

  if (
    cat === 'emergency' ||
    t === 'sos' ||
    t === 'emergency' ||
    t === 'urgency_alert' ||
    item.urgency === 'critical' ||
    title.includes('sos') ||
    title.includes('🚨') ||
    title.includes('emergency') ||
    title.includes('urgent') ||
    msg.includes('critical') ||
    msg.includes('emergency')
  ) {
    return 'emergency';
  }

  if (
    cat === 'offers' ||
    t === 'offer' ||
    t === 'help_offered' ||
    title.includes('offer') ||
    title.includes('volunteer') ||
    msg.includes('offered') ||
    msg.includes('volunteer')
  ) {
    return 'offers';
  }

  if (
    cat === 'requests' ||
    t === 'request' ||
    item.requestId ||
    title.includes('request') ||
    title.includes('blood') ||
    title.includes('oxygen') ||
    title.includes('wheelchair') ||
    title.includes('aid') ||
    title.includes('elderly')
  ) {
    return 'requests';
  }

  return 'updates';
}

/**
 * Typed colored icon circle and visual metadata
 */
export function getItemVisual(item: NotificationItem): VisualConfig {
  const t = (item.type || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const isCritical =
    item.urgency === 'critical' ||
    title.includes('sos') ||
    title.includes('🚨') ||
    title.includes('emergency') ||
    t === 'sos' ||
    t === 'emergency' ||
    Boolean(item.sosToken);

  // 1. SOS / Emergency
  if (isCritical || t === 'sos' || t === 'emergency') {
    return {
      type: 'sos',
      icon: <Siren className="h-4 w-4 shrink-0 notranslate animate-pulse text-rose-600 dark:text-rose-400" />,
      bgCircle: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
      badgeLabel: 'Emergency',
      actionLabel: 'Open map',
      isEmergency: true,
    };
  }

  // 2. Badge
  if (t === 'badge' || title.includes('badge')) {
    return {
      type: 'badge',
      icon: <Award className="h-4 w-4 shrink-0 notranslate text-purple-600 dark:text-purple-400" />,
      bgCircle: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
      badgeLabel: 'Badge',
      actionLabel: 'View',
      isEmergency: false,
    };
  }

  // 3. Verification
  if (t === 'verification' || title.includes('verification') || title.includes('verified')) {
    return {
      type: 'verification',
      icon: <ShieldCheck className="h-4 w-4 shrink-0 notranslate text-cyan-600 dark:text-cyan-400" />,
      bgCircle: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
      badgeLabel: 'Verified',
      actionLabel: 'View',
      isEmergency: false,
    };
  }

  // 4. Rating / Feedback
  if (t === 'rating' || title.includes('rating') || title.includes('review')) {
    return {
      type: 'rating',
      icon: <Star className="h-4 w-4 shrink-0 notranslate text-amber-500 fill-amber-500/40" />,
      bgCircle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      badgeLabel: 'Rating',
      actionLabel: 'Rate',
      isEmergency: false,
    };
  }

  // 5. Completed
  if (t === 'completed' || title.includes('completed') || title.includes('thank you')) {
    return {
      type: 'completed',
      icon: <CheckCheck className="h-4 w-4 shrink-0 notranslate text-emerald-600 dark:text-emerald-400" />,
      bgCircle: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs',
      badgeLabel: 'Completed',
      actionLabel: 'Rate',
      isEmergency: false,
    };
  }

  // 6. On the way
  if (t === 'on_the_way' || title.includes('on the way') || title.includes('en route')) {
    return {
      type: 'on_the_way',
      icon: <Navigation className="h-4 w-4 shrink-0 notranslate text-indigo-600 dark:text-indigo-400" />,
      bgCircle: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]',
      badgeLabel: 'On The Way',
      actionLabel: 'Open map',
      isEmergency: false,
    };
  }

  // 7. Accepted
  if (t === 'accepted' || title.includes('accepted')) {
    return {
      type: 'accepted',
      icon: <CheckCircle2 className="h-4 w-4 shrink-0 notranslate text-teal-600 dark:text-teal-400" />,
      bgCircle: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.2)]',
      badgeLabel: 'Accepted',
      actionLabel: 'View',
      isEmergency: false,
    };
  }

  // 8. Offer
  if (t === 'offer' || t === 'help_offered' || title.includes('offer') || title.includes('volunteer')) {
    return {
      type: 'offer',
      icon: <UserCheck className="h-4 w-4 shrink-0 notranslate text-blue-600 dark:text-blue-400" />,
      bgCircle: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
      badgeLabel: 'Offer',
      actionLabel: 'View',
      isEmergency: false,
    };
  }

  // 9. Request
  if (t === 'request' || Boolean(item.requestId) || title.includes('request')) {
    return {
      type: 'request',
      icon: <HeartHandshake className="h-4 w-4 shrink-0 notranslate text-amber-600 dark:text-amber-400" />,
      bgCircle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      badgeLabel: 'Request',
      actionLabel: 'View',
      isEmergency: item.urgency === 'critical',
    };
  }

  // 10. Default: Update
  return {
    type: 'update',
    icon: <Sparkles className="h-4 w-4 shrink-0 notranslate text-emerald-600 dark:text-emerald-400" />,
    bgCircle: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs',
    badgeLabel: 'Update',
    actionLabel: 'View',
    isEmergency: false,
  };
}

const FILTER_ITEMS: Array<{
  key: FilterType;
  label: string;
  activeColor: string;
}> = [
  { key: 'all', label: 'All', activeColor: 'bg-primary text-primary-foreground' },
  { key: 'requests', label: 'Requests', activeColor: 'bg-amber-600 text-white' },
  { key: 'offers', label: 'Offers', activeColor: 'bg-blue-600 text-white' },
  { key: 'updates', label: 'Updates', activeColor: 'bg-emerald-600 text-white' },
  { key: 'emergency', label: 'Emergency', activeColor: 'bg-rose-600 text-white' },
];

export function NotificationCenter({
  open,
  onClose,
  anchor = 'bell',
  anchorRef,
}: NotificationCenterProps) {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    clearAllNotifications,
    setSelectedRequestId,
    setActiveFeedTab,
    setCurrentView,
    fetchLiveNotifications,
  } = useKindLinkStore();

  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useBodyScrollLock(open);

  // Swipe-to-dismiss states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Popover positioning state for collision-aware desktop anchor
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    width: number;
  } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Hydration guard
  useEffect(() => {
    setMounted(true);
    setIsDesktop(window.innerWidth >= 640);
  }, []);

  // Monitor window resize to determine isDesktop
  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 640);
    }
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate desktop popover position under bell icon with collision awareness
  const updatePosition = useCallback(() => {
    if (!open || anchor !== 'bell') return;
    if (typeof window === 'undefined') return;

    if (window.innerWidth < 640) {
      setPopoverCoords(null);
      return;
    }

    const bellEl =
      anchorRef?.current ||
      document.getElementById('header-notification-bell-btn') ||
      document.querySelector('[data-notification-bell]');

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = Math.min(viewportWidth - 24, 460);

    if (!bellEl) {
      setPopoverCoords({
        top: 76,
        left: Math.max(12, (viewportWidth - popoverWidth) / 2),
        maxHeight: Math.min(viewportHeight - 96, 600),
        width: popoverWidth,
      });
      return;
    }

    const rect = bellEl.getBoundingClientRect();

    // Horizontal placement: align right edges with padding
    let left = rect.right - popoverWidth;
    if (left < 12) {
      left = 12;
    }
    if (left + popoverWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - popoverWidth - 12);
    }

    // Vertical placement & collision check
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    let top: number;
    let maxHeight: number;

    if (spaceBelow < 300 && spaceAbove > spaceBelow) {
      // Flip upwards
      maxHeight = Math.min(spaceAbove - 16, 600);
      top = Math.max(12, rect.top - maxHeight - 8);
    } else {
      // Normal downwards
      top = rect.bottom + 8;
      maxHeight = Math.min(spaceBelow - 16, 600);
    }

    setPopoverCoords({
      top,
      left,
      maxHeight,
      width: popoverWidth,
    });
  }, [open, anchor, anchorRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, { capture: true });
    };
  }, [open, updatePosition]);

  // Initial fetch only once per session opening, never re-fetch just because user cleared all notifications
  const hasInitiallyFetchedRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (!hasInitiallyFetchedRef.current) {
      hasInitiallyFetchedRef.current = true;
      setIsLoading(true);
      setFetchError(false);
      fetchLiveNotifications()
        .catch(() => setFetchError(true))
        .finally(() => setIsLoading(false));
    }
  }, [open, fetchLiveNotifications]);

  const handleRetryFetch = async () => {
    setIsLoading(true);
    setFetchError(false);
    try {
      await fetchLiveNotifications();
    } catch {
      setFetchError(true);
      toast.error('Could not refresh notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Push notification permission check
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const dismissed = sessionStorage.getItem('kindlink_push_dismissed');
      if (Notification.permission === 'default' && dismissed !== 'true') {
        setShowPushBanner(true);
      } else {
        setShowPushBanner(false);
      }
    }
  }, [open]);

  // Handle outside click & Escape key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Realtime highlight listener for incoming notifications
  useEffect(() => {
    const handleNewNotif = (e: Event) => {
      const custom = e as CustomEvent<{ id?: string }>;
      if (custom.detail?.id) {
        setHighlightedId(custom.detail.id);
        const timer = setTimeout(() => setHighlightedId(null), 3000);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener('kindlink:new-notification', handleNewNotif);
    return () => window.removeEventListener('kindlink:new-notification', handleNewNotif);
  }, []);

  // Filter calculation
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: notifications.length,
      requests: 0,
      offers: 0,
      updates: 0,
      emergency: 0,
    };
    for (const n of notifications) {
      const cat = getItemCategory(n);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((item) => getItemCategory(item) === activeFilter);
  }, [notifications, activeFilter]);

  // Group notifications into Today, Yesterday, and Earlier
  const { todayItems, yesterdayItems, earlierItems } = useMemo(() => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    for (const item of filteredNotifications) {
      const group = getItemDateGroup(item);
      if (group === 'today') {
        today.push(item);
      } else if (group === 'yesterday') {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    }
    return {
      todayItems: today,
      yesterdayItems: yesterday,
      earlierItems: earlier,
    };
  }, [filteredNotifications]);

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push notifications are not supported in this browser');
      setShowPushBanner(false);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        toast.success('Browser push alerts enabled!');
        setShowPushBanner(false);
        try {
          new Notification('KindLink Community', {
            body: 'Push alerts enabled! You will be notified instantly of nearby needs.',
            icon: '/icon.svg',
          });
        } catch {}
      } else {
        toast.error('Notification permission was not granted');
        setShowPushBanner(false);
      }
    } catch {
      setShowPushBanner(false);
    }
  };

  const handleDismissPushBanner = () => {
    setShowPushBanner(false);
    try {
      sessionStorage.setItem('kindlink_push_dismissed', 'true');
    } catch {}
  };

  const handleItemClick = (item: NotificationItem, actionOverride?: string) => {
    markNotificationRead(item.id);

    const visual = getItemVisual(item);

    // If Rate action or review
    if (actionOverride === 'Rate' || visual.type === 'rating') {
      setCurrentView('profile');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
      return;
    }

    // If Open map action or on the way
    if (actionOverride === 'Open map' || visual.type === 'on_the_way') {
      if (item.requestId) setSelectedRequestId(item.requestId);
      setCurrentView('map');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
      return;
    }

    // If SOS token
    if (item.sosToken) {
      onClose();
      if (typeof window !== 'undefined') {
        window.location.href = `/sos/${item.sosToken}`;
      }
      return;
    }

    // If profile / badge / verification
    if (
      visual.type === 'verification' ||
      visual.type === 'badge' ||
      item.title.toLowerCase().includes('verified') ||
      item.title.toLowerCase().includes('profile')
    ) {
      setCurrentView('profile');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
      return;
    }

    // If request ID is attached
    if (item.requestId) {
      setActiveFeedTab('urgent');
      setSelectedRequestId(item.requestId);
      setCurrentView('requests');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
      return;
    }

    // Default to requests view
    setCurrentView('requests');
    onClose();
    if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
      window.location.href = '/app';
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      toast.success('All notifications cleared');
    } catch {
      toast.error('Failed to clear notifications');
    }
  };

  const handleDismissItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    dismissNotification(id);
    toast.success('Notification dismissed');
  };

  // Touch swipe handling
  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipedItemId(id);
    setSwipeOffset(0);
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    if (touchStartX === null || swipedItemId !== id) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -100));
    }
  };

  const handleTouchEnd = (id: string) => {
    if (swipeOffset < -60) {
      handleDismissItem(id);
    }
    setTouchStartX(null);
    setSwipedItemId(null);
    setSwipeOffset(0);
  };

  const renderItemCard = (item: NotificationItem) => {
    const visual = getItemVisual(item);
    const isSwiped = swipedItemId === item.id;
    const offset = isSwiped ? swipeOffset : 0;
    const isHighlight = highlightedId === item.id;
    const relativeTime = formatNotificationRelativeTime(item.timestamp, item.timeAgo);

    return (
      <div
        key={item.id}
        onTouchStart={(e) => handleTouchStart(item.id, e)}
        onTouchMove={(e) => handleTouchMove(item.id, e)}
        onTouchEnd={() => handleTouchEnd(item.id)}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiped ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={() => handleItemClick(item)}
        className={`group relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none overflow-hidden touch-manipulation animate-in fade-in slide-in-from-top-1 duration-200 ${
          isHighlight
            ? 'ring-2 ring-primary animate-pulse'
            : ''
        } ${
          visual.isEmergency
            ? 'border-rose-500/60 bg-rose-500/10 dark:bg-rose-950/25 ring-1 ring-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:border-rose-500/80'
            : item.unread
            ? 'border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-teal-500/15 dark:via-teal-500/5 dark:to-transparent ring-1 ring-primary/20 hover:border-primary/60 shadow-xs'
            : 'border-border/70 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-border'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
          {/* Typed colored icon circle or Shared Circular Badge Medal */}
          {visual.type === 'badge' ? (
            <div className="shrink-0 mt-0.5" title={visual.badgeLabel}>
              <BadgeMedalIcon
                size="sm"
                tier="gold"
                badgeId={(item as any).badgeId || item.title}
                title={item.title}
                isEarned={true}
              />
            </div>
          ) : (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 mt-0.5 ${visual.bgCircle}`}
              title={visual.badgeLabel}
            >
              {visual.icon}
            </div>
          )}

          {/* Title, descriptive body, and action */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {item.unread && (
                  <span
                    className="h-2 w-2 rounded-full bg-rose-600 dark:bg-rose-500 shrink-0 shadow-[0_0_6px_rgba(225,29,72,0.8)] animate-pulse"
                    title="Unread"
                  />
                )}
                <h4 className="text-sm font-bold text-foreground leading-snug break-words">
                  {item.title}
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0 whitespace-nowrap">
                <Clock className="h-3 w-3 notranslate" />
                {relativeTime}
              </span>
            </div>

            {/* 1-2 line descriptive body */}
            <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed break-words">
              {item.message}
            </p>

            {/* Action button if applicable */}
            {visual.actionLabel && (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item, visual.actionLabel);
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs touch-target active:scale-95 ${
                    visual.isEmergency
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                      : 'bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20'
                  }`}
                >
                  <span>{visual.actionLabel}</span>
                  <ChevronRight className="h-3.5 w-3.5 notranslate" />
                </button>

                {visual.isEmergency && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
                    Urgent
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => handleDismissItem(item.id, e)}
            className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors opacity-90 sm:opacity-0 group-hover:opacity-100 touch-target focus:opacity-100"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4 notranslate" />
          </button>
        </div>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full max-h-full overflow-hidden text-card-foreground bg-card">
      {/* Sticky Header: Title, unread count pill, settings gear button, prominent close */}
      <div className="sticky top-0 z-20 px-4 py-3 sm:px-4 sm:py-3.5 border-b border-border bg-card shrink-0 flex items-center justify-between gap-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:pt-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Bell className="h-5 w-5 sm:h-4 sm:w-4 notranslate" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-card shadow-[0_0_8px_rgba(225,29,72,0.5)] animate-pulse">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <h2 className="text-base font-extrabold text-foreground truncate tracking-tight">
              Notifications
            </h2>
            {unreadNotificationCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                {unreadNotificationCount} New
              </span>
            )}
          </div>
        </div>

        {/* Header Actions: Prominent and comfortable to tap on mobile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Settings Sheet Trigger */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-2xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors touch-target"
            title="Notification Settings"
            aria-label="Notification Settings"
          >
            <Settings className="h-4.5 w-4.5 sm:h-4 sm:w-4 notranslate" />
          </button>

          {/* Prominent Close button: Comfortable 44px touch target on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-2xl bg-muted/80 hover:bg-muted text-foreground transition-all touch-target active:scale-95 shadow-xs border border-border/70"
            aria-label="Close notifications"
            title="Close notifications"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4 notranslate" />
          </button>
        </div>
      </div>

      {/* Header Action Bar: Mark all read & Clear all (Never cramped, hidden, or truncated) */}
      {(unreadNotificationCount > 0 || notifications.length > 0) && (
        <div className="px-4 py-2 border-b border-border/60 bg-muted/25 flex items-center justify-between gap-2 shrink-0">
          <div>
            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground hover:text-primary transition-all text-xs font-semibold flex items-center gap-1.5 touch-target active:scale-95 shadow-xs"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5 notranslate text-primary" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-all text-xs font-semibold flex items-center gap-1.5 touch-target active:scale-95 shadow-xs"
                title="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5 notranslate text-muted-foreground hover:text-rose-600" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Filter Chips: All, Requests, Offers, Updates, Emergency */}
      <div className="px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 py-0.5">
          {FILTER_ITEMS.map((item) => {
            const isActive = activeFilter === item.key;
            const count = categoryCounts[item.key] || 0;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key)}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all touch-target ${
                  isActive
                    ? `${item.activeColor} shadow-xs scale-[1.02]`
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-black/20 text-white dark:bg-white/20'
                      : 'bg-card text-muted-foreground border border-border/50'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Push Notification Card with Full Text Wrapping (Never Truncated or Cramped) */}
      {showPushBanner && (
        <div className="relative mx-4 mt-3 p-4 rounded-2xl bg-muted/40 border border-border shadow-xs text-left shrink-0">
          <button
            type="button"
            onClick={handleDismissPushBanner}
            className="absolute top-3 right-3 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
            aria-label="Dismiss push prompt"
          >
            <X className="h-4 w-4 notranslate" />
          </button>

          <div className="flex items-start gap-3.5 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs mt-0.5">
              <Bell className="h-5 w-5 notranslate" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="text-sm font-bold text-foreground leading-snug break-words">
                Enable Push Notifications
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                Get notified instantly for nearby urgent requests, volunteer offers, and community alerts.
              </p>
            </div>
          </div>

          <div className="mt-3.5 pt-1">
            <button
              type="button"
              onClick={handleEnablePush}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs touch-target flex items-center justify-center gap-2 active:scale-98"
            >
              <Bell className="h-4 w-4 notranslate" />
              <span>Enable notifications</span>
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Notification List / States */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-4 space-y-3.5 bg-card">
        {isLoading && notifications.length === 0 ? (
          /* Skeleton Loading State */
          <div className="space-y-3 p-1">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-border/60 bg-muted/30 animate-pulse flex items-start gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-muted-foreground/15 shrink-0" />
                <div className="flex-1 space-y-2 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-32 bg-muted-foreground/20 rounded-md" />
                    <div className="h-3 w-16 bg-muted-foreground/15 rounded-md" />
                  </div>
                  <div className="h-3 w-4/5 bg-muted-foreground/15 rounded-md" />
                  <div className="h-3 w-3/5 bg-muted-foreground/15 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError && filteredNotifications.length === 0 ? (
          /* Error State with Retry Action */
          <div className="text-center py-12 px-4 flex flex-col items-center">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3 border border-rose-500/20">
              <AlertTriangle className="h-6 w-6 notranslate" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              Couldn&apos;t load notifications
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3.5 max-w-xs text-center leading-relaxed">
              We had trouble connecting to the live notification feed.
            </p>
            <button
              type="button"
              onClick={handleRetryFetch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-xs touch-target"
            >
              <RotateCcw className="h-3.5 w-3.5 notranslate" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Friendly Empty State */
          <div className="text-center py-12 px-4 text-muted-foreground flex flex-col items-center">
            <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 border border-emerald-500/20 shadow-xs">
              <CheckCircle2 className="h-8 w-8 stroke-[1.75] notranslate" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {activeFilter === 'all'
                ? "You're all caught up"
                : `No ${activeFilter} notifications`}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center leading-relaxed">
              {activeFilter === 'all'
                ? 'No unread notifications right now. Live emergency alerts, offers, and community updates will appear here instantly.'
                : `There are currently no notifications matching the "${activeFilter}" category.`}
            </p>
          </div>
        ) : (
          <>
            {/* Group 1: Today */}
            {todayItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Today
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                    {todayItems.length}
                  </span>
                </div>
                {todayItems.map(renderItemCard)}
              </div>
            )}

            {/* Group 2: Yesterday */}
            {yesterdayItems.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Yesterday
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                    {yesterdayItems.length}
                  </span>
                </div>
                {yesterdayItems.map(renderItemCard)}
              </div>
            )}

            {/* Group 3: Earlier */}
            {earlierItems.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Earlier
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                    {earlierItems.length}
                  </span>
                </div>
                {earlierItems.map(renderItemCard)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky Footer with Close Button */}
      <div className="sticky bottom-0 z-20 p-4 border-t border-border bg-card shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:pb-3.5">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-secondary text-secondary-foreground font-bold text-sm hover:bg-secondary/80 transition-colors touch-target shadow-xs active:scale-98"
        >
          Close
        </button>
      </div>

      {/* Working Notification Settings Sheet */}
      <NotificationSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );

  if (!open || !mounted) return null;

  // Desktop popover anchored under bell icon with collision awareness
  const isAnchoredDesktop = anchor === 'bell' && isDesktop && Boolean(popoverCoords);

  const modalTree = isAnchoredDesktop ? (
    <>
      {/* Click-outside dismissal backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 animate-in fade-in duration-100"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={popoverRef}
        role="region"
        aria-label="Notifications popover"
        style={{
          position: 'fixed',
          top: `${popoverCoords!.top}px`,
          left: `${popoverCoords!.left}px`,
          width: `${popoverCoords!.width}px`,
          maxHeight: `${Math.min(popoverCoords!.maxHeight, typeof window !== 'undefined' ? window.innerHeight * 0.88 : 600)}px`,
        }}
        className="z-50 rounded-3xl bg-card border border-border shadow-[0_25px_60px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-card-foreground sm:rounded-3xl sm:max-w-md sm:h-auto sm:max-h-[88dvh]"
      >
        {content}
      </div>
    </>
  ) : isDesktop ? (
    /* Desktop centered dialog fallback */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications panel"
    >
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={popoverRef}
        className="relative flex flex-col overflow-hidden w-full max-w-md rounded-3xl bg-card border border-border shadow-[0_25px_50px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-150 text-card-foreground sm:rounded-3xl sm:max-w-md sm:h-auto sm:max-h-[88dvh]"
      >
        {content}
      </div>
    </div>
  ) : (
    /* Mobile/small screens (<640px): completely FULL SCREEN */
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications panel"
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] rounded-none z-50 flex flex-col bg-card backdrop-blur-md pb-safe animate-in fade-in duration-150 text-card-foreground overflow-hidden"
    >
      {content}
    </div>
  );

  return createPortal(modalTree, document.body);
}
