import { describe, beforeEach, it, expect } from "vitest";
import { type Coord, Direction, CoordSystem } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

describe("tRPC Map Items Router - Copy Operations [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("copyMapItem", () => {
    it("should copy a single MapItem to a new location", async () => {
      const setup = await _setupSingleItemToCopy();

      // Perform deep copy via domain service (simulating tRPC call)
      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: setup.sourceCoords,
        destinationCoords: setup.destinationCoords,
        destinationParentId: setup.rootMapId,
      });

      // Verify copied item exists
      expect(copiedItem).toBeDefined();
      expect(copiedItem.id).not.toBe(setup.sourceItemId);

      // Verify attributes are copied
      expect(copiedItem.title).toBe("Source Item");
      expect(copiedItem.content).toBe("Source content");
      expect(copiedItem.preview).toBe("Source preview");
      expect(copiedItem.link).toBe("https://source.com");

      // Verify coordinates are different
      expect(copiedItem.coords).toBe(CoordSystem.createId(setup.destinationCoords));
      expect(copiedItem.depth).toBe(1);

      // Verify source item is unchanged
      const sourceItemAfter = await testEnv.service.items.crud.getItem({
        coords: setup.sourceCoords,
        requester: SYSTEM_INTERNAL,
      });
      expect(sourceItemAfter.title).toBe("Source Item");
    });

    it("should copy a MapItem with its entire subtree", async () => {
      const setup = await _setupItemWithSubtree();

      // Perform deep copy
      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: setup.parentCoords,
        destinationCoords: setup.destinationCoords,
        destinationParentId: setup.rootMapId,
      });

      // Verify copied parent
      expect(copiedItem.title).toBe("Parent Item");

      // Verify all descendants were copied
      const copiedDescendants = await testEnv.service.items.query.getDescendants({
        itemId: Number(copiedItem.id),
      });

      expect(copiedDescendants.length).toBe(3); // 2 children + 1 grandchild

      const titles = copiedDescendants.map((item) => item.title);
      expect(titles).toContain("Child 1");
      expect(titles).toContain("Child 2");
      expect(titles).toContain("Grandchild 1");
    });

    it("should preserve hierarchy structure when copying subtree", async () => {
      const setup = await _setupItemWithSubtree();

      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: setup.parentCoords,
        destinationCoords: setup.destinationCoords,
        destinationParentId: setup.rootMapId,
      });

      // Get all items under the copy
      const copiedDescendants = await testEnv.service.items.query.getDescendants({
        itemId: Number(copiedItem.id),
      });

      // Find the grandchild and verify it's at depth 3
      const grandchild = copiedDescendants.find((item) => item.title === "Grandchild 1");
      expect(grandchild).toBeDefined();
      expect(grandchild!.depth).toBe(3);
    });

    it("should throw error when copying to existing destination", async () => {
      const setup = await _setupOverlappingDestination();

      // Try to copy to a location that already has an item
      await expect(
        testEnv.service.items.deepCopyMapItem({
          sourceCoords: setup.sourceCoords,
          destinationCoords: setup.existingDestCoords,
          destinationParentId: setup.rootMapId,
        })
      ).rejects.toThrow("already exist");
    });

    it("should throw error when copying non-existent source", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      const nonExistentCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      });

      const destinationCoords = _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.West],
      });

      // Try to copy non-existent item
      await expect(
        testEnv.service.items.deepCopyMapItem({
          sourceCoords: nonExistentCoords,
          destinationCoords: destinationCoords,
          destinationParentId: rootMap.id,
        })
      ).rejects.toThrow();
    });

    it("should handle copying item to different user space", async () => {
      const setup = await _setupCrossUserCopy();

      // Copy from user 1 to user 2's space
      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: setup.sourceCoords,
        destinationCoords: setup.destinationCoords,
        destinationParentId: setup.destRootMapId,
      });

      // Verify item was copied
      expect(copiedItem).toBeDefined();
      expect(copiedItem.ownerId).toBe(String(setup.destUserId));

      // Verify coordinates reflect new user space
      const destCoordsId = CoordSystem.createId(setup.destinationCoords);
      expect(copiedItem.coords).toBe(destCoordsId);
    });

    it("should handle copying composition container with children", async () => {
      const setup = await _setupCompositionToCopy();

      // Copy the parent which has a composition
      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: setup.parentCoords,
        destinationCoords: setup.destinationCoords,
        destinationParentId: setup.rootMapId,
      });

      // Verify parent was copied
      expect(copiedItem).toBeDefined();
      expect(copiedItem.title).toBe("Parent Tile");

      // Verify composition container exists at new location
      const compositionCoords = CoordSystem.getCompositionCoord(
        CoordSystem.parseId(copiedItem.coords)
      );
      const compositionContainer = await testEnv.service.items.crud.getItem({
        coords: compositionCoords,
        requester: SYSTEM_INTERNAL,
      });

      expect(compositionContainer.title).toBe("Composition Container");
    });

    it("should handle copying empty composition container", async () => {
      const setup = await _setupEmptyComposition();

      const copiedItem = await testEnv.service.items.deepCopyMapItem({
        sourceCoords: setup.parentCoords,
        destinationCoords: setup.destinationCoords,
        destinationParentId: setup.rootMapId,
      });

      // Verify parent was copied
      expect(copiedItem).toBeDefined();
      expect(copiedItem.title).toBe("Parent Tile");

      // Verify composition container exists at new location
      const compositionCoords = CoordSystem.getCompositionCoord(
        CoordSystem.parseId(copiedItem.coords)
      );
      const compositionContainer = await testEnv.service.items.crud.getItem({
        coords: compositionCoords,
        requester: SYSTEM_INTERNAL,
      });

      expect(compositionContainer.title).toBe("Empty Composition");
    });
  });

  // Helper functions
  async function _setupSingleItemToCopy() {
    const testParams = _createUniqueTestParams();
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const sourceItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: _createTestCoordinates({
        userId: testParams.userId,
        groupId: testParams.groupId,
        path: [Direction.East],
      }),
      title: "Source Item",
      content: "Source content",
      preview: "Source preview",
      link: "https://source.com",
    });

    const sourceCoords = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.East],
    });

    const destinationCoords = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.West],
    });

    return {
      sourceItemId: sourceItem.id,
      sourceCoords,
      destinationCoords,
      rootMapId: rootMap.id,
    };
  }

  async function _setupItemWithSubtree() {
    const testParams = _createUniqueTestParams();
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent
    const parentCoords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.East],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Item",
      content: "Parent content",
    });

    // Create child 1
    const child1Coords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.East, Direction.NorthWest],
    });
    const child1 = await testEnv.service.items.crud.addItemToMap({
      parentId: Number(parentItem.id),
      coords: child1Coords,
      title: "Child 1",
    });

    // Create child 2
    const child2Coords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.East, Direction.NorthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: Number(parentItem.id),
      coords: child2Coords,
      title: "Child 2",
    });

    // Create grandchild under child 1
    const grandchildCoords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.East, Direction.NorthWest, Direction.SouthEast],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: Number(child1.id),
      coords: grandchildCoords,
      title: "Grandchild 1",
    });

    const destinationCoords = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.West],
    });

    return {
      parentCoords,
      destinationCoords,
      rootMapId: rootMap.id,
    };
  }

  async function _setupOverlappingDestination() {
    const testParams = _createUniqueTestParams();
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create source item
    const sourceCoords = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: sourceCoords,
      title: "Source Item",
    });

    // Create item at destination (will cause conflict)
    const existingDestCoords = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.West],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: existingDestCoords,
      title: "Existing Item",
    });

    return {
      sourceCoords,
      existingDestCoords,
      rootMapId: rootMap.id,
    };
  }

  async function _setupCrossUserCopy() {
    const sourceParams = _createUniqueTestParams();
    const destParams = _createUniqueTestParams();

    const sourceRootMap = await _setupBasicMap(testEnv.service, sourceParams);
    const destRootMap = await _setupBasicMap(testEnv.service, destParams);

    // Create item in source user's space
    const sourceCoords = _createTestCoordinates({
      userId: sourceParams.userId,
      groupId: sourceParams.groupId,
      path: [Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: sourceRootMap.id,
      coords: sourceCoords,
      title: "Source Item",
    });

    // Prepare destination in different user's space
    const destinationCoords = _createTestCoordinates({
      userId: destParams.userId,
      groupId: destParams.groupId,
      path: [Direction.West],
    });

    return {
      sourceCoords,
      destinationCoords,
      destRootMapId: destRootMap.id,
      destUserId: destParams.userId,
    };
  }

  async function _setupCompositionToCopy() {
    const testParams = _createUniqueTestParams();
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent tile
    const parentCoords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create composition container (direction 0)
    const compositionCoords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.NorthEast, Direction.Center],
    });
    const containerItem = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Composition Container",
    });

    // Create composed children
    const child1Coords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.NorthEast, Direction.Center, Direction.NorthWest],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(containerItem.id),
      coords: child1Coords,
      title: "Composed Child 1",
    });

    const child2Coords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.NorthEast, Direction.Center, Direction.East],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(containerItem.id),
      coords: child2Coords,
      title: "Composed Child 2",
    });

    const destinationCoords = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.West],
    });

    return {
      parentCoords,
      destinationCoords,
      rootMapId: rootMap.id,
    };
  }

  async function _setupEmptyComposition() {
    const testParams = _createUniqueTestParams();
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent tile
    const parentCoords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.West],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
    });

    // Create composition container without children
    const compositionCoords: Coord = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.West, Direction.Center],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(parentItem.id),
      coords: compositionCoords,
      title: "Empty Composition",
    });

    const destinationCoords = _createTestCoordinates({
      userId: testParams.userId,
      groupId: testParams.groupId,
      path: [Direction.SouthEast],
    });

    return {
      parentCoords,
      destinationCoords,
      rootMapId: rootMap.id,
    };
  }
});
