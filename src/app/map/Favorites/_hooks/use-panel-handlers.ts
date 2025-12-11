'use client';

import { useState, useCallback } from 'react';
import { useEventBus } from '~/app/map/Services/EventBus';
import type { FavoritesSortOrder } from '~/app/map/Favorites/_utils';

export interface UsePanelHandlersOptions {
  confirmOnRemove?: boolean;
  onNavigate?: (mapItemId: string) => void;
  onRemove?: (favoriteId: string) => void;
  onSortChange?: (sortOrder: FavoritesSortOrder) => void;
}

export interface UsePanelHandlersReturn {
  sortOrder: FavoritesSortOrder;
  pendingRemoveId: string | null;
  handleSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleNavigate: (mapItemId: string) => void;
  handleRemove: (favoriteId: string) => void;
  confirmRemove: () => void;
  cancelRemove: () => void;
}

/**
 * Hook for panel event handlers including navigation and remove logic.
 */
export function usePanelHandlers(
  options: UsePanelHandlersOptions
): UsePanelHandlersReturn {
  const { confirmOnRemove = false, onNavigate, onRemove, onSortChange } = options;
  const eventBus = useEventBus();
  const [sortOrder, setSortOrder] = useState<FavoritesSortOrder>('name-asc');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newSortOrder = event.target.value as FavoritesSortOrder;
      setSortOrder(newSortOrder);
      onSortChange?.(newSortOrder);
    },
    [onSortChange]
  );

  const handleNavigate = useCallback(
    (mapItemId: string) => {
      eventBus.emit({
        type: 'favorites.navigate',
        payload: { mapItemId },
        source: 'favorites' as const,
        timestamp: new Date(),
      });
      onNavigate?.(mapItemId);
    },
    [eventBus, onNavigate]
  );

  const handleRemove = useCallback(
    (favoriteId: string) => {
      if (confirmOnRemove) {
        setPendingRemoveId(favoriteId);
      } else {
        onRemove?.(favoriteId);
      }
    },
    [confirmOnRemove, onRemove]
  );

  const confirmRemove = useCallback(() => {
    if (pendingRemoveId) {
      onRemove?.(pendingRemoveId);
      setPendingRemoveId(null);
    }
  }, [pendingRemoveId, onRemove]);

  const cancelRemove = useCallback(() => setPendingRemoveId(null), []);

  return {
    sortOrder,
    pendingRemoveId,
    handleSortChange,
    handleNavigate,
    handleRemove,
    confirmRemove,
    cancelRemove,
  };
}
