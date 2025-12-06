import { describe, it, expect } from 'vitest'
import { buildPrompt, type PromptData } from '~/lib/domains/agentic/services/prompt-executor.service'

describe('buildPrompt - v3 Simplified Structure', () => {
  // ==================== BASIC STRUCTURE TESTS ====================
  describe('Basic Structure', () => {
    it('should generate sections in correct order: context, subtasks, task, hexplan', () => {
      const data: PromptData = {
        task: { title: 'Test Task', content: 'Test content', coords: 'userId,0:1' },
        composedChildren: [{ title: 'Context', content: 'Context info', coords: 'userId,0:1,-1' }],
        structuralChildren: [{ title: 'Subtask 1', preview: 'Preview 1', coords: 'userId,0:1,1' }],
        instruction: 'Test instruction',
        mcpServerName: 'hexframe',
        hexPlan: 'Existing plan content',
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      // Check all sections appear
      expect(result).toContain('<context title="Context" coords="userId,0:1,-1">')
      expect(result).toContain('<subtasks>')
      expect(result).toContain('<task>')
      expect(result).toContain('<hexplan')

      // Check order
      const contextIndex = result.indexOf('<context ')
      const subtasksIndex = result.indexOf('<subtasks>')
      const taskIndex = result.indexOf('<task>')
      const hexplanIndex = result.indexOf('<hexplan')

      expect(contextIndex).toBeLessThan(subtasksIndex)
      expect(subtasksIndex).toBeLessThan(taskIndex)
      expect(taskIndex).toBeLessThan(hexplanIndex)
    })

    it('should separate sections with blank lines', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [{ title: 'C1', content: 'Content 1', coords: 'userId,0:1,-1' }],
        structuralChildren: [{ title: 'S1', preview: 'Preview 1', coords: 'userId,0:1,1' }],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: 'Plan content',
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toMatch(/<\/context>\n\n<subtasks>/)
      expect(result).toMatch(/<\/subtasks>\n\n<task>/)
      expect(result).toMatch(/<\/task>\n\n<hexplan/)
    })

    it('should not include hardcoded Hexframe philosophy', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).not.toContain('# Hexframe Orchestration')
      expect(result).not.toContain('agent-planning-protocol')
    })
  })

  // ==================== CONTEXT SECTION TESTS ====================
  describe('Context Section', () => {
    it('should be empty when no composed children', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).not.toContain('<context')
    })

    it('should include composed children with title, content and coords', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [
          { title: 'Context 1', content: 'Content 1', coords: 'userId,0:1,-1' },
          { title: 'Context 2', content: 'Content 2', coords: 'userId,0:1,-2' }
        ],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<context title="Context 1" coords="userId,0:1,-1">')
      expect(result).toContain('Content 1')
      expect(result).toContain('</context>')
      expect(result).toContain('<context title="Context 2" coords="userId,0:1,-2">')
      expect(result).toContain('Content 2')
    })

    it('should skip composed children with empty content', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [
          { title: 'Empty', content: '', coords: 'userId,0:1,-1' },
          { title: 'Valid', content: 'Valid content', coords: 'userId,0:1,-2' },
          { title: 'Whitespace', content: '   \n\t  ', coords: 'userId,0:1,-3' }
        ],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('Valid')
      expect(result).toContain('Valid content')
      expect(result).not.toContain('Empty')
      expect(result).not.toContain('Whitespace')
    })

    it('should escape XML special characters in composed children', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [
          { title: 'Title <with> & "special" chars', content: 'Content with <xml> & \'quotes\'', coords: 'userId,0:1,-1' }
        ],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('title="Title &lt;with&gt; &amp; &quot;special&quot; chars"')
      expect(result).toContain('Content with &lt;xml&gt; &amp; &apos;quotes&apos;')
    })
  })

  // ==================== SUBTASKS SECTION TESTS ====================
  describe('Subtasks Section', () => {
    it('should be empty when no structural children', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).not.toContain('<subtasks>')
    })

    it('should include title and coords attributes for each subtask-preview', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [
          { title: 'Subtask 1', preview: 'Preview 1', coords: 'userId,0:1,1' },
          { title: 'Subtask 2', preview: 'Preview 2', coords: 'userId,0:1,2' }
        ],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<subtask-preview title="Subtask 1" coords="userId,0:1,1">')
      expect(result).toContain('<subtask-preview title="Subtask 2" coords="userId,0:1,2">')
    })

    it('should include preview content inside subtask-preview', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [
          { title: 'My Subtask', preview: 'My Preview', coords: 'userId,0:1,1' }
        ],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<subtask-preview title="My Subtask" coords="userId,0:1,1">')
      expect(result).toContain('My Preview')
      expect(result).toContain('</subtask-preview>')
    })

    it('should escape XML special characters in subtask-preview', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [
          { title: 'Task <with> & chars', preview: 'Preview "with" \'quotes\'', coords: 'userId,0:1,1' }
        ],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('title="Task &lt;with&gt; &amp; chars"')
      expect(result).toContain('Preview &quot;with&quot; &apos;quotes&apos;')
    })

    it('should not include meta tasks (read history, mark done)', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [
          { title: 'User Subtask', preview: 'Preview', coords: 'userId,0:1,1' }
        ],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).not.toContain('Read HexPlan')
      expect(result).not.toContain('Mark Task Complete')
      expect(result).not.toContain('subagent="false"')
    })
  })

  // ==================== TASK SECTION TESTS ====================
  describe('Task Section', () => {
    it('should always include task section', () => {
      const data: PromptData = {
        task: { title: 'Test Task', content: 'Test content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<task>')
      expect(result).toContain('</task>')
    })

    it('should include goal wrapper for title', () => {
      const data: PromptData = {
        task: { title: 'My Test Goal', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<goal>My Test Goal</goal>')
    })

    it('should include task content', () => {
      const data: PromptData = {
        task: { title: 'Title', content: 'This is the task content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('This is the task content')
    })

    it('should handle empty task content', () => {
      const data: PromptData = {
        task: { title: 'Title', content: '', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<task>')
      expect(result).toContain('<goal>Title</goal>')
      expect(result).toContain('</task>')
    })

    it('should escape XML special characters in task', () => {
      const data: PromptData = {
        task: {
          title: 'Title <with> & chars',
          content: 'Content "with" \'special\' characters',
          coords: 'userId,0:1'
        },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('Title &lt;with&gt; &amp; chars')
      expect(result).toContain('Content &quot;with&quot; &apos;special&apos; characters')
    })
  })

  // ==================== HEXPLAN SECTION TESTS ====================
  describe('Hexplan Section', () => {
    it('should show hexplan content when plan exists', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: '🟡 STARTED: Working on task...',
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<hexplan coords="userId,0:1,0">')
      expect(result).toContain('🟡 STARTED: Working on task...')
      expect(result).toContain('</hexplan>')
    })

    it('should show initialization instructions when hexplan does not exist', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1,2' },
        composedChildren: [],
        structuralChildren: [],
        instruction: 'Build feature X',
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('<hexplan coords="userId,0:1,2,0">')
      expect(result).toContain('No hexplan exists yet. To initialize:')
      expect(result).toContain(
        '1. Run hexframe:hexecute("userId,0:1,4", "Create a hexplan for the task at userId,0:1,2. User instruction: Build feature X")'
      )
      expect(result).toContain('2. Launch a subagent with the resulting prompt')
      expect(result).toContain('</hexplan>')
    })

    it('should use correct MCP server name in initialization instructions', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'debughexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('debughexframe:hexecute')
      expect(result).toContain('Create a hexplan for the task at userId,0:1")')
      expect(result).not.toContain('User instruction:')
    })

    it('should escape XML special characters in hexplan content', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: 'Plan with <tags> & "quotes"',
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('Plan with &lt;tags&gt; &amp; &quot;quotes&quot;')
    })

    it('should use custom hexPlanInitializerPath when provided', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: 'userId,0:1,2' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: '2,3' // Custom path instead of default '1,4'
      }

      const result = buildPrompt(data)

      expect(result).toContain('hexframe:hexecute("userId,0:2,3"')
      expect(result).not.toContain('userId,0:1,4')
    })
  })

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle minimal tile (only task and hexplan)', () => {
      const data: PromptData = {
        task: { title: 'Minimal Task', content: undefined, coords: 'userId,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      // Should have task and hexplan sections only
      expect(result).toContain('<task>')
      expect(result).toContain('<hexplan')
      expect(result).not.toContain('<context')
      expect(result).not.toContain('<subtasks>')
    })

    it('should handle multiline content with proper formatting', () => {
      const data: PromptData = {
        task: {
          title: 'Test',
          content: 'Line 1\nLine 2\n\nLine 4',
          coords: 'userId,0:1'
        },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        hexPlan: undefined,
        hexPlanInitializerPath: undefined
      }

      const result = buildPrompt(data)

      expect(result).toContain('Line 1\nLine 2\n\nLine 4')
    })
  })
})
