"use client";

import { useMemo, useRef, useEffect, useCallback } from "react";
import type { Dispatch } from "react";
import { initialCacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { CacheState, CacheAction } from "~/app/map/Cache/State";
import type { TileData } from "~/app/map/types";
import { globalDragService } from "~/app/map/Services";
import { createDropHandler, createValidationHandler } from "~/app/map/Cache/Lifecycle/_provider/_internals/drag-handlers";

export interface InitialStateConfig {
  initialItems: Record<string, TileData>;
  initialCenter: string | null;
  initialExpandedItems: string[];
  initialCompositionExpanded?: boolean;
  cacheConfig: Partial<CacheState["cacheConfig"]>;
}

/**
 * Hook to initialize cache state with proper handling of remounts
 */
export function useInitialCacheState(config: InitialStateConfig): CacheState {
  const hasInitializedRef = useRef(false);
  const initialItemsCount = Object.keys(config.initialItems).length;

  return useMemo(() => {
    if (hasInitializedRef.current && initialItemsCount === 0) {
      // Detected possible remount with empty items
      return {
        ...initialCacheState,
        currentCenter: config.initialCenter,
        expandedItemIds: config.initialExpandedItems,
        isCompositionExpanded: config.initialCompositionExpanded ?? false,
        lastUpdated: Date.now(),
        cacheConfig: { ...initialCacheState.cacheConfig, ...config.cacheConfig },
        isLoading: false,
      };
    }

    hasInitializedRef.current = true;
    return {
      ...initialCacheState,
      itemsById: config.initialItems,
      currentCenter: config.initialCenter,
      expandedItemIds: config.initialExpandedItems,
      isCompositionExpanded: config.initialCompositionExpanded ?? false,
      lastUpdated: Date.now(),
      cacheConfig: { ...initialCacheState.cacheConfig, ...config.cacheConfig },
      isLoading: false,
    };
  }, [config.initialItems, config.initialCenter, config.initialExpandedItems, config.initialCompositionExpanded, config.cacheConfig, initialItemsCount]);
}

/**
 * Hook to handle initial center setup after mount
 */
export function useInitialCenterSetup(
  initialCenter: string | null,
  currentCenter: string | null,
  dispatch: Dispatch<CacheAction>
): void {
  const hasInitializedCenter = useRef(false);

  useEffect(() => {
    if (initialCenter && !hasInitializedCenter.current && !currentCenter) {
      dispatch(cacheActions.setCenter(initialCenter));
      hasInitializedCenter.current = true;
    }
  }, [initialCenter, currentCenter, dispatch]);
}

/**
 * Hook to initialize global drag service with cache integration
 */
export function useDragServiceSetup(
  userId: number | undefined,
  itemsById: Record<string, TileData>,
  moveItem: (sourceId: string, targetId: string) => Promise<unknown>,
  copyItem: (sourceId: string, targetId: string, destinationParentId: string) => Promise<unknown>
): void {
  useEffect(() => {
    if (!userId) return;

    const dropHandler = createDropHandler(moveItem, copyItem, itemsById);

    globalDragService.initialize({
      currentUserId: userId,
      dropHandler,
      validationHandler: createValidationHandler(itemsById, userId)
    });

    // Listen for simulated drop events from context menu click-to-select
    const handleSimulatedDrop = (event: Event) => {
      const customEvent = event as CustomEvent<{ sourceId: string; targetId: string; operation: 'copy' | 'move' }>;

      void (async () => {
        try {
          await dropHandler(customEvent.detail);
        } catch (error) {
          // Show error to user
          if (error instanceof Error) {
            alert(error.message);
          }
        }
      })();
    };

    document.addEventListener('simulated-drop', handleSimulatedDrop);

    return () => {
      document.removeEventListener('simulated-drop', handleSimulatedDrop);
    };
  }, [userId, moveItem, copyItem, itemsById]);
}

/**
 * Hook to create stable getState function for handlers
 */
export function useGetStateFunction(state: CacheState): () => CacheState {
  const stateRef = useRef(state);
  stateRef.current = state;
  return useCallback((): CacheState => stateRef.current, []);
}
