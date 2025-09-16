import { useMemo } from 'react';
import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import { createMessageOperations } from '~/app/map/Chat/_state/_operations/message-operations';
import { createWidgetOperations } from '~/app/map/Chat/_state/_operations/widget-operations';
import { createTileOperations } from '~/app/map/Chat/_state/_operations/tile-operations';
import { createGeneralOperations } from '~/app/map/Chat/_state/_operations/general-operations';

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