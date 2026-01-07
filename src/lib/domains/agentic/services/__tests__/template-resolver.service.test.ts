/**
 * Template Resolver Service Tests (TDD)
 *
 * These tests define the expected behavior of the Template Tile Lookup Service
 * before implementation. The service allows buildPrompt() to retrieve template
 * content by templateName from the tile database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  TemplateResolverService,
  TemplateNotFoundError,
  type TemplateData,
  type TemplateWithChildren,
  type TemplateRepository
} from '~/lib/domains/agentic/services/_templates/template-resolver.service'

describe('TemplateResolverService', () => {
  let mockRepository: TemplateRepository
  let service: TemplateResolverService

  const mockTemplateData: TemplateData = {
    templateName: 'task-breakdown',
    title: 'Task Breakdown Template',
    content: 'This template helps break down complex tasks into subtasks.',
    coords: 'template-user,0:1'
  }

  const mockTemplateWithChildren: TemplateWithChildren = {
    ...mockTemplateData,
    subTemplates: [
      {
        templateName: 'task-breakdown-step',
        title: 'Step Template',
        content: 'A single step in the breakdown.',
        coords: 'template-user,0:1,1'
      },
      {
        templateName: 'task-breakdown-context',
        title: 'Context Template',
        content: 'Additional context for the step.',
        coords: 'template-user,0:1,2'
      }
    ]
  }

  beforeEach(() => {
    mockRepository = {
      findByTemplateName: vi.fn(),
      findByTemplateNameWithChildren: vi.fn()
    }

    service = new TemplateResolverService(mockRepository)
  })

  describe('getTemplateByName', () => {
    it('should return template content when template exists', async () => {
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(mockTemplateData)

      const result = await service.getTemplateByName('task-breakdown')

      expect(result).toEqual(mockTemplateData)
      expect(mockRepository.findByTemplateName).toHaveBeenCalledWith('task-breakdown')
    })

    it('should throw TemplateNotFoundError when template does not exist', async () => {
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(null)

      await expect(service.getTemplateByName('non-existent-template'))
        .rejects
        .toThrow(TemplateNotFoundError)

      await expect(service.getTemplateByName('non-existent-template'))
        .rejects
        .toThrow('Template "non-existent-template" not found')
    })

    it('should return template with empty content when content is empty string', async () => {
      const emptyContentTemplate: TemplateData = {
        ...mockTemplateData,
        content: ''
      }
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(emptyContentTemplate)

      const result = await service.getTemplateByName('task-breakdown')

      expect(result.content).toBe('')
      expect(result.templateName).toBe('task-breakdown')
    })

    it('should handle template names with special characters', async () => {
      const specialNameTemplate: TemplateData = {
        ...mockTemplateData,
        templateName: 'my-template_v2.1'
      }
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(specialNameTemplate)

      const result = await service.getTemplateByName('my-template_v2.1')

      expect(result.templateName).toBe('my-template_v2.1')
      expect(mockRepository.findByTemplateName).toHaveBeenCalledWith('my-template_v2.1')
    })

    it('should throw error for empty template name', async () => {
      await expect(service.getTemplateByName(''))
        .rejects
        .toThrow()
    })

    it('should propagate repository errors with descriptive message', async () => {
      const repositoryError = new Error('Database connection failed')
      vi.mocked(mockRepository.findByTemplateName).mockRejectedValue(repositoryError)

      await expect(service.getTemplateByName('task-breakdown'))
        .rejects
        .toThrow('Database connection failed')
    })
  })

  describe('getTemplateWithSubTemplates', () => {
    it('should return template with sub-templates when they exist', async () => {
      vi.mocked(mockRepository.findByTemplateNameWithChildren).mockResolvedValue(mockTemplateWithChildren)

      const result = await service.getTemplateWithSubTemplates('task-breakdown')

      expect(result).toEqual(mockTemplateWithChildren)
      expect(result.subTemplates).toHaveLength(2)
      expect(result.subTemplates[0]!.templateName).toBe('task-breakdown-step')
      expect(result.subTemplates[1]!.templateName).toBe('task-breakdown-context')
    })

    it('should throw TemplateNotFoundError when template does not exist', async () => {
      vi.mocked(mockRepository.findByTemplateNameWithChildren).mockResolvedValue(null)

      await expect(service.getTemplateWithSubTemplates('non-existent-template'))
        .rejects
        .toThrow(TemplateNotFoundError)
    })

    it('should return template with empty subTemplates array when no children exist', async () => {
      const templateWithNoChildren: TemplateWithChildren = {
        ...mockTemplateData,
        subTemplates: []
      }
      vi.mocked(mockRepository.findByTemplateNameWithChildren).mockResolvedValue(templateWithNoChildren)

      const result = await service.getTemplateWithSubTemplates('task-breakdown')

      expect(result.subTemplates).toEqual([])
      expect(result.subTemplates).toHaveLength(0)
    })

    it('should retrieve sub-templates with their full content', async () => {
      vi.mocked(mockRepository.findByTemplateNameWithChildren).mockResolvedValue(mockTemplateWithChildren)

      const result = await service.getTemplateWithSubTemplates('task-breakdown')

      // Verify sub-templates have all required fields
      for (const subTemplate of result.subTemplates) {
        expect(subTemplate).toHaveProperty('templateName')
        expect(subTemplate).toHaveProperty('title')
        expect(subTemplate).toHaveProperty('content')
        expect(subTemplate).toHaveProperty('coords')
      }
    })

    it('should handle deeply nested sub-template structures', async () => {
      const nestedTemplate: TemplateWithChildren = {
        ...mockTemplateData,
        subTemplates: [
          {
            templateName: 'nested-1',
            title: 'Nested 1',
            content: 'First level nesting',
            coords: 'template-user,0:1,1'
          },
          {
            templateName: 'nested-2',
            title: 'Nested 2',
            content: 'Second nested item',
            coords: 'template-user,0:1,2'
          },
          {
            templateName: 'nested-3',
            title: 'Nested 3',
            content: 'Third nested item',
            coords: 'template-user,0:1,3'
          },
          {
            templateName: 'nested-4',
            title: 'Nested 4',
            content: 'Fourth nested item',
            coords: 'template-user,0:1,4'
          },
          {
            templateName: 'nested-5',
            title: 'Nested 5',
            content: 'Fifth nested item',
            coords: 'template-user,0:1,5'
          },
          {
            templateName: 'nested-6',
            title: 'Nested 6',
            content: 'Sixth nested item (max structural children)',
            coords: 'template-user,0:1,6'
          }
        ]
      }
      vi.mocked(mockRepository.findByTemplateNameWithChildren).mockResolvedValue(nestedTemplate)

      const result = await service.getTemplateWithSubTemplates('task-breakdown')

      expect(result.subTemplates).toHaveLength(6)
    })

    it('should propagate repository errors with descriptive message', async () => {
      const repositoryError = new Error('Query timeout exceeded')
      vi.mocked(mockRepository.findByTemplateNameWithChildren).mockRejectedValue(repositoryError)

      await expect(service.getTemplateWithSubTemplates('task-breakdown'))
        .rejects
        .toThrow('Query timeout exceeded')
    })
  })

  describe('error handling', () => {
    it('should provide descriptive error for template not found', async () => {
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(null)

      try {
        await service.getTemplateByName('missing-template')
        expect.fail('Expected TemplateNotFoundError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateNotFoundError)
        expect((error as Error).message).toContain('missing-template')
        expect((error as Error).name).toBe('TemplateNotFoundError')
      }
    })

    it('should handle whitespace-only template names as invalid', async () => {
      await expect(service.getTemplateByName('   '))
        .rejects
        .toThrow()
    })

    it('should handle null template name gracefully', async () => {
      // TypeScript would prevent this, but runtime should handle it
      await expect(service.getTemplateByName(null as unknown as string))
        .rejects
        .toThrow()
    })

    it('should handle undefined template name gracefully', async () => {
      // TypeScript would prevent this, but runtime should handle it
      await expect(service.getTemplateByName(undefined as unknown as string))
        .rejects
        .toThrow()
    })
  })

  describe('caching behavior (future consideration)', () => {
    it('should call repository for each request without caching by default', async () => {
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(mockTemplateData)

      await service.getTemplateByName('task-breakdown')
      await service.getTemplateByName('task-breakdown')
      await service.getTemplateByName('task-breakdown')

      // Without caching, repository should be called each time
      expect(mockRepository.findByTemplateName).toHaveBeenCalledTimes(3)
    })
  })

  describe('built-in vs custom templates', () => {
    it('should work for built-in templates', async () => {
      const builtInTemplate: TemplateData = {
        templateName: 'hexplan-default',
        title: 'Default Hexplan Template',
        content: 'Standard hexplan structure for task execution.',
        coords: 'system,0:1'
      }
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(builtInTemplate)

      const result = await service.getTemplateByName('hexplan-default')

      expect(result.templateName).toBe('hexplan-default')
    })

    it('should work for custom user-created templates', async () => {
      const customTemplate: TemplateData = {
        templateName: 'my-custom-workflow',
        title: 'Custom Workflow Template',
        content: 'User-defined workflow for specific use case.',
        coords: 'user123,0:3'
      }
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(customTemplate)

      const result = await service.getTemplateByName('my-custom-workflow')

      expect(result.templateName).toBe('my-custom-workflow')
    })
  })

  describe('integration points', () => {
    it('should return data compatible with template pre-processor TileData', async () => {
      vi.mocked(mockRepository.findByTemplateName).mockResolvedValue(mockTemplateData)

      const result = await service.getTemplateByName('task-breakdown')

      // Verify structure matches TileData interface used by pre-processor
      expect(result).toMatchObject({
        title: expect.any(String),
        content: expect.any(String),
        coords: expect.any(String)
      })
    })

    it('should return sub-templates in structural child order (directions 1-6)', async () => {
      vi.mocked(mockRepository.findByTemplateNameWithChildren).mockResolvedValue(mockTemplateWithChildren)

      const result = await service.getTemplateWithSubTemplates('task-breakdown')

      // Sub-templates should maintain their order based on coordinate path
      const coordinatePaths = result.subTemplates.map(sub => sub.coords)
      expect(coordinatePaths).toEqual([
        'template-user,0:1,1',
        'template-user,0:1,2'
      ])
    })
  })
})

describe('TemplateNotFoundError', () => {
  it('should be an instance of Error', () => {
    const error = new TemplateNotFoundError('test-template')
    expect(error).toBeInstanceOf(Error)
  })

  it('should have correct name property', () => {
    const error = new TemplateNotFoundError('test-template')
    expect(error.name).toBe('TemplateNotFoundError')
  })

  it('should include template name in message', () => {
    const error = new TemplateNotFoundError('my-special-template')
    expect(error.message).toContain('my-special-template')
    expect(error.message).toBe('Template "my-special-template" not found')
  })

  it('should have proper stack trace', () => {
    const error = new TemplateNotFoundError('test-template')
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('TemplateNotFoundError')
  })
})
