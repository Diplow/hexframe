import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMCPTools, type MCPTool } from '~/server/api/routers/map/mcp-tools'
import type { Context } from '~/server/api/trpc'
import type { MappingService } from '~/lib/domains/mapping'
import type { IAMService } from '~/lib/domains/iam'
import { Direction } from '~/lib/domains/mapping/utils'

/**
 * Tests for MCP Tools creation
 *
 * This test suite verifies that createMCPTools:
 * 1. Creates tools with proper structure (name, description, inputSchema, execute)
 * 2. Wraps ctx.mappingService operations correctly
 * 3. Wraps ctx.iamService operations for getCurrentUser
 * 4. Handles errors appropriately
 * 5. Validates inputs according to schemas
 */

describe('createMCPTools', () => {
  let mockCtx: Context
  let mockMappingService: MappingService
  let mockIAMService: IAMService

  beforeEach(() => {
    // Mock mapping service
    mockMappingService = {
      items: {
        crud: {
          getItem: vi.fn(),
          addItemToMap: vi.fn(),
          updateItem: vi.fn(),
          deleteItem: vi.fn(),
        },
        query: {
          getItemsForRootItem: vi.fn(),
        },
      },
    } as unknown as MappingService

    // Mock IAM service
    mockIAMService = {
      getCurrentUser: vi.fn(),
      userToContract: vi.fn(),
    } as unknown as IAMService

    // Mock context
    mockCtx = {
      mappingService: mockMappingService,
      iamService: mockIAMService,
      user: { id: 'test-user-123' },
      session: { id: 'test-session', userId: 'test-user-123' },
    } as unknown as Context
  })

  describe('tool structure', () => {
    it('should return an array of tools', () => {
      const tools = createMCPTools(mockCtx)

      expect(tools).toBeDefined()
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBeGreaterThan(0)
    })

    it('should create tools with required properties', () => {
      const tools = createMCPTools(mockCtx)

      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(tool).toHaveProperty('execute')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.execute).toBe('function')
        expect(tool.inputSchema).toHaveProperty('type')
        expect(tool.inputSchema).toHaveProperty('properties')
      })
    })

    it('should include all required mapping tools', () => {
      const tools = createMCPTools(mockCtx)
      const toolNames = tools.map((t) => t.name)

      expect(toolNames).toContain('getItemByCoords')
      expect(toolNames).toContain('addItem')
      expect(toolNames).toContain('updateItem')
      expect(toolNames).toContain('deleteItem')
      expect(toolNames).toContain('getItemsForRootItem')
      expect(toolNames).toContain('getCurrentUser')
    })
  })

  describe('getItemByCoords tool', () => {
    it('should call mappingService.items.crud.getItem with coords', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getItemByCoords')!

      const mockItem = {
        id: '1',
        title: 'Test Item',
        coords: '1,0:1',
        depth: 1,
      }
      vi.mocked(mockMappingService.items.crud.getItem).mockResolvedValue(mockItem)

      const coords = {
        userId: 1,
        groupId: 0,
        path: [Direction.NorthWest],
      }

      const result = await tool.execute({ coords })

      expect(mockMappingService.items.crud.getItem).toHaveBeenCalledWith({ coords })
      expect(result).toEqual(mockItem)
    })

    it('should have proper input schema', () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getItemByCoords')!

      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toHaveProperty('coords')
      expect(tool.inputSchema.required).toContain('coords')
    })

    it('should handle errors from mapping service', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getItemByCoords')!

      vi.mocked(mockMappingService.items.crud.getItem).mockRejectedValue(
        new Error('Item not found')
      )

      const coords = {
        userId: 1,
        groupId: 0,
        path: [Direction.East],
      }

      await expect(tool.execute({ coords })).rejects.toThrow('Item not found')
    })
  })

  describe('addItem tool', () => {
    it('should call mappingService.items.crud.addItemToMap with correct params', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'addItem')!

      const mockItem = {
        id: '2',
        title: 'New Item',
        coords: '1,0:2',
        depth: 1,
      }
      vi.mocked(mockMappingService.items.crud.addItemToMap).mockResolvedValue(mockItem)

      const input = {
        coords: {
          userId: 1,
          groupId: 0,
          path: [Direction.NorthEast],
        },
        title: 'New Item',
        content: 'Test content',
        preview: 'Test preview',
        url: 'https://test.com',
      }

      const result = await tool.execute(input)

      expect(mockMappingService.items.crud.addItemToMap).toHaveBeenCalledWith(
        expect.objectContaining({
          coords: input.coords,
          title: input.title,
          content: input.content,
          preview: input.preview,
          link: input.url,
        })
      )
      expect(result).toEqual(mockItem)
    })

    it('should have proper input schema with required fields', () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'addItem')!

      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toHaveProperty('coords')
      expect(tool.inputSchema.properties).toHaveProperty('title')
      expect(tool.inputSchema.required).toContain('coords')
      expect(tool.inputSchema.required).toContain('title')
    })

    it('should handle optional fields', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'addItem')!

      const mockItem = {
        id: '3',
        title: 'Minimal Item',
        coords: '1,0:3',
        depth: 1,
      }
      vi.mocked(mockMappingService.items.crud.addItemToMap).mockResolvedValue(mockItem)

      const input = {
        coords: {
          userId: 1,
          groupId: 0,
          path: [Direction.East],
        },
        title: 'Minimal Item',
      }

      const result = await tool.execute(input)

      expect(result).toEqual(mockItem)
    })
  })

  describe('updateItem tool', () => {
    it('should call mappingService.items.crud.updateItem with updates', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'updateItem')!

      const mockItem = {
        id: '1',
        title: 'Updated Title',
        coords: '1,0:1',
        depth: 1,
      }
      vi.mocked(mockMappingService.items.crud.updateItem).mockResolvedValue(mockItem)

      const input = {
        coords: {
          userId: 1,
          groupId: 0,
          path: [Direction.NorthWest],
        },
        updates: {
          title: 'Updated Title',
          content: 'Updated content',
        },
      }

      const result = await tool.execute(input)

      expect(mockMappingService.items.crud.updateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          coords: input.coords,
          ...input.updates,
        })
      )
      expect(result).toEqual(mockItem)
    })

    it('should have proper input schema', () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'updateItem')!

      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toHaveProperty('coords')
      expect(tool.inputSchema.properties).toHaveProperty('updates')
      expect(tool.inputSchema.required).toContain('coords')
      expect(tool.inputSchema.required).toContain('updates')
    })
  })

  describe('deleteItem tool', () => {
    it('should call mappingService.items.crud.deleteItem with coords', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'deleteItem')!

      vi.mocked(mockMappingService.items.crud.deleteItem).mockResolvedValue(undefined)

      const coords = {
        userId: 1,
        groupId: 0,
        path: [Direction.West],
      }

      await tool.execute({ coords })

      expect(mockMappingService.items.crud.deleteItem).toHaveBeenCalledWith({ coords })
    })

    it('should have proper input schema', () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'deleteItem')!

      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toHaveProperty('coords')
      expect(tool.inputSchema.required).toContain('coords')
    })
  })

  describe('getItemsForRootItem tool', () => {
    it('should call mappingService.items.query.getItemsForRootItem', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getItemsForRootItem')!

      const mockItems = [
        { id: '1', title: 'Item 1', coords: '1,0:1', depth: 1 },
        { id: '2', title: 'Item 2', coords: '1,0:2', depth: 1 },
      ]
      vi.mocked(mockMappingService.items.query.getItemsForRootItem).mockResolvedValue(
        mockItems
      )

      const input = {
        userId: 1,
        groupId: 0,
        depth: 3,
      }

      const result = await tool.execute(input)

      expect(mockMappingService.items.query.getItemsForRootItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: input.userId,
          groupId: input.groupId,
          depth: input.depth,
        })
      )
      expect(result).toEqual(mockItems)
    })

    it('should have proper input schema', () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getItemsForRootItem')!

      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toHaveProperty('userId')
      expect(tool.inputSchema.properties).toHaveProperty('groupId')
      expect(tool.inputSchema.required).toContain('userId')
    })

    it('should use default depth if not provided', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getItemsForRootItem')!

      vi.mocked(mockMappingService.items.query.getItemsForRootItem).mockResolvedValue([])

      const input = {
        userId: 1,
        groupId: 0,
      }

      await tool.execute(input)

      expect(mockMappingService.items.query.getItemsForRootItem).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: input.userId,
          groupId: input.groupId,
          depth: expect.any(Number),
        })
      )
    })
  })

  describe('getCurrentUser tool', () => {
    it('should call iamService.getCurrentUser and return contract', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getCurrentUser')!

      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        mappingId: 1,
      }
      const mockContract = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        mappingId: 1,
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(mockIAMService.getCurrentUser).mockResolvedValue(mockUser as never)
      vi.mocked(mockIAMService.userToContract).mockReturnValue(mockContract as never)

      const result = await tool.execute({})

      expect(mockIAMService.getCurrentUser).toHaveBeenCalledWith('test-user-123')
      expect(mockIAMService.userToContract).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual(mockContract)
    })

    it('should have proper input schema (empty object)', () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getCurrentUser')!

      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toEqual({})
    })

    it('should throw error if user is not authenticated', async () => {
      const tools = createMCPTools({
        ...mockCtx,
        user: null,
      } as unknown as Context)
      const tool = tools.find((t) => t.name === 'getCurrentUser')!

      await expect(tool.execute({})).rejects.toThrow()
    })

    it('should handle user not found', async () => {
      const tools = createMCPTools(mockCtx)
      const tool = tools.find((t) => t.name === 'getCurrentUser')!

      vi.mocked(mockIAMService.getCurrentUser).mockResolvedValue(null)

      await expect(tool.execute({})).rejects.toThrow()
    })
  })

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      const tools = createMCPTools(mockCtx)
      const getItemTool = tools.find((t) => t.name === 'getItemByCoords')!

      vi.mocked(mockMappingService.items.crud.getItem).mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        getItemTool.execute({
          coords: { userId: 1, groupId: 0, path: [Direction.NorthWest] },
        })
      ).rejects.toThrow('Database error')
    })

    it('should handle validation errors gracefully', async () => {
      const tools = createMCPTools(mockCtx)
      const addItemTool = tools.find((t) => t.name === 'addItem')!

      vi.mocked(mockMappingService.items.crud.addItemToMap).mockRejectedValue(
        new Error('Validation failed: title is required')
      )

      await expect(
        addItemTool.execute({
          coords: { userId: 1, groupId: 0, path: [] },
          title: '',
        })
      ).rejects.toThrow('Validation failed')
    })
  })

  describe('context usage', () => {
    it('should use context services consistently', () => {
      const tools = createMCPTools(mockCtx)

      expect(tools.length).toBeGreaterThan(0)
      // All tools should be created successfully with the context
      tools.forEach((tool) => {
        expect(tool.execute).toBeDefined()
      })
    })

    it('should handle missing services gracefully', () => {
      const incompleteCtx = {
        ...mockCtx,
        mappingService: undefined,
      } as unknown as Context

      // Should throw or handle gracefully
      expect(() => createMCPTools(incompleteCtx)).toThrow()
    })
  })
})
