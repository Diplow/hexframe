"use client";

import {
  useEffect,
  useState,
  useMemo,
  createContext,
  useContext,
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
import { DynamicFrame } from "./frame";
import type { TileScale } from "~/app/map/Canvas/base/BaseTileLayout";
import { useMapCache } from '~/app/map/Cache/interface';
import type { URLInfo } from "../types/url-info";
import { MapLoadingSkeleton } from "./LifeCycle/loading-skeleton";
import { MapErrorBoundary } from "./LifeCycle/error-boundary";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import type { DragEvent } from "react";
import { loggers } from "~/lib/debug/debug-logger";
import { useEventBus } from "../Services/EventBus/event-bus-context";

// Theme Context for tiles
export interface ThemeContextValue {
  isDarkMode: boolean;
}

export const CanvasThemeContext = createContext<ThemeContextValue>({
  isDarkMode: false,
});

export function useCanvasTheme() {
  return useContext(CanvasThemeContext);
}

// Legacy Tile Actions Context for drag and drop
export interface LegacyTileActionsContextValue {
  handleTileClick: (coordId: string, event: MouseEvent) => void;
  handleTileHover: (coordId: string, isHovering: boolean) => void;
  onCreateTileRequested?: (coordId: string) => void;
  // Drag and drop handlers
  dragHandlers: {
    onDragStart: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
    onDragOver: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
    onDragLeave: () => void;
    onDrop: (coordId: string, event: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };
  canDragTile: (coordId: string) => boolean;
  isDraggingTile: (coordId: string) => boolean;
  isDropTarget: (coordId: string) => boolean;
  isValidDropTarget: (coordId: string) => boolean;
  isDragging: boolean;
  getDropOperation: (coordId: string) => 'move' | 'swap' | null;
}

export const LegacyTileActionsContext = createContext<LegacyTileActionsContextValue | null>(
  null,
);

export function useLegacyTileActionsContext() {
  const context = useContext(LegacyTileActionsContext);

  if (!context) {
    console.error(
      "useLegacyTileActionsContext: No context found! Component is not within DynamicMapCanvas",
    );
    throw new Error(
      "useLegacyTileActionsContext must be used within DynamicMapCanvas",
    );
  }
  return context;
}

interface DynamicMapCanvasProps {
  centerInfo: CenterInfo;
  expandedItemIds: string[];
  urlInfo: URLInfo;

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
    updateCenter,
  } = useMapCache();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
    
    // Check initial dark mode state
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []); // Run only once on mount

  // Separate effect for center initialization - only on first mount
  useEffect(() => {
    // Initialize cache state with props if not already set
    if (!center && centerInfo.center) {
      loggers.render.canvas('DynamicMapCanvas initializing center', {
        newCenter: centerInfo.center,
      });
      updateCenter(centerInfo.center);
    }
  }, [center, centerInfo.center, updateCenter]); // Include dependencies

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
            />
          </div>
        </div>
      </LegacyTileActionsContext.Provider>
    </CanvasThemeContext.Provider>
  );
}
