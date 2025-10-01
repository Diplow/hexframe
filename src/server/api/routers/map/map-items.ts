import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  dualAuthProcedure,
  mappingServiceMiddleware,
} from "~/server/api/trpc";
import { contractToApiAdapters } from "~/server/api/types/contracts";
import { type Coord } from "~/lib/domains/mapping/utils";
import {
  hexCoordSchema,
  itemCreationSchema,
  itemUpdateSchema,
  itemMovementSchema,
} from "~/server/api/routers/map/map-schemas";
import { _createSuccessResponse, _getUserId } from "~/server/api/routers/map/_map-auth-helpers";
import { TRPCError } from "@trpc/server";

export const mapItemsRouter = createTRPCRouter({
  // Get root MapItem by ID
  getRootItemById: publicProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ mapItemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.mappingService.items.query.getItemById({
        itemId: input.mapItemId,
      });
      return contractToApiAdapters.mapItem(item);
    }),

  // Get item by coordinates
  getItemByCoords: publicProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({
      coords: hexCoordSchema,
      generations: z.number().optional().default(0)
    }))
    .query(async ({ ctx, input }) => {
      if (input.generations > 0) {
        // Use the new method that returns item with generations
        const items = await ctx.mappingService.items.query.getItemWithGenerations({
          coords: input.coords as Coord,
          generations: input.generations,
        });
        return items.map(contractToApiAdapters.mapItem);
      } else {
        // Original behavior for backward compatibility
        const item = await ctx.mappingService.items.crud.getItem({
          coords: input.coords as Coord,
        });
        return contractToApiAdapters.mapItem(item);
      }
    }),

  // Get all items for a root item (was getItems)
  getItemsForRootItem: publicProcedure
    .use(mappingServiceMiddleware)
    .input(
      z.object({
        userId: z.number(),
        groupId: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.mappingService.items.query.getItems({
        userId: input.userId,
        groupId: input.groupId,
      });
      return items.map(contractToApiAdapters.mapItem);
    }),

  // Add item to map
  addItem: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(itemCreationSchema)
    .mutation(async ({ ctx, input }) => {
      // For adding items, check if user owns the parent item OR if they're creating in their own space
      const coords = input.coords as Coord;
      const currentUserId = await _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);
      
      // If creating a root item, ensure it's in user's own space
      if (coords.path.length === 0 && coords.userId !== currentUserId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only create root items in your own space",
        });
      }
      
      // If creating a child item, check parent ownership
      const hasExplicitParent = input.parentId !== null && input.parentId !== undefined;
      if (hasExplicitParent) {
        const parentItem = await ctx.mappingService.items.query.getItemById({
          itemId: input.parentId!,
        });
        if (parentItem.ownerId !== currentUserIdString) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only add items to tiles you own",
          });
        }
      } else if (coords.path.length > 0) {
        // No explicit parent provided, but creating below root: validate inferred parent ownership
        const inferredParentCoords = { ...coords, path: coords.path.slice(0, -1) };
        const inferredParent = await ctx.mappingService.items.crud.getItem({ coords: inferredParentCoords });
        if (inferredParent.ownerId !== currentUserIdString) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only add items to tiles you own",
          });
        }
      }
      
      const mapItem = await ctx.mappingService.items.crud.addItemToMap({
        parentId: input.parentId ?? null,
        coords: coords,
        title: input.title,
        content: input.content,
        preview: input.preview,
        link: input.link,
      });
      return contractToApiAdapters.mapItem(mapItem);
    }),

  // Remove item
  removeItem: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ coords: hexCoordSchema }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the item they're trying to remove
      const currentUserId = await _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);
      
      const item = await ctx.mappingService.items.crud.getItem({
        coords: input.coords as Coord,
      });
      
      if (item.ownerId !== currentUserIdString) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete items you own",
        });
      }
      
      await ctx.mappingService.items.crud.removeItem({
        coords: input.coords as Coord,
      });
      return _createSuccessResponse() as { success: true };
    }),

  // Update item
  updateItem: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(itemUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the item they're trying to update
      const currentUserId = await _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);

      const existingItem = await ctx.mappingService.items.crud.getItem({
        coords: input.coords as Coord,
      });

      if (existingItem.ownerId !== currentUserIdString) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update items you own",
        });
      }

      const updateParams = {
        coords: input.coords as Coord,
        title: input.data.title,
        content: input.data.content,
        preview: input.data.preview,
        link: input.data.link,
      };

      const item = await ctx.mappingService.items.crud.updateItem(updateParams);
      return contractToApiAdapters.mapItem(item);
    }),

  // Move map item
  moveMapItem: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(itemMovementSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the item they're trying to move
      const currentUserId = await _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);
      
      const existingItem = await ctx.mappingService.items.crud.getItem({
        coords: input.oldCoords as Coord,
      });
      
      if (existingItem.ownerId !== currentUserIdString) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only move items you own",
        });
      }
      
      // Also check if they own the destination parent (if moving to a new parent)
      const oldCoords = input.oldCoords as Coord;
      const newCoords = input.newCoords as Coord;
      
      // If changing parent (different path prefix), check new parent ownership
      if (oldCoords.path.slice(0, -1).join() !== newCoords.path.slice(0, -1).join()) {
        if (newCoords.path.length > 0) {
          const newParentCoords = { ...newCoords, path: newCoords.path.slice(0, -1) };
          const newParentItem = await ctx.mappingService.items.crud.getItem({
            coords: newParentCoords,
          });
          
          if (newParentItem.ownerId !== currentUserIdString) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only move items to tiles you own",
            });
          }
        }
      }
      
      const result = await ctx.mappingService.items.query.moveMapItem({
        oldCoords: oldCoords,
        newCoords: newCoords,
      });
      
      // Convert domain objects to API contracts
      return {
        modifiedItems: result.modifiedItems.map(contractToApiAdapters.mapItem),
        movedItemId: String(result.movedItemId),
        affectedCount: result.affectedCount,
      };
    }),

  // Get descendants
  getDescendants: publicProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const descendants = await ctx.mappingService.items.query.getDescendants({
        itemId: input.itemId,
      });
      return descendants.map(contractToApiAdapters.mapItem);
    }),

  // Get ancestors of an item (all items in the path from root to the item)
  getAncestors: publicProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const ancestors = await ctx.mappingService.items.query.getAncestors({
        itemId: input.itemId,
      });
      return ancestors.map(contractToApiAdapters.mapItem);
    }),
});
