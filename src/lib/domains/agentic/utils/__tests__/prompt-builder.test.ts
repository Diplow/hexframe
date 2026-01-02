import { describe, it, expect } from 'vitest'
import { buildPrompt, generateParentHexplanContent, generateLeafHexplanContent, type PromptData } from '~/lib/domains/agentic/utils'
import { MapItemType } from '~/lib/domains/mapping'

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
        ancestors: [{ title: 'Parent', content: 'Parent context', coords: 'userId,0:' }],
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
          { title: 'Root', content: 'Root context', coords: 'userId,0:' },
          { title: 'Parent', content: 'Parent context', coords: 'userId,0:1' }
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
          { title: 'EmptyRoot', content: undefined, coords: 'userId,0:' },
          { title: 'Parent', content: 'Parent context', coords: 'userId,0:1' }
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

      expect(result).toContain('title="Title &lt;with&gt; &amp; &quot;special&quot; chars"')
      expect(result).toContain('Content with &lt;xml&gt; &amp; &apos;quotes&apos;')
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

      expect(result).toContain('title="Task &lt;with&gt; &amp; chars"')
      expect(result).toContain('Preview &quot;with&quot; &apos;quotes&apos;')
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

      expect(result).toContain('Title &lt;with&gt; &amp; chars')
      expect(result).toContain('Content &quot;with&quot; &apos;special&apos; characters')
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
      it('should escape XML special characters in hexplan content', () => {
        const data = createTestData({
          task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
          hexPlan: 'Plan with <tags> & "quotes"\n📋 Step'
        })

        const result = buildPrompt(data)

        expect(result).toContain('Plan with &lt;tags&gt; &amp; &quot;quotes&quot;')
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

  it('should throw error for USER itemType', () => {
    const data = createTestData({
      task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
      itemType: MapItemType.USER
    })

    expect(() => buildPrompt(data)).toThrow('USER tile templates not yet implemented')
  })

  it('should throw error for CONTEXT itemType', () => {
    const data = createTestData({
      task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
      itemType: MapItemType.CONTEXT
    })

    expect(() => buildPrompt(data)).toThrow('CONTEXT tile templates not yet implemented')
  })
})
