"use client";

import { useEffect, useState } from "react";
import { setupKeyboardHandlers } from "~/app/map/Canvas/Interactions";
import { loggers } from "~/lib/debug/debug-logger";
import type { TileData } from "~/app/map/types/tile-data";
import type { CenterInfo } from "~/app/map/Canvas/canvas";
import type { URLInfo } from "~/app/map/types/url-info";
import type { EventBusService } from "~/app/map/Services/EventBus/types";

/** Sets up keyboard handlers for ctrl/shift key detection */
export function useKeyboardHandlers(): void {
  useEffect(() => {
    const handlers = setupKeyboardHandlers();

    document.addEventListener('keydown', handlers.handleKeyDown);
    document.addEventListener('keyup', handlers.handleKeyUp);
    window.addEventListener('blur', handlers.handleWindowBlur);

    return () => {
      document.removeEventListener('keydown', handlers.handleKeyDown);
      document.removeEventListener('keyup', handlers.handleKeyUp);
      window.removeEventListener('blur', handlers.handleWindowBlur);
      handlers.cleanup();
    };
  }, []);
}

/** Listens for tile selection events and returns selected tile ID */
export function useTileSelection(eventBus: EventBusService): string | null {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = eventBus.on('map.tile_selected', (event) => {
      const payload = event.payload as { tileId?: string } | undefined;
      if (payload && typeof payload === 'object' && 'tileId' in payload) {
        const tileId = payload.tileId;
        if (tileId) setSelectedTileId(tileId);
      }
    });

    return unsubscribe;
  }, [eventBus]);

  return selectedTileId;
}

/** Handles client-side hydration state */
export function useHydration(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

interface DebugLoggingParams {
  centerInfo: CenterInfo;
  expandedItemIds: string[];
  urlInfo: URLInfo;
  currentCenter: string;
  currentExpandedItems: string[];
  itemCount: number;
  isLoading: boolean;
  hasError: boolean;
  isDarkMode: boolean;
  isHydrated: boolean;
}

/** Logs component mount/unmount and render events */
export function useDebugLogging(params: DebugLoggingParams): void {
  const { centerInfo, expandedItemIds, urlInfo } = params;

  // Log component mount/unmount
  useEffect(() => {
    loggers.render.canvas('DynamicMapCanvas mounted', {
      centerInfo,
      expandedItemIds: expandedItemIds.length,
      urlInfo,
    });

    return () => {
      loggers.render.canvas('DynamicMapCanvas unmounted');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Only log mount/unmount

  // Log render
  useEffect(() => {
    loggers.render.canvas('DynamicMapCanvas render', {
      center: params.currentCenter,
      expandedItems: params.currentExpandedItems.length,
      itemCount: params.itemCount,
      isLoading: params.isLoading,
      hasError: params.hasError,
      isDarkMode: params.isDarkMode,
      isHydrated: params.isHydrated,
    });
  });
}

/** Determines if loading state should be shown */
export function shouldShowLoadingState(
  isLoading: boolean,
  centerItem: TileData | undefined,
  itemsCount: number
): boolean {
  // Only show loading if:
  // 1. We're loading AND
  // 2. We don't have the center item AND
  // 3. We don't have any items at all (initial load)
  return isLoading && !centerItem && itemsCount === 0;
}
