import { z } from "zod";
import { MapItemType, Visibility } from "~/lib/domains/mapping/_objects";

/**
 * Shared coordinate schema
 * Supports positive directions (1-6), zero (Center), and negative directions (-1 to -6) for composed children
 */
const CoordsSchema = z.object({
  userId: z.string().min(1),
  groupId: z.number().min(0),
  path: z.array(z.number().min(-6).max(6)),
});

/**
 * Visibility schema for tile access control
 */
export const VisibilitySchema = z.nativeEnum(Visibility);

/**
 * Item type schema that accepts built-in types or custom strings.
 * The "user" type is reserved for system-created root tiles.
 */
const ItemTypeSchema = z.string().min(1).refine(
  (val) => val.toLowerCase() !== "user",
  { message: "The 'user' item type is reserved for system-created root tiles" }
);

/**
 * Item type schema for creation - accepts enum or custom strings.
 * Uses union to maintain backward compatibility with enum values.
 */
const CreateItemTypeSchema = z.union([
  z.nativeEnum(MapItemType),
  ItemTypeSchema,
]);

/**
 * Shared schema for creating map items
 * This ensures type safety and consistency across all layers
 * Uses canonical field names: title, content, preview, link
 */
export const CreateMapItemParamsSchema = z.object({
  itemType: CreateItemTypeSchema,
  coords: CoordsSchema,
  title: z.string().optional(),
  content: z.string().optional(),
  preview: z.string().optional(),
  link: z.string().optional(),
  parentId: z.number().positive().optional(),
  visibility: VisibilitySchema.optional(),
});

export type CreateMapItemParams = z.infer<typeof CreateMapItemParamsSchema>;

/**
 * Schema for updating map item attributes
 * Uses canonical field names: title, content, preview, link
 * Accepts built-in types (organizational, context, system) or custom type strings.
 * The "user" type is reserved and cannot be set via updates.
 */
export const UpdateMapItemAttrsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  preview: z.string().optional(),
  link: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  /** Semantic tile type - built-in or custom (excludes "user" which is system-controlled) */
  itemType: ItemTypeSchema.optional(),
});

export type UpdateMapItemAttrs = z.infer<typeof UpdateMapItemAttrsSchema>;

/**
 * Validation functions for runtime type checking
 */
export const validateCreateMapItemParams = (data: unknown): CreateMapItemParams => {
  return CreateMapItemParamsSchema.parse(data);
};

export const validateUpdateMapItemAttrs = (data: unknown): UpdateMapItemAttrs => {
  return UpdateMapItemAttrsSchema.parse(data);
};