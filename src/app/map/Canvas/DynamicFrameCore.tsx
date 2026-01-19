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
import { TileWithNeighbors } from "~/app/map/Canvas/_internals/TileWithNeighbors";

const CHILD_INDICES = [1, 2, 3, 4, 5, 6] as const;

/** Common props passed to TileWithNeighbors */
function _buildNeighborProps(props: DynamicFrameCoreProps, scale: TileScale, isDarkMode: boolean) {
  return {
    mapItems: props.mapItems,
    baseHexSize: props.baseHexSize,
    scale,
    urlInfo: props.urlInfo,
    expandedItemIds: props.expandedItemIds,
    isCompositionExpanded: props.isCompositionExpanded,
    isDarkMode,
    interactive: props.interactive,
    currentUserId: props.currentUserId,
    selectedTileId: props.selectedTileId,
    onNavigate: props.onNavigate,
    onToggleExpansion: props.onToggleExpansion,
    onCreateRequested: props.onCreateRequested,
  };
}

/** Renders a non-expanded center tile */
function _renderCenterTile(
  centerItem: TileData,
  props: DynamicFrameCoreProps,
  scale: TileScale,
  mapItems: Record<string, TileData>,
  center: string
) {
  const parentCoordId = CoordSystem.getParentCoordFromId(center);
  const parentItem = parentCoordId ? mapItems[parentCoordId] : undefined;

  return (
    <DynamicItemTile
      item={centerItem}
      scale={scale}
      allExpandedItemIds={props.expandedItemIds ?? []}
      hasChildren={hasChildren(centerItem, mapItems)}
      isCenter={centerItem.metadata.dbId === props.urlInfo.rootItemId}
      urlInfo={props.urlInfo}
      interactive={props.interactive}
      currentUserId={props.currentUserId}
      isSelected={props.selectedTileId === centerItem.metadata.coordId}
      parentVisibility={parentItem?.data.visibility}
      onNavigate={props.onNavigate}
      onToggleExpansion={props.onToggleExpansion}
    />
  );
}

/** Renders an expanded frame with children */
function _renderExpandedFrame(
  centerItem: TileData,
  props: DynamicFrameCoreProps,
  scale: TileScale,
  nextScale: TileScale,
  center: string,
  isDarkMode: boolean
) {
  return (
    <DynamicBaseTileLayout
      baseHexSize={props.baseHexSize ?? 50}
      scale={scale}
      color={getColorFromItem(centerItem)}
      coordId={center}
      _shallow={true}
      isExpanded={true}
      isDarkMode={isDarkMode}
    >
      <div className="scale-95 transform" style={{ position: "relative", zIndex: 5 }}>
        <FrameInterior
          centerCoordId={center}
          centerItem={centerItem}
          childScale={nextScale}
          mapItems={props.mapItems}
          baseHexSize={props.baseHexSize}
          expandedItemIds={props.expandedItemIds}
          isCompositionExpanded={props.isCompositionExpanded}
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
}

export interface DynamicFrameCoreProps {
  center: string;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  isCompositionExpanded?: boolean;
  scale?: TileScale;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: string;
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
    isCompositionExpanded?: boolean;
    isDarkMode: boolean;
    interactive?: boolean;
    currentUserId?: string;
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
  const { isDarkMode } = useCanvasTheme();
  const centerItem = mapItems[center];

  // Log frame render
  useEffect(() => {
    loggers.render.canvas('DynamicFrameCore render', {
      center, scale, hasItem: !!centerItem,
      isExpanded: centerItem ? props.expandedItemIds?.includes(centerItem.metadata.dbId) ?? false : false,
      childCount: centerItem ? getChildCoordIds(centerItem).filter(id => mapItems[id]).length : 0,
    });
  });

  if (!centerItem) return null;

  const isCompositionExpanded = props.isCompositionExpanded ?? false;
  const isExpanded = (props.expandedItemIds?.includes(centerItem.metadata.dbId) ?? false) || isCompositionExpanded;
  const nextScale: TileScale = scale > 1 ? ((scale - 1) as TileScale) : 1;
  const neighborProps = _buildNeighborProps(props, scale, isDarkMode);

  const centerTile = isExpanded
    ? _renderExpandedFrame(centerItem, props, scale, nextScale, center, isDarkMode)
    : _renderCenterTile(centerItem, props, scale, mapItems, center);

  return (
    <TileWithNeighbors
      centerTile={centerTile}
      centerItem={centerItem}
      showNeighbors={props.showNeighbors ?? false}
      renderNeighbors={props.renderNeighbors}
      neighborProps={neighborProps}
    />
  );
};

/**
 * Renders the interior content of a frame - the 7-tile hexagonal arrangement.
 * The childScale is the scale for all children (center + surrounding tiles).
 */
const FrameInterior = (props: {
  centerCoordId: string;
  centerItem: TileData;
  childScale: TileScale;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  isCompositionExpanded?: boolean;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: string;
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
  const { centerCoordId, centerItem, baseHexSize = 50, childScale } = props;

  // Log frame interior render
  useEffect(() => {
    const centerCoord = CoordSystem.parseId(centerCoordId);
    const childCoordIds = CHILD_INDICES.map(idx =>
      CoordSystem.createId({ ...centerCoord, path: [...centerCoord.path, idx] })
    );
    const childStats = childCoordIds.map(id => ({
      exists: !!props.mapItems[id],
      isExpanded: props.mapItems[id] ? props.expandedItemIds?.includes(props.mapItems[id].metadata.dbId) ?? false : false,
    }));

    loggers.render.canvas('FrameInterior render', {
      centerCoordId,
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

  // Get child coordinates from the centerCoordId
  const centerCoord = CoordSystem.parseId(centerCoordId);

  // Get structural children (positive directions 1-6)
  const childCoordIds = CHILD_INDICES.map(idx =>
    CoordSystem.createId({ ...centerCoord, path: [...centerCoord.path, idx] })
  );

  // Create position map
  const positionMap: Record<string, string | undefined> = {
    C: centerCoordId,
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
                isCompositionExpanded={props.isCompositionExpanded}
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
 * Renders a composition frame - shows direction 0 (orchestration tile) in center
 * with composed children (negative directions -1 to -6) around it.
 * Direction 0 is a regular tile that serves orchestration purposes.
 */
const CompositionFrame = (props: {
  parentCoordId: string;
  parentItem: TileData;
  mapItems: Record<string, TileData>;
  scale: TileScale;
  baseHexSize?: number;
  expandedItemIds?: string[];
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: string;
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
  const { parentCoordId, parentItem, mapItems, scale, baseHexSize = 50 } = props;
  const { isDarkMode } = useCanvasTheme();

  // Get composed child coordinates (negative directions)
  const composedChildCoordIds = CoordSystem.getComposedChildCoordsFromId(parentCoordId);

  // Get direction 0 coordinate (orchestration tile in center)
  const centerCoord = CoordSystem.parseId(parentCoordId);
  const direction0Coord = CoordSystem.getCompositionCoord(centerCoord);
  const direction0CoordId = CoordSystem.createId(direction0Coord);

  // Scale for composed children (scale 1)
  const childScale: TileScale = 1;

  // Calculate margin for hexagon rows
  const parentScale = scale;
  const marginTop = parentScale === 2
    ? baseHexSize / 2
    : (baseHexSize / 2) * Math.pow(3, parentScale - 2);

  // Create position map - direction 0 in center, negative directions around
  const positionMap: Record<string, string | undefined> = {
    C: direction0CoordId,
    NW: composedChildCoordIds[0], // -1
    NE: composedChildCoordIds[1], // -2
    E: composedChildCoordIds[2],  // -3
    SE: composedChildCoordIds[3], // -4
    SW: composedChildCoordIds[4], // -5
    W: composedChildCoordIds[5],  // -6
  };

  // Group tiles by row for rendering
  const rows = [
    ['NW', 'NE'],
    ['W', 'C', 'E'],
    ['SW', 'SE']
  ];

  return (
    <DynamicBaseTileLayout
      baseHexSize={baseHexSize}
      scale={scale}
      color={getColorFromItem(parentItem)}
      coordId={parentItem.metadata.coordId}
      _shallow={true}
      isExpanded={true}
      isDarkMode={isDarkMode}
    >
      <div className="scale-95 transform" style={{ position: "relative", zIndex: 5 }}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center"
            style={rowIndex > 0 ? { marginTop: `-${marginTop}px` } : undefined}
          >
            {row.map(position => {
              const coordId = positionMap[position];
              if (!coordId) return null;

              const item = mapItems[coordId];
              const isCenter = position === 'C';

              // Empty slot (either direction 0 or composed child)
              if (!item) {
                return (
                  <DynamicEmptyTile
                    key={position}
                    coordId={coordId}
                    scale={childScale}
                    baseHexSize={baseHexSize}
                    urlInfo={props.urlInfo}
                    parentItem={{
                      id: parentItem.metadata.dbId,
                      name: parentItem.data.title,
                      ownerId: parentItem.metadata.ownerId,
                    }}
                    interactive={props.interactive}
                    currentUserId={props.currentUserId}
                    onCreateRequested={props.onCreateRequested}
                  />
                );
              }

              // Tile exists (direction 0 or composed child)
              // Parent visibility is the parent of the composition frame
              return (
                <DynamicItemTile
                  key={position}
                  item={item}
                  scale={childScale}
                  allExpandedItemIds={props.expandedItemIds ?? []}
                  hasChildren={hasChildren(item, mapItems)}
                  isCenter={isCenter}
                  urlInfo={props.urlInfo}
                  interactive={props.interactive}
                  currentUserId={props.currentUserId}
                  isSelected={props.selectedTileId === item.metadata.coordId}
                  parentVisibility={parentItem.data.visibility}
                  onNavigate={props.onNavigate}
                  onToggleExpansion={props.onToggleExpansion}
                />
              );
            })}
          </div>
        ))}
      </div>
    </DynamicBaseTileLayout>
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
  isCompositionExpanded?: boolean;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: string;
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
    // Get parent item directly
    const parentCoordId = CoordSystem.getParentCoordFromId(coordId);
    const parentItem = parentCoordId ? mapItems[parentCoordId] : undefined;

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

  if (!item) {
    return null;
  }

  // Check expansion state
  const isExpanded = props.expandedItemIds?.includes(item.metadata.dbId) ?? false;

  // CRITICAL: The center of a frame is special - it's already "expanded" (that's why we see this frame)
  // Check if composition should be shown
  if (isCenter) {
    const isCompositionExpanded = props.isCompositionExpanded ?? false;
    const canShowComposition = isCompositionExpanded && slotScale > 1;

    if (canShowComposition) {
      // Render composition frame: show direction 0 child (or empty) in center
      // and negative direction children around it
      return <CompositionFrame
        parentCoordId={coordId}
        parentItem={item}
        mapItems={mapItems}
        scale={slotScale}
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
      />;
    }

    // Get parent visibility for the center tile in frame
    const frameParentCoordId = CoordSystem.getParentCoordFromId(coordId);
    const frameParentItem = frameParentCoordId ? mapItems[frameParentCoordId] : undefined;

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
        parentVisibility={frameParentItem?.data.visibility}
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
  // Get parent visibility
  const parentCoordId = CoordSystem.getParentCoordFromId(coordId);
  const parentItem = parentCoordId ? mapItems[parentCoordId] : undefined;

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
      parentVisibility={parentItem?.data.visibility}
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