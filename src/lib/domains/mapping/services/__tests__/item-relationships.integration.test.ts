import { describe, beforeEach, it, expect } from "vitest";
import { type Coord, Direction } from "~/lib/domains/mapping/utils";
import {
  type TestEnvironment,
  _cleanupDatabase,
  _createTestEnvironment,
  _setupBasicMap,
  _createTestCoordinates,
  _createUniqueTestParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

describe("MappingService - Item Relationships [Integration - DB]", () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    await _cleanupDatabase();
    testEnv = _createTestEnvironment();
  });

  describe("getDescendants", () => {
    it("should return descendants of an item", async () => {
      const hierarchySetup = await _setupComplexHierarchy();

      await _validateRootDescendants(hierarchySetup);
      await _validateChildDescendants(hierarchySetup);
      await _validateLeafDescendants(hierarchySetup);
    });
  });

  // Helper functions (prefixed with _ for internal use)
  async function _setupComplexHierarchy() {
    const testParams = _createUniqueTestParams();
    const userId = testParams.userId;
    const groupId = testParams.groupId;
    const rootMap = await _setupBasicMap(testEnv.service, { userId, groupId });

    const childCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast],
    });
    const childItem: Awaited<ReturnType<typeof testEnv.service.items.crud.addItemToMap>> = await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: childCoords,
      title: "Child Item",
    });

    const grandchildCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.NorthEast, Direction.East],
    });
    const grandchildItem: Awaited<ReturnType<typeof testEnv.service.items.crud.addItemToMap>> = await testEnv.service.items.crud.addItemToMap({
      parentId: parseInt(childItem.id),
      coords: grandchildCoords,
      title: "Grandchild Item",
    });

    const unrelatedChildCoords: Coord = _createTestCoordinates({
      userId,
      groupId,
      path: [Direction.West],
    });
    await testEnv.service.items.crud.addItemToMap({
      parentId: rootMap.id,
      coords: unrelatedChildCoords,
      title: "Unrelated Item (Child of Root)",
    });

    return {
      userId,
      groupId,
      rootMap,
      childItem,
      grandchildItem,
    };
  }

  async function _validateRootDescendants(hierarchySetup: {
    userId: number;
    groupId: number;
    rootMap: { coords: Parameters<typeof testEnv.service.items.crud.getItem>[0]['coords'] };
  }) {
    const mapData = await testEnv.service.maps.getMapData({
      userId: hierarchySetup.userId,
      groupId: hierarchySetup.groupId,
    });
    expect(mapData?.items.length).toBe(4);

    const rootMapContract: Awaited<ReturnType<typeof testEnv.service.items.crud.getItem>> = await testEnv.service.items.crud.getItem({
      coords: hierarchySetup.rootMap.coords,
    });

    const rootDescendants = await testEnv.service.items.query.getDescendants({
      itemId: parseInt(rootMapContract.id),
    });
    expect(rootDescendants.length).toBe(3);
  }

  async function _validateChildDescendants(hierarchySetup: { childItem: { id: string } }) {
    const childDescendants = await testEnv.service.items.query.getDescendants({
      itemId: parseInt(hierarchySetup.childItem.id),
    });
    expect(childDescendants.length).toBe(1);
    expect(childDescendants[0]!.title).toBe("Grandchild Item");
  }

  async function _validateLeafDescendants(hierarchySetup: {
    grandchildItem: { id: string };
  }) {
    const noDescendants = await testEnv.service.items.query.getDescendants({
      itemId: parseInt(hierarchySetup.grandchildItem.id),
    });
    expect(noDescendants.length).toBe(0);
  }
});
