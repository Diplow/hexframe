"use client";

import {
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
// CenterInfo type definition moved locally
export interface CenterInfo {
  center: string;
  rootItemId: number;
  userId: number;
  groupId: number;
}
import { DynamicFrame } from "~/app/map/Canvas/frame";
import type { TileScale } from "~/app/map/Canvas/Tile";
import { useMapCache } from '~/app/map/Cache';
import type { URLInfo } from "~/app/map/types/url-info";
import { MapLoadingSkeleton } from "~/app/map/Canvas/LifeCycle/loading-skeleton";
import { MapErrorBoundary } from "~/app/map/Canvas/LifeCycle/error-boundary";
import { useDragAndDrop } from "~/app/map/Canvas/hooks/useDragAndDrop";
import type { DragEvent } from "react";
import { loggers } from "~/lib/debug/debug-logger";
import { useEventBus } from '~/app/map';

// Import all shared contexts to ensure tiles and canvas use the same context instances
import { 
  LegacyTileActionsContext, 
  useLegacyTileActionsContext,
  type LegacyTileActionsContextValue,
  CanvasThemeContext,
  useCanvasTheme,
  type ThemeContextValue
} from './_shared/contexts';

interface DynamicMapCanvasProps {
  centerInfo: CenterInfo;
  expandedItemIds: string[];
  urlInfo: URLInfo;

  // Theme
  isDarkMode?: boolean;

  // Progressive enhancement options
  fallback?: ReactNode;
  errorBoundary?: ReactNode;
  enableBackgroundSync?: boolean;
  syncInterval?: number;

  // Cache control
  cacheConfig?: {
    maxAge: number;
    backgroundRefreshInterval: number;
    enableOptimisticUpdates: boolean;
    maxDepth: number;
  };
}

export function DynamicMapCanvas({
  centerInfo,
  expandedItemIds,
  urlInfo,
  isDarkMode = false,
  fallback,
  errorBoundary,
  enableBackgroundSync: _enableBackgroundSync = true,
  syncInterval: _syncInterval = 30000,
  cacheConfig: _cacheConfig,
}: DynamicMapCanvasProps) {
  const {
    items,
    center,
    expandedItems,
    isLoading,
    error,
    invalidateRegion,
    navigateToItem,
    toggleItemExpansionWithURL,
  } = useMapCache();
  const [isHydrated, setIsHydrated] = useState(false);
  // isDarkMode is now passed as prop
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const { mappingUserId } = useUnifiedAuth();
  const eventBus = useEventBus();
  
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
  
  // Listen for tile selection events
  useEffect(() => {
    const unsubscribe = eventBus.on('map.tile_selected', (event) => {
      // Update selected tile when a tile is selected
      if ('payload' in event && event.payload && typeof event.payload === 'object' && 'tileId' in event.payload) {
        const tileId = (event.payload as { tileId: string }).tileId;
        setSelectedTileId(tileId);
      }
    });
    
    return unsubscribe;
  }, [eventBus]);
  
  // Initialize drag and drop functionality
  const {
    dragHandlers,
    canDragTile,
    isDraggingTile,
    isDropTarget,
    isValidDropTarget,
    isDragging,
    getDropOperation,
  } = useDragAndDrop();

  useEffect(() => {
    // Initialize hydration
    setIsHydrated(true);
  }, []); // Run only once on mount

  // Removed center initialization effect - MapCacheProvider handles initial center
  // The Canvas should not override the center that was set during provider initialization

  // Tile actions with drag and drop support
  const tileActions = useMemo(
    () => ({
      handleTileClick: (_coordId: string, _event: MouseEvent) => {
        // handleTileClick called
        // Default tile click behavior (can be enhanced later)
      },
      handleTileHover: (_coordId: string, _isHovering: boolean) => {
        // handleTileHover called
        // TODO: Handle hover state
      },
      onCreateTileRequested: (_coordId: string) => {
        // Create tile requested
        // This callback is used by empty tiles to signal create requests
      },
      // Drag and drop functionality
      dragHandlers,
      canDragTile,
      isDraggingTile,
      isDropTarget,
      isValidDropTarget,
      isDragging,
      getDropOperation,
    }),
    [dragHandlers, canDragTile, isDraggingTile, isDropTarget, isValidDropTarget, isDragging, getDropOperation],
  );

  // Use dynamic center and expanded items from cache state
  const currentCenter = center ?? centerInfo.center;
  const currentExpandedItems =
    expandedItems.length > 0 ? expandedItems : expandedItemIds;

  // Log render - now completely isolated and won't cause re-renders
  useEffect(() => {
    loggers.render.canvas('DynamicMapCanvas render', {
      center: currentCenter,
      expandedItems: currentExpandedItems.length,
      itemCount: Object.keys(items).length,
      isLoading,
      hasError: !!error,
      isDarkMode,
      isHydrated,
    });
    
  });

  // Canvas should just display, not manage loading
  // All loading is handled by MapCache internally when center changes

  // Progressive enhancement fallbacks
  if (!isHydrated) {
    return fallback ?? <MapLoadingSkeleton />;
  }
  
  // Get the center item to check if we have data
  const centerItem = items[center ?? centerInfo.center];
  
  // Only show loading if:
  // 1. We're loading AND
  // 2. We don't have the center item AND  
  // 3. We don't have any items at all (initial load)
  const shouldShowLoading = isLoading && !centerItem && Object.keys(items).length === 0;
  
  if (shouldShowLoading) {
    return fallback ?? <MapLoadingSkeleton />;
  }

  if (error) {
    return (
      errorBoundary ?? (
        <MapErrorBoundary
          error={error}
          onRetry={() => invalidateRegion(centerInfo.center)}
        />
      )
    );
  }

  // Create dynamic center info
  const dynamicCenterInfo = {
    ...centerInfo,
    center: currentCenter,
  };

  // Callback functions for tile actions
  const handleNavigate = (coordId: string) => {
    void navigateToItem(coordId, { pushToHistory: true }).catch((error) => {
      console.warn("Navigation failed:", error);
    });
  };

  const handleToggleExpansion = (itemId: string, coordId: string) => {
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

  // Rendering canvas with current state

  return (
    <CanvasThemeContext.Provider value={{ isDarkMode }}>
      <LegacyTileActionsContext.Provider value={tileActions}>
        <div className="relative flex h-full w-full flex-col">
          <div
            data-canvas-id={dynamicCenterInfo.center}
            className="pointer-events-auto grid flex-grow place-items-center overflow-auto py-4"
          >
            <DynamicFrame
              center={dynamicCenterInfo.center}
              mapItems={items}
              baseHexSize={50}
              expandedItemIds={currentExpandedItems}
              scale={3 as TileScale}
              urlInfo={urlInfo}
              interactive={true}
              currentUserId={mappingUserId ?? undefined}
              selectedTileId={selectedTileId}
              onNavigate={handleNavigate}
              onToggleExpansion={handleToggleExpansion}
              onCreateRequested={handleCreateRequested}
            />
          </div>
        </div>
      </LegacyTileActionsContext.Provider>
    </CanvasThemeContext.Provider>
  );
}
