import { expect } from "vitest";
import { Direction, CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _setupBasicMap,
  _createTestCoordinates,
} from "../_test-utilities";

export async function _setupItemHierarchyForRemoval(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const setupData = await _setupBasicMap(testEnv.service, setupParams);

  // Add child items to the root map
  const child1Coords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East],
  });

  const child1 = await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: child1Coords,
    title: "Child 1",
  });

  const child2Coords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.West],
  });

  await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: child2Coords,
    title: "Child 2",
  });

  return { setupParams, setupData, child1, child1Coords, child2Coords };
}

export async function _validateItemRemovalAndHierarchy(
  testEnv: TestEnvironment,
  setupData: {
    setupParams: { userId: number; groupId: number };
    child1Coords: Parameters<typeof CoordSystem.createId>[0];
  },
) {
  let mapData = await testEnv.service.maps.getMapData(setupData.setupParams);
  expect(mapData?.itemCount).toBe(3); // root + 2 children

  await testEnv.service.items.crud.removeItem({
    coords: setupData.child1Coords,
  });

  mapData = await testEnv.service.maps.getMapData(setupData.setupParams);
  expect(mapData?.itemCount).toBe(2); // root + 1 child
}

export async function _validateRootItemRemoval(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  await _setupBasicMap(testEnv.service, setupParams);
  const rootCoords = CoordSystem.getCenterCoord(
    setupParams.userId,
    setupParams.groupId,
  );

  await testEnv.service.items.crud.removeItem({ coords: rootCoords });

  await expect(testEnv.service.maps.getMapData(setupParams)).rejects.toThrow();
}

export async function _validateRemoveNonExistentItemError(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const nonExistentCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.SouthWest, Direction.West],
  });

  await expect(
    testEnv.service.items.crud.removeItem({ coords: nonExistentCoords }),
  ).rejects.toThrow();
}
