import { describe, it, expect } from 'vitest'
import { executePrompt } from '~/lib/domains/agentic/services/prompt-executor.service'
import type {
  ExecutePromptParams,
  TaskHierarchyData
} from '~/lib/domains/agentic/services/prompt-executor.service'
import { MapItemType, type MapItemContract } from '~/lib/domains/mapping/types/contracts'

describe('executePrompt', () => {
  const createMockItem = (overrides: Partial<MapItemContract> = {}): MapItemContract => ({
    id: '1',
    ownerId: '1',
    coords: '1,0',
    title: 'Test Title',
    content: 'Test content',
    preview: 'Test preview',
    link: '',
    itemType: MapItemType.USER,
    depth: 0,
    parentId: null,
    originId: null,
    ...overrides
  })

  const createSimpleTaskData = (): TaskHierarchyData => ({
    center: createMockItem({
      title: 'Simple Task',
      content: 'Do something simple',
      coords: '1,0'
    }),
    composedChildren: []
  })

  const createTaskWithComposedChildren = (): TaskHierarchyData => ({
    center: createMockItem({
      title: 'Complex Task',
      content: 'Do something complex',
      coords: '1,0'
    }),
    composedChildren: [
      createMockItem({
        title: 'Prompt Preparation',
        content: 'You are preparing the execution.\n\n## Step 1: Read\nRead the task...'
      }),
      createMockItem({
        title: 'Generic Context Builder',
        content: 'Use MCP tools to gather context when needed.'
      })
    ]
  })

  describe('basic structure', () => {
    it('should wrap everything in hexframe-session tags', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData()
      }

      const result = executePrompt(params)

      expect(result).toMatch(/^<hexframe-session>/)
      expect(result).toMatch(/<\/hexframe-session>$/)
    })

    it('should include task section', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData()
      }

      const result = executePrompt(params)

      expect(result).toContain('<task>')
      expect(result).toContain('<title>Simple Task</title>')
      expect(result).toContain('<content>Do something simple</content>')
      expect(result).toContain('<coordinates>1,0</coordinates>')
      expect(result).toContain('</task>')
    })

    it('should include execution context section', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData(),
        instruction: 'Test instruction'
      }

      const result = executePrompt(params)

      expect(result).toContain('<execution-context>')
      expect(result).toContain('<storage-location>1,0,0,0</storage-location>')
      expect(result).toContain('<current-instruction>Test instruction</current-instruction>')
      expect(result).toContain('</execution-context>')
    })
  })

  describe('composed children concatenation', () => {
    it('should not include composed children sections when empty', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData()
      }

      const result = executePrompt(params)

      expect(result).not.toContain('<prompt-preparation>')
      expect(result).not.toContain('<generic-context-builder>')
    })

    it('should concatenate composed children as simple sections', () => {
      const params: ExecutePromptParams = {
        taskData: createTaskWithComposedChildren()
      }

      const result = executePrompt(params)

      expect(result).toContain('<prompt-preparation>')
      expect(result).toContain('You are preparing the execution.')
      expect(result).toContain('## Step 1: Read')
      expect(result).toContain('</prompt-preparation>')

      expect(result).toContain('<generic-context-builder>')
      expect(result).toContain('Use MCP tools to gather context when needed.')
      expect(result).toContain('</generic-context-builder>')
    })

    it('should convert composed child titles to section names', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: 'Generic System Orchestrator',
          content: 'Orchestrator content here'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).toContain('<generic-system-orchestrator>')
      expect(result).toContain('Orchestrator content here')
      expect(result).toContain('</generic-system-orchestrator>')
    })

    it('should skip composed children with empty content', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: 'Empty Tile',
          content: ''
        }),
        createMockItem({
          title: 'Valid Tile',
          content: 'Valid content'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).not.toContain('<empty-tile>')
      expect(result).toContain('<valid-tile>')
      expect(result).toContain('Valid content')
    })
  })

  describe('execution context', () => {
    it('should calculate storage location correctly', () => {
      const taskData = createSimpleTaskData()
      taskData.center.coords = '23,0:6'

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).toContain('<storage-location>23,0:6,0,0</storage-location>')
    })

    it('should include instruction when provided', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData(),
        instruction: 'Create a new feature'
      }

      const result = executePrompt(params)

      expect(result).toContain('<current-instruction>Create a new feature</current-instruction>')
    })

    it('should not include instruction tag when not provided', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData()
      }

      const result = executePrompt(params)

      expect(result).not.toContain('<current-instruction>')
    })

    it('should include execution history when provided', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData(),
        executionHistoryContent: '## State\n- mcp_server: debughexframe\n\n## Log\n[10:00] Started'
      }

      const result = executePrompt(params)

      expect(result).toContain('<history>')
      expect(result).toContain('## State')
      expect(result).toContain('- mcp_server: debughexframe')
      expect(result).toContain('## Log')
      expect(result).toContain('[10:00] Started')
      expect(result).toContain('</history>')
    })

    it('should include default history message when not provided', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData()
      }

      const result = executePrompt(params)

      expect(result).toContain('<history>No execution history yet - this is the first execution.</history>')
    })
  })

  describe('XML escaping', () => {
    it('should escape XML special characters in task title', () => {
      const taskData = createSimpleTaskData()
      taskData.center.title = 'Task with <tags> & "quotes"'

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).toContain('Task with &lt;tags&gt; &amp; &quot;quotes&quot;')
      expect(result).not.toContain('Task with <tags> & "quotes"')
    })

    it('should escape XML special characters in task content', () => {
      const taskData = createSimpleTaskData()
      taskData.center.content = "Content with 'apostrophes' & <special> characters"

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).toContain("Content with &apos;apostrophes&apos; &amp; &lt;special&gt; characters")
    })

    it('should escape XML special characters in composed children content', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: 'Test Tile',
          content: 'Content with <xml> & "special" characters'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).toContain('Content with &lt;xml&gt; &amp; &quot;special&quot; characters')
    })

    it('should escape XML special characters in instruction', () => {
      const params: ExecutePromptParams = {
        taskData: createSimpleTaskData(),
        instruction: 'Use <component> & "props"'
      }

      const result = executePrompt(params)

      expect(result).toContain('Use &lt;component&gt; &amp; &quot;props&quot;')
    })
  })

  describe('edge cases', () => {
    it('should handle task without content', () => {
      const taskData = createSimpleTaskData()
      taskData.center.content = ''

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).toContain('<task>')
      expect(result).toContain('<title>Simple Task</title>')
      expect(result).toContain('<coordinates>1,0</coordinates>')
      expect(result).not.toContain('<content>')
      expect(result).toContain('</task>')
    })

    it('should handle task with whitespace-only content', () => {
      const taskData = createSimpleTaskData()
      taskData.center.content = '   \n\t  '

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      expect(result).not.toContain('<content>')
    })

    it('should handle composed child with special characters in title', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: 'Context Builder (v2.0) - NEW!',
          content: 'Builder content'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      // Should strip special characters from section name (periods and hyphens preserved)
      expect(result).toContain('<context-builder-v2.0---new>')
      expect(result).toContain('Builder content')
      expect(result).toContain('</context-builder-v2.0---new>')
    })

    it('should use fallback section name for title with only special characters', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: '!!!',
          content: 'Content for special chars tile'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      // Should use fallback name since sanitized result is empty
      expect(result).toContain('<section-1>')
      expect(result).toContain('Content for special chars tile')
      expect(result).toContain('</section-1>')
    })

    it('should use fallback section name for title starting with digits', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: '123',
          content: 'Content for numeric tile'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      // Should use fallback name since XML names cannot start with digits
      expect(result).toContain('<section-1>')
      expect(result).toContain('Content for numeric tile')
      expect(result).toContain('</section-1>')
    })

    it('should use fallback section name for title starting with hyphen', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: ' -foo',
          content: 'Content for hyphen-prefixed tile'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      // Should use fallback name since sanitized result starts with hyphen (invalid XML name start)
      expect(result).toContain('<section-1>')
      expect(result).toContain('Content for hyphen-prefixed tile')
      expect(result).toContain('</section-1>')
    })

    it('should use sequential fallback names for multiple invalid tiles', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: '!!!',
          content: 'First invalid tile'
        }),
        createMockItem({
          title: 'Valid Name',
          content: 'Valid tile'
        }),
        createMockItem({
          title: '123',
          content: 'Second invalid tile'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      // First invalid tile gets section-1
      expect(result).toContain('<section-1>')
      expect(result).toContain('First invalid tile')
      expect(result).toContain('</section-1>')

      // Valid tile gets its sanitized name
      expect(result).toContain('<valid-name>')
      expect(result).toContain('Valid tile')
      expect(result).toContain('</valid-name>')

      // Second invalid tile gets section-3 (index in filtered array)
      expect(result).toContain('<section-3>')
      expect(result).toContain('Second invalid tile')
      expect(result).toContain('</section-3>')
    })

    it('should produce well-formed XML with invalid tile names', () => {
      const taskData = createSimpleTaskData()
      taskData.composedChildren = [
        createMockItem({
          title: '!!!',
          content: 'Test content 1'
        }),
        createMockItem({
          title: '---',
          content: 'Test content 2'
        })
      ]

      const params: ExecutePromptParams = {
        taskData
      }

      const result = executePrompt(params)

      // Verify well-formed XML structure
      expect(result).toMatch(/<section-1>[\s\S]*?<\/section-1>/)
      expect(result).toMatch(/<section-2>[\s\S]*?<\/section-2>/)

      // Verify matching opening and closing tags
      const section1Open = result.indexOf('<section-1>')
      const section1Close = result.indexOf('</section-1>')
      const section2Open = result.indexOf('<section-2>')
      const section2Close = result.indexOf('</section-2>')

      expect(section1Open).toBeGreaterThan(-1)
      expect(section1Close).toBeGreaterThan(section1Open)
      expect(section2Open).toBeGreaterThan(section1Close)
      expect(section2Close).toBeGreaterThan(section2Open)
    })
  })

  describe('section ordering', () => {
    it('should order sections correctly', () => {
      const params: ExecutePromptParams = {
        taskData: createTaskWithComposedChildren(),
        instruction: 'Test instruction',
        executionHistoryContent: '## State\nTest state'
      }

      const result = executePrompt(params)

      const sessionIndex = result.indexOf('<hexframe-session>')
      const taskIndex = result.indexOf('<task>')
      const composedIndex = result.indexOf('<prompt-preparation>')
      const contextIndex = result.indexOf('<execution-context>')
      const sessionEndIndex = result.indexOf('</hexframe-session>')

      expect(sessionIndex).toBeLessThan(taskIndex)
      expect(taskIndex).toBeLessThan(composedIndex)
      expect(composedIndex).toBeLessThan(contextIndex)
      expect(contextIndex).toBeLessThan(sessionEndIndex)
    })
  })
})
