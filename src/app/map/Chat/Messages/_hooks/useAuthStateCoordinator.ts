import { useEffect } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '~/commons/trpc/react';
import type { Widget } from '../../Cache/types';
import { useChatEventDispatcher } from './useChatEventDispatcher';

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
    
    // Navigate to user map
    trpcUtils.map.user.getUserMap.fetch().then(async (result) => {
      if (result?.success && result.map?.id) {
        _handleExistingMap(result.map);
      } else if (!result?.success) {
        await _createUserMap();
      }
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, widgets, dispatchWidgetResolved]);


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