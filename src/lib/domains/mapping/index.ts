/**
 * Public API for Mapping Domain
 * 
 * Consumers: Server-side code (tRPC API, Agentic domain, actions)
 * 
 * WARNING: This file imports server-side code and MUST NOT be imported by client components.
 * For client-side imports, use './interface.client.ts' instead.
 */

// Re-export all client-safe exports
export * from '~/lib/domains/mapping/utils';

// Domain services (server-only)
export { 
  MappingService,
  MapManagementService,
  ItemManagementService,
  ItemCrudService,
  ItemQueryService,
  MappingUtils,
} from './services';

// Infrastructure (server-only - contains database connections)
export {
  DbMapItemRepository,
  DbBaseItemRepository,
  TransactionManager,
} from './infrastructure';