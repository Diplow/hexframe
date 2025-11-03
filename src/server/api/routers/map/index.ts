/**
 * Public API for Map Router
 *
 * Consumers: src/server/api/root.ts
 */

export { mapRouter } from '~/server/api/routers/map/map';

// Export sub-routers for testing
export { mapUserRouter } from '~/server/api/routers/map/map-user';
export { mapItemsRouter } from '~/server/api/routers/map/map-items';