/**
 * Item Type Utilities (Cross-Domain Safe)
 *
 * This file provides utilities for working with item types, supporting both
 * built-in MapItemType enum values and custom user-defined type strings.
 *
 * NOTE: This module is placed in utils (not infrastructure) to avoid circular
 * dependencies. The _objects/map-item.ts imports from utils, so utils cannot
 * import from _objects during module initialization.
 */

// Import MapItemType directly from the source file to control load order
import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";

/**
 * Reserved item types that cannot be created by users.
 * Currently 'user' is the only reserved type (for system-created root tiles).
 */
export const RESERVED_ITEM_TYPES: readonly string[] = ["user"] as const;

// Lazy-initialize to avoid circular dependency issues during module loading
let _builtInItemTypes: ReadonlySet<string> | null = null;
let _reservedTypesSet: ReadonlySet<string> | null = null;

function getBuiltInItemTypes(): ReadonlySet<string> {
  _builtInItemTypes ??= new Set(Object.values(MapItemType));
  return _builtInItemTypes;
}

function getReservedTypesSet(): ReadonlySet<string> {
  _reservedTypesSet ??= new Set(RESERVED_ITEM_TYPES);
  return _reservedTypesSet;
}

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
  return getBuiltInItemTypes().has(value);
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
  return getReservedTypesSet().has(value);
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
  return !getBuiltInItemTypes().has(value);
}
