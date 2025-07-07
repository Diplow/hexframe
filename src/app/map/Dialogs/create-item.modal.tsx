"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { URLInfo } from "../types/url-info";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordId: string;
  parentItem?: { id: string; name: string };
  urlInfo: URLInfo;
  onSuccess?: () => void;
  preventRedirects?: boolean;
}

export function CreateItemModal({
  isOpen,
  onClose,
  coordId,
  parentItem,
  urlInfo,
  onSuccess,
  preventRedirects = false,
}: CreateItemModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateItemFormData>({
    title: "",
    description: "",
    url: "",
  });
  const [errors, setErrors] = useState<CreateItemFormErrors>({});

  // Parse coordinates for form
  // const targetCoords = CoordSystem.parseId(coordId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validation = validateCreateItemInput(formData);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Create FormData for API submission
      const apiFormData = new FormData();
      apiFormData.set("title", validation.data.title);
      apiFormData.set("description", validation.data.description);
      apiFormData.set("url", validation.data.url);
      apiFormData.set("coordId", coordId);
      apiFormData.set("parentId", parentItem?.id ?? "");
      apiFormData.set(
        "returnUrl",
        `${urlInfo.pathname}?${urlInfo.searchParamsString}`,
      );

      // Submit to the API
      const response = await fetch(`/map/create/api`, {
        method: "POST",
        body: apiFormData,
      });

      if (response.ok) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else if (!preventRedirects) {
          router.refresh(); // Refresh to show new item
        }
      } else {
        // Only show error in dynamic mode, otherwise fallback to page
        if (preventRedirects) {
          const errorData = await response.json() as { error?: string };
          setErrors({
            general:
              errorData.error ?? "Failed to create item. Please try again.",
          });
        } else {
          // Fallback to full page form on error
          const createUrl =
            `/map/create?` +
            new URLSearchParams({
              center: String(urlInfo.rootItemId),
              coordId,
              ...(parentItem && { parentId: parentItem.id }),
              returnTo: `${urlInfo.pathname}?${urlInfo.searchParamsString}`,
            }).toString();

          router.push(createUrl);
        }
      }
    } catch (error) {
      console.warn("Modal submission failed", error);

      if (preventRedirects) {
        // Show error in modal for dynamic mode
        setErrors({
          general: "Failed to create item. Please try again.",
        });
      } else {
        // Fallback to static form
        const createUrl =
          `/map/create?` +
          new URLSearchParams({
            center: String(urlInfo.rootItemId),
            coordId,
            ...(parentItem && { parentId: parentItem.id }),
            returnTo: `${urlInfo.pathname}?${urlInfo.searchParamsString}`,
          }).toString();

        router.push(createUrl);
      }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
          {parentItem && (
            <p className="text-sm text-neutral-600">
              Creating child of:{" "}
              <span className="font-medium">{parentItem.name}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-md bg-destructive-50 p-3">
              <p className="text-sm text-destructive-600">{errors.general}</p>
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
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-link-500 focus:outline-none focus:ring-1 focus:ring-link-500 ${
                errors.title ? "border-destructive-500" : "border-neutral-300"
              }`}
              placeholder="Enter item title"
              required
            />
            {errors.title && (
              <p className="mt-1 text-sm text-destructive-600">{errors.title}</p>
            )}
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
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-link-500 focus:outline-none focus:ring-1 focus:ring-link-500 ${
                errors.description ? "border-destructive-500" : "border-neutral-300"
              }`}
              placeholder="Enter item description (optional)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive-600">{errors.description}</p>
            )}
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
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-link-500 focus:outline-none focus:ring-1 focus:ring-link-500 ${
                errors.url ? "border-destructive-500" : "border-neutral-300"
              }`}
              placeholder="https://example.com (optional)"
            />
            {errors.url && (
              <p className="mt-1 text-sm text-destructive-600">{errors.url}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1 rounded-md bg-link-600 px-4 py-2 text-white hover:bg-link-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Item"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
