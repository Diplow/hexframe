import { describe, it, expect } from 'vitest'
import type {
  SDKQueryOptions,
  SDKQueryParams,
  SDKStreamEvent,
  SDKContentBlockDelta,
  SDKResult,
  SDKMessage,
  MCPServerConfig,
  SDKToolDefinition
} from '~/lib/domains/agentic/types/sdk.types'

describe('SDK Types', () => {
  describe('SDKQueryOptions', () => {
    it('should accept minimal options with model', () => {
      const options: SDKQueryOptions = {
        model: 'claude-sonnet-4-5-20250929'
      }

      expect(options.model).toBe('claude-sonnet-4-5-20250929')
    })

    it('should accept full options with all fields', () => {
      const options: SDKQueryOptions = {
        model: 'claude-sonnet-4-5-20250929',
        systemPrompt: 'You are a helpful assistant',
        maxTurns: 5,
        includePartialMessages: true,
        temperature: 0.7,
        maxTokens: 2000
      }

      expect(options.model).toBe('claude-sonnet-4-5-20250929')
      expect(options.systemPrompt).toBe('You are a helpful assistant')
      expect(options.maxTurns).toBe(5)
      expect(options.includePartialMessages).toBe(true)
      expect(options.temperature).toBe(0.7)
      expect(options.maxTokens).toBe(2000)
    })

    it('should accept mcpServers configuration', () => {
      const mcpServers: Record<string, MCPServerConfig> = {
        github: {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-server-github'],
          env: {
            GITHUB_TOKEN: 'test-token'
          }
        }
      }

      const options: SDKQueryOptions = {
        model: 'claude-sonnet-4-5-20250929',
        mcpServers
      }

      expect(options.mcpServers).toEqual(mcpServers)
    })
  })

  describe('SDKQueryParams', () => {
    it('should accept prompt and options', () => {
      const params: SDKQueryParams = {
        prompt: 'What is the weather today?',
        options: {
          model: 'claude-sonnet-4-5-20250929'
        }
      }

      expect(params.prompt).toBe('What is the weather today?')
      expect(params.options.model).toBe('claude-sonnet-4-5-20250929')
    })

    it('should accept complex prompt with options', () => {
      const params: SDKQueryParams = {
        prompt: 'User: Hello\n\nAssistant: Hi there!\n\nUser: How are you?',
        options: {
          model: 'claude-opus-4-20250514',
          systemPrompt: 'You are friendly',
          maxTurns: 3,
          temperature: 0.8
        }
      }

      expect(params.prompt).toContain('User: Hello')
      expect(params.options.model).toBe('claude-opus-4-20250514')
      expect(params.options.systemPrompt).toBe('You are friendly')
    })
  })

  describe('SDKStreamEvent', () => {
    it('should type content_block_delta event', () => {
      const event: SDKStreamEvent = {
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: {
            text: 'Hello'
          }
        }
      }

      expect(event.type).toBe('stream_event')
      expect(event.event.type).toBe('content_block_delta')
      if (event.event.type === 'content_block_delta') {
        expect(event.event.delta.text).toBe('Hello')
      }
    })

    it('should type message_start event', () => {
      const event: SDKStreamEvent = {
        type: 'stream_event',
        event: {
          type: 'message_start'
        }
      }

      expect(event.type).toBe('stream_event')
      expect(event.event.type).toBe('message_start')
    })

    it('should type message_stop event', () => {
      const event: SDKStreamEvent = {
        type: 'stream_event',
        event: {
          type: 'message_stop'
        }
      }

      expect(event.type).toBe('stream_event')
      expect(event.event.type).toBe('message_stop')
    })
  })

  describe('SDKContentBlockDelta', () => {
    it('should contain text delta', () => {
      const delta: SDKContentBlockDelta = {
        text: 'Sample text'
      }

      expect(delta.text).toBe('Sample text')
    })

    it('should accept empty text', () => {
      const delta: SDKContentBlockDelta = {
        text: ''
      }

      expect(delta.text).toBe('')
    })
  })

  describe('SDKResult', () => {
    it('should type success result', () => {
      const result: SDKResult = {
        type: 'result',
        subtype: 'success',
        result: 'This is the final response'
      }

      expect(result.type).toBe('result')
      expect(result.subtype).toBe('success')
      expect(result.result).toBe('This is the final response')
    })

    it('should type error result', () => {
      const result: SDKResult = {
        type: 'result',
        subtype: 'error',
        error: 'Something went wrong'
      }

      expect(result.type).toBe('result')
      expect(result.subtype).toBe('error')
      expect(result.error).toBe('Something went wrong')
    })
  })

  describe('SDKMessage', () => {
    it('should be a union of stream events and results', () => {
      const streamMessage: SDKMessage = {
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: {
            text: 'Streaming...'
          }
        }
      }

      const resultMessage: SDKMessage = {
        type: 'result',
        subtype: 'success',
        result: 'Complete'
      }

      expect(streamMessage.type).toBe('stream_event')
      expect(resultMessage.type).toBe('result')
    })

    it('should narrow types using discriminated union', () => {
      const message: SDKMessage = {
        type: 'result',
        subtype: 'success',
        result: 'Done'
      }

      if (message.type === 'result' && message.subtype === 'success') {
        expect(message.result).toBe('Done')
      }
    })
  })

  describe('MCPServerConfig', () => {
    it('should define server command and args', () => {
      const config: MCPServerConfig = {
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-filesystem']
      }

      expect(config.command).toBe('npx')
      expect(config.args).toEqual(['-y', '@anthropic/mcp-server-filesystem'])
    })

    it('should accept environment variables', () => {
      const config: MCPServerConfig = {
        command: 'docker',
        args: ['run', 'mcp-server'],
        env: {
          API_KEY: 'secret',
          DEBUG: 'true'
        }
      }

      expect(config.env).toEqual({
        API_KEY: 'secret',
        DEBUG: 'true'
      })
    })

    it('should work without env', () => {
      const config: MCPServerConfig = {
        command: 'node',
        args: ['server.js']
      }

      expect(config.command).toBe('node')
      expect(config.env).toBeUndefined()
    })
  })

  describe('SDKToolDefinition', () => {
    it('should define a tool with name and description', () => {
      const tool: SDKToolDefinition = {
        name: 'search',
        description: 'Search the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query'
            }
          },
          required: ['query']
        }
      }

      expect(tool.name).toBe('search')
      expect(tool.description).toBe('Search the knowledge base')
      expect(tool.inputSchema.type).toBe('object')
    })

    it('should accept minimal tool definition', () => {
      const tool: SDKToolDefinition = {
        name: 'calculate',
        description: 'Perform calculation',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }

      expect(tool.name).toBe('calculate')
      expect(tool.inputSchema.properties).toEqual({})
    })

    it('should accept complex input schema', () => {
      const tool: SDKToolDefinition = {
        name: 'analyze',
        description: 'Analyze data',
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'number'
              }
            },
            method: {
              type: 'string',
              enum: ['mean', 'median', 'mode']
            }
          },
          required: ['data']
        }
      }

      expect(tool.inputSchema.properties.data.type).toBe('array')
      expect(tool.inputSchema.properties.method.enum).toEqual(['mean', 'median', 'mode'])
    })
  })

  describe('Type compatibility', () => {
    it('should work with async generator type', () => {
      // This tests that SDKMessage can be used as async generator yield type
      async function* mockGenerator(): AsyncGenerator<SDKMessage> {
        yield {
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: { text: 'Hello' }
          }
        }
        yield {
          type: 'result',
          subtype: 'success',
          result: 'Hello'
        }
      }

      const generator = mockGenerator()
      expect(generator).toBeDefined()
    })

    it('should handle null/undefined in event stream', () => {
      // SDK may yield null/undefined between events
      const messages: (SDKMessage | null | undefined)[] = [
        { type: 'stream_event', event: { type: 'message_start' } },
        null,
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Hi' } } },
        undefined,
        { type: 'result', subtype: 'success', result: 'Hi' }
      ]

      const validMessages = messages.filter((m): m is SDKMessage => m !== null && m !== undefined)
      expect(validMessages).toHaveLength(3)
    })
  })

  describe('Type guards', () => {
    it('should distinguish between stream events and results', () => {
      const messages: SDKMessage[] = [
        { type: 'stream_event', event: { type: 'message_start' } },
        { type: 'result', subtype: 'success', result: 'Done' }
      ]

      const streamEvents = messages.filter(m => m.type === 'stream_event')
      const results = messages.filter(m => m.type === 'result')

      expect(streamEvents).toHaveLength(1)
      expect(results).toHaveLength(1)
    })

    it('should distinguish between content deltas and other events', () => {
      const events: SDKStreamEvent[] = [
        { type: 'stream_event', event: { type: 'message_start' } },
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Hi' } } },
        { type: 'stream_event', event: { type: 'message_stop' } }
      ]

      const contentDeltas = events.filter(
        e => e.event.type === 'content_block_delta'
      )

      expect(contentDeltas).toHaveLength(1)
      if (contentDeltas[0]?.event.type === 'content_block_delta') {
        expect(contentDeltas[0].event.delta.text).toBe('Hi')
      }
    })

    it('should distinguish between success and error results', () => {
      const results: SDKResult[] = [
        { type: 'result', subtype: 'success', result: 'Success' },
        { type: 'result', subtype: 'error', error: 'Error' }
      ]

      const successes = results.filter(r => r.subtype === 'success')
      const errors = results.filter(r => r.subtype === 'error')

      expect(successes).toHaveLength(1)
      expect(errors).toHaveLength(1)
    })
  })
})
