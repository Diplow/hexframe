/**
 * Test Item Factory
 *
 * Provides a convenient wrapper for creating map items in tests with sensible defaults.
 * This centralizes item creation logic so changes to required fields only need to be
 * updated in one place.
 */

import type { Coord, MapItemContract } from "~/lib/domains/mapping/utils";
import { MapItemType } from "~/lib/domains/mapping/utils";
import type { TestEnvironment } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";

/**
 * Parameters for creating a test item.
 * Only `parentId` and `coords` are required - everything else has sensible defaults.
 */
export interface TestItemParams {
  parentId: number | null;
  coords: Coord;
  title?: string;
  content?: string;
  preview?: string;
  link?: string;
  itemType?: MapItemType;
}

/**
 * Creates a map item with sensible defaults for testing.
 *
 * @param testEnv - The test environment containing the mapping service
 * @param params - Item creation parameters (only parentId and coords required)
 * @returns The created map item contract
 *
 * @example
 * // Minimal usage - just coords and parent
 * const item = await createTestItem(testEnv, {
 *   parentId: rootMap.id,
 *   coords: childCoords,
 * });
 *
 * @example
 * // With title
 * const item = await createTestItem(testEnv, {
 *   parentId: rootMap.id,
 *   coords: childCoords,
 *   title: "My Test Item",
 * });
 *
 * @example
 * // With specific itemType
 * const item = await createTestItem(testEnv, {
 *   parentId: rootMap.id,
 *   coords: childCoords,
 *   itemType: MapItemType.SYSTEM,
 * });
 */
export async function createTestItem(
  testEnv: TestEnvironment,
  params: TestItemParams,
): Promise<MapItemContract> {
  return testEnv.service.items.crud.addItemToMap({
    parentId: params.parentId,
    coords: params.coords,
    title: params.title ?? "Test Item",
    content: params.content,
    preview: params.preview,
    link: params.link,
    itemType: params.itemType ?? MapItemType.CONTEXT,
  });
}

/**
 * Shorthand for creating a structural child item (directions 1-6).
 * Uses CONTEXT type by default.
 */
export async function createTestStructuralChild(
  testEnv: TestEnvironment,
  params: Omit<TestItemParams, 'itemType'> & { itemType?: MapItemType },
): Promise<MapItemContract> {
  return createTestItem(testEnv, {
    ...params,
    itemType: params.itemType ?? MapItemType.CONTEXT,
  });
}

/**
 * Shorthand for creating a composed child item (directions -1 to -6).
 * Uses CONTEXT type by default since composed children are typically reference materials.
 */
export async function createTestComposedChild(
  testEnv: TestEnvironment,
  params: Omit<TestItemParams, 'itemType'> & { itemType?: MapItemType },
): Promise<MapItemContract> {
  return createTestItem(testEnv, {
    ...params,
    itemType: params.itemType ?? MapItemType.CONTEXT,
  });
}

/**
 * Shorthand for creating a hexplan tile (direction 0).
 * Uses SYSTEM type by default since hexplans are execution artifacts.
 */
export async function createTestHexplan(
  testEnv: TestEnvironment,
  params: Omit<TestItemParams, 'itemType' | 'title'> & { title?: string },
): Promise<MapItemContract> {
  return createTestItem(testEnv, {
    ...params,
    title: params.title ?? "Hexplan",
    itemType: MapItemType.SYSTEM,
  });
}

/**
 * Shorthand for creating an organizational tile.
 * Uses ORGANIZATIONAL type.
 */
export async function createTestOrganizationalItem(
  testEnv: TestEnvironment,
  params: Omit<TestItemParams, 'itemType'>,
): Promise<MapItemContract> {
  return createTestItem(testEnv, {
    ...params,
    itemType: MapItemType.ORGANIZATIONAL,
  });
}

/**
 * Shorthand for creating a system tile.
 * Uses SYSTEM type.
 */
export async function createTestSystemItem(
  testEnv: TestEnvironment,
  params: Omit<TestItemParams, 'itemType'>,
): Promise<MapItemContract> {
  return createTestItem(testEnv, {
    ...params,
    itemType: MapItemType.SYSTEM,
  });
}
