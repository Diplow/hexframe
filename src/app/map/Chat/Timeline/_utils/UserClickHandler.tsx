import { useState, useEffect } from 'react';
import { api } from '~/commons/trpc/react';
import { useMapCacheNavigation } from '~/app/map/Cache';
import { useEventBus } from '~/app/map/Services';
import { authClient } from '~/lib/auth';

export function useUserClickHandler() {
  const [userName, setUserName] = useState<string | null>(null);
  const { navigateToItem } = useMapCacheNavigation();
  const eventBus = useEventBus();
  const trpcUtils = api.useUtils();

  // Track user name via EventBus
  useEffect(() => {
    void authClient.getSession().then(session => {
      setUserName(session?.data?.user?.name ?? null);
    });

    const unsubscribe = eventBus.on('auth.*', (event) => {
      if (event.type === 'auth.login') {
        const payload = event.payload as { userId?: string; userName?: string };
        setUserName(payload.userName ?? null);
      }
      if (event.type === 'auth.logout') {
        setUserName(null);
      }
    });

    return unsubscribe;
  }, [eventBus]);

  const _navigateToUserMap = async (map: { id: number; name?: string }) => {
    const mapName = map.name ?? userName ?? 'Your Map';
    
    try {
      await navigateToItem(String(map.id));
    } catch (_error) {
      console.warn('Failed to navigate to user map:', _error);
      eventBus.emit({
        type: 'chat.message_received',
        payload: {
          message: `Failed to navigate to ${mapName} map`,
          actor: 'system'
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
    }
  };

  const handleUserClick = async () => {
    if (!userName) {
      eventBus.emit({
        type: 'auth.required',
        payload: {
          reason: 'Create an account to have your own map'
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
      return;
    }

    try {
      const userMapData = await trpcUtils.map.user.getUserMap.fetch();
      
      if (userMapData?.success && userMapData.map?.id) {
        await _navigateToUserMap(userMapData.map);
      } else {
        eventBus.emit({
          type: 'chat.message_received',
          payload: {
            message: 'Creating your map...',
            actor: 'system'
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      }
    } catch (_error) {
      console.warn('Failed to fetch user map:', _error);
      eventBus.emit({
        type: 'chat.message_received',
        payload: {
          message: 'Failed to load your map',
          actor: 'system'
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
    }
  };

  return { handleUserClick };
}