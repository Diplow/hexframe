import type { Coord } from "~/lib/domains/mapping/utils";
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
    directionType: 'structural' | 'composed' | 'executionHistory';
  }) => Promise<{ success: boolean; deletedCount: number }> };
}) {
  const wrappedAddItemMutation = {
    mutateAsync: async (params: { coords: Coord; parentId?: number | null } & MapItemCreateAttributes) => {
      return mutations.addItemMutation.mutateAsync({
        parentId: params.parentId,
        coords: params.coords,
        title: params.title,
        content: params.content,
        preview: params.preview,
        link: params.link,
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
    mutateAsync: async (params: { coords: Coord; directionType: 'structural' | 'composed' | 'executionHistory' }) => {
      return mutations.removeChildrenByTypeMutation.mutateAsync(params);
    },
  };

  return {
    addItemMutation: wrappedAddItemMutation,
    updateItemMutation: wrappedUpdateItemMutation,
    deleteItemMutation: wrappedDeleteItemMutation,
    moveItemMutation: wrappedMoveItemMutation,
    copyItemMutation: wrappedCopyItemMutation,
    removeChildrenByTypeMutation: wrappedRemoveChildrenByTypeMutation,
  };
}
