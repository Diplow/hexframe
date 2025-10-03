/**
 * DynamicFrameCore - Core frame rendering logic without circular dependencies
 *
 * This module contains the core DynamicFrame implementation that can be used
 * by both frame.tsx and NeighborTiles.tsx without creating circular imports.
 */

import { DynamicItemTile, getColorFromItem, DynamicBaseTileLayout, DynamicEmptyTile } from "~/app/map/Canvas/Tile";
import type { TileScale } from "~/app/map/Canvas/Tile";
import type { TileData } from "~/app/map/types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { URLInfo } from "~/app/map/types/url-info";
import { useCanvasTheme } from "~/app/map/Canvas";
import { useEffect } from "react";
import { loggers } from "~/lib/debug/debug-logger";

const CHILD_INDICES = [1, 2, 3, 4, 5, 6] as const;

export interface DynamicFrameCoreProps {
  center: string;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  scale?: TileScale;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: number;
  selectedTileId?: string | null;
  showNeighbors?: boolean;
  // Callbacks for tile actions
  onNavigate?: (coordId: string) => void;
  onToggleExpansion?: (itemId: string, coordId: string) => void;
  onCreateRequested?: (payload: {
    coordId: string;
    parentName?: string;
    parentId?: string;
    parentCoordId?: string;
  }) => void;
  // Render prop for neighbors - breaks circular dependency
  renderNeighbors?: (centerItem: TileData, props: {
    mapItems: Record<string, TileData>;
    baseHexSize?: number;
    scale: TileScale;
    urlInfo: URLInfo;
    expandedItemIds?: string[];
    isDarkMode: boolean;
    interactive?: boolean;
    currentUserId?: number;
    selectedTileId?: string | null;
    onNavigate?: (coordId: string) => void;
    onToggleExpansion?: (itemId: string, coordId: string) => void;
    onCreateRequested?: (payload: {
      coordId: string;
      parentName?: string;
      parentId?: string;
      parentCoordId?: string;
    }) => void;
  }) => React.ReactNode;
}

/**
 * Core DynamicFrame implementation - renders frames without neighbor dependencies
 */
export const DynamicFrameCore = (props: DynamicFrameCoreProps) => {
  const { center, mapItems, scale = 3 } = props;
  const centerItem = mapItems[center];
  const { isDarkMode } = useCanvasTheme();

  // Log frame render
  useEffect(() => {
    loggers.render.canvas('DynamicFrameCore render', {
      center,
      scale,
      hasItem: !!centerItem,
      isExpanded: centerItem ? props.expandedItemIds?.includes(centerItem.metadata.dbId) ?? false : false,
      childCount: centerItem ? getChildCoordIds(centerItem).filter(id => mapItems[id]).length : 0,
    });
  }); // No deps - logs every render

  if (!centerItem) return null;

  const isExpanded = props.expandedItemIds?.includes(centerItem.metadata.dbId) ?? false;

  // Not expanded = regular tile + neighbors (if enabled)
  if (!isExpanded) {
    const centerTile = (
      <DynamicItemTile
        item={centerItem}
        scale={scale}
        baseHexSize={props.baseHexSize}
        allExpandedItemIds={props.expandedItemIds ?? []}
        hasChildren={hasChildren(centerItem, mapItems)}
        isCenter={centerItem.metadata.dbId === props.urlInfo.rootItemId}
        urlInfo={props.urlInfo}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
        isSelected={props.selectedTileId === centerItem.metadata.coordId}
        onNavigate={props.onNavigate}
        onToggleExpansion={props.onToggleExpansion}
      />
    );

    // If neighbors are disabled or no render function provided, just return the center tile
    if (!props.showNeighbors || !props.renderNeighbors) {
      return centerTile;
    }

    // With neighbors enabled, wrap in a container that can handle overflow
    return (
      <div className="relative" style={{ zIndex: 10 }}>
        {/* Center tile (highest z-index) */}
        <div style={{ position: "relative", zIndex: 10 }}>
          {centerTile}
        </div>

        {/* Neighbor tiles (lower z-index, positioned around center) */}
        {props.renderNeighbors(centerItem, {
          mapItems: props.mapItems,
          baseHexSize: props.baseHexSize,
          scale,
          urlInfo: props.urlInfo,
          expandedItemIds: props.expandedItemIds,
          isDarkMode,
          interactive: props.interactive,
          currentUserId: props.currentUserId,
          selectedTileId: props.selectedTileId,
          onNavigate: props.onNavigate,
          onToggleExpansion: props.onToggleExpansion,
          onCreateRequested: props.onCreateRequested,
        })}
      </div>
    );
  }

  // Expanded = Frame (shallow tile with children inside)
  // Scale progression: 3 (center) → 2 (children) → 1 (grandchildren) → 1 (cannot go lower)
  const nextScale: TileScale = scale > 1 ? ((scale - 1) as TileScale) : 1;

  const expandedFrame = (
    <DynamicBaseTileLayout
      baseHexSize={props.baseHexSize ?? 50}
      scale={scale}
      color={getColorFromItem(centerItem)}
      coordId={centerItem.metadata.coordId}
      _shallow={true}
      isExpanded={true}
      isDarkMode={isDarkMode}
    >
      <div className="scale-95 transform" style={{ position: "relative", zIndex: 5 }}>
        <FrameInterior
          centerItem={centerItem}
          childScale={nextScale}
          mapItems={props.mapItems}
          baseHexSize={props.baseHexSize}
          expandedItemIds={props.expandedItemIds}
          urlInfo={props.urlInfo}
          interactive={props.interactive}
          currentUserId={props.currentUserId}
          selectedTileId={props.selectedTileId}
          onNavigate={props.onNavigate}
          onToggleExpansion={props.onToggleExpansion}
          onCreateRequested={props.onCreateRequested}
          renderNeighbors={props.renderNeighbors}
        />
      </div>
    </DynamicBaseTileLayout>
  );

  // If neighbors are disabled or no render function provided, just return the expanded frame
  if (!props.showNeighbors || !props.renderNeighbors) {
    return expandedFrame;
  }

  // With neighbors enabled, wrap expanded frame with neighbors too
  return (
    <div className="relative" style={{ zIndex: 10 }}>
      {/* Expanded frame (highest z-index) */}
      <div style={{ position: "relative", zIndex: 10 }}>
        {expandedFrame}
      </div>

      {/* Neighbor tiles (lower z-index, positioned around center) */}
      {props.renderNeighbors(centerItem, {
        mapItems: props.mapItems,
        baseHexSize: props.baseHexSize,
        scale,
        urlInfo: props.urlInfo,
        expandedItemIds: props.expandedItemIds,
        isDarkMode,
        interactive: props.interactive,
        currentUserId: props.currentUserId,
        selectedTileId: props.selectedTileId,
        onNavigate: props.onNavigate,
        onToggleExpansion: props.onToggleExpansion,
        onCreateRequested: props.onCreateRequested,
      })}
    </div>
  );
};

/**
 * Renders the interior content of a frame - the 7-tile hexagonal arrangement.
 * The childScale is the scale for all children (center + surrounding tiles).
 */
const FrameInterior = (props: {
  centerItem: TileData;
  childScale: TileScale;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: number;
  selectedTileId?: string | null;
  onNavigate?: (coordId: string) => void;
  onToggleExpansion?: (itemId: string, coordId: string) => void;
  onCreateRequested?: (payload: {
    coordId: string;
    parentName?: string;
    parentId?: string;
    parentCoordId?: string;
  }) => void;
  renderNeighbors?: DynamicFrameCoreProps['renderNeighbors'];
}) => {
  const { centerItem, baseHexSize = 50, childScale } = props;

  // Log frame interior render
  useEffect(() => {
    const childCoordIds = getChildCoordIds(centerItem);
    const childStats = childCoordIds.map(id => ({
      exists: !!props.mapItems[id],
      isExpanded: props.mapItems[id] ? props.expandedItemIds?.includes(props.mapItems[id].metadata.dbId) ?? false : false,
    }));

    loggers.render.canvas('FrameInterior render', {
      centerCoordId: centerItem.metadata.coordId,
      centerDbId: centerItem.metadata.dbId,
      childScale,
      totalChildren: childCoordIds.length,
      existingChildren: childStats.filter(s => s.exists).length,
      expandedChildren: childStats.filter(s => s.exists && s.isExpanded).length,
    });
  });

  // Calculate margin for hexagon rows
  // Note: We need to use the PARENT's scale (childScale + 1) for proper edge sharing
  const parentScale = childScale < 3 ? (childScale + 1) as TileScale : 3;
  const marginTop = parentScale === 2
    ? baseHexSize / 2
    : (baseHexSize / 2) * Math.pow(3, parentScale - 2);

  // Get child coordinates
  const childCoordIds = getChildCoordIds(centerItem);

  // Create position map
  const positionMap: Record<string, string | undefined> = {
    C: centerItem.metadata.coordId,
    NW: childCoordIds[0],
    NE: childCoordIds[1],
    E: childCoordIds[2],
    SE: childCoordIds[3],
    SW: childCoordIds[4],
    W: childCoordIds[5],
  };

  // Group tiles by row for rendering
  const rows = [
    ['NW', 'NE'],
    ['W', 'C', 'E'],
    ['SW', 'SE']
  ];

  return (
    <>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex justify-center"
          style={rowIndex > 0 ? { marginTop: `-${marginTop}px` } : undefined}
        >
          {row.map(position => {
            const coordId = positionMap[position];
            if (!coordId) return null;

            return (
              <FrameSlot
                key={position}
                coordId={coordId}
                slotScale={childScale}
                isCenter={position === 'C'}
                mapItems={props.mapItems}
                baseHexSize={props.baseHexSize}
                expandedItemIds={props.expandedItemIds}
                urlInfo={props.urlInfo}
                interactive={props.interactive}
                currentUserId={props.currentUserId}
                selectedTileId={props.selectedTileId}
                onNavigate={props.onNavigate}
                onToggleExpansion={props.onToggleExpansion}
                onCreateRequested={props.onCreateRequested}
                renderNeighbors={props.renderNeighbors}
              />
            );
          })}
        </div>
      ))}
    </>
  );
};

/**
 * Renders a single position within a frame.
 * Each slot can contain:
 * - An ItemTile (if not expanded)
 * - A Frame (if expanded - recursive!)
 * - An EmptyTile (if no item exists at this position)
 *
 * CRITICAL: slotScale is the scale THIS slot should render at,
 * which is already reduced from the parent frame's scale.
 */
const FrameSlot = (props: {
  coordId: string;
  slotScale: TileScale;
  isCenter: boolean;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: number;
  selectedTileId?: string | null;
  onNavigate?: (coordId: string) => void;
  onToggleExpansion?: (itemId: string, coordId: string) => void;
  onCreateRequested?: (payload: {
    coordId: string;
    parentName?: string;
    parentId?: string;
    parentCoordId?: string;
  }) => void;
  renderNeighbors?: DynamicFrameCoreProps['renderNeighbors'];
}) => {
  const { coordId, mapItems, slotScale, isCenter } = props;
  const item = mapItems[coordId];

  // Log frame slot render
  useEffect(() => {
    loggers.render.canvas('FrameSlot render', {
      coordId,
      slotScale,
      isCenter,
      hasItem: !!item,
      isExpanded: item ? props.expandedItemIds?.includes(item.metadata.dbId) ?? false : false,
      isSelected: props.selectedTileId === coordId,
    });
  });

  // Empty slot
  if (!item && !isCenter) {
    const parentCoords = CoordSystem.getParentCoord(CoordSystem.parseId(coordId));
    if (!parentCoords) {
      console.error(`Failed to get parent coordinates for ${coordId}`);
      return null;
    }

    const parentCoordsId = CoordSystem.createId(parentCoords);
    const parentItem = mapItems[parentCoordsId];

    return (
      <DynamicEmptyTile
        coordId={coordId}
        scale={slotScale}
        baseHexSize={props.baseHexSize}
        urlInfo={props.urlInfo}
        parentItem={parentItem ? {
          id: parentItem.metadata.dbId,
          name: parentItem.data.title,
          ownerId: parentItem.metadata.ownerId,
        } : undefined}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
        onCreateRequested={props.onCreateRequested}
      />
    );
  }

  if (!item) return null;

  const isExpanded = props.expandedItemIds?.includes(item.metadata.dbId) ?? false;

  // CRITICAL: The center of a frame is special - it's already "expanded" (that's why we see this frame)
  // So the center should ALWAYS render as a simple tile, never as another frame
  if (isCenter) {
    return (
      <DynamicItemTile
        item={item}
        scale={slotScale}
        baseHexSize={props.baseHexSize}
        allExpandedItemIds={props.expandedItemIds ?? []}
        hasChildren={hasChildren(item, mapItems)}
        isCenter={item.metadata.dbId === props.urlInfo.rootItemId}
        urlInfo={props.urlInfo}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
        isSelected={props.selectedTileId === item.metadata.coordId}
        onNavigate={props.onNavigate}
        onToggleExpansion={props.onToggleExpansion}
      />
    );
  }

  // Only allow expansion if we can reduce scale further (slotScale > 1)
  if (isExpanded && slotScale > 1) {
    return (
      <DynamicFrameCore
        center={coordId}
        scale={slotScale}  // Use slotScale, not the original scale
        mapItems={props.mapItems}
        baseHexSize={props.baseHexSize}
        expandedItemIds={props.expandedItemIds}
        urlInfo={props.urlInfo}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
        selectedTileId={props.selectedTileId}
        showNeighbors={false} // Child frames don't show neighbors
        onNavigate={props.onNavigate}
        onToggleExpansion={props.onToggleExpansion}
        onCreateRequested={props.onCreateRequested}
        renderNeighbors={props.renderNeighbors}
      />
    );
  }

  // Not expanded = regular ItemTile
  return (
    <DynamicItemTile
      item={item}
      scale={slotScale}
      allExpandedItemIds={props.expandedItemIds ?? []}
      hasChildren={hasChildren(item, mapItems)}
      isCenter={item.metadata.dbId === props.urlInfo.rootItemId}
      urlInfo={props.urlInfo}
      interactive={props.interactive}
      currentUserId={props.currentUserId}
      isSelected={props.selectedTileId === item.metadata.coordId}
      onNavigate={props.onNavigate}
      onToggleExpansion={props.onToggleExpansion}
    />
  );
};

// Helper functions
export const getChildCoordIds = (item: TileData): string[] => {
  const coord = item.metadata.coordinates;
  return CHILD_INDICES.map(idx =>
    CoordSystem.createId({ ...coord, path: [...coord.path, idx] })
  );
};

export const hasChildren = (item: TileData, mapItems: Record<string, TileData>): boolean => {
  const childCoordIds = getChildCoordIds(item);
  return childCoordIds.some(childId => mapItems[childId]);
};