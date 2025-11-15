import type { MapItemAPIContract } from "~/server/api";
import {
  CoordSystem,
  type Coord,
} from "~/lib/domains/mapping/utils";
import { Direction } from "~/app/map/constants";
import { getSemanticColorClass } from "~/app/map/types/theme-colors";

export interface TileState {
  isDragged: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isDragOver: boolean;
  isHovering: boolean;
  canExpand?: boolean;
  canEdit?: boolean;
}

function getColor(coordinates: Coord): string {
  // Root tile (center)
  if (coordinates.path.length < 1) {
    return getSemanticColorClass(Direction.Center, 0);
  }

  const lastDirection = coordinates.path[coordinates.path.length - 1];
  const depth = coordinates.path.length;

  // Direction 0 orchestration tile or its children
  if (lastDirection === Direction.Center) {
    // This is an orchestration tile itself - use depth-based orchestration color
    return `orchestration-depth-${Math.min(depth, 8)}`;
  }

  // Check if this is a child of an orchestration tile
  // If path contains a 0 (Direction.Center), we need to check if it's in the hierarchy
  if (coordinates.path.includes(Direction.Center)) {
    // Find the last orchestration tile in the path
    const lastOrchestrationIndex = coordinates.path.lastIndexOf(Direction.Center);

    // If the orchestration is not at the end, this tile is a child of an orchestration tile
    // Use orchestration color scheme with depth relative to the orchestration tile
    if (lastOrchestrationIndex < coordinates.path.length - 1) {
      // Depth is relative to the orchestration tile
      const depthFromOrchestration = coordinates.path.length - lastOrchestrationIndex - 1;
      return `orchestration-depth-${Math.min(depthFromOrchestration + 1, 8)}`;
    }
  }

  // Get direction from first path element (normal hierarchy)
  const direction = coordinates.path[0]!;
  return getSemanticColorClass(direction, depth);
}

const adapt = (item: MapItemAPIContract) => {
  const coordinates = CoordSystem.parseId(item.coordinates);
  const parentId = CoordSystem.getParentCoord(coordinates);
  return {
    metadata: {
      dbId: item.id,
      coordId: item.coordinates,
      parentId: parentId ? CoordSystem.createId(parentId) : undefined,
      coordinates,
      depth: coordinates.path.length,
      ownerId: item.ownerId,
    },
    data: {
      title: item.title,
      content: item.content,
      preview: item.preview ?? undefined,
      link: item.link,
      color: getColor(coordinates),
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    } as TileState,
  };
};

type TileData = ReturnType<typeof adapt>;

export { adapt, getColor };
export type { TileData };