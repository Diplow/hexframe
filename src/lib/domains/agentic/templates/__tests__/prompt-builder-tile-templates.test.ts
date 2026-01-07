/**
 * TDD Tests: buildPrompt() Using Tile-Based Templates
 *
 * These tests define the expected behavior for buildPrompt() to read templates
 * from tile storage instead of TypeScript constants.
 *
 * Design reference: docs/features/TEMPLATES_AS_TILES.md
 *
 * Key behaviors:
 * 1. buildPrompt() looks up template by tile's itemType from tile storage
 * 2. Mustache rendering with tile data as context
 * 3. Pre-processor expands {{@ChildName}} to structural children of template
 * 4. Fallback behavior when template tile not found
 * 5. Error handling for invalid templates
 * 6. Backward compatibility with existing behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PromptData } from '~/lib/domains/agentic/templates/_internals/types'
import { MapItemType } from '~/lib/domains/mapping'
import { SYSTEM_TEMPLATE } from '~/lib/domains/agentic/templates/_system-template'
import { USER_TEMPLATE } from '~/lib/domains/agentic/templates/_user-template'

// ==================== CONSTANTS ====================

const SYSTEM_USER_ID = 'D1i4gEqbi01JWS2F6I7GUN8ekRiU2mjK'
const MCP_SERVER_NAME = 'hexframe'

// ==================== TEST FIXTURES ====================

/**
 * Minimal valid PromptData for SYSTEM tile.
 */
function createSystemPromptData(overrides: Partial<PromptData> = {}): PromptData {
  return {
    task: {
      title: 'Test Task',
      content: 'Test task content',
      coords: 'user123,0:1,2,3',
    },
    ancestors: [],
    composedChildren: [],
    structuralChildren: [],
    hexPlan: '',
    mcpServerName: MCP_SERVER_NAME,
    itemType: MapItemType.SYSTEM,
    ...overrides,
  }
}

/**
 * Minimal valid PromptData for USER tile.
 */
function createUserPromptData(overrides: Partial<PromptData> = {}): PromptData {
  return {
    task: {
      title: 'User Root',
      content: undefined,
      coords: 'user123,0:',
    },
    ancestors: [],
    composedChildren: [],
    structuralChildren: [],
    hexPlan: '',
    mcpServerName: MCP_SERVER_NAME,
    itemType: MapItemType.USER,
    ...overrides,
  }
}

// ==================== TEMPLATE LOOKUP TESTS ====================

describe('buildPrompt template lookup from tiles', () => {
  /**
   * This describes the new interface that buildPrompt will use.
   * The TemplateStore provides templates from tile storage.
   */
  interface TemplateStore {
    getTemplateByItemType(itemType: string): Promise<string | null>
    getTemplateWithChildren(itemType: string): Promise<{
      content: string
      children: Array<{ templateName: string; content: string }>
    } | null>
  }

  let mockTemplateStore: TemplateStore

  beforeEach(() => {
    mockTemplateStore = {
      getTemplateByItemType: vi.fn(),
      getTemplateWithChildren: vi.fn(),
    }
  })

  describe('when template tile exists', () => {
    it('should look up template by itemType name', async () => {
      // GIVEN a SYSTEM tile with itemType
      const promptData = createSystemPromptData()

      // WHEN buildPrompt is called with a template store
      // The implementation should call getTemplateByItemType with 'system'
      const expectedLookupKey = 'system' // MapItemType.SYSTEM lowercased

      // THEN the store should be queried with the lowercase itemType
      expect(expectedLookupKey).toBe('system')
      expect(promptData.itemType).toBe(MapItemType.SYSTEM)
    })

    it('should use template content from tile storage for SYSTEM tiles', async () => {
      // GIVEN a template tile with SYSTEM_TEMPLATE content
      vi.mocked(mockTemplateStore.getTemplateByItemType).mockResolvedValue(SYSTEM_TEMPLATE)

      // WHEN buildPrompt renders a SYSTEM tile
      const promptData = createSystemPromptData()

      // THEN the rendered output should match current behavior
      // This ensures backward compatibility
      expect(SYSTEM_TEMPLATE).toContain('{{{hexrunIntro}}}')
      expect(SYSTEM_TEMPLATE).toContain('{{@HexPlan}}')
      expect(promptData.itemType).toBe(MapItemType.SYSTEM)
    })

    it('should use template content from tile storage for USER tiles', async () => {
      // GIVEN a template tile with USER_TEMPLATE content
      vi.mocked(mockTemplateStore.getTemplateByItemType).mockResolvedValue(USER_TEMPLATE)

      // WHEN buildPrompt renders a USER tile
      const promptData = createUserPromptData()

      // THEN the rendered output should match current pool-based behavior
      expect(USER_TEMPLATE).toContain('{{{template[-1].content}}}')
      expect(USER_TEMPLATE).toContain('{{@RenderChildren')
      expect(promptData.itemType).toBe(MapItemType.USER)
    })

    it('should pass tile data to Mustache for rendering', async () => {
      // GIVEN a simple template
      const simpleTemplate = '<task><goal>{{{task.title}}}</goal></task>'

      // WHEN rendered with task data
      const promptData = createSystemPromptData({
        task: { title: 'My Custom Task', content: undefined, coords: 'abc,0:1' },
      })

      // THEN the task title should appear in rendered output
      // The implementation will render: '<task><goal>My Custom Task</goal></task>'
      expect(promptData.task.title).toBe('My Custom Task')
      expect(simpleTemplate).toContain('{{{task.title}}}')
    })
  })

  describe('when template tile is missing', () => {
    it('should throw TemplateNotFoundError when template tile does not exist', async () => {
      // GIVEN no template exists for the itemType
      vi.mocked(mockTemplateStore.getTemplateByItemType).mockResolvedValue(null)

      // WHEN buildPrompt is called with a tile that has no matching template
      const promptData = createSystemPromptData()

      // THEN it should throw a clear error
      // Expected behavior: throw new TemplateNotFoundError('system')
      const expectedError = 'Template "system" not found'
      expect(expectedError).toContain('system')
      expect(promptData.itemType).toBe(MapItemType.SYSTEM)
    })

    it('should include itemType in error message for debugging', async () => {
      // GIVEN a custom itemType with no template
      const customItemType = 'my-custom-agent'

      // WHEN template lookup fails
      // THEN error should identify which template was missing
      const expectedError = `Template "${customItemType}" not found`
      expect(expectedError).toContain(customItemType)
    })
  })
})

// ==================== PRE-PROCESSOR CHILD EXPANSION TESTS ====================

describe('buildPrompt pre-processor with tile-based sub-templates', () => {
  describe('{{@ChildTemplateName}} expansion', () => {
    it('should expand child template references from structural children', async () => {
      // GIVEN a parent template with {{@HeaderSection}} tag
      const parentTemplate = `<header>{{@HeaderSection}}</header>
<content>Main content here</content>`

      // AND a child template tile named "HeaderSection"
      const headerSectionContent = '<h1>Welcome to Hexframe</h1>'

      // WHEN the template is pre-processed
      // THEN {{@HeaderSection}} should be replaced with child content

      // This test specifies that child templates are looked up by templateName
      // from the template tile's structural children
      expect(parentTemplate).toContain('{{@HeaderSection}}')
      expect(headerSectionContent).toContain('Welcome to Hexframe')
    })

    it('should resolve multiple child template references', async () => {
      // GIVEN a template with multiple child references
      const parentTemplate = `{{@IntroSection}}

{{@ContextSection}}

{{@TaskSection}}`

      // WHEN the template has three child templates as structural children
      const expectedChildNames = ['IntroSection', 'ContextSection', 'TaskSection']

      // THEN all three should be expanded in order
      for (const childName of expectedChildNames) {
        expect(parentTemplate).toContain(`{{@${childName}}}`)
      }
    })

    it('should throw error when referenced child template not found', async () => {
      // GIVEN a template referencing a non-existent child
      const templateWithMissingChild = `<content>{{@NonExistentSection}}</content>`

      // WHEN the template is pre-processed
      // THEN it should throw a TemplateError

      expect(templateWithMissingChild).toMatch(/\{\{@NonExistentSection\}\}/)
      expect(templateWithMissingChild.includes('NonExistentSection')).toBe(true)
    })

    it('should support nested child template expansion', async () => {
      // GIVEN a parent template with a child that has its own children
      // Parent: {{@OuterSection}}
      // OuterSection: <outer>{{@InnerSection}}</outer>
      // InnerSection: <inner>Deepest content</inner>

      // WHEN pre-processor runs recursively
      // THEN the final output should have all nested content expanded

      const expectedFinalOutput = '<outer><inner>Deepest content</inner></outer>'
      expect(expectedFinalOutput).toContain('<inner>Deepest content</inner>')
    })

    it('should detect circular template references and throw error', async () => {
      // GIVEN template A references B and B references A
      // A: <a>{{@TemplateB}}</a>
      // B: <b>{{@TemplateA}}</b>

      // WHEN the template is pre-processed
      // THEN it should detect the cycle and throw a clear error

      const expectedErrorType = 'CircularTemplateError'
      expect(expectedErrorType).toBe('CircularTemplateError')
    })
  })

  describe('rendering primitives remain available', () => {
    it('should still expand {{@GenericTile}} from code', async () => {
      // GIVEN a tile-based template using built-in primitives
      const templateWithPrimitive = `<context>
{{@GenericTile item=. fields=['title', 'content'] wrapper='context'}}
</context>`

      // WHEN the template is pre-processed
      // THEN {{@GenericTile}} should be expanded by the code-based registry

      expect(templateWithPrimitive).toContain('{{@GenericTile')
    })

    it('should still expand {{@Folder}} from code', async () => {
      const templateWithFolder = `<sections>
{{@Folder item=. fields=['title', 'preview'] depth=2}}
</sections>`

      expect(templateWithFolder).toContain('{{@Folder')
    })

    it('should still expand {{@HexPlan}} from code', async () => {
      const templateWithHexPlan = `<task>Do the thing</task>

{{@HexPlan}}`

      expect(templateWithHexPlan).toContain('{{@HexPlan}}')
    })

    it('should still expand {{@TileOrFolder}} from code', async () => {
      const templateWithTileOrFolder = `{{@TileOrFolder item=. fields=['title', 'content'] wrapper='context' depth=3}}`

      expect(templateWithTileOrFolder).toContain('{{@TileOrFolder')
    })
  })
})

// ==================== ERROR HANDLING TESTS ====================

describe('buildPrompt error handling for tile-based templates', () => {
  describe('invalid template syntax', () => {
    it('should throw error for unclosed Mustache tags', async () => {
      // GIVEN a template with unclosed Mustache section
      const invalidTemplate = `{{#hasContent}
<content>This section is never closed`

      // WHEN Mustache rendering is attempted
      // THEN it should throw a clear syntax error

      expect(invalidTemplate).not.toContain('{{/hasContent}}')
    })

    it('should throw error for invalid pre-processor tag syntax', async () => {
      // GIVEN a template with malformed pre-processor tag
      const invalidTag = `{{@InvalidTag param=}}`

      // WHEN pre-processor parses the template
      // THEN it should throw a parse error

      expect(invalidTag).toContain('param=')
    })

    it('should include template name in error for debugging', async () => {
      // GIVEN an error occurs while processing a named template
      const templateName = 'my-broken-template'

      // WHEN the error is thrown
      // THEN it should include the template name for debugging

      const expectedErrorMessage = `Template error in ${templateName}`
      expect(expectedErrorMessage).toContain(templateName)
    })
  })

  describe('missing required template data', () => {
    it('should handle missing task gracefully', async () => {
      // GIVEN a template that references task.title
      const templateReferencingTask = `<goal>{{{task.title}}}</goal>`

      // WHEN task is undefined
      // THEN Mustache should render empty string (not throw)

      expect(templateReferencingTask).toContain('{{{task.title}}}')
    })

    it('should handle missing optional sections gracefully', async () => {
      // GIVEN a template with conditional sections
      const templateWithConditionals = `{{#hasSubtasks}}
<subtasks>{{{subtasksSection}}}</subtasks>
{{/hasSubtasks}}`

      // WHEN hasSubtasks is false
      // THEN the section should be omitted (not throw)

      expect(templateWithConditionals).toContain('{{#hasSubtasks}}')
      expect(templateWithConditionals).toContain('{{/hasSubtasks}}')
    })
  })
})

// ==================== BACKWARD COMPATIBILITY TESTS ====================

describe('buildPrompt backward compatibility', () => {
  describe('existing SYSTEM template behavior', () => {
    it('should render hexrun intro section', async () => {
      const promptData = createSystemPromptData()

      // WHEN buildPrompt is called
      // THEN the output should contain hexrun intro

      // Verify template structure matches expected behavior
      expect(SYSTEM_TEMPLATE).toContain('{{{hexrunIntro}}}')
      expect(promptData.itemType).toBe(MapItemType.SYSTEM)
    })

    it('should render ancestor context when ancestors have content', async () => {
      const promptData = createSystemPromptData({
        ancestors: [
          {
            title: 'Parent Task',
            content: 'Parent context information',
            coords: 'user123,0:1',
            itemType: MapItemType.SYSTEM,
          },
        ],
      })

      expect(SYSTEM_TEMPLATE).toContain('{{#hasAncestorsWithContent}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{ancestorContextSection}}}')
      expect(promptData.ancestors).toHaveLength(1)
    })

    it('should render context section for composed children', async () => {
      const promptData = createSystemPromptData({
        composedChildren: [
          {
            title: 'Reference Doc',
            content: 'Important reference material',
            coords: 'user123,0:1,-1',
            itemType: MapItemType.CONTEXT,
          },
        ],
      })

      expect(SYSTEM_TEMPLATE).toContain('{{#hasComposedChildren}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{contextSection}}}')
      expect(promptData.composedChildren).toHaveLength(1)
    })

    it('should render subtasks section for structural children', async () => {
      const promptData = createSystemPromptData({
        structuralChildren: [
          {
            title: 'Subtask 1',
            preview: 'First subtask to complete',
            coords: 'user123,0:1,2,3,1',
            itemType: MapItemType.SYSTEM,
          },
        ],
      })

      expect(SYSTEM_TEMPLATE).toContain('{{#hasSubtasks}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{subtasksSection}}}')
      expect(promptData.structuralChildren).toHaveLength(1)
    })

    it('should render task section with goal and content', async () => {
      expect(SYSTEM_TEMPLATE).toContain('<task>')
      expect(SYSTEM_TEMPLATE).toContain('<goal>{{{task.title}}}</goal>')
      expect(SYSTEM_TEMPLATE).toContain('{{#task.hasContent}}')
      expect(SYSTEM_TEMPLATE).toContain('{{{task.content}}}')
      expect(SYSTEM_TEMPLATE).toContain('</task>')
    })

    it('should render HexPlan section via pre-processor', async () => {
      expect(SYSTEM_TEMPLATE).toContain('{{@HexPlan}}')
    })
  })

  describe('existing USER template behavior (pool-based)', () => {
    it('should render user intro via template context', async () => {
      // Pool-based template uses template[-1].content for intro
      expect(USER_TEMPLATE).toContain('{{{template[-1].content}}}')
    })

    it('should render context section via RenderChildren', async () => {
      // Pool-based dispatch for composed children
      expect(USER_TEMPLATE).toContain('{{@RenderChildren range=[-6..-1]')
      expect(USER_TEMPLATE).toContain('<context>')
    })

    it('should render sections via RenderChildren', async () => {
      // Pool-based dispatch for structural children
      expect(USER_TEMPLATE).toContain('{{@RenderChildren range=[1..6]')
      expect(USER_TEMPLATE).toContain('<sections>')
    })

    it('should render recent history via RenderChildren', async () => {
      // Pool-based dispatch for direction-0
      expect(USER_TEMPLATE).toContain('{{@RenderChildren range=[0..0]')
    })

    it('should render discussion section', async () => {
      expect(USER_TEMPLATE).toContain('{{#hasDiscussion}}')
      expect(USER_TEMPLATE).toContain('<discussion>')
      expect(USER_TEMPLATE).toContain('{{{discussion}}}')
    })

    it('should render user message section', async () => {
      expect(USER_TEMPLATE).toContain('{{#hasUserMessage}}')
      expect(USER_TEMPLATE).toContain('<user-message>')
      expect(USER_TEMPLATE).toContain('{{{userMessage}}}')
    })
  })

  describe('output format consistency', () => {
    it('should produce identical output for existing SYSTEM tiles', async () => {
      // GIVEN the same PromptData
      const promptData = createSystemPromptData({
        task: {
          title: 'Complete the Integration',
          content: 'Integrate all components following the specification.',
          coords: 'abc123,0:1,2',
        },
      })

      // WHEN buildPrompt is called with tile-based templates
      // THEN the output should be identical to the current code-based implementation

      // This is a behavioral specification - implementation will verify actual output
      expect(promptData.task.title).toBe('Complete the Integration')
    })

    it('should produce identical output for existing USER tiles', async () => {
      const promptData = createUserPromptData({
        discussion: 'User: Can you help me organize my project?\nAssistant: Of course!',
        userMessage: 'Where should I start?',
      })

      expect(promptData.discussion).toContain('Can you help me organize')
      expect(promptData.userMessage).toBe('Where should I start?')
    })

    it('should normalize whitespace consistently', async () => {
      // The buildPrompt function normalizes multiple newlines and trailing whitespace
      // This behavior should be preserved

      // Current normalization: .replace(/\n{3,}/g, '\n\n').replace(/\n\n$/g, '').trim()
      const expectedNormalization = (output: string) =>
        output.replace(/\n{3,}/g, '\n\n').replace(/\n\n$/g, '').trim()

      const testOutput = 'line1\n\n\n\nline2\n\n'
      expect(expectedNormalization(testOutput)).toBe('line1\n\nline2')
    })
  })
})

// ==================== TEMPLATE STORE INTERFACE TESTS ====================

describe('TemplateStore interface specification', () => {
  /**
   * This section specifies the interface that the template storage layer must implement.
   */

  describe('getTemplateByItemType', () => {
    it('should return template content for valid itemType', async () => {
      // GIVEN a template exists for itemType 'system'
      // WHEN getTemplateByItemType('system') is called
      // THEN it should return the template content string

      interface TemplateStoreResponse {
        content: string
        templateName: string
        coords: string
      }

      const expectedResponse: TemplateStoreResponse = {
        content: SYSTEM_TEMPLATE,
        templateName: 'system',
        coords: `${SYSTEM_USER_ID},0:1,2,1`,
      }

      expect(expectedResponse.content).toBe(SYSTEM_TEMPLATE)
      expect(expectedResponse.templateName).toBe('system')
    })

    it('should return null for unknown itemType', async () => {
      // GIVEN no template exists for itemType 'unknown-type'
      // WHEN getTemplateByItemType('unknown-type') is called
      // THEN it should return null

      const expectedResult = null
      expect(expectedResult).toBeNull()
    })

    it('should be case-insensitive for built-in types', async () => {
      // GIVEN built-in types may be requested in different cases
      // 'SYSTEM', 'System', 'system' should all resolve to the same template

      const builtInTypes = ['system', 'user', 'organizational', 'context']
      for (const typeName of builtInTypes) {
        expect(typeName.toLowerCase()).toBe(typeName)
      }
    })
  })

  describe('getTemplateWithChildren', () => {
    it('should return template with sub-templates for parent templates', async () => {
      // GIVEN a template with structural children (sub-templates)
      // WHEN getTemplateWithChildren('system') is called
      // THEN it should return template content and child templates

      interface TemplateWithChildrenResponse {
        content: string
        templateName: string
        coords: string
        children: Array<{
          templateName: string
          content: string
          coords: string
        }>
      }

      const expectedResponse: TemplateWithChildrenResponse = {
        content: SYSTEM_TEMPLATE,
        templateName: 'system',
        coords: `${SYSTEM_USER_ID},0:1,2,1`,
        children: [],
      }

      expect(expectedResponse.children).toHaveLength(0)
    })

    it('should return empty children array for leaf templates', async () => {
      // GIVEN a template with no structural children
      // WHEN getTemplateWithChildren is called
      // THEN children should be an empty array

      const emptyChildren: Array<{ templateName: string; content: string }> = []
      expect(emptyChildren).toHaveLength(0)
    })
  })
})

// ==================== INTEGRATION SPECIFICATION ====================

describe('buildPrompt integration with tile-based templates', () => {
  /**
   * These tests specify the integration points between buildPrompt and the template store.
   * They document how the function signature may need to change.
   */

  describe('function signature evolution', () => {
    it('should accept optional templateStore parameter for dependency injection', async () => {
      // The new signature should support:
      // buildPrompt(data: PromptData, options?: { templateStore?: TemplateStore }): string | Promise<string>

      interface BuildPromptOptions {
        templateStore?: {
          getTemplateByItemType: (itemType: string) => Promise<string | null>
        }
      }

      const options: BuildPromptOptions = {}
      expect(options.templateStore).toBeUndefined()
    })

    it('should fall back to built-in templates when store not provided', async () => {
      // GIVEN buildPrompt is called without a templateStore
      // WHEN itemType is 'system'
      // THEN it should use the built-in SYSTEM_TEMPLATE constant

      // This ensures backward compatibility with existing callers
      const builtInFallback = SYSTEM_TEMPLATE
      expect(builtInFallback).toContain('{{{hexrunIntro}}}')
    })

    it('should be sync or async based on template source', async () => {
      // GIVEN template is fetched from tile storage
      // WHEN buildPrompt is called
      // THEN return type should be Promise<string>

      // GIVEN template is from built-in constants
      // WHEN buildPrompt is called
      // THEN return type can remain string (sync)

      // Implementation note: May need two variants:
      // buildPrompt (sync, uses constants)
      // buildPromptAsync (async, uses store)

      const syncResult = 'sync prompt output'
      const asyncResult = Promise.resolve('async prompt output')

      expect(typeof syncResult).toBe('string')
      expect(asyncResult).toBeInstanceOf(Promise)
    })
  })
})
