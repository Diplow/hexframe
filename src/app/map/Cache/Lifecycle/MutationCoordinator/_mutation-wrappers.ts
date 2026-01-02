import type { Coord, NonUserMapItemTypeString, VisibilityString } from "~/lib/domains/mapping/utils";
import { Visibility } from "~/lib/domains/mapping/utils";
import type { MapItemUpdateAttributes, MapItemCreateAttributes } from "~/lib/domains/mapping/utils";
import type { MapItemAPIContract } from "~/server/api";

/**
 * Internal helper to wrap tRPC mutations to match MutationCoordinator interface
 */
export function _wrapTRPCMutations(mutations: {
  addItemMutation: { mutateAsync: (params: {
    coords: Coord;
    parentId?: number | null;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
    itemType: NonUserMapItemTypeString;
  }) => Promise<MapItemAPIContract> };
  updateItemMutation: { mutateAsync: (params: {
    coords: Coord;
    data: MapItemUpdateAttributes;
  }) => Promise<MapItemAPIContract> };
  deleteItemMutation: { mutateAsync: (params: { coords: Coord }) => Promise<{ success: true }> };
  moveItemMutation: { mutateAsync: (params: {
    oldCoords: Coord;
    newCoords: Coord;
  }) => Promise<{
    movedItemId: string;
    modifiedItems: MapItemAPIContract[];
  }> };
  copyItemMutation: { mutateAsync: (params: {
    sourceCoords: Coord;
    destinationCoords: Coord;
    destinationParentId: number;
  }) => Promise<MapItemAPIContract> };
  removeChildrenByTypeMutation: { mutateAsync: (params: {
    coords: Coord;
    directionType: 'structural' | 'composed' | 'hexPlan';
  }) => Promise<{ success: boolean; deletedCount: number }> };
  updateVisibilityWithDescendantsMutation: { mutateAsync: (params: {
    coords: Coord;
    visibility: VisibilityString;
  }) => Promise<{ success: boolean; updatedCount: number }> };
}) {
  const wrappedAddItemMutation = {
    mutateAsync: async (params: {
      coords: Coord;
      parentId?: number | null;
      itemType: NonUserMapItemTypeString;
      title?: string;
      content?: string;
      preview?: string;
      link?: string;
    }) => {
      return mutations.addItemMutation.mutateAsync({
        parentId: params.parentId,
        coords: params.coords,
        title: params.title,
        content: params.content,
        preview: params.preview,
        link: params.link,
        itemType: params.itemType,
      });
    },
  };

  const wrappedUpdateItemMutation = {
    mutateAsync: async (params: { coords: Coord } & MapItemUpdateAttributes) => {
      return mutations.updateItemMutation.mutateAsync({
        coords: params.coords,
        data: {
          title: params.title,
          content: params.content,
          preview: params.preview,
          link: params.link,
          visibility: params.visibility,
          itemType: params.itemType,
        },
      });
    },
  };

  const wrappedDeleteItemMutation = {
    mutateAsync: async (params: { coords: Coord }) => {
      await mutations.deleteItemMutation.mutateAsync(params);
      return { success: true as const };
    },
  };

  const wrappedMoveItemMutation = {
    mutateAsync: async (params: { oldCoords: Coord; newCoords: Coord }) => {
      return mutations.moveItemMutation.mutateAsync(params);
    },
  };

  const wrappedCopyItemMutation = {
    mutateAsync: async (params: { sourceCoords: Coord; destinationCoords: Coord; destinationParentId: number }) => {
      return mutations.copyItemMutation.mutateAsync(params);
    },
  };

  const wrappedRemoveChildrenByTypeMutation = {
    mutateAsync: async (params: { coords: Coord; directionType: 'structural' | 'composed' | 'hexPlan' }) => {
      return mutations.removeChildrenByTypeMutation.mutateAsync(params);
    },
  };

  const wrappedUpdateVisibilityWithDescendantsMutation = {
    mutateAsync: async (params: { coords: Coord; visibility: Visibility }) => {
      const visibilityString = params.visibility === Visibility.PUBLIC ? 'public' : 'private';
      return mutations.updateVisibilityWithDescendantsMutation.mutateAsync({
        coords: params.coords,
        visibility: visibilityString,
      });
    },
  };

  return {
    addItemMutation: wrappedAddItemMutation,
    updateItemMutation: wrappedUpdateItemMutation,
    deleteItemMutation: wrappedDeleteItemMutation,
    moveItemMutation: wrappedMoveItemMutation,
    copyItemMutation: wrappedCopyItemMutation,
    removeChildrenByTypeMutation: wrappedRemoveChildrenByTypeMutation,
    updateVisibilityWithDescendantsMutation: wrappedUpdateVisibilityWithDescendantsMutation,
  };
}
