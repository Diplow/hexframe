import { expect } from "vitest";
import { Direction } from "~/lib/domains/mapping/utils";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { _setupBasicMap, _createTestCoordinates } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

export async function _setupItemForUpdate(
  testEnv: TestEnvironment,
  setupParams: { userId: string; groupId: number },
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
    content: "Original Description",
    link: "https://example.com",
  });

  return { setupData, itemCoords, originalItem };
}

export async function _validateItemUpdate(
  testEnv: TestEnvironment,
  itemCoords: Coord,
  updateData: { title: string; content: string; link: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    ...updateData,
  });

  expect(updatedItemContract).toBeDefined();
  expect(updatedItemContract.title).toBe(updateData.title);
  expect(updatedItemContract.content).toBe(updateData.content);
  expect(updatedItemContract.link).toBe(updateData.link);

  const fetchedAgain = await testEnv.service.items.crud.getItem({ coords: itemCoords, requester: SYSTEM_INTERNAL });
  expect(fetchedAgain).toBeDefined();
  if (!fetchedAgain) throw new Error("Item not found");
  expect(fetchedAgain.title).toBe(updateData.title);
  expect(fetchedAgain.content).toBe(updateData.content);
  expect(fetchedAgain.link).toBe(updateData.link);
}

export async function _validateUpdateNonExistentItemError(
  testEnv: TestEnvironment,
  setupParams: { userId: string; groupId: number },
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
  originalItem: { content: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    title: "New Title Only",
  });

  expect(updatedItemContract.title).toBe("New Title Only");
  expect(updatedItemContract.content).toBe(originalItem.content);
}

export async function _updateAndValidateItem(
  testEnv: TestEnvironment,
  itemCoords: Coord,
  updateData: { title: string; content: string; link: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    ...updateData,
  });

  expect(updatedItemContract).toBeDefined();
  expect(updatedItemContract.title).toBe(updateData.title);
  expect(updatedItemContract.content).toBe(updateData.content);
  expect(updatedItemContract.link).toBe(updateData.link);

  const fetchedAgain = await testEnv.service.items.crud.getItem({
    coords: itemCoords,
    requester: SYSTEM_INTERNAL,
  });
  expect(fetchedAgain.title).toBe(updateData.title);
  expect(fetchedAgain.content).toBe(updateData.content);
  expect(fetchedAgain.link).toBe(updateData.link);

  return updatedItemContract;
}

export async function _partialUpdateAndValidate(
  testEnv: TestEnvironment,
  itemCoords: Coord,
  partialUpdateData: { title?: string; content?: string; url?: string },
) {
  const updatedItemContract = await testEnv.service.items.crud.updateItem({
    coords: itemCoords,
    ...partialUpdateData,
  });

  expect(updatedItemContract).toBeDefined();
  // Only the updated field should change
  expect(updatedItemContract.title).toBe(partialUpdateData.title);
  // Other fields should remain unchanged if not specified

  return updatedItemContract;
}
