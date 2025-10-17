import { describe, it, expect } from "vitest";
import { MapItemNeighborValidation } from "~/lib/domains/mapping/_objects/map-item-neighbor-validation";
import { MapItem, MapItemType } from "~/lib/domains/mapping/_objects/map-item";
import { BaseItem } from "~/lib/domains/mapping/_objects/base-item";
import type { Coord } from "~/lib/domains/mapping/utils";
import { Direction } from "~/lib/domains/mapping/utils";
import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";

// Helper function to create a test BaseItem with an id
function createTestBaseItem(id: number, title: string) {
  const baseItem = new BaseItem({ attrs: { title, content: "", link: "" } });
  return Object.assign(baseItem, { id });
}

// Helper to create a MapItem for testing
function createTestMapItem(
  id: number,
  coords: Coord,
  itemType: MapItemType,
  parentId: number | null = null,
) {
  const ref = createTestBaseItem(id, `Item ${id}`);
  return new MapItem({
    attrs: {
      coords,
      parentId,
      itemType,
    },
    ref,
  });
}

describe("MapItemNeighborValidation - Direction 0 (Composition) Support", () => {
  describe("validateNeighbors - structural children only (6 max)", () => {
    it("should pass validation with 6 structural children (directions 1-6)", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.NorthWest] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999); // Has a parent

      // Create 6 structural children (directions 1-6)
      const neighbors = [
        Direction.NorthWest,
        Direction.NorthEast,
        Direction.East,
        Direction.SouthEast,
        Direction.SouthWest,
        Direction.West,
      ].map((direction, index) => {
        const childCoord: Coord = {
          userId: 1,
          groupId: 0,
          path: [...parent.path, direction],
        };
        return createTestMapItem(10 + index, childCoord, MapItemType.BASE, 1);
      });

      parentItem.neighbors = neighbors;

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should pass validation with fewer than 6 structural children", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.NorthWest] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Create 3 structural children
      const neighbors = [Direction.NorthWest, Direction.East, Direction.West].map(
        (direction, index) => {
          const childCoord: Coord = {
            userId: 1,
            groupId: 0,
            path: [...parent.path, direction],
          };
          return createTestMapItem(10 + index, childCoord, MapItemType.BASE, 1);
        },
      );

      parentItem.neighbors = neighbors;

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should fail validation with duplicate directions", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.NorthWest] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Try to create children with duplicate directions
      const neighbors = [
        Direction.NorthWest,
        Direction.NorthEast,
        Direction.East,
        Direction.SouthEast,
        Direction.SouthWest,
        Direction.West,
        Direction.NorthWest, // duplicate
      ].map((direction, index) => {
        const childCoord: Coord = {
          userId: 1,
          groupId: 0,
          path: [...parent.path, direction],
        };
        return createTestMapItem(10 + index, childCoord, MapItemType.BASE, 1);
      });

      parentItem.neighbors = neighbors;

      // Should fail because of duplicate direction
      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).toThrow(
        MAPPING_ERRORS.INVALID_NEIGHBOR_DIRECTION,
      );
    });
  });

  describe("validateNeighbors - with direction 0 (composition)", () => {
    it("should pass validation with direction 0 child plus 6 structural children (7 total)", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.NorthWest] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Create direction 0 child plus 6 structural children (7 total)
      const neighbors = [
        Direction.Center,
        Direction.NorthWest,
        Direction.NorthEast,
        Direction.East,
        Direction.SouthEast,
        Direction.SouthWest,
        Direction.West,
      ].map((direction, index) => {
        const childCoord: Coord = {
          userId: 1,
          groupId: 0,
          path: [...parent.path, direction],
        };
        return createTestMapItem(10 + index, childCoord, MapItemType.BASE, 1);
      });

      parentItem.neighbors = neighbors;

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should pass validation with direction 0 child plus fewer structural children", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.East] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Create direction 0 child plus 2 structural children (3 total)
      const neighbors = [Direction.Center, Direction.NorthWest, Direction.East].map(
        (direction, index) => {
          const childCoord: Coord = {
            userId: 1,
            groupId: 0,
            path: [...parent.path, direction],
          };
          return createTestMapItem(10 + index, childCoord, MapItemType.BASE, 1);
        },
      );

      parentItem.neighbors = neighbors;

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should pass validation with only direction 0 child", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.SouthEast] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Create only direction 0 child
      const compositionCoord: Coord = {
        userId: 1,
        groupId: 0,
        path: [...parent.path, Direction.Center],
      };
      const compositionChild = createTestMapItem(10, compositionCoord, MapItemType.BASE, 1);

      parentItem.neighbors = [compositionChild];

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should fail validation with 8 children (duplicate direction)", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.NorthWest] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Try to create 8 children: direction 0 plus 7 structural (one duplicate)
      const neighbors = [
        Direction.Center,
        Direction.NorthWest,
        Direction.NorthEast,
        Direction.East,
        Direction.SouthEast,
        Direction.SouthWest,
        Direction.West,
        Direction.NorthWest, // duplicate
      ].map((direction, index) => {
        const childCoord: Coord = {
          userId: 1,
          groupId: 0,
          path: [...parent.path, direction],
        };
        return createTestMapItem(10 + index, childCoord, MapItemType.BASE, 1);
      });

      parentItem.neighbors = neighbors;

      // Should fail because of duplicate direction
      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).toThrow(
        MAPPING_ERRORS.INVALID_NEIGHBOR_DIRECTION,
      );
    });

    it("should fail validation with duplicate direction 0 children", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.East] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Create 2 direction 0 children (invalid)
      const neighbors = [Direction.Center, Direction.Center].map((direction, index) => {
        const childCoord: Coord = {
          userId: 1,
          groupId: 0,
          path: [...parent.path, direction],
        };
        return createTestMapItem(10 + index, childCoord, MapItemType.BASE, 1);
      });

      parentItem.neighbors = neighbors;

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).toThrow(
        MAPPING_ERRORS.INVALID_NEIGHBOR_DIRECTION,
      );
    });
  });

  describe("validateNeighbors - edge cases", () => {
    it("should pass validation with no neighbors", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [Direction.NorthWest] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);
      parentItem.neighbors = [];

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should validate direction 0 works at any depth", () => {
      const parent: Coord = {
        userId: 1,
        groupId: 0,
        path: [Direction.NorthWest, Direction.East, Direction.SouthEast],
      };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      // Create direction 0 child at depth 4
      const compositionCoord: Coord = {
        userId: 1,
        groupId: 0,
        path: [...parent.path, Direction.Center],
      };
      const compositionChild = createTestMapItem(10, compositionCoord, MapItemType.BASE, 1);

      parentItem.neighbors = [compositionChild];

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should validate direction 0 with different userId/groupId combinations", () => {
      const parent: Coord = { userId: 42, groupId: 5, path: [Direction.West] };
      const parentItem = createTestMapItem(1, parent, MapItemType.BASE, 999);

      const compositionCoord: Coord = {
        userId: 42,
        groupId: 5,
        path: [...parent.path, Direction.Center],
      };
      const compositionChild = createTestMapItem(10, compositionCoord, MapItemType.BASE, 1);

      parentItem.neighbors = [compositionChild];

      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });
  });

  describe("validateNeighborsCount - direct testing", () => {
    it("should accept exactly 7 neighbors when one is direction 0", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, parent, MapItemType.USER, null);

      const neighbors = [
        Direction.Center,
        Direction.NorthWest,
        Direction.NorthEast,
        Direction.East,
        Direction.SouthEast,
        Direction.SouthWest,
        Direction.West,
      ].map((direction, index) => {
        return createTestMapItem(
          10 + index,
          {
            userId: 1,
            groupId: 0,
            path: [direction],
          },
          MapItemType.BASE,
          1,
        );
      });

      parentItem.neighbors = neighbors;

      // This should not throw - 7 children is valid when one is direction 0
      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).not.toThrow();
    });

    it("should reject 7 neighbors when none is direction 0 (via duplicate detection)", () => {
      const parent: Coord = { userId: 1, groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, parent, MapItemType.USER, null);

      // Impossible to have 7 unique non-zero directions (only 6 exist)
      // Test with duplicates which will fail on direction validation
      const neighbors = [
        Direction.NorthWest,
        Direction.NorthEast,
        Direction.East,
        Direction.SouthEast,
        Direction.SouthWest,
        Direction.West,
        Direction.NorthWest, // duplicate
      ].map((direction, index) => {
        return createTestMapItem(
          10 + index,
          {
            userId: 1,
            groupId: 0,
            path: [direction],
          },
          MapItemType.BASE,
          1,
        );
      });

      parentItem.neighbors = neighbors;

      // Should fail due to duplicate direction
      expect(() => MapItemNeighborValidation.validateNeighbors(parentItem)).toThrow(
        MAPPING_ERRORS.INVALID_NEIGHBOR_DIRECTION,
      );
    });
  });
});
