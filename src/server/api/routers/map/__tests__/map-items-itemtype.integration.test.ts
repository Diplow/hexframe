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
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("tRPC Map Items Router - ItemType API Exposure [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("addItem mutation - itemType parameter", () => {
    it("should accept optional itemType parameter with value 'organizational'", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.East],
      });

      const result = await testEnv.service.items.crud.addItemToMap({
        parentId: setup.parentId,
        coords: childCoords,
        title: "Organizational Tile",
        itemType: MapItemType.ORGANIZATIONAL,
      });

      expect(result.itemType).toBe(MapItemType.ORGANIZATIONAL);
    });

    it("should accept optional itemType parameter with value 'context'", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.SouthEast],
      });

      const result = await testEnv.service.items.crud.addItemToMap({
        parentId: setup.parentId,
        coords: childCoords,
        title: "Context Tile",
        itemType: MapItemType.CONTEXT,
      });

      expect(result.itemType).toBe(MapItemType.CONTEXT);
    });

    it("should accept optional itemType parameter with value 'system'", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.West],
      });

      const result = await testEnv.service.items.crud.addItemToMap({
        parentId: setup.parentId,
        coords: childCoords,
        title: "System Tile",
        itemType: MapItemType.SYSTEM,
      });

      expect(result.itemType).toBe(MapItemType.SYSTEM);
    });

    it("should default to CONTEXT when no itemType is provided", async () => {
      const setup = await _setupMapWithParent();

      const childCoords: Coord = _createTestCoordinates({
        userId: setup.userId,
        groupId: setup.groupId,
        path: [Direction.NorthEast, Direction.NorthWest],
      });

      const result = await testEnv.service.items.crud.addItemToMap({
        parentId: setup.parentId,
        coords: childCoords,
        title: "Default Type Tile",
        // No itemType provided
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
        testEnv.service.items.crud.addItemToMap({
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
      await testEnv.service.items.crud.addItemToMap({
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
      await testEnv.service.items.crud.addItemToMap({
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

    // Create parent tile
    const parentCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const parentItem = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: parentCoords,
      title: "Parent Tile",
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

    await testEnv.service.items.crud.addItemToMap({
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
