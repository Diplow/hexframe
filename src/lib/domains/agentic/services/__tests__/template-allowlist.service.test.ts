/**
 * Template Allowlist Service Tests (TDD)
 *
 * These tests define the expected behavior of the User Template Allowlist Enforcement
 * feature before implementation. The service validates that users can only execute
 * templates they have explicitly allowed.
 *
 * See: docs/features/TEMPLATES_AS_TILES.md for feature specification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  TemplateAllowlistService,
  TemplateNotAllowedError,
  TemplateVisibilityError,
  type TemplateAllowlistRepository,
  type UserAllowlist,
  BUILT_IN_TEMPLATES
} from '~/lib/domains/agentic/services/_templates/template-allowlist.service'

describe('TemplateAllowlistService', () => {
  let mockRepository: TemplateAllowlistRepository
  let service: TemplateAllowlistService

  const testUserId = 'user-123'

  const mockUserAllowlist: UserAllowlist = {
    userId: testUserId,
    allowedTemplates: ['my-agent', 'research-assistant', 'custom-workflow']
  }

  beforeEach(() => {
    mockRepository = {
      getUserAllowlist: vi.fn(),
      saveUserAllowlist: vi.fn(),
      getTemplateVisibility: vi.fn()
    }

    service = new TemplateAllowlistService(mockRepository)
  })

  // ==================== CORE VALIDATION LOGIC ====================

  describe('validateAllowlist', () => {
    it('should allow built-in templates without explicit allowlist entry', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      // Built-in templates should always be allowed
      await expect(service.validateAllowlist(testUserId, 'system')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'user')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'organizational')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'context')).resolves.not.toThrow()
    })

    it('should allow custom templates that are in the user allowlist', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      await expect(service.validateAllowlist(testUserId, 'my-agent')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'research-assistant')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'custom-workflow')).resolves.not.toThrow()
    })

    it('should throw TemplateNotAllowedError when template is not in allowlist', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      await expect(service.validateAllowlist(testUserId, 'unknown-template'))
        .rejects
        .toThrow(TemplateNotAllowedError)

      await expect(service.validateAllowlist(testUserId, 'unknown-template'))
        .rejects
        .toThrow('Template "unknown-template" is not allowed for user "user-123"')
    })

    it('should include allowed templates in the error message', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      try {
        await service.validateAllowlist(testUserId, 'disallowed-template')
        expect.fail('Expected TemplateNotAllowedError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateNotAllowedError)
        const templateError = error as TemplateNotAllowedError
        expect(templateError.templateName).toBe('disallowed-template')
        expect(templateError.userId).toBe(testUserId)
        expect(templateError.allowedTemplates).toContain('my-agent')
        expect(templateError.allowedTemplates).toContain('research-assistant')
        expect(templateError.allowedTemplates).toContain('custom-workflow')
        // Built-in templates should also be in the allowed list
        expect(templateError.allowedTemplates).toContain('system')
        expect(templateError.allowedTemplates).toContain('user')
        expect(templateError.allowedTemplates).toContain('organizational')
        expect(templateError.allowedTemplates).toContain('context')
      }
    })

    it('should handle repository errors gracefully', async () => {
      const repositoryError = new Error('Database connection failed')
      vi.mocked(mockRepository.getUserAllowlist).mockRejectedValue(repositoryError)

      await expect(service.validateAllowlist(testUserId, 'my-agent'))
        .rejects
        .toThrow('Database connection failed')
    })
  })

  // ==================== BUILT-IN TEMPLATE DETECTION ====================

  describe('isBuiltInTemplate', () => {
    it('should return true for system template', () => {
      expect(service.isBuiltInTemplate('system')).toBe(true)
    })

    it('should return true for user template', () => {
      expect(service.isBuiltInTemplate('user')).toBe(true)
    })

    it('should return true for organizational template', () => {
      expect(service.isBuiltInTemplate('organizational')).toBe(true)
    })

    it('should return true for context template', () => {
      expect(service.isBuiltInTemplate('context')).toBe(true)
    })

    it('should return false for custom templates', () => {
      expect(service.isBuiltInTemplate('my-agent')).toBe(false)
      expect(service.isBuiltInTemplate('research-assistant')).toBe(false)
      expect(service.isBuiltInTemplate('custom-workflow')).toBe(false)
    })

    it('should return false for unknown templates', () => {
      expect(service.isBuiltInTemplate('random-template')).toBe(false)
      expect(service.isBuiltInTemplate('')).toBe(false)
    })

    it('should handle case-insensitive matching', () => {
      // Built-in templates should match regardless of case
      expect(service.isBuiltInTemplate('SYSTEM')).toBe(true)
      expect(service.isBuiltInTemplate('System')).toBe(true)
      expect(service.isBuiltInTemplate('USER')).toBe(true)
      expect(service.isBuiltInTemplate('User')).toBe(true)
      expect(service.isBuiltInTemplate('ORGANIZATIONAL')).toBe(true)
      expect(service.isBuiltInTemplate('Organizational')).toBe(true)
      expect(service.isBuiltInTemplate('CONTEXT')).toBe(true)
      expect(service.isBuiltInTemplate('Context')).toBe(true)
    })
  })

  // ==================== USER ALLOWLIST RETRIEVAL ====================

  describe('getUserAllowlist', () => {
    it('should return user allowlist from repository', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      const result = await service.getUserAllowlist(testUserId)

      expect(result).toEqual(mockUserAllowlist.allowedTemplates)
      expect(mockRepository.getUserAllowlist).toHaveBeenCalledWith(testUserId)
    })

    it('should return only built-in templates when user has no custom allowlist', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(null)

      const result = await service.getUserAllowlist(testUserId)

      expect(result).toEqual(BUILT_IN_TEMPLATES)
    })

    it('should return only built-in templates when allowlist is undefined', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(undefined as unknown as UserAllowlist | null)

      const result = await service.getUserAllowlist(testUserId)

      expect(result).toEqual(BUILT_IN_TEMPLATES)
    })

    it('should combine built-in templates with user custom templates', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      const result = await service.getEffectiveAllowlist(testUserId)

      // Should include both built-in and custom templates
      expect(result).toContain('system')
      expect(result).toContain('user')
      expect(result).toContain('organizational')
      expect(result).toContain('context')
      expect(result).toContain('my-agent')
      expect(result).toContain('research-assistant')
      expect(result).toContain('custom-workflow')
    })

    it('should handle empty allowlist array', async () => {
      const emptyAllowlist: UserAllowlist = {
        userId: testUserId,
        allowedTemplates: []
      }
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(emptyAllowlist)

      const result = await service.getEffectiveAllowlist(testUserId)

      // Should only have built-in templates
      expect(result).toEqual(BUILT_IN_TEMPLATES)
    })

    it('should deduplicate templates if user explicitly added built-in templates', async () => {
      const duplicateAllowlist: UserAllowlist = {
        userId: testUserId,
        allowedTemplates: ['system', 'user', 'my-agent'] // system and user are built-in
      }
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(duplicateAllowlist)

      const result = await service.getEffectiveAllowlist(testUserId)

      // Should not have duplicates
      const systemCount = result.filter(t => t === 'system').length
      const userCount = result.filter(t => t === 'user').length
      expect(systemCount).toBe(1)
      expect(userCount).toBe(1)
    })
  })

  // ==================== VISIBILITY VALIDATION ====================

  describe('validateVisibility', () => {
    it('should allow public tile with public template', async () => {
      vi.mocked(mockRepository.getTemplateVisibility).mockResolvedValue('public')

      await expect(service.validateVisibility('my-template', 'public', 'public'))
        .resolves.not.toThrow()
    })

    it('should allow private tile with public template', async () => {
      vi.mocked(mockRepository.getTemplateVisibility).mockResolvedValue('public')

      await expect(service.validateVisibility('my-template', 'private', 'public'))
        .resolves.not.toThrow()
    })

    it('should allow private tile with private template', async () => {
      vi.mocked(mockRepository.getTemplateVisibility).mockResolvedValue('private')

      await expect(service.validateVisibility('my-template', 'private', 'private'))
        .resolves.not.toThrow()
    })

    it('should throw TemplateVisibilityError when public tile uses private template', async () => {
      await expect(service.validateVisibility('my-private-template', 'public', 'private'))
        .rejects
        .toThrow(TemplateVisibilityError)

      await expect(service.validateVisibility('my-private-template', 'public', 'private'))
        .rejects
        .toThrow('Cannot use private template "my-private-template" for public tile')
    })

    it('should include template and visibility info in error', async () => {
      try {
        await service.validateVisibility('secret-template', 'public', 'private')
        expect.fail('Expected TemplateVisibilityError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateVisibilityError)
        const visibilityError = error as TemplateVisibilityError
        expect(visibilityError.templateName).toBe('secret-template')
        expect(visibilityError.tileVisibility).toBe('public')
        expect(visibilityError.templateVisibility).toBe('private')
      }
    })

    it('should allow built-in templates for any visibility', async () => {
      // Built-in templates are always considered public/available
      await expect(service.validateVisibility('system', 'public', 'public'))
        .resolves.not.toThrow()
      await expect(service.validateVisibility('user', 'public', 'public'))
        .resolves.not.toThrow()
      await expect(service.validateVisibility('organizational', 'public', 'public'))
        .resolves.not.toThrow()
      await expect(service.validateVisibility('context', 'public', 'public'))
        .resolves.not.toThrow()
    })
  })

  // ==================== ANONYMOUS USER HANDLING ====================

  describe('anonymous user handling', () => {
    it('should allow only built-in templates for anonymous users', async () => {
      const anonymousUserId = null

      // Built-in templates should work
      await expect(service.validateAllowlist(anonymousUserId, 'system')).resolves.not.toThrow()
      await expect(service.validateAllowlist(anonymousUserId, 'user')).resolves.not.toThrow()
      await expect(service.validateAllowlist(anonymousUserId, 'organizational')).resolves.not.toThrow()
      await expect(service.validateAllowlist(anonymousUserId, 'context')).resolves.not.toThrow()
    })

    it('should reject custom templates for anonymous users', async () => {
      const anonymousUserId = null

      await expect(service.validateAllowlist(anonymousUserId, 'my-agent'))
        .rejects
        .toThrow(TemplateNotAllowedError)
    })

    it('should not call repository for anonymous users', async () => {
      const anonymousUserId = null

      await service.validateAllowlist(anonymousUserId, 'system')

      expect(mockRepository.getUserAllowlist).not.toHaveBeenCalled()
    })

    it('should return only built-in templates for anonymous user allowlist', async () => {
      const anonymousUserId = null

      const result = await service.getUserAllowlist(anonymousUserId)

      expect(result).toEqual(BUILT_IN_TEMPLATES)
    })

    it('should handle undefined userId same as null', async () => {
      const undefinedUserId = undefined

      await expect(service.validateAllowlist(undefinedUserId as unknown as string | null, 'system'))
        .resolves.not.toThrow()
      await expect(service.validateAllowlist(undefinedUserId as unknown as string | null, 'my-agent'))
        .rejects
        .toThrow(TemplateNotAllowedError)
    })
  })

  // ==================== CASE SENSITIVITY ====================

  describe('case-insensitive template name matching', () => {
    it('should match template names case-insensitively in allowlist', async () => {
      const mixedCaseAllowlist: UserAllowlist = {
        userId: testUserId,
        allowedTemplates: ['My-Agent', 'RESEARCH-ASSISTANT']
      }
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mixedCaseAllowlist)

      // All case variations should be allowed
      await expect(service.validateAllowlist(testUserId, 'my-agent')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'MY-AGENT')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'My-Agent')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'research-assistant')).resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'Research-Assistant')).resolves.not.toThrow()
    })

    it('should normalize template names when checking built-in templates', () => {
      expect(service.isBuiltInTemplate('SYSTEM')).toBe(true)
      expect(service.isBuiltInTemplate('sYsTeM')).toBe(true)
      expect(service.isBuiltInTemplate('OrGaNiZaTiOnAl')).toBe(true)
    })
  })

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should handle template name with special characters', async () => {
      const specialAllowlist: UserAllowlist = {
        userId: testUserId,
        allowedTemplates: ['my-template_v2.1', 'agent.research.v3']
      }
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(specialAllowlist)

      await expect(service.validateAllowlist(testUserId, 'my-template_v2.1'))
        .resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'agent.research.v3'))
        .resolves.not.toThrow()
    })

    it('should reject empty string template name', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      await expect(service.validateAllowlist(testUserId, ''))
        .rejects
        .toThrow()
    })

    it('should reject whitespace-only template name', async () => {
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(mockUserAllowlist)

      await expect(service.validateAllowlist(testUserId, '   '))
        .rejects
        .toThrow()
    })

    it('should handle very long template names', async () => {
      const longTemplateName = 'a'.repeat(200)
      const longAllowlist: UserAllowlist = {
        userId: testUserId,
        allowedTemplates: [longTemplateName]
      }
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(longAllowlist)

      await expect(service.validateAllowlist(testUserId, longTemplateName))
        .resolves.not.toThrow()
    })

    it('should handle user with large allowlist efficiently', async () => {
      const largeAllowlist: UserAllowlist = {
        userId: testUserId,
        allowedTemplates: Array.from({ length: 1000 }, (_, i) => `template-${i}`)
      }
      vi.mocked(mockRepository.getUserAllowlist).mockResolvedValue(largeAllowlist)

      // Should still perform efficiently
      await expect(service.validateAllowlist(testUserId, 'template-999'))
        .resolves.not.toThrow()
      await expect(service.validateAllowlist(testUserId, 'template-not-in-list'))
        .rejects
        .toThrow(TemplateNotAllowedError)
    })
  })
})

// ==================== ERROR CLASSES ====================

describe('TemplateNotAllowedError', () => {
  it('should be an instance of Error', () => {
    const error = new TemplateNotAllowedError('test-template', 'user-123', ['allowed-1', 'allowed-2'])
    expect(error).toBeInstanceOf(Error)
  })

  it('should have correct name property', () => {
    const error = new TemplateNotAllowedError('test-template', 'user-123', ['allowed-1'])
    expect(error.name).toBe('TemplateNotAllowedError')
  })

  it('should include template name in message', () => {
    const error = new TemplateNotAllowedError('my-special-template', 'user-456', ['other'])
    expect(error.message).toContain('my-special-template')
    expect(error.message).toContain('user-456')
  })

  it('should expose templateName property', () => {
    const error = new TemplateNotAllowedError('custom-agent', 'user-789', ['allowed'])
    expect(error.templateName).toBe('custom-agent')
  })

  it('should expose userId property', () => {
    const error = new TemplateNotAllowedError('custom-agent', 'user-789', ['allowed'])
    expect(error.userId).toBe('user-789')
  })

  it('should expose allowedTemplates property', () => {
    const allowedList = ['template-1', 'template-2', 'template-3']
    const error = new TemplateNotAllowedError('disallowed', 'user-123', allowedList)
    expect(error.allowedTemplates).toEqual(allowedList)
  })

  it('should have proper stack trace', () => {
    const error = new TemplateNotAllowedError('test-template', 'user-123', [])
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('TemplateNotAllowedError')
  })
})

describe('TemplateVisibilityError', () => {
  it('should be an instance of Error', () => {
    const error = new TemplateVisibilityError('test-template', 'public', 'private')
    expect(error).toBeInstanceOf(Error)
  })

  it('should have correct name property', () => {
    const error = new TemplateVisibilityError('test-template', 'public', 'private')
    expect(error.name).toBe('TemplateVisibilityError')
  })

  it('should include template name and visibility in message', () => {
    const error = new TemplateVisibilityError('secret-agent', 'public', 'private')
    expect(error.message).toContain('secret-agent')
    expect(error.message).toContain('private')
    expect(error.message).toContain('public')
  })

  it('should expose templateName property', () => {
    const error = new TemplateVisibilityError('my-template', 'public', 'private')
    expect(error.templateName).toBe('my-template')
  })

  it('should expose tileVisibility property', () => {
    const error = new TemplateVisibilityError('my-template', 'public', 'private')
    expect(error.tileVisibility).toBe('public')
  })

  it('should expose templateVisibility property', () => {
    const error = new TemplateVisibilityError('my-template', 'public', 'private')
    expect(error.templateVisibility).toBe('private')
  })

  it('should have proper stack trace', () => {
    const error = new TemplateVisibilityError('test-template', 'public', 'private')
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('TemplateVisibilityError')
  })
})

// ==================== BUILT-IN TEMPLATES CONSTANT ====================

describe('BUILT_IN_TEMPLATES', () => {
  it('should contain system template', () => {
    expect(BUILT_IN_TEMPLATES).toContain('system')
  })

  it('should contain user template', () => {
    expect(BUILT_IN_TEMPLATES).toContain('user')
  })

  it('should contain organizational template', () => {
    expect(BUILT_IN_TEMPLATES).toContain('organizational')
  })

  it('should contain context template', () => {
    expect(BUILT_IN_TEMPLATES).toContain('context')
  })

  it('should be immutable (frozen)', () => {
    expect(Object.isFrozen(BUILT_IN_TEMPLATES)).toBe(true)
  })

  it('should contain exactly 4 built-in templates', () => {
    expect(BUILT_IN_TEMPLATES).toHaveLength(4)
  })
})
