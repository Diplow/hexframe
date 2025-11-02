/**
 * Public API for Map Router
 *
 * Consumers: src/server/api/root.ts, src/server/api/routers/agentic/agentic.ts
 */

export { mapRouter } from '~/server/api/routers/map/map';

// Export sub-routers for testing
export { mapUserRouter } from '~/server/api/routers/map/map-user';
export { mapItemsRouter } from '~/server/api/routers/map/map-items';

// Export MCP tools for agentic router
export { createMCPTools } from '~/server/api/routers/map/_mcp-tools';
export type { MCPTool } from '~/server/api/routers/map/_mcp-tools';