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

/**
 * Extended context with services required for MCP tools
 */
interface MCPContext extends Context {
  mappingService: MappingService
  iamService: IAMService
}

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
 */
export function createMCPTools(ctx: MCPContext): MCPTool[] {
  // Validate required services
  if (!ctx.mappingService) {
    throw new Error('mappingService is required in context')
  }
  if (!ctx.iamService) {
    throw new Error('iamService is required in context')
  }

  const tools: MCPTool[] = [
    {
      name: 'getItemByCoords',
      description: 'Get a tile by its coordinates in the hexagonal map',
      inputSchema: {
        type: 'object',
        properties: {
          coords: {
            type: 'object',
            description: 'Coordinates of the tile to retrieve',
          },
        },
        required: ['coords'],
      },
      execute: async (input: Record<string, unknown>) => {
        const coords = input.coords as { userId: number; groupId: number; path: number[] }
        return ctx.mappingService.items.crud.getItem({ coords })
      },
    },

    {
      name: 'addItem',
      description: 'Add a new tile to the hexagonal map',
      inputSchema: {
        type: 'object',
        properties: {
          coords: {
            type: 'object',
            description: 'Coordinates where the tile should be created',
          },
          title: {
            type: 'string',
            description: 'Title of the new tile',
          },
          content: {
            type: 'string',
            description: 'Content/description of the tile (optional)',
          },
          preview: {
            type: 'string',
            description: 'Short preview text for quick scanning (optional)',
          },
          url: {
            type: 'string',
            description: 'URL associated with the tile (optional)',
          },
        },
        required: ['coords', 'title'],
      },
      execute: async (input: Record<string, unknown>) => {
        const coords = input.coords as { userId: number; groupId: number; path: number[] }
        const title = input.title as string
        const content = input.content as string | undefined
        const preview = input.preview as string | undefined
        const url = input.url as string | undefined

        // Get parent item to determine parentId
        const parentCoords = _getParentCoords(coords)
        let parentId: number | null = null

        if (parentCoords) {
          const parentItem = await ctx.mappingService.items.crud.getItem({
            coords: parentCoords,
          })
          parentId = Number(parentItem.id)
        }

        return ctx.mappingService.items.crud.addItemToMap({
          parentId,
          coords,
          title,
          content,
          preview,
          link: url,
        })
      },
    },

    {
      name: 'updateItem',
      description: 'Update an existing tile in the hexagonal map',
      inputSchema: {
        type: 'object',
        properties: {
          coords: {
            type: 'object',
            description: 'Coordinates of the tile to update',
          },
          updates: {
            type: 'object',
            description: 'Fields to update',
          },
        },
        required: ['coords', 'updates'],
      },
      execute: async (input: Record<string, unknown>) => {
        const coords = input.coords as { userId: number; groupId: number; path: number[] }
        const updates = input.updates as {
          title?: string
          content?: string
          preview?: string
          url?: string
        }

        return ctx.mappingService.items.crud.updateItem({
          coords,
          title: updates.title,
          content: updates.content,
          preview: updates.preview,
          link: updates.url,
        })
      },
    },

    {
      name: 'deleteItem',
      description: 'Delete a tile and its descendants from the hexagonal map',
      inputSchema: {
        type: 'object',
        properties: {
          coords: {
            type: 'object',
            description: 'Coordinates of the tile to delete',
          },
        },
        required: ['coords'],
      },
      execute: async (input: Record<string, unknown>) => {
        const coords = input.coords as { userId: number; groupId: number; path: number[] }
        return ctx.mappingService.items.crud.removeItem({ coords })
      },
    },

    {
      name: 'getItemsForRootItem',
      description: 'Get all items in a hierarchical map structure',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: 'User ID to fetch map items for',
          },
          groupId: {
            type: 'number',
            description: 'Group ID (default: 0)',
          },
          depth: {
            type: 'number',
            description: 'How many levels deep to fetch (optional)',
          },
        },
        required: ['userId'],
      },
      execute: async (input: Record<string, unknown>) => {
        const userId = input.userId as number
        const groupId = (input.groupId as number | undefined) ?? 0

        return ctx.mappingService.items.query.getItems({
          userId,
          groupId,
        })
      },
    },

    {
      name: 'getCurrentUser',
      description: 'Get information about the currently authenticated user',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        if (!ctx.user) {
          throw new Error('User not authenticated')
        }

        const user = await ctx.iamService.getCurrentUser(ctx.user.id)
        if (!user) {
          throw new Error('User not found')
        }

        return ctx.iamService.userToContract(user)
      },
    },
  ]

  return tools
}

/**
 * Get the parent coordinates from child coordinates
 * Returns null if coords represent the root (empty path)
 */
function _getParentCoords(coords: {
  userId: number
  groupId: number
  path: number[]
}): { userId: number; groupId: number; path: number[] } | null {
  if (coords.path.length === 0) {
    return null
  }

  return {
    userId: coords.userId,
    groupId: coords.groupId,
    path: coords.path.slice(0, -1),
  }
}
