import type { VisibilityString } from "~/lib/domains/mapping/_objects";

/**
 * Canonical MapItem attribute types - Single Source of Truth
 *
 * These types define the standard field names for MapItem attributes across all layers:
 * - title: The item's title/name
 * - content: The item's main content/description
 * - preview: Optional short preview text for quick scanning
 * - link: Optional URL associated with the item
 */

/**
 * Base attributes for a MapItem (all fields present)
 */
export interface MapItemAttributes extends Record<string, unknown> {
  title: string;
  content: string;
  preview?: string;
  link: string;
  originId?: number | null;
}

/**
 * Attributes for updating a MapItem (all fields optional)
 */
export interface MapItemUpdateAttributes {
  title?: string;
  content?: string;
  preview?: string;
  link?: string;
  originId?: number | null;
  visibility?: VisibilityString;
  /**
   * Semantic tile type. Built-in types: "organizational", "context", "system".
   * Custom types (e.g., "template") are also supported.
   * The "user" type is reserved for system-created root tiles.
   */
  itemType?: string;
}

/**
 * Attributes for creating a MapItem
 */
export interface MapItemCreateAttributes {
  title?: string;
  content?: string;
  preview?: string;
  link?: string;
  originId?: number | null;
}
