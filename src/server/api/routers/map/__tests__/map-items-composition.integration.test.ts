import { describe, beforeEach, it, expect } from "vitest";
import { type Coord, Direction, CoordSystem } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("tRPC Map Items Router - Composition Queries [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("getComposedChildren", () => {
    it("should return composed children for tile with composition", async () => {
      const setup = await _setupTileWithComposition();

      // Query via domain service (simulating tRPC call)
      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should return 2 children (no container in new system)
      expect(composedItems.length).toBe(2);

      // Verify children
      const childTitles = composedItems.map((item) => item.title);
      expect(childTitles).toContain("Composed Child 1");
      expect(childTitles).toContain("Composed Child 2");
    });

    it("should return empty array for tile without composition", async () => {
      const setup = await _setupTileWithoutComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      expect(composedItems.length).toBe(0);
    });

    it("should return empty array when parent exists but has no composed children", async () => {
      const setup = await _setupTileWithoutComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      expect(composedItems.length).toBe(0);
    });

    it("should handle root tile composition", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      // Create composed child for root tile
      const rootCoords = CoordSystem.parseId(rootItem.coords);
      const composedChildCoord: Coord = {
        ...rootCoords,
        path: [Direction.ComposedNorthWest],
      };

      await testEnv.service.items.crud.addItemToMap({
        parentId: parseInt(rootItem.id),
        coords: composedChildCoord,
        title: "Root Composed Child",
      });

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: rootItem.coords,
      });

      expect(composedItems.length).toBe(1);
      expect(composedItems[0]!.title).toBe("Root Composed Child");
    });

    it("should only return direct composed children, not grandchildren", async () => {
      const setup = await _setupNestedComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should only return the direct composed child, not its structural child
      expect(composedItems.length).toBe(1);
      expect(composedItems[0]!.title).toBe("Composed Child");
      expect(composedItems.map((item) => item.title)).not.toContain(
        "Nested Structural Child"
      );
    });
  });

  describe("hasComposition", () => {
    it("should return true when tile has composed children", async () => {
      const setup = await _setupTileWithComposition();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(true);
    });

    it("should return false when tile has no composed children", async () => {
      const setup = await _setupTileWithoutComposition();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(false);
    });

    it("should return false for root tile without composition", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: rootItem.coords,
      });

      expect(hasComp).toBe(false);
    });

    it("should return true for root tile with composed children", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      // Add composed child (negative direction)
      const rootCoords = CoordSystem.parseId(rootItem.coords);
      const composedChildCoord: Coord = {
        ...rootCoords,
        path: [Direction.ComposedEast],
      };

      await testEnv.service.items.crud.addItemToMap({
        parentId: parseInt(rootItem.id),
        coords: composedChildCoord,
        title: "Root Composition",
      });

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: rootItem.coords,
      });

      expect(hasComp).toBe(true);
    });
  });

  // Helper functions
  async function _setupTileWithComposition() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent tile
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create composed children directly with negative directions (no container)
    const child1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.ComposedNorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: child1Coords,
      title: "Composed Child 1",
    });

    const child2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.ComposedEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: child2Coords,
      title: "Composed Child 2",
    });

    return {
      parentCoordsId: CoordSystem.createId(parentCoords),
    };
  }

  async function _setupTileWithoutComposition() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent tile without composition
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Without Composition",
    });

    return {
      parentCoordsId: CoordSystem.createId(parentCoords),
    };
  }

  async function _setupNestedComposition() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent tile
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create composed child with negative direction
    const childCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.ComposedNorthWest],
    });
    const childItem = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: childCoords,
      title: "Composed Child",
    });

    // Create structural child of the composed child (should NOT be returned by getComposedChildren of parent)
    const grandchildCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.ComposedNorthWest, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(childItem.id),
      coords: grandchildCoords,
      title: "Nested Structural Child",
    });

    return {
      parentCoordsId: CoordSystem.createId(parentCoords),
    };
  }
});
