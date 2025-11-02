/**
 * MCP Tools for Query Operations
 *
 * Tools for querying map items and user information.
 */

import type { MappingService } from '~/lib/domains/mapping'
import type { IAMService } from '~/lib/domains/iam'
import type { LLMTool } from '~/lib/domains/agentic'

interface ToolContext {
  mappingService: MappingService
  iamService: IAMService
  user?: { id: string } | null
}

export function _createGetItemsForRootItemTool(ctx: ToolContext): LLMTool {
  return {
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
  }
}

export function _createGetCurrentUserTool(ctx: ToolContext): LLMTool {
  return {
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
  }
}
