import { describe, it, expect } from 'vitest'
import {
  parseChildPath,
  parseChildRange,
  formatChildPath,
  isChildRef
} from '~/lib/domains/agentic/templates/_pre-processor/_path-parser'
import {
  resolveChildPath,
  getChildrenInRange,
  type TileData
} from '~/lib/domains/agentic/templates/_pre-processor/_resolver'
import { prefixVariables } from '~/lib/domains/agentic/templates/_compiler/_variable-prefixer'
import { compileTemplate } from '~/lib/domains/agentic/templates/_compiler'
import { buildTemplatePool } from '~/lib/domains/agentic/templates/_pool'

describe('Path Parser', () => {
  describe('parseChildPath', () => {
    it('parses single direction', () => {
      const result = parseChildPath('child[-3]')
      expect(result).toEqual({ directions: [-3], field: undefined })
    })

    it('parses single direction with field', () => {
      const result = parseChildPath('child[-3].title')
      expect(result).toEqual({ directions: [-3], field: 'title' })
    })

    it('parses nested path', () => {
      const result = parseChildPath('child[-2,-1]')
      expect(result).toEqual({ directions: [-2, -1], field: undefined })
    })

    it('parses nested path with field', () => {
      const result = parseChildPath('child[-2,-1].content')
      expect(result).toEqual({ directions: [-2, -1], field: 'content' })
    })

    it('returns null for invalid syntax', () => {
      expect(parseChildPath('notachild')).toBeNull()
      expect(parseChildPath('child[]')).toBeNull()
      expect(parseChildPath('child[0]')).toBeNull() // 0 is invalid direction
    })
  })

  describe('parseChildRange', () => {
    it('parses composed range', () => {
      const result = parseChildRange('child[-6..-1]')
      expect(result).toEqual({ start: -6, end: -1 })
    })

    it('parses structural range', () => {
      const result = parseChildRange('child[1..6]')
      expect(result).toEqual({ start: 1, end: 6 })
    })

    it('returns null for invalid range', () => {
      expect(parseChildRange('child[0..6]')).toBeNull() // 0 is invalid
    })
  })

  describe('formatChildPath', () => {
    it('formats path without field', () => {
      expect(formatChildPath({ directions: [-3], field: undefined }))
        .toBe('child[-3]')
    })

    it('formats path with field', () => {
      expect(formatChildPath({ directions: [-2, -1], field: 'title' }))
        .toBe('child[-2,-1].title')
    })
  })

  describe('isChildRef', () => {
    it('identifies child references', () => {
      expect(isChildRef('child[-3]')).toBe(true)
      expect(isChildRef('child[1..6]')).toBe(true)
      expect(isChildRef('task')).toBe(false)
    })
  })
})

describe('Path Resolution', () => {
  const mockTile: TileData = {
    title: 'Root',
    content: 'Root content',
    coords: 'user,0:1',
    children: [
      {
        title: 'Child -3',
        content: 'Child -3 content',
        coords: 'user,0:1,-3',
        direction: -3,
        children: [
          {
            title: 'Grandchild -1',
            content: 'Grandchild content',
            coords: 'user,0:1,-3,-1',
            direction: -1
          }
        ]
      },
      {
        title: 'Child -2',
        content: 'Child -2 content',
        coords: 'user,0:1,-2',
        direction: -2
      }
    ]
  }

  describe('resolveChildPath', () => {
    it('resolves single-level path', () => {
      const result = resolveChildPath({ directions: [-3] }, mockTile)
      expect(result?.title).toBe('Child -3')
    })

    it('resolves nested path', () => {
      const result = resolveChildPath({ directions: [-3, -1] }, mockTile)
      expect(result?.title).toBe('Grandchild -1')
    })

    it('returns undefined for non-existent path', () => {
      const result = resolveChildPath({ directions: [-5] }, mockTile)
      expect(result).toBeUndefined()
    })
  })

  describe('getChildrenInRange', () => {
    it('gets children in range', () => {
      const children = getChildrenInRange(mockTile, -6, -1)
      expect(children).toHaveLength(2)
      expect(children[0]?.title).toBe('Child -3')
      expect(children[1]?.title).toBe('Child -2')
    })

    it('returns empty for no matching children', () => {
      const children = getChildrenInRange(mockTile, 1, 6)
      expect(children).toHaveLength(0)
    })
  })
})

describe('Variable Prefixer', () => {
  it('prefixes field variables', () => {
    const result = prefixVariables('{{title}}', [-3])
    expect(result).toBe('{{child[-3].title}}')
  })

  it('prefixes triple-brace variables', () => {
    const result = prefixVariables('{{{content}}}', [-2, -1])
    expect(result).toBe('{{{child[-2,-1].content}}}')
  })

  it('does not prefix reserved variables', () => {
    const result = prefixVariables('{{task}}', [-3])
    expect(result).toBe('{{task}}')
  })

  it('does not prefix non-field variables', () => {
    const result = prefixVariables('{{customVar}}', [-3])
    expect(result).toBe('{{customVar}}')
  })
})

describe('Template Compiler', () => {
  const mockTaskTile: TileData = {
    title: 'Task',
    content: 'Task content',
    coords: 'user,0:1',
    itemType: 'system',
    children: [
      {
        title: 'Context Item',
        content: 'Context content',
        coords: 'user,0:1,-1',
        direction: -1,
        itemType: 'context'
      },
      {
        title: 'Generic Item',
        content: 'Generic content',
        coords: 'user,0:1,-2',
        direction: -2,
        itemType: 'unknown'
      }
    ]
  }

  const mockTemplateChildren: TileData[] = [
    {
      title: 'Context Template',
      content: '<item>{{title}}</item>',
      coords: 'template,0:1',
      direction: 1,
      itemType: 'context'
    },
    {
      title: 'Generic Template',
      content: '<generic>{{title}}</generic>',
      coords: 'template,0:2',
      direction: 2,
      itemType: 'generic'
    }
  ]

  it('compiles template with RenderChildren', () => {
    const template = '{{@RenderChildren range=[-6..-1] fallback=\'generic\'}}'
    const pool = buildTemplatePool(mockTemplateChildren, 'generic')

    const result = compileTemplate(template, mockTaskTile, pool)

    // Should contain prefixed variables for both children
    expect(result).toContain('child[-1]')
    expect(result).toContain('child[-2]')
  })

  it('returns template unchanged if no RenderChildren tags', () => {
    const template = '<task>{{task.title}}</task>'
    const pool = buildTemplatePool(mockTemplateChildren, 'generic')

    const result = compileTemplate(template, mockTaskTile, pool)

    expect(result).toBe(template)
  })
})
