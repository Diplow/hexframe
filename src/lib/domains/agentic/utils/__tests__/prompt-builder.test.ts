import { describe, it, expect } from 'vitest'
import { buildPrompt, generateParentHexplanContent, generateLeafHexplanContent, type PromptData } from '~/lib/domains/agentic/utils'
import { MapItemType } from '~/lib/domains/mapping'
import { parseCustomTags, parseParams } from '~/lib/domains/agentic/templates/_pre-processor/_parser'
import { GenericTile } from '~/lib/domains/agentic/templates/_templates/_generic-tile'
import { Folder } from '~/lib/domains/agentic/templates/_templates/_folder'

const DEFAULT_MCP_SERVER = 'hexframe'

// Helper to create test data with defaults
function createTestData(overrides: Partial<PromptData> & { task: PromptData['task'] }): PromptData {
  return {
    ancestors: [],
    composedChildren: [],
    structuralChildren: [],
    hexPlan: '📋 Execute the task',
    mcpServerName: DEFAULT_MCP_SERVER,
    itemType: MapItemType.SYSTEM,
    ...overrides
  }
}

describe('buildPrompt - v5 Top-Down Context + Root Hexplan', () => {
  // ==================== BASIC STRUCTURE TESTS ====================
  describe('Basic Structure', () => {
    it('should generate sections in correct order: ancestor-context, context, subtasks, task, hexplan', () => {
      const data = createTestData({
        task: { title: 'Test Task', content: 'Test content', coords: 'userId,0:1' },
        ancestors: [{ title: 'Parent', content: 'Parent context', coords: 'userId,0:', itemType: MapItemType.SYSTEM }],
        composedChildren: [{ title: 'Context', content: 'Context info', coords: 'userId,0:1,-1' }],
        structuralChildren: [{ title: 'Subtask 1', preview: 'Preview 1', coords: 'userId,0:1,1' }],
        hexPlan: '📋 Step 1'
      })

      const result = buildPrompt(data)

      // Check all sections appear
      expect(result).toContain('<ancestor-context>')
      expect(result).toContain('<context title="Context" coords="userId,0:1,-1">')
      expect(result).toContain('<subtasks>')
      expect(result).toContain('<task>')
      expect(result).toContain('<hexplan')

      // Check order
      const ancestorIndex = result.indexOf('<ancestor-context>')
      const contextIndex = result.indexOf('<context title=')
      const subtasksIndex = result.indexOf('<subtasks>')
      const taskIndex = result.indexOf('<task>')
      const hexplanIndex = result.indexOf('<hexplan')

      expect(ancestorIndex).toBeLessThan(contextIndex)
      expect(contextIndex).toBeLessThan(subtasksIndex)
      expect(subtasksIndex).toBeLessThan(taskIndex)
      expect(taskIndex).toBeLessThan(hexplanIndex)
    })

    it('should separate sections with blank lines', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [{ title: 'C1', content: 'Content 1', coords: 'userId,0:1,-1' }],
        structuralChildren: [{ title: 'S1', preview: 'Preview 1', coords: 'userId,0:1,1' }],
        hexPlan: '📋 Plan content'
      })

      const result = buildPrompt(data)

      expect(result).toMatch(/<\/context>\n\n<subtasks>/)
      expect(result).toMatch(/<\/subtasks>\n\n<task>/)
      expect(result).toMatch(/<\/task>\n\n<hexplan/)
    })

    it('should not include hardcoded Hexframe philosophy', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      expect(result).not.toContain('# Hexframe Orchestration')
      expect(result).not.toContain('agent-planning-protocol')
    })
  })

  // ==================== ANCESTOR CONTEXT SECTION TESTS ====================
  describe('Ancestor Context Section', () => {
    it('should be empty when no ancestors', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        ancestors: []
      })

      const result = buildPrompt(data)

      expect(result).not.toContain('<ancestor-context>')
    })

    it('should include ancestors with title and content', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1,2' },
        ancestors: [
          { title: 'Root', content: 'Root context', coords: 'userId,0:', itemType: MapItemType.SYSTEM },
          { title: 'Parent', content: 'Parent context', coords: 'userId,0:1', itemType: MapItemType.SYSTEM }
        ]
      })

      const result = buildPrompt(data)

      expect(result).toContain('<ancestor-context>')
      expect(result).toContain('<ancestor title="Root" coords="userId,0:">')
      expect(result).toContain('Root context')
      expect(result).toContain('<ancestor title="Parent" coords="userId,0:1">')
      expect(result).toContain('Parent context')
      expect(result).toContain('</ancestor-context>')
    })

    it('should skip ancestors with empty content', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1,2' },
        ancestors: [
          { title: 'EmptyRoot', content: undefined, coords: 'userId,0:', itemType: MapItemType.SYSTEM },
          { title: 'Parent', content: 'Parent context', coords: 'userId,0:1', itemType: MapItemType.SYSTEM }
        ]
      })

      const result = buildPrompt(data)

      expect(result).toContain('<ancestor-context>')
      expect(result).not.toContain('EmptyRoot')
      expect(result).toContain('Parent context')
    })
  })

  // ==================== CONTEXT SECTION TESTS ====================
  describe('Context Section', () => {
    it('should be empty when no composed children', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      // The context section tag should not appear (prose mentioning <context> is ok)
      expect(result).not.toContain('<context title=')
    })

    it('should include composed children with title, content and coords', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [
          { title: 'Context 1', content: 'Content 1', coords: 'userId,0:1,-1' },
          { title: 'Context 2', content: 'Content 2', coords: 'userId,0:1,-2' }
        ]
      })

      const result = buildPrompt(data)

      expect(result).toContain('<context title="Context 1" coords="userId,0:1,-1">')
      expect(result).toContain('Content 1')
      expect(result).toContain('</context>')
      expect(result).toContain('<context title="Context 2" coords="userId,0:1,-2">')
      expect(result).toContain('Content 2')
    })

    it('should skip composed children with empty content', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [
          { title: 'Empty', content: '', coords: 'userId,0:1,-1' },
          { title: 'Valid', content: 'Valid content', coords: 'userId,0:1,-2' },
          { title: 'Whitespace', content: '   \n\t  ', coords: 'userId,0:1,-3' }
        ]
      })

      const result = buildPrompt(data)

      expect(result).toContain('Valid')
      expect(result).toContain('Valid content')
      expect(result).not.toContain('Empty')
      expect(result).not.toContain('Whitespace')
    })

    it('should escape XML special characters in composed children', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [
          { title: 'Title <with> & "special" chars', content: 'Content with <xml> & \'quotes\'', coords: 'userId,0:1,-1' }
        ]
      })

      const result = buildPrompt(data)

      // Only attributes are escaped, content bodies preserve raw text for LLM processing
      expect(result).toContain('title="Title &lt;with&gt; &amp; &quot;special&quot; chars"')
      expect(result).toContain('Content with <xml> & \'quotes\'')
    })
  })

  // ==================== SUBTASKS SECTION TESTS ====================
  describe('Subtasks Section', () => {
    it('should be empty when no structural children', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      expect(result).not.toContain('<subtasks>')
    })

    it('should include title and coords attributes for each subtask-preview', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        structuralChildren: [
          { title: 'Subtask 1', preview: 'Preview 1', coords: 'userId,0:1,1' },
          { title: 'Subtask 2', preview: 'Preview 2', coords: 'userId,0:1,2' }
        ],
        hexPlan: '📋 Step 1'
      })

      const result = buildPrompt(data)

      expect(result).toContain('<subtask-preview title="Subtask 1" coords="userId,0:1,1">')
      expect(result).toContain('<subtask-preview title="Subtask 2" coords="userId,0:1,2">')
    })

    it('should include preview content inside subtask-preview', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        structuralChildren: [
          { title: 'My Subtask', preview: 'My Preview', coords: 'userId,0:1,1' }
        ],
        hexPlan: '📋 Step 1'
      })

      const result = buildPrompt(data)

      expect(result).toContain('<subtask-preview title="My Subtask" coords="userId,0:1,1">')
      expect(result).toContain('My Preview')
      expect(result).toContain('</subtask-preview>')
    })

    it('should escape XML special characters in subtask-preview', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        structuralChildren: [
          { title: 'Task <with> & chars', preview: 'Preview "with" \'quotes\'', coords: 'userId,0:1,1' }
        ],
        hexPlan: '📋 Step 1'
      })

      const result = buildPrompt(data)

      // Only attributes are escaped, content bodies preserve raw text for LLM processing
      expect(result).toContain('title="Task &lt;with&gt; &amp; chars"')
      expect(result).toContain('Preview "with" \'quotes\'')
    })

    it('should not include meta tasks (read history, mark done)', () => {
      const data = createTestData({
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        structuralChildren: [
          { title: 'User Subtask', preview: 'Preview', coords: 'userId,0:1,1' }
        ],
        hexPlan: '📋 Step 1'
      })

      const result = buildPrompt(data)

      expect(result).not.toContain('Read HexPlan')
      expect(result).not.toContain('Mark Task Complete')
      expect(result).not.toContain('subagent="false"')
    })
  })

  // ==================== TASK SECTION TESTS ====================
  describe('Task Section', () => {
    it('should always include task section', () => {
      const data = createTestData({
        task: { title: 'Test Task', content: 'Test content', coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      expect(result).toContain('<task>')
      expect(result).toContain('</task>')
    })

    it('should include goal wrapper for title', () => {
      const data = createTestData({
        task: { title: 'My Test Goal', content: 'Content', coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      expect(result).toContain('<goal>My Test Goal</goal>')
    })

    it('should include task content', () => {
      const data = createTestData({
        task: { title: 'Title', content: 'This is the task content', coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      expect(result).toContain('This is the task content')
    })

    it('should handle empty task content', () => {
      const data = createTestData({
        task: { title: 'Title', content: '', coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      expect(result).toContain('<task>')
      expect(result).toContain('<goal>Title</goal>')
      expect(result).toContain('</task>')
    })

    it('should escape XML special characters in task', () => {
      const data = createTestData({
        task: {
          title: 'Title <with> & chars',
          content: 'Content "with" \'special\' characters',
          coords: 'userId,0:1'
        }
      })

      const result = buildPrompt(data)

      // Title in <goal> is escaped, content body preserves raw text for LLM processing
      expect(result).toContain('Title &lt;with&gt; &amp; chars')
      expect(result).toContain('Content "with" \'special\' characters')
    })
  })

  // ==================== HEXPLAN SECTION TESTS ====================
  describe('Hexplan Section', () => {
    describe('Pending Steps', () => {
      it('should show hexplan content when plan has pending steps', () => {
        const data = createTestData({
          task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
          hexPlan: '🟡 STARTED: Working on task...\n📋 Step 1'
        })

        const result = buildPrompt(data)

        expect(result).toContain('<hexplan coords="userId,0:1,0">')
        expect(result).toContain('🟡 STARTED: Working on task...')
        expect(result).toContain('</hexplan>')
        expect(result).toContain('<execution-instructions>')
        expect(result).toContain('Execute the NEXT PENDING STEP')
      })

      it('should include parent tile orchestration instructions when has subtasks', () => {
        const data = createTestData({
          task: { title: 'Parent', content: 'Content', coords: 'userId,0:1' },
          structuralChildren: [
            { title: 'Child', preview: 'Preview', coords: 'userId,0:1,1' }
          ],
          hexPlan: '🟡 STARTED\n📋 1. Execute "Child" → userId,0:1,1'
        })

        const result = buildPrompt(data)

        expect(result).toContain('<execution-instructions>')
        expect(result).toContain('mcp__hexframe__hexecute')
        expect(result).toContain('Task tool')
        expect(result).toContain('Execute ONLY ONE step')
      })

      it('should use custom MCP server name in orchestration instructions', () => {
        const data = createTestData({
          task: { title: 'Parent', content: 'Content', coords: 'userId,0:1' },
          structuralChildren: [
            { title: 'Child', preview: 'Preview', coords: 'userId,0:1,1' }
          ],
          hexPlan: '🟡 STARTED\n📋 1. Execute "Child" → userId,0:1,1',
          mcpServerName: 'debughexframe'
        })

        const result = buildPrompt(data)

        expect(result).toContain('mcp__debughexframe__hexecute')
        expect(result).not.toContain('mcp__hexframe__hexecute')
      })

      it('should include leaf tile direct execution instructions when no subtasks', () => {
        const data = createTestData({
          task: { title: 'Leaf', content: 'Content', coords: 'userId,0:1' },
          hexPlan: '🟡 STARTED\n📋 Execute the task'
        })

        const result = buildPrompt(data)

        expect(result).toContain('<execution-instructions>')
        expect(result).toContain('Execute the task directly')
        expect(result).toContain('<task> content and <context>')
      })
    })

    describe('Complete Status', () => {
      it('should show COMPLETE status when no pending steps', () => {
        const data = createTestData({
          task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
          hexPlan: '✅ All done!'
        })

        const result = buildPrompt(data)

        expect(result).toContain('<hexplan-status>COMPLETE</hexplan-status>')
        expect(result).toContain('All steps completed')
      })
    })

    describe('Blocked Status', () => {
      it('should show BLOCKED status when blocked steps exist', () => {
        const data = createTestData({
          task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
          hexPlan: '🔴 BLOCKED: Need API key'
        })

        const result = buildPrompt(data)

        expect(result).toContain('<hexplan-status>BLOCKED</hexplan-status>')
        expect(result).toContain('blocked steps')
      })
    })

    describe('XML Escaping', () => {
      it('should preserve raw text in hexplan content for LLM processing', () => {
        const data = createTestData({
          task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
          hexPlan: 'Plan with <tags> & "quotes"\n📋 Step'
        })

        const result = buildPrompt(data)

        // Content bodies preserve raw text for LLM processing
        expect(result).toContain('Plan with <tags> & "quotes"')
      })
    })
  })

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle minimal tile (only task and hexplan)', () => {
      const data = createTestData({
        task: { title: 'Minimal Task', content: undefined, coords: 'userId,0:1' }
      })

      const result = buildPrompt(data)

      // Should have task and hexplan sections only
      expect(result).toContain('<task>')
      expect(result).toContain('<hexplan')
      expect(result).not.toContain('<context title=')
      expect(result).not.toContain('<subtasks>')
    })

    it('should handle multiline content with proper formatting', () => {
      const data = createTestData({
        task: {
          title: 'Test',
          content: 'Line 1\nLine 2\n\nLine 4',
          coords: 'userId,0:1'
        }
      })

      const result = buildPrompt(data)

      expect(result).toContain('Line 1\nLine 2\n\nLine 4')
    })
  })
})

// ==================== HEXPLAN CONTENT GENERATORS ====================
describe('Hexplan Content Generators', () => {
  describe('generateParentHexplanContent', () => {
    it('should generate hexplan with numbered steps from children', () => {
      const children = [
        { title: 'Step One', coords: 'userId,0:1,1' },
        { title: 'Step Two', coords: 'userId,0:1,2' }
      ]

      const result = generateParentHexplanContent(children)

      expect(result).toContain('🟡 STARTED')
      expect(result).toContain('**Steps:**')
      expect(result).toContain('📋 1. Execute "Step One" → userId,0:1,1')
      expect(result).toContain('📋 2. Execute "Step Two" → userId,0:1,2')
      expect(result).toContain('(initialized)')
    })

    it('should handle single child', () => {
      const children = [{ title: 'Only Child', coords: 'userId,0:1,1' }]

      const result = generateParentHexplanContent(children)

      expect(result).toContain('📋 1. Execute "Only Child" → userId,0:1,1')
      expect(result).not.toContain('📋 2.')
    })

    it('should generate leaf tasks list when allLeafTasks provided', () => {
      const children = [
        { title: 'Parent 1', coords: 'userId,0:1,1' },
        { title: 'Parent 2', coords: 'userId,0:1,2' }
      ]
      const allLeafTasks = [
        { title: 'Leaf A', coords: 'userId,0:1,1,1' },
        { title: 'Leaf B', coords: 'userId,0:1,1,2' },
        { title: 'Leaf C', coords: 'userId,0:1,2,1' }
      ]

      const result = generateParentHexplanContent(children, allLeafTasks)

      expect(result).toContain('🟡 STARTED')
      expect(result).toContain('**Leaf Tasks:**')
      expect(result).toContain('📋 1. "Leaf A" → userId,0:1,1,1')
      expect(result).toContain('📋 2. "Leaf B" → userId,0:1,1,2')
      expect(result).toContain('📋 3. "Leaf C" → userId,0:1,2,1')
      expect(result).not.toContain('**Steps:**')
      expect(result).toContain('**Findings:**')
    })
  })

  describe('generateLeafHexplanContent', () => {
    it('should generate hexplan with task title', () => {
      const result = generateLeafHexplanContent('My Task', undefined)

      expect(result).toContain('🟡 STARTED: "My Task"')
      expect(result).toContain('📋 Execute the task')
      expect(result).toContain('(initialized)')
    })

    it('should include instruction when provided', () => {
      const result = generateLeafHexplanContent('My Task', 'Focus on performance')

      expect(result).toContain('**Instruction:** Focus on performance')
    })

    it('should not include instruction section when undefined', () => {
      const result = generateLeafHexplanContent('My Task', undefined)

      expect(result).not.toContain('**Instruction:**')
    })
  })
})

// ==================== UNSUPPORTED ITEM TYPES ====================
describe('buildPrompt error handling for unsupported itemTypes', () => {
  it('should throw error for ORGANIZATIONAL itemType', () => {
    const data = createTestData({
      task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
      itemType: MapItemType.ORGANIZATIONAL
    })

    expect(() => buildPrompt(data)).toThrow('ORGANIZATIONAL tiles cannot be executed')
  })

  it('should render USER itemType with new structure', () => {
    const data = createTestData({
      task: { title: 'Test', content: 'Content', coords: 'userId,0:' },
      itemType: MapItemType.USER,
      hexPlan: 'User goal: Build a project',
      discussion: 'User asked about creating tiles'
    })

    const result = buildPrompt(data)

    // USER templates have different structure than SYSTEM
    expect(result).toContain('<user-intro>')
    expect(result).toContain('default interlocutor')
    expect(result).not.toContain('<hexrun-intro>')
    expect(result).not.toContain('<task>')
    expect(result).not.toContain('<goal>')
    expect(result).toContain('<recent-history')
    expect(result).toContain('User goal: Build a project')
    expect(result).toContain('<discussion>')
    expect(result).toContain('User asked about creating tiles')
  })

  it('should throw error for CONTEXT itemType', () => {
    const data = createTestData({
      task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
      itemType: MapItemType.CONTEXT
    })

    expect(() => buildPrompt(data)).toThrow('CONTEXT tile templates not yet implemented')
  })
})

// ==================== TEMPLATE SYSTEM TESTS ====================
describe('Template System - Pre-processor and Templates', () => {
  describe('parseCustomTags and parseParams', () => {
    it('should parse simple custom tags', () => {
      const template = '{{@HexPlan}}'
      const tags = parseCustomTags(template)

      expect(tags).toHaveLength(1)
      expect(tags[0]!.templateName).toBe('HexPlan')
    })

    it('should parse custom tags with parameters', () => {
      const template = "{{@GenericTile fields=['title', 'content'] wrapper='context'}}"
      const tags = parseCustomTags(template)

      expect(tags).toHaveLength(1)
      expect(tags[0]!.templateName).toBe('GenericTile')
      expect(tags[0]!.params.fields).toEqual(['title', 'content'])
      expect(tags[0]!.params.wrapper).toBe('context')
    })

    it('should parse array parameters', () => {
      const result = parseParams("fields=['title', 'content', 'preview']")

      expect(result.fields).toEqual(['title', 'content', 'preview'])
    })

    it('should parse numeric parameters', () => {
      const result = parseParams('depth=3')

      expect(result.depth).toBe(3)
    })

    it('should parse boolean parameters', () => {
      const resultTrue = parseParams('enabled=true')
      const resultFalse = parseParams('enabled=false')

      expect(resultTrue.enabled).toBe(true)
      expect(resultFalse.enabled).toBe(false)
    })
  })

  describe('GenericTile template', () => {
    it('should render tile with title and content', () => {
      const tile = { title: 'Test Title', content: 'Test content', coords: 'userId,0:1' }
      const result = GenericTile(tile, ['title', 'content'])

      expect(result).toContain('Test Title')
      expect(result).toContain('Test content')
    })

    it('should render with wrapper tag', () => {
      const tile = { title: 'Test', content: 'Content', coords: 'userId,0:1' }
      const result = GenericTile(tile, ['title', 'content'], 'context')

      expect(result).toContain('<context title="Test" coords="userId,0:1">')
      expect(result).toContain('</context>')
    })

    it('should escape XML in title attribute', () => {
      const tile = { title: 'Test <>&"\'', content: 'Content', coords: 'userId,0:1' }
      const result = GenericTile(tile, ['title', 'content'], 'context')

      expect(result).toContain('title="Test &lt;&gt;&amp;&quot;&apos;"')
    })

    it('should return empty string for undefined tile', () => {
      const result = GenericTile(undefined, ['title', 'content'])

      expect(result).toBe('')
    })
  })

  describe('Folder template', () => {
    it('should render organizational tile as folder', () => {
      const tile = {
        title: 'Projects',
        itemType: MapItemType.ORGANIZATIONAL,
        coords: 'userId,0:1',
        children: [
          { title: 'Child 1', content: 'Content 1', coords: 'userId,0:1,1' },
          { title: 'Child 2', content: 'Content 2', coords: 'userId,0:1,2' }
        ]
      }

      const result = Folder(tile, ['title', 'content'], 3)

      expect(result).toContain('<folder title="Projects">')
      expect(result).toContain('Child 1')
      expect(result).toContain('Child 2')
      expect(result).toContain('</folder>')
    })

    it('should render nested organizational tiles recursively', () => {
      const tile = {
        title: 'Root',
        itemType: MapItemType.ORGANIZATIONAL,
        coords: 'userId,0:1',
        children: [
          {
            title: 'Nested Folder',
            itemType: MapItemType.ORGANIZATIONAL,
            coords: 'userId,0:1,1',
            children: [
              { title: 'Deep Child', content: 'Deep content', coords: 'userId,0:1,1,1' }
            ]
          }
        ]
      }

      const result = Folder(tile, ['title', 'content'], 3)

      expect(result).toContain('<folder title="Root">')
      expect(result).toContain('<folder title="Nested Folder">')
      expect(result).toContain('Deep Child')
    })

    it('should respect depth limit', () => {
      const tile = {
        title: 'Root',
        itemType: MapItemType.ORGANIZATIONAL,
        coords: 'userId,0:1',
        children: [
          {
            title: 'Level 1',
            itemType: MapItemType.ORGANIZATIONAL,
            coords: 'userId,0:1,1',
            children: []
          }
        ]
      }

      const result = Folder(tile, ['title'], 1)

      expect(result).toContain('<folder title="Root">')
      expect(result).toContain('collapsed="true"')
    })

    it('should render empty folder when no children', () => {
      const tile = {
        title: 'Empty Folder',
        itemType: MapItemType.ORGANIZATIONAL,
        coords: 'userId,0:1',
        children: []
      }

      const result = Folder(tile, ['title'], 3)

      expect(result).toBe('<folder title="Empty Folder" />')
    })
  })

  describe('USER template structure', () => {
    it('should render organizational context children as folders', () => {
      const data = createTestData({
        task: { title: 'User Tile', content: '', coords: 'userId,0:' },
        itemType: MapItemType.USER,
        composedChildren: [
          {
            title: 'Reference Folder',
            content: '',
            coords: 'userId,0:-1',
            itemType: MapItemType.ORGANIZATIONAL,
            children: [
              { title: 'Ref 1', content: 'Reference 1 content', coords: 'userId,0:-1,1' },
              { title: 'Ref 2', content: 'Reference 2 content', coords: 'userId,0:-1,2' }
            ]
          }
        ],
        hexPlan: ''
      })

      const result = buildPrompt(data)

      // Context section should have folders for organizational children
      expect(result).toContain('<folder title="Reference Folder">')
      expect(result).toContain('Ref 1')
      expect(result).toContain('Ref 2')
    })

    it('should render structural children as sections (not subtasks)', () => {
      const data = createTestData({
        task: { title: 'User Tile', content: '', coords: 'userId,0:' },
        itemType: MapItemType.USER,
        structuralChildren: [
          {
            title: 'Projects',
            preview: 'My projects folder',
            coords: 'userId,0:1',
            itemType: MapItemType.ORGANIZATIONAL
          },
          {
            title: 'Build App',
            preview: 'Build the app',
            coords: 'userId,0:2',
            itemType: MapItemType.SYSTEM
          }
        ],
        hexPlan: ''
      })

      const result = buildPrompt(data)

      // USER template uses <sections> not <subtasks>
      expect(result).toContain('<sections>')
      expect(result).not.toContain('<subtasks>')
      // Organizational tiles shown as type="folder"
      expect(result).toContain('<section title="Projects" type="folder"')
      expect(result).toContain('<section title="Build App"')
      // Does NOT recurse into children for sections
      expect(result).not.toContain('<folder')
    })

    it('should mix regular and organizational context children', () => {
      const data = createTestData({
        task: { title: 'User Tile', content: '', coords: 'userId,0:' },
        itemType: MapItemType.USER,
        composedChildren: [
          { title: 'Regular Context', content: 'Some context', coords: 'userId,0:-1' },
          {
            title: 'Folder Context',
            content: '',
            coords: 'userId,0:-2',
            itemType: MapItemType.ORGANIZATIONAL,
            children: [
              { title: 'Nested', content: 'Nested content', coords: 'userId,0:-2,1' }
            ]
          }
        ],
        hexPlan: ''
      })

      const result = buildPrompt(data)

      expect(result).toContain('<context title="Regular Context"')
      expect(result).toContain('<folder title="Folder Context">')
    })

    it('should include discussion section when provided', () => {
      const data = createTestData({
        task: { title: 'User Tile', content: '', coords: 'userId,0:' },
        itemType: MapItemType.USER,
        hexPlan: '',
        discussion: 'User is working on a new project'
      })

      const result = buildPrompt(data)

      expect(result).toContain('<discussion>')
      expect(result).toContain('User is working on a new project')
    })

    it('should include recent-history with coords', () => {
      const data = createTestData({
        task: { title: 'User Tile', content: '', coords: 'userId,0:' },
        itemType: MapItemType.USER,
        hexPlan: 'Goal: Complete the tutorial'
      })

      const result = buildPrompt(data)

      expect(result).toContain('<recent-history coords="userId,0:,0">')
      expect(result).toContain('Goal: Complete the tutorial')
    })
  })

  describe('SYSTEM template ancestor filtering', () => {
    it('should only include SYSTEM ancestors', () => {
      const data = createTestData({
        task: { title: 'Deep Task', content: 'Task content', coords: 'userId,0:1,1,1' },
        itemType: MapItemType.SYSTEM,
        ancestors: [
          { title: 'User Root', content: 'User content', coords: 'userId,0:', itemType: MapItemType.USER },
          { title: 'Projects', content: '', coords: 'userId,0:1', itemType: MapItemType.ORGANIZATIONAL },
          { title: 'System Parent', content: 'System context', coords: 'userId,0:1,1', itemType: MapItemType.SYSTEM }
        ],
        hexPlan: '📋 Execute'
      })

      const result = buildPrompt(data)

      // Should include SYSTEM ancestor
      expect(result).toContain('System Parent')
      expect(result).toContain('System context')
      // Should NOT include USER or ORGANIZATIONAL ancestors
      expect(result).not.toContain('User Root')
      expect(result).not.toContain('Projects')
    })

    it('should include chain of SYSTEM ancestors from last SYSTEM up', () => {
      const data = createTestData({
        task: { title: 'Task', content: '', coords: 'userId,0:1,1,1,1' },
        itemType: MapItemType.SYSTEM,
        ancestors: [
          { title: 'User', content: 'user', coords: 'userId,0:', itemType: MapItemType.USER },
          { title: 'System 1', content: 'sys1', coords: 'userId,0:1', itemType: MapItemType.SYSTEM },
          { title: 'System 2', content: 'sys2', coords: 'userId,0:1,1', itemType: MapItemType.SYSTEM },
          { title: 'System 3', content: 'sys3', coords: 'userId,0:1,1,1', itemType: MapItemType.SYSTEM }
        ],
        hexPlan: '📋 Execute'
      })

      const result = buildPrompt(data)

      // Should include all SYSTEM ancestors from the first one
      expect(result).toContain('System 1')
      expect(result).toContain('sys1')
      expect(result).toContain('System 2')
      expect(result).toContain('sys2')
      expect(result).toContain('System 3')
      expect(result).toContain('sys3')
      // Should NOT include USER ancestor
      expect(result).not.toContain('>user<')
    })
  })
})
