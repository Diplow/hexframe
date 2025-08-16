import type { TileData } from "../../types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/interface";

export function createMockTileData(overrides?: Partial<TileData>): TileData {
  const defaultCoordId = "0,0";
  const coordinates = CoordSystem.parseId(defaultCoordId);
  
  return {
    metadata: {
      dbId: "test-tile-1",
      coordId: defaultCoordId,
      parentId: undefined,
      coordinates,
      depth: 0,
      ownerId: "user-1",
    },
    data: {
      name: "Test Tile",
      description: "Test description",
      url: "",
      color: "zinc-50",
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    },
    ...overrides,
  };
}