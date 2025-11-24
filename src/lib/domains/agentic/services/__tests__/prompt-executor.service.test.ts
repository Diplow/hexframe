import { describe, it, expect } from 'vitest'
import { buildPrompt, type PromptData } from '~/lib/domains/agentic/services/prompt-executor.service'

describe('buildPrompt - HEXFRAME_PROMPT.md Spec v2 (Recursive Execution)', () => {
  // ==================== BASIC STRUCTURE TESTS ====================
  describe('Basic Structure', () => {
    it('should generate all 4 sections in correct order', () => {
      const data: PromptData = {
        task: { title: 'Test Task', content: 'Test content', coords: '1,0:1' },
        composedChildren: [{ title: 'Context', content: 'Context info' }],
        structuralChildren: [{ title: 'Subtask 1', preview: 'Preview 1', coords: '1,0:1,1' }],
        instruction: 'Test instruction',
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      // Check all sections appear
      expect(result).toContain('<context>')
      expect(result).toContain('<subtasks>')
      expect(result).toContain('<task>')
      expect(result).toContain('<instructions>')

      // execution-history section should NOT exist (moved to subtasks)
      expect(result).not.toContain('<execution-history>')

      // Check order (use lastIndexOf for user <instructions> section after <task>)
      const contextIndex = result.indexOf('<context>')
      const subtasksIndex = result.indexOf('<subtasks>')
      const taskIndex = result.indexOf('<task>')
      const instructionsIndex = result.lastIndexOf('<instructions>') // User instructions at the end

      expect(contextIndex).toBeLessThan(subtasksIndex)
      expect(subtasksIndex).toBeLessThan(taskIndex)
      expect(taskIndex).toBeLessThan(instructionsIndex)
    })

    it('should separate sections with blank lines', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [{ title: 'C1', content: 'Content 1' }],
        structuralChildren: [{ title: 'S1', preview: 'Preview 1', coords: '1,0:1' }],
        instruction: 'Instruction',
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      // Should have blank lines between sections
      expect(result).toMatch(/<\/context>\n\n<subtasks>/)
      expect(result).toMatch(/<\/subtasks>\n\n<task>/)
      expect(result).toMatch(/<\/task>\n\n<instructions>/)
    })
  })

  // ==================== CONTEXT SECTION TESTS ====================
  describe('Context Section', () => {
    it('should always include Hexframe philosophy subsection', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<context>')
      expect(result).toContain('# Hexframe Orchestration')
      expect(result).toContain('hexecute')
      expect(result).toContain('subagent')
      expect(result).toContain('</context>')
    })

    it('should include Hexframe philosophy even when no composed children', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<context>')
      expect(result).toContain('# Hexframe Orchestration')
    })

    it('should concatenate philosophy + composed children', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [
          { title: 'Context 1', content: 'Content 1' },
          { title: 'Context 2', content: 'Content 2' }
        ],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<context>')
      expect(result).toContain('# Hexframe Orchestration')
      expect(result).toContain('Context 1')
      expect(result).toContain('Content 1')
      expect(result).toContain('Context 2')
      expect(result).toContain('Content 2')
      expect(result).toContain('</context>')
    })

    it('should skip composed children with empty content', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [
          { title: 'Empty', content: '' },
          { title: 'Valid', content: 'Valid content' },
          { title: 'Whitespace', content: '   \n\t  ' }
        ],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('Valid')
      expect(result).toContain('Valid content')
      expect(result).not.toContain('Empty')
      expect(result).not.toContain('Whitespace')
    })

    it('should escape XML special characters in composed children', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [
          { title: 'Title <with> & "special" chars', content: 'Content with <xml> & \'quotes\'' }
        ],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('Title &lt;with&gt; &amp; &quot;special&quot; chars')
      expect(result).toContain('Content with &lt;xml&gt; &amp; &apos;quotes&apos;')
    })
  })

  // ==================== SUBTASKS SECTION TESTS ====================
  describe('Subtasks Section', () => {
    it('should always include systematic subtasks even when no user subtasks', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<subtasks>')
      // Should have read history subtask
      expect(result).toContain('<subtask coords="1,0:1,0" subagent="false">')
      expect(result).toContain('Read Execution History')
      // Should have mark done subtask
      expect(result).toContain('Mark Task Complete')
      expect(result).toContain('</subtasks>')
    })

    it('should include coords attribute for each subtask', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0:1' },
        composedChildren: [],
        structuralChildren: [
          { title: 'Subtask 1', preview: 'Preview 1', coords: '1,0:1,1' },
          { title: 'Subtask 2', preview: 'Preview 2', coords: '1,0:1,2' }
        ],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<subtask coords="1,0:1,0" subagent="false">') // Read history
      expect(result).toContain('<subtask coords="1,0:1,1" subagent="true">')
      expect(result).toContain('<subtask coords="1,0:1,2" subagent="true">')
      expect(result).toContain('Mark Task Complete') // Mark done (no coords, inline)
    })

    it('should order subtasks: read history, user subtasks, mark done', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0:1' },
        composedChildren: [],
        structuralChildren: [
          { title: 'User Subtask', preview: 'Preview', coords: '1,0:1,1' }
        ],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      const readHistoryIndex = result.indexOf('Read Execution History')
      const userSubtaskIndex = result.indexOf('User Subtask')
      const markDoneIndex = result.indexOf('Mark Task Complete')

      expect(readHistoryIndex).toBeLessThan(userSubtaskIndex)
      expect(userSubtaskIndex).toBeLessThan(markDoneIndex)
    })

    it('should use MCP server name from environment in read history subtask', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0:1' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'debughexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('debughexframe:getItemByCoords')
    })

    it('should escape XML special characters in subtasks', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [
          { title: 'Task <with> & chars', preview: 'Preview "with" \'quotes\'', coords: '1,0:1' }
        ],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('Task &lt;with&gt; &amp; chars')
      expect(result).toContain('Preview &quot;with&quot; &apos;quotes&apos;')
    })

    it('should include ancestor histories in read history subtask', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0:1,2' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: [
          { coords: '1,0:1,0', content: 'Root task progress...' },
          { coords: '1,0:1', content: 'Parent task completed step 1' }
        ]
      }

      const result = buildPrompt(data)

      expect(result).toContain('<parent-context>')
      expect(result).toContain('From 1,0:1,0:')
      expect(result).toContain('Root task progress...')
      expect(result).toContain('From 1,0:1:')
      expect(result).toContain('Parent task completed step 1')
      expect(result).toContain('</parent-context>')
      expect(result).toContain('<instructions>')
    })
  })

  // ==================== TASK SECTION TESTS ====================
  describe('Task Section', () => {
    it('should always include task section', () => {
      const data: PromptData = {
        task: { title: 'Test Task', content: 'Test content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<task>')
      expect(result).toContain('</task>')
    })

    it('should include goal wrapper for title', () => {
      const data: PromptData = {
        task: { title: 'My Test Goal', content: 'Content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<goal>My Test Goal</goal>')
    })

    it('should include task content', () => {
      const data: PromptData = {
        task: { title: 'Title', content: 'This is the task content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('This is the task content')
    })

    it('should handle empty task content', () => {
      const data: PromptData = {
        task: { title: 'Title', content: '', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
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
          coords: '1,0'
        },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('Title &lt;with&gt; &amp; chars')
      expect(result).toContain('Content &quot;with&quot; &apos;special&apos; characters')
    })
  })

  // ==================== INSTRUCTIONS SECTION TESTS ====================
  describe('Instructions Section', () => {
    it('should be empty when no instruction provided', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      // Systematic subtasks have <instructions> wrapper, but no user <instructions> section at the end
      const instructionsCount = (result.match(/<instructions>/g) || []).length
      expect(instructionsCount).toBe(2) // Read history + Mark done subtasks
    })

    it('should include instruction when provided', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: 'Use PostgreSQL for the database',
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('<instructions>')
      expect(result).toContain('Use PostgreSQL for the database')
      expect(result).toContain('</instructions>')
    })

    it('should escape XML special characters in instructions', () => {
      const data: PromptData = {
        task: { title: 'Test', content: 'Content', coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: 'Use <component> & "props"',
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('Use &lt;component&gt; &amp; &quot;props&quot;')
    })
  })

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle minimal tile (only task, systematic subtasks)', () => {
      const data: PromptData = {
        task: { title: 'Minimal Task', content: undefined, coords: '1,0' },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      // Should have context (philosophy), subtasks (systematic), and task sections
      expect(result).toContain('<context>')
      expect(result).toContain('<subtasks>')
      expect(result).toContain('<task>')
      // Should have <instructions> in systematic subtasks, but not as separate section
      const instructionsCount = (result.match(/<instructions>/g) || []).length
      expect(instructionsCount).toBe(2) // Read history + Mark done subtasks
    })

    it('should handle multiline content with proper formatting', () => {
      const data: PromptData = {
        task: {
          title: 'Test',
          content: 'Line 1\nLine 2\n\nLine 4',
          coords: '1,0'
        },
        composedChildren: [],
        structuralChildren: [],
        instruction: undefined,
        mcpServerName: 'hexframe',
        ancestorHistories: []
      }

      const result = buildPrompt(data)

      expect(result).toContain('Line 1\nLine 2\n\nLine 4')
    })
  })
})
