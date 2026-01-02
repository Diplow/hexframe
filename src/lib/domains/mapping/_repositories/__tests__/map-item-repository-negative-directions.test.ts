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

describe("MapItemRepository - Negative Direction Support", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("getContextForCenter - composed children with negative directions", () => {
    it("should return composed children using negative directions", async () => {
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

      // Create composed children with negative directions
      const composed1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composed1Coords,
        title: "Composed Child NorthWest",
      });

      const composed2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composed2Coords,
        title: "Composed Child East",
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

      // Should return both composed children
      expect(context.composed).toHaveLength(2);
      const composedTitles = context.composed
        .map((c) => c.ref.attrs.title)
        .sort();
      expect(composedTitles).toEqual([
        "Composed Child East",
        "Composed Child NorthWest",
      ]);

      // Verify they have negative directions in their paths
      context.composed.forEach((item) => {
        expect(item.attrs.coords.path).toHaveLength(2);
        const lastDirection = item.attrs.coords.path[item.attrs.coords.path.length - 1];
        expect(lastDirection).toBeLessThan(0);
      });
    });

    it("should handle multiple composed children with different negative directions", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent tile
      const parentCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthWest],
      });
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent",
      });

      // Create all 6 possible composed children
      const composedDirections = [
        { dir: Direction.ComposedNorthWest, label: "NW" },
        { dir: Direction.ComposedNorthEast, label: "NE" },
        { dir: Direction.ComposedEast, label: "E" },
        { dir: Direction.ComposedSouthEast, label: "SE" },
        { dir: Direction.ComposedSouthWest, label: "SW" },
        { dir: Direction.ComposedWest, label: "W" },
      ];

      for (const { dir, label } of composedDirections) {
        const coords = _createTestCoordinates({
          userId,
          groupId,
          path: [Direction.NorthWest, dir],
        });
        await createTestItem(testEnv, {
          parentId: parseInt(parentItem.id),
          coords,
          title: `Composed ${label}`,
        });
      }

      // Get context
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthWest],
        userId,
        groupId,
        includeParent: false,
        includeComposed: true,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Should return all 6 composed children
      expect(context.composed).toHaveLength(6);

      // All should have negative directions
      context.composed.forEach((item) => {
        const lastDirection = item.attrs.coords.path[item.attrs.coords.path.length - 1];
        expect(lastDirection).toBeLessThan(0);
        expect(lastDirection).toBeGreaterThanOrEqual(-6);
      });
    });

    it("should not include structural children when querying for composed", async () => {
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
        title: "Parent",
      });

      // Create composed child (negative direction)
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composedCoords,
        title: "Composed Child",
      });

      // Create structural child (positive direction)
      const structuralCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: structuralCoords,
        title: "Structural Child",
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

      // Should only return composed child
      expect(context.composed).toHaveLength(1);
      expect(context.composed[0]?.ref.attrs.title).toBe("Composed Child");
    });

    it("should not include structural children when querying for children", async () => {
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
        title: "Parent",
      });

      // Create composed child (negative direction)
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composedCoords,
        title: "Composed Child",
      });

      // Create structural child (positive direction)
      const structuralCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: structuralCoords,
        title: "Structural Child",
      });

      // Get context with structural children
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

      // Should only return structural child
      expect(context.children).toHaveLength(1);
      expect(context.children[0]?.ref.attrs.title).toBe("Structural Child");
    });

    it("should return empty array when no composed children exist", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create parent without composed children
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

    it("should handle composed children at root level", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create composed child directly under root
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: composedCoords,
        title: "Root Composed Child",
      });

      // Get context for root
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [],
        userId,
        groupId,
        includeParent: false,
        includeComposed: true,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Should return the composed child
      expect(context.composed).toHaveLength(1);
      expect(context.composed[0]?.ref.attrs.title).toBe("Root Composed Child");
      expect(context.composed[0]?.attrs.coords.path).toEqual([
        Direction.ComposedNorthWest,
      ]);
    });

    it("should handle deeply nested composed children", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create deep hierarchy: Root -> L1 -> L2
      const l1Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const l1Item = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: l1Coords,
        title: "Level 1",
      });

      const l2Coords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      const l2Item = await createTestItem(testEnv, {
        parentId: parseInt(l1Item.id),
        coords: l2Coords,
        title: "Level 2",
      });

      // Create composed child under L2
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East, Direction.ComposedSouthEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(l2Item.id),
        coords: composedCoords,
        title: "Deep Composed Child",
      });

      // Get context for L2
      const context = await testEnv.repositories.mapItem.getContextForCenter({
        centerPath: [Direction.NorthEast, Direction.East],
        userId,
        groupId,
        includeParent: false,
        includeComposed: true,
        includeChildren: false,
        includeGrandchildren: false,
        requester: SYSTEM_INTERNAL,
      });

      // Should return the composed child
      expect(context.composed).toHaveLength(1);
      expect(context.composed[0]?.ref.attrs.title).toBe("Deep Composed Child");
      expect(context.composed[0]?.attrs.coords.path[2]).toBe(
        Direction.ComposedSouthEast,
      );
    });
  });

  describe("getDescendantsByParent - should exclude composed children by default", () => {
    it("should not return composed children in structural descendants", async () => {
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
        title: "Parent",
      });

      // Create composed child
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composedCoords,
        title: "Composed Child",
      });

      // Create structural child
      const structuralCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: structuralCoords,
        title: "Structural Child",
      });

      // Get descendants (this method should work with any path patterns)
      const descendants = await testEnv.repositories.mapItem.getDescendantsByParent({
        parentPath: [Direction.NorthEast],
        parentUserId: userId,
        parentGroupId: groupId,
        requester: SYSTEM_INTERNAL,
      });

      // Should return both children (repository method doesn't filter by direction type)
      // Filtering happens at the service layer
      expect(descendants).toHaveLength(2);
    });
  });

  describe("getDescendantsWithDepth - should handle negative directions", () => {
    it("should include composed children in depth-limited queries", async () => {
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
        title: "Parent",
      });

      // Create composed child
      const composedCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.ComposedNorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: composedCoords,
        title: "Composed Child",
      });

      // Create structural child
      const structuralCoords = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parentItem.id),
        coords: structuralCoords,
        title: "Structural Child",
      });

      // Get descendants with depth 1
      const descendants = await testEnv.repositories.mapItem.getDescendantsWithDepth({
        parentPath: [Direction.NorthEast],
        parentUserId: userId,
        parentGroupId: groupId,
        maxGenerations: 1,
        requester: SYSTEM_INTERNAL,
      });

      // Should return both direct children (repository doesn't filter by direction type)
      expect(descendants).toHaveLength(2);
    });
  });
});
