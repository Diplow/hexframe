/**
 * HTTP MCP Server Endpoint
 *
 * This exposes the MCP server over HTTP with SSE transport for use with Claude Agent SDK.
 * Authentication is handled via x-api-key header.
 */

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { mcpTools, executeTool } from '~/app/services/mcp'
import { runWithRequestContext } from '~/lib/utils/request-context'

export const mcpHttpRouter = createTRPCRouter({
  /**
   * List available MCP tools
   */
  listTools: publicProcedure
    .input(z.object({
      apiKey: z.string()
    }))
    .query(async ({ input }) => {
      // Validate API key (you'll need to implement this)
      if (!input.apiKey || input.apiKey !== process.env.MCP_API_KEY) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid API key'
        })
      }

      return {
        tools: mcpTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      }
    }),

  /**
   * Execute an MCP tool
   */
  executeTool: publicProcedure
    .input(z.object({
      apiKey: z.string(),
      name: z.string(),
      arguments: z.record(z.unknown())
    }))
    .mutation(async ({ input }) => {
      // Validate API key
      if (!input.apiKey || input.apiKey !== process.env.MCP_API_KEY) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid API key'
        })
      }

      // Execute tool within request context so it has access to the API key
      return await runWithRequestContext(
        { apiKey: input.apiKey },
        async () => {
          return await executeTool(input.name, input.arguments)
        }
      )
    })
})
