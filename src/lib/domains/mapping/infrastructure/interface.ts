/**
 * Public API for Mapping Infrastructure
 * 
 * Consumers: Mapping services, Mapping actions, Test suites
 */

// Repository implementations
export { DbMapItemRepository } from './map-item/db';
export { DbBaseItemRepository } from './base-item/db';

// Transaction management
export { TransactionManager } from './transaction-manager';

// Utility functions (for testing/debugging)
export { parsePathString } from './map-item/db';