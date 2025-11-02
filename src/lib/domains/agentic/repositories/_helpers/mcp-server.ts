import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { LLMTool } from '~/lib/domains/agentic/types/llm.types'

/**
 * Create MCP server with Hexframe tile tools for Claude Agent SDK
 *
 * This allows Claude to perform tile operations (create, update, delete, query)
 * within the hexagonal map system.
 */
export function createHexframeMcpServer(mcpTools: LLMTool[]) {
  console.log('[MCP Server] Creating Hexframe MCP server with tools:', mcpTools.map(t => t.name))

  // Convert your MCP tools to SDK tool format
  const sdkTools = mcpTools.map(mcpTool => {
    // Build Zod schema from JSON schema properties
    const zodSchema: Record<string, z.ZodTypeAny> = {}
    const required = mcpTool.inputSchema.required ?? []

    for (const [key, value] of Object.entries(mcpTool.inputSchema.properties)) {
      const prop = value as { type?: string; description?: string }
      const isRequired = required.includes(key)

      // Map JSON schema types to Zod types
      if (prop.type === 'string') {
        zodSchema[key] = isRequired ? z.string() : z.string().optional()
      } else if (prop.type === 'number') {
        zodSchema[key] = isRequired ? z.number() : z.number().optional()
      } else if (prop.type === 'object') {
        zodSchema[key] = isRequired ? z.record(z.unknown()) : z.record(z.unknown()).optional()
      } else {
        zodSchema[key] = z.unknown().optional()
      }
    }

    return tool(
      mcpTool.name,
      mcpTool.description,
      zodSchema,
      async (args: unknown): Promise<CallToolResult> => {
        try {
          const result = await mcpTool.execute(args as Record<string, unknown>)
          return {
            content: [{
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }]
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    )
  })

  return createSdkMcpServer({
    name: 'hexframe-tools',
    tools: sdkTools
  })
}
