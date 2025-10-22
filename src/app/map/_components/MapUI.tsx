"use client";

import { DynamicMapCanvas, MapLoadingSpinner } from "~/app/map/Canvas";
import type { TileData } from "~/app/map/types/tile-data";
import { ParentHierarchy } from "~/app/map/Hierarchy";
import { TileActionsProvider } from "~/app/map/Canvas";
import { ChatPanel } from "~/app/map/Chat";
import { useTileSelectForChat } from "~/app/map/_hooks/use-tile-select-for-chat";
import { useMapCache, type MapCacheHook } from '~/app/map/Cache';
import { useRouter } from "next/navigation";
import { useEventBus, type EventBusService } from '~/app/map';
import { CoordSystem } from "~/lib/domains/mapping/utils";
// Removed drag service import - using global service

const CACHE_CONFIG = {
  maxAge: 300000,
  backgroundRefreshInterval: 30000,
  enableOptimisticUpdates: true,
  maxDepth: 3,
};

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

  const handleCreateClick = (_tileData: TileData) => {
    // TODO: Implement create functionality
  };

  return { handleNavigate, handleExpand, handleCompositionToggle, handleEditClick, handleDeleteClick, handleCreateClick };
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
  const userId = 0;
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
      enableBackgroundSync={true}
      syncInterval={30000}
      cacheConfig={CACHE_CONFIG}
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

  // Drag service no longer needed - using global service

  const centerCoordinate = center;
  const loadingError = error;
  const params = _createMapUIParams(centerCoordinate, expandedItems);
  const { handleNavigate, handleExpand, handleCompositionToggle, handleEditClick, handleDeleteClick, handleCreateClick } = _createMapUIHandlers(
    navigateToItem,
    toggleItemExpansionWithURL,
    toggleCompositionExpansionWithURL,
    handleTileSelect,
    eventBus,
    router
  );

  // Composition state checkers
  const hasComposition = (coordId: string): boolean => {
    // Check if tile has a composition child (direction 0)
    const compositionCoordId = CoordSystem.getCompositionCoordFromId(coordId);
    return !!mapItems[compositionCoordId];
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
      onCompositionToggle={handleCompositionToggle}
      hasComposition={hasComposition}
      isCompositionExpanded={isCompositionExpandedForTile}
      canShowComposition={canShowComposition}
    >
      <div className="h-full w-full relative">
        {/* Canvas layer - extends full width, positioned behind chat panel */}
        <div className="absolute inset-0 pr-[130px] overflow-hidden" style={{ zIndex: 1 }}>
          {_renderMapContent(isLoading, centerCoordinate, loadingError, params)}
        </div>

        {/* Chat panel - positioned over the canvas */}
        <div className="absolute left-0 top-0 bottom-0 w-[40%] min-w-[40%]" style={{ zIndex: 10 }}>
          <ChatPanel
            className="h-full"
            // No drag service prop needed
          />
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
      </div>
    </TileActionsProvider>
  );
}