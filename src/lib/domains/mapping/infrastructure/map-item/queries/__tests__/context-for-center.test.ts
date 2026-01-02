import { describe, beforeEach, it, expect } from "vitest";
import { Direction } from "~/lib/domains/mapping/utils";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  createTestItem,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("getContextForCenter [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("Parent retrieval", () => {
    it("should return the immediate parent, not grandparent (path slice bug)", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create hierarchy: Root -> Parent (NE) -> Child (NE, E)
      // Path structure:
      // Root: []
      // Parent: [1] (NorthEast)
      // Child: [1, 3] (NorthEast, East)

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent Tile",
        content: "This is the parent",
      });

      // Create child tile
      const childCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: childCoords,
        title: "Child Tile",
        content: "This is the child",
      });

      // Get context for the child tile with parent included
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast, Direction.East],
        userId,
        groupId,
        includeParent: true,
        includeComposed: false,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // BUG: With slice(0, -2), centerPath [1, 3] becomes [] (root/grandparent)
      // FIX: With slice(0, -1), centerPath [1, 3] becomes [1] (parent)

      // The parent should be the tile with path [1], not the root with path []
      expect(context.parent).not.toBeNull();
      expect(context.parent?.attrs.coords.path).toEqual([Direction.NorthEast]);
      expect(context.parent?.ref.attrs.title).toBe("Parent Tile");

      // Should NOT return the root as parent
      expect(context.parent?.attrs.coords.path).not.toEqual([]);
    });

    it("should handle 3-level hierarchy correctly", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create hierarchy: Root -> Level1 -> Level2 -> Level3
      // Paths: [] -> [1] -> [1, 2] -> [1, 2, 3]

      const level1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const level1 = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: level1Coords,
        title: "Level 1",
      });

      const level2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.NorthWest],
      });
      const level2 = await createTestItem(testEnv, {
        parentId: parseInt(level1.id),
        coords: level2Coords,
        title: "Level 2",
      });

      const level3Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.NorthWest, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(level2.id),
        coords: level3Coords,
        title: "Level 3",
      });

      // Get context for Level 3 - parent should be Level 2
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast, Direction.NorthWest, Direction.East],
        userId,
        groupId,
        includeParent: true,
        includeComposed: false,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // With the bug (slice(0, -2)): path [1,1,3] -> [1] (returns Level 1, wrong!)
      // With the fix (slice(0, -1)): path [1,1,3] -> [1,1] (returns Level 2, correct!)

      expect(context.parent).not.toBeNull();
      expect(context.parent?.attrs.coords.path).toEqual([
        Direction.NorthEast,
        Direction.NorthWest,
      ]);
      expect(context.parent?.ref.attrs.title).toBe("Level 2");
    });

    it("should return null parent for root tile", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      await _setupBasicMap(testEnv.service, testParams);

      // Get context for root (path [])
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [],
        userId,
        groupId,
        includeParent: true,
        includeComposed: false,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Root has no parent
      expect(context.parent).toBeNull();
    });

    it("should return root as parent for direct children", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create direct child of root
      const childCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.West],
      });
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: childCoords,
        title: "Direct Child",
      });

      // Get context for direct child (path [6])
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.West],
        userId,
        groupId,
        includeParent: true,
        includeComposed: false,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Parent should be root with path []
      expect(context.parent).not.toBeNull();
      expect(context.parent?.attrs.coords.path).toEqual([]);
      expect(context.parent?.ref.attrs.title).toBe(rootMap.title);
    });
  });

  describe("Children retrieval", () => {
    it("should return direct children of center tile", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent Tile",
      });

      // Create 3 children
      const child1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: child1Coords,
        title: "Child 1",
      });

      const child2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: child2Coords,
        title: "Child 2",
      });

      const child3Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.SouthEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: child3Coords,
        title: "Child 3",
      });

      // Get context with children
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: false,
        includeChildren: true,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Should return all 3 children
      expect(context.children).toHaveLength(3);
      const childTitles = context.children.map((c) => c.ref.attrs.title).sort();
      expect(childTitles).toEqual(["Child 1", "Child 2", "Child 3"]);

      // Verify they are direct children (depth = parent depth + 1)
      context.children.forEach((child) => {
        expect(child.attrs.coords.path).toHaveLength(2);
        expect(child.attrs.coords.path[0]).toBe(Direction.NorthEast);
      });
    });

    it("should not include composed children (direction 0) in regular children", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent Tile",
      });

      // Create composition container (direction 0)
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composedCoords,
        title: "Composed Container",
      });

      // Create regular child
      const childCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: childCoords,
        title: "Regular Child",
      });

      // Get context with children
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: false,
        includeChildren: true,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Should only return the regular child, not the composed container
      expect(context.children).toHaveLength(1);
      expect(context.children[0]?.ref.attrs.title).toBe("Regular Child");
    });

    it("should return empty array when center has no children", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent tile with no children
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Childless Parent",
      });

      // Get context with children
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: false,
        includeChildren: true,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      expect(context.children).toHaveLength(0);
    });
  });

  describe("Composed children retrieval", () => {
    it("should return composed children with negative directions", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent Tile",
      });

      // Create composed children directly with negative directions (no container)
      const composed1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composed1Coords,
        title: "Composed Child 1",
      });

      const composed2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composed2Coords,
        title: "Composed Child 2",
      });

      // Get context with composed children
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: true,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Should return 2 composed children
      expect(context.composed).toHaveLength(2);

      // Verify composed children titles
      const composedTitles = context.composed
        .map((c) => c.ref.attrs.title)
        .sort();
      expect(composedTitles).toEqual(["Composed Child 1", "Composed Child 2"]);

      // Verify they have negative directions at depth 2
      context.composed.forEach((item) => {
        expect(item.attrs.coords.path).toHaveLength(2); // center=1, composed=2
        expect(item.attrs.coords.path[1]).toBeLessThan(0); // Second element is negative
      });
    });

    it("should only include tiles within direction 0 path", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent Tile",
      });

      // Create composition container
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composedCoords,
        title: "Composed Container",
      });

      // Create regular child (should NOT be in composed)
      const regularChildCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: regularChildCoords,
        title: "Regular Child",
      });

      // Get context with composed children
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: true,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Should return empty array - we only created the container, not any composed children
      // The container itself ("1,0") is not a composed child, it's just a transition
      expect(context.composed).toHaveLength(0);
    });

    it("should return empty array when no composition exists", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent tile without composition
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent Without Composition",
      });

      // Get context with composed children
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: true,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      expect(context.composed).toHaveLength(0);
    });
  });

  describe("Grandchildren retrieval", () => {
    it("should return grandchildren (depth 2 from center)", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent",
      });

      // Create child
      const childCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      const childItem = await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: childCoords,
        title: "Child",
      });

      // Create grandchildren
      const grandchild1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East, Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(childItem.id),
        coords: grandchild1Coords,
        title: "Grandchild 1",
      });

      const grandchild2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East, Direction.SouthEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(childItem.id),
        coords: grandchild2Coords,
        title: "Grandchild 2",
      });

      // Get context with grandchildren
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: false,
        includeChildren: false,
        includeGrandchildren: true,
        requester: SYSTEM_INTERNAL,
      });

      // Should return both grandchildren
      expect(context.grandchildren).toHaveLength(2);
      const grandchildTitles = context.grandchildren
        .map((g) => g.ref.attrs.title)
        .sort();
      expect(grandchildTitles).toEqual(["Grandchild 1", "Grandchild 2"]);

      // Verify they are at depth 3 (grandparent=1, parent=2, grandchild=3)
      context.grandchildren.forEach((grandchild) => {
        expect(grandchild.attrs.coords.path).toHaveLength(3);
      });
    });

    it("should not include composed tiles in grandchildren", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent",
      });

      // Create child with composition
      const childCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      const childItem = await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: childCoords,
        title: "Child",
      });

      // Create composed grandchild (direction 0 in path)
      const composedGrandchildCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East, Direction.Center],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(childItem.id),
        coords: composedGrandchildCoords,
        title: "Composed Grandchild",
      });

      // Create regular grandchild
      const regularGrandchildCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East, Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(childItem.id),
        coords: regularGrandchildCoords,
        title: "Regular Grandchild",
      });

      // Get context with grandchildren
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: false,
        includeChildren: false,
        includeGrandchildren: true,
        requester: SYSTEM_INTERNAL,
      });

      // Should only return regular grandchild, not composed
      expect(context.grandchildren).toHaveLength(1);
      expect(context.grandchildren[0]?.ref.attrs.title).toBe(
        "Regular Grandchild",
      );
    });

    it("should return empty array when no grandchildren exist", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent without grandchildren
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent Without Grandchildren",
      });

      // Get context with grandchildren
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: false,
        includeComposed: false,
        includeChildren: false,
        includeGrandchildren: true,
        requester: SYSTEM_INTERNAL,
      });

      expect(context.grandchildren).toHaveLength(0);
    });
  });

  describe("Center with Direction.Center in path", () => {
    it("should correctly handle children/grandchildren when center path contains 0", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create: Root -> Tile1 -> Container(0) -> ComposedChild(1) [this is our center]
      // Path structure: [] -> [1] -> [1,0] -> [1,0,1]

      const tile1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const tile1 = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: tile1Coords,
        title: "Tile 1",
      });

      const containerCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center],
      });
      const container = await createTestItem(testEnv, {
        parentId: parseInt(tile1.id),
        coords: containerCoords,
        title: "Container",
      });

      // This is our center - a composed child with 0 in its path
      const centerCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center, Direction.NorthWest],
      });
      const centerItem = await createTestItem(testEnv, {
        parentId: parseInt(container.id),
        coords: centerCoords,
        title: "Composed Child Center",
      });

      // Create regular children of the center: [1,0,1,3], [1,0,1,4]
      const child1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center, Direction.NorthWest, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(centerItem.id),
        coords: child1Coords,
        title: "Regular Child 1",
      });

      const child2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center, Direction.NorthWest, Direction.SouthEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(centerItem.id),
        coords: child2Coords,
        title: "Regular Child 2",
      });

      // Create a composed child under center: [1,0,1,0] (container)
      const composedContainerCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center, Direction.NorthWest, Direction.Center],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(centerItem.id),
        coords: composedContainerCoords,
        title: "Composed Container Under Center",
      });

      // Get context for center at [1,0,1]
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast, Direction.Center, Direction.NorthWest],
        userId,
        groupId,
        includeParent: true,
        includeComposed: false,
        includeChildren: true,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Bug: Children query uses notLike('%,0,%') which would exclude [1,0,1,3]
      // because it matches the pattern (,0, appears in the path)
      // But [1,0,1,3] IS a valid child - the 0 is in the CENTER path, not in the child segment

      // Should return 2 regular children, NOT the composed container
      expect(context.children).toHaveLength(2);
      const childTitles = context.children.map((c) => c.ref.attrs.title).sort();
      expect(childTitles).toEqual(["Regular Child 1", "Regular Child 2"]);

      // Verify parent is the container
      expect(context.parent?.ref.attrs.title).toBe("Container");
    });
  });

  describe("Full context retrieval", () => {
    it("should retrieve parent, center, composed, children, and grandchildren together", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent (root's child)
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Center Tile",
      });

      // Create composition
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.Center],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composedCoords,
        title: "Composed Container",
      });

      // Create children
      const child1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      const child1Item = await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: child1Coords,
        title: "Child 1",
      });

      const child2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.West],
      });
      const child2Item = await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: child2Coords,
        title: "Child 2",
      });

      // Create grandchildren
      const grandchild1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East, Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(child1Item.id),
        coords: grandchild1Coords,
        title: "Grandchild 1",
      });

      const grandchild2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.West, Direction.SouthEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(child2Item.id),
        coords: grandchild2Coords,
        title: "Grandchild 2",
      });

      // Get full context
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast],
        userId,
        groupId,
        includeParent: true,
        includeComposed: true,
        includeChildren: true,
        includeGrandchildren: true,
        requester: SYSTEM_INTERNAL,
      });

      // Verify all parts
      expect(context.parent?.ref.attrs.title).toBe(rootMap.title);
      expect(context.center.ref.attrs.title).toBe("Center Tile");

      // Composed should be empty - we only created the container, not composed children
      // The container at "1,0" is not returned, only actual composed children like "1,0,1" would be
      expect(context.composed).toHaveLength(0);

      expect(context.children).toHaveLength(2);
      expect(context.grandchildren).toHaveLength(2);

      // Verify correct structure
      const childTitles = context.children.map((c) => c.ref.attrs.title).sort();
      expect(childTitles).toEqual(["Child 1", "Child 2"]);

      const grandchildTitles = context.grandchildren
        .map((g) => g.ref.attrs.title)
        .sort();
      expect(grandchildTitles).toEqual(["Grandchild 1", "Grandchild 2"]);
    });
  });
});
