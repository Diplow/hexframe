import { describe, it, expect, beforeEach } from "vitest";
import {
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  type TestEnvironment,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { Direction } from "~/lib/domains/mapping/utils";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

describe("MappingService - Deep Copy [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("deepCopyMapItem", () => {
    it("should deep copy a single MapItem to a new location", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create source item
      const sourceItem = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Source Item",
        content: "Source content",
        preview: "Source preview",
        link: "https://source.com",
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      const sourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      // Perform deep copy
      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify copied item exists
      expect(copiedItem).toBeDefined();
      expect(copiedItem.id).not.toBe(sourceItem.id);

      // Verify attributes are copied
      expect(copiedItem.title).toBe("Source Item");
      expect(copiedItem.content).toBe("Source content");
      expect(copiedItem.preview).toBe("Source preview");
      expect(copiedItem.link).toBe("https://source.com");

      // Verify coordinates are different - coords is a string ID in MapItemContract
      expect(copiedItem.coords).toBeDefined();
      expect(copiedItem.depth).toBe(1); // Single direction = depth 1

      // Verify source item is unchanged
      const sourceItemAfter = await testEnv.service.items.crud.getItem({
        coords: sourceCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(sourceItemAfter.title).toBe("Source Item");
      expect(sourceItemAfter.depth).toBe(1);
    });

    it("should deep copy a MapItem with its entire subtree", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent
      const parentItem = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Parent Item",
        content: "Parent content",
      });

      // Create children
      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Child 1",
        content: "Child 1 content",
      });

      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.SouthEast],
        }),
        title: "Child 2",
        content: "Child 2 content",
      });

      const parentSourceCoords = _createTestCoordinates({
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
      const copiedParent = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: parentSourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify parent was copied
      expect(copiedParent.title).toBe("Parent Item");
      expect(copiedParent.depth).toBe(1);

      // Verify children were copied
      const copiedChild1Coords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West, Direction.NorthEast],
      });

      const copiedChild2Coords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West, Direction.SouthEast],
      });

      const copiedChild1 = await testEnv.service.items.crud.getItem({
        coords: copiedChild1Coords,
        requester: SYSTEM_INTERNAL,
      });

      const copiedChild2 = await testEnv.service.items.crud.getItem({
        coords: copiedChild2Coords,
        requester: SYSTEM_INTERNAL,
      });

      expect(copiedChild1.title).toBe("Child 1");
      expect(copiedChild1.depth).toBe(2);

      expect(copiedChild2.title).toBe("Child 2");
      expect(copiedChild2.depth).toBe(2);

      // Verify source tree is unchanged
      const sourceParentAfter = await testEnv.service.items.crud.getItem({
        coords: parentSourceCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(sourceParentAfter.title).toBe("Parent Item");

      const child1Coords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East, Direction.NorthEast],
      });

      const sourceChild1After = await testEnv.service.items.crud.getItem({
        coords: child1Coords,
        requester: SYSTEM_INTERNAL,
      });
      expect(sourceChild1After.title).toBe("Child 1");
    });

    it("should handle deep copy of multi-level nested structure", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create 3-level hierarchy
      const level1 = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Level 1",
        content: "L1",
      });

      const level2 = await testEnv.service.items.crud.addItemToMap({
        parentId: Number(level1.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Level 2",
        content: "L2",
      });

      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(level2.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast, Direction.West],
        }),
        title: "Level 3",
        content: "L3",
      });

      const level1SourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthWest],
      });

      // Copy entire tree
      await testEnv.service.items.deepCopyMapItem({
        sourceCoords: level1SourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify all levels were copied with correct paths
      const copiedL1 = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthWest],
        }),
        requester: SYSTEM_INTERNAL,
      });
      expect(copiedL1.title).toBe("Level 1");
      expect(copiedL1.depth).toBe(1);

      const copiedL2 = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthWest, Direction.NorthEast],
        }),
        requester: SYSTEM_INTERNAL,
      });
      expect(copiedL2.title).toBe("Level 2");
      expect(copiedL2.depth).toBe(2);

      const copiedL3 = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthWest, Direction.NorthEast, Direction.West],
        }),
        requester: SYSTEM_INTERNAL,
      });
      expect(copiedL3.title).toBe("Level 3");
      expect(copiedL3.depth).toBe(3);
    });

    it("should throw error when source coords do not exist", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const nonExistentCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East, Direction.West],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      await expect(
        testEnv.service.items.deepCopyMapItem({
          sourceCoords: nonExistentCoords,
          destinationCoords,
          destinationParentId: rootMap.id,
        })
      ).rejects.toThrow();
    });

    it("should throw error when destination coords already exist", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Source",
        content: "Content",
      });

      // Create item at destination
      await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.West],
        }),
        title: "Existing",
        content: "Existing content",
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      const sourceItemCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      await expect(
        testEnv.service.items.deepCopyMapItem({
          sourceCoords: sourceItemCoords,
          destinationCoords,
          destinationParentId: rootMap.id,
        })
      ).rejects.toThrow();
    });

    it("should preserve all BaseItem attributes during copy", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.NorthEast],
        }),
        title: "Full Featured Item",
        content: "This item has all attributes populated",
        preview: "A comprehensive preview of the item",
        link: "https://example.com/full-item",
      });

      const sourceItemCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthEast],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthWest],
      });

      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: sourceItemCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify all attributes
      expect(copiedItem.title).toBe("Full Featured Item");
      expect(copiedItem.content).toBe("This item has all attributes populated");
      expect(copiedItem.preview).toBe("A comprehensive preview of the item");
      expect(copiedItem.link).toBe("https://example.com/full-item");
    });

    it("should handle copy of item with no children", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthEast],
        }),
        title: "Leaf Node",
        content: "No children",
      });

      const leafSourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthEast],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthWest],
      });

      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: leafSourceCoords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      expect(copiedItem.title).toBe("Leaf Node");
      expect(copiedItem.depth).toBe(1);

      // Verify no unexpected children were created
      const descendants = await testEnv.repositories.mapItem.getDescendantsByParent({
        parentPath: destinationCoords.path,
        parentUserId: setupParams.userId,
        parentGroupId: setupParams.groupId,
        requester: SYSTEM_INTERNAL,
      });

      expect(descendants.length).toBe(0);
    });
  });

  describe("deepCopyMapItem - transaction rollback", () => {
    it("should rollback all changes if copy operation fails midway", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create source item with a child
      const parentItem = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Parent",
        content: "Parent content",
      });

      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Child",
        content: "Child content",
      });

      const parentSourceCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.East],
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      // Create an item at the destination to force a failure
      const existingDestItem = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: destinationCoords,
        title: "Existing",
        content: "Should remain unchanged",
      });

      // Attempt to copy - should fail because destination exists
      await expect(
        testEnv.service.items.deepCopyMapItem({
          sourceCoords: parentSourceCoords,
          destinationCoords,
          destinationParentId: rootMap.id,
        })
      ).rejects.toThrow("already exist");

      // Verify the original item at destination still exists and is unchanged
      const itemAtDestination = await testEnv.service.items.crud.getItem({
        coords: destinationCoords,
        requester: SYSTEM_INTERNAL,
      });

      expect(itemAtDestination.id).toBe(existingDestItem.id);
      expect(itemAtDestination.title).toBe("Existing");
      expect(itemAtDestination.content).toBe("Should remain unchanged");
    });

    it("should correctly map parent IDs in copied subtree", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      // Create parent
      const parentItem = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East],
        }),
        title: "Parent Item",
        content: "Parent content",
      });

      // Create child
      await testEnv.service.items.crud.addItemToMap({
        parentId: Number(parentItem.id),
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Child Item",
        content: "Child content",
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

      // Get the copied parent MapItem from repository
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

      // Get the copied child MapItem from repository
      const copiedChildMapItem = await testEnv.repositories.mapItem.getOneByIdr({
        idr: {
          attrs: {
            coords: {
              userId: setupParams.userId,
              groupId: setupParams.groupId,
              path: [Direction.West, Direction.NorthEast],
            },
          },
        },
      }, SYSTEM_INTERNAL);

      // CRITICAL ASSERTIONS: Verify parent-child relationships
      // Parent should point to the destination parent (rootMap)
      expect(copiedParentMapItem.attrs.parentId).toBe(rootMap.id);

      // Child should point to the COPIED parent, not the original parent
      expect(copiedChildMapItem.attrs.parentId).toBe(copiedParentMapItem.id);
      expect(copiedChildMapItem.attrs.parentId).not.toBe(Number(parentItem.id));

      // Verify the parent IDs form a proper hierarchy
      expect(copiedChildMapItem.attrs.parentId).not.toBe(rootMap.id);
    });
  });
});
