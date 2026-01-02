import { describe, it, expect, beforeEach } from "vitest";
import {
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  createTestItem,
  type TestEnvironment,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { Direction } from "~/lib/domains/mapping/utils";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

describe("MappingService - Deep Copy with Negative Directions [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("deepCopyMapItem - composed children (negative directions)", () => {
    it("should deep copy composed children (negative directions)", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent item
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Parent Item",
        content: "Parent content",
      });

      // Create composed children
      await createTestItem(testEnv, {
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.ComposedNorthWest],
        }),
        title: "Composed Child 1",
        content: "Composed content 1",
      });

      await createTestItem(testEnv, {
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.ComposedEast],
        }),
        title: "Composed Child 2",
        content: "Composed content 2",
      });

      const sourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      // Perform deep copy
      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify parent was copied
      expect(copiedItem.title).toBe("Parent Item");
      expect(copiedItem.depth).toBe(1);

      // Verify composed children were copied with negative directions preserved
      const copiedComposedChild1 = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.West, Direction.ComposedNorthWest],
        }),
        requester: SYSTEM_INTERNAL,
      });

      const copiedComposedChild2 = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.West, Direction.ComposedEast],
        }),
        requester: SYSTEM_INTERNAL,
      });

      expect(copiedComposedChild1.title).toBe("Composed Child 1");
      expect(copiedComposedChild1.content).toBe("Composed content 1");
      expect(copiedComposedChild1.depth).toBe(2);

      expect(copiedComposedChild2.title).toBe("Composed Child 2");
      expect(copiedComposedChild2.content).toBe("Composed content 2");
      expect(copiedComposedChild2.depth).toBe(2);
    });

    it("should deep copy mixed structural and composed children", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.NorthEast],
        }),
        title: "Parent",
      });

      // Create structural child
      await createTestItem(testEnv, {
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.NorthEast, Direction.East],
        }),
        title: "Structural Child",
      });

      // Create composed child
      await createTestItem(testEnv, {
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.NorthEast, Direction.ComposedWest],
        }),
        title: "Composed Child",
      });

      const sourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthEast],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthWest],
      });

      // Perform deep copy
      await testEnv.service.items.deepCopyMapItem({
        sourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify structural child was copied
      const copiedStructuralChild = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthWest, Direction.East],
        }),
        requester: SYSTEM_INTERNAL,
      });
      expect(copiedStructuralChild.title).toBe("Structural Child");

      // Verify composed child was copied
      const copiedComposedChild = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthWest, Direction.ComposedWest],
        }),
        requester: SYSTEM_INTERNAL,
      });
      expect(copiedComposedChild.title).toBe("Composed Child");
    });

    it("should deep copy all 6 composed children", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Parent with Full Composition",
      });

      // Create all 6 composed children
      const composedDirections = [
        Direction.ComposedNorthWest,
        Direction.ComposedNorthEast,
        Direction.ComposedEast,
        Direction.ComposedSouthEast,
        Direction.ComposedSouthWest,
        Direction.ComposedWest,
      ];

      for (let i = 0; i < composedDirections.length; i++) {
        await createTestItem(testEnv, {
          parentId: Number(parentItem.id),
          coords: _createTestCoordinates({
            userId: setupParams.userId,
            groupId: setupParams.groupId,
            path: [Direction.East, composedDirections[i]!],
          }),
          title: `Composed Child ${i + 1}`,
        });
      }

      const sourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      // Perform deep copy
      await testEnv.service.items.deepCopyMapItem({
        sourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify all 6 composed children were copied
      for (let i = 0; i < composedDirections.length; i++) {
        const copiedChild = await testEnv.service.items.crud.getItem({
          coords: _createTestCoordinates({
            userId: setupParams.userId,
            groupId: setupParams.groupId,
            path: [Direction.West, composedDirections[i]!],
          }),
          requester: SYSTEM_INTERNAL,
        });
        expect(copiedChild.title).toBe(`Composed Child ${i + 1}`);
      }
    });

    it("should deep copy nested composed children", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.NorthEast],
        }),
        title: "Parent",
      });

      // Create structural child
      const structuralChild = await createTestItem(testEnv, {
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.NorthEast, Direction.East],
        }),
        title: "Structural Child",
      });

      // Create composed child of structural child (nested composition)
      await createTestItem(testEnv, {
        parentId: Number(structuralChild.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.NorthEast, Direction.East, Direction.ComposedSouthWest],
        }),
        title: "Nested Composed Child",
      });

      const sourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthEast],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthEast],
      });

      // Perform deep copy
      await testEnv.service.items.deepCopyMapItem({
        sourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify nested composed child was copied
      const copiedNestedComposedChild = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthEast, Direction.East, Direction.ComposedSouthWest],
        }),
        requester: SYSTEM_INTERNAL,
      });
      expect(copiedNestedComposedChild.title).toBe("Nested Composed Child");
    });

    it("should preserve parent-child relationships for composed children", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent
      const parentItem = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Parent",
      });

      // Create composed child
      await createTestItem(testEnv, {
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.ComposedNorthEast],
        }),
        title: "Composed Child",
      });

      const sourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      // Perform deep copy
      await testEnv.service.items.deepCopyMapItem({
        sourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Get the copied parent MapItem
      const copiedParentMapItem = await testEnv.repositories.mapItem.getOneByIdr({
        idr: {
          attrs: {
            coords: {
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.West],
            },
          },
        },
      }, SYSTEM_INTERNAL);

      // Get the copied composed child MapItem
      const copiedComposedChildMapItem = await testEnv.repositories.mapItem.getOneByIdr({
        idr: {
          attrs: {
            coords: {
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.West, Direction.ComposedNorthEast],
            },
          },
        },
      }, SYSTEM_INTERNAL);

      // Verify parent-child relationship is preserved
      expect(copiedComposedChildMapItem.attrs.parentId).toBe(copiedParentMapItem.id);
      expect(copiedComposedChildMapItem.attrs.parentId).not.toBe(Number(parentItem.id));
    });
  });
});
