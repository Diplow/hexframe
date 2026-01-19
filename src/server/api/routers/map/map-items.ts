import { z } from "zod";
import {
  createTRPCRouter,
  softAuthProcedure,
  dualAuthProcedure,
  mappingServiceMiddleware,
} from "~/server/api/trpc";
import { contractToApiAdapters } from "~/server/api/types/contracts";
import { type Coord } from "~/lib/domains/mapping/utils";
import type { VisibilityString } from '~/lib/domains/mapping/utils';
import { Visibility } from '~/lib/domains/mapping/utils';
import {
  hexCoordSchema,
  itemCreationSchema,
  itemUpdateSchema,
  itemMovementSchema,
  itemCopySchema,
} from "~/server/api/routers/map/map-schemas";
import { _createSuccessResponse, _getUserId, _getRequesterUserId } from "~/server/api/routers/map/_map-auth-helpers";
import { _requireOwnership, _throwForbidden, _throwNotFound, _throwInternalError } from "~/server/api/routers/_error-helpers";

/**
 * Convert string visibility to Visibility enum
 */
function toVisibilityEnum(visibility?: VisibilityString): Visibility | undefined {
  if (!visibility) return undefined;
  return visibility === "public" ? Visibility.PUBLIC : Visibility.PRIVATE;
}

/**
 * Validate and return item type string.
 * The "user" type is reserved and validated at schema level.
 * Custom types are passed through as-is.
 */
function toItemTypeValue(itemType: string): string {
  return itemType;
}

export const mapItemsRouter = createTRPCRouter({
  // Get root MapItem by ID
  getRootItemById: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ mapItemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const requester = _getRequesterUserId(ctx.user);
      const item = await ctx.mappingService.items.query.getItemById({
        itemId: input.mapItemId,
        requester,
      });
      return contractToApiAdapters.mapItem(item);
    }),

  // Get item by coordinates
  getItemByCoords: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({
      coords: hexCoordSchema,
      generations: z.number().optional().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const requester = _getRequesterUserId(ctx.user);
      if (input.generations > 0) {
        // Use the new method that returns item with generations
        const items = await ctx.mappingService.items.query.getItemWithGenerations({
          coords: input.coords as Coord,
          generations: input.generations,
          requester,
        });
        return items.map(contractToApiAdapters.mapItem);
      } else {
        // Original behavior for backward compatibility
        const item = await ctx.mappingService.items.crud.getItem({
          coords: input.coords as Coord,
          requester,
        });
        return contractToApiAdapters.mapItem(item);
      }
    }),

  // Get all items for a root item (was getItems)
  getItemsForRootItem: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(
      z.object({
        userId: z.string(),
        groupId: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const requester = _getRequesterUserId(ctx.user);
      const items = await ctx.mappingService.items.query.getItems({
        userId: input.userId,
        groupId: input.groupId,
        requester,
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
      const currentUserId = _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);

      // If creating a root item, ensure it's in user's own space
      if (coords.path.length === 0 && coords.userId !== currentUserId)
        _throwForbidden("You can only create root items in your own space");

      // If creating a child item, check parent ownership
      const hasExplicitParent = input.parentId !== null && input.parentId !== undefined;
      if (hasExplicitParent) {
        const parentItem = await ctx.mappingService.items.query.getItemById({ itemId: input.parentId! });
        _requireOwnership(parentItem.ownerId, currentUserIdString, "add items to tiles");
      } else if (coords.path.length > 0) {
        // No explicit parent provided, but creating below root: validate inferred parent ownership
        const inferredParentCoords = { ...coords, path: coords.path.slice(0, -1) };
        const requester = _getRequesterUserId(ctx.user);
        const inferredParent = await ctx.mappingService.items.crud.getItem({ coords: inferredParentCoords, requester });
        _requireOwnership(inferredParent.ownerId, currentUserIdString, "add items to tiles");
      }

      const mapItem = await ctx.mappingService.items.crud.addItemToMap({
        parentId: input.parentId ?? null,
        coords: coords,
        title: input.title,
        content: input.content,
        preview: input.preview,
        link: input.link,
        visibility: toVisibilityEnum(input.visibility),
        itemType: toItemTypeValue(input.itemType),
      });
      return contractToApiAdapters.mapItem(mapItem);
    }),

  // Remove item
  removeItem: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ coords: hexCoordSchema }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the item they're trying to remove
      const currentUserId = _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);
      const requester = _getRequesterUserId(ctx.user);

      const item = await ctx.mappingService.items.crud.getItem({ coords: input.coords as Coord, requester });
      _requireOwnership(item.ownerId, currentUserIdString, "delete items");

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
      const currentUserId = _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);
      const requester = _getRequesterUserId(ctx.user);

      const existingItem = await ctx.mappingService.items.crud.getItem({ coords: input.coords as Coord, requester });
      _requireOwnership(existingItem.ownerId, currentUserIdString, "update items");

      const updateParams: {
        coords: Coord;
        title?: string;
        content?: string;
        preview?: string;
        link?: string;
        visibility?: Visibility;
        itemType?: string;
        requester?: typeof requester;
      } = {
        coords: input.coords as Coord,
        requester,
      };

      // Only include fields that are explicitly provided
      if (input.data.title !== undefined) updateParams.title = input.data.title;
      if (input.data.content !== undefined) updateParams.content = input.data.content;
      if (input.data.preview !== undefined) updateParams.preview = input.data.preview;
      if (input.data.link !== undefined) updateParams.link = input.data.link;
      if (input.data.visibility !== undefined) updateParams.visibility = toVisibilityEnum(input.data.visibility);
      if (input.data.itemType !== undefined) updateParams.itemType = toItemTypeValue(input.data.itemType);

      const item = await ctx.mappingService.items.crud.updateItem(updateParams);
      return contractToApiAdapters.mapItem(item);
    }),

  // Move map item
  moveMapItem: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(itemMovementSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user owns the item they're trying to move
      const currentUserId = _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);
      const requester = _getRequesterUserId(ctx.user);

      const existingItem = await ctx.mappingService.items.crud.getItem({ coords: input.oldCoords as Coord, requester });
      _requireOwnership(existingItem.ownerId, currentUserIdString, "move items");

      // Also check if they own the destination parent (if moving to a new parent)
      const oldCoords = input.oldCoords as Coord;
      const newCoords = input.newCoords as Coord;

      // If changing parent (different path prefix), check new parent ownership
      if (oldCoords.path.slice(0, -1).join() !== newCoords.path.slice(0, -1).join()) {
        if (newCoords.path.length > 0) {
          const newParentCoords = { ...newCoords, path: newCoords.path.slice(0, -1) };
          const newParentItem = await ctx.mappingService.items.crud.getItem({ coords: newParentCoords, requester });
          _requireOwnership(newParentItem.ownerId, currentUserIdString, "move items to tiles");
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
  getDescendants: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const requester = _getRequesterUserId(ctx.user);
      const descendants = await ctx.mappingService.items.query.getDescendants({
        itemId: input.itemId,
        requester,
      });
      return descendants.map(contractToApiAdapters.mapItem);
    }),

  // Get ancestors of an item (all items in the path from root to the item)
  getAncestors: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const requester = _getRequesterUserId(ctx.user);
      const ancestors = await ctx.mappingService.items.query.getAncestors({
        itemId: input.itemId,
        requester,
      });
      return ancestors.map(contractToApiAdapters.mapItem);
    }),

  // Get composed children for a tile (direction 0 container and its children)
  getComposedChildren: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ coordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const requester = _getRequesterUserId(ctx.user);
      const composedItems = await ctx.mappingService.items.query.getComposedChildren({
        coordId: input.coordId,
        requester,
      });
      return composedItems.map(contractToApiAdapters.mapItem);
    }),

  // Check if a tile has composition (direction 0 child)
  hasComposition: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({ coordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const requester = _getRequesterUserId(ctx.user);
      const hasComp = await ctx.mappingService.items.query.hasComposition({
        coordId: input.coordId,
        requester,
      });
      return { hasComposition: hasComp };
    }),

  // Get version history for a tile
  getItemHistory: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(
      z.object({
        coords: hexCoordSchema,
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const history = await ctx.mappingService.items.history.getItemHistory({
          coords: input.coords as Coord,
          limit: input.limit,
          offset: input.offset,
        });
        return history;
      } catch (error) {
        _throwInternalError("Failed to retrieve version history", error);
      }
    }),

  // Get a specific historical version of a tile
  getItemVersion: softAuthProcedure
    .use(mappingServiceMiddleware)
    .input(
      z.object({
        coords: hexCoordSchema,
        versionNumber: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const version = await ctx.mappingService.items.history.getItemVersion({
          coords: input.coords as Coord,
          versionNumber: input.versionNumber,
        });
        return version;
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found"))
          _throwNotFound(`Version ${input.versionNumber} not found`, error);
        _throwInternalError("Failed to retrieve version", error);
      }
    }),

  // Deep copy a map item and its entire subtree
  copyMapItem: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(itemCopySchema)
    .mutation(async ({ ctx, input }) => {
      const currentUserId = _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);

      // Verify user owns the source item
      const sourceItem = await ctx.mappingService.items.query.getItemByCoords({ coords: input.sourceCoords as Coord });
      _requireOwnership(sourceItem.ownerId, currentUserIdString, "copy items");

      // Verify user owns the destination parent
      const destinationParentItem = await ctx.mappingService.items.query.getItemById({ itemId: input.destinationParentId });
      _requireOwnership(destinationParentItem.ownerId, currentUserIdString, "copy items to locations");

      // Perform the deep copy
      const copiedItem = await ctx.mappingService.items.deepCopyMapItem({
        sourceCoords: input.sourceCoords as Coord,
        destinationCoords: input.destinationCoords as Coord,
        destinationParentId: input.destinationParentId,
      });

      return contractToApiAdapters.mapItem(copiedItem);
    }),

  // Remove children by direction type (bulk delete)
  removeChildrenByType: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({
      coords: hexCoordSchema,
      directionType: z.enum(['structural', 'composed', 'hexPlan']),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUserId = _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);

      // Verify user owns the parent item
      const requester = _getRequesterUserId(ctx.user);
      const parentItem = await ctx.mappingService.items.crud.getItem({ coords: input.coords as Coord, requester });
      _requireOwnership(parentItem.ownerId, currentUserIdString, "delete children of items");

      const result = await ctx.mappingService.items.crud.removeChildrenByType({
        coords: input.coords as Coord,
        directionType: input.directionType,
      });

      return { success: true, deletedCount: result.deletedCount };
    }),

  // Update visibility for a tile and all its descendants in a single operation
  updateVisibilityWithDescendants: dualAuthProcedure
    .use(mappingServiceMiddleware)
    .input(z.object({
      coords: hexCoordSchema,
      visibility: z.enum(['public', 'private']),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUserId = _getUserId(ctx.user);
      const currentUserIdString = String(currentUserId);
      const requester = _getRequesterUserId(ctx.user);

      // Verify user owns the root item
      const item = await ctx.mappingService.items.crud.getItem({ coords: input.coords as Coord, requester });
      _requireOwnership(item.ownerId, currentUserIdString, "change visibility of items");

      const result = await ctx.mappingService.items.crud.updateVisibilityWithDescendants({
        coords: input.coords as Coord,
        visibility: toVisibilityEnum(input.visibility)!,
        requester,
      });

      return { success: true, updatedCount: result.updatedCount };
    }),
});
