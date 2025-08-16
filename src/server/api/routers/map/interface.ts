/**
 * Public API for Map Router
 * 
 * Consumers: src/server/api/root.ts
 */

export { mapRouter } from './map';

// Export sub-routers for testing
export { mapUserRouter } from './map-user';
export { mapItemsRouter } from './map-items';