import { describe, beforeEach, it, expect } from "vitest";
import { type Coord, Direction } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  createTestItem,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("ItemQueryService - Composition Queries [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("hasComposition", () => {
    it("should return true for tile with composition using negative directions", async () => {
      const setup = await _setupTileWithNegativeDirectionComposition();

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

      // Get coordId from the root map's first item (which is the root item itself)
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const hasComp = await testEnv.service.items.query.hasComposition({
        coordId: rootItem.coords,
      });

      expect(hasComp).toBe(false);
    });
  });

  describe("getComposedChildren", () => {
    it("should return children for tile with negative direction composition", async () => {
      const setup = await _setupTileWithNegativeDirectionComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // New model: should return 2 composed children (negative directions)
      expect(composedItems.length).toBe(2);
      const titles = composedItems.map(item => item.title);
      expect(titles).toContain("Composed Child 1");
      expect(titles).toContain("Composed Child 2");
    });

    it("should return empty array for tile without composition", async () => {
      const setup = await _setupTileWithoutComposition();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      expect(composedItems.length).toBe(0);
    });

    it("should return empty array when parent has no composed children", async () => {
      const setup = await _setupTileWithStructuralChildrenOnly();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      expect(composedItems.length).toBe(0);
    });

    it("should return all composed children when composition has multiple children", async () => {
      const setup = await _setupCompositionWithManyNegativeChildren();

      const composedItems = await testEnv.service.items.query.getComposedChildren({
        coordId: setup.parentCoordsId,
      });

      // Should return 4 composed children (all with negative directions)
      expect(composedItems.length).toBe(4);
    });
  });

  describe("getDescendants - composition filtering", () => {
    it("should include composition by default", async () => {
      const setup = await _setupMixedStructure();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
      });

      // Should return both structural children and composition by default
      // Setup has: 2 structural children + 2 composed children (negative directions)
      // Default should return all 4 items
      expect(descendants.length).toBe(4);

      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child 1");
      expect(titles).toContain("Structural Child 2");
      expect(titles).toContain("Composed Child 1");
      expect(titles).toContain("Composed Child 2");
    });

    it("should include composition when requested", async () => {
      const setup = await _setupMixedStructure();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
        includeComposition: true,
      });

      // Should return all descendants including composition
      // Setup has: 2 structural + 2 composed children = 4 total
      expect(descendants.length).toBe(4);

      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child 1");
      expect(titles).toContain("Structural Child 2");
      expect(titles).toContain("Composed Child 1");
      expect(titles).toContain("Composed Child 2");
    });

    it("should include nested composition by default", async () => {
      const setup = await _setupNestedComposition();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
      });

      // Should include composition at all levels by default
      // Setup has: 1 structural child + 1 nested composed child
      expect(descendants.length).toBe(2);

      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child");
      expect(titles).toContain("Nested Composed Item");
    });

    it("should include nested composition when requested", async () => {
      const setup = await _setupNestedComposition();

      const descendants = await testEnv.service.items.query.getDescendants({
        itemId: setup.rootMapId,
        includeComposition: true,
      });

      // Should include composition at all levels
      // Setup has: 1 structural child + 1 nested composed child
      expect(descendants.length).toBe(2);

      const titles = descendants.map(d => d.title);
      expect(titles).toContain("Structural Child");
      expect(titles).toContain("Nested Composed Item");
    });
  });

  // Helper functions (prefixed with _ for internal use)
  async function _setupTileWithNegativeDirectionComposition() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child that will have composition
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create composed children using negative directions (-1 = ComposedNorthWest, -3 = ComposedEast)
    const composedChild1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, -1], // ComposedNorthWest
    });
    await createTestItem(testEnv, {
      parentId: parseInt(parentItem.id),
      coords: composedChild1Coords,
      title: "Composed Child 1",
    });

    const composedChild2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, -3], // ComposedEast
    });
    await createTestItem(testEnv, {
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

    // Create a structural child without composition
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupTileWithStructuralChildrenOnly() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create structural children (positive directions only, no composition)
    const structuralChild1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.East],
    });
    await createTestItem(testEnv, {
      parentId: parseInt(parentItem.id),
      coords: structuralChild1Coords,
      title: "Structural Child 1",
    });

    return {
      parentCoordsId: parentItem.coords,
    };
  }

  async function _setupCompositionWithManyNegativeChildren() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create a structural child
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create 4 composed children using negative directions
    const negativeDirections = [-1, -2, -3, -6]; // ComposedNorthWest, ComposedNorthEast, ComposedEast, ComposedWest
    for (let i = 0; i < 4; i++) {
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, negativeDirections[i]!],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
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
    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: structural1Coords,
      title: "Structural Child 1",
    });

    const structural2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.East],
    });
    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: structural2Coords,
      title: "Structural Child 2",
    });

    // Create 2 composed children at root level using negative directions
    const composed1Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [-1], // ComposedNorthWest
    });
    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: composed1Coords,
      title: "Composed Child 1",
    });

    const composed2Coords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [-4], // ComposedSouthEast
    });
    await createTestItem(testEnv, {
      parentId: rootMap.id,
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
    const structuralChild = await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: structuralCoords,
      title: "Structural Child",
    });

    // Create a composed item for the structural child using negative direction
    const nestedComposedCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, -3], // ComposedEast
    });
    await createTestItem(testEnv, {
      parentId: parseInt(structuralChild.id),
      coords: nestedComposedCoords,
      title: "Nested Composed Item",
    });

    return {
      rootMapId: rootMap.id,
    };
  }
});
