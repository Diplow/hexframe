import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { MappingService } from "~/lib/domains/mapping/services";
import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { db } from "~/server/db";
import { type Coord, Direction, MapItemType } from "~/lib/domains/mapping/utils";

// Re-export common types for test files
export { SYSTEM_INTERNAL, type RequesterContext } from "~/lib/domains/mapping/types";
export { MapItemType } from "~/lib/domains/mapping/utils";

// Re-export test item factory for convenient item creation with defaults
export {
  createTestItem,
  createTestStructuralChild,
  createTestComposedChild,
  createTestHexplan,
  createTestOrganizationalItem,
  createTestSystemItem,
  type TestItemParams,
} from "~/lib/domains/mapping/services/__tests__/helpers/_test-item-factory";

// PostgreSQL error codes for concurrency/lock-related issues
// See: https://www.postgresql.org/docs/current/errcodes-appendix.html
const EXPECTED_PG_ERROR_CODES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '55P03', // lock_not_available
  '57014', // query_canceled (can happen during concurrent truncate)
]);

// Message patterns indicating expected parallel-cleanup conflicts
const EXPECTED_ERROR_PATTERNS = [
  'deadlock',
  'lock',
  'concurrent',
  'could not obtain lock',
  'canceling statement due to conflict',
  'tuple concurrently',
];

/**
 * Checks if an error is an expected concurrency/lock-related error
 * that can safely be ignored during parallel test cleanup.
 */
function _isExpectedConcurrencyError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }

  // Check PostgreSQL error code if available (node-postgres / pg errors)
  const pgError = err as Error & { code?: string };
  if (pgError.code && EXPECTED_PG_ERROR_CODES.has(pgError.code)) {
    return true;
  }

  // Check error message for known concurrency patterns
  const lowerMessage = err.message.toLowerCase();
  return EXPECTED_ERROR_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

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
  } catch (err) {
    // In parallel test execution, cleanup conflicts are expected.
    // Only suppress lock/conflict errors; re-throw others (connection, permission, syntax/schema)
    const isExpectedConcurrencyError = _isExpectedConcurrencyError(err);

    if (isExpectedConcurrencyError) {
      // Debug-level: expected during parallel test execution, no action needed
      return;
    }

    // Unexpected error - log and rethrow so tests fail fast
    console.error('[_cleanupDatabase] Unexpected error during cleanup:', err);
    throw err;
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
    childItemType?: MapItemType;
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
    itemType: params.childItemType ?? MapItemType.CONTEXT,
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
