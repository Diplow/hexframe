/**
 * MCP Service - Model Context Protocol implementation for Hexframe
 *
 * Provides structured access to Hexframe's hexagonal mapping system
 * for AI assistants via both stdio and HTTP transports.
 */

// Core MCP tools and execution logic
export { mcpTools, executeTool, formatToolResponse } from './handlers/tools';

// Map operations handlers
export {
  getUserMapItemsHandler,
  getItemByCoordsHandler,
  addItemHandler,
  updateItemHandler,
  deleteItemHandler,
  moveItemHandler,
  getCurrentUserHandler,
  mapItemsListHandler,
  mapItemHandler,
} from './services/map-items';

// Re-export types for external use
export type { McpTool } from './handlers/tools';