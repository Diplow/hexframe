import { useEffect } from 'react';
import { useUnifiedAuth } from '~/contexts/UnifiedAuthContext';
import { useRouter } from 'next/navigation';
import { api } from '~/commons/trpc/react';
import type { Widget } from '~/app/map/Chat/_state';
import { useEventBus } from '~/app/map/Services';
import { handleUserMapNavigation } from '~/app/map/Chat/Timeline/_components/_hooks/_helpers/map-navigation-handlers';

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
    void handleUserMapNavigation({
      userId: user.id,
      router,
      eventBus,
      trpcUtils,
      createMapMutation,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, widgets]);

  return null; // This hook only handles side effects
}