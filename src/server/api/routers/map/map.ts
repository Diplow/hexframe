import { createTRPCRouter } from "~/server/api/trpc";
import { mapUserRouter } from "~/server/api/routers/map/map-user";
import { mapItemsRouter } from "~/server/api/routers/map/map-items";

export const mapRouter = createTRPCRouter({
  // User map management endpoints
  user: mapUserRouter,

  // Map item management endpoints
  items: mapItemsRouter,

  // Legacy flat endpoints for backward compatibility
  // These delegate to the nested routers
  getMyRootItems: mapUserRouter.getMyRootItems,
  createUserMap: mapUserRouter.createUserMap,
  updateUserMapInfo: mapUserRouter.updateUserMapInfo,
  removeUserMap: mapUserRouter.removeUserMap,
  createDefaultMapForCurrentUser: mapUserRouter.createDefaultMapForCurrentUser,
  getUserMap: mapUserRouter.getUserMap,

  getRootItemById: mapItemsRouter.getRootItemById,
  getItemByCoords: mapItemsRouter.getItemByCoords,
  getItemsForRootItem: mapItemsRouter.getItemsForRootItem,
  addItem: mapItemsRouter.addItem,
  removeItem: mapItemsRouter.removeItem,
  updateItem: mapItemsRouter.updateItem,
  moveMapItem: mapItemsRouter.moveMapItem,
  getDescendants: mapItemsRouter.getDescendants,
  getAncestors: mapItemsRouter.getAncestors,
});
