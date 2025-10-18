import { Direction } from "~/lib/domains/mapping/utils";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import {
  _setupBasicMap,
  _createTestCoordinates,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

export async function _setupItemForMovement(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const setupData = await _setupBasicMap(testEnv.service, setupParams);

  const initialCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East],
  });

  const item = await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: initialCoords,
    title: "Test Item",
  });

  return {
    setupData,
    item,
    initialCoords,
    userId: setupParams.userId,
    groupId: setupParams.groupId,
  };
}

export async function _setupTwoItemsForSwap(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const setupData = await _setupBasicMap(testEnv.service, setupParams);

  const firstCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East],
  });

  const firstItem = await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: firstCoords,
    title: "First Item",
  });

  const secondCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.West],
  });

  const secondItem = await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: secondCoords,
    title: "Second Item",
  });

  return {
    setupData,
    firstItem,
    firstItemCoords: firstCoords,
    secondItem,
    secondItemCoords: secondCoords,
  };
}

export async function _setupParentChildHierarchy(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const setupData = await _setupBasicMap(testEnv.service, setupParams);

  const parentCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East],
  });

  const parentItem = await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: parentCoords,
    title: "Parent Item",
  });

  const childCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East, Direction.NorthEast],
  });

  const childItem = await testEnv.service.items.crud.addItemToMap({
    parentId: parseInt(parentItem.id),
    coords: childCoords,
    title: "Child Item",
  });

  const parentNewCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.West],
  });

  return {
    setupData,
    parentItem,
    parentInitialCoords: parentCoords,
    parentNewCoords,
    childItem,
    childInitialCoords: childCoords,
    userId: setupParams.userId,
    groupId: setupParams.groupId,
  };
}

export async function _setupItemWithComposition(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
) {
  const setupData = await _setupBasicMap(testEnv.service, setupParams);

  const parentCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East],
  });

  const parentItem = await testEnv.service.items.crud.addItemToMap({
    parentId: setupData.id,
    coords: parentCoords,
    title: "Parent Item",
  });

  const compositionCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East, Direction.Center],
  });

  const compositionContainer = await testEnv.service.items.crud.addItemToMap({
    parentId: parseInt(parentItem.id),
    coords: compositionCoords,
    title: "Composition Container",
  });

  const composedChild1Coords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East, Direction.Center, Direction.NorthWest],
  });

  const composedChild1 = await testEnv.service.items.crud.addItemToMap({
    parentId: parseInt(compositionContainer.id),
    coords: composedChild1Coords,
    title: "Composed Child 1",
  });

  const composedChild2Coords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.East, Direction.Center, Direction.SouthEast],
  });

  const composedChild2 = await testEnv.service.items.crud.addItemToMap({
    parentId: parseInt(compositionContainer.id),
    coords: composedChild2Coords,
    title: "Composed Child 2",
  });

  const parentNewCoords = _createTestCoordinates({
    userId: setupParams.userId,
    groupId: setupParams.groupId,
    path: [Direction.West],
  });

  return {
    setupData,
    parentItem,
    parentInitialCoords: parentCoords,
    parentNewCoords,
    compositionContainer,
    composedChild1,
    composedChild2,
    userId: setupParams.userId,
    groupId: setupParams.groupId,
  };
}
