/**
 * MCP Tools for Claude Agent SDK
 *
 * This module provides MCP (Model Context Protocol) tools that wrap mapping service operations
 * for use with the Claude Agent SDK. These tools allow the AI to interact with the hexagonal
 * map structure through a standardized interface.
 */

import type { Context } from '~/server/api/trpc'
import type { MappingService } from '~/lib/domains/mapping'
import type { IAMService } from '~/lib/domains/iam'
import type { LLMTool } from '~/lib/domains/agentic'
import {
  _createGetItemByCoordsTool,
  _createAddItemTool,
  _createUpdateItemTool,
  _createDeleteItemTool,
} from '~/server/api/routers/map/_mcp-tools/_item-tools'
import {
  _createGetItemsForRootItemTool,
  _createGetCurrentUserTool,
} from '~/server/api/routers/map/_mcp-tools/_query-tools'

/**
 * Extended context with services required for MCP tools
 */
interface MCPContext extends Context {
  mappingService: MappingService
  iamService: IAMService
}

/**
 * Creates MCP tools from tRPC context
 *
 * This function wraps mapping service operations as MCP tools that can be used
 * by the Claude Agent SDK to manipulate tiles in the hexagonal map.
 *
 * @param ctx - tRPC context containing session and services
 * @returns Array of MCP tools
 */
export function createMCPTools(ctx: MCPContext): LLMTool[] {
  _validateContext(ctx)

  return [
    _createGetItemByCoordsTool(ctx),
    _createAddItemTool(ctx),
    _createUpdateItemTool(ctx),
    _createDeleteItemTool(ctx),
    _createGetItemsForRootItemTool(ctx),
    _createGetCurrentUserTool(ctx),
  ]
}

/**
 * Validate that required services are present in context
 */
function _validateContext(ctx: MCPContext): void {
  if (!ctx.mappingService) {
    throw new Error('mappingService is required in context')
  }
  if (!ctx.iamService) {
    throw new Error('iamService is required in context')
  }
}
