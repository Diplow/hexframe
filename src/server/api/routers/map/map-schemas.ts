import { z } from "zod";

/**
 * Zod schema for hexagonal coordinate validation.
 * Coordinates uniquely identify a tile's position in the hexagonal map.
 */
export const hexCoordSchema = z.object({
  /** User ID (better-auth UUID string) */
  userId: z.string(),
  /** Group ID for multi-map support (default: 0) */
  groupId: z.number(),
  /** Path array of directions from root (accepts positive 1-6, negative -1 to -6, and 0) */
  path: z.array(z.number()),
});

/** Pagination schema for list endpoints */
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

/** User map creation schema */
export const userMapCreationSchema = z.object({
  groupId: z.number().optional().default(0),
  title: z.string().min(3).max(100).optional(),
  content: z.string().max(500).optional(),
});

/** User map update schema */
export const userMapUpdateSchema = z.object({
  userId: z.string(),
  groupId: z.number(),
  title: z.string().min(3).max(100).optional(),
  content: z.string().max(500).optional(),
});

/** User map identifier schema */
export const userMapIdentifierSchema = z.object({
  userId: z.string(),
  groupId: z.number(),
});

/**
 * Item type schema for API-level tile classification.
 *
 * Defines the semantic classification of tiles that clients can set:
 * - "organizational": Structural grouping tiles (e.g., "Plans", "Interests")
 * - "context": Reference material tiles to explore on-demand
 * - "system": Executable capability tiles that can be invoked like a skill
 *
 * Note: "user" type is excluded as it's system-controlled (root tiles only).
 *
 * @see MapItemType in src/lib/domains/mapping/_objects/map-item.ts for full enum
 */
export const itemTypeSchema = z.enum(["organizational", "context", "system"]);

/**
 * Item creation schema for adding new tiles to the map.
 *
 * @property itemType - Optional semantic classification (defaults to "context").
 *   Cannot be set to "user" - that's system-controlled for root tiles only.
 */
export const itemCreationSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  coords: hexCoordSchema,
  title: z.string().optional(),
  content: z.string().optional(),
  preview: z.string().optional(),
  link: z.string().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  /** Semantic tile type: "organizational", "context", or "system" (defaults to "context") */
  itemType: itemTypeSchema.optional(),
});

/**
 * Item update schema for modifying existing tiles.
 *
 * @property data.itemType - Optional new semantic classification.
 *   Cannot change to/from "user" type - that's system-controlled.
 */
export const itemUpdateSchema = z.object({
  coords: hexCoordSchema,
  data: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    preview: z.string().optional(),
    link: z.string().optional(),
    visibility: z.enum(["public", "private"]).optional(),
    /** Semantic tile type: "organizational", "context", or "system" */
    itemType: itemTypeSchema.optional(),
  }),
});

// Item movement schema
export const itemMovementSchema = z.object({
  oldCoords: hexCoordSchema,
  newCoords: hexCoordSchema,
});

// Item copy schema
export const itemCopySchema = z.object({
  sourceCoords: hexCoordSchema,
  destinationCoords: hexCoordSchema,
  destinationParentId: z.number().int().positive(),
});
