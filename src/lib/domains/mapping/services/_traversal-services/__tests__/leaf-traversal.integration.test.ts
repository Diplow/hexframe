import { describe, beforeEach, it, expect } from "vitest";
import { Direction, CoordSystem } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  createTestItem,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { LeafTraversalService } from "~/lib/domains/mapping/services/_traversal-services";

/**
 * Helper to convert string id from MapItemContract to number for parentId
 */
function toParentId(id: string): number {
  return parseInt(id, 10);
}

describe("LeafTraversalService [Integration - DB]", () => {
  let testEnv: TestEnvironment;
  let leafTraversalService: LeafTraversalService;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
    leafTraversalService = new LeafTraversalService({
      itemQueryService: testEnv.service.items.query,
    });
  });

  describe("getAllLeafTiles", () => {
    it("returns root itself as leaf when root has no children", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootCoordId = rootMap.items[0]!.coords;

      const leaves = await leafTraversalService.getAllLeafTiles(rootCoordId);

      // Root with no children is itself the leaf to execute
      expect(leaves).toEqual([rootCoordId]);
    });

    it("returns leaf coords for root with direct leaf children", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create two direct children (leaves)
      const child1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const child2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      });

      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child1Coords,
        title: "Child 1",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child2Coords,
        title: "Child 2",
      });

      const leaves = await leafTraversalService.getAllLeafTiles(rootCoordId);

      expect(leaves).toHaveLength(2);
      expect(leaves).toContain(CoordSystem.createId(child1Coords));
      expect(leaves).toContain(CoordSystem.createId(child2Coords));
    });

    it("returns leaves in direction order (1, 2, 3...)", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create children in reverse order to test ordering
      const child3Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East], // Direction 3
      });
      const child1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest], // Direction 1
      });
      const child2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthEast], // Direction 2
      });

      // Create in reverse order
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child3Coords,
        title: "Child 3",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child1Coords,
        title: "Child 1",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child2Coords,
        title: "Child 2",
      });

      const leaves = await leafTraversalService.getAllLeafTiles(rootCoordId);

      // Should be ordered by direction: 1, 2, 3
      expect(leaves).toHaveLength(3);
      expect(leaves[0]).toBe(CoordSystem.createId(child1Coords));
      expect(leaves[1]).toBe(CoordSystem.createId(child2Coords));
      expect(leaves[2]).toBe(CoordSystem.createId(child3Coords));
    });

    it("recurses into parent tiles to find nested leaves", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create a parent child
      const parentCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const parentChild = await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: parentCoords,
        title: "Parent",
      });

      // Create nested children under the parent
      const nestedChild1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.East],
      });
      const nestedChild2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.West],
      });

      await createTestItem(testEnv, {
        parentId: toParentId(parentChild.id),
        coords: nestedChild1Coords,
        title: "Nested Child 1",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(parentChild.id),
        coords: nestedChild2Coords,
        title: "Nested Child 2",
      });

      const leaves = await leafTraversalService.getAllLeafTiles(rootCoordId);

      // Parent is not a leaf (has children), only nested children are leaves
      expect(leaves).toHaveLength(2);
      expect(leaves).toContain(CoordSystem.createId(nestedChild1Coords));
      expect(leaves).toContain(CoordSystem.createId(nestedChild2Coords));
      expect(leaves).not.toContain(CoordSystem.createId(parentCoords));
    });

    it("handles deep nesting (3+ levels)", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Level 1
      const level1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const level1 = await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: level1Coords,
        title: "Level 1",
      });

      // Level 2
      const level2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.East],
      });
      const level2 = await createTestItem(testEnv, {
        parentId: toParentId(level1.id),
        coords: level2Coords,
        title: "Level 2",
      });

      // Level 3 (leaf)
      const level3Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.East, Direction.SouthWest],
      });
      await createTestItem(testEnv, {
        parentId: toParentId(level2.id),
        coords: level3Coords,
        title: "Level 3 Leaf",
      });

      const leaves = await leafTraversalService.getAllLeafTiles(rootCoordId);

      expect(leaves).toHaveLength(1);
      expect(leaves[0]).toBe(CoordSystem.createId(level3Coords));
    });

    it("ignores composed children (negative directions)", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create structural child (should be found)
      const structuralCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: structuralCoords,
        title: "Structural Child",
      });

      // Create composed child (should be ignored)
      const composedCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: composedCoords,
        title: "Composed Child",
      });

      const leaves = await leafTraversalService.getAllLeafTiles(rootCoordId);

      expect(leaves).toHaveLength(1);
      expect(leaves[0]).toBe(CoordSystem.createId(structuralCoords));
    });

    it("ignores direction-0 (hexplan) children", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create structural child (should be found)
      const structuralCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: structuralCoords,
        title: "Structural Child",
      });

      // Create hexplan child at direction 0 (should be ignored)
      const hexplanCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.Center],
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: hexplanCoords,
        title: "Hexplan",
      });

      const leaves = await leafTraversalService.getAllLeafTiles(rootCoordId);

      expect(leaves).toHaveLength(1);
      expect(leaves[0]).toBe(CoordSystem.createId(structuralCoords));
    });
  });

  describe("getNextIncompleteLeaf", () => {
    it("returns first leaf when completedCoords is empty", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create two children
      const child1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const child2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      });

      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child1Coords,
        title: "Child 1",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child2Coords,
        title: "Child 2",
      });

      const result = await leafTraversalService.getNextIncompleteLeaf(
        rootCoordId,
        new Set()
      );

      expect(result.leafCoords).toBe(CoordSystem.createId(child1Coords));
      expect(result.allLeafCoords).toHaveLength(2);
    });

    it("skips completed leaves and returns next incomplete", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create two children
      const child1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const child2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      });

      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child1Coords,
        title: "Child 1",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child2Coords,
        title: "Child 2",
      });

      const child1CoordId = CoordSystem.createId(child1Coords);
      const completedCoords = new Set([child1CoordId]);

      const result = await leafTraversalService.getNextIncompleteLeaf(
        rootCoordId,
        completedCoords
      );

      expect(result.leafCoords).toBe(CoordSystem.createId(child2Coords));
    });

    it("returns null when all leaves are completed", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create two children
      const child1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const child2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      });

      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child1Coords,
        title: "Child 1",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child2Coords,
        title: "Child 2",
      });

      const completedCoords = new Set([
        CoordSystem.createId(child1Coords),
        CoordSystem.createId(child2Coords),
      ]);

      const result = await leafTraversalService.getNextIncompleteLeaf(
        rootCoordId,
        completedCoords
      );

      expect(result.leafCoords).toBeNull();
      expect(result.allLeafCoords).toHaveLength(2);
    });

    it("handles meta-leaf: tile that gained children is no longer a leaf", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create a tile that was previously a leaf but now has children
      const formerLeafCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const formerLeaf = await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: formerLeafCoords,
        title: "Former Leaf (now parent)",
      });

      // Add children to the former leaf (making it a parent)
      const newLeafCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: toParentId(formerLeaf.id),
        coords: newLeafCoords,
        title: "New Leaf",
      });

      // The completed set still has the former leaf coord (from a previous run)
      const completedCoords = new Set([
        CoordSystem.createId(formerLeafCoords),
      ]);

      const result = await leafTraversalService.getNextIncompleteLeaf(
        rootCoordId,
        completedCoords
      );

      // Should return the new leaf, not the former leaf
      expect(result.leafCoords).toBe(CoordSystem.createId(newLeafCoords));
      // The former leaf should NOT be in allLeafCoords since it has children now
      expect(result.allLeafCoords).not.toContain(
        CoordSystem.createId(formerLeafCoords)
      );
    });

    it("returns allLeafCoords alongside the next leaf", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0]!;
      const rootCoordId = rootItem.coords;

      // Create three children
      const child1Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.NorthWest],
      });
      const child2Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      });
      const child3Coords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.West],
      });

      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child1Coords,
        title: "Child 1",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child2Coords,
        title: "Child 2",
      });
      await createTestItem(testEnv, {
        parentId: toParentId(rootItem.id),
        coords: child3Coords,
        title: "Child 3",
      });

      const result = await leafTraversalService.getNextIncompleteLeaf(
        rootCoordId,
        new Set()
      );

      expect(result.allLeafCoords).toHaveLength(3);
      expect(result.allLeafCoords).toContain(CoordSystem.createId(child1Coords));
      expect(result.allLeafCoords).toContain(CoordSystem.createId(child2Coords));
      expect(result.allLeafCoords).toContain(CoordSystem.createId(child3Coords));
    });
  });
});
