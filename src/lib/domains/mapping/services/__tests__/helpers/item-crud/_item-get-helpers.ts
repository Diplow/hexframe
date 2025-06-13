import { expect } from "vitest";
import { Direction, CoordSystem } from "../../../../utils/hex-coordinates";
import type { Coord } from "../../../../utils/hex-coordinates";
import type { TestEnvironment } from "../_test-utilities";
import { _setupBasicMap, _createTestCoordinates } from "../_test-utilities";

export async function _setupItemForRetrieval(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const setupData = await _setupBasicMap(testEnv.service, setupParams);

  const itemCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East],
  });

  await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: itemCoords,
    title: "Test Retrievable Item",
    descr: "Test Description",
    url: "https://example.com",
  });

  return { setupData, itemCoords };
}

export async function _validateItemRetrieval(
  testEnv: TestEnvironment,
  itemCoords: Parameters<typeof CoordSystem.createId>[0],
  expectedItemData: {
    title: string;
    descr: string;
    url: string;
  },
) {
  const retrievedItem = await testEnv.service.items.crud.getItem({
    coords: itemCoords,
  });

  expect(retrievedItem).toBeDefined();
  expect(retrievedItem.name).toBe(expectedItemData.title);
  expect(retrievedItem.descr).toBe(expectedItemData.descr);
  expect(retrievedItem.url).toBe(expectedItemData.url);
  expect(retrievedItem.coords).toEqual(CoordSystem.createId(itemCoords));
  expect(retrievedItem.itemType).toBe("base");

  return retrievedItem;
}

export async function _validateItemNotFoundError(
  testEnv: TestEnvironment,
  nonExistentCoords: Coord,
) {
  await expect(
    testEnv.service.items.crud.getItem({ coords: nonExistentCoords }),
  ).rejects.toThrow();
}
