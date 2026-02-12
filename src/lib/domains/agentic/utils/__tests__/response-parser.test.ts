/**
 * Response Parser Tests
 *
 * Tests for the parseAgentResponse utility that extracts execution status
 * from agent responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseAgentResponse } from '~/lib/domains/agentic/utils/_response-parser'

describe('parseAgentResponse', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Suppress console warnings during tests
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  describe('valid status blocks', () => {
    it('parses completed status', () => {
      const response = 'Task done.\n<status>{"result": "completed"}</status>'
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'completed' })
    })

    it('parses blocked status with reason', () => {
      const response = 'Cannot proceed.\n<status>{"result": "blocked", "reason": "Missing API key"}</status>'
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'blocked', reason: 'Missing API key' })
    })

    it('handles extra whitespace in status block', () => {
      const response = '<status>  { "result" : "completed" }  </status>'
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'completed' })
    })

    it('finds status block at end of long response', () => {
      const longResponse = `
I've analyzed the codebase and made the following changes:

1. Updated the configuration file
2. Added new tests
3. Fixed the bug in the parser

All tasks completed successfully.

<status>{"result": "completed"}</status>`
      const result = parseAgentResponse(longResponse)

      expect(result).toEqual({ result: 'completed' })
    })
  })

  describe('graceful fallback', () => {
    it('returns completed when no status block found', () => {
      const response = 'Task done, no status block here.'
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'completed' })
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No status block found')
      )
    })

    it('returns completed when JSON is malformed', () => {
      const response = '<status>{not valid json}</status>'
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'completed' })
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('returns completed when result is invalid', () => {
      const response = '<status>{"result": "invalid_value"}</status>'
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'completed' })
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid status result')
      )
    })

    it('logs warning on fallback', () => {
      const response = 'No status here'
      parseAgentResponse(response)

      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('handles empty response', () => {
      const result = parseAgentResponse('')

      expect(result).toEqual({ result: 'completed' })
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('handles multiple status blocks (uses last one)', () => {
      const response = `
<status>{"result": "blocked", "reason": "first"}</status>
Some more work...
<status>{"result": "completed"}</status>`
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'completed' })
    })

    it('handles status block in code fence (ignores it)', () => {
      const response = `
Here's an example of the format:
\`\`\`
<status>{"result": "blocked", "reason": "example"}</status>
\`\`\`

Now for the real status:
<status>{"result": "completed"}</status>`
      const result = parseAgentResponse(response)

      expect(result).toEqual({ result: 'completed' })
    })
  })
})
