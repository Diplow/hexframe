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
      console.log('[AuthCoordinator] auth.login event received', {
        userId: payload.userId,
        userName: payload.userName,
        widgetCount: widgets.length,
        widgetTypes: widgets.map(w => w.type)
      });

      const loginWidget = widgets.find(w => w.type === 'login');
      console.log('[AuthCoordinator] Login widget status:', {
        hasLoginWidget: !!loginWidget,
        loginWidgetId: loginWidget?.id
      });

      if (!loginWidget) {
        console.log('[AuthCoordinator] No login widget found, skipping navigation');
        return;
      }

      if (!payload.userId) {
        console.log('[AuthCoordinator] No userId in event payload, skipping navigation');
        return;
      }

      // Handle user authentication - widget resolution handled by chat state
      // Pre-fetch user map data and navigate
      console.log('[AuthCoordinator] Calling handleUserMapNavigation');
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