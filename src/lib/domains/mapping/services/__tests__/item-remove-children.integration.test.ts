import { describe, beforeEach, it, expect } from "vitest";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _createUniqueTestParams,
  _createTestCoordinates,
  _setupBasicMap,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _setupHierarchyWithAllDirectionTypes,
  _validateStructuralChildrenRemoval,
  _validateComposedChildrenRemoval,
  _validateHexPlanRemoval,
  _validateNoMatchingChildren,
} from "~/lib/domains/mapping/services/__tests__/helpers/item-crud/_item-remove-children-helpers";
import { Direction } from "~/lib/domains/mapping/utils";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

describe("ItemCrudService.removeChildrenByType [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("structural direction type", () => {
    it("should remove all structural children and their descendants", async () => {
      const params = _createUniqueTestParams("structural-all");
      const setupData = await _setupHierarchyWithAllDirectionTypes(testEnv, params);

      await _validateStructuralChildrenRemoval(testEnv, setupData, params);
    });

    it("should return 0 when no structural children exist", async () => {
      const params = _createUniqueTestParams("structural-none");
      await _validateNoMatchingChildren(testEnv, params, "structural");
    });

    it("should only remove structural children, not composed or hexPlan", async () => {
      const params = _createUniqueTestParams("structural-only");
      const rootMap = await _setupBasicMap(testEnv.service, params);

      // Add one of each type
      const structuralCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.East],
      });
      await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: structuralCoords,
        title: "Structural",
      });

      const composedCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.ComposedEast],
      });
      const composedChild = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: composedCoords,
        title: "Composed",
      });

      const hexplanCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.Center],
      });
      const hexplan = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: hexplanCoords,
        title: "Hexplan",
      });

      const rootCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [],
      });

      const result = await testEnv.service.items.crud.removeChildrenByType({
        coords: rootCoords,
        directionType: "structural",
      });

      expect(result.deletedCount).toBe(1);

      // Structural should be gone
      await expect(
        testEnv.service.items.crud.getItem({ coords: structuralCoords, requester: SYSTEM_INTERNAL }),
      ).rejects.toThrow();

      // Composed should still exist
      const composedItem = await testEnv.service.items.crud.getItem({
        coords: composedCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(composedItem.id).toBe(composedChild.id);

      // Hexplan should still exist
      const execItem = await testEnv.service.items.crud.getItem({
        coords: hexplanCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(execItem.id).toBe(hexplan.id);
    });
  });

  describe("composed direction type", () => {
    it("should remove all composed children and their descendants", async () => {
      const params = _createUniqueTestParams("composed-all");
      const setupData = await _setupHierarchyWithAllDirectionTypes(testEnv, params);

      await _validateComposedChildrenRemoval(testEnv, setupData, params);
    });

    it("should return 0 when no composed children exist", async () => {
      const params = _createUniqueTestParams("composed-none");
      await _validateNoMatchingChildren(testEnv, params, "composed");
    });
  });

  describe("hexPlan direction type", () => {
    it("should remove ALL hexPlans in the subtree recursively", async () => {
      const params = _createUniqueTestParams("exec-all");
      const setupData = await _setupHierarchyWithAllDirectionTypes(testEnv, params);

      await _validateHexPlanRemoval(testEnv, setupData, params);
    });

    it("should return 0 when no hexPlans exist", async () => {
      const params = _createUniqueTestParams("exec-none");
      await _validateNoMatchingChildren(testEnv, params, "hexPlan");
    });

    it("should remove hexPlans nested under structural children", async () => {
      const params = _createUniqueTestParams("exec-structural");
      const rootMap = await _setupBasicMap(testEnv.service, params);

      // Create: Root -> Structural [1] -> HexPlan [1, 0]
      const structuralCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest],
      });
      const structuralChild = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: structuralCoords,
        title: "Structural Child",
      });

      const nestedHexPlanCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest, Direction.Center],
      });
      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(structuralChild.id),
        coords: nestedHexPlanCoords,
        title: "Nested HexPlan",
      });

      const rootCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [],
      });

      const result = await testEnv.service.items.crud.removeChildrenByType({
        coords: rootCoords,
        directionType: "hexPlan",
      });

      expect(result.deletedCount).toBe(1);

      // Nested hexPlan should be gone
      await expect(
        testEnv.service.items.crud.getItem({ coords: nestedHexPlanCoords, requester: SYSTEM_INTERNAL }),
      ).rejects.toThrow();

      // Structural child should still exist
      const structural = await testEnv.service.items.crud.getItem({
        coords: structuralCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(structural.id).toBe(structuralChild.id);
    });

    it("should remove hexPlans nested under composed children", async () => {
      const params = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, params);

      // Create: Root -> Composed [-1] -> HexPlan [-1, 0]
      const composedCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.ComposedNorthWest],
      });
      const composedChild = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: composedCoords,
        title: "Composed Child",
      });

      const nestedHexPlanCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.ComposedNorthWest, Direction.Center],
      });
      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(composedChild.id),
        coords: nestedHexPlanCoords,
        title: "Nested HexPlan",
      });

      const rootCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [],
      });

      const result = await testEnv.service.items.crud.removeChildrenByType({
        coords: rootCoords,
        directionType: "hexPlan",
      });

      expect(result.deletedCount).toBe(1);

      // Nested hexPlan should be gone
      await expect(
        testEnv.service.items.crud.getItem({ coords: nestedHexPlanCoords, requester: SYSTEM_INTERNAL }),
      ).rejects.toThrow();

      // Composed child should still exist
      const composed = await testEnv.service.items.crud.getItem({
        coords: composedCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(composed.id).toBe(composedChild.id);
    });

    it("should remove deeply nested hexPlans", async () => {
      const params = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, params);

      // Create: Root -> [1] -> [1, 2] -> [1, 2, 3] -> [1, 2, 3, 0]
      const level1Coords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest],
      });
      const level1 = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: level1Coords,
        title: "Level 1",
      });

      const level2Coords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest, Direction.NorthEast],
      });
      const level2 = await testEnv.service.items.crud.addItemToMap({
        parentId: Number(level1.id),
        coords: level2Coords,
        title: "Level 2",
      });

      const level3Coords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest, Direction.NorthEast, Direction.East],
      });
      const level3 = await testEnv.service.items.crud.addItemToMap({
        parentId: Number(level2.id),
        coords: level3Coords,
        title: "Level 3",
      });

      const deepHexPlanCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest, Direction.NorthEast, Direction.East, Direction.Center],
      });
      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(level3.id),
        coords: deepHexPlanCoords,
        title: "Deep HexPlan",
      });

      const rootCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [],
      });

      const result = await testEnv.service.items.crud.removeChildrenByType({
        coords: rootCoords,
        directionType: "hexPlan",
      });

      expect(result.deletedCount).toBe(1);

      // Deep hexPlan should be gone
      await expect(
        testEnv.service.items.crud.getItem({ coords: deepHexPlanCoords, requester: SYSTEM_INTERNAL }),
      ).rejects.toThrow();

      // All structural ancestors should still exist
      expect((await testEnv.service.items.crud.getItem({ coords: level1Coords, requester: SYSTEM_INTERNAL })).id).toBe(level1.id);
      expect((await testEnv.service.items.crud.getItem({ coords: level2Coords, requester: SYSTEM_INTERNAL })).id).toBe(level2.id);
      expect((await testEnv.service.items.crud.getItem({ coords: level3Coords, requester: SYSTEM_INTERNAL })).id).toBe(level3.id);
    });
  });

  describe("edge cases", () => {
    it("should handle removing children from a non-root tile", async () => {
      const params = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, params);

      // Create parent at [1]
      const parentCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest],
      });
      const parent = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Parent",
      });

      // Create child at [1, 2]
      const childCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.NorthWest, Direction.NorthEast],
      });
      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(parent.id),
        coords: childCoords,
        title: "Child",
      });

      // Remove structural children of [1], not root
      const result = await testEnv.service.items.crud.removeChildrenByType({
        coords: parentCoords,
        directionType: "structural",
      });

      expect(result.deletedCount).toBe(1);

      // Child should be gone
      await expect(
        testEnv.service.items.crud.getItem({ coords: childCoords, requester: SYSTEM_INTERNAL }),
      ).rejects.toThrow();

      // Parent should still exist
      const parentItem = await testEnv.service.items.crud.getItem({
        coords: parentCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(parentItem.id).toBe(parent.id);
    });

    it("should throw error for non-existent parent coordinates", async () => {
      const params = _createUniqueTestParams();

      const nonExistentCoords = _createTestCoordinates({
        userId: params.userId,
        groupId: params.groupId,
        path: [Direction.East, Direction.West],
      });

      await expect(
        testEnv.service.items.crud.removeChildrenByType({
          coords: nonExistentCoords,
          directionType: "structural",
        }),
      ).rejects.toThrow();
    });
  });
});
