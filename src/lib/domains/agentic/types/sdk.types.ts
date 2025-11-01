/**
 * Type definitions for Claude Agent SDK
 *
 * These types provide type safety for interactions with the @anthropic-ai/claude-agent-sdk package.
 * They mirror the SDK's internal types while providing better documentation and IDE support.
 */

/**
 * Configuration for an MCP (Model Context Protocol) server
 */
export type MCPServerConfig = {
  /** Command to run the MCP server (e.g., 'npx', 'docker', 'node') */
  command: string
  /** Arguments to pass to the command */
  args: string[]
  /** Environment variables for the server process */
  env?: Record<string, string>
}

/**
 * JSON schema for tool input parameters
 */
export type JSONSchema = {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array'
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  items?: JSONSchemaProperty
  enum?: unknown[]
  description?: string
}

/**
 * Property definition in a JSON schema
 */
export type JSONSchemaProperty = {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array'
  description?: string
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  enum?: unknown[]
  required?: string[]
}

/**
 * Definition of a tool that can be used by the agent
 */
export type SDKToolDefinition = {
  /** Unique name of the tool */
  name: string
  /** Description of what the tool does */
  description: string
  /** JSON schema defining the expected input parameters */
  inputSchema: JSONSchema
}

/**
 * Options for configuring an SDK query
 */
export type SDKQueryOptions = {
  /** Model to use (e.g., 'claude-sonnet-4-5-20250929') */
  model: string
  /** System prompt to set context for the agent */
  systemPrompt?: string
  /** Maximum number of conversation turns (default: 1) */
  maxTurns?: number
  /** Whether to include partial messages during streaming */
  includePartialMessages?: boolean
  /** Temperature for response generation (0-1) */
  temperature?: number
  /** Maximum tokens to generate */
  maxTokens?: number
  /** MCP servers to make available to the agent */
  mcpServers?: Record<string, MCPServerConfig>
}

/**
 * Parameters for an SDK query
 */
export type SDKQueryParams = {
  /** The user's prompt/query */
  prompt: string
  /** Configuration options for the query */
  options: SDKQueryOptions
}

/**
 * Delta containing incremental text content
 */
export type SDKContentBlockDelta = {
  /** The text content of this delta */
  text: string
}

/**
 * Known event types for better type safety
 */
export type SDKEventType =
  | { type: 'message_start' }
  | { type: 'message_stop' }
  | { type: 'content_block_delta'; delta: SDKContentBlockDelta }

/**
 * Event emitted during message streaming
 */
export type SDKStreamEvent = {
  type: 'stream_event'
  event: SDKEventType
}

/**
 * Result message indicating query completion
 */
export type SDKResult =
  | {
      type: 'result'
      subtype: 'success'
      /** The complete response text */
      result: string
    }
  | {
      type: 'result'
      subtype: 'error'
      /** Error message */
      error: string
    }

/**
 * Union type of all possible SDK messages
 * Used as the yield type for the SDK's async generator
 */
export type SDKMessage = SDKStreamEvent | SDKResult

/**
 * Alias for SDKResult to maintain compatibility with existing code
 * @deprecated Use SDKResult instead
 */
export type SDKResultMessage = SDKResult
