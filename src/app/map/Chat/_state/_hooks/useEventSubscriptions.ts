import { useEffect } from 'react';
import { useEventBus } from '~/app/map/Services/EventBus';
import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import type { AppEvent } from '~/app/map/types';
import { validateAndTransformMapEvent } from '~/app/map/Chat/_state/_events/event.validators';
import { chatSettings } from '~/app/map/Chat/_settings/chat-settings';

/**
 * Hook for managing event bus subscriptions for chat state
 */
export function useEventSubscriptions(dispatch: (event: ChatEvent) => void) {
  const eventBus = useEventBus();

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // Listen to all map events
    const unsubscribeMap = eventBus.on('map.*', (event: AppEvent) => {
      const chatEvent = validateAndTransformMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeMap);

    // Listen to auth events
    const unsubscribeAuth = eventBus.on('auth.*', (event: AppEvent) => {
      const chatEvent = validateAndTransformMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeAuth);

    // Listen to error events
    const unsubscribeError = eventBus.on('error.*', (event: AppEvent) => {
      const chatEvent = validateAndTransformMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeError);
    
    // Listen to ALL events for debug mode (excluding debug.log to avoid duplication)
    const unsubscribeAll = eventBus.on('*', (event: AppEvent) => {
      if (chatSettings.getSettings().messages.debug && event.type !== 'debug.log') {
        // Create a debug message for all bus events
        dispatch({
          type: 'message',
          payload: {
            content: `[DEBUG] EventBus: **${event.type}** | Source: ${event.source} | Data: \`${JSON.stringify(event.payload)}\``,
            actor: 'system',
          },
          id: `debug-${event.type}-${Date.now()}`,
          timestamp: event.timestamp ?? new Date(),
          actor: 'system',
        });
      }
    });
    unsubscribes.push(unsubscribeAll);

    // Cleanup
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [eventBus, dispatch]);
}