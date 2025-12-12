"use client";

import { useMemo, type ReactNode } from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
// CenterInfo type definition moved locally
export interface CenterInfo {
  center: string;
  rootItemId: number;
  userId: string;
  groupId: number;
}
import type { TileScale } from "~/app/map/Canvas/Tile";
import { useMapCache } from '~/app/map/Cache';
import type { URLInfo } from "~/app/map/types/url-info";
import { CanvasLoadingState } from "~/app/map/Canvas/_internals/CanvasStates/CanvasLoadingState";
import { CanvasErrorState } from "~/app/map/Canvas/_internals/CanvasStates/CanvasErrorState";
import { CanvasTileGrid } from "~/app/map/Canvas/_internals/CanvasTileGrid";
import { useEventBus } from '~/app/map';
import { createTileActions, createEventCallbacks } from "~/app/map/Canvas/Interactions";
import {
  _useKeyboardHandlers,
  _useTileSelection,
  _useHydration,
  _useDebugLogging,
  _shouldShowLoadingState,
} from "~/app/map/Canvas/_internals/canvas-hooks";

// Import all shared contexts to ensure tiles and canvas use the same context instances
import {
  LegacyTileActionsContext,
  // useLegacyTileActionsContext, // Removed unused import
  // type LegacyTileActionsContextValue, // Removed unused import
  CanvasThemeContext,
  // useCanvasTheme, // Removed unused import
  // type ThemeContextValue // Removed unused import
} from '~/app/map/Canvas/_internals/contexts';

interface DynamicMapCanvasProps {
  centerInfo: CenterInfo;
  expandedItemIds: string[];
  urlInfo: URLInfo;
  isDarkMode?: boolean;
  showNeighbors?: boolean;
  fallback?: ReactNode;
  errorBoundary?: ReactNode;
}

export function DynamicMapCanvas({
  centerInfo,
  expandedItemIds,
  urlInfo,
  isDarkMode = false,
  showNeighbors = true,
  fallback,
  errorBoundary,
}: DynamicMapCanvasProps) {
  const {
    items, center, expandedItems, isCompositionExpanded,
    isLoading, error, invalidateRegion, navigateToItem, toggleItemExpansionWithURL,
  } = useMapCache();
  const { mappingUserId } = useUnifiedAuth();
  const eventBus = useEventBus();

  // Use extracted hooks for setup
  _useKeyboardHandlers();
  const selectedTileId = _useTileSelection(eventBus);
  const isHydrated = _useHydration();

  // Derived state
  const currentCenter = center ?? centerInfo.center;
  const currentExpandedItems = expandedItems.length > 0 ? expandedItems : expandedItemIds;

  // Debug logging
  _useDebugLogging({
    centerInfo, expandedItemIds, urlInfo, currentCenter, currentExpandedItems,
    itemCount: Object.keys(items).length, isLoading, hasError: !!error, isDarkMode, isHydrated,
  });

  // Simplified tile actions (DOM-based drag handles its own logic)
  const tileActions = useMemo(() => createTileActions(), []);

  // Early returns for loading/error states
  if (!isHydrated) {
    return <CanvasLoadingState fallback={fallback} />;
  }

  const centerItem = items[currentCenter];
  if (_shouldShowLoadingState(isLoading, centerItem, Object.keys(items).length)) {
    return <CanvasLoadingState fallback={fallback} />;
  }

  if (error) {
    return (
      <CanvasErrorState
        error={error}
        centerInfo={centerInfo.center}
        errorBoundary={errorBoundary}
        onRetry={invalidateRegion}
      />
    );
  }

  // Create event callbacks for tile interactions
  const callbacks = createEventCallbacks({ navigateToItem, toggleItemExpansionWithURL, eventBus });

  return (
    <CanvasThemeContext.Provider value={{ isDarkMode }}>
      <LegacyTileActionsContext.Provider value={tileActions}>
        <CanvasTileGrid
          centerInfo={currentCenter}
          items={items}
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
        />
      </LegacyTileActionsContext.Provider>
    </CanvasThemeContext.Provider>
  );
}
