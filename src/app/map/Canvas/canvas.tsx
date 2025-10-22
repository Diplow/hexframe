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
import { MapLoadingSpinner } from "~/app/map/Canvas/LifeCycle/loading-spinner";
import { MapErrorBoundary } from "~/app/map/Canvas/LifeCycle/error-boundary";
// Removed unused drag imports
import { loggers } from "~/lib/debug/debug-logger";
import { useEventBus } from '~/app/map';
import { setupKeyboardHandlers } from "~/app/map/Canvas/_internals/keyboard-handlers";
import { createTileActions } from "~/app/map/Canvas/_internals/tile-actions";
import { shouldShowLoadingState } from "~/app/map/Canvas/_internals/loading-state-helpers";
import { createEventCallbacks } from "~/app/map/Canvas/_internals/event-callbacks";

// Import all shared contexts to ensure tiles and canvas use the same context instances
import {
  LegacyTileActionsContext,
  // useLegacyTileActionsContext, // Removed unused import
  // type LegacyTileActionsContextValue, // Removed unused import
  CanvasThemeContext,
  // useCanvasTheme, // Removed unused import
  // type ThemeContextValue // Removed unused import
} from '~/app/map/Canvas/_shared/contexts';

interface DynamicMapCanvasProps {
  centerInfo: CenterInfo;
  expandedItemIds: string[];
  urlInfo: URLInfo;

  // Theme
  isDarkMode?: boolean;

  // Neighbor display
  showNeighbors?: boolean;

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

  // Drag service no longer needed - handled by global service
}

export function DynamicMapCanvas({
  centerInfo,
  expandedItemIds,
  urlInfo,
  isDarkMode = false,
  showNeighbors = true,
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
    isCompositionExpanded,
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

  // Ctrl and Shift key detection for navigation and expansion cursors
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
  
  // Drag service no longer passed as prop - using global service

  useEffect(() => {
    // Initialize hydration
    setIsHydrated(true);
  }, []); // Run only once on mount

  // Removed center initialization effect - MapCacheProvider handles initial center
  // The Canvas should not override the center that was set during provider initialization

  // Simplified tile actions (DOM-based drag handles its own logic)
  const tileActions = useMemo(() => createTileActions(), []);

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
    return fallback ?? <MapLoadingSpinner />;
  }
  
  // Get the center item to check if we have data
  const centerItem = items[center ?? centerInfo.center];

  if (shouldShowLoadingState(isLoading, centerItem, Object.keys(items).length)) {
    return fallback ?? <MapLoadingSpinner />;
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

  // Create event callbacks for tile interactions
  const callbacks = createEventCallbacks({
    navigateToItem,
    toggleItemExpansionWithURL,
    eventBus,
  });

  // Rendering canvas with current state

  return (
    <CanvasThemeContext.Provider value={{ isDarkMode }}>
      <LegacyTileActionsContext.Provider value={tileActions}>
        <div className="relative flex h-full w-full flex-col">
          <div
            data-canvas-id={dynamicCenterInfo.center}
            className="pointer-events-auto grid flex-grow py-4 overflow-visible"
            style={{
              placeItems: 'center',
              // Offset the center point to account for chat panel (40% of width)
              // This shifts the center tile to appear centered in the right 60% area
              transform: 'translateX(20%)'
            }}
            // No drag handlers needed - global service handles everything
          >
            <DynamicFrame
              center={dynamicCenterInfo.center}
              mapItems={items}
              baseHexSize={50}
              expandedItemIds={currentExpandedItems}
              isCompositionExpanded={isCompositionExpanded}
              scale={3 as TileScale}
              urlInfo={urlInfo}
              interactive={true}
              currentUserId={mappingUserId ?? undefined}
              selectedTileId={selectedTileId}
              showNeighbors={showNeighbors}
              onNavigate={callbacks.handleNavigate}
              onToggleExpansion={callbacks.handleToggleExpansion}
              onCreateRequested={callbacks.handleCreateRequested}
              // No drag service prop needed - using global service
            />
          </div>
          {/* Drag debug UI removed - handled by global service with CSS */}
        </div>
      </LegacyTileActionsContext.Provider>
    </CanvasThemeContext.Provider>
  );
}
