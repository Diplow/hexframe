import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { EventBusService } from '~/app/map/types/events';
import { preloadUserMapData, savePreFetchedData } from '~/app/map/Services/PreFetch/pre-fetch-service';;
import type { api } from '~/commons/trpc/react';

interface MapInfo {
  id: number;
  name?: string;
}

interface MapNavigationParams {
  userId: string | undefined;
  router: AppRouterInstance;
  eventBus: EventBusService;
  trpcUtils: ReturnType<typeof api.useUtils>;
  createMapMutation: ReturnType<typeof api.map.user.createDefaultMapForCurrentUser.useMutation>;
}

export async function handleUserMapNavigation({
  userId,
  router,
  eventBus,
  trpcUtils,
  createMapMutation,
}: MapNavigationParams): Promise<void> {
  try {
    // Get user map info first
    const result = await trpcUtils.map.user.getUserMap.fetch();

    if (result?.success && result.map?.id) {
      // Found user map

      // Pre-fetch all map data before navigation
      if (userId) {
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) {
          console.warn('[AuthCoordinator] Invalid user ID format:', userId);
          return;
        }
        const preFetchedData = await preloadUserMapData(userIdNum, 0, trpcUtils);
        if (preFetchedData) {
          // Save pre-fetched data for MapCacheProvider to use
          savePreFetchedData(preFetchedData);
        }
      }

      // Navigate to user map
      handleExistingMap(result.map, router);
    } else if (!result?.success) {
      // No user map found, creating new map
      await createUserMap({ userId, router, eventBus, createMapMutation, trpcUtils });
    }
  } catch (_error) {
    console.warn('Failed to handle user map navigation:', _error);
    // Fallback to basic navigation
    try {
      const result = await trpcUtils.map.user.getUserMap.fetch();
      if (result?.success && result.map?.id) {
        handleExistingMap(result.map, router);
      }
    } catch (_fallbackError) {
      console.warn('Fallback navigation also failed:', _fallbackError);
    }
  }
}

export function handleExistingMap(map: MapInfo, router: AppRouterInstance): void {
  const returnUrl = sessionStorage.getItem('auth-return-url');
  sessionStorage.removeItem('auth-return-url');

  if (returnUrl?.includes('/map')) {
    window.location.href = returnUrl;
  } else {
    const newUrl = `/map?center=${map.id}`;
    // Use router.replace instead of router.push to avoid adding to history
    router.replace(newUrl);
  }
}

export async function createUserMap({
  userId,
  router,
  eventBus,
  createMapMutation,
  trpcUtils,
}: MapNavigationParams): Promise<void> {
  try {
    const createResult = await createMapMutation.mutateAsync();
    if (createResult?.success && createResult.mapId) {
      // Pre-fetch the newly created map data
      if (userId) {
        const userIdNum = parseInt(userId);
        if (isNaN(userIdNum)) {
          console.warn('[AuthCoordinator] Invalid user ID format for new map:', userId);
          return;
        }
        const preFetchedData = await preloadUserMapData(userIdNum, 0, trpcUtils);
        if (preFetchedData) {
          savePreFetchedData(preFetchedData);
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
}
