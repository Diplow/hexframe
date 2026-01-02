import { expect } from "vitest";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { createTestItem } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";

export async function _addAndValidateChildItem(
  testEnv: TestEnvironment,
  setupData: { rootMapItem: { id: string | number } },
  addItemArgs: {
    title: string;
    coords: Parameters<typeof CoordSystem.createId>[0];
    itemType?: typeof MapItemType[keyof typeof MapItemType];
  },
) {
  const childItemContract = await createTestItem(testEnv, {
    ...addItemArgs,
    parentId: Number(setupData.rootMapItem.id),
    itemType: addItemArgs.itemType ?? MapItemType.CONTEXT,
  });

  // Validate the child item contract
  expect(childItemContract).toBeDefined();
  expect(Number(childItemContract.id)).toBeGreaterThan(0);
  expect(childItemContract.title).toBe(addItemArgs.title);
  expect(childItemContract.coords).toEqual(
    CoordSystem.createId(addItemArgs.coords),
  );
  expect(childItemContract.itemType).toBe(MapItemType.CONTEXT);

  return childItemContract;
}

export async function _validateMapItemHierarchy(
  testEnv: TestEnvironment,
  setupParams: { userId: string; groupId: number },
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
      expect(childInTree.title).toBe(addItemArgs.title);
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
    createTestItem(testEnv, {
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
    createTestItem(testEnv, {
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
    createTestItem(testEnv, {
      parentId: 9999999, // Use a very large non-existent ID
      coords: setupData.childCoords,
      title: "Should Fail",
    }),
  ).rejects.toThrow();
}
