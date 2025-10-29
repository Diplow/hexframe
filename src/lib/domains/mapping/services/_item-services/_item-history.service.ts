import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import type { Coord } from "~/lib/domains/mapping/utils";
import type {
  BaseItemVersionContract,
  ItemHistoryContract,
} from "~/lib/domains/mapping/types/contracts";

/**
 * Service for tile version history operations.
 * Isolated from CRUD service to maintain separation of concerns.
 *
 * This service handles:
 * - Querying version history for tiles
 * - Retrieving specific historical versions
 * - Coordinate resolution (coords → MapItem → BaseItem)
 *
 * Does NOT handle:
 * - Creating versions (done automatically by repository)
 * - CRUD operations (handled by ItemCrudService)
 */
export class ItemHistoryService {
  constructor(
    private readonly repositories: {
      mapItem: MapItemRepository;
      baseItem: BaseItemRepository;
    },
  ) {}

  /**
   * Get version history for a tile at specific coordinates
   *
   * Returns all historical versions of a tile in descending order
   * (newest first). Supports pagination for large histories.
   *
   * @param coords - Tile coordinates
   * @param limit - Maximum number of versions to return (default: 50)
   * @param offset - Number of versions to skip (default: 0)
   * @returns Version history with current state and historical versions
   * @throws Error if MapItem not found at coordinates
   */
  async getItemHistory({
    coords,
    limit = 50,
    offset = 0,
  }: {
    coords: Coord;
    limit?: number;
    offset?: number;
  }): Promise<ItemHistoryContract> {
    // 1. Get MapItem to find BaseItem reference
    const mapItem = await this.repositories.mapItem.getOneByIdr({
      idr: { attrs: { coords } },
    });

    if (!mapItem) {
      throw new Error(
        `MapItem not found at coords ${coords.userId},${coords.groupId}:${coords.path.join(",")}`,
      );
    }

    // 2. Get BaseItem ID
    const baseItemId = mapItem.ref.id;
    if (baseItemId === undefined) {
      throw new Error(
        `BaseItem ID is undefined for MapItem at coords ${coords.userId},${coords.groupId}:${coords.path.join(",")}`,
      );
    }

    // 3. Fetch limit+1 to detect if there are more results
    const versions = await this.repositories.baseItem.getVersionHistory(
      baseItemId,
      { limit: limit + 1, offset },
    );

    // 4. Get total count of versions
    const totalCount = await this.repositories.baseItem.countVersions(baseItemId);

    // 5. Determine if there are more results beyond current page
    const hasMore = versions.length > limit;
    const pageVersions = hasMore ? versions.slice(0, limit) : versions;

    // 6. Convert to contracts and return
    return {
      coords,
      currentVersion: adapt.baseItem(mapItem.ref),
      versions: pageVersions.map(adapt.baseItemVersion),
      totalCount,
      hasMore,
    };
  }

  /**
   * Get a specific historical version of a tile
   *
   * @param coords - Tile coordinates
   * @param versionNumber - Version number to retrieve (1, 2, 3, ...)
   * @returns The requested version snapshot
   * @throws Error if MapItem not found at coordinates
   * @throws Error if version number not found
   */
  async getItemVersion({
    coords,
    versionNumber,
  }: {
    coords: Coord;
    versionNumber: number;
  }): Promise<BaseItemVersionContract> {
    // 1. Get MapItem to find BaseItem reference
    const mapItem = await this.repositories.mapItem.getOneByIdr({
      idr: { attrs: { coords } },
    });

    if (!mapItem) {
      throw new Error(
        `MapItem not found at coords ${coords.userId},${coords.groupId}:${coords.path.join(",")}`,
      );
    }

    // 2. Get BaseItem ID
    const baseItemId = mapItem.ref.id;
    if (baseItemId === undefined) {
      throw new Error(
        `BaseItem ID is undefined for MapItem at coords ${coords.userId},${coords.groupId}:${coords.path.join(",")}`,
      );
    }

    // 3. Get specific version from repository
    const version = await this.repositories.baseItem.getVersionByNumber(
      baseItemId,
      versionNumber,
    );

    // 4. Convert to contract and return
    return adapt.baseItemVersion(version);
  }
}
