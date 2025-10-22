/**
 * Event callback creators for Canvas tile interactions
 * These functions create handlers that bridge Canvas actions with MapCache operations
 */

import type { EventBusService } from "~/app/map/types/events";

interface CreateCallbacksParams {
  navigateToItem: (coordId: string, options: { pushToHistory: boolean }) => Promise<void>;
  toggleItemExpansionWithURL: (itemId: string) => void;
  eventBus: EventBusService;
}

export function createEventCallbacks(params: CreateCallbacksParams) {
  const { navigateToItem, toggleItemExpansionWithURL, eventBus } = params;

  const handleNavigate = (coordId: string) => {
    void navigateToItem(coordId, { pushToHistory: true }).catch((error) => {
      console.warn("Navigation failed:", error);
    });
  };

  const handleToggleExpansion = (itemId: string, _coordId: string) => {
    toggleItemExpansionWithURL(itemId);
  };

  const handleCreateRequested = (payload: {
    coordId: string;
    parentName?: string;
    parentId?: string;
    parentCoordId?: string;
  }) => {
    eventBus.emit({
      type: 'map.create_requested',
      source: 'canvas',
      payload,
      timestamp: new Date(),
    });
  };

  return {
    handleNavigate,
    handleToggleExpansion,
    handleCreateRequested,
  };
}
