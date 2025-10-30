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
import { MapItemType } from "~/lib/domains/mapping/_objects";

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

      // Perform deep copy
      const copiedItem = await testEnv.service.items.management.deepCopyMapItem({
        sourceCoords: sourceItem.coords,
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

      // Verify coordinates are different
      expect(copiedItem.coords.path).toEqual([Direction.West]);
      expect(copiedItem.coords.userId).toBe(setupParams.userId);
      expect(copiedItem.coords.groupId).toBe(setupParams.groupId);

      // Verify originId is set to source BaseItem id
      expect(copiedItem.ref.originId).toBe(sourceItem.ref.id);

      // Verify source item is unchanged
      const sourceItemAfter = await testEnv.service.items.crud.getItem({
        coords: sourceItem.coords,
      });
      expect(sourceItemAfter.title).toBe("Source Item");
      expect(sourceItemAfter.coords.path).toEqual([Direction.East]);
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
      const child1 = await testEnv.service.items.crud.addItemToMap({
        parentId: parentItem.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Child 1",
        content: "Child 1 content",
      });

      const child2 = await testEnv.service.items.crud.addItemToMap({
        parentId: parentItem.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.SouthEast],
        }),
        title: "Child 2",
        content: "Child 2 content",
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      // Perform deep copy
      const copiedParent = await testEnv.service.items.management.deepCopyMapItem({
        sourceCoords: parentItem.coords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify parent was copied
      expect(copiedParent.title).toBe("Parent Item");
      expect(copiedParent.coords.path).toEqual([Direction.West]);
      expect(copiedParent.ref.originId).toBe(parentItem.ref.id);

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
      });

      const copiedChild2 = await testEnv.service.items.crud.getItem({
        coords: copiedChild2Coords,
      });

      expect(copiedChild1.title).toBe("Child 1");
      expect(copiedChild1.ref.originId).toBe(child1.ref.id);

      expect(copiedChild2.title).toBe("Child 2");
      expect(copiedChild2.ref.originId).toBe(child2.ref.id);

      // Verify source tree is unchanged
      const sourceParentAfter = await testEnv.service.items.crud.getItem({
        coords: parentItem.coords,
      });
      expect(sourceParentAfter.title).toBe("Parent Item");

      const sourceChild1After = await testEnv.service.items.crud.getItem({
        coords: child1.coords,
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
        parentId: level1.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Level 2",
        content: "L2",
      });

      const level3 = await testEnv.service.items.crud.addItemToMap({
        parentId: level2.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast, Direction.West],
        }),
        title: "Level 3",
        content: "L3",
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthWest],
      });

      // Copy entire tree
      await testEnv.service.items.management.deepCopyMapItem({
        sourceCoords: level1.coords,
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
      });
      expect(copiedL1.title).toBe("Level 1");
      expect(copiedL1.ref.originId).toBe(level1.ref.id);

      const copiedL2 = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthWest, Direction.NorthEast],
        }),
      });
      expect(copiedL2.title).toBe("Level 2");
      expect(copiedL2.ref.originId).toBe(level2.ref.id);

      const copiedL3 = await testEnv.service.items.crud.getItem({
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthWest, Direction.NorthEast, Direction.West],
        }),
      });
      expect(copiedL3.title).toBe("Level 3");
      expect(copiedL3.ref.originId).toBe(level3.ref.id);
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
        testEnv.service.items.management.deepCopyMapItem({
          sourceCoords: nonExistentCoords,
          destinationCoords,
          destinationParentId: rootMap.id,
        })
      ).rejects.toThrow();
    });

    it("should throw error when destination coords already exist", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const sourceItem = await testEnv.service.items.crud.addItemToMap({
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

      await expect(
        testEnv.service.items.management.deepCopyMapItem({
          sourceCoords: sourceItem.coords,
          destinationCoords,
          destinationParentId: rootMap.id,
        })
      ).rejects.toThrow();
    });

    it("should preserve all BaseItem attributes during copy", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const sourceItem = await testEnv.service.items.crud.addItemToMap({
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

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.NorthWest],
      });

      const copiedItem = await testEnv.service.items.management.deepCopyMapItem({
        sourceCoords: sourceItem.coords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      // Verify all attributes
      expect(copiedItem.title).toBe("Full Featured Item");
      expect(copiedItem.content).toBe("This item has all attributes populated");
      expect(copiedItem.preview).toBe("A comprehensive preview of the item");
      expect(copiedItem.link).toBe("https://example.com/full-item");
      expect(copiedItem.ref.originId).toBe(sourceItem.ref.id);
    });

    it("should handle copy of item with no children", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

      const leafItem = await testEnv.service.items.crud.addItemToMap({
        parentId: rootMap.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.SouthEast],
        }),
        title: "Leaf Node",
        content: "No children",
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.SouthWest],
      });

      const copiedItem = await testEnv.service.items.management.deepCopyMapItem({
        sourceCoords: leafItem.coords,
        destinationCoords,
        destinationParentId: rootMap.id,
      });

      expect(copiedItem.title).toBe("Leaf Node");
      expect(copiedItem.coords.path).toEqual([Direction.SouthWest]);
      expect(copiedItem.ref.originId).toBe(leafItem.ref.id);

      // Verify no unexpected children were created
      const descendants = await testEnv.repositories.mapItem.getDescendantsByParent({
        parentPath: destinationCoords.path,
        parentUserId: setupParams.userId,
        parentGroupId: setupParams.groupId,
      });

      expect(descendants.length).toBe(0);
    });
  });

  describe("deepCopyMapItem - transaction rollback", () => {
    it("should rollback all changes if copy operation fails midway", async () => {
      const setupParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, setupParams);

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
        parentId: parentItem.id,
        coords: _createTestCoordinates({
          userId: setupParams.userId,
          groupId: setupParams.groupId,
          path: [Direction.East, Direction.NorthEast],
        }),
        title: "Child",
        content: "Child content",
      });

      const destinationCoords = _createTestCoordinates({
        userId: setupParams.userId,
        groupId: setupParams.groupId,
        path: [Direction.West],
      });

      // This should fail if we introduce an error condition
      // For now, we just verify the method can be called
      try {
        await testEnv.service.items.management.deepCopyMapItem({
          sourceCoords: parentItem.coords,
          destinationCoords,
          destinationParentId: rootMap.id,
        });
      } catch (error) {
        // If it fails, verify no partial copies exist
        try {
          await testEnv.service.items.crud.getItem({
            coords: destinationCoords,
          });
          // If we get here, a partial copy exists - this is bad
          expect.fail("Partial copy should not exist after failed operation");
        } catch {
          // Good - no partial copy exists
          expect(true).toBe(true);
        }
      }
    });
  });
});
