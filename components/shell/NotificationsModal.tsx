'use client';

import React, { useEffect } from 'react';
import { Bell, CheckCheck, Clock, X, ArrowRight } from 'lucide-react';
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
      bgClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
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
      bgClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
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
      bgClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      label: 'Completed',
    };
  }

  return {
    icon: '🔔',
    bgClass: 'bg-primary/10 text-primary border-primary/20',
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

  // Mark notifications as read when the modal is opened
  useEffect(() => {
    if (open && unreadNotificationCount > 0) {
      markAllNotificationsRead();
    }
  }, [open, unreadNotificationCount, markAllNotificationsRead]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-card-foreground max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Bell className="h-5 w-5 notranslate" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-urgency-critical text-[9px] font-bold text-white ring-2 ring-card animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="notifications-modal-title" className="text-base font-bold">
                  Community Alerts
                </h2>
                {unreadNotificationCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-urgency-critical/15 text-urgency-critical border border-urgency-critical/30">
                    {unreadNotificationCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Real-time local urgent updates</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted transition text-xs flex items-center gap-1 touch-target"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4 notranslate" />
              <span className="hidden sm:inline">Read all</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition touch-target"
              aria-label="Close notifications modal"
            >
              <X className="h-4 w-4 notranslate" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-xl mb-2">
                🔔
              </div>
              <p className="font-semibold text-foreground">No alerts at this time</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                New emergency requests and offers will appear here live.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const badge = getNotificationBadge(item);
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    item.unread
                      ? 'border-primary/40 bg-primary/5 hover:bg-primary/10 shadow-xs'
                      : 'border-border bg-background hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Notification Type Icon */}
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm border shrink-0 ${badge.bgClass}`}
                      title={badge.label}
                    >
                      {badge.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.unread && (
                            <span className="h-2 w-2 rounded-full bg-urgency-critical shrink-0 animate-pulse" />
                          )}
                          <h4 className="text-sm font-semibold text-foreground truncate">
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
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                          <span>View Request</span>
                          <ArrowRight className="h-3 w-3 notranslate" />
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
          className="mt-4 w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium text-xs hover:bg-secondary/80 transition touch-target"
        >
          Close
        </button>
      </div>
    </div>
  );
}
