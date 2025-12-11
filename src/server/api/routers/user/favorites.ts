import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  t,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { tileFavorites, mapItems, baseItems } from "~/server/db/schema";
import {
  FavoritesService,
  DrizzleFavoritesRepository,
  DuplicateShortcutNameError,
  InvalidShortcutNameError,
  FavoriteNotFoundError,
} from "~/lib/domains/iam";
import { CoordSystem } from "~/lib/domains/mapping/utils";

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
  mapItemId: z.string().min(1, "Map item ID is required"),
  shortcutName: z.string().min(1, "Shortcut name is required"),
});

const removeFavoriteSchema = z.object({
  shortcutName: z.string().min(1, "Shortcut name is required"),
});

const removeFavoriteByMapItemSchema = z.object({
  mapItemId: z.string().min(1, "Map item ID is required"),
});

const getFavoriteByShortcutSchema = z.object({
  shortcutName: z.string().min(1, "Shortcut name is required"),
});

const isFavoritedSchema = z.object({
  mapItemId: z.string().min(1, "Map item ID is required"),
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
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      try {
        const favorite = await ctx.favoritesService.addFavorite({
          userId: ctx.user.id,
          mapItemId: input.mapItemId,
          shortcutName: input.shortcutName,
        });
        return favorite;
      } catch (error) {
        if (error instanceof DuplicateShortcutNameError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Shortcut name "${input.shortcutName}" already exists`,
          });
        }
        if (error instanceof InvalidShortcutNameError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid shortcut name: only alphanumeric characters and underscores are allowed`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add favorite",
        });
      }
    }),

  /**
   * Remove a favorite by shortcut name
   */
  remove: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(removeFavoriteSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      try {
        await ctx.favoritesService.removeFavorite(ctx.user.id, input.shortcutName);
        return { success: true };
      } catch (error) {
        if (error instanceof FavoriteNotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Favorite "${input.shortcutName}" not found`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove favorite",
        });
      }
    }),

  /**
   * Remove a favorite by map item ID (for context menu "Remove from Favorites")
   */
  removeByMapItem: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(removeFavoriteByMapItemSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      await ctx.favoritesRepository.deleteByUserAndMapItem(
        ctx.user.id,
        input.mapItemId
      );
      return { success: true };
    }),

  /**
   * Get a favorite by shortcut name
   */
  getByShortcut: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(getFavoriteByShortcutSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      try {
        const favorite = await ctx.favoritesService.getFavoriteByShortcut(
          ctx.user.id,
          input.shortcutName
        );
        return favorite;
      } catch (error) {
        if (error instanceof FavoriteNotFoundError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Favorite "${input.shortcutName}" not found`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get favorite",
        });
      }
    }),

  /**
   * List all favorites for the current user
   */
  list: protectedProcedure
    .use(favoritesServiceMiddleware)
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const favorites = await ctx.favoritesService.listFavorites(ctx.user.id);
      return favorites;
    }),

  /**
   * List all favorites with tile title and preview data
   * Enriches favorites with data from the associated map items
   */
  listWithPreviews: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      // Get all favorites for the user
      const favorites = await db
        .select({
          id: tileFavorites.id,
          userId: tileFavorites.userId,
          mapItemId: tileFavorites.mapItemId,
          shortcutName: tileFavorites.shortcutName,
          createdAt: tileFavorites.createdAt,
        })
        .from(tileFavorites)
        .where(eq(tileFavorites.userId, ctx.user.id));

      // Enrich each favorite with tile data
      const enrichedFavorites = await Promise.all(
        favorites.map(async (favorite) => {
          try {
            // Parse the coordId to get coordinates
            const coords = CoordSystem.parseId(favorite.mapItemId);

            // Query for the map item by coordinates
            const mapItemResults = await db
              .select({
                title: baseItems.title,
                preview: baseItems.preview,
              })
              .from(mapItems)
              .innerJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
              .where(
                and(
                  eq(mapItems.coord_user_id, coords.userId),
                  eq(mapItems.coord_group_id, coords.groupId),
                  eq(mapItems.path, coords.path.length > 0 ? coords.path.join(",") : "")
                )
              )
              .limit(1);

            const tileData = mapItemResults[0];
            return {
              ...favorite,
              title: tileData?.title ?? undefined,
              preview: tileData?.preview ?? undefined,
            };
          } catch {
            // If coordinate parsing fails, return without enrichment
            return {
              ...favorite,
              title: undefined,
              preview: undefined,
            };
          }
        })
      );

      return enrichedFavorites;
    }),

  /**
   * Check if a map item is favorited by the current user
   */
  isFavorited: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(isFavoritedSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const favorite = await ctx.favoritesRepository.findByUserAndMapItem(
        ctx.user.id,
        input.mapItemId
      );
      return {
        isFavorited: favorite !== null,
        favorite: favorite,
      };
    }),

  /**
   * Update the shortcut name of a favorite
   */
  updateShortcut: protectedProcedure
    .use(favoritesServiceMiddleware)
    .input(updateShortcutSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      try {
        const favorite = await ctx.favoritesService.updateShortcut(
          ctx.user.id,
          input.favoriteId,
          input.newShortcutName
        );
        return favorite;
      } catch (error) {
        if (error instanceof DuplicateShortcutNameError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Shortcut name "${input.newShortcutName}" already exists`,
          });
        }
        if (error instanceof InvalidShortcutNameError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid shortcut name: only alphanumeric characters and underscores are allowed`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update shortcut name",
        });
      }
    }),
});
