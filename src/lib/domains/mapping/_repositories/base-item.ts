import {
  type BaseItemWithId,
  type BaseItemAttrs,
  type BaseItemIdr,
  type BaseItemRelatedItems,
  type BaseItemRelatedLists,
  type BaseItemVersion,
} from "~/lib/domains/mapping/_objects";
import { type GenericRepository } from "~/lib/domains/utils/generic-repository";

/**
 * Repository interface for BaseItem entities with version history support
 *
 * Extends GenericRepository with version query methods:
 * - getVersionHistory: Query all versions for a BaseItem
 * - getVersionByNumber: Retrieve a specific version
 * - getLatestVersion: Get the most recent version
 *
 * Version methods are consumed by ItemHistoryService (NOT ItemCrudService).
 * See task context for integration details.
 */
export interface BaseItemRepository extends GenericRepository<
  BaseItemAttrs,
  BaseItemRelatedItems,
  BaseItemRelatedLists,
  BaseItemWithId,
  BaseItemIdr
> {
  /**
   * Retrieve version history for a BaseItem
   *
   * Returns all versions in descending order by versionNumber (newest first).
   * Supports pagination for large version histories.
   *
   * @param baseItemId - ID of the BaseItem
   * @param options - Optional pagination parameters
   * @returns Array of BaseItemVersion records
   * @throws Error if BaseItem not found
   */
  getVersionHistory(
    baseItemId: number,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<BaseItemVersion[]>;

  /**
   * Retrieve a specific version by version number
   *
   * @param baseItemId - ID of the BaseItem
   * @param versionNumber - The version number to retrieve
   * @returns The requested version
   * @throws Error if BaseItem not found
   * @throws Error if version number not found
   */
  getVersionByNumber(
    baseItemId: number,
    versionNumber: number
  ): Promise<BaseItemVersion>;

  /**
   * Retrieve the latest version for a BaseItem
   *
   * @param baseItemId - ID of the BaseItem
   * @returns The most recent version
   * @throws Error if BaseItem not found
   * @throws Error if no versions exist
   */
  getLatestVersion(baseItemId: number): Promise<BaseItemVersion>;

  /**
   * Count total versions for a BaseItem
   *
   * @param baseItemId - ID of the BaseItem
   * @returns Total count of versions
   * @throws Error if BaseItem not found
   */
  countVersions(baseItemId: number): Promise<number>;

  /**
   * Create multiple BaseItems in a single bulk operation
   *
   * Efficiently creates multiple BaseItem records. Each item is created
   * with its initial version snapshot.
   *
   * @param attrsArray - Array of BaseItem attributes to create
   * @returns Array of created BaseItems with IDs
   * @throws Error if creation fails
   */
  createMany(attrsArray: BaseItemAttrs[]): Promise<BaseItemWithId[]>;
}
