/**
 * Central export file for all database schema types
 */

import type { MapItem, NewMapItem } from "~/server/db/schema/_tables/mapping/map-items";

// Re-export all database types for use across the application
export type { MapItem as DBMapItem, NewMapItem as DBNewMapItem };
