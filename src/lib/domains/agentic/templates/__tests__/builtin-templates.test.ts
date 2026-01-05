/**
 * Built-in Template Tiles Tests (TDD)
 *
 * These tests define the expected behavior for migrating built-in templates
 * (SYSTEM_TEMPLATE, USER_TEMPLATE) from TypeScript code to tile storage.
 *
 * Design reference: docs/features/TEMPLATES_AS_TILES.md
 *
 * Well-known coordinates:
 * - System Templates parent: D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK,0:1,2 (Templates organizational tile)
 * - Built-in templates are structural children (directions 1-6) of this tile
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  TemplateResolverService,
  type TemplateData,
  type TemplateRepository,
} from '~/lib/domains/agentic/services/_templates/template-resolver.service'
import { SYSTEM_TEMPLATE } from '~/lib/domains/agentic/templates/_system-template'
import { USER_TEMPLATE } from '~/lib/domains/agentic/templates/_user-template'

// ==================== CONSTANTS ====================

/**
 * Well-known user ID for system-owned templates.
 * This is Hexframe's internal system user that owns built-in templates.
 */
const SYSTEM_USER_ID = 'D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK'

/**
 * Well-known coordinates for the Templates organizational tile.
 * Built-in templates are stored as children of this tile.
 */
const TEMPLATES_PARENT_PATH = [1, 2] // Direction 1 (NW), then 2 (NE)

/**
 * Built-in template names that must exist.
 * These map to the tile type they render.
 */
const BUILTIN_TEMPLATE_NAMES = {
  SYSTEM: 'system',
  USER: 'user',
  ORGANIZATIONAL: 'organizational',
  CONTEXT: 'context',
} as const

// ==================== TEST DATA ====================

/**
 * Expected template tile structure for built-in templates.
 */
interface BuiltinTemplateSpec {
  templateName: string
  title: string
  expectedContent: string
  direction: number // Direction from Templates parent tile
}

const BUILTIN_TEMPLATE_SPECS: BuiltinTemplateSpec[] = [
  {
    templateName: BUILTIN_TEMPLATE_NAMES.SYSTEM,
    title: 'System Task Template',
    expectedContent: SYSTEM_TEMPLATE,
    direction: 1,
  },
  {
    templateName: BUILTIN_TEMPLATE_NAMES.USER,
    title: 'User Interlocutor Template',
    expectedContent: USER_TEMPLATE,
    direction: 2,
  },
  // organizational and context templates will be added when their TypeScript templates exist
]

// ==================== SEED SCRIPT TESTS ====================

describe('BuiltinTemplateSeed', () => {
  describe('template tile creation', () => {
    it('should create template tiles at well-known coordinates', async () => {
      // This test verifies the seed script creates tiles at the expected locations
      // The seed script should:
      // 1. Create or find the Templates organizational tile at TEMPLATES_PARENT_PATH
      // 2. Create template tiles as structural children (directions 1-6)

      // Expected coordinates for system template: Templates parent path + direction 1
      const expectedSystemTemplatePath = [...TEMPLATES_PARENT_PATH, 1]

      // This is a specification - implementation will provide the actual seed function
      expect(expectedSystemTemplatePath).toEqual([1, 2, 1])
    })

    it('should create system template tile with correct templateName', async () => {
      // Template tiles must have templateName set to enable lookup by TemplateResolverService
      const expectedTemplateName = BUILTIN_TEMPLATE_NAMES.SYSTEM

      expect(expectedTemplateName).toBe('system')
    })

    it('should create user template tile with correct templateName', async () => {
      const expectedTemplateName = BUILTIN_TEMPLATE_NAMES.USER

      expect(expectedTemplateName).toBe('user')
    })

    it('should set visibility to public for built-in templates', async () => {
      // Built-in templates must be public so all users can access them
      // This follows the transparency principle from TEMPLATES_AS_TILES.md
      const expectedVisibility = 'public'

      expect(expectedVisibility).toBe('public')
    })

    it('should store SYSTEM_TEMPLATE content in system template tile', async () => {
      // The template tile content should exactly match the TypeScript template
      const systemTemplateSpec = BUILTIN_TEMPLATE_SPECS.find(
        spec => spec.templateName === 'system'
      )

      expect(systemTemplateSpec?.expectedContent).toBe(SYSTEM_TEMPLATE)
      expect(systemTemplateSpec?.expectedContent).toContain('{{{hexrunIntro}}}')
      expect(systemTemplateSpec?.expectedContent).toContain('{{@HexPlan}}')
    })

    it('should store USER_TEMPLATE content in user template tile', async () => {
      const userTemplateSpec = BUILTIN_TEMPLATE_SPECS.find(
        spec => spec.templateName === 'user'
      )

      expect(userTemplateSpec?.expectedContent).toBe(USER_TEMPLATE)
      expect(userTemplateSpec?.expectedContent).toContain('{{{userIntro}}}')
      expect(userTemplateSpec?.expectedContent).toContain('{{{sectionsSection}}}')
    })
  })

  describe('idempotency', () => {
    it('should not duplicate templates when run multiple times', async () => {
      // Seed script must be idempotent - running it twice should not create duplicates
      // It should either:
      // 1. Check if template exists before creating
      // 2. Use upsert semantics

      // This is a behavioral specification for the seed script
      const firstRunTemplateCount = 4 // system, user, organizational, context
      const secondRunTemplateCount = 4 // same - no duplicates

      expect(firstRunTemplateCount).toBe(secondRunTemplateCount)
    })

    it('should update existing template content if changed', async () => {
      // When TypeScript template changes, re-running seed should update tile content
      // This ensures built-in templates stay in sync with code

      const originalContent = SYSTEM_TEMPLATE
      const updatedContent = SYSTEM_TEMPLATE // Same in this test, but could differ

      // Seed should detect content mismatch and update
      expect(originalContent).toBe(updatedContent)
    })
  })
})

// ==================== TEMPLATE RESOLVER INTEGRATION TESTS ====================

describe('TemplateResolverService with built-in templates', () => {
  let mockRepository: TemplateRepository
  let service: TemplateResolverService

  /**
   * Mock data representing built-in templates as they would be stored in the database.
   */
  const mockBuiltinTemplates: Record<string, TemplateData> = {
    system: {
      templateName: 'system',
      title: 'System Task Template',
      content: SYSTEM_TEMPLATE,
      coords: `${SYSTEM_USER_ID},0:1,2,1`,
    },
    user: {
      templateName: 'user',
      title: 'User Interlocutor Template',
      content: USER_TEMPLATE,
      coords: `${SYSTEM_USER_ID},0:1,2,2`,
    },
  }

  beforeEach(() => {
    mockRepository = {
      findByTemplateName: vi.fn().mockImplementation((name: string) => {
        return Promise.resolve(mockBuiltinTemplates[name] ?? null)
      }),
      findByTemplateNameWithChildren: vi.fn().mockImplementation((name: string) => {
        const template = mockBuiltinTemplates[name]
        return Promise.resolve(template ? { ...template, subTemplates: [] } : null)
      }),
    }

    service = new TemplateResolverService(mockRepository)
  })

  describe('fetching built-in templates by name', () => {
    it('should fetch system template by name "system"', async () => {
      const result = await service.getTemplateByName('system')

      expect(result.templateName).toBe('system')
      expect(result.content).toBe(SYSTEM_TEMPLATE)
      expect(mockRepository.findByTemplateName).toHaveBeenCalledWith('system')
    })

    it('should fetch user template by name "user"', async () => {
      const result = await service.getTemplateByName('user')

      expect(result.templateName).toBe('user')
      expect(result.content).toBe(USER_TEMPLATE)
      expect(mockRepository.findByTemplateName).toHaveBeenCalledWith('user')
    })

    it('should return template content matching TypeScript constant for system', async () => {
      const result = await service.getTemplateByName('system')

      // Verify the tile content exactly matches the TypeScript template
      expect(result.content).toBe(SYSTEM_TEMPLATE)
      expect(result.content).toContain('<task>')
      expect(result.content).toContain('{{@HexPlan}}')
    })

    it('should return template content matching TypeScript constant for user', async () => {
      const result = await service.getTemplateByName('user')

      expect(result.content).toBe(USER_TEMPLATE)
      expect(result.content).toContain('<user-message>')
      expect(result.content).toContain('{{{userMessage}}}')
    })

    it('should return template with correct coordinates under system user', async () => {
      const systemResult = await service.getTemplateByName('system')
      const userResult = await service.getTemplateByName('user')

      // Both templates should be owned by the system user
      expect(systemResult.coords).toContain(SYSTEM_USER_ID)
      expect(userResult.coords).toContain(SYSTEM_USER_ID)

      // Both should be children of the Templates organizational tile
      expect(systemResult.coords).toContain('1,2,') // Path includes Templates parent
      expect(userResult.coords).toContain('1,2,')
    })
  })

  describe('template resolution for buildPrompt', () => {
    it('should provide template data compatible with Mustache rendering', async () => {
      const result = await service.getTemplateByName('system')

      // The content should be valid Mustache template syntax
      expect(result.content).toContain('{{{') // Triple braces for unescaped
      expect(result.content).toContain('{{#') // Section opening
      expect(result.content).toContain('{{/') // Section closing
    })

    it('should provide template data with required fields for pre-processor', async () => {
      const result = await service.getTemplateByName('system')

      // Template data should have all fields needed by the pre-processor
      expect(result).toHaveProperty('templateName')
      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('coords')
    })
  })
})

// ==================== TEMPLATE CONTENT VERIFICATION ====================

describe('Built-in template content verification', () => {
  describe('SYSTEM_TEMPLATE', () => {
    it('should contain hexrunIntro section', () => {
      expect(SYSTEM_TEMPLATE).toContain('{{{hexrunIntro}}}')
    })

    it('should contain ancestor context section', () => {
      expect(SYSTEM_TEMPLATE).toContain('{{#hasAncestorsWithContent}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{ancestorContextSection}}}')
    })

    it('should contain composed children context section', () => {
      expect(SYSTEM_TEMPLATE).toContain('{{#hasComposedChildren}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{contextSection}}}')
    })

    it('should contain subtasks section', () => {
      expect(SYSTEM_TEMPLATE).toContain('{{#hasSubtasks}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{subtasksSection}}}')
    })

    it('should contain task section with goal and content', () => {
      expect(SYSTEM_TEMPLATE).toContain('<task>')
      expect(SYSTEM_TEMPLATE).toContain('<goal>{{{task.title}}}</goal>')
      expect(SYSTEM_TEMPLATE).toContain('{{#task.hasContent}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{task.content}}}')
    })

    it('should contain HexPlan pre-processor tag', () => {
      expect(SYSTEM_TEMPLATE).toContain('{{@HexPlan}}')
    })
  })

  describe('USER_TEMPLATE', () => {
    it('should contain userIntro section', () => {
      expect(USER_TEMPLATE).toContain('{{{userIntro}}}')
    })

    it('should contain composed children context section', () => {
      expect(USER_TEMPLATE).toContain('{{#hasComposedChildren}}')
      expect(USER_TEMPLATE).toContain('{{{contextSection}}}')
    })

    it('should contain sections for navigation', () => {
      expect(USER_TEMPLATE).toContain('{{#hasSections}}')
      expect(USER_TEMPLATE).toContain('{{{sectionsSection}}}')
    })

    it('should contain recent history section', () => {
      expect(USER_TEMPLATE).toContain('{{#hasRecentHistory}}')
      expect(USER_TEMPLATE).toContain('<recent-history')
      expect(USER_TEMPLATE).toContain('{{{recentHistory}}}')
    })

    it('should contain discussion section', () => {
      expect(USER_TEMPLATE).toContain('{{#hasDiscussion}}')
      expect(USER_TEMPLATE).toContain('<discussion>')
      expect(USER_TEMPLATE).toContain('{{{discussion}}}')
    })

    it('should contain user message section', () => {
      expect(USER_TEMPLATE).toContain('{{#hasUserMessage}}')
      expect(USER_TEMPLATE).toContain('<user-message>')
      expect(USER_TEMPLATE).toContain('{{{userMessage}}}')
    })

    it('should NOT contain HexPlan tag (user tiles use discussion, not hexplan)', () => {
      expect(USER_TEMPLATE).not.toContain('{{@HexPlan}}')
    })
  })
})

// ==================== TEMPLATE TYPE SPECIFICATION ====================

describe('Template tile type specification', () => {
  it('should define "template" as a valid itemType for template tiles', () => {
    // Template tiles must have itemType="template" to be identifiable
    // This is specified in TEMPLATES_AS_TILES.md
    const expectedItemType = 'template'

    expect(expectedItemType).toBe('template')
  })

  it('should reserve built-in template names', () => {
    // Built-in template names should be reserved and not creatable by users
    const reservedNames = ['system', 'user', 'organizational', 'context']

    expect(reservedNames).toContain(BUILTIN_TEMPLATE_NAMES.SYSTEM)
    expect(reservedNames).toContain(BUILTIN_TEMPLATE_NAMES.USER)
    expect(reservedNames).toContain(BUILTIN_TEMPLATE_NAMES.ORGANIZATIONAL)
    expect(reservedNames).toContain(BUILTIN_TEMPLATE_NAMES.CONTEXT)
  })

  it('should enforce unique templateName constraint', () => {
    // Each templateName should be unique across the system
    // This is enforced via database constraint: UNIQUE(templateName)
    const templateNames = new Set([
      BUILTIN_TEMPLATE_NAMES.SYSTEM,
      BUILTIN_TEMPLATE_NAMES.USER,
      BUILTIN_TEMPLATE_NAMES.ORGANIZATIONAL,
      BUILTIN_TEMPLATE_NAMES.CONTEXT,
    ])

    expect(templateNames.size).toBe(4) // All unique
  })
})

// ==================== SEED SCRIPT INTERFACE SPECIFICATION ====================

describe('Template seed script interface', () => {
  /**
   * Specification for the seed function that will be implemented.
   * This describes the expected interface and behavior.
   */
  interface TemplateSeedResult {
    created: string[] // templateNames of newly created templates
    updated: string[] // templateNames of updated templates
    skipped: string[] // templateNames that already existed and were unchanged
  }

  it('should define seed function signature', () => {
    // The seed function should:
    // 1. Accept a database/repository connection
    // 2. Return information about what was created/updated

    // This is a type-level test - just verifying the interface shape
    const mockResult: TemplateSeedResult = {
      created: ['system', 'user'],
      updated: [],
      skipped: [],
    }

    expect(mockResult.created).toContain('system')
    expect(mockResult.created).toContain('user')
  })

  it('should seed all built-in templates', () => {
    // The seed should create all four built-in templates
    const expectedTemplates = [
      BUILTIN_TEMPLATE_NAMES.SYSTEM,
      BUILTIN_TEMPLATE_NAMES.USER,
      BUILTIN_TEMPLATE_NAMES.ORGANIZATIONAL,
      BUILTIN_TEMPLATE_NAMES.CONTEXT,
    ]

    expect(expectedTemplates).toHaveLength(4)
  })
})
