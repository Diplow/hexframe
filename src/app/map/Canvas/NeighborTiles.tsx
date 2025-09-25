/**
 * NeighborTiles Component - Renders neighboring tiles around the center tile
 *
 * Displays sibling tiles (at the same hierarchical level) and parent tile
 * as partial scale-3 tiles extending off-screen for visual depth and navigation.
 */

import { DynamicFrameCore } from "~/app/map/Canvas/DynamicFrameCore";
import type { TileScale } from "~/app/map/Canvas/Tile";
import type { TileData } from "~/app/map/types/tile-data";
import { CoordSystem, Direction } from "~/lib/domains/mapping/utils";
import type { URLInfo } from "~/app/map/types/url-info";
import { useEffect } from "react";
import { loggers } from "~/lib/debug/debug-logger";

export interface NeighborTilesProps {
  centerItem: TileData;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  scale?: TileScale;
  urlInfo: URLInfo;
  expandedItemIds?: string[];
  isDarkMode?: boolean;
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
}

// Calculate positioning based on actual tile dimensions and hexagonal geometry
// Using the exact formulas from BaseTileLayout.tsx:
// X (tile edge) = baseHexSize * Math.pow(3, scale - 1)
// Y (tile width) = baseHexSize * √3 * Math.pow(3, scale - 1)
const calculateNeighborPositions = (baseHexSize: number, scale: number) => {
  const scaledBaseSize = baseHexSize * Math.pow(3, scale - 1); // X in your formula
  const tileWidth = baseHexSize * Math.sqrt(3) * Math.pow(3, scale - 1); // Y in your formula (from BaseTileLayout)

  // Hexagonal positioning: neighbors are positioned to share edges
  // For proper edge-sharing in hexagonal grid:
  // - East/West: full tile width horizontally
  // - NW/NE/SW/SE: 0.5 tile width horizontally, 1.5 scaled base size vertically
  return {
    [Direction.Center]: { x: 0, y: 0 },
    [Direction.NorthWest]: { x: -0.5 * tileWidth, y: -1.5 * scaledBaseSize },
    [Direction.NorthEast]: { x: 0.5 * tileWidth, y: -1.5 * scaledBaseSize },
    [Direction.East]: { x: tileWidth, y: 0 },
    [Direction.SouthEast]: { x: 0.5 * tileWidth, y: 1.5 * scaledBaseSize },
    [Direction.SouthWest]: { x: -0.5 * tileWidth, y: 1.5 * scaledBaseSize },
    [Direction.West]: { x: -tileWidth, y: 0 },
  };
};

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

// Helper functions for coordinate calculation
function getSiblingCoordIds(centerItem: TileData): string[] {
  const coord = centerItem.metadata.coordinates;

  // Root tile has no siblings
  if (coord.path.length === 0) return [];

  const parentPath = coord.path.slice(0, -1);
  const currentDirection = coord.path[coord.path.length - 1];

  if (!currentDirection) return [];

  // Get only the adjacent directions for the current position
  const adjacentDirections = getAdjacentDirections(currentDirection);
  const siblings: string[] = [];

  // Generate coordinates for only the adjacent siblings
  for (const direction of adjacentDirections) {
    const siblingCoord = {
      userId: coord.userId,
      groupId: coord.groupId,
      path: [...parentPath, direction]
    };

    siblings.push(CoordSystem.createId(siblingCoord));
  }

  return siblings;
}

function getParentCoordId(centerItem: TileData): string | null {
  const coord = centerItem.metadata.coordinates;

  // Root tile has no parent
  if (coord.path.length === 0) return null;

  const parentCoord = {
    userId: coord.userId,
    groupId: coord.groupId,
    path: coord.path.slice(0, -1)
  };

  return CoordSystem.createId(parentCoord);
}


// Helper function to get adjacent directions for a given direction
function getAdjacentDirections(direction: Direction): Direction[] {
  switch (direction) {
    case Direction.NorthWest:
      return [Direction.NorthEast, Direction.West];
    case Direction.NorthEast:
      return [Direction.NorthWest, Direction.East];
    case Direction.East:
      return [Direction.NorthEast, Direction.SouthEast];
    case Direction.SouthEast:
      return [Direction.East, Direction.SouthWest];
    case Direction.SouthWest:
      return [Direction.SouthEast, Direction.West];
    case Direction.West:
      return [Direction.SouthWest, Direction.NorthWest];
    default:
      return [];
  }
}

// Helper function to calculate the spatial direction from center to target
// This determines WHERE the target appears relative to the new center
function calculateSpatialDirection(centerCoordId: string, targetCoordId: string): Direction {
  const centerCoord = CoordSystem.parseId(centerCoordId);
  const targetCoord = CoordSystem.parseId(targetCoordId);

  // If target is parent (shorter path)
  if (targetCoord.path.length < centerCoord.path.length) {
    // The center's last direction tells us where it came from relative to parent
    const centerDirection = centerCoord.path[centerCoord.path.length - 1]!;
    // The parent appears in the opposite direction from the new center's perspective
    return getOppositeDirection(centerDirection);
  }

  // If target is sibling (same path length), calculate relative position
  if (targetCoord.path.length === centerCoord.path.length) {
    const centerDirection = centerCoord.path[centerCoord.path.length - 1]!;
    const targetDirection = targetCoord.path[targetCoord.path.length - 1]!;

    // Calculate the relative position from center to target
    return calculateRelativeDirection(centerDirection, targetDirection);
  }

  // If target is child (longer path), it would be in its own direction
  // But we shouldn't have children in this neighbor system
  return Direction.Center;
}

// Calculate where target appears relative to center in the hexagonal layout
function calculateRelativeDirection(centerDir: Direction, targetDir: Direction): Direction {
  // Map the hexagonal layout relationships
  const hexLayout: Record<Direction, Partial<Record<Direction, Direction>>> = {
    [Direction.Center]: {
      // Center doesn't have relative positions to other directions in this context
    },
    [Direction.NorthWest]: {
      [Direction.West]: Direction.SouthWest,        // W appears SW of NW
      [Direction.Center]: Direction.SouthEast,      // C appears SE of NW
      [Direction.NorthEast]: Direction.East,        // NE appears E of NW
    },
    [Direction.NorthEast]: {
      [Direction.NorthWest]: Direction.West,        // NW appears W of NE
      [Direction.Center]: Direction.SouthWest,      // C appears SW of NE
      [Direction.East]: Direction.SouthEast,        // E appears SE of NE
    },
    [Direction.East]: {
      [Direction.NorthEast]: Direction.NorthWest,   // NE appears NW of E
      [Direction.Center]: Direction.West,           // C appears W of E
      [Direction.SouthEast]: Direction.SouthWest,   // SE appears SW of E
    },
    [Direction.SouthEast]: {
      [Direction.East]: Direction.NorthWest,        // E appears NW of SE
      [Direction.Center]: Direction.NorthWest,      // C appears NW of SE (corrected)
      [Direction.SouthWest]: Direction.West,        // SW appears W of SE
    },
    [Direction.SouthWest]: {
      [Direction.SouthEast]: Direction.East,        // SE appears E of SW
      [Direction.Center]: Direction.NorthEast,      // C appears NE of SW
      [Direction.West]: Direction.NorthWest,        // W appears NW of SW
    },
    [Direction.West]: {
      [Direction.SouthWest]: Direction.SouthEast,   // SW appears SE of W
      [Direction.Center]: Direction.East,           // C appears E of W
      [Direction.NorthWest]: Direction.NorthEast,   // NW appears NE of W
    },
  };

  return hexLayout[centerDir]?.[targetDir] ?? Direction.Center;
}

// Helper function to get the opposite direction
function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.NorthWest:
      return Direction.SouthEast;
    case Direction.NorthEast:
      return Direction.SouthWest;
    case Direction.East:
      return Direction.West;
    case Direction.SouthEast:
      return Direction.NorthWest;
    case Direction.SouthWest:
      return Direction.NorthEast;
    case Direction.West:
      return Direction.East;
    default:
      return Direction.Center;
  }
}

