import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { MappingService } from "~/lib/domains/mapping/services";
import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { db } from "~/server/db";
import { mapItems, baseItems } from "~/server/db/schema";
import { type Coord, Direction } from "~/lib/domains/mapping/utils";
import { sql } from "drizzle-orm";

export interface TestRepositories {
  mapItem: MapItemRepository;
  baseItem: BaseItemRepository;
}

export interface TestEnvironment {
  service: MappingService;
  repositories: TestRepositories;
}

export const TEST_DB_REPOS: TestRepositories = {
  mapItem: new DbMapItemRepository(db),
  baseItem: new DbBaseItemRepository(db),
};

export async function _cleanupDatabase(): Promise<void> {
  // Delete in the correct order to avoid foreign key constraint violations
  // First delete mapItems (which reference baseItems), then baseItems
  try {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(mapItems);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await db.delete(baseItems);

    // Small delay to ensure cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 10));
  } catch (error) {
    console.warn("Database cleanup warning:", error);
    // If cleanup fails, try a more aggressive approach
    try {
      // Disable foreign key checks temporarily, truncate, then re-enable
      await db.execute(sql`SET session_replication_role = replica`);
      await db.execute(
        sql`TRUNCATE TABLE vde_map_items RESTART IDENTITY CASCADE`,
      );
      await db.execute(
        sql`TRUNCATE TABLE vde_base_items RESTART IDENTITY CASCADE`,
      );
      await db.execute(sql`SET session_replication_role = DEFAULT`);

      // Small delay to ensure operations complete
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (truncateError) {
      console.error("Failed to cleanup database:", truncateError);
      throw truncateError;
    }
  }
}

export function _createTestEnvironment(): TestEnvironment {
  const service = new MappingService({
    mapItem: TEST_DB_REPOS.mapItem,
    baseItem: TEST_DB_REPOS.baseItem,
  });
  return { service, repositories: TEST_DB_REPOS };
}

export function _createTestCoordinates(params: {
  userId: number;
  groupId: number;
  path?: Direction[];
}): Coord {
  return {
    userId: params.userId,
    groupId: params.groupId,
    path: params.path ?? [],
  };
}

export async function _setupBasicMap(
  service: MappingService,
  params: { userId: number; groupId: number; title?: string },
) {
  return await service.maps.createMap({
    userId: params.userId,
    groupId: params.groupId,
    title: params.title ?? "Test Map",
    descr: "Test Description",
  });
}

export async function _setupMapWithChild(
  service: MappingService,
  params: {
    userId: number;
    groupId: number;
    childPath?: Direction[];
    childTitle?: string;
  },
) {
  const rootMap = await _setupBasicMap(service, params);
  const childCoords = _createTestCoordinates({
    userId: params.userId,
    groupId: params.groupId,
    path: params.childPath ?? [Direction.East],
  });

  const childItem = await service.items.crud.addItemToMap({
    parentId: rootMap.id,
    coords: childCoords,
    title: params.childTitle ?? "Child Item",
  });

  return { rootMap, childItem, childCoords };
}

// Helper to ensure unique test parameters to avoid conflicts
export function _createUniqueTestParams(baseUserId = 1): {
  userId: number;
  groupId: number;
} {
  // Use smaller random numbers that fit within integer constraints
  // Generate numbers in a reasonable range for testing
  const random = Math.floor(Math.random() * 10000); // 0-9999
  const timeComponent = Date.now() % 100000; // Last 5 digits of timestamp

  return {
    userId: baseUserId * 1000 + random, // Creates unique IDs in reasonable range
    groupId: timeComponent % 1000, // 0-999 range
  };
}
