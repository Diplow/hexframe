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
    it("should return composition container and children for tile with composition", async () => {
      const setup = await _setupTileWithComposition();

      // Query via domain service (simulating tRPC call)
      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should return container + 2 children = 3 items
      expect(composedItems.length).toBe(3);
      expect(composedItems[0]!.coords).toBe(setup.compositionContainerCoordsId);
      expect(composedItems[0]!.title).toBe("Composition Container");

      // Verify children
      const childTitles = composedItems.slice(1).map((item) => item.title);
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

    it("should return only container when composition has no children", async () => {
      const setup = await _setupCompositionContainerOnly();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      expect(composedItems.length).toBe(1);
      expect(composedItems[0]!.title).toBe("Composition Container");
    });

    it("should handle root tile composition", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      // Create composition for root tile
      const rootCoords = CoordSystem.parseId(rootItem.coords);
      const compositionCoords = CoordSystem.getCompositionCoord(rootCoords);

      await testEnv.service.items.crud.addItemToMap({
        parentId: parseInt(rootItem.id),
        coords: compositionCoords,
        title: "Root Composition Container",
      });

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: rootItem.coords,
      });

      expect(composedItems.length).toBeGreaterThanOrEqual(1);
      expect(composedItems[0]!.title).toBe("Root Composition Container");
    });

    it("should only return direct children of composition container", async () => {
      const setup = await _setupNestedComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should not include grandchildren
      expect(composedItems.length).toBe(2); // Container + 1 direct child
      expect(composedItems.map((item) => item.title)).not.toContain(
        "Nested Grandchild"
      );
    });
  });

  describe("hasComposition", () => {
    it("should return true when tile has composition container", async () => {
      const setup = await _setupTileWithComposition();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(true);
    });

    it("should return false when tile has no composition", async () => {
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

    it("should return true for root tile with composition", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      // Add composition container
      const rootCoords = CoordSystem.parseId(rootItem.coords);
      const compositionCoords = CoordSystem.getCompositionCoord(rootCoords);

      await testEnv.service.items.crud.addItemToMap({
        parentId: parseInt(rootItem.id),
        coords: compositionCoords,
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

    // Create composition container (direction 0)
    const compositionCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center],
    });
    const containerItem = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Composition Container",
    });

    // Create composed children
    const child1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center, Direction.NorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(containerItem.id),
      coords: child1Coords,
      title: "Composed Child 1",
    });

    const child2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(containerItem.id),
      coords: child2Coords,
      title: "Composed Child 2",
    });

    return {
      parentCoordsId: CoordSystem.createId(parentCoords),
      compositionContainerCoordsId: CoordSystem.createId(compositionCoords),
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

  async function _setupCompositionContainerOnly() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent tile
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.West],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create composition container without children
    const compositionCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.West, Direction.Center],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Composition Container",
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

    // Create composition container
    const compositionCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.Center],
    });
    const containerItem = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Composition Container",
    });

    // Create composed child
    const childCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.Center, Direction.NorthWest],
    });
    const childItem = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(containerItem.id),
      coords: childCoords,
      title: "Composed Child",
    });

    // Create nested grandchild (should NOT be returned)
    const grandchildCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.Center, Direction.NorthWest, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(childItem.id),
      coords: grandchildCoords,
      title: "Nested Grandchild",
    });

    return {
      parentCoordsId: CoordSystem.createId(parentCoords),
    };
  }
});
