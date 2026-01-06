/**
 * Public API for Mapping Infrastructure
 * 
 * Consumers: Mapping services, Mapping actions, Test suites
 */

// Repository implementations
export { DbMapItemRepository } from '~/lib/domains/mapping/infrastructure/map-item/db';
export { DbBaseItemRepository } from '~/lib/domains/mapping/infrastructure/base-item/db';

// Transaction management
export { TransactionManager } from '~/lib/domains/mapping/infrastructure/transaction-manager';

// Utility functions (for testing/debugging)
export { parsePathString } from '~/lib/domains/mapping/infrastructure/map-item/db';

// Item type utilities
export { isBuiltInItemType, isReservedItemType, isCustomItemType } from '~/lib/domains/mapping/infrastructure/map-item/item-type-utils';