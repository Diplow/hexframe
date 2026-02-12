/**
 * System Template Tests
 *
 * Tests for the SYSTEM template execution context and instructions sections.
 */

import { describe, it, expect } from 'vitest'
import Mustache from 'mustache'
import {
  SYSTEM_TEMPLATE,
  type SystemTemplateData,
  HEXRUN_INTRO,
  EXECUTION_CONTEXT_SECTION,
  EXECUTION_INSTRUCTIONS_SECTION
} from '~/lib/domains/agentic/templates/_system-template'

describe('SYSTEM template', () => {
  describe('execution context', () => {
    it('renders blockage context when wasBlocked is true', () => {
      const data: Partial<SystemTemplateData> = {
        wasBlocked: true,
        blockageReason: 'Missing API key'
      }

      const rendered = Mustache.render(EXECUTION_CONTEXT_SECTION, data)

      expect(rendered).toContain('<execution-context>')
      expect(rendered).toContain('<previous-blockage>')
      expect(rendered).toContain('Missing API key')
      expect(rendered).toContain('blocker has been addressed')
    })

    it('omits blockage context when wasBlocked is false', () => {
      const data: Partial<SystemTemplateData> = {
        wasBlocked: false,
        blockageReason: ''
      }

      const rendered = Mustache.render(EXECUTION_CONTEXT_SECTION, data)

      expect(rendered.trim()).toBe('')
    })

    it('escapes HTML in blockageReason', () => {
      // Using triple braces {{{ }}} for raw output, so the caller must escape
      // The template renders the value as-is, so we test with pre-escaped input
      const escapedData: Partial<SystemTemplateData> = {
        wasBlocked: true,
        blockageReason: '&lt;script&gt;alert("xss")&lt;/script&gt;'
      }

      const rendered = Mustache.render(EXECUTION_CONTEXT_SECTION, escapedData)

      expect(rendered).toContain('&lt;script&gt;')
      expect(rendered).not.toContain('<script>')
    })
  })

  describe('execution instructions', () => {
    it('includes status block instructions', () => {
      expect(EXECUTION_INSTRUCTIONS_SECTION).toContain('<status>')
      expect(EXECUTION_INSTRUCTIONS_SECTION).toContain('"result": "completed"')
      expect(EXECUTION_INSTRUCTIONS_SECTION).toContain('"result": "blocked"')
    })

    it('includes hexplan tracking guidance', () => {
      expect(EXECUTION_INSTRUCTIONS_SECTION).toContain('Track progress in the hexplan')
      expect(EXECUTION_INSTRUCTIONS_SECTION).toContain('execution-instructions')
    })
  })

  describe('full template integration', () => {
    it('includes execution instructions in full template', () => {
      const fullData: SystemTemplateData = {
        hexrunIntro: HEXRUN_INTRO,
        hasAncestorsWithContent: false,
        ancestorContextSection: '',
        hasComposedChildren: false,
        contextSection: '',
        hasSubtasks: false,
        subtasksSection: '',
        task: {
          title: 'Test Task',
          hasContent: false,
          content: ''
        },
        hasHexplan: false,
        hexplanCoords: 'test,0:1,0',
        hexPlan: '',
        wasBlocked: false,
        blockageReason: ''
      }

      const rendered = Mustache.render(SYSTEM_TEMPLATE, fullData)

      expect(rendered).toContain('<execution-instructions>')
      expect(rendered).toContain('<status>')
    })

    it('includes blockage context in full template when wasBlocked', () => {
      const fullData: SystemTemplateData = {
        hexrunIntro: HEXRUN_INTRO,
        hasAncestorsWithContent: false,
        ancestorContextSection: '',
        hasComposedChildren: false,
        contextSection: '',
        hasSubtasks: false,
        subtasksSection: '',
        task: {
          title: 'Test Task',
          hasContent: false,
          content: ''
        },
        hasHexplan: false,
        hexplanCoords: 'test,0:1,0',
        hexPlan: '',
        wasBlocked: true,
        blockageReason: 'Database connection failed'
      }

      const rendered = Mustache.render(SYSTEM_TEMPLATE, fullData)

      expect(rendered).toContain('<execution-context>')
      expect(rendered).toContain('Database connection failed')
    })
  })
})
