/**
 * NeighborTiles Component - Renders neighboring tiles around the center tile
 *
 * Displays sibling tiles (at the same hierarchical level) and parent tile
 * as partial scale-3 tiles extending off-screen for visual depth and navigation.
 */

import { DynamicFrameCore } from "~/app/map/Canvas/DynamicFrameCore";
import type { TileScale } from "~/app/map/Canvas/Tile";
import type { TileData } from "~/app/map/types/tile-data";
import type { URLInfo } from "~/app/map/types/url-info";
import { useEffect } from "react";
import { loggers } from "~/lib/debug/debug-logger";
import {
  getSiblingCoordIds,
  getParentCoordId,
  calculateNeighborPositions,
  calculateSpatialDirection,
} from "~/app/map/Canvas/HexGeometry";

const DEFAULT_BASE_HEX_SIZE = 50;

export interface NeighborTilesProps {
  centerItem: TileData;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  scale?: TileScale;
  urlInfo: URLInfo;
  expandedItemIds?: string[];
  isCompositionExpanded?: boolean;
  isDarkMode?: boolean;
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
}

interface NeighborTileRenderConfig {
  coordId: string;
  position: { x: number; y: number };
  scale: TileScale;
  zIndex: number;
  expandedIds?: string[];
  canToggleExpansion?: boolean;
}

/** Renders a single neighbor tile at its computed position */
function _renderNeighborTile(config: NeighborTileRenderConfig, props: NeighborTilesProps, baseHexSize: number) {
  const { coordId, position, scale, zIndex, expandedIds, canToggleExpansion = true } = config;
  return (
    <div
      key={coordId}
      className="absolute pointer-events-auto"
      style={{ top: "50%", left: "50%", transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`, zIndex }}
    >
      <DynamicFrameCore
        center={coordId}
        mapItems={props.mapItems}
        baseHexSize={baseHexSize}
        expandedItemIds={expandedIds}
        isCompositionExpanded={false}
        scale={scale}
        urlInfo={props.urlInfo}
        interactive={props.interactive}
        currentUserId={props.currentUserId}
        selectedTileId={props.selectedTileId}
        showNeighbors={false}
        onNavigate={props.onNavigate}
        onToggleExpansion={canToggleExpansion ? props.onToggleExpansion : undefined}
        onCreateRequested={props.onCreateRequested}
      />
    </div>
  );
}

export const NeighborTiles = (props: NeighborTilesProps) => {
  const { centerItem, mapItems, scale = 3 } = props;
  const baseHexSize = props.baseHexSize ?? DEFAULT_BASE_HEX_SIZE;
  const siblingCoordIds = getSiblingCoordIds(centerItem);
  const parentCoordId = getParentCoordId(centerItem);
  const neighborPositions = calculateNeighborPositions(baseHexSize, scale);

  useEffect(() => {
    loggers.render.canvas('NeighborTiles render', {
      centerCoordId: centerItem.metadata.coordId,
      siblingCount: siblingCoordIds.length,
      existingSiblings: siblingCoordIds.filter(id => mapItems[id]).length,
      hasParent: !!parentCoordId && !!mapItems[parentCoordId],
      scale,
    });
  });

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {siblingCoordIds.map((coordId) => {
        if (!mapItems[coordId]) return null;
        const spatialDirection = calculateSpatialDirection(centerItem.metadata.coordId, coordId);
        return _renderNeighborTile({ coordId, position: neighborPositions[spatialDirection], scale, zIndex: 5, expandedIds: props.expandedItemIds }, props, baseHexSize);
      })}

      {parentCoordId && mapItems[parentCoordId] && _renderNeighborTile(
        { coordId: parentCoordId, position: neighborPositions[calculateSpatialDirection(centerItem.metadata.coordId, parentCoordId)], scale, zIndex: 1, expandedIds: [], canToggleExpansion: false },
        props,
        baseHexSize,
      )}
    </div>
  );
};

