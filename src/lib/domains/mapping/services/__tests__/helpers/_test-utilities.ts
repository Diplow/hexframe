import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { MappingService } from "~/lib/domains/mapping/services";
import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { db } from "~/server/db";
import { type Coord, Direction } from "~/lib/domains/mapping/utils";

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

/**
 * Cleans up test database tables.
 *
 * NOTE: With parallel test execution, cleanup can cause race conditions.
 * Tests should prefer using _createUniqueTestParams() for isolation.
 * This function is kept for backwards compatibility but may be a no-op
 * in environments where parallel test isolation is required.
 */
export async function _cleanupDatabase(): Promise<void> {
  // Use TRUNCATE CASCADE with all related tables in a single statement
  // This is atomic and avoids FK issues between tables
  const { sql } = await import("drizzle-orm");

  try {
    await db.execute(
      sql`TRUNCATE TABLE vde_map_items, vde_base_item_versions, vde_base_items RESTART IDENTITY CASCADE`,
    );
  } catch (error) {
    // In parallel test execution, cleanup conflicts are expected.
    // Only suppress lock/conflict errors; re-throw others
    const isExpectedError = 
      error instanceof Error && 
      (error.message.includes('deadlock') || 
       error.message.includes('lock') ||
       error.message.includes('concurrent'));
    
    if (!isExpectedError) {
      console.warn('[_cleanupDatabase] Unexpected error during cleanup:', error);
      throw error;
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
  userId: string;
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
  params: { userId: string; groupId: number; title?: string },
) {
  return await service.maps.createMap({
    userId: params.userId,
    groupId: params.groupId,
    title: params.title ?? "Test Map",
    content: "Test Description",
  });
}

export async function _setupMapWithChild(
  service: MappingService,
  params: {
    userId: string;
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

// Counter for generating unique test params within a session
let testParamCounter = 0;

// Helper to ensure unique test parameters to avoid conflicts
export function _createUniqueTestParams(baseUserId = "user-test"): {
  userId: string;
  groupId: number;
} {
  // Use a combination of counter, timestamp, and random for true uniqueness
  const counter = testParamCounter++;
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    // Combines baseUserId with timestamp and counter for uniqueness
    userId: `${baseUserId}-${timestamp}-${counter}-${random}`,
    // Each call gets a unique groupId based on counter
    groupId: counter,
  };
}
