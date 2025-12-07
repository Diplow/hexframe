/**
 * Public API for Map Router
 *
 * Consumers: src/server/api/root.ts, src/server/api/routers/agentic/agentic.ts
 */

export { mapRouter } from '~/server/api/routers/map/map';

// Export sub-routers for testing
export { mapUserRouter } from '~/server/api/routers/map/map-user';
export { mapItemsRouter } from '~/server/api/routers/map/map-items';

// Export auth helpers for cross-router use
export { _getRequesterUserId } from '~/server/api/routers/map/_map-auth-helpers';