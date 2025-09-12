import { useMemo } from 'react';
import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import { createMessageOperations } from './message-operations';
import { createWidgetOperations } from './widget-operations';
import { createTileOperations } from './tile-operations';
import { createGeneralOperations } from './general-operations';

/**
 * Custom hook for chat domain operations
 */
export function useChatOperations(dispatch: (event: ChatEvent) => void) {
  return useMemo(() => ({
    ...createMessageOperations(dispatch),
    ...createWidgetOperations(dispatch),
    ...createTileOperations(dispatch),
    ...createGeneralOperations(dispatch),
  }), [dispatch]);
}