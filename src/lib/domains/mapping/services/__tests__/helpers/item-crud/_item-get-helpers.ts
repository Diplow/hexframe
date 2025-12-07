import { expect } from "vitest";
import { Direction, CoordSystem } from "~/lib/domains/mapping/utils";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { _setupBasicMap, _createTestCoordinates } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

export async function _setupItemForRetrieval(
  testEnv: TestEnvironment,
  setupParams: { userId: string; groupId: number },
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
    content: "Test Description",
    link: "https://example.com",
  });

  return { setupData, itemCoords };
}

export async function _validateItemRetrieval(
  testEnv: TestEnvironment,
  itemCoords: Parameters<typeof CoordSystem.createId>[0],
  expectedItemData: {
    title: string;
    content: string;
    link: string;
  },
) {
  const retrievedItem = await testEnv.service.items.crud.getItem({
    coords: itemCoords,
    requester: SYSTEM_INTERNAL,
  });

  expect(retrievedItem).toBeDefined();
  expect(retrievedItem.title).toBe(expectedItemData.title);
  expect(retrievedItem.content).toBe(expectedItemData.content);
  expect(retrievedItem.link).toBe(expectedItemData.link);
  expect(retrievedItem.coords).toEqual(CoordSystem.createId(itemCoords));
  expect(retrievedItem.itemType).toBe(MapItemType.BASE);

  return retrievedItem;
}

export async function _validateItemNotFoundError(
  testEnv: TestEnvironment,
  nonExistentCoords: Coord,
) {
  await expect(
    testEnv.service.items.crud.getItem({ coords: nonExistentCoords, requester: SYSTEM_INTERNAL }),
  ).rejects.toThrow();
}
