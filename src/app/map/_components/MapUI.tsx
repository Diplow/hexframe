"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { DynamicMapCanvas, MapLoadingSpinner } from "~/app/map/Canvas";
import type { TileData } from "~/app/map/types/tile-data";
import { ParentHierarchy } from "~/app/map/Hierarchy";
import { TileActionsProvider } from "~/app/map/Canvas";
import { useTileSelectForChat } from "~/app/map/_hooks/use-tile-select-for-chat";
import { useMapCache, type MapCacheHook } from '~/app/map/Cache';
import { useRouter } from "next/navigation";
import { useEventBus, type EventBusService } from '~/app/map';
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { Visibility } from '~/lib/domains/mapping/utils';
import { api } from "~/commons/trpc/react";

interface MapUIProps {
  centerParam?: string;
}

function _createMapUIHandlers(
  navigateToItem: MapCacheHook['navigateToItem'],
  toggleItemExpansionWithURL: MapCacheHook['toggleItemExpansionWithURL'],
  toggleCompositionExpansionWithURL: MapCacheHook['toggleCompositionExpansionWithURL'],
  handleTileSelect: (tileData: TileData, options?: { openInEditMode?: boolean }) => void,
  eventBus: EventBusService,
  router: ReturnType<typeof useRouter>
) {
  const handleNavigate = (tileData: TileData) => {
    void navigateToItem(tileData.metadata.coordId, { pushToHistory: true }).catch((error) => {
      console.warn("Navigation failed, falling back to page navigation", error);
      router.push(`/map?center=${tileData.metadata.dbId}`);
    });
  };

  const handleExpand = (tileData: TileData) => {
    toggleItemExpansionWithURL(tileData.metadata.dbId);
  };

  const handleCompositionToggle = (_tileData: TileData) => {
    // No need for coordId - composition only applies to center
    toggleCompositionExpansionWithURL();
  };

  const handleEditClick = (tileData: TileData) => {
    handleTileSelect(tileData, { openInEditMode: true });
  };

  const handleDeleteClick = (tileData: TileData) => {
    eventBus.emit({
      type: 'map.delete_requested',
      source: 'canvas',
      payload: {
        tileId: tileData.metadata.coordId,
        tileName: tileData.data.title,
      },
      timestamp: new Date(),
    });
  };

  const handleDeleteChildrenClick = (tileData: TileData) => {
    eventBus.emit({
      type: 'map.delete_children_requested',
      source: 'canvas',
      payload: {
        tileId: tileData.metadata.coordId,
        tileName: tileData.data.title,
        directionType: 'structural',
      },
      timestamp: new Date(),
    });
  };

  const handleDeleteComposedClick = (tileData: TileData) => {
    eventBus.emit({
      type: 'map.delete_children_requested',
      source: 'canvas',
      payload: {
        tileId: tileData.metadata.coordId,
        tileName: tileData.data.title,
        directionType: 'composed',
      },
      timestamp: new Date(),
    });
  };

  const handleDeleteExecutionHistoryClick = (tileData: TileData) => {
    eventBus.emit({
      type: 'map.delete_children_requested',
      source: 'canvas',
      payload: {
        tileId: tileData.metadata.coordId,
        tileName: tileData.data.title,
        directionType: 'hexPlan',
      },
      timestamp: new Date(),
    });
  };

  const handleCreateClick = (_tileData: TileData) => {
    // TODO: Implement create functionality
  };

  return {
    handleNavigate,
    handleExpand,
    handleCompositionToggle,
    handleEditClick,
    handleDeleteClick,
    handleDeleteChildrenClick,
    handleDeleteComposedClick,
    handleDeleteExecutionHistoryClick,
    handleCreateClick,
  };
}

function _createMapUIParams(
  centerCoordinate: string | null,
  expandedItems: string[]
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries({
      center: centerCoordinate ?? undefined,
      scale: undefined,
      expandedItems: expandedItems.length > 0 ? expandedItems.join(',') : undefined,
      focus: undefined,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );
}

function _renderMapContent(
  isLoading: boolean,
  centerCoordinate: string | null,
  loadingError: Error | null,
  params: Record<string, string | undefined>
) {
  if (isLoading || !centerCoordinate) {
    return <MapLoadingSpinner message="Loading map..." state="initializing" />;
  }

  if (loadingError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Map not found</h1>
          <p className="mt-2 text-neutral-600">
            {loadingError.message ?? "Unable to load the requested map"}
          </p>
        </div>
      </div>
    );
  }

  const rootItemId = 0;
  const userId = "0";
  const groupId = 0;

  return (
    <DynamicMapCanvas
      centerInfo={{
        center: centerCoordinate,
        rootItemId,
        userId,
        groupId,
      }}
      expandedItemIds={params.expandedItems?.split(",") ?? []}
      urlInfo={{
        pathname: `/map`,
        searchParamsString: new URLSearchParams(params as Record<string, string>).toString(),
        rootItemId: centerCoordinate,
        scale: params.scale,
        expandedItems: params.expandedItems,
        focus: params.focus,
      }}
    />
  );
}

export function MapUI({ centerParam: _centerParam }: MapUIProps) {
  const { handleTileSelect } = useTileSelectForChat();
  const cache = useMapCache();
  const {
    navigateToItem,
    toggleItemExpansionWithURL,
    toggleCompositionExpansionWithURL,
    center,
    isLoading,
    error,
    expandedItems,
    isCompositionExpanded,
    items: mapItems,
  } = cache;
  const router = useRouter();
  const eventBus = useEventBus();

  // Favorites state and mutations
  const [favoritedMapItemIds, setFavoritedMapItemIds] = useState<Set<string>>(new Set());
  const favoritesQuery = api.favorites.list.useQuery(undefined);

  // Sync favorites data to local state when query data changes
  useEffect(() => {
    if (favoritesQuery.data) {
      setFavoritedMapItemIds(new Set(favoritesQuery.data.map(f => f.mapItemId)));
    }
  }, [favoritesQuery.data]);
  const addFavoriteMutation = api.favorites.add.useMutation({
    onSuccess: (newFavorite) => {
      setFavoritedMapItemIds(prev => new Set([...prev, newFavorite.mapItemId]));
      void favoritesQuery.refetch();
    },
    onError: (error) => {
      console.error("Failed to add favorite:", error);
    },
  });
  const removeFavoriteMutation = api.favorites.removeByMapItem.useMutation({
    onSuccess: (_data, variables) => {
      setFavoritedMapItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.mapItemId);
        return newSet;
      });
      void favoritesQuery.refetch();
    },
    onError: (error) => {
      console.error("Failed to remove favorite:", error);
    },
  });

  // Drag service no longer needed - using global service

  const centerCoordinate = center;
  const loadingError = error;
  const params = _createMapUIParams(centerCoordinate, expandedItems);
  const {
    handleNavigate,
    handleExpand,
    handleCompositionToggle,
    handleEditClick,
    handleDeleteClick,
    handleDeleteChildrenClick,
    handleDeleteComposedClick,
    handleDeleteExecutionHistoryClick,
    handleCreateClick,
  } = _createMapUIHandlers(
    navigateToItem,
    toggleItemExpansionWithURL,
    toggleCompositionExpansionWithURL,
    handleTileSelect,
    eventBus,
    router
  );

  const handleSetVisibility = useCallback((tileData: TileData, visibility: Visibility) => {
    void cache.updateItemOptimistic(tileData.metadata.coordId, {
      visibility,
    });
  }, [cache]);

  const handleSetVisibilityWithDescendants = useCallback((tileData: TileData, visibility: Visibility) => {
    // Use optimized backend call that updates tile and all descendants in a single request
    void cache.updateVisibilityWithDescendantsOptimistic(tileData.metadata.coordId, visibility);
  }, [cache]);

  // Favorites handlers
  const handleAddFavorite = useCallback((tileData: TileData) => {
    // Generate a shortcut name from the tile title (sanitized)
    const baseName = tileData.data.title
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 30) || 'favorite';

    const shortcutName = `${baseName}_${Date.now()}`;

    addFavoriteMutation.mutate({
      mapItemId: tileData.metadata.coordId,
      shortcutName,
    });
  }, [addFavoriteMutation]);

  const handleRemoveFavorite = useCallback((tileData: TileData) => {
    removeFavoriteMutation.mutate({
      mapItemId: tileData.metadata.coordId,
    });
  }, [removeFavoriteMutation]);

  const isFavorited = useCallback((coordId: string): boolean => {
    return favoritedMapItemIds.has(coordId);
  }, [favoritedMapItemIds]);

  const handleEditShortcut = useCallback((tileData: TileData) => {
    // Emit event to open favorites widget with this tile's shortcut in edit mode
    eventBus.emit({
      type: 'map.favorites_widget_requested',
      source: 'canvas',
      payload: {
        editShortcutForMapItemId: tileData.metadata.coordId,
      },
      timestamp: new Date(),
    });
  }, [eventBus]);

  // Composition state checkers
  const hasComposition = (coordId: string): boolean => {
    // Check if tile has any composed children (negative directions)
    const composedChildCoordIds = CoordSystem.getComposedChildCoordsFromId(coordId);
    return composedChildCoordIds.some(childCoordId => !!mapItems[childCoordId]);
  };

  const isCompositionExpandedForTile = (coordId: string): boolean => {
    // Only the center tile can be composition expanded
    if (coordId !== centerCoordinate) return false;
    return isCompositionExpanded;
  };

  const canShowComposition = (tileData: TileData): boolean => {
    // Can only show composition for center tiles
    const isCenterTile = tileData.metadata.coordId === centerCoordinate;
    if (!isCenterTile) return false;

    // User tiles (tiles with empty path) cannot have composition
    const isUserTile = tileData.metadata.coordinates.path.length === 0;
    if (isUserTile) return false;

    // Check if tile has composition children
    const hasComp = hasComposition(tileData.metadata.coordId);

    // Get current user ID from the tile's coordinates
    // The userId is embedded in the coordinates
    const currentUserId = tileData.metadata.coordinates.userId.toString();
    const isOwner = tileData.metadata.ownerId === currentUserId;

    // Show composition if: (1) tile has composition children, OR (2) user owns the tile (to allow creation)
    return hasComp || isOwner;
  };

  return (
    <TileActionsProvider
      onSelectClick={handleTileSelect}
      onNavigateClick={handleNavigate}
      onExpandClick={handleExpand}
      onCreateClick={handleCreateClick}
      onEditClick={handleEditClick}
      onDeleteClick={handleDeleteClick}
      onDeleteChildrenClick={handleDeleteChildrenClick}
      onDeleteComposedClick={handleDeleteComposedClick}
      onDeleteExecutionHistoryClick={handleDeleteExecutionHistoryClick}
      onCompositionToggle={handleCompositionToggle}
      onSetVisibility={handleSetVisibility}
      onSetVisibilityWithDescendants={handleSetVisibilityWithDescendants}
      hasComposition={hasComposition}
      isCompositionExpanded={isCompositionExpandedForTile}
      canShowComposition={canShowComposition}
      onAddFavorite={handleAddFavorite}
      onRemoveFavorite={handleRemoveFavorite}
      isFavorited={isFavorited}
      onEditShortcut={handleEditShortcut}
    >
      <>
        {/* Canvas layer - extends full width, positioned behind chat panel */}
        <div className="absolute inset-0 pr-[130px] overflow-hidden" style={{ zIndex: 1 }}>
          {_renderMapContent(isLoading, centerCoordinate, loadingError, params)}
        </div>

        {/* Parent hierarchy - positioned over everything on the right */}
        <div className="absolute right-0 top-0 bottom-0 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border-l border-[color:var(--stroke-color-950)]" style={{ zIndex: 10 }}>
          <ParentHierarchy
            centerCoordId={centerCoordinate ?? ""}
            items={{}}
            urlInfo={{
              pathname: `/map`,
              searchParamsString: new URLSearchParams(params as Record<string, string>).toString(),
              rootItemId: centerCoordinate ?? "",
              scale: params.scale,
              expandedItems: params.expandedItems,
              focus: params.focus,
            }}
          />
        </div>
      </>
    </TileActionsProvider>
  );
}