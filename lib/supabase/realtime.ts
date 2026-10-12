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

        // Refresh feed with current location
        const coords = store.userCoords;
        const fresh = await dataAdapter.getRequests({
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: store.filterRadius,
          category: store.filterCategory,
          urgency: store.filterUrgency,
        });
        useKindLinkStore.setState({ requests: fresh });
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'offers' },
      async () => {
        // Refresh requests and counts
        const store = useKindLinkStore.getState();
        const coords = store.userCoords;
        const fresh = await dataAdapter.getRequests({
          lat: coords.lat,
          lng: coords.lng,
          radiusKm: store.filterRadius,
          category: store.filterCategory,
          urgency: store.filterUrgency,
        });
        useKindLinkStore.setState({ requests: fresh });
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
