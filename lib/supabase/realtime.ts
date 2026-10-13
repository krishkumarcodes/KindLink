import { toast } from 'sonner';
import { createClient } from './client';
import { useKindLinkStore } from '../store/useKindLinkStore';
import { dataAdapter } from '../data';

let activeChannel: any = null;

export function initializeRealtime() {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock' || process.env.DATA_SOURCE === 'mock') {
    return;
  }

  const supabase = createClient();

  if (activeChannel) {
    supabase.removeChannel(activeChannel);
  }

  activeChannel = supabase
    .channel('kindlink-realtime-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requests' },
      async (payload) => {
        const store = useKindLinkStore.getState();

        if (payload.eventType === 'INSERT') {
          const newReq = payload.new as any;
          toast.info(`🚨 New ${newReq.category} Request: ${newReq.title}`, {
            description: newReq.address_text,
            action: {
              label: 'View',
              onClick: () => {
                store.setSelectedRequestId(newReq.id);
                store.setCurrentView('requests');
              },
            },
          });
        }

        // Refresh feed and stats with current location
        store.fetchLiveRequests();
        store.fetchLiveStats();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'offers' },
      async () => {
        // Refresh requests and live community stats
        const store = useKindLinkStore.getState();
        store.fetchLiveRequests();
        store.fetchLiveStats();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      async (payload) => {
        if (payload.eventType === 'INSERT') {
          const n = payload.new as any;
          toast.success(n.title, {
            description: n.body,
          });
        }
        const notifs = await dataAdapter.getNotifications();
        useKindLinkStore.setState({ notifications: notifs });
      }
    )
    .subscribe();

  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
