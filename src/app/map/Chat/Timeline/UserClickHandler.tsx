import { useUnifiedAuth } from '~/contexts/UnifiedAuthContext';
import { api } from '~/commons/trpc/react';
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map/Services';

export function useUserClickHandler() {
  const { user } = useUnifiedAuth();
  const { navigateToItem } = useMapCache();
  const eventBus = useEventBus();
  const trpcUtils = api.useUtils();

  const _navigateToUserMap = async (map: { id: number; name?: string }) => {
    const mapName = map.name ?? user?.name ?? 'Your Map';
    
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
    if (!user) {
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