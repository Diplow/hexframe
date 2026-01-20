/**
 * Response Parser Utility
 *
 * Extracts structured execution results from agent responses.
 * Agents must end responses with a status block:
 * <status>{"result": "completed"}</status>
 * <status>{"result": "blocked", "reason": "description"}</status>
 */

// ==================== TYPES ====================

export interface AgentExecutionResult {
  result: 'completed' | 'blocked'
  reason?: string // Required if blocked
}

// ==================== INTERNAL HELPERS ====================

/**
 * Remove content inside code fences to avoid matching status blocks in examples.
 */
function _removeCodeFences(response: string): string {
  return response.replace(/```[\s\S]*?```/g, '')
}

/**
 * Find all status blocks and return the last one (most recent).
 */
function _findLastStatusBlock(response: string): string | null {
  const sanitizedResponse = _removeCodeFences(response)
  const statusBlockRegex = /<status>([\s\S]*?)<\/status>/g

  let lastMatch: string | null = null
  let match: RegExpExecArray | null

  while ((match = statusBlockRegex.exec(sanitizedResponse)) !== null) {
    lastMatch = match[1] ?? null
  }

  return lastMatch
}

/**
 * Parse and validate the JSON content from a status block.
 */
function _parseStatusJson(jsonContent: string): AgentExecutionResult | null {
  try {
    const parsed = JSON.parse(jsonContent.trim()) as Record<string, unknown>

    const result = parsed.result
    if (result !== 'completed' && result !== 'blocked') {
      console.warn(`parseAgentResponse: Invalid status result "${String(result)}"`)
      return null
    }

    const executionResult: AgentExecutionResult = {
      result
    }

    if (parsed.result === 'blocked' && typeof parsed.reason === 'string') {
      executionResult.reason = parsed.reason
    }

    return executionResult
  } catch {
    console.warn(`parseAgentResponse: Failed to parse status JSON: ${jsonContent}`)
    return null
  }
}

// ==================== PUBLIC API ====================

/**
 * Parse agent response to extract execution status.
 * Looks for <status>{"result": "completed"|"blocked", "reason"?: "..."}</status>
 *
 * Falls back to 'completed' if no status block found (graceful degradation).
 */
export function parseAgentResponse(response: string): AgentExecutionResult {
  const statusContent = _findLastStatusBlock(response)

  if (statusContent === null) {
    console.warn('parseAgentResponse: No status block found in response')
    return { result: 'completed' }
  }

  const parsed = _parseStatusJson(statusContent)

  if (parsed === null) {
    return { result: 'completed' }
  }

  return parsed
}
