import type { StorageService, ServiceConfig } from "~/app/map/Cache/Services";
import type { StorageOperations } from "~/app/map/Cache/Services/storage/storage-operations";
import { _createGenericOperations } from "~/app/map/Cache/Services/storage/_internals/_storage-generic-operations";
import { _createCacheOperations } from "~/app/map/Cache/Services/storage/_internals/_storage-cache-operations";
import { _createPreferenceOperations } from "~/app/map/Cache/Services/storage/_internals/_storage-preference-operations";
import { _createExpandedItemsOperations } from "~/app/map/Cache/Services/storage/_internals/_storage-expanded-items-operations";

/**
 * Core storage service implementation
 * Creates a service with save/load/remove operations using provided storage operations
 */
export function createStorageService(
  storageOperations: StorageOperations,
  _config: ServiceConfig = {},
): StorageService {
  // Create base generic operations
  const genericOps = _createGenericOperations(storageOperations);

  // Create domain-specific operations built on top of generic ops
  const cacheOps = _createCacheOperations(genericOps.save, genericOps.load);
  const preferenceOps = _createPreferenceOperations(genericOps.save, genericOps.load);
  const expandedItemsOps = _createExpandedItemsOperations(genericOps.save, genericOps.load);

  return {
    ...genericOps,
    ...cacheOps,
    ...preferenceOps,
    ...expandedItemsOps,
  };
}