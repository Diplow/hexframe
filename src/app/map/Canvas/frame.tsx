/**
 * Frame Component - Renders tiles that can expand to show their children.
 * 
 * Scale System:
 * - Center tile: scale 3
 *   └─ When expanded: scale 3 shallow tile containing:
 *       ├─ Center content: scale 2
 *       └─ Children: scale 2
 *           └─ When expanded: scale 2 shallow tile containing:
 *               ├─ Center content: scale 1
 *               └─ Children: scale 1 (cannot expand further)
 * 
 * The 90% scaling (scale-90) creates visual depth showing children are "inside" their parent.
 */

import { DynamicItemTile, getColorFromItem } from "../Tile/Item";
import { DynamicBaseTileLayout } from "../Tile/Base";
import type { TileScale } from "~/app/static/map/Tile/Base/base";
import { DynamicEmptyTile } from "../Tile/Empty/empty";
import type { TileData } from "../types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { URLInfo } from "../types/url-info";
import { useCanvasTheme } from ".";

const CHILD_INDICES = [1, 2, 3, 4, 5, 6] as const;

export interface DynamicFrameProps {
  center: string;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  scale?: TileScale;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: number;
  selectedTileId?: string | null;
}

/**
 * A Frame is an expanded tile that shows its children in a hexagonal arrangement.
 * - If the tile is not expanded, it renders as a regular ItemTile
 * - If the tile is expanded, it becomes a Frame (shallow tile containing its children)
 * - Children can themselves be Frames if they are also expanded (recursive structure)
 */
export const DynamicFrame = (props: DynamicFrameProps) => {
  const { center, mapItems, scale = 3 } = props;
  const centerItem = mapItems[center];
  const { isDarkMode } = useCanvasTheme();

  if (!centerItem) return null;

  const isExpanded = props.expandedItemIds?.includes(centerItem.metadata.dbId) ?? false;
  
  // Not expanded = regular tile
  if (!isExpanded) {
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
      />
    );
  }

  // Expanded = Frame (shallow tile with children inside)
  // Scale progression: 3 (center) → 2 (children) → 1 (grandchildren) → 1 (cannot go lower)
  const nextScale: TileScale = scale > 1 ? ((scale - 1) as TileScale) : 1;

  return (
    <DynamicBaseTileLayout
      baseHexSize={props.baseHexSize ?? 50}
      scale={scale}
      color={getColorFromItem(centerItem)}
      coordId={centerItem.metadata.coordId}
      _shallow={true}
      isExpanded={true}
      isDarkMode={isDarkMode}
    >
      <div className="scale-90 transform" style={{ position: "relative", zIndex: 5 }}>
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
        />
      </div>
    </DynamicBaseTileLayout>
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
}) => {
  const { centerItem, baseHexSize = 50, childScale } = props;
  
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
}) => {
  const { coordId, mapItems, slotScale, isCenter } = props;
  const item = mapItems[coordId];

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
          name: parentItem.data.name,
        } : undefined}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
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
        allExpandedItemIds={props.expandedItemIds ?? []}
        hasChildren={hasChildren(item, mapItems)}
        isCenter={item.metadata.dbId === props.urlInfo.rootItemId}
        urlInfo={props.urlInfo}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
        isSelected={props.selectedTileId === item.metadata.coordId}
      />
    );
  }
  
  // For non-center slots: they can be expanded into frames (recursive!)
  if (isExpanded) {
    return (
      <DynamicFrame 
        center={coordId}
        scale={slotScale}  // Use slotScale, not the original scale
        mapItems={props.mapItems}
        baseHexSize={props.baseHexSize}
        expandedItemIds={props.expandedItemIds}
        urlInfo={props.urlInfo}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
        selectedTileId={props.selectedTileId}
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
    />
  );
};

// Helper functions
const getChildCoordIds = (item: TileData): string[] => {
  const coord = item.metadata.coordinates;
  return CHILD_INDICES.map(idx => 
    CoordSystem.createId({ ...coord, path: [...coord.path, idx] })
  );
};

const hasChildren = (item: TileData, mapItems: Record<string, TileData>): boolean => {
  const childCoordIds = getChildCoordIds(item);
  return childCoordIds.some(childId => mapItems[childId]);
};