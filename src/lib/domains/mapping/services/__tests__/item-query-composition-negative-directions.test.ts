import { describe, beforeEach, it, expect } from "vitest";
import { type Coord, Direction } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("ItemQueryService - Composition with Negative Directions [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("hasComposition - negative directions", () => {
    it("should return true for tile with composed children (negative directions)", async () => {
      const setup = await _setupTileWithComposedChildren();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(true);
    });

    it("should return false for tile without composed children", async () => {
      const setup = await _setupTileWithoutComposition();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(false);
    });

    it("should return true when only one composed child exists", async () => {
      const setup = await _setupTileWithSingleComposedChild();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(true);
    });

    it("should return false for tile with only structural children", async () => {
      const setup = await _setupTileWithOnlyStructuralChildren();

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
  });

  describe("getComposedChildren - negative directions", () => {
    it("should return all composed children (negative directions)", async () => {
      const setup = await _setupTileWithComposedChildren();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should return 2 composed children (no container in new model)
      expect(composedItems.length).toBe(2);

      const childTitles = composedItems.map(item => item.title);
      expect(childTitles).toContain("Composed Child 1");
      expect(childTitles).toContain("Composed Child 2");
    });

    it("should return empty array for tile without composed children", async () => {
      const setup = await _setupTileWithoutComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      expect(composedItems.length).toBe(0);
    });

    it("should return single composed child when only one exists", async () => {
      const setup = await _setupTileWithSingleComposedChild();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      expect(composedItems.length).toBe(1);
      expect(composedItems[0]!.title).toBe("Single Composed Child");
    });

    it("should not return structural children when querying composed children", async () => {
      const setup = await _setupTileWithMixedChildren();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should only return composed children (negative directions)
      const titles = composedItems.map(item => item.title);
      expect(titles).toContain("Composed Child 1");
      expect(titles).not.toContain("Structural Child 1");
      expect(titles).not.toContain("Structural Child 2");
    });

    it("should return all 6 composed children when all slots are filled", async () => {
      const setup = await _setupTileWithAllComposedChildren();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should return all 6 composed children
      expect(composedItems.length).toBe(6);

      const childTitles = composedItems.map(item => item.title).sort();
      expect(childTitles).toEqual([
        "Composed East",
        "Composed NorthEast",
        "Composed NorthWest",
        "Composed SouthEast",
        "Composed SouthWest",
        "Composed West",
      ]);
    });
  });

  describe("getDescendants - composition filtering with negative directions", () => {
    it("should exclude composition (negative directions) by default", async () => {
      const setup = await _setupMixedStructureWithNegativeDirections();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
      });

      // Should return only structural children (directions 1-6), not composed children
      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child 1");
      expect(titles).toContain("Structural Child 2");
      expect(titles).not.toContain("Composed Child 1");
      expect(titles).not.toContain("Composed Child 2");
    });

    it("should include composition when requested", async () => {
      const setup = await _setupMixedStructureWithNegativeDirections();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
        includeComposition: true,
      });

      // Should return all descendants including composed children
      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child 1");
      expect(titles).toContain("Structural Child 2");
      expect(titles).toContain("Composed Child 1");
      expect(titles).toContain("Composed Child 2");
    });

    it("should filter nested composition correctly", async () => {
      const setup = await _setupNestedCompositionWithNegativeDirections();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
      });

      // Should exclude composition at all levels
      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child");
      expect(titles).not.toContain("Nested Composed Item");
    });

    it("should include nested composition when requested", async () => {
      const setup = await _setupNestedCompositionWithNegativeDirections();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
        includeComposition: true,
      });

      // Should include composition at all levels
      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child");
      expect(titles).toContain("Nested Composed Item");
    });
  });

  // Helper functions (prefixed with _ for internal use)
  async function _setupTileWithComposedChildren() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child that will have composed children
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

    // Create composed children (negative directions)
    const composedChild1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.ComposedNorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: composedChild1Coords,
      title: "Composed Child 1",
    });

    const composedChild2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.ComposedEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: composedChild2Coords,
      title: "Composed Child 2",
    });

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupTileWithoutComposition() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child without composed children
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

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupTileWithSingleComposedChild() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.East],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create single composed child
    const composedChildCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.East, Direction.ComposedNorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: composedChildCoords,
      title: "Single Composed Child",
    });

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupTileWithOnlyStructuralChildren() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

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

    // Create only structural children (positive directions)
    const structuralChild1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.West, Direction.NorthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: structuralChild1Coords,
      title: "Structural Child 1",
    });

    const structuralChild2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.West, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: structuralChild2Coords,
      title: "Structural Child 2",
    });

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupTileWithMixedChildren() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

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

    // Create structural children
    const structuralChild1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.NorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: structuralChild1Coords,
      title: "Structural Child 1",
    });

    const structuralChild2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: structuralChild2Coords,
      title: "Structural Child 2",
    });

    // Create composed child
    const composedChild1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast, Direction.ComposedNorthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: composedChild1Coords,
      title: "Composed Child 1",
    });

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupTileWithAllComposedChildren() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthWest],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create all 6 composed children
    const composedDirections = [
      { dir: Direction.ComposedNorthWest, name: "Composed NorthWest" },
      { dir: Direction.ComposedNorthEast, name: "Composed NorthEast" },
      { dir: Direction.ComposedEast, name: "Composed East" },
      { dir: Direction.ComposedSouthEast, name: "Composed SouthEast" },
      { dir: Direction.ComposedSouthWest, name: "Composed SouthWest" },
      { dir: Direction.ComposedWest, name: "Composed West" },
    ];

    for (const { dir, name } of composedDirections) {
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthWest, dir],
      });
      await testEnv.service.items.crud.addItemToMap({
        parentId: parseInt(parentItem.id),
        coords: childCoords,
        title: name,
      });
    }

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupMixedStructureWithNegativeDirections() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create 2 structural children at root level
    const structural1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: structural1Coords,
      title: "Structural Child 1",
    });

    const structural2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: structural2Coords,
      title: "Structural Child 2",
    });

    // Create composed children at root level (negative directions)
    const composed1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.ComposedNorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: composed1Coords,
      title: "Composed Child 1",
    });

    const composed2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.ComposedSouthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: composed2Coords,
      title: "Composed Child 2",
    });

    return {
      rootMapId: rootMap.id,
    };
  }

  async function _setupNestedCompositionWithNegativeDirections() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child
    const structuralCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const structuralChild = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: structuralCoords,
      title: "Structural Child",
    });

    // Create composed child of the structural child (nested composition)
    const nestedComposedCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.ComposedEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(structuralChild.id),
      coords: nestedComposedCoords,
      title: "Nested Composed Item",
    });

    return {
      rootMapId: rootMap.id,
    };
  }
});
