import { describe, it, expect } from "vitest";
import { CoordSystem, Direction } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";

describe("CoordSystem - Direction 0 (Composition) Support", () => {
  describe("getCompositionCoord", () => {
    it("should generate composition coord with direction 0 for shallow parent", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const composition = CoordSystem.getCompositionCoord(parent);

      expect(composition).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center],
      });
    });

    it("should generate composition coord for deep parent path", () => {
      const parent: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.NorthEast, Direction.East],
      };
      const composition = CoordSystem.getCompositionCoord(parent);

      expect(composition).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.NorthEast, Direction.East, Direction.Center],
      });
    });

    it("should generate composition coord for root parent (math only, validation happens elsewhere)", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [] };
      const composition = CoordSystem.getCompositionCoord(parent);

      expect(composition).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.Center],
      });
    });

    it("should preserve userId and groupId from parent", () => {
      const parent: Coord = { userId: "user-test-42", groupId: 5, path: [Direction.East] };
      const composition = CoordSystem.getCompositionCoord(parent);

      expect(composition.userId).toBe("user-test-42");
      expect(composition.groupId).toBe(5);
    });

    it("should not mutate parent coord", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const originalPath = [...parent.path];

      CoordSystem.getCompositionCoord(parent);

      expect(parent.path).toEqual(originalPath);
    });
  });

  describe("getCompositionCoordFromId", () => {
    it("should generate composition ID for shallow parent", () => {
      const parentId = "user-test-1,0:1";
      const compositionId = CoordSystem.getCompositionCoordFromId(parentId);

      expect(compositionId).toBe("user-test-1,0:1,0");
    });

    it("should generate composition ID for deep parent", () => {
      const parentId = "user-test-1,0:1,2,3";
      const compositionId = CoordSystem.getCompositionCoordFromId(parentId);

      expect(compositionId).toBe("user-test-1,0:1,2,3,0");
    });

    it("should generate composition ID for root parent", () => {
      const parentId = "user-test-1,0";
      const compositionId = CoordSystem.getCompositionCoordFromId(parentId);

      expect(compositionId).toBe("user-test-1,0:0");
    });

    it("should handle different user and group IDs", () => {
      const parentId = "42,5:3";
      const compositionId = CoordSystem.getCompositionCoordFromId(parentId);

      expect(compositionId).toBe("42,5:3,0");
    });
  });

  describe("getChildCoords - backwards compatibility", () => {
    it("should return 6 structural children by default", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent);

      expect(children).toHaveLength(6);
      expect(children[0]?.path).toEqual([Direction.NorthWest, Direction.NorthWest]);
      expect(children[1]?.path).toEqual([Direction.NorthWest, Direction.NorthEast]);
      expect(children[2]?.path).toEqual([Direction.NorthWest, Direction.East]);
      expect(children[3]?.path).toEqual([Direction.NorthWest, Direction.SouthEast]);
      expect(children[4]?.path).toEqual([Direction.NorthWest, Direction.SouthWest]);
      expect(children[5]?.path).toEqual([Direction.NorthWest, Direction.West]);
    });

    it("should return 6 structural children when includeComposition is false", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent, false);

      expect(children).toHaveLength(6);
      expect(children.every(child => child.path[child.path.length - 1] !== Direction.Center)).toBe(true);
    });

    it("should not include direction 0 in default behavior", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent);

      const hasDirection0 = children.some(child =>
        child.path[child.path.length - 1] === Direction.Center
      );
      expect(hasDirection0).toBe(false);
    });
  });

  describe("getChildCoords - with composition", () => {
    it("should return 7 children when includeComposition is true", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent, true);

      expect(children).toHaveLength(7);
    });

    it("should place composition child first when includeComposition is true", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent, true);

      expect(children[0]?.path).toEqual([Direction.NorthWest, Direction.Center]);
    });

    it("should include all 6 structural children after composition when includeComposition is true", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest] };
      const children = CoordSystem.getChildCoords(parent, true);

      expect(children[1]?.path).toEqual([Direction.NorthWest, Direction.NorthWest]);
      expect(children[2]?.path).toEqual([Direction.NorthWest, Direction.NorthEast]);
      expect(children[3]?.path).toEqual([Direction.NorthWest, Direction.East]);
      expect(children[4]?.path).toEqual([Direction.NorthWest, Direction.SouthEast]);
      expect(children[5]?.path).toEqual([Direction.NorthWest, Direction.SouthWest]);
      expect(children[6]?.path).toEqual([Direction.NorthWest, Direction.West]);
    });

    it("should work for root parent", () => {
      const parent: Coord = { userId: "user-test-1", groupId: 0, path: [] };
      const children = CoordSystem.getChildCoords(parent, true);

      expect(children).toHaveLength(7);
      expect(children[0]?.path).toEqual([Direction.Center]);
    });
  });

  describe("getChildCoordsFromId - backwards compatibility", () => {
    it("should return 6 structural child IDs by default", () => {
      const parentId = "user-test-1,0:1";
      const childIds = CoordSystem.getChildCoordsFromId(parentId);

      expect(childIds).toHaveLength(6);
      expect(childIds[0]).toBe("user-test-1,0:1,1");
      expect(childIds[1]).toBe("user-test-1,0:1,2");
      expect(childIds[2]).toBe("user-test-1,0:1,3");
      expect(childIds[3]).toBe("user-test-1,0:1,4");
      expect(childIds[4]).toBe("user-test-1,0:1,5");
      expect(childIds[5]).toBe("user-test-1,0:1,6");
    });

    it("should return 6 structural child IDs when includeComposition is false", () => {
      const parentId = "user-test-1,0:1";
      const childIds = CoordSystem.getChildCoordsFromId(parentId, false);

      expect(childIds).toHaveLength(6);
      expect(childIds.every(id => !id.endsWith(",0"))).toBe(true);
    });
  });

  describe("getChildCoordsFromId - with composition", () => {
    it("should return 7 child IDs when includeComposition is true", () => {
      const parentId = "user-test-1,0:1";
      const childIds = CoordSystem.getChildCoordsFromId(parentId, true);

      expect(childIds).toHaveLength(7);
    });

    it("should place composition child ID first when includeComposition is true", () => {
      const parentId = "user-test-1,0:1";
      const childIds = CoordSystem.getChildCoordsFromId(parentId, true);

      expect(childIds[0]).toBe("user-test-1,0:1,0");
    });

    it("should include all structural child IDs after composition", () => {
      const parentId = "user-test-1,0:1,2";
      const childIds = CoordSystem.getChildCoordsFromId(parentId, true);

      expect(childIds[0]).toBe("user-test-1,0:1,2,0");
      expect(childIds[1]).toBe("user-test-1,0:1,2,1");
      expect(childIds[2]).toBe("user-test-1,0:1,2,2");
      expect(childIds[3]).toBe("user-test-1,0:1,2,3");
      expect(childIds[4]).toBe("user-test-1,0:1,2,4");
      expect(childIds[5]).toBe("user-test-1,0:1,2,5");
      expect(childIds[6]).toBe("user-test-1,0:1,2,6");
    });

    it("should work for root parent", () => {
      const parentId = "user-test-1,0";
      const childIds = CoordSystem.getChildCoordsFromId(parentId, true);

      expect(childIds).toHaveLength(7);
      expect(childIds[0]).toBe("user-test-1,0:0");
    });
  });

  describe("isDescendant - with direction 0 paths", () => {
    it("should return true when composition container is direct child", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,0", "user-test-1,0:1");
      expect(result).toBe(true);
    });

    it("should return true when child is composed child under composition container", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,0,2", "user-test-1,0:1");
      expect(result).toBe(true);
    });

    it("should return true when child is deep under composition container", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,0,2,3,4", "user-test-1,0:1,0");
      expect(result).toBe(true);
    });

    it("should return false when structural child is not under composition container", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,2", "user-test-1,0:1,0");
      expect(result).toBe(false);
    });

    it("should return false when sibling composition containers", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,0", "user-test-1,0:2,0");
      expect(result).toBe(false);
    });

    it("should work with multiple direction 0s in path", () => {
      const result = CoordSystem.isDescendant("user-test-1,0:1,0,2,0,3", "user-test-1,0:1,0");
      expect(result).toBe(true);
    });
  });

  describe("isAncestor - with direction 0 paths", () => {
    it("should return true when parent contains composition child", () => {
      const result = CoordSystem.isAncestor("user-test-1,0:1", "user-test-1,0:1,0");
      expect(result).toBe(true);
    });

    it("should return true when parent contains deep composed descendants", () => {
      const result = CoordSystem.isAncestor("user-test-1,0:1", "user-test-1,0:1,0,2");
      expect(result).toBe(true);
    });

    it("should return true when composition container is ancestor", () => {
      const result = CoordSystem.isAncestor("user-test-1,0:1,0", "user-test-1,0:1,0,2,3");
      expect(result).toBe(true);
    });

    it("should return false when not an ancestor", () => {
      const result = CoordSystem.isAncestor("user-test-1,0:1,0", "user-test-1,0:1,2");
      expect(result).toBe(false);
    });
  });

  describe("getParentCoord - with direction 0 paths", () => {
    it("should return parent when child has direction 0", () => {
      const child: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest, Direction.Center] };
      const parent = CoordSystem.getParentCoord(child);

      expect(parent).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest],
      });
    });

    it("should return composition container when child is composed child", () => {
      const child: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center, Direction.NorthEast],
      };
      const parent = CoordSystem.getParentCoord(child);

      expect(parent).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center],
      });
    });

    it("should work with multiple direction 0s in path", () => {
      const child: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center, Direction.East, Direction.Center],
      };
      const parent = CoordSystem.getParentCoord(child);

      expect(parent).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center, Direction.East],
      });
    });

    it("should return null for root even with direction 0", () => {
      const child: Coord = { userId: "user-test-1", groupId: 0, path: [] };
      const parent = CoordSystem.getParentCoord(child);

      expect(parent).toBeNull();
    });
  });

  describe("getDirection - with direction 0 paths", () => {
    it("should return Direction.Center for composition container", () => {
      const coord: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest, Direction.Center] };
      const direction = CoordSystem.getDirection(coord);

      expect(direction).toBe(Direction.Center);
    });

    it("should return correct direction for child under composition", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center, Direction.NorthEast],
      };
      const direction = CoordSystem.getDirection(coord);

      expect(direction).toBe(Direction.NorthEast);
    });

    it("should handle multiple direction 0s in path", () => {
      const coord: Coord = {
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center, Direction.East, Direction.Center],
      };
      const direction = CoordSystem.getDirection(coord);

      expect(direction).toBe(Direction.Center);
    });

    it("should return Direction.Center for root", () => {
      const coord: Coord = { userId: "user-test-1", groupId: 0, path: [] };
      const direction = CoordSystem.getDirection(coord);

      expect(direction).toBe(Direction.Center);
    });
  });

  describe("createId and parseId - with direction 0", () => {
    it("should correctly serialize coord with direction 0", () => {
      const coord: Coord = { userId: "user-test-1", groupId: 0, path: [Direction.NorthWest, Direction.Center] };
      const id = CoordSystem.createId(coord);

      expect(id).toBe("user-test-1,0:1,0");
    });

    it("should correctly deserialize ID with direction 0", () => {
      const id = "user-test-1,0:1,0,2";
      const coord = CoordSystem.parseId(id);

      expect(coord).toEqual({
        userId: "user-test-1",
        groupId: 0,
        path: [Direction.NorthWest, Direction.Center, Direction.NorthEast],
      });
    });

    it("should round-trip coords with direction 0", () => {
      const original: Coord = {
        userId: "user-test-42",
        groupId: 5,
        path: [Direction.East, Direction.Center, Direction.NorthWest, Direction.Center],
      };
      const id = CoordSystem.createId(original);
      const parsed = CoordSystem.parseId(id);

      expect(parsed).toEqual(original);
    });
  });
});
