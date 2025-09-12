import { useEffect } from 'react';
import { useUnifiedAuth } from '~/contexts/UnifiedAuthContext';
import { useRouter } from 'next/navigation';
import { api } from '~/commons/trpc/react';
import type { Widget } from '~/app/map/Chat/_state';
import { preloadUserMapData, savePreFetchedData } from '~/app/map/Services';
import { useEventBus } from '~/app/map/Services';

export function useAuthStateCoordinator(widgets: Widget[]) {
  const { user } = useUnifiedAuth();
  const router = useRouter();
  const trpcUtils = api.useUtils();
  const createMapMutation = api.map.user.createDefaultMapForCurrentUser.useMutation();
  const eventBus = useEventBus();

  useEffect(() => {

    if (!user) return;

    const loginWidget = widgets.find(w => w.type === 'login');
    if (!loginWidget) return;


    // Handle user authentication - widget resolution handled by chat state
    
    // Pre-fetch user map data and navigate
    void _handleUserMapNavigation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, widgets]);


  const _handleUserMapNavigation = async () => {
    
    try {
      // Get user map info first
      const result = await trpcUtils.map.user.getUserMap.fetch();
      
      
      if (result?.success && result.map?.id) {
        // Found user map
        
        // Pre-fetch all map data before navigation
        if (user?.id) {
          // Starting pre-fetch for user
          const userId = parseInt(user.id);
          if (isNaN(userId)) {
            console.warn('[AuthCoordinator] Invalid user ID format:', user.id);
            return;
          }
          const preFetchedData = await preloadUserMapData(userId, 0, trpcUtils);
          if (preFetchedData) {
            // Save pre-fetched data for MapCacheProvider to use
            savePreFetchedData(preFetchedData);
            // Pre-fetched user map data successfully
          } else {
            // Pre-fetch returned null
          }
        }
        
        // Navigate to user map
        // Navigating to user map
        _handleExistingMap(result.map);
      } else if (!result?.success) {
        // No user map found, creating new map
        await _createUserMap();
      }
    } catch (_error) {
      console.warn('Failed to handle user map navigation:', _error);
      // Fallback to basic navigation
      try {
        // Attempting fallback navigation
        const result = await trpcUtils.map.user.getUserMap.fetch();
        if (result?.success && result.map?.id) {
          // Fallback found map, navigating
          _handleExistingMap(result.map);
        }
      } catch (_fallbackError) {
        console.warn('Fallback navigation also failed:', _fallbackError);
      }
    }
  };

  const _handleExistingMap = (map: { id: number; name?: string }) => {
    
    const returnUrl = sessionStorage.getItem('auth-return-url');
    sessionStorage.removeItem('auth-return-url');
    
    if (returnUrl?.includes('/map')) {
      window.location.href = returnUrl;
    } else {
      const newUrl = `/map?center=${map.id}`;
      // Use router.replace instead of router.push to avoid adding to history
      router.replace(newUrl);
    }
  };

  const _createUserMap = async () => {
    try {
      const createResult = await createMapMutation.mutateAsync();
      if (createResult?.success && createResult.mapId) {
        // Pre-fetch the newly created map data
        if (user?.id) {
          const userId = parseInt(user.id);
          if (isNaN(userId)) {
            console.warn('[AuthCoordinator] Invalid user ID format for new map:', user.id);
            return;
          }
          const preFetchedData = await preloadUserMapData(userId, 0, trpcUtils);
          if (preFetchedData) {
            savePreFetchedData(preFetchedData);
            // Pre-fetched newly created map data
          }
        }
        
        // Use router.replace instead of router.push to avoid adding to history
        router.replace(`/map?center=${createResult.mapId}`);
        eventBus.emit({
          type: 'chat.message_received',
          payload: {
            message: 'Welcome! Your personal map has been created.',
            actor: 'system'
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      }
    } catch (_error) {
      console.warn('Failed to create user map:', _error);
      eventBus.emit({
        type: 'error.occurred',
        payload: {
          error: 'Failed to create your map. Please try refreshing the page.',
          retryable: true
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
    }
  };

  return null; // This hook only handles side effects
}