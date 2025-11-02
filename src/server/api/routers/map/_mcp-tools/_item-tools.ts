/**
 * MCP Tools for Item Operations
 *
 * Tools for CRUD operations on map items (tiles).
 */

import type { MappingService } from '~/lib/domains/mapping'
import type { IAMService } from '~/lib/domains/iam'
import type { LLMTool } from '~/lib/domains/agentic'

interface ToolContext {
  mappingService: MappingService
  iamService: IAMService
  user?: { id: string } | null
}

export function _createGetItemByCoordsTool(ctx: ToolContext): LLMTool {
  return {
    name: 'getItemByCoords',
    description: 'Get a tile by its coordinates in the hexagonal map',
    inputSchema: {
      type: 'object',
      properties: {
        coords: {
          type: 'object',
          description: 'Coordinates object with structure: {userId: number, groupId: number, path: number[]}',
          properties: {
            userId: { type: 'number' },
            groupId: { type: 'number' },
            path: { type: 'array', items: { type: 'number' } }
          },
          required: ['userId', 'groupId', 'path']
        },
      },
      required: ['coords'],
    },
    execute: async (input: Record<string, unknown>) => {
      const coords = input.coords as { userId: number; groupId: number; path: number[] }
      return ctx.mappingService.items.crud.getItem({ coords })
    },
  }
}

export function _createAddItemTool(ctx: ToolContext): LLMTool {
  return {
    name: 'addItem',
    description: 'Add a new tile to the hexagonal map. Coordinates must include userId, groupId (usually 0), and path (array of direction numbers from 0-6).',
    inputSchema: {
      type: 'object',
      properties: {
        coords: {
          type: 'object',
          description: 'Coordinates object with structure: {userId: number, groupId: number, path: number[]}. Example: {userId: 1, groupId: 0, path: [2]} for direction NorthEast from root.',
          properties: {
            userId: { type: 'number', description: 'User ID who owns the map' },
            groupId: { type: 'number', description: 'Group ID, typically 0 for personal maps' },
            path: { type: 'array', items: { type: 'number' }, description: 'Array of direction numbers (0=Center, 1=NorthWest, 2=NorthEast, 3=East, 4=SouthEast, 5=SouthWest, 6=West)' }
          },
          required: ['userId', 'groupId', 'path']
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
  }
}

export function _createUpdateItemTool(ctx: ToolContext): LLMTool {
  return {
    name: 'updateItem',
    description: 'Update an existing tile in the hexagonal map',
    inputSchema: {
      type: 'object',
      properties: {
        coords: {
          type: 'object',
          description: 'Coordinates object with structure: {userId: number, groupId: number, path: number[]}',
          properties: {
            userId: { type: 'number' },
            groupId: { type: 'number' },
            path: { type: 'array', items: { type: 'number' } }
          },
          required: ['userId', 'groupId', 'path']
        },
        updates: {
          type: 'object',
          description: 'Fields to update (title, content, preview, url)',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            preview: { type: 'string' },
            url: { type: 'string' }
          }
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
  }
}

export function _createDeleteItemTool(ctx: ToolContext): LLMTool {
  return {
    name: 'deleteItem',
    description: 'Delete a tile and its descendants from the hexagonal map',
    inputSchema: {
      type: 'object',
      properties: {
        coords: {
          type: 'object',
          description: 'Coordinates object with structure: {userId: number, groupId: number, path: number[]}',
          properties: {
            userId: { type: 'number' },
            groupId: { type: 'number' },
            path: { type: 'array', items: { type: 'number' } }
          },
          required: ['userId', 'groupId', 'path']
        },
      },
      required: ['coords'],
    },
    execute: async (input: Record<string, unknown>) => {
      const coords = input.coords as { userId: number; groupId: number; path: number[] }
      return ctx.mappingService.items.crud.removeItem({ coords })
    },
  }
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
