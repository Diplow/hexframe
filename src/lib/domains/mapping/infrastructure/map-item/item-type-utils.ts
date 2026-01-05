/**
 * Item Type Utilities
 *
 * This file provides utilities for working with item types, supporting both
 * built-in MapItemType enum values and custom user-defined type strings.
 */

import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";

/**
 * Set of all built-in MapItemType enum values for fast lookup.
 */
const BUILT_IN_ITEM_TYPES: ReadonlySet<string> = new Set(
  Object.values(MapItemType)
);

/**
 * Reserved item types that cannot be created by users.
 * Currently 'user' is the only reserved type (for system-created root tiles).
 */
export const RESERVED_ITEM_TYPES: readonly string[] = ["user"] as const;

/**
 * Set of reserved types for fast lookup.
 */
const RESERVED_TYPES_SET: ReadonlySet<string> = new Set(RESERVED_ITEM_TYPES);

/**
 * Type guard to check if a value is one of the built-in MapItemType enum values.
 *
 * @param value - The value to check
 * @returns true if value is a built-in MapItemType
 */
export function isBuiltInItemType(value: unknown): value is MapItemType {
  if (typeof value !== "string" || value === "") {
    return false;
  }
  return BUILT_IN_ITEM_TYPES.has(value);
}

/**
 * Check if a value is a reserved item type (cannot be created by users).
 *
 * @param value - The value to check
 * @returns true if value is a reserved type like 'user'
 */
export function isReservedItemType(value: unknown): boolean {
  if (typeof value !== "string" || value === "") {
    return false;
  }
  return RESERVED_TYPES_SET.has(value);
}

/**
 * Check if a value is a custom (non-built-in) item type.
 * Custom types are non-empty strings that are not part of the built-in enum.
 *
 * @param value - The value to check
 * @returns true if value is a valid custom item type string
 */
export function isCustomItemType(value: unknown): boolean {
  if (typeof value !== "string" || value === "") {
    return false;
  }
  return !BUILT_IN_ITEM_TYPES.has(value);
}
