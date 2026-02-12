/**
 * Public API for Mapping Domain
 *
 * Consumers: Server-side code (tRPC API, Agentic domain, actions)
 *
 * WARNING: This file imports server-side code and MUST NOT be imported by client components.
 * For client-side imports, use './utils' instead.
 */

import { withLogging } from '~/lib/debug/with-logging';

// Re-export all client-safe exports
export * from '~/lib/domains/mapping/types';

// Domain objects
export * from '~/lib/domains/mapping/_objects';

// Domain services (server-only)
import {
  MappingService as _MappingService,
  MapManagementService as _MapManagementService,
  ItemManagementService as _ItemManagementService,
  ItemCrudService as _ItemCrudService,
  ItemQueryService as _ItemQueryService,
  ItemHistoryService as _ItemHistoryService,
  ItemContextService as _ItemContextService,
  MappingUtils,
  LeafTraversalService as _LeafTraversalService,
} from '~/lib/domains/mapping/services';
export type { HexecuteContext, NextLeafResult, LeafTraversalServiceDeps } from '~/lib/domains/mapping/services';

export const MappingService = withLogging("MappingService", _MappingService);
export type MappingService = InstanceType<typeof MappingService>;
export const MapManagementService = withLogging("MapManagementService", _MapManagementService);
export type MapManagementService = InstanceType<typeof MapManagementService>;
export const ItemManagementService = withLogging("ItemManagementService", _ItemManagementService);
export type ItemManagementService = InstanceType<typeof ItemManagementService>;
export const ItemCrudService = withLogging("ItemCrudService", _ItemCrudService);
export type ItemCrudService = InstanceType<typeof ItemCrudService>;
export const ItemQueryService = withLogging("ItemQueryService", _ItemQueryService);
export type ItemQueryService = InstanceType<typeof ItemQueryService>;
export const ItemHistoryService = withLogging("ItemHistoryService", _ItemHistoryService);
export type ItemHistoryService = InstanceType<typeof ItemHistoryService>;
export const ItemContextService = withLogging("ItemContextService", _ItemContextService);
export type ItemContextService = InstanceType<typeof ItemContextService>;
export { MappingUtils };
export const LeafTraversalService = withLogging("LeafTraversalService", _LeafTraversalService);
export type LeafTraversalService = InstanceType<typeof LeafTraversalService>;

// Infrastructure (server-only - contains database connections)
export {
  DbMapItemRepository,
  DbBaseItemRepository,
} from '~/lib/domains/mapping/infrastructure';
