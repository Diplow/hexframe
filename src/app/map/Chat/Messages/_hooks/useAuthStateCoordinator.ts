import { useEffect } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '~/commons/trpc/react';
import type { Widget } from '../../Cache/types';
import { useChatEventDispatcher } from './useChatEventDispatcher';
import { preloadUserMapData, savePreFetchedData } from '../../../Cache/Services/pre-fetch-service';

export function useAuthStateCoordinator(widgets: Widget[]) {
  const { user } = useAuth();
  const router = useRouter();
  const trpcUtils = api.useUtils();
  const createMapMutation = api.map.user.createDefaultMapForCurrentUser.useMutation();
  const { 
    dispatchWidgetResolved, 
    dispatchMessage, 
    dispatchError 
  } = useChatEventDispatcher();

  useEffect(() => {
    if (!user) return;

    const loginWidget = widgets.find(w => w.type === 'login');
    if (!loginWidget) return;

    // Handle user authentication
    dispatchWidgetResolved(loginWidget.id, 'authenticated');
    
    // Pre-fetch user map data and navigate
    void _handleUserMapNavigation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, widgets, dispatchWidgetResolved]);


  const _handleUserMapNavigation = async () => {
    try {
      // Get user map info first
      const result = await trpcUtils.map.user.getUserMap.fetch();
      
      if (result?.success && result.map?.id) {
        // Pre-fetch all map data before navigation
        if (user?.id) {
          const preFetchedData = await preloadUserMapData(parseInt(user.id), 0, trpcUtils);
          if (preFetchedData) {
            // Save pre-fetched data for MapCacheProvider to use
            savePreFetchedData(preFetchedData);
            console.log('[Auth] Pre-fetched user map data successfully');
          }
        }
        
        // Navigate to user map
        _handleExistingMap(result.map);
      } else if (!result?.success) {
        await _createUserMap();
      }
    } catch (error) {
      console.error('[Auth] Failed to handle user map navigation:', error);
      // Fallback to basic navigation
      try {
        const result = await trpcUtils.map.user.getUserMap.fetch();
        if (result?.success && result.map?.id) {
          _handleExistingMap(result.map);
        }
      } catch (fallbackError) {
        console.error('[Auth] Fallback navigation also failed:', fallbackError);
      }
    }
  };

  const _handleExistingMap = (map: { id: number; name?: string }) => {
    const returnUrl = sessionStorage.getItem('auth-return-url');
    sessionStorage.removeItem('auth-return-url');
    
    if (returnUrl?.includes('/map')) {
      window.location.href = returnUrl;
    } else {
      // Use router.replace instead of router.push to avoid adding to history
      router.replace(`/map?center=${map.id}`);
    }
  };

  const _createUserMap = async () => {
    try {
      const createResult = await createMapMutation.mutateAsync();
      if (createResult?.success && createResult.mapId) {
        // Pre-fetch the newly created map data
        if (user?.id) {
          const preFetchedData = await preloadUserMapData(parseInt(user.id), 0, trpcUtils);
          if (preFetchedData) {
            savePreFetchedData(preFetchedData);
            console.log('[Auth] Pre-fetched newly created map data');
          }
        }
        
        // Use router.replace instead of router.push to avoid adding to history
        router.replace(`/map?center=${createResult.mapId}`);
        dispatchMessage('Welcome! Your personal map has been created.');
      }
    } catch (error) {
      console.error('Failed to create user map:', error);
      dispatchError('Failed to create your map. Please try refreshing the page.', true);
    }
  };

  return null; // This hook only handles side effects
}