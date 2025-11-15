/**
 * Performance and safety limits for mapping operations
 *
 * These constants are calibrated based on actual production data analysis (2025-11-15):
 * - Current DB: 693 items, max depth 8, max content 10KB
 * - Constants provide 10-14x headroom for growth
 * - Worst-case memory: ~214MB (well under 1GB limit)
 *
 * See PERFORMANCE_ANALYSIS.md for detailed analysis and calculations.
 */

/**
 * Maximum depth of hierarchy for operations.
 *
 * Prevents unbounded recursion and excessively deep trees.
 *
 * - Current observed max: 8 levels
 * - Headroom: 12.5x
 * - Rationale: Protects against pathological linear hierarchies while
 *   allowing extremely deep structures if genuinely needed
 */
export const MAX_HIERARCHY_DEPTH = 100;

/**
 * Maximum number of descendants for copy/move operations.
 *
 * Prevents memory exhaustion and timeout issues.
 *
 * - Current total items: 693
 * - Headroom: 14.4x
 * - Memory at limit: ~214MB (assuming 20KB content per item)
 * - Rationale: Large enough for any realistic operation, small enough
 *   to prevent accidental bulk operations from causing timeouts
 */
export const MAX_DESCENDANTS_FOR_OPERATION = 10000;

/**
 * Default limit for descendant queries when no limit is specified.
 *
 * - Typical operation size: 100-500 items
 * - Memory at limit: ~7MB (assuming P95 content size)
 * - Rationale: Covers 99% of use cases while keeping queries fast
 */
export const DEFAULT_DESCENDANTS_LIMIT = 1000;

/**
 * Batch size for bulk insert operations.
 *
 * PostgreSQL can handle large batches, but we limit for memory management.
 *
 * - Memory per batch: ~3.5MB (assuming P95 content size)
 * - Batches per operation: ~20 (for max operation size)
 * - Rationale: Large enough for performance gains, small enough to
 *   avoid memory pressure during large operations
 */
export const BATCH_INSERT_SIZE = 500;
