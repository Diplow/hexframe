import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  t,
} from "~/server/api/trpc";
import { db, schema } from "~/server/db";
const { tileFavorites, mapItems, baseItems } = schema;
import {
  FavoritesService,
  DrizzleFavoritesRepository,
  DuplicateShortcutNameError,
  InvalidShortcutNameError,
  FavoriteNotFoundError,
} from "~/lib/domains/iam";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { _mapDomainError } from "~/server/api/routers/_error-helpers";

/**
 * Middleware that injects the FavoritesService into context
 */
const favoritesServiceMiddleware = t.middleware(async ({ ctx, next }) => {
  const repository = new DrizzleFavoritesRepository(db);
  const favoritesService = new FavoritesService(repository);
  return next({
    ctx: {
      ...ctx,
      favoritesService,
      favoritesRepository: repository,
    },
  });
});

// Input validation schemas
const addFavoriteSchema = z.object({
  mapItemId: z.number().int().positive("Map item ID must be a positive integer"),
  shortcutName: z.string().min(1, "Shortcut name is required"),
});

const removeFavoriteSchema = z.object({
  shortcutName: z.string().min(1, "Shortcut name is required"),
});

const removeFavoriteByMapItemSchema = z.object({
  mapItemId: z.number().int().positive("Map item ID must be a positive integer"),
});

const getFavoriteByShortcutSchema = z.object({
  shortcutName: z.string().min(1, "Shortcut name is required"),
});

const isFavoritedSchema = z.object({
  mapItemId: z.number().int().positive("Map item ID must be a positive integer"),
});

const updateShortcutSchema = z.object({
  favoriteId: z.string().min(1, "Favorite ID is required"),
  newShortcutName: z.string().min(1, "New shortcut name is required"),
});

/**
 * Favorites Router
 *
 * Handles user tile favorites/bookmarks operations.
 * Allows users to save tiles with custom shortcut names for quick access.
 */
export const favoritesRouter = createTRPCRouter({
  /**
   * Add a tile to favorites with a shortcut name
   */
  add: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(addFavoriteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.favoritesService.addFavorite({
          userId: ctx.user!.id,
          mapItemId: input.mapItemId,
          shortcutName: input.shortcutName,
        });
      } catch (error) {
        _mapDomainError(error, "Failed to add favorite", [
          { type: DuplicateShortcutNameError, code: "CONFLICT", message: `Shortcut name "${input.shortcutName}" already exists` },
          { type: InvalidShortcutNameError, code: "BAD_REQUEST", message: "Invalid shortcut name: only alphanumeric characters and underscores are allowed" },
        ]);
      }
    }),

  /**
   * Remove a favorite by shortcut name
   */
  remove: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(removeFavoriteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.favoritesService.removeFavorite(ctx.user!.id, input.shortcutName);
        return { success: true };
      } catch (error) {
        _mapDomainError(error, "Failed to remove favorite", [
          { type: FavoriteNotFoundError, code: "NOT_FOUND", message: `Favorite "${input.shortcutName}" not found` },
        ]);
      }
    }),

  /**
   * Remove a favorite by map item ID (for context menu "Remove from Favorites")
   */
  removeByMapItem: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(removeFavoriteByMapItemSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.favoritesRepository.deleteByUserAndMapItem(ctx.user!.id, input.mapItemId);
      return { success: true };
    }),

  /**
   * Get a favorite by shortcut name
   */
  getByShortcut: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(getFavoriteByShortcutSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.favoritesService.getFavoriteByShortcut(ctx.user!.id, input.shortcutName);
      } catch (error) {
        _mapDomainError(error, "Failed to get favorite", [
          { type: FavoriteNotFoundError, code: "NOT_FOUND", message: `Favorite "${input.shortcutName}" not found` },
        ]);
      }
    }),

  /**
   * List all favorites for the current user
   */
  list: protectedProcedure
    .use(favoritesServiceMiddleware)
    .query(async ({ ctx }) => {
      return await ctx.favoritesService.listFavorites(ctx.user!.id);
    }),

  /**
   * List all favorites with tile title, preview, and coordinate data
   * Uses JOIN to efficiently enrich favorites with map item data
   */
  listWithPreviews: protectedProcedure
    .query(async ({ ctx }) => {
      // Single query with JOINs to get favorites + map item + base item data
      const results = await db
        .select({
          id: tileFavorites.id,
          userId: tileFavorites.userId,
          mapItemId: tileFavorites.mapItemId,
          shortcutName: tileFavorites.shortcutName,
          createdAt: tileFavorites.createdAt,
          // Map item coordinates for building coordId
          coordUserId: mapItems.coord_user_id,
          coordGroupId: mapItems.coord_group_id,
          path: mapItems.path,
          // Base item content
          title: baseItems.title,
          preview: baseItems.preview,
        })
        .from(tileFavorites)
        .innerJoin(mapItems, eq(tileFavorites.mapItemId, mapItems.id))
        .innerJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
        .where(eq(tileFavorites.userId, ctx.user.id));

      // Transform results to include coordId for navigation
      return results.map((row) => ({
        id: row.id,
        userId: row.userId,
        mapItemId: row.mapItemId,
        shortcutName: row.shortcutName,
        createdAt: row.createdAt,
        title: row.title,
        preview: row.preview ?? undefined,
        // Build coordId from map item coordinates for client navigation
        coordId: CoordSystem.createId({
          userId: row.coordUserId,
          groupId: row.coordGroupId,
          path: row.path ? row.path.split(",").map(Number) : [],
        }),
      }));
    }),

  /**
   * Check if a map item is favorited by the current user
   */
  isFavorited: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(isFavoritedSchema)
    .query(async ({ ctx, input }) => {
      const favorite = await ctx.favoritesRepository.findByUserAndMapItem(ctx.user!.id, input.mapItemId);
      return { isFavorited: favorite !== null, favorite };
    }),

  /**
   * Update the shortcut name of a favorite
   */
  updateShortcut: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(updateShortcutSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.favoritesService.updateShortcut(ctx.user!.id, input.favoriteId, input.newShortcutName);
      } catch (error) {
        _mapDomainError(error, "Failed to update shortcut name", [
          { type: DuplicateShortcutNameError, code: "CONFLICT", message: `Shortcut name "${input.newShortcutName}" already exists` },
          { type: InvalidShortcutNameError, code: "BAD_REQUEST", message: "Invalid shortcut name: only alphanumeric characters and underscores are allowed" },
        ]);
      }
    }),
});
