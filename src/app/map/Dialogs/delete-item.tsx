"use client";

import { useState } from "react";
import { useMapCache } from "../Cache/map-cache";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { TileData } from "../types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";

interface DynamicDeleteItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: TileData;
  onSuccess?: () => void;
}

export function DeleteItemDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
}: DynamicDeleteItemDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { deleteItemOptimistic, center, navigateToItem } = useMapCache();
  
  // Check if this is a user's root map item (no path)
  const isUserRootMap = item.metadata.coordinates.path.length === 0;
  
  // Check if this is the current center
  const isCurrentCenter = item.metadata.coordId === center;

  const handleDelete = async () => {
    // Prevent deleting user's root map
    if (isUserRootMap) {
      setError("Cannot delete a user's root map item.");
      return;
    }
    
    setIsDeleting(true);
    setError(null);

    try {
      // If deleting the current center, navigate to parent first
      if (isCurrentCenter) {
        const parentCoordId = CoordSystem.getParentCoordFromId(item.metadata.coordId);
        if (parentCoordId) {
          await navigateToItem(parentCoordId);
        }
      }
      
      // The cache handles everything:
      // 1. Optimistic removal (immediate UI feedback)
      // 2. Server call (via tRPC mutation)
      // 3. localStorage cleanup
      // 4. Rollback on error
      await deleteItemOptimistic(item.metadata.coordId);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to delete item:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete item. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-secondary-50 p-4">
            <p className="text-sm text-secondary-800">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{item.data.name}</span>?
            </p>
            {isUserRootMap ? (
              <p className="mt-2 text-xs text-secondary-700">
                This is a user&apos;s root map and cannot be deleted.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-secondary-700">
                  This action cannot be undone. All child items will also be
                  deleted.
                </p>
                {isCurrentCenter && (
                  <p className="mt-2 text-xs text-secondary-700">
                    <strong>Note:</strong> Since this is the current center, you will be
                    redirected to the parent item after deletion.
                  </p>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive-50 p-3">
              <p className="text-sm text-destructive-600">{error}</p>
            </div>
          )}

          {/* Progress indicator for optimistic deletion */}
          {isDeleting && (
            <div className="rounded-md bg-link-50 p-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-link-600"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="32"
                    strokeDashoffset="32"
                  >
                    <animate
                      attributeName="stroke-dasharray"
                      dur="2s"
                      values="0 32;32 32;32 32"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="stroke-dashoffset"
                      dur="2s"
                      values="0;-32;-64"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
                <p className="text-sm text-link-700">
                  Deleting item... (it disappears immediately!)
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isDeleting || isUserRootMap}
              className="flex-1 rounded-md bg-destructive-600 px-4 py-2 text-white transition-colors hover:bg-destructive-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="32"
                      strokeDashoffset="32"
                    >
                      <animate
                        attributeName="stroke-dasharray"
                        dur="2s"
                        values="0 32;32 32;32 32"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-dashoffset"
                        dur="2s"
                        values="0;-32;-64"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
                  Deleting...
                </span>
              ) : (
                "Delete Item"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
