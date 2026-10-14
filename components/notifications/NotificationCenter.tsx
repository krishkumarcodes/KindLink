'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  X,
  AlertTriangle,
  HeartHandshake,
  UserCheck,
  Sparkles,
  Siren,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { NotificationItem } from '@/lib/data/types';

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  anchor?: 'bell' | 'dialog';
}

type NotificationCategory = 'requests' | 'offers' | 'updates' | 'emergency';
type FilterType = 'all' | NotificationCategory;

function getItemCategory(item: NotificationItem): NotificationCategory {
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

function getCategoryVisual(cat: NotificationCategory) {
  switch (cat) {
    case 'emergency':
      return {
        bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
        icon: <Siren className="h-4 w-4 shrink-0 notranslate animate-pulse" />,
        badgeLabel: 'Emergency',
      };
    case 'offers':
      return {
        bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
        icon: <UserCheck className="h-4 w-4 shrink-0 notranslate" />,
        badgeLabel: 'Offer',
      };
    case 'requests':
      return {
        bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
        icon: <HeartHandshake className="h-4 w-4 shrink-0 notranslate" />,
        badgeLabel: 'Request',
      };
    case 'updates':
    default:
      return {
        bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs',
        icon: <Sparkles className="h-4 w-4 shrink-0 notranslate" />,
        badgeLabel: 'Update',
      };
  }
}

function isToday(item: NotificationItem): boolean {
  if (item.timestamp) {
    const itemDate = new Date(item.timestamp);
    const now = new Date();
    return (
      itemDate.getDate() === now.getDate() &&
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear()
    );
  }
  const time = (item.timeAgo || '').toLowerCase();
  if (
    time.includes('just now') ||
    time.includes('min') ||
    time.includes('hr') ||
    time.includes('hour') ||
    time.includes('sec')
  ) {
    return true;
  }
  if (
    time.includes('yesterday') ||
    time.includes('day') ||
    time.includes('week') ||
    time.includes('month') ||
    time.includes('year')
  ) {
    return false;
  }
  return true;
}

export function NotificationCenter({
  open,
  onClose,
  anchor = 'bell',
}: NotificationCenterProps) {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    setSelectedRequestId,
    setCurrentView,
  } = useKindLinkStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Swipe-to-dismiss states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Check browser push notification permission status
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

  // Handle outside click on desktop popover
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

  // Group notifications into Today and Earlier
  const { todayItems, earlierItems } = useMemo(() => {
    const today: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    for (const item of filteredNotifications) {
      if (isToday(item)) {
        today.push(item);
      } else {
        earlier.push(item);
      }
    }
    return { todayItems: today, earlierItems: earlier };
  }, [filteredNotifications]);

  if (!open) return null;

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

  const handleItemClick = (item: NotificationItem) => {
    markNotificationRead(item.id);

    if (item.requestId) {
      setSelectedRequestId(item.requestId);
      setCurrentView('requests');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
      return;
    }

    if (item.sosToken) {
      onClose();
      if (typeof window !== 'undefined') {
        window.location.href = `/sos/${item.sosToken}`;
      }
      return;
    }

    const cat = getItemCategory(item);
    if (cat === 'emergency') {
      setCurrentView('requests');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
      return;
    }

    if (
      item.title.toLowerCase().includes('verified') ||
      item.title.toLowerCase().includes('profile') ||
      item.title.toLowerCase().includes('badge')
    ) {
      setCurrentView('profile');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
      return;
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
    const cat = getItemCategory(item);
    const visual = getCategoryVisual(cat);
    const isSwiped = swipedItemId === item.id;
    const offset = isSwiped ? swipeOffset : 0;
    const isHighlight = highlightedId === item.id;

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
        className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none overflow-hidden touch-manipulation ${
          isHighlight
            ? 'ring-2 ring-primary animate-pulse'
            : ''
        } ${
          item.unread
            ? 'border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-teal-500/15 dark:via-teal-500/5 dark:to-transparent shadow-xs ring-1 ring-primary/20 hover:border-primary/60'
            : 'border-border/70 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-border'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Category/Type icon in colored circle */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover:scale-105 ${visual.bg}`}
            title={visual.badgeLabel}
          >
            {visual.icon}
          </div>

          {/* Title and one-line body preview */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {item.unread && (
                  <span
                    className="h-2 w-2 rounded-full bg-rose-600 shrink-0 animate-pulse shadow-[0_0_6px_rgba(225,29,72,0.8)]"
                    title="Unread"
                  />
                )}
                <h4 className="text-sm font-bold text-foreground truncate">
                  {item.title}
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0 whitespace-nowrap">
                <Clock className="h-3 w-3 notranslate" />
                {item.timeAgo}
              </span>
            </div>

            {/* One-line preview */}
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.message}
            </p>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => handleDismissItem(item.id, e)}
            className="shrink-0 h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100 touch-target focus:opacity-100"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5 notranslate" />
          </button>
        </div>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full max-h-full overflow-hidden text-card-foreground">
      {/* Mobile Swipe/Drag Handle */}
      <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto my-2 sm:hidden shrink-0" />

      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border/80 bg-card/90 dark:bg-slate-950/90 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Bell className="h-4 w-4 notranslate" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-card shadow-[0_0_8px_rgba(225,29,72,0.5)] animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground truncate">
                Notifications
              </h2>
              {unreadNotificationCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                  {unreadNotificationCount} New
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-primary transition-all text-xs font-semibold flex items-center gap-1.5 touch-target active:scale-95 shadow-xs"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5 notranslate text-primary" />
              <span className="hidden sm:inline">Mark all as read</span>
            </button>
          )}

          {/* Link to Notification Settings */}
          <button
            type="button"
            onClick={() => {
              setCurrentView('settings');
              onClose();
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors touch-target"
            title="Notification Settings"
            aria-label="Notification Settings"
          >
            <Settings className="h-4 w-4 notranslate" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors touch-target"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4 notranslate" />
          </button>
        </div>
      </div>

      {/* Filter Chips Row: All, Requests, Offers, Updates, Emergency */}
      <div className="px-4 py-2 border-b border-border/60 bg-muted/20 shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
            activeFilter === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          All ({categoryCounts.all})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('emergency')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 touch-target flex items-center gap-1 ${
            activeFilter === 'emergency'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-3 w-3 notranslate" />
          <span>Emergency ({categoryCounts.emergency})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('requests')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
            activeFilter === 'requests'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Requests ({categoryCounts.requests})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('offers')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
            activeFilter === 'offers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Offers ({categoryCounts.offers})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('updates')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 touch-target ${
            activeFilter === 'updates'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Updates ({categoryCounts.updates})
        </button>
      </div>

      {/* Push Notification Permission Banner */}
      {showPushBanner && (
        <div className="mx-3 sm:mx-4 mt-2.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-teal-500/10 to-transparent border border-primary/25 flex items-center justify-between gap-2.5 text-left shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Bell className="h-4 w-4 notranslate" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-foreground truncate">
                Enable Push Notifications
              </h4>
              <p className="text-[11px] text-muted-foreground truncate">
                Get notified instantly for nearby urgent requests
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleEnablePush}
              className="px-2.5 py-1 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-xs touch-target"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={handleDismissPushBanner}
              className="p-1 text-muted-foreground hover:text-foreground touch-target"
              aria-label="Dismiss push prompt"
            >
              <X className="h-3.5 w-3.5 notranslate" />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Notification List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl mb-3 border border-primary/20">
              <Bell className="h-6 w-6 notranslate" />
            </div>
            <p className="font-bold text-foreground">
              {activeFilter === 'all'
                ? "You're all caught up!"
                : `No ${activeFilter} notifications`}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
              {activeFilter === 'all'
                ? 'No notifications right now. New emergency requests and volunteer offers will appear here live.'
                : `There are currently no notifications matching the "${activeFilter}" filter.`}
            </p>
          </div>
        ) : (
          <>
            {/* Group: Today */}
            {todayItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Today
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                    {todayItems.length}
                  </span>
                </div>
                {todayItems.map(renderItemCard)}
              </div>
            )}

            {/* Group: Earlier */}
            {earlierItems.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
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

      {/* Footer / Mobile Close Shortcut */}
      <div className="p-3 border-t border-border/80 bg-card/90 dark:bg-slate-950/90 shrink-0 sm:hidden">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold text-xs hover:bg-secondary/80 transition-colors touch-target shadow-xs"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Bottom Sheet (<640px) */}
      <div
        className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications sheet"
      >
        <div
          className="fixed inset-0 -z-10"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="w-full max-h-[85vh] rounded-t-3xl bg-card/98 dark:bg-slate-950/98 border-t border-x border-border/80 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          {content}
        </div>
      </div>

      {/* 2. Desktop Anchored Popover / Centered Dialog (>=640px) */}
      {anchor === 'bell' ? (
        <>
          {/* Transparent Backdrop to detect click outside */}
          <div
            className="hidden sm:block fixed inset-0 z-40"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            ref={popoverRef}
            role="region"
            aria-label="Notifications popover"
            className="hidden sm:flex absolute right-0 top-full mt-2 w-[440px] max-h-[580px] z-50 rounded-3xl bg-card/98 dark:bg-slate-950/98 border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {content}
          </div>
        </>
      ) : (
        <div
          className="hidden sm:flex fixed inset-0 z-50 items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications dialog"
        >
          <div
            className="fixed inset-0 -z-10"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="w-full max-w-lg max-h-[85vh] rounded-3xl bg-card/98 dark:bg-slate-950/98 border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
