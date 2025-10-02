import { z } from "zod";

// Zod schema for Coord validation
export const hexCoordSchema = z.object({
  userId: z.number(),
  groupId: z.number(),
  path: z.array(z.number()),
});

// Pagination schema
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

// User map creation schema
export const userMapCreationSchema = z.object({
  groupId: z.number().optional().default(0),
  title: z.string().min(3).max(100).optional(),
  content: z.string().max(500).optional(),
});

// User map update schema
export const userMapUpdateSchema = z.object({
  userId: z.number(),
  groupId: z.number(),
  title: z.string().min(3).max(100).optional(),
  content: z.string().max(500).optional(),
});

// User map identifier schema
export const userMapIdentifierSchema = z.object({
  userId: z.number(),
  groupId: z.number(),
});

// Item creation schema
export const itemCreationSchema = z.object({
  parentId: z.number().int().positive().optional().nullable(),
  coords: hexCoordSchema,
  title: z.string().optional(),
  content: z.string().optional(),
  preview: z.string().optional(),
  link: z.string().optional(),
});

// Item update schema
export const itemUpdateSchema = z.object({
  coords: hexCoordSchema,
  data: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    preview: z.string().optional(),
    link: z.string().optional(),
  }),
});

// Item movement schema
export const itemMovementSchema = z.object({
  oldCoords: hexCoordSchema,
  newCoords: hexCoordSchema,
});
