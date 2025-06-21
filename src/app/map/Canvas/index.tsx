"use client";

import {
  useEffect,
  useState,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAuth } from "~/contexts/AuthContext";
import type { CenterInfo } from "~/app/static/map/Canvas/index";
import { DynamicFrame } from "./frame";
import type { TileScale } from "~/app/static/map/Tile/Base/base";
import { useMapCache } from "../Cache/map-cache";
import type { URLInfo } from "../types/url-info";
import { MapLoadingSkeleton } from "./LifeCycle/loading-skeleton";
import { MapErrorBoundary } from "./LifeCycle/error-boundary";
import { useDragAndDropWithMutation } from "./hooks/useDragAndDropWithMutation";
import type { DragEvent } from "react";

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
  const { mappingUserId } = useAuth();
  
  // Initialize drag and drop functionality
  const {
    dragHandlers,
    canDragTile,
    isDraggingTile,
    isDropTarget,
    isValidDropTarget,
    isDragging,
    getDropOperation,
  } = useDragAndDropWithMutation();

  useEffect(() => {
    // Initialize hydration
    setIsHydrated(true);
  }, []); // Run only once on mount

  // Separate effect for center initialization - only on first mount
  useEffect(() => {
    // Initialize cache state with props if not already set
    if (!center && centerInfo.center) {
      // Initializing center
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

  // Canvas should just display, not manage loading
  // All loading is handled by MapCache internally when center changes

  // Progressive enhancement fallbacks
  if (!isHydrated) {
    return fallback ?? <MapLoadingSkeleton />;
  }
  
  // Don't show loading if we have the center item already
  const centerItem = items[center ?? centerInfo.center];
  if (isLoading && !centerItem) {
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

  // Use dynamic center and expanded items from cache state
  const currentCenter = center ?? centerInfo.center;
  const currentExpandedItems =
    expandedItems.length > 0 ? expandedItems : expandedItemIds;

  // Create dynamic center info
  const dynamicCenterInfo = {
    ...centerInfo,
    center: currentCenter,
  };

  // Rendering canvas with current state

  return (
    <LegacyTileActionsContext.Provider value={tileActions}>
      <div className="relative flex h-full w-full flex-col">
        <div
          data-canvas-id={dynamicCenterInfo.center}
          className="pointer-events-auto grid flex-grow place-items-center overflow-auto p-4"
        >
          <DynamicFrame
            center={dynamicCenterInfo.center}
            mapItems={items}
            baseHexSize={50}
            expandedItemIds={currentExpandedItems}
            scale={3 as TileScale}
            urlInfo={urlInfo}
            currentUserId={mappingUserId}
          />
        </div>
      </div>
    </LegacyTileActionsContext.Provider>
  );
}
