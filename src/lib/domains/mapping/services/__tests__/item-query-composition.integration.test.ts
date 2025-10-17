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

describe("ItemQueryService - Composition Queries [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("hasComposition", () => {
    it("should return true for tile with composition", async () => {
      const setup = await _setupTileWithComposition();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(true);
    });

    it("should return false for tile without composition", async () => {
      const setup = await _setupTileWithoutComposition();

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: setup.parentCoordsId,
      });

      expect(hasComp).toBe(false);
    });

    it("should return false for root tile without composition", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: rootMap.coords,
      });

      expect(hasComp).toBe(false);
    });
  });

  describe("getComposedChildren", () => {
    it("should return container and children for tile with composition", async () => {
      const setup = await _setupTileWithComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should return container + 2 composed children = 3 items
      expect(composedItems.length).toBe(3);

      // First item should be the composition container
      expect(composedItems[0]!.coordId).toBe(setup.compositionContainerCoordsId);
      expect(composedItems[0]!.title).toBe("Composition Container");

      // Other items should be the composed children
      const childTitles = composedItems.slice(1).map(item => item.title);
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

      // Should return just the composition container
      expect(composedItems.length).toBe(1);
      expect(composedItems[0]!.title).toBe("Composition Container");
    });

    it("should return container and all children when composition has multiple children", async () => {
      const setup = await _setupCompositionWithManyChildren();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should return container + 4 children = 5 items
      expect(composedItems.length).toBe(5);
      expect(composedItems[0]!.title).toBe("Composition Container");
    });
  });

  describe("getDescendants - composition filtering", () => {
    it("should exclude composition by default", async () => {
      const setup = await _setupMixedStructure();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
      });

      // Should return only structural children (directions 1-6), not composition
      // Setup has: 2 structural children + 1 composition container + 2 composed children
      // Default should return only 2 structural children
      expect(descendants.length).toBe(2);

      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child 1");
      expect(titles).toContain("Structural Child 2");
      expect(titles).not.toContain("Composition Container");
    });

    it("should include composition when requested", async () => {
      const setup = await _setupMixedStructure();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
        includeComposition: true,
      });

      // Should return all descendants including composition
      // Setup has: 2 structural + 1 composition container + 2 composed children = 5 total
      expect(descendants.length).toBe(5);

      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child 1");
      expect(titles).toContain("Structural Child 2");
      expect(titles).toContain("Composition Container");
      expect(titles).toContain("Composed Child 1");
      expect(titles).toContain("Composed Child 2");
    });

    it("should filter nested composition correctly", async () => {
      const setup = await _setupNestedComposition();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
      });

      // Should exclude composition at all levels
      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child");
      expect(titles).not.toContain("Child Composition Container");
      expect(titles).not.toContain("Nested Composed Item");
    });

    it("should include nested composition when requested", async () => {
      const setup = await _setupNestedComposition();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
        includeComposition: true,
      });

      // Should include composition at all levels
      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child");
      expect(titles).toContain("Child Composition Container");
      expect(titles).toContain("Nested Composed Item");
    });
  });

  // Helper functions (prefixed with _ for internal use)
  async function _setupTileWithComposition() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child that will have composition
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
    const compositionContainer = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Composition Container",
    });

    // Create composed children (children of the composition container)
    const composedChild1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(compositionContainer.id),
      coords: composedChild1Coords,
      title: "Composed Child 1",
    });

    const composedChild2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center, Direction.West],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(compositionContainer.id),
      coords: composedChild2Coords,
      title: "Composed Child 2",
    });

    return {
      parentCoordsId: parentItem.coords,
      compositionContainerCoordsId: compositionContainer.coords,
    };
  }

  async function _setupTileWithoutComposition() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child without composition
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

  async function _setupCompositionContainerOnly() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child
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

    // Create composition container (direction 0) but no children
    const compositionCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Composition Container",
    });

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupCompositionWithManyChildren() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child
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

    // Create composition container
    const compositionCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center],
    });
    const compositionContainer = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Composition Container",
    });

    // Create 4 composed children
    const directions = [Direction.NorthWest, Direction.NorthEast, Direction.East, Direction.West];
    for (let i = 0; i < 4; i++) {
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center, directions[i]!],
      });
      await testEnv.service.items.crud.addItemToMap({
        parentId: parseInt(compositionContainer.id),
        coords: childCoords,
        title: `Composed Child ${i + 1}`,
      });
    }

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupMixedStructure() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create 2 structural children
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

    // Create composition container at root level
    const compositionCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.Center],
    });
    const compositionContainer = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: compositionCoords,
      title: "Composition Container",
    });

    // Create 2 composed children
    const composed1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.Center, Direction.NorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(compositionContainer.id),
      coords: composed1Coords,
      title: "Composed Child 1",
    });

    const composed2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.Center, Direction.SouthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(compositionContainer.id),
      coords: composed2Coords,
      title: "Composed Child 2",
    });

    return {
      rootMapId: rootMap.id,
    };
  }

  async function _setupNestedComposition() {
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

    // Create composition container for the structural child
    const childCompositionCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center],
    });
    const childCompositionContainer = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(structuralChild.id),
      coords: childCompositionCoords,
      title: "Child Composition Container",
    });

    // Create a composed item in the nested composition
    const nestedComposedCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.Center, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(childCompositionContainer.id),
      coords: nestedComposedCoords,
      title: "Nested Composed Item",
    });

    return {
      rootMapId: rootMap.id,
    };
  }
});
