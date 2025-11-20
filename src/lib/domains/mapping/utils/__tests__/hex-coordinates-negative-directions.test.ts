import { describe, it, expect } from "vitest";
import { CoordSystem, Direction } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";

describe("CoordSystem - Negative Direction Support for Composed Children", () => {
  describe("Direction enum extension", () => {
    it("should have negative direction values from -1 to -6", () => {
      expect(Direction.ComposedNorthWest).toBe(-1);
      expect(Direction.ComposedNorthEast).toBe(-2);
      expect(Direction.ComposedEast).toBe(-3);
      expect(Direction.ComposedSouthEast).toBe(-4);
      expect(Direction.ComposedSouthWest).toBe(-5);
      expect(Direction.ComposedWest).toBe(-6);
    });

    it("should maintain existing positive direction values", () => {
      expect(Direction.Center).toBe(0);
      expect(Direction.NorthWest).toBe(1);
      expect(Direction.NorthEast).toBe(2);
      expect(Direction.East).toBe(3);
      expect(Direction.SouthEast).toBe(4);
      expect(Direction.SouthWest).toBe(5);
      expect(Direction.West).toBe(6);
    });
  });

  describe("getComposedChildCoords", () => {
    it("should generate 6 composed child coords with negative directions", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const composedChildren = CoordSystem.getComposedChildCoords(parent);

      expect(composedChildren).toHaveLength(6);
      expect(composedChildren[0]?.path).toEqual([Direction.NorthWest, Direction.ComposedNorthWest]);
      expect(composedChildren[1]?.path).toEqual([Direction.NorthWest, Direction.ComposedNorthEast]);
      expect(composedChildren[2]?.path).toEqual([Direction.NorthWest, Direction.ComposedEast]);
      expect(composedChildren[3]?.path).toEqual([Direction.NorthWest, Direction.ComposedSouthEast]);
      expect(composedChildren[4]?.path).toEqual([Direction.NorthWest, Direction.ComposedSouthWest]);
      expect(composedChildren[5]?.path).toEqual([Direction.NorthWest, Direction.ComposedWest]);
    });

    it("should work for deep parent paths", () => {
      const parent: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.East, Direction.SouthEast],
      };
      const composedChildren = CoordSystem.getComposedChildCoords(parent);

      expect(composedChildren).toHaveLength(6);
      expect(composedChildren[0]?.path).toEqual([
        Direction.NorthWest,
        Direction.East,
        Direction.SouthEast,
        Direction.ComposedNorthWest,
      ]);
    });

    it("should work for root parent", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [] };
      const composedChildren = CoordSystem.getComposedChildCoords(parent);

      expect(composedChildren).toHaveLength(6);
      expect(composedChildren[0]?.path).toEqual([Direction.ComposedNorthWest]);
    });

    it("should preserve userId and groupId from parent", () => {
      const parent: Coord = { userId: "user-test-42", groupId: 5, path: [Direction.East] };
      const composedChildren = CoordSystem.getComposedChildCoords(parent);

      composedChildren.forEach((child) => {
        expect(child.userId).toBe("user-test-42");
        expect(child.groupId).toBe(5);
      });
    });

    it("should not mutate parent coord", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const originalPath = [...parent.path];

      CoordSystem.getComposedChildCoords(parent);

      expect(parent.path).toEqual(originalPath);
    });
  });

  describe("getComposedChildCoordsFromId", () => {
    it("should generate composed child IDs with negative directions", () => {
      const parentId = "user-test-1,0:1";
      const composedChildIds = CoordSystem.getComposedChildCoordsFromId(parentId);

      expect(composedChildIds).toHaveLength(6);
      expect(composedChildIds[0]).toBe("user-test-1,0:1,-1");
      expect(composedChildIds[1]).toBe("user-test-1,0:1,-2");
      expect(composedChildIds[2]).toBe("user-test-1,0:1,-3");
      expect(composedChildIds[3]).toBe("user-test-1,0:1,-4");
      expect(composedChildIds[4]).toBe("user-test-1,0:1,-5");
      expect(composedChildIds[5]).toBe("user-test-1,0:1,-6");
    });

    it("should work for deep parent paths", () => {
      const parentId = "user-test-1,0:1,2,3";
      const composedChildIds = CoordSystem.getComposedChildCoordsFromId(parentId);

      expect(composedChildIds).toHaveLength(6);
      expect(composedChildIds[0]).toBe("user-test-1,0:1,2,3,-1");
    });

    it("should work for root parent", () => {
      const parentId = "user-test-1,0";
      const composedChildIds = CoordSystem.getComposedChildCoordsFromId(parentId);

      expect(composedChildIds).toHaveLength(6);
      expect(composedChildIds[0]).toBe("user-test-1,0:-1");
    });
  });

  describe("createId and parseId - with negative directions", () => {
    it("should correctly serialize coord with negative direction", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };
      const id = CoordSystem.createId(coord);

      expect(id).toBe("user-test-1,0:1,-3");
    });

    it("should correctly deserialize ID with negative direction", () => {
      const id = "user-test-1,0:1,-2";
      const coord = CoordSystem.parseId(id);

      expect(coord).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedNorthEast],
      });
    });

    it("should round-trip coords with negative directions", () => {
      const original: Coord = {
        userId: "user-test-42",
        groupId: 5,
        path: [Direction.East, Direction.ComposedNorthWest, Direction.SouthEast],
      };
      const id = CoordSystem.createId(original);
      const parsed = CoordSystem.parseId(id);

      expect(parsed).toEqual(original);
    });

    it("should handle multiple negative directions in path", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [
          Direction.NorthWest,
          Direction.ComposedEast,
          Direction.ComposedSouthWest,
        ],
      };
      const id = CoordSystem.createId(coord);
      const parsed = CoordSystem.parseId(id);

      expect(id).toBe("user-test-1,0:1,-3,-5");
      expect(parsed).toEqual(coord);
    });

    it("should handle mix of positive, zero, and negative directions", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [
          Direction.NorthWest,
          Direction.Center,
          Direction.ComposedEast,
          Direction.SouthEast,
        ],
      };
      const id = CoordSystem.createId(coord);
      const parsed = CoordSystem.parseId(id);

      expect(id).toBe("user-test-1,0:1,0,-3,4");
      expect(parsed).toEqual(coord);
    });
  });

  describe("getDirection - with negative directions", () => {
    it("should return negative direction for composed child", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };
      const direction = CoordSystem.getDirection(coord);

      expect(direction).toBe(Direction.ComposedEast);
      expect(direction).toBe(-3);
    });

    it("should return correct negative direction from path", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.East, Direction.ComposedSouthWest],
      };
      const direction = CoordSystem.getDirection(coord);

      expect(direction).toBe(Direction.ComposedSouthWest);
      expect(direction).toBe(-5);
    });
  });

  describe("getParentCoord - with negative directions", () => {
    it("should return parent when child has negative direction", () => {
      const child: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };
      const parent = CoordSystem.getParentCoord(child);

      expect(parent).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest],
      });
    });

    it("should work with multiple negative directions", () => {
      const child: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast, Direction.ComposedSouthWest],
      };
      const parent = CoordSystem.getParentCoord(child);

      expect(parent).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast],
      });
    });
  });

  describe("getParentCoordFromId - with negative directions", () => {
    it("should return parent ID when child has negative direction", () => {
      const childId = "user-test-1,0:1,-3";
      const parentId = CoordSystem.getParentCoordFromId(childId);

      expect(parentId).toBe("user-test-1,0:1");
    });

    it("should work with multiple negative directions in path", () => {
      const childId = "user-test-1,0:1,-3,-5";
      const parentId = CoordSystem.getParentCoordFromId(childId);

      expect(parentId).toBe("user-test-1,0:1,-3");
    });
  });

  describe("isDescendant - with negative directions", () => {
    it("should return true when composed child is direct child", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,-3", "user-test-1,0:1");
      expect(result).toBe(true);
    });

    it("should return true when child is descendant of composed child", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,-3,2", "user-test-1,0:1");
      expect(result).toBe(true);
    });

    it("should return true when deep under composed children", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,-3,-5,2,4", "user-test-1,0:1,-3");
      expect(result).toBe(true);
    });

    it("should return false when not a descendant", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,-3", "user-test-1,0:2,-3");
      expect(result).toBe(false);
    });

    it("should handle mix of composition (0) and composed children (negative)", () => {
      // Parent at direction 0 (composition container)
      // Child at negative direction (composed child)
      const result = CoordSystem.isDescendant("user-test-1,0:1,0,-3", "user-test-1,0:1");
      expect(result).toBe(true);
    });
  });

  describe("isAncestor - with negative directions", () => {
    it("should return true when parent contains composed child", () => {
      const result = CoordSystem.isAncestor("user-test-1,0:1", "user-test-1,0:1,-3");
      expect(result).toBe(true);
    });

    it("should return true when parent contains deep composed descendants", () => {
      const result = CoordSystem.isAncestor("user-test-1,0:1", "user-test-1,0:1,-3,2");
      expect(result).toBe(true);
    });

    it("should return false when not an ancestor", () => {
      const result = CoordSystem.isAncestor("user-test-1,0:1,-3", "user-test-1,0:1,2");
      expect(result).toBe(false);
    });
  });

  describe("getSiblingsFromId - with negative directions", () => {
    it("should return other composed children as siblings", () => {
      const siblings = CoordSystem.getSiblingsFromId("user-test-1,0:1,-3");

      expect(siblings).toHaveLength(5);
      expect(siblings).toContain("user-test-1,0:1,-1");
      expect(siblings).toContain("user-test-1,0:1,-2");
      expect(siblings).toContain("user-test-1,0:1,-4");
      expect(siblings).toContain("user-test-1,0:1,-5");
      expect(siblings).toContain("user-test-1,0:1,-6");
      expect(siblings).not.toContain("user-test-1,0:1,-3"); // Not itself
    });
  });

  describe("getChildCoords - combined behavior", () => {
    it("should return structural children (1-6) by default, not composed children", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent);

      expect(children).toHaveLength(6);
      expect(children.every((child) => {
        const lastDir = child.path[child.path.length - 1] as number | undefined;
        return lastDir !== undefined && lastDir >= 1 && lastDir <= 6;
      })).toBe(true);
    });

    it("should not include negative directions by default", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent);

      expect(children.every((child) => {
        const lastDir = child.path[child.path.length - 1] as number | undefined;
        return lastDir !== undefined && lastDir > 0;
      })).toBe(true);
    });
  });

  describe("isComposedChild", () => {
    it("should return true for coord with negative direction", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast],
      };
      const result = CoordSystem.isComposedChild(coord);

      expect(result).toBe(true);
    });

    it("should return false for coord with positive directions only", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.East],
      };
      const result = CoordSystem.isComposedChild(coord);

      expect(result).toBe(false);
    });

    it("should return false for composition container (direction 0)", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center],
      };
      const result = CoordSystem.isComposedChild(coord);

      expect(result).toBe(false);
    });

    it("should return true even if negative direction is not last", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.ComposedEast, Direction.SouthEast],
      };
      const result = CoordSystem.isComposedChild(coord);

      expect(result).toBe(true);
    });

    it("should return false for root coord", () => {
      const coord: Coord = { userId: "user-test-1", groupId: 0, path: [] };
      const result = CoordSystem.isComposedChild(coord);

      expect(result).toBe(false);
    });
  });

  describe("isComposedChildId", () => {
    it("should return true for ID with negative direction", () => {
      expect(CoordSystem.isComposedChildId("user-test-1,0:1,-3")).toBe(true);
    });

    it("should return false for ID with only positive directions", () => {
      expect(CoordSystem.isComposedChildId("user-test-1,0:1,2,3")).toBe(false);
    });

    it("should return false for composition container ID", () => {
      expect(CoordSystem.isComposedChildId("user-test-1,0:1,0")).toBe(false);
    });

    it("should return true for ID with negative direction in middle of path", () => {
      expect(CoordSystem.isComposedChildId("user-test-1,0:1,-3,2")).toBe(true);
    });

    it("should return false for root ID", () => {
      expect(CoordSystem.isComposedChildId("user-test-1,0")).toBe(false);
    });
  });

  describe("edge cases and validation", () => {
    it("should handle parsing invalid negative direction gracefully", () => {
      const id = "user-test-1,0:1,-7"; // Invalid negative direction
      const coord = CoordSystem.parseId(id);

      expect(coord.path[1]).toBe(-7);
    });

    it("should serialize and deserialize all negative directions correctly", () => {
      for (let negDir = -1; negDir >= -6; negDir--) {
        const coord: Coord = {
          userId: "user-test-1",
          groupId: 0,
          path: [negDir as Direction],
        };
        const id = CoordSystem.createId(coord);
        const parsed = CoordSystem.parseId(id);

        expect(parsed.path[0]).toBe(negDir);
      }
    });
  });
});
