/**
 * Compiler types for two-phase template rendering.
 */

import type { TileData } from '~/lib/domains/agentic/templates/_pre-processor'
import type { TemplatePool } from '~/lib/domains/agentic/templates/_pool'

// ==================== PUBLIC TYPES ====================

/**
 * Context for template compilation.
 */
export interface CompileContext {
  /** Current path prefix for variable naming (e.g., [-3, -1]) */
  currentPath: number[]
  /** The task tile with full children tree */
  taskTile: TileData
  /** Template pool for itemType-based dispatch */
  templatePool: TemplatePool
  /** Maximum recursion depth (default: 10) */
  maxDepth: number
  /** Current recursion depth */
  currentDepth: number
}

/**
 * Result of template compilation.
 */
export interface CompileResult {
  /** The compiled structural template */
  template: string
  /** All variable paths found during compilation */
  variablePaths: string[]
}
