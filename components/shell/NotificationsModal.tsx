'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Bell, CheckCheck, Clock, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { NotificationItem } from '@/lib/data/types';

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

function getNotificationBadge(item: NotificationItem) {
  const t = (item.type || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const msg = (item.message || '').toLowerCase();

  if (
    t === 'sos' ||
    t === 'urgency_alert' ||
    title.includes('sos') ||
    title.includes('🚨') ||
    title.includes('emergency') ||
    item.urgency === 'critical'
  ) {
    return {
      icon: '🚨',
      bgClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
      label: 'SOS Alert',
    };
  }

  if (
    t === 'offer' ||
    t === 'help_offered' ||
    title.includes('offer') ||
    title.includes('volunteer') ||
    msg.includes('offered') ||
    msg.includes('volunteer')
  ) {
    return {
      icon: '👤',
      bgClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
      label: 'Help Offer',
    };
  }

  if (
    t === 'completion' ||
    t === 'completed' ||
    t === 'resolved' ||
    title.includes('completed') ||
    title.includes('resolved') ||
    title.includes('safe') ||
    msg.includes('completed')
  ) {
    return {
      icon: '✅',
      bgClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
      label: 'Completed',
    };
  }

  return {
    icon: '🔔',
    bgClass: 'bg-primary/10 text-primary border-primary/20 shadow-xs',
    label: 'Alert',
  };
}

export function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedRequestId,
    setCurrentView,
  } = useKindLinkStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  // Mark notifications as read when the modal is opened
  useEffect(() => {
    if (open && unreadNotificationCount > 0) {
      markAllNotificationsRead();
    }
  }, [open, unreadNotificationCount, markAllNotificationsRead]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((item) => item.unread);
    }
    if (activeFilter === 'urgent') {
      return notifications.filter(
        (item) =>
          item.urgency === 'critical' ||
          item.type === 'sos' ||
          (item.title && item.title.toLowerCase().includes('sos'))
      );
    }
    return notifications;
  }, [notifications, activeFilter]);

  if (!open) return null;

  const handleNotificationClick = (item: NotificationItem) => {
    markNotificationRead(item.id);
    if (item.requestId) {
      setSelectedRequestId(item.requestId);
      setCurrentView('requests');
      onClose();
      if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
        window.location.href = '/app';
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-card/95 dark:bg-slate-950/95 border border-border/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] text-card-foreground max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Bell className="h-5 w-5 notranslate" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-card shadow-[0_0_8px_rgba(225,29,72,0.5)] animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="notifications-modal-title" className="text-base font-bold text-foreground">
                  Community Alerts
                </h2>
                {unreadNotificationCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse">
                    {unreadNotificationCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Real-time local urgent updates</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-primary transition-all text-xs font-semibold flex items-center gap-1.5 touch-target active:scale-95 shadow-xs"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4 notranslate text-primary" />
              <span className="hidden sm:inline">Read all</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors touch-target"
              aria-label="Close notifications modal"
            >
              <X className="h-4 w-4 notranslate" />
            </button>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center gap-2 pt-3 pb-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target ${
              activeFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target flex items-center gap-1 ${
              activeFilter === 'urgent'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-3 w-3 notranslate" />
            <span>Urgent</span>
          </button>
          {notifications.some((n) => n.unread) && (
            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-target ${
                activeFilter === 'unread'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Unread
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/80 flex items-center justify-center text-xl mb-2 border border-border/60">
                🔔
              </div>
              <p className="font-bold text-foreground">No alerts in this category</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                New emergency requests and offers will appear here live.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const badge = getNotificationBadge(item);
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
                    item.unread
                      ? 'border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-teal-500/15 dark:via-teal-500/5 dark:to-transparent shadow-xs ring-1 ring-primary/20 hover:border-primary/60'
                      : 'border-border/70 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Notification Type Icon */}
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm border shrink-0 transition-transform group-hover:scale-105 ${badge.bgClass}`}
                      title={badge.label}
                    >
                      {badge.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.unread && (
                            <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0 animate-pulse shadow-[0_0_6px_rgba(225,29,72,0.8)]" />
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

                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.message}
                      </p>

                      {item.requestId && (
                        <div className="mt-2.5 flex items-center gap-1 text-xs font-bold text-primary group-hover:text-primary-hover transition-colors">
                          <span>View Request</span>
                          <ArrowRight className="h-3.5 w-3.5 notranslate group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-secondary/80 transition-colors touch-target shadow-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
}
