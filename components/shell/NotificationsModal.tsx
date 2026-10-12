'use client';

import React from 'react';
import { Bell, CheckCheck, Clock, X } from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedRequestId,
    setCurrentView,
  } = useKindLinkStore();

  if (!open) return null;

  const handleNotificationClick = (notifId: string, reqId?: string) => {
    markNotificationRead(notifId);
    if (reqId) {
      setSelectedRequestId(reqId);
      setCurrentView('requests');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-card-foreground max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-4 w-4 notranslate" />
            </div>
            <div>
              <h2 className="text-base font-bold">Community Alerts</h2>
              <p className="text-xs text-muted-foreground">Real-time local urgent updates</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={markAllNotificationsRead}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition text-xs flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4 notranslate" />
              <span className="hidden sm:inline">Read all</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted touch-target"
            >
              <X className="h-4 w-4 notranslate" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No notifications at this time
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item.id, item.requestId)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                  item.unread
                    ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                    : 'border-border bg-background hover:bg-muted/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.unread && (
                      <span className="h-2 w-2 rounded-full bg-urgency-critical shrink-0" />
                    )}
                    <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3 notranslate" />
                    {item.timeAgo}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {item.message}
                </p>
                {item.requestId && (
                  <span className="inline-block mt-2 text-[11px] font-bold text-primary">
                    View Request →
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium text-xs hover:bg-secondary/80 transition touch-target"
        >
          Close
        </button>
      </div>
    </div>
  );
}
