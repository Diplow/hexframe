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
    coords: '1-0-0',
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

  const createBasicTaskData = (): TaskHierarchyData => ({
    center: createMockItem({
      title: 'Center Task',
      content: 'This is the center task'
    }),
    ancestry: [],
    siblings: [],
    composedChildren: [],
    regularChildren: []
  })

  it('should generate valid XML with orchestrator content and basic task data', () => {
    const params: ExecutePromptParams = {
      orchestratorContent: '<system>You are an AI assistant</system>',
      taskData: createBasicTaskData()
    }

    const result = executePrompt(params)

    expect(result).toContain('<system>You are an AI assistant</system>')
    expect(result).toContain('<goal>')
    expect(result).toContain('<title>Center Task</title>')
    expect(result).toContain('<content>This is the center task</content>')
    expect(result).toContain('</goal>')
  })

  it('should handle empty arrays by omitting sections', () => {
    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData: createBasicTaskData()
    }

    const result = executePrompt(params)

    expect(result).not.toContain('<ancestry>')
    expect(result).not.toContain('<siblings>')
    expect(result).not.toContain('<context>')
    expect(result).not.toContain('<plan>')
  })

  it('should include ancestry when provided', () => {
    const taskData = createBasicTaskData()
    taskData.ancestry = [
      createMockItem({
        title: 'Parent Task',
        preview: 'Parent preview',
        depth: 1
      }),
      createMockItem({
        title: 'Grandparent Task',
        preview: 'Grandparent preview',
        depth: 2
      })
    ]

    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData
    }

    const result = executePrompt(params)

    expect(result).toContain('<ancestry>')
    expect(result).toContain('<ancestor depth="1"><title>Parent Task</title>')
    expect(result).toContain('<preview>Parent preview</preview>')
    expect(result).toContain('<ancestor depth="2"><title>Grandparent Task</title>')
    expect(result).toContain('</ancestry>')
  })

  it('should include siblings when provided', () => {
    const taskData = createBasicTaskData()
    taskData.siblings = [
      createMockItem({
        coords: '1-0-1',
        title: 'Sibling 1',
        preview: 'Sibling 1 preview'
      }),
      createMockItem({
        coords: '1-0-2',
        title: 'Sibling 2',
        preview: 'Sibling 2 preview'
      })
    ]

    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData
    }

    const result = executePrompt(params)

    expect(result).toContain('<siblings>')
    expect(result).toContain('<sibling direction="1"><title>Sibling 1</title>')
    expect(result).toContain('<sibling direction="2"><title>Sibling 2</title>')
    expect(result).toContain('</siblings>')
  })

  it('should include context section for composed children', () => {
    const taskData = createBasicTaskData()
    taskData.composedChildren = [
      createMockItem({
        title: 'Context Item 1',
        content: 'Context content 1'
      }),
      createMockItem({
        title: 'Context Item 2',
        content: 'Context content 2'
      })
    ]

    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData
    }

    const result = executePrompt(params)

    expect(result).toContain('<context>')
    expect(result).toContain('<item><title>Context Item 1</title><content>Context content 1</content></item>')
    expect(result).toContain('<item><title>Context Item 2</title><content>Context content 2</content></item>')
    expect(result).toContain('</context>')
  })

  it('should include plan section for regular children', () => {
    const taskData = createBasicTaskData()
    taskData.regularChildren = [
      createMockItem({
        coords: '1-0-0-1',
        title: 'Subtask 1',
        preview: 'Subtask 1 preview'
      }),
      createMockItem({
        coords: '1-0-0-2',
        title: 'Subtask 2',
        preview: 'Subtask 2 preview'
      })
    ]

    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData
    }

    const result = executePrompt(params)

    expect(result).toContain('<plan>')
    expect(result).toContain('<subtask coords="1-0-0-1" direction="1"><title>Subtask 1</title>')
    expect(result).toContain('<subtask coords="1-0-0-2" direction="2"><title>Subtask 2</title>')
    expect(result).toContain('</plan>')
  })

  it('should escape XML special characters', () => {
    const taskData = createBasicTaskData()
    taskData.center = createMockItem({
      title: 'Task with <tags> & "quotes"',
      content: "Content with 'apostrophes' & <special> characters"
    })

    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData
    }

    const result = executePrompt(params)

    expect(result).toContain('Task with &lt;tags&gt; &amp; &quot;quotes&quot;')
    expect(result).toContain('Content with &apos;apostrophes&apos; &amp; &lt;special&gt; characters')
    expect(result).not.toContain('Task with <tags>')
  })

  it('should handle null/undefined content gracefully', () => {
    const taskData = createBasicTaskData()
    taskData.center = createMockItem({
      title: 'Task without content',
      content: undefined as unknown as string
    })
    taskData.composedChildren = [
      createMockItem({
        title: 'Item without content',
        content: null as unknown as string
      })
    ]

    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData
    }

    const result = executePrompt(params)

    // Should not crash and should handle empty content
    expect(result).toContain('<title>Task without content</title>')
    expect(result).not.toContain('<content>undefined</content>')
  })

  it('should generate well-formed XML that can be parsed', () => {
    const taskData = createBasicTaskData()
    taskData.ancestry = [createMockItem({ title: 'Ancestor', depth: 1 })]
    taskData.siblings = [createMockItem({ coords: '1-0-1', title: 'Sibling' })]
    taskData.composedChildren = [createMockItem({ title: 'Context' })]
    taskData.regularChildren = [createMockItem({ coords: '1-0-0-1', title: 'Subtask' })]

    const params: ExecutePromptParams = {
      orchestratorContent: '<system>Test</system>',
      taskData
    }

    const result = executePrompt(params)

    // Verify XML structure is valid (basic check)
    const goalRegex = /<goal>[\s\S]*<\/goal>/
    const goalMatch = goalRegex.exec(result)
    expect(goalMatch).toBeTruthy()

    const contextRegex = /<context>[\s\S]*<\/context>/
    const contextMatch = contextRegex.exec(result)
    expect(contextMatch).toBeTruthy()

    const planRegex = /<plan>[\s\S]*<\/plan>/
    const planMatch = planRegex.exec(result)
    expect(planMatch).toBeTruthy()
  })

  it('should preserve orchestrator content exactly', () => {
    const orchestratorContent = `<system role="assistant">
You are a helpful AI assistant.
Use the context below.
</system>`

    const params: ExecutePromptParams = {
      orchestratorContent,
      taskData: createBasicTaskData()
    }

    const result = executePrompt(params)

    expect(result.startsWith(orchestratorContent)).toBe(true)
  })
})
