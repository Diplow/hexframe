/**
 * MCP Tools for Claude Agent SDK
 *
 * This module provides MCP (Model Context Protocol) tools that wrap mapping service operations
 * for use with the Claude Agent SDK. These tools allow the AI to interact with the hexagonal
 * map structure through a standardized interface.
 *
 * NOTE: This is a stub implementation. Full implementation will be completed in Task 8.
 */

import type { Context } from '~/server/api/trpc'

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, unknown>
    required?: string[]
  }
  execute: (input: Record<string, unknown>) => Promise<unknown>
  [key: string]: unknown // Allow additional properties for SDK compatibility
}

/**
 * Creates MCP tools from tRPC context
 *
 * This function wraps mapping service operations as MCP tools that can be used
 * by the Claude Agent SDK to manipulate tiles in the hexagonal map.
 *
 * @param ctx - tRPC context containing session and services
 * @returns Array of MCP tools
 *
 * NOTE: This is a stub implementation that returns an empty array.
 * Full implementation with actual tools (getItemByCoords, addItem, updateItem, etc.)
 * will be added in Task 8.
 */
export function createMCPTools(ctx: Context): MCPTool[] {
  // Stub implementation - will be completed in Task 8
  // TODO: Implement actual tools:
  // - getItemByCoords: Get a tile by coordinates
  // - addItem: Add a new tile
  // - updateItem: Update an existing tile
  // - deleteItem: Delete a tile
  // - getItemsForRootItem: Get all items in a hierarchy
  // - getCurrentUser: Get current user info

  // For now, return empty array to allow the router to work
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ensureCtxUsed = ctx
  return []
}
