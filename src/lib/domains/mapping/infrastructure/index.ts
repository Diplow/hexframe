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

// Note: Item type utilities (isBuiltInItemType, etc.) are now in ~/lib/domains/mapping/utils
// to avoid circular dependencies. Import from there for cross-domain access.