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
} from "~/app/map/Canvas/_internals";

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

export const NeighborTiles = (props: NeighborTilesProps) => {
  const { centerItem, mapItems, scale = 3 } = props;

  // Log neighbor tiles render
  useEffect(() => {
    const siblingCoords = getSiblingCoordIds(centerItem);
    const parentCoord = getParentCoordId(centerItem);

    loggers.render.canvas('NeighborTiles render', {
      centerCoordId: centerItem.metadata.coordId,
      siblingCount: siblingCoords.length,
      existingSiblings: siblingCoords.filter(id => mapItems[id]).length,
      hasParent: !!parentCoord && !!mapItems[parentCoord],
      scale,
    });
  });

  // Get sibling coordinates (neighbors at same level)
  const siblingCoordIds = getSiblingCoordIds(centerItem);

  // Get parent coordinate (one level up)
  const parentCoordId = getParentCoordId(centerItem);

  // Calculate neighbor positions based on actual tile dimensions
  const neighborPositions = calculateNeighborPositions(props.baseHexSize ?? 50, scale);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {/* Render sibling neighbors as frames */}
      {siblingCoordIds.map((coordId) => {
        const item = mapItems[coordId];
        if (!item) return null;

        const spatialDirection = calculateSpatialDirection(centerItem.metadata.coordId, coordId);
        const position = neighborPositions[spatialDirection];

        return (
          <div
            key={coordId}
            className="absolute pointer-events-auto"
            style={{
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
              zIndex: 5,
            }}
          >
            <DynamicFrameCore
              center={coordId} // Each neighbor shows its own center
              mapItems={props.mapItems}
              baseHexSize={props.baseHexSize}
              expandedItemIds={props.expandedItemIds}
              isCompositionExpanded={false}
              scale={scale}
              urlInfo={props.urlInfo}
              interactive={props.interactive}
              currentUserId={props.currentUserId}
              selectedTileId={props.selectedTileId}
              showNeighbors={false} // Neighbors don't show their own neighbors
              onNavigate={props.onNavigate}
              onToggleExpansion={props.onToggleExpansion}
              onCreateRequested={props.onCreateRequested}
            />
          </div>
        );
      })}

      {/* Render parent tile as frame */}
      {parentCoordId && (
        (() => {
          const parentItem = mapItems[parentCoordId];
          if (!parentItem) return null;

          const spatialDirection = calculateSpatialDirection(centerItem.metadata.coordId, parentCoordId);
          const position = neighborPositions[spatialDirection];

          return (
            <div
              key={`parent-${parentCoordId}`}
              className="absolute pointer-events-auto"
              style={{
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                zIndex: 1,
              }}
            >
              <DynamicFrameCore
                center={parentCoordId} // Parent shows its own center
                mapItems={props.mapItems}
                baseHexSize={props.baseHexSize}
                expandedItemIds={[]} // Parent is never expanded to avoid showing current center as child
                scale={scale}
                urlInfo={props.urlInfo}
                interactive={props.interactive}
                currentUserId={props.currentUserId}
                selectedTileId={props.selectedTileId}
                showNeighbors={false} // Parent doesn't show its own neighbors
                onNavigate={props.onNavigate}
                onToggleExpansion={undefined} // Parent cannot be expanded
                onCreateRequested={props.onCreateRequested}
              />
            </div>
          );
        })()
      )}
    </div>
  );
};

