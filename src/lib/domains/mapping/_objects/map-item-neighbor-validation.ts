import type { MapItem } from "~/lib/domains/mapping/_objects/map-item";
import type { Direction } from "~/lib/domains/mapping/utils";
import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";

export class MapItemNeighborValidation {
  public static validateNeighbors(item: MapItem) {
    MapItemNeighborValidation.validateNeighborsCount(item);
    MapItemNeighborValidation.validateNeighborDirections(item);
  }

  private static validateNeighborsCount(item: MapItem) {
    const neighbors = item.neighbors;
    if (neighbors.length > 6) {
      throw new Error(MAPPING_ERRORS.INVALID_NEIGHBORS_COUNT);
    }
  }

  private static validateNeighborDirections(item: MapItem) {
    MapItemNeighborValidation.checkNeighborsDepth(item);
    MapItemNeighborValidation.checkNeighborsPath(item);
    const occupiedDirections = new Set<Direction>();
    for (const neighbor of item.neighbors) {
      const direction = neighbor.attrs.coords.path[
        neighbor.attrs.coords.path.length - 1
      ]!;
      if (occupiedDirections.has(direction)) {
        throw new Error(MAPPING_ERRORS.INVALID_NEIGHBOR_DIRECTION);
      }
      occupiedDirections.add(direction);
    }
  }

  private static checkNeighborsDepth(item: MapItem) {
    const neighbors = item.neighbors;
    for (const neighbor of neighbors) {
      const parentDepth = item.attrs.coords.path.length;
      const itemDepth = neighbor.attrs.coords.path.length;
      if (itemDepth !== parentDepth + 1) {
        throw new Error(MAPPING_ERRORS.INVALID_PARENT_LEVEL);
      }
    }
  }

  private static checkNeighborsPath(item: MapItem) {
    const neighbors = item.neighbors;
    const itemPath = item.attrs.coords.path;
    const itemUserId = item.attrs.coords.userId;
    const itemGroupId = item.attrs.coords.groupId;

    for (const neighbor of neighbors) {
      const neighborPath = neighbor.attrs.coords.path;
      const neighborUserId = neighbor.attrs.coords.userId;
      const neighborGroupId = neighbor.attrs.coords.groupId;

      if (neighborUserId !== itemUserId || neighborGroupId !== itemGroupId) {
        throw new Error(MAPPING_ERRORS.CHILD_COORDS_MUST_MATCH_PARENT);
      }

      // A neighbor's path should be exactly one element longer than the item's path
      // and should contain the item's path as a prefix
      if (
        neighborPath.length !== itemPath.length + 1 ||
        !itemPath.every((dir, i) => dir === neighborPath[i])
      ) {
        throw new Error(MAPPING_ERRORS.INVALID_NEIGHBOR_PATH);
      }
    }
  }
}