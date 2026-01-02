import { describe, it, expect } from "vitest";
import { MapItem, MapItemType, type MapItemWithId } from "~/lib/domains/mapping/_objects/map-item";
import { BaseItem } from "~/lib/domains/mapping/_objects/base-item";
import type { Coord } from "~/lib/domains/mapping/utils";
import { Direction } from "~/lib/domains/mapping/utils";
import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";

// Helper function to create a test BaseItem with an id
function createTestBaseItem(id: number, title: string) {
  const baseItem = new BaseItem({ attrs: { title, content: "", link: "" } });
  return Object.assign(baseItem, { id });
}

// Helper to create a MapItemWithId for testing
function createTestMapItem(
  id: number,
  coords: Coord,
  itemType: MapItemType,
  parentId: number | null = null,
  parent: MapItemWithId | null = null,
): MapItemWithId {
  const ref = createTestBaseItem(id, `Item ${id}`);
  const mapItem = new MapItem({
    attrs: {
      coords,
      parentId,
      itemType,
    },
    ref,
    parent,
  });
  return Object.assign(mapItem, { id });
}

describe("MapItemType Classification - Extended Enum", () => {
  describe("MapItemType enum values", () => {
    it("should have USER type with value 'user'", () => {
      expect(MapItemType.USER).toBe("user");
    });

    it("should have ORGANIZATIONAL type with value 'organizational'", () => {
      expect(MapItemType.ORGANIZATIONAL).toBe("organizational");
    });

    it("should have CONTEXT type with value 'context'", () => {
      expect(MapItemType.CONTEXT).toBe("context");
    });

    it("should have SYSTEM type with value 'system'", () => {
      expect(MapItemType.SYSTEM).toBe("system");
    });

    it("should NOT have BASE type (deprecated)", () => {
      // BASE should be removed from the enum after migration
      expect(MapItemType).not.toHaveProperty("BASE");
    });

    it("should have exactly 4 enum values", () => {
      const enumValues = Object.values(MapItemType);
      expect(enumValues).toHaveLength(4);
      expect(enumValues).toContain("user");
      expect(enumValues).toContain("organizational");
      expect(enumValues).toContain("context");
      expect(enumValues).toContain("system");
    });
  });

  describe("USER type validation - must remain unchanged", () => {
    it("should allow creating USER type item with no parent", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      expect(() =>
        createTestMapItem(1, rootCoords, MapItemType.USER, null, null)
      ).not.toThrow();
    });

    it("should throw error when USER type has a parent", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const childCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.East] };
      expect(() =>
        createTestMapItem(2, childCoords, MapItemType.USER, 1, parentItem)
      ).toThrow(MAPPING_ERRORS.USER_ITEM_CANNOT_HAVE_PARENT);
    });

    it("should throw error when USER type has parentId set", () => {
      const coords: Coord = { userId: "test-user", groupId: 0, path: [] };
      expect(() =>
        createTestMapItem(1, coords, MapItemType.USER, 999, null)
      ).toThrow(MAPPING_ERRORS.USER_ITEM_CANNOT_HAVE_PARENT);
    });
  });

  describe("ORGANIZATIONAL type validation - must have parent", () => {
    it("should allow creating ORGANIZATIONAL type item with parent", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const childCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.East] };
      expect(() =>
        createTestMapItem(2, childCoords, MapItemType.ORGANIZATIONAL, 1, parentItem)
      ).not.toThrow();
    });

    it("should throw error when ORGANIZATIONAL type has no parent", () => {
      const coords: Coord = { userId: "test-user", groupId: 0, path: [] };
      expect(() =>
        createTestMapItem(1, coords, MapItemType.ORGANIZATIONAL, null, null)
      ).toThrow(MAPPING_ERRORS.NON_USER_ITEM_MUST_HAVE_PARENT);
    });

    it("should work with ORGANIZATIONAL type at any depth", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const depth1Coords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthWest] };
      const depth1Item = createTestMapItem(2, depth1Coords, MapItemType.ORGANIZATIONAL, 1, parentItem);

      const depth2Coords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthWest, Direction.East] };
      expect(() =>
        createTestMapItem(3, depth2Coords, MapItemType.ORGANIZATIONAL, 2, depth1Item)
      ).not.toThrow();
    });
  });

  describe("CONTEXT type validation - must have parent", () => {
    it("should allow creating CONTEXT type item with parent", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const childCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.SouthEast] };
      expect(() =>
        createTestMapItem(2, childCoords, MapItemType.CONTEXT, 1, parentItem)
      ).not.toThrow();
    });

    it("should throw error when CONTEXT type has no parent", () => {
      const coords: Coord = { userId: "test-user", groupId: 0, path: [] };
      expect(() =>
        createTestMapItem(1, coords, MapItemType.CONTEXT, null, null)
      ).toThrow(MAPPING_ERRORS.NON_USER_ITEM_MUST_HAVE_PARENT);
    });

    it("should work with negative direction paths (composed children)", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      // Negative direction -3 represents ComposedEast
      const composedCoords: Coord = { userId: "test-user", groupId: 0, path: [-3] };
      expect(() =>
        createTestMapItem(2, composedCoords, MapItemType.CONTEXT, 1, parentItem)
      ).not.toThrow();
    });
  });

  describe("SYSTEM type validation - must have parent", () => {
    it("should allow creating SYSTEM type item with parent", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const parentItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const childCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.West] };
      expect(() =>
        createTestMapItem(2, childCoords, MapItemType.SYSTEM, 1, parentItem)
      ).not.toThrow();
    });

    it("should throw error when SYSTEM type has no parent", () => {
      const coords: Coord = { userId: "test-user", groupId: 0, path: [] };
      expect(() =>
        createTestMapItem(1, coords, MapItemType.SYSTEM, null, null)
      ).toThrow(MAPPING_ERRORS.NON_USER_ITEM_MUST_HAVE_PARENT);
    });

    it("should work with SYSTEM type nested under ORGANIZATIONAL", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const rootItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const orgCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthEast] };
      const orgItem = createTestMapItem(2, orgCoords, MapItemType.ORGANIZATIONAL, 1, rootItem);

      const systemCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthEast, Direction.East] };
      expect(() =>
        createTestMapItem(3, systemCoords, MapItemType.SYSTEM, 2, orgItem)
      ).not.toThrow();
    });
  });

  describe("Mixed type hierarchies", () => {
    it("should allow different non-USER types as siblings", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const rootItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      // Create siblings of different types
      const orgCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthWest] };
      const orgItem = createTestMapItem(2, orgCoords, MapItemType.ORGANIZATIONAL, 1, rootItem);

      const contextCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthEast] };
      const contextItem = createTestMapItem(3, contextCoords, MapItemType.CONTEXT, 1, rootItem);

      const systemCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.East] };
      const systemItem = createTestMapItem(4, systemCoords, MapItemType.SYSTEM, 1, rootItem);

      expect(orgItem.attrs.itemType).toBe(MapItemType.ORGANIZATIONAL);
      expect(contextItem.attrs.itemType).toBe(MapItemType.CONTEXT);
      expect(systemItem.attrs.itemType).toBe(MapItemType.SYSTEM);
    });

    it("should allow nesting any non-USER type under any non-USER type", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const rootItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      // ORGANIZATIONAL parent
      const orgCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthWest] };
      const orgItem = createTestMapItem(2, orgCoords, MapItemType.ORGANIZATIONAL, 1, rootItem);

      // CONTEXT under ORGANIZATIONAL
      const contextCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthWest, Direction.East] };
      const contextItem = createTestMapItem(3, contextCoords, MapItemType.CONTEXT, 2, orgItem);

      // SYSTEM under CONTEXT
      const systemCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.NorthWest, Direction.East, Direction.SouthWest] };
      const systemItem = createTestMapItem(4, systemCoords, MapItemType.SYSTEM, 3, contextItem);

      expect(systemItem.attrs.itemType).toBe(MapItemType.SYSTEM);
      expect(systemItem.attrs.parentId).toBe(3);
    });
  });

  describe("MapItem.isCenter with extended types", () => {
    it("should return true only for USER type with no parent", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const rootItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);
      expect(MapItem.isCenter(rootItem)).toBe(true);
    });

    it("should return false for ORGANIZATIONAL type", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const rootItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const orgCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.East] };
      const orgItem = createTestMapItem(2, orgCoords, MapItemType.ORGANIZATIONAL, 1, rootItem);
      expect(MapItem.isCenter(orgItem)).toBe(false);
    });

    it("should return false for CONTEXT type", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const rootItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const contextCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.East] };
      const contextItem = createTestMapItem(2, contextCoords, MapItemType.CONTEXT, 1, rootItem);
      expect(MapItem.isCenter(contextItem)).toBe(false);
    });

    it("should return false for SYSTEM type", () => {
      const rootCoords: Coord = { userId: "test-user", groupId: 0, path: [] };
      const rootItem = createTestMapItem(1, rootCoords, MapItemType.USER, null, null);

      const systemCoords: Coord = { userId: "test-user", groupId: 0, path: [Direction.East] };
      const systemItem = createTestMapItem(2, systemCoords, MapItemType.SYSTEM, 1, rootItem);
      expect(MapItem.isCenter(systemItem)).toBe(false);
    });
  });
});
