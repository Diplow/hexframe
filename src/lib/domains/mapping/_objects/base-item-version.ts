/**
 * BaseItemVersion - Version history record for a BaseItem
 *
 * Represents a snapshot of a BaseItem's state at a specific point in time.
 * Versions are created automatically when a BaseItem is created or updated,
 * providing a complete audit trail of changes.
 *
 * Version numbering:
 * - Version 1: Created when BaseItem is first created
 * - Version 2+: Created when BaseItem is updated (captures OLD values before update)
 *
 * Design notes:
 * - This is a read-only value object (no mutations)
 * - Versions are immutable historical records
 * - Used by ItemHistoryService (NOT ItemCrudService)
 */
export type BaseItemVersion = {
  /**
   * Unique identifier for this version record
   */
  id: number;

  /**
   * ID of the BaseItem this version belongs to
   */
  baseItemId: number;

  /**
   * Sequential version number (1, 2, 3, ...)
   * Unique within a given baseItemId
   */
  versionNumber: number;

  /**
   * Title of the BaseItem at this version
   */
  title: string;

  /**
   * Content/description of the BaseItem at this version
   */
  content: string;

  /**
   * Optional preview text for quick scanning
   * Null if not set at this version
   */
  preview: string | null;

  /**
   * Optional URL associated with the BaseItem
   * Null if not set at this version
   */
  link: string | null;

  /**
   * Timestamp when this version was created
   */
  createdAt: Date;

  /**
   * User who created this version
   * Null for now (future feature for user tracking)
   */
  updatedBy: string | null;
};
