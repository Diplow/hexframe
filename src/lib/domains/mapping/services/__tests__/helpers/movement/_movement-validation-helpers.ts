import { expect } from "vitest";
import { Direction, CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _createTestCoordinates,
  _createUniqueTestParams,
  _setupBasicMap,
} from "../_test-utilities";

export async function _validateItemMovementToEmptyCell(
  testEnv: TestEnvironment,
  movementSetup: {
    userId: number;
    groupId: number;
    item: { id: string };
    initialCoords: Coord;
  },
  newCoords: Coord,
) {
  const result = await testEnv.service.items.query.moveMapItem({
    oldCoords: movementSetup.initialCoords,
    newCoords,
  });

  // Find the moved item in the results
  const movedItem = result.modifiedItems.find(item => item.id === String(movementSetup.item.id));
  expect(movedItem).toBeDefined();
  expect(movedItem?.coords).toBe(CoordSystem.createId(newCoords));

  await _validateOldLocationEmpty(testEnv, movementSetup.initialCoords);
  await _validateNewLocationOccupied(testEnv, newCoords, movementSetup.item.id);
}

export async function _validateOldLocationEmpty(
  testEnv: TestEnvironment,
  oldCoords: Coord,
) {
  await expect(
    testEnv.service.items.crud.getItem({ coords: oldCoords }),
  ).rejects.toThrow();
}

export async function _validateNewLocationOccupied(
  testEnv: TestEnvironment,
  newCoords: Coord,
  expectedItemId: string,
) {
  const itemAtNewLocation = await testEnv.service.items.crud.getItem({
    coords: newCoords,
  });
  expect(itemAtNewLocation.id).toBe(expectedItemId);
}

export async function _validateItemSwapping(
  testEnv: TestEnvironment,
  swapSetup: {
    firstItem: { id: string };
    firstItemCoords: Coord;
    secondItem: { id: string };
    secondItemCoords: Coord;
  },
) {
  await testEnv.service.items.query.moveMapItem({
    oldCoords: swapSetup.firstItemCoords,
    newCoords: swapSetup.secondItemCoords,
  });

  const firstItemAtNewLoc = await testEnv.service.items.crud.getItem({
    coords: swapSetup.secondItemCoords,
  });
  expect(firstItemAtNewLoc.id).toBe(swapSetup.firstItem.id);

  const secondItemAtNewLoc = await testEnv.service.items.crud.getItem({
    coords: swapSetup.firstItemCoords,
  });
  expect(secondItemAtNewLoc.id).toBe(swapSetup.secondItem.id);
}

export async function _validateParentChildMovement(
  testEnv: TestEnvironment,
  hierarchySetup: {
    userId: number;
    groupId: number;
    parentItem: { id: string };
    parentInitialCoords: Coord;
    parentNewCoords: Coord;
    childItem: { id: string };
    childInitialCoords: Coord;
  },
) {
  await testEnv.service.items.query.moveMapItem({
    oldCoords: hierarchySetup.parentInitialCoords,
    newCoords: hierarchySetup.parentNewCoords,
  });

  await _validateParentNewPosition(
    testEnv,
    hierarchySetup.parentNewCoords,
    hierarchySetup.parentItem.id,
  );
  await _validateChildRelativePosition(testEnv, {
    ...hierarchySetup,
    childInitialCoords: hierarchySetup.childInitialCoords,
    parentInitialCoords: hierarchySetup.parentInitialCoords,
  });
  await _validateOldPositionsEmpty(testEnv, hierarchySetup);
}

export async function _validateParentNewPosition(
  testEnv: TestEnvironment,
  parentNewCoords: Coord,
  parentItemId: string,
) {
  const movedParent = await testEnv.service.items.crud.getItem({
    coords: parentNewCoords,
  });
  expect(movedParent.id).toBe(parentItemId);
}

export async function _validateChildRelativePosition(
  testEnv: TestEnvironment,
  hierarchySetup: {
    userId: number;
    groupId: number;
    parentNewCoords: Coord;
    parentItem: { id: string };
    childItem: { id: string };
    childInitialCoords: Coord;
    parentInitialCoords: Coord;
  },
) {
  // Calculate the relative path of the child from the parent
  const childRelativePath = hierarchySetup.childInitialCoords.path.slice(
    hierarchySetup.parentInitialCoords.path.length,
  );

  const expectedChildNewCoords = _createTestCoordinates({
    userId: hierarchySetup.userId,
    groupId: hierarchySetup.groupId,
    path: [...hierarchySetup.parentNewCoords.path, ...childRelativePath],
  });

  const movedChild = await testEnv.service.items.crud.getItem({
    coords: expectedChildNewCoords,
  });
  expect(movedChild.id).toBe(hierarchySetup.childItem.id);
  expect(movedChild.parentId).toBe(hierarchySetup.parentItem.id);
}

export async function _validateOldPositionsEmpty(
  testEnv: TestEnvironment,
  hierarchySetup: {
    parentInitialCoords: Coord;
    childInitialCoords: Coord;
  },
) {
  await expect(
    testEnv.service.items.crud.getItem({
      coords: hierarchySetup.parentInitialCoords,
    }),
  ).rejects.toThrow();
  await expect(
    testEnv.service.items.crud.getItem({
      coords: hierarchySetup.childInitialCoords,
    }),
  ).rejects.toThrow();
}

export async function _validateUserItemMoveRestriction(
  testEnv: TestEnvironment,
) {
  const testParams = _createUniqueTestParams();
  const userId = testParams.userId;
  const groupId = testParams.groupId;
  await _setupBasicMap(testEnv.service, { userId, groupId });

  const rootCoords = CoordSystem.getCenterCoord(userId, groupId);
  const childLikePath = _createTestCoordinates({
    userId,
    groupId,
    path: [Direction.East],
  });

  await expect(
    testEnv.service.items.query.moveMapItem({
      oldCoords: rootCoords,
      newCoords: childLikePath,
    }),
  ).rejects.toThrow();
}

export async function _validateCrossSpaceMovementError(
  testEnv: TestEnvironment,
  movementSetup: { userId: number; groupId: number; initialCoords: Coord },
) {
  const differentUserId = movementSetup.userId + 999999;
  const differentSpaceCoords = _createTestCoordinates({
    userId: differentUserId,
    groupId: movementSetup.groupId,
    path: movementSetup.initialCoords.path,
  });

  await expect(
    testEnv.service.items.query.moveMapItem({
      oldCoords: movementSetup.initialCoords,
      newCoords: differentSpaceCoords,
    }),
  ).rejects.toThrow();
}
