import { expect } from "vitest";
import { Direction } from "~/lib/domains/mapping/utils";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { _setupBasicMap, _createTestCoordinates } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

export async function _setupItemForUpdate(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const setupData = await _setupBasicMap(testEnv.service, setupParams);

  const itemCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East],
  });

  const originalItem = await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: itemCoords,
    title: "Original Title",
    descr: "Original Description",
    url: "https://example.com",
  });

  return { setupData, itemCoords, originalItem };
}

export async function _validateItemUpdate(
  testEnv: TestEnvironment,
  itemCoords: Coord,
  updateData: { title: string; descr: string; url: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    ...updateData,
  });

  expect(updatedItemContract).toBeDefined();
  expect(updatedItemContract.name).toBe(updateData.title);
  expect(updatedItemContract.descr).toBe(updateData.descr);
  expect(updatedItemContract.url).toBe(updateData.url);

  const fetchedAgain = await testEnv.service.items.crud.getItem({ coords: itemCoords });
  expect(fetchedAgain).toBeDefined();
  if (!fetchedAgain) throw new Error("Item not found");
  expect(fetchedAgain.name).toBe(updateData.title);
  expect(fetchedAgain.descr).toBe(updateData.descr);
  expect(fetchedAgain.url).toBe(updateData.url);
}

export async function _validateUpdateNonExistentItemError(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const nonExistentCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.SouthWest, Direction.West],
  });

  await expect(
    testEnv.service.items.crud.updateItem({
      coords: nonExistentCoords,
      title: "Won't Update",
    }),
  ).rejects.toThrow();
}

export async function _validatePartialUpdate(
  testEnv: TestEnvironment,
  itemCoords: Coord,
  originalItem: { descr: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    title: "New Title Only",
  });

  expect(updatedItemContract.name).toBe("New Title Only");
  expect(updatedItemContract.descr).toBe(originalItem.descr);
}

export async function _updateAndValidateItem(
  testEnv: TestEnvironment,
  itemCoords: Coord,
  updateData: { title: string; descr: string; url: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    ...updateData,
  });

  expect(updatedItemContract).toBeDefined();
  expect(updatedItemContract.name).toBe(updateData.title);
  expect(updatedItemContract.descr).toBe(updateData.descr);
  expect(updatedItemContract.url).toBe(updateData.url);

  const fetchedAgain = await testEnv.service.items.crud.getItem({
    coords: itemCoords,
  });
  expect(fetchedAgain.name).toBe(updateData.title);
  expect(fetchedAgain.descr).toBe(updateData.descr);
  expect(fetchedAgain.url).toBe(updateData.url);

  return updatedItemContract;
}

export async function _partialUpdateAndValidate(
  testEnv: TestEnvironment,
  itemCoords: Coord,
  partialUpdateData: { title?: string; descr?: string; url?: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    ...partialUpdateData,
  });

  expect(updatedItemContract).toBeDefined();
  // Only the updated field should change
  expect(updatedItemContract.name).toBe(partialUpdateData.title);
  // Other fields should remain unchanged if not specified

  return updatedItemContract;
}
