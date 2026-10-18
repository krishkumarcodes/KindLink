import { toast } from 'sonner';
import { createClient } from './client';
import { useKindLinkStore } from '../store/useKindLinkStore';
import { NotificationItem, RequestLifecycleStatus } from '../data/types';

let activeChannel: any = null;

export function initializeRealtime() {
  if (typeof window === 'undefined') return;

  const supabase = createClient();

  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch {
      // Ignore cleanup error
    }
    activeChannel = null;
  }

  activeChannel = supabase
    .channel('kindlink-realtime-channel')
    // 1. Subscribe to public.requests changes (INSERT, UPDATE, DELETE)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requests' },
      async (payload) => {
        const store = useKindLinkStore.getState();

        if (payload.eventType === 'INSERT') {
          const newReq = payload.new as any;
          const currentUserId = store.userProfile?.id;
          const isOwn = Boolean(currentUserId && newReq?.requester_id === currentUserId);

          // Never notify requester about their own request being nearby
          if (newReq?.title && !isOwn) {
            toast.info(`🚨 New ${newReq.category || 'Help'} Request: ${newReq.title}`, {
              description: newReq.address_text || newReq.location_name || 'Nearby request received',
              action: {
                label: 'View',
                onClick: () => {
                  store.setSelectedRequestId(newReq.id);
                  store.setCurrentView('requests');
                },
              },
            });
          }
          store.fetchLiveRequests();
          store.fetchLiveStats();
        } else if (payload.eventType === 'UPDATE') {
          const updatedReq = payload.new as any;
          if (updatedReq?.id) {
            useKindLinkStore.setState((state) => ({
              requests: state.requests.map((r) =>
                r.id === updatedReq.id
                  ? {
                      ...r,
                      title: updatedReq.title || r.title,
                      description: updatedReq.description || r.description,
                      status: (updatedReq.status as RequestLifecycleStatus) || r.status,
                      urgency: updatedReq.urgency || r.urgency,
                    }
                  : r
              ),
            }));
          }
          store.fetchLiveRequests();
          store.fetchLiveStats();
        } else if (payload.eventType === 'DELETE') {
          const oldReq = payload.old as any;
          if (oldReq?.id) {
            useKindLinkStore.setState((state) => ({
              requests: state.requests.filter((r) => r.id !== oldReq.id),
              selectedRequestId:
                state.selectedRequestId === oldReq.id ? null : state.selectedRequestId,
            }));
          }
          store.fetchLiveStats();
        }
      }
    )
    // 2. Subscribe to public.offers changes
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'offers' },
      async () => {
        const store = useKindLinkStore.getState();
        store.fetchLiveRequests();
        store.fetchLiveStats();
      }
    )
    // 3. Subscribe to public.notifications changes (INSERT, UPDATE, DELETE)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      async (payload) => {
        const store = useKindLinkStore.getState();

        if (payload.eventType === 'INSERT') {
          const n = payload.new as any;
          if (n?.title) {
            toast.success(n.title, {
              description: n.body || n.message,
            });

            const newNotifItem: NotificationItem = {
              id: n.id,
              title: n.title,
              message: n.body || n.message || '',
              timeAgo: 'Just now',
              timestamp: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
              unread: true,
              urgency: n.urgency || 'medium',
              requestId: n.request_id || undefined,
            };
            store.addNotification(newNotifItem);
          }
          store.fetchLiveNotifications();
        } else if (payload.eventType === 'UPDATE') {
          const updatedN = payload.new as any;
          if (updatedN?.id) {
            useKindLinkStore.setState((state) => ({
              notifications: state.notifications.map((notif) =>
                notif.id === updatedN.id
                  ? {
                      ...notif,
                      unread: updatedN.read === false || !updatedN.read_at,
                    }
                  : notif
              ),
            }));
          }
          store.fetchLiveNotifications();
        } else if (payload.eventType === 'DELETE') {
          const oldN = payload.old as any;
          if (oldN?.id) {
            useKindLinkStore.setState((state) => ({
              notifications: state.notifications.filter((notif) => notif.id !== oldN.id),
            }));
          }
        }
      }
    );

  activeChannel.subscribe((status: string, err?: any) => {
    if (err) {
      console.warn('Realtime subscription status:', status, err);
    }
  });

  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
