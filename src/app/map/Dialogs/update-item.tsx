"use client";

import { useState, useEffect } from "react";
import { useMapCache } from "../Cache/map-cache";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  validateCreateItemInput,
  type CreateItemFormData,
  type CreateItemFormErrors,
} from "~/lib/domains/mapping/utils/validation";
import type { TileData } from "../types/tile-data";

interface DynamicUpdateItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: TileData;
  onSuccess?: () => void;
}

export function UpdateItemDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
}: DynamicUpdateItemDialogProps) {
  const [formData, setFormData] = useState<CreateItemFormData>({
    title: item.data.name,
    description: item.data.description,
    url: item.data.url,
  });
  const [errors, setErrors] = useState<CreateItemFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateItemOptimistic } = useMapCache();

  // Reset form when item changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: item.data.name,
        description: item.data.description,
        url: item.data.url,
      });
      setErrors({});
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validation = validateCreateItemInput(formData);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    // Check if anything actually changed
    const hasChanges =
      validation.data.title !== item.data.name ||
      validation.data.description !== item.data.description ||
      validation.data.url !== item.data.url;

    if (!hasChanges) {
      onClose();
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // The cache handles everything:
      // 1. Optimistic update (immediate UI feedback)
      // 2. Server call (via tRPC mutation)
      // 3. localStorage sync
      // 4. Rollback on error
      await updateItemOptimistic(item.metadata.coordId, {
        title: validation.data.title,
        description: validation.data.description,
        url: validation.data.url,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to update item:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Failed to update item. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormDataChange = (
    field: keyof CreateItemFormData,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Use local error
  const displayError = errors.general;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Item</DialogTitle>
          <p className="text-sm text-neutral-600">
            Editing: <span className="font-medium">{item.data.name}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="rounded-md bg-destructive-50 p-3">
              <p className="text-sm text-destructive-600">{displayError}</p>
            </div>
          )}

          {/* Title Field */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-neutral-700"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleFormDataChange("title", e.target.value)}
              disabled={isSubmitting}
              maxLength={200}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm transition-colors focus:border-link-500 focus:outline-none focus:ring-1 focus:ring-link-500 ${
                errors.title ? "border-destructive-500" : "border-neutral-300"
              }`}
              placeholder="Enter item title"
              required
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-sm text-destructive-600">{errors.title}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-neutral-700"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                handleFormDataChange("description", e.target.value)
              }
              disabled={isSubmitting}
              rows={3}
              maxLength={2000}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm transition-colors focus:border-link-500 focus:outline-none focus:ring-1 focus:ring-link-500 ${
                errors.description ? "border-destructive-500" : "border-neutral-300"
              }`}
              placeholder="Enter item description (optional)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              {formData.description.length}/2000 characters
            </p>
          </div>

          {/* URL Field */}
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-medium text-neutral-700"
            >
              URL
            </label>
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => handleFormDataChange("url", e.target.value)}
              disabled={isSubmitting}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm transition-colors focus:border-link-500 focus:outline-none focus:ring-1 focus:ring-link-500 ${
                errors.url ? "border-destructive-500" : "border-neutral-300"
              }`}
              placeholder="https://example.com (optional)"
            />
            {errors.url && (
              <p className="mt-1 text-sm text-destructive-600">{errors.url}</p>
            )}
          </div>

          {/* Progress indicator for optimistic updates */}
          {isSubmitting && (
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
                  Updating item... (changes are visible immediately!)
                </p>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1 rounded-md bg-link-600 px-4 py-2 text-white transition-colors hover:bg-link-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
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
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
