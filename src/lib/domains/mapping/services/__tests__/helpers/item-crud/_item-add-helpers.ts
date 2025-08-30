import { expect } from "vitest";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";

export async function _addAndValidateChildItem(
  testEnv: TestEnvironment,
  setupData: { rootMapItem: { id: string | number } },
  addItemArgs: {
    title: string;
    coords: Parameters<typeof CoordSystem.createId>[0];
  },
) {
  const childItemContract =
    await testEnv.service.items.crud.addItemToMap({
      ...addItemArgs,
      parentId: Number(setupData.rootMapItem.id),
    });

  // Validate the child item contract
  expect(childItemContract).toBeDefined();
  expect(Number(childItemContract.id)).toBeGreaterThan(0);
  expect(childItemContract.name).toBe(addItemArgs.title);
  expect(childItemContract.coords).toEqual(
    CoordSystem.createId(addItemArgs.coords),
  );
  expect(childItemContract.itemType).toBe(MapItemType.BASE);

  return childItemContract;
}

export async function _validateMapItemHierarchy(
  testEnv: TestEnvironment,
  setupParams: { userId: number; groupId: number },
  addItemArgs: { parentId: number; title?: string; coords?: Coord },
) {
  const mapData = await testEnv.service.maps.getMapData(setupParams);

  expect(mapData).not.toBeNull();
  if (mapData) {
    // Should have root + child
    expect(mapData.itemCount).toBe(2);
    expect(mapData.items).toHaveLength(2);

    // Find child item in the tree
    const childInTree = mapData.items.find(
      (item) => item.id !== String(mapData.id),
    );
    expect(childInTree).toBeDefined();
    if (childInTree) {
      expect(childInTree.name).toBe(addItemArgs.title);
      const coords = 'coords' in addItemArgs ? addItemArgs.coords : undefined;
      if (coords) {
        expect(childInTree.coords).toEqual(
          CoordSystem.createId(coords),
        );
      }
    }
  }
}

export async function _validateMismatchedCoordinatesError(
  testEnv: TestEnvironment,
  setupData: { rootMapId: number; mismatchedCoords: Coord },
) {
  await expect(
    testEnv.service.items.crud.addItemToMap({
      parentId: setupData.rootMapId,
      coords: setupData.mismatchedCoords,
      title: "Should Fail",
    }),
  ).rejects.toThrow();
}

export async function _validateNonChildCoordinatesError(
  testEnv: TestEnvironment,
  setupData: { rootMapId: number; nonChildCoords: Coord },
) {
  await expect(
    testEnv.service.items.crud.addItemToMap({
      parentId: setupData.rootMapId,
      coords: setupData.nonChildCoords,
      title: "Should Fail",
    }),
  ).rejects.toThrow();
}

export async function _validateNonExistentParentError(
  testEnv: TestEnvironment,
  setupData: { childCoords: Coord },
) {
  await expect(
    testEnv.service.items.crud.addItemToMap({
      parentId: 9999999, // Use a very large non-existent ID
      coords: setupData.childCoords,
      title: "Should Fail",
    }),
  ).rejects.toThrow();
}
