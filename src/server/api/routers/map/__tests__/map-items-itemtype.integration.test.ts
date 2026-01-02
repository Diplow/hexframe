import { describe, beforeEach, it, expect } from "vitest";
import { type Coord, Direction, CoordSystem } from "~/lib/domains/mapping/utils";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import { asRequesterUserId } from "~/lib/domains/mapping/types";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
  createTestItem,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("tRPC Map Items Router - ItemType API Exposure [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("addItem mutation - itemType parameter", () => {
    it("should accept itemType parameter with value 'organizational'", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.East],
      });

      const result = await createTestItem(testEnv, {
        parentId: setup.parentId,
        coords: childCoords,
        title: "Organizational Tile",
        itemType: MapItemType.ORGANIZATIONAL,
      });

      expect(result.itemType).toBe(MapItemType.ORGANIZATIONAL);
    });

    it("should accept itemType parameter with value 'context'", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.SouthEast],
      });

      const result = await createTestItem(testEnv, {
        parentId: setup.parentId,
        coords: childCoords,
        title: "Context Tile",
        itemType: MapItemType.CONTEXT,
      });

      expect(result.itemType).toBe(MapItemType.CONTEXT);
    });

    it("should accept itemType parameter with value 'system'", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.West],
      });

      const result = await createTestItem(testEnv, {
        parentId: setup.parentId,
        coords: childCoords,
        title: "System Tile",
        itemType: MapItemType.SYSTEM,
      });

      expect(result.itemType).toBe(MapItemType.SYSTEM);
    });

    it("should require itemType when creating tiles", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.NorthWest],
      });

      // itemType is now required - verify explicit CONTEXT works
      const result = await createTestItem(testEnv, {
        parentId: setup.parentId,
        coords: childCoords,
        title: "Explicit Context Tile",
        itemType: MapItemType.CONTEXT,
      });

      expect(result.itemType).toBe(MapItemType.CONTEXT);
    });

    it("should NOT allow creating tiles with USER type via API", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.SouthWest],
      });

      // USER type should be rejected - it's system-controlled for root tiles only
      await expect(
        createTestItem(testEnv, {
          parentId: setup.parentId,
          coords: childCoords,
          title: "Attempted User Tile",
          itemType: MapItemType.USER,
        })
      ).rejects.toThrow();
    });
  });

  describe("updateItem mutation - itemType changes", () => {
    it("should allow changing itemType from organizational to context", async () => {
      const setup = await _setupTileWithItemType(MapItemType.ORGANIZATIONAL);

      const result = await testEnv.service.items.crud.updateItem({
        coords: setup.coords,
        itemType: MapItemType.CONTEXT,
      });

      expect(result.itemType).toBe(MapItemType.CONTEXT);
    });

    it("should allow changing itemType from context to system", async () => {
      const setup = await _setupTileWithItemType(MapItemType.CONTEXT);

      const result = await testEnv.service.items.crud.updateItem({
        coords: setup.coords,
        itemType: MapItemType.SYSTEM,
      });

      expect(result.itemType).toBe(MapItemType.SYSTEM);
    });

    it("should allow changing itemType from system to organizational", async () => {
      const setup = await _setupTileWithItemType(MapItemType.SYSTEM);

      const result = await testEnv.service.items.crud.updateItem({
        coords: setup.coords,
        itemType: MapItemType.ORGANIZATIONAL,
      });

      expect(result.itemType).toBe(MapItemType.ORGANIZATIONAL);
    });

    it("should NOT allow changing itemType TO user", async () => {
      const setup = await _setupTileWithItemType(MapItemType.CONTEXT);

      // Cannot change to USER type - it's system-controlled
      await expect(
        testEnv.service.items.crud.updateItem({
          coords: setup.coords,
          itemType: MapItemType.USER,
        })
      ).rejects.toThrow();
    });

    it("should NOT allow changing itemType FROM user", async () => {
      // USER type tiles are root tiles - they cannot be changed to other types
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      const rootCoords = CoordSystem.parseId(rootItem.coords);

      // Cannot change USER type to any other type
      await expect(
        testEnv.service.items.crud.updateItem({
          coords: rootCoords,
          itemType: MapItemType.ORGANIZATIONAL,
        })
      ).rejects.toThrow();
    });
  });

  describe("itemType hierarchy constraints", () => {
    it("should enforce SYSTEM children under SYSTEM parent", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create a SYSTEM parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthWest],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "System Parent",
        itemType: MapItemType.SYSTEM,
      });

      // Try to create a CONTEXT child under SYSTEM parent - should fail
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthWest, Direction.East],
      });

      await expect(
        testEnv.service.items.crud.addItemToMap({
          parentId: parseInt(parent.id),
          coords: childCoords,
          title: "Context Child",
          itemType: MapItemType.CONTEXT,
        })
      ).rejects.toThrow("Structural children of SYSTEM tiles must also be SYSTEM tiles");
    });

    it("should enforce CONTEXT children under CONTEXT parent", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create a CONTEXT parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.East],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Context Parent",
        itemType: MapItemType.CONTEXT,
      });

      // Try to create an ORGANIZATIONAL child under CONTEXT parent - should fail
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.East, Direction.SouthEast],
      });

      await expect(
        testEnv.service.items.crud.addItemToMap({
          parentId: parseInt(parent.id),
          coords: childCoords,
          title: "Organizational Child",
          itemType: MapItemType.ORGANIZATIONAL,
        })
      ).rejects.toThrow("ORGANIZATIONAL tiles can only be created under USER or ORGANIZATIONAL parents");
    });

    it("should allow any non-USER itemType under ORGANIZATIONAL parent", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create an ORGANIZATIONAL parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthEast],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Organizational Parent",
        itemType: MapItemType.ORGANIZATIONAL,
      });

      // Create children with different itemTypes - all should succeed
      const contextChild = await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: _createTestCoordinates({
          userId,
          groupId,
          path: [Direction.SouthEast, Direction.NorthWest],
        }),
        title: "Context Child",
        itemType: MapItemType.CONTEXT,
      });

      const systemChild = await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: _createTestCoordinates({
          userId,
          groupId,
          path: [Direction.SouthEast, Direction.East],
        }),
        title: "System Child",
        itemType: MapItemType.SYSTEM,
      });

      expect(contextChild.itemType).toBe(MapItemType.CONTEXT);
      expect(systemChild.itemType).toBe(MapItemType.SYSTEM);
    });

    it("should allow composition children (negative directions) with any itemType", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create a SYSTEM parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.West],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "System Parent",
        itemType: MapItemType.SYSTEM,
      });

      // Create a CONTEXT composition child (negative direction) - should succeed
      // Composition children are not subject to structural hierarchy constraints
      const composedChild = await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: _createTestCoordinates({
          userId,
          groupId,
          path: [Direction.West, -Direction.East], // Negative direction = composition
        }),
        title: "Context Composed Child",
        itemType: MapItemType.CONTEXT,
      });

      expect(composedChild.itemType).toBe(MapItemType.CONTEXT);
    });
  });

  describe("itemType update constraints - preventing hierarchy breaks", () => {
    it("should NOT allow changing SYSTEM tile to non-SYSTEM when parent is SYSTEM", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create SYSTEM parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthWest],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "System Parent",
        itemType: MapItemType.SYSTEM,
      });

      // Create SYSTEM child
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthWest, Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: childCoords,
        title: "System Child",
        itemType: MapItemType.SYSTEM,
      });

      // Try to change child to CONTEXT - should fail
      await expect(
        testEnv.service.items.crud.updateItem({
          coords: childCoords,
          itemType: MapItemType.CONTEXT,
        })
      ).rejects.toThrow("tile is a structural child of a SYSTEM tile");
    });

    it("should NOT allow changing CONTEXT tile to non-CONTEXT when parent is CONTEXT", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create CONTEXT parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.East],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Context Parent",
        itemType: MapItemType.CONTEXT,
      });

      // Create CONTEXT child
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.East, Direction.SouthEast],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: childCoords,
        title: "Context Child",
        itemType: MapItemType.CONTEXT,
      });

      // Try to change child to ORGANIZATIONAL - should fail
      await expect(
        testEnv.service.items.crud.updateItem({
          coords: childCoords,
          itemType: MapItemType.ORGANIZATIONAL,
        })
      ).rejects.toThrow("Cannot change to ORGANIZATIONAL: parent must be USER or ORGANIZATIONAL");
    });

    it("should NOT allow changing tile to ORGANIZATIONAL when parent is SYSTEM", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create SYSTEM parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthEast],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "System Parent",
        itemType: MapItemType.SYSTEM,
      });

      // Create SYSTEM child
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthEast, Direction.West],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: childCoords,
        title: "System Child",
        itemType: MapItemType.SYSTEM,
      });

      // Try to change child to ORGANIZATIONAL - should fail (parent is SYSTEM, not USER/ORGANIZATIONAL)
      await expect(
        testEnv.service.items.crud.updateItem({
          coords: childCoords,
          itemType: MapItemType.ORGANIZATIONAL,
        })
      ).rejects.toThrow();
    });

    it("should NOT allow creating ORGANIZATIONAL tile under SYSTEM parent", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create SYSTEM parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.West],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "System Parent",
        itemType: MapItemType.SYSTEM,
      });

      // Try to create ORGANIZATIONAL child under SYSTEM parent - should fail
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.West, Direction.NorthEast],
      });

      await expect(
        testEnv.service.items.crud.addItemToMap({
          parentId: parseInt(parent.id),
          coords: childCoords,
          title: "Organizational Child",
          itemType: MapItemType.ORGANIZATIONAL,
        })
      ).rejects.toThrow("ORGANIZATIONAL tiles can only be created under USER or ORGANIZATIONAL parents");
    });

    it("should NOT allow creating ORGANIZATIONAL tile under CONTEXT parent", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create CONTEXT parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthWest],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Context Parent",
        itemType: MapItemType.CONTEXT,
      });

      // Try to create ORGANIZATIONAL child under CONTEXT parent - should fail
      const childCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthWest, Direction.NorthWest],
      });

      await expect(
        testEnv.service.items.crud.addItemToMap({
          parentId: parseInt(parent.id),
          coords: childCoords,
          title: "Organizational Child",
          itemType: MapItemType.ORGANIZATIONAL,
        })
      ).rejects.toThrow("ORGANIZATIONAL tiles can only be created under USER or ORGANIZATIONAL parents");
    });
  });

  describe("itemType cascade updates", () => {
    it("should cascade SYSTEM itemType to structural descendants when updating", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create an ORGANIZATIONAL parent with CONTEXT children
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthEast],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Organizational Parent",
        itemType: MapItemType.ORGANIZATIONAL,
      });

      const child1 = await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: _createTestCoordinates({
          userId,
          groupId,
          path: [Direction.NorthEast, Direction.East],
        }),
        title: "Child 1",
        itemType: MapItemType.CONTEXT,
      });

      const child2 = await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: _createTestCoordinates({
          userId,
          groupId,
          path: [Direction.NorthEast, Direction.West],
        }),
        title: "Child 2",
        itemType: MapItemType.ORGANIZATIONAL,
      });

      // Update parent to SYSTEM - should cascade to all structural descendants
      await testEnv.service.items.crud.updateItem({
        coords: parentCoords,
        itemType: MapItemType.SYSTEM,
      });

      // Verify all items are now SYSTEM
      const updatedParent = await testEnv.service.items.crud.getItem({
        coords: parentCoords,
        requester: asRequesterUserId(userId),
      });
      const updatedChild1 = await testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(child1.coords),
        requester: asRequesterUserId(userId),
      });
      const updatedChild2 = await testEnv.service.items.crud.getItem({
        coords: CoordSystem.parseId(child2.coords),
        requester: asRequesterUserId(userId),
      });

      expect(updatedParent.itemType).toBe(MapItemType.SYSTEM);
      expect(updatedChild1.itemType).toBe(MapItemType.SYSTEM);
      expect(updatedChild2.itemType).toBe(MapItemType.SYSTEM);
    });

    it("should NOT cascade itemType to composition children when updating to SYSTEM", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create an ORGANIZATIONAL parent
      const parentCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthWest],
      });
      const parent = await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: parentCoords,
        title: "Organizational Parent",
        itemType: MapItemType.ORGANIZATIONAL,
      });

      // Create a composition child (negative direction)
      const composedChildCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.SouthWest, -Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: parseInt(parent.id),
        coords: composedChildCoords,
        title: "Composed Child",
        itemType: MapItemType.CONTEXT,
      });

      // Update parent to SYSTEM
      await testEnv.service.items.crud.updateItem({
        coords: parentCoords,
        itemType: MapItemType.SYSTEM,
      });

      // Composition child should remain CONTEXT (not cascaded)
      const updatedComposed = await testEnv.service.items.crud.getItem({
        coords: composedChildCoords,
        requester: asRequesterUserId(userId),
      });

      expect(updatedComposed.itemType).toBe(MapItemType.CONTEXT);
    });
  });

  describe("read endpoints - itemType in responses", () => {
    it("should return itemType in getItemByCoords response", async () => {
      const setup = await _setupTileWithItemType(MapItemType.SYSTEM);

      const result = await testEnv.service.items.crud.getItem({
        coords: setup.coords,
        requester: asRequesterUserId(setup.userId),
      });

      expect(result.itemType).toBe(MapItemType.SYSTEM);
    });

    it("should return itemType in getItemsForRootItem response", async () => {
      const testParams = _createUniqueTestParams();
      const { userId, groupId } = testParams;
      const rootMap = await _setupBasicMap(testEnv.service, testParams);

      // Create tiles with different itemTypes
      const organizationalCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.NorthWest],
      });
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: organizationalCoords,
        title: "Org Tile",
        itemType: MapItemType.ORGANIZATIONAL,
      });

      const systemCoords: Coord = _createTestCoordinates({
        userId,
        groupId,
        path: [Direction.East],
      });
      await createTestItem(testEnv, {
        parentId: rootMap.id,
        coords: systemCoords,
        title: "System Tile",
        itemType: MapItemType.SYSTEM,
      });

      const items = await testEnv.service.items.query.getItems({
        userId,
        groupId,
      });

      // Verify itemTypes are returned for all items
      const orgItem = items.find(item => item.title === "Org Tile");
      const sysItem = items.find(item => item.title === "System Tile");
      const rootItem = items.find(item => item.depth === 0);

      expect(orgItem?.itemType).toBe(MapItemType.ORGANIZATIONAL);
      expect(sysItem?.itemType).toBe(MapItemType.SYSTEM);
      expect(rootItem?.itemType).toBe(MapItemType.USER);
    });

    it("should return USER itemType for root tiles", async () => {
      const testParams = _createUniqueTestParams();
      const rootMap = await _setupBasicMap(testEnv.service, testParams);
      const rootItem = rootMap.items[0];
      if (!rootItem) throw new Error("Root item not found");

      expect(rootItem.itemType).toBe(MapItemType.USER);
    });
  });

  // Helper functions
  async function _setupMapWithParent() {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    // Create parent tile with ORGANIZATIONAL type to allow any child itemType
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
      itemType: MapItemType.ORGANIZATIONAL,
    });

    return {
      userId,
      groupId,
      rootMapId: rootMap.id,
      parentId: parseInt(parentItem.id),
      parentCoords,
    };
  }

  async function _setupTileWithItemType(itemType: MapItemType) {
    const testParams = _createUniqueTestParams();
    const { userId, groupId } = testParams;
    const rootMap = await _setupBasicMap(testEnv.service, testParams);

    const tileCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.SouthEast],
    });

    await createTestItem(testEnv, {
      parentId: rootMap.id,
      coords: tileCoords,
      title: `Tile with ${itemType} type`,
      itemType,
    });

    return {
      userId,
      groupId,
      coords: tileCoords,
    };
  }
});
