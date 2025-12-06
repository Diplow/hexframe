import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/commons/trpc/react';
import type { Widget } from '~/app/map/Chat/_state';
import { useEventBus } from '~/app/map/Services/EventBus';
import { handleUserMapNavigation } from '~/app/map/Chat/Timeline/_components/_hooks/_helpers/map-navigation-handlers';

export function useAuthStateCoordinator(widgets: Widget[]) {
  const router = useRouter();
  const trpcUtils = api.useUtils();
  const createMapMutation = api.map.user.createDefaultMapForCurrentUser.useMutation();
  const eventBus = useEventBus();

  useEffect(() => {
    // Subscribe to auth.login events to handle post-login navigation
    const unsubscribe = eventBus.on('auth.login', (event) => {
      const payload = event.payload as { userId?: string; userName?: string };

      const loginWidget = widgets.find(w => w.type === 'login');

      if (!loginWidget) {
        return;
      }

      if (!payload.userId) {
        return;
      }

      // Handle user authentication - widget resolution handled by chat state
      // Pre-fetch user map data and navigate
      void handleUserMapNavigation({
        userId: payload.userId,
        router,
        eventBus,
        trpcUtils,
        createMapMutation,
      });
    });

    return unsubscribe;
  }, [widgets, router, eventBus, trpcUtils, createMapMutation]);

  return null; // This hook only handles side effects
}