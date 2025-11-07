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
    console.log('[AuthCoordinator] Effect triggered', {
      hasUser: !!user,
      userId: user?.id,
      widgetCount: widgets.length,
      widgetTypes: widgets.map(w => w.type)
    });

    if (!user) {
      console.log('[AuthCoordinator] No user, skipping');
      return;
    }

    // Check if user's email is verified
    // During registration, better-auth might create a session with emailVerified: false
    // We should only navigate if email is verified
    const userWithEmail = user as typeof user & { emailVerified?: boolean };
    console.log('[AuthCoordinator] User email verification status:', {
      emailVerified: userWithEmail.emailVerified,
      userEmail: user.email
    });

    if (userWithEmail.emailVerified === false) {
      console.log('[AuthCoordinator] User has unverified email, keeping login widget open');
      return;
    }

    const loginWidget = widgets.find(w => w.type === 'login');
    console.log('[AuthCoordinator] Login widget status:', {
      hasLoginWidget: !!loginWidget,
      loginWidgetId: loginWidget?.id
    });

    if (!loginWidget) {
      console.log('[AuthCoordinator] No login widget found, skipping navigation');
      return;
    }

    // Handle user authentication - widget resolution handled by chat state
    // Pre-fetch user map data and navigate
    console.log('[AuthCoordinator] Calling handleUserMapNavigation');
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