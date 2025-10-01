import { z } from "zod";
import { MapItemType } from "~/lib/domains/mapping/_objects";

/**
 * Shared coordinate schema
 */
const CoordsSchema = z.object({
  userId: z.number().positive(),
  groupId: z.number().min(0),
  path: z.array(z.number().min(0).max(6)),
});

/**
 * Shared schema for creating map items
 * This ensures type safety and consistency across all layers
 * Uses canonical field names: title, content, preview, link
 */
export const CreateMapItemParamsSchema = z.object({
  itemType: z.nativeEnum(MapItemType),
  coords: CoordsSchema,
  title: z.string().optional(),
  content: z.string().optional(),
  preview: z.string().optional(),
  link: z.string().optional(),
  parentId: z.number().positive().optional(),
});

export type CreateMapItemParams = z.infer<typeof CreateMapItemParamsSchema>;

/**
 * Schema for updating map item attributes
 * Uses canonical field names: title, content, preview, link
 */
export const UpdateMapItemAttrsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  preview: z.string().optional(),
  link: z.string().optional(),
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