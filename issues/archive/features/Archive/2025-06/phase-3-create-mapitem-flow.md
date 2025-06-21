# Phase 3: Create New MapItem Flow (Progressive Enhancement)

## Overview

Implement a progressive create flow for new mapItems following our three-tier enhancement strategy:

1. **Tier 1 (Static Foundation)**: Core create functionality via dedicated pages - works without JavaScript
2. **Tier 2 (Pseudo-Static Enhancement)**: In-place dialogs with URL-based state - graceful degradation
3. **Tier 3 (Dynamic Enhancement)**: Optimistic updates and real-time feedback - enhanced UX

## Progressive Enhancement Strategy

### Tier 1: Static Foundation (Core Features - Full Fallback)

**Philosophy**: Essential create functionality that MUST work without JavaScript.

#### 1. Create Item Page

**File:** `src/app/map/[id]/create/page.tsx`

```typescript
import { notFound, redirect } from "next/navigation";
import { api } from "~/commons/trpc/server";
import { StaticCreateItemForm } from "./create-item.static";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";

interface CreateItemPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    coordId?: string;
    parentId?: string;
    returnTo?: string;
  }>;
}

export default async function CreateItemPage({
  params,
  searchParams,
}: CreateItemPageProps) {
  const { id: rootItemId } = await params;
  const { coordId, parentId, returnTo } = await searchParams;

  // Validate parent item if provided
  let parentItem = null;
  if (parentId) {
    try {
      parentItem = await api.map.getRootItemById({
        mapItemId: parseInt(parentId),
      });
    } catch {
      return notFound();
    }
  }

  // Determine target coordinates
  const targetCoords = coordId
    ? CoordSystem.parseId(coordId)
    : null;

  if (!targetCoords) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <StaticCreateItemForm
        targetCoords={targetCoords}
        parentItem={parentItem}
        returnUrl={returnTo || `/map/${rootItemId}`}
        rootItemId={rootItemId}
      />
    </div>
  );
}
```

#### 2. Static Create Form Component

**File:** `src/app/map/[id]/create/create-item.static.tsx`

```typescript
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { CreateItemFormFields } from "./form-fields.static";
import type { HexCoord } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { MapItemAPIContract } from "~/server/api/types/contracts";

interface StaticCreateItemFormProps {
  targetCoords: HexCoord;
  parentItem: MapItemAPIContract | null;
  returnUrl: string;
  rootItemId: string;
}

export function StaticCreateItemForm({
  targetCoords,
  parentItem,
  returnUrl,
  rootItemId,
}: StaticCreateItemFormProps) {
  const coordsDisplay = `${targetCoords.userId},${targetCoords.groupId}:${targetCoords.path.join(",")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={returnUrl}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Map
        </Link>
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Create New Item</h1>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={16} />
          <span>Position: {coordsDisplay}</span>
        </div>

        {parentItem && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              Creating child of: <span className="font-normal">{parentItem.name}</span>
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <CreateItemFormFields
        targetCoords={targetCoords}
        parentId={parentItem?.id}
        returnUrl={returnUrl}
        rootItemId={rootItemId}
      />
    </div>
  );
}
```

#### 3. Form Fields with Server Actions

**File:** `src/app/map/[id]/create/form-fields.static.tsx`

```typescript
import { redirect } from "next/navigation";
import { api } from "~/commons/trpc/server";
import { CoordSystem, type HexCoord } from "~/lib/domains/mapping/utils/hex-coordinates";
import {
  validateCreateItemInput,
  type CreateItemFormErrors
} from "./validation.utils";

interface CreateItemFormFieldsProps {
  targetCoords: HexCoord;
  parentId?: string;
  returnUrl: string;
  rootItemId: string;
  errors?: CreateItemFormErrors;
}

// Server action for form submission
async function createItemAction(formData: FormData) {
  const rawData = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    url: formData.get("url") as string,
    coordId: formData.get("coordId") as string,
    parentId: formData.get("parentId") as string,
    returnUrl: formData.get("returnUrl") as string,
  };

  // Validate input
  const validation = validateCreateItemInput(rawData);
  if (!validation.success) {
    // In a real implementation, you'd handle errors properly
    // For now, we'll redirect back with error params
    const errorParams = new URLSearchParams();
    Object.entries(validation.errors).forEach(([key, value]) => {
      errorParams.set(`error_${key}`, value);
    });
    return redirect(`${formData.get("returnUrl")}?${errorParams.toString()}`);
  }

  try {
    const coords = CoordSystem.parseId(rawData.coordId);

    // Create the item via tRPC
    await api.map.addItem({
      coords,
      parentId: rawData.parentId ? parseInt(rawData.parentId) : 0,
      title: validation.data.title,
      descr: validation.data.description,
      url: validation.data.url,
    });

    // Redirect back to map
    redirect(rawData.returnUrl);
  } catch (error) {
    console.error("Failed to create item:", error);
    redirect(`${rawData.returnUrl}?error=creation_failed`);
  }
}

export function CreateItemFormFields({
  targetCoords,
  parentId,
  returnUrl,
  rootItemId,
  errors,
}: CreateItemFormFieldsProps) {
  const coordId = CoordSystem.createId(targetCoords);

  return (
    <form action={createItemAction} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="coordId" value={coordId} />
      <input type="hidden" name="parentId" value={parentId || ""} />
      <input type="hidden" name="returnUrl" value={returnUrl} />

      {/* Title Field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          maxLength={200}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors?.title ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter item title"
        />
        {errors?.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors?.description ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter item description (optional)"
        />
        {errors?.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* URL Field */}
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          URL
        </label>
        <input
          type="url"
          id="url"
          name="url"
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors?.url ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="https://example.com (optional)"
        />
        {errors?.url && (
          <p className="mt-1 text-sm text-red-600">{errors.url}</p>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Item
        </button>
        <Link
          href={returnUrl}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

#### 4. Static Empty Tile with Fallback Links

**File:** `src/app/map/[id]/Tile/Base/empty.static.tsx`

```typescript
import Link from "next/link";
import { Plus } from "lucide-react";
import { StaticBaseTileLayout } from "./base.static";
import type { TileScale } from "./base.static";
import type { URLInfo } from "../../types/url-info";

interface StaticEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string };
  interactive?: boolean;
}

export function StaticEmptyTile({
  coordId,
  scale = 1,
  baseHexSize = 50,
  urlInfo,
  parentItem,
  interactive = true,
}: StaticEmptyTileProps) {
  // Create URL for static create page
  const createUrl = `/map/${urlInfo.rootItemId}/create?` + new URLSearchParams({
    coordId,
    ...(parentItem && { parentId: parentItem.id }),
    returnTo: `${urlInfo.pathname}?${urlInfo.searchParamsString}`,
  }).toString();

  return (
    <div className="group relative hover:z-10">
      <StaticBaseTileLayout
        coordId={coordId}
        scale={scale}
        color={{ color: "zinc", tint: "100" }}
        stroke={{ color: "zinc-950", width: 1 }}
        cursor="cursor-pointer"
        baseHexSize={baseHexSize}
        isFocusable={true}
      >
        <EmptyTileContent
          createUrl={createUrl}
          parentItem={parentItem}
          interactive={interactive}
        />
      </StaticBaseTileLayout>
    </div>
  );
}

interface EmptyTileContentProps {
  createUrl: string;
  parentItem?: { id: string; name: string };
  interactive: boolean;
}

function EmptyTileContent({
  createUrl,
  parentItem,
  interactive
}: EmptyTileContentProps) {
  if (!interactive) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-400">
        <div className="text-center">
          <div className="text-xs opacity-50">Empty</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Link
        href={createUrl}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white opacity-0 shadow-lg hover:bg-green-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-green-400 group-hover:opacity-100"
        aria-label={`Create new item${parentItem ? ` under ${parentItem.name}` : ""}`}
        title={`Create new item${parentItem ? ` under ${parentItem.name}` : ""}`}
      >
        <Plus size={16} />
      </Link>
    </div>
  );
}
```

### Tier 2: Pseudo-Static Enhancement (Enhanced Features - Graceful Degradation)

**Philosophy**: Features that enhance UX but aren't critical, using URL-based state management.

#### 1. Create Mode Controller

**File:** `src/app/map/[id]/Controls/create-mode.controller.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";

interface CreateModeControllerProps {
  urlInfo: { pathname: string; searchParamsString: string };
}

export function CreateModeController({ urlInfo }: CreateModeControllerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Sync with URL parameter
  useEffect(() => {
    const createMode = searchParams.get("createMode") === "true";
    setIsCreateMode(createMode);

    // Update document cursor
    if (createMode) {
      document.body.style.cursor = "crosshair";
    } else {
      document.body.style.cursor = "";
    }

    return () => {
      document.body.style.cursor = "";
    };
  }, [searchParams]);

  const toggleCreateMode = () => {
    const newParams = new URLSearchParams(urlInfo.searchParamsString);

    if (isCreateMode) {
      newParams.delete("createMode");
    } else {
      newParams.set("createMode", "true");
    }

    const newUrl = `${urlInfo.pathname}?${newParams.toString()}`;
    router.push(newUrl);
  };

  return (
    <button
      onClick={toggleCreateMode}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        isCreateMode
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
      aria-pressed={isCreateMode}
      title={isCreateMode ? "Exit create mode" : "Enter create mode"}
    >
      {isCreateMode ? <X size={16} /> : <Plus size={16} />}
      {isCreateMode ? "Exit Create" : "Create Mode"}
    </button>
  );
}
```

#### 2. Enhanced Empty Tile with Modal Support

**File:** `src/app/map/[id]/Tile/Base/empty.enhanced.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StaticEmptyTile } from "./empty.static";
import { CreateItemModal } from "../../Dialogs/create-item.modal";
import type { TileScale } from "./base.static";
import type { URLInfo } from "../../types/url-info";

interface EnhancedEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string };
  interactive?: boolean;
}

export function EnhancedEmptyTile(props: EnhancedEmptyTileProps) {
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const isCreateMode = searchParams.get("createMode") === "true";

  // Handle click in create mode
  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isCreateMode) {
      setShowModal(true);
    }
    // If not in create mode, fall through to static link behavior
  };

  // Enhanced empty tile with modal overlay
  return (
    <>
      <div onClick={isCreateMode ? handleCreateClick : undefined}>
        <StaticEmptyTile {...props} />
      </div>

      {/* Modal enhancement */}
      <CreateItemModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        coordId={props.coordId}
        parentItem={props.parentItem}
        urlInfo={props.urlInfo}
      />
    </>
  );
}
```

#### 3. Create Item Modal

**File:** `src/app/map/[id]/Dialogs/create-item.modal.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { CreateItemFormFields } from "../create/form-fields.static";
import type { URLInfo } from "../types/url-info";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordId: string;
  parentItem?: { id: string; name: string };
  urlInfo: URLInfo;
}

export function CreateItemModal({
  isOpen,
  onClose,
  coordId,
  parentItem,
  urlInfo,
}: CreateItemModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (formData: FormData) => {
    setIsSubmitting(true);

    try {
      // Submit to the same server action but with enhanced UX
      const response = await fetch(`/map/${urlInfo.rootItemId}/create/api`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        onClose();
        router.refresh(); // Refresh to show new item
      } else {
        // Fallback to full page form on error
        const createUrl = `/map/${urlInfo.rootItemId}/create?` + new URLSearchParams({
          coordId,
          ...(parentItem && { parentId: parentItem.id }),
          returnTo: `${urlInfo.pathname}?${urlInfo.searchParamsString}`,
        }).toString();

        router.push(createUrl);
      }
    } catch (error) {
      console.warn("Modal submission failed, falling back to page form", error);
      // Fallback to static form
      const createUrl = `/map/${urlInfo.rootItemId}/create?` + new URLSearchParams({
        coordId,
        ...(parentItem && { parentId: parentItem.id }),
        returnTo: `${urlInfo.pathname}?${urlInfo.searchParamsString}`,
      }).toString();

      router.push(createUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
        </DialogHeader>

        {/* Reuse static form fields with enhanced submission */}
        <form action={handleFormSubmit} className="space-y-4">
          <CreateItemFormFields
            targetCoords={coordId}
            parentId={parentItem?.id}
            returnUrl={`${urlInfo.pathname}?${urlInfo.searchParamsString}`}
            rootItemId={urlInfo.rootItemId}
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Item"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Tier 3: Dynamic Enhancement (Dynamic-Only Features - Enhanced UX)

**Philosophy**: Features that only work with JS, providing the best user experience with optimistic updates.

#### 1. Dynamic Create Item Dialog

**File:** `src/app/map/[id]/Dialogs/create-item.dynamic.tsx`

```typescript
"use client";

import { useState } from "react";
import { useMapCache } from "../State/map-cache";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import { validateCreateItemInput } from "../create/validation.utils";
import type { URLInfo } from "../types/url-info";

interface DynamicCreateItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  coordId: string;
  parentItem?: { id: string; name: string };
  urlInfo: URLInfo;
  onSuccess?: () => void;
}

export function DynamicCreateItemDialog({
  isOpen,
  onClose,
  coordId,
  parentItem,
  onSuccess,
}: DynamicCreateItemDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { state, loadMapRegion } = useMapCache();

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
      const coords = CoordSystem.parseId(coordId);

      // Optimistic update would go here
      // For now, we'll just submit and refresh

      // Create item via tRPC
      await api.map.addItem.mutate({
        coords,
        parentId: parentItem?.id ? parseInt(parentItem.id) : 0,
        title: validation.data.title,
        descr: validation.data.description,
        url: validation.data.url,
      });

      // Refresh cache to get new item
      await loadMapRegion(coords.userId + "," + coords.groupId);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to create item:", error);
      setErrors({ general: "Failed to create item. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Title Field */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              disabled={isSubmitting}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter item title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={isSubmitting}
              rows={3}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter item description (optional)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* URL Field */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              disabled={isSubmitting}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                errors.url ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="https://example.com (optional)"
            />
            {errors.url && (
              <p className="mt-1 text-sm text-red-600">{errors.url}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Item"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 2. Progressive Empty Tile

**File:** `src/app/map/[id]/Tile/Base/empty.progressive.tsx`

```typescript
"use client";

import { Suspense, lazy, Component, type ReactNode } from "react";
import { StaticEmptyTile } from "./empty.static";
import type { TileScale } from "./base.static";
import type { URLInfo } from "../../types/url-info";

// Lazy load enhanced version
const EnhancedEmptyTile = lazy(() =>
  import("./empty.enhanced").then((module) => ({
    default: module.EnhancedEmptyTile,
  })),
);

interface EmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string };
  interactive?: boolean;
}

// Error boundary for graceful degradation
class EmptyTileErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("Enhanced empty tile failed, using static fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function ProgressiveEmptyTile(props: EmptyTileProps) {
  const StaticFallback = () => <StaticEmptyTile {...props} />;

  return (
    <EmptyTileErrorBoundary fallback={<StaticFallback />}>
      <Suspense fallback={<StaticFallback />}>
        <EnhancedEmptyTile {...props} />
      </Suspense>
    </EmptyTileErrorBoundary>
  );
}

// Default export for easy importing
export { ProgressiveEmptyTile as EmptyTile };
```

## Files to Modify

### 1. Update StaticHexRegion for Empty Tiles

**File:** `src/app/map/[id]/Canvas/hex-region.static.tsx`

```typescript
// Add import
import { StaticEmptyTile } from "../Tile/Base/empty.static";

// Update RenderChild component
const RenderChild = ({
  coords,
  mapItems,
  baseHexSize = 50,
  expandedItemIds = [],
  scale,
  urlInfo,
  interactive = true,
}: RenderChildProps) => {
  const item = mapItems[coords];

  if (!item) {
    // Find parent item for context
    const parentCoords = coords.split(":").slice(0, -1).join(":");
    const parentItem = parentCoords ? mapItems[parentCoords] : undefined;

    return (
      <StaticEmptyTile
        coordId={coords}
        scale={scale}
        baseHexSize={baseHexSize}
        urlInfo={urlInfo}
        parentItem={parentItem ? {
          id: parentItem.metadata.dbId,
          name: parentItem.data.name
        } : undefined}
        interactive={interactive}
      />
    );
  }

  // ... existing item rendering logic
};
```

### 2. Update ActionPanel for Create Mode

**File:** `src/app/map/[id]/Controls/ActionPanel.tsx`

```typescript
// Add create mode to action items
const actionItems: ActionItem[] = [
  // ... existing actions
  {
    mode: "create",
    label: "Create",
    shortcut: "C",
    icon: <Plus className="h-5 w-5" />,
    description: "Click empty tiles to create new items",
    cursor: "crosshair",
  },
  // ... other actions
];
```

### 3. Add Validation Utilities

**File:** `src/app/map/[id]/create/validation.utils.ts`

```typescript
export interface CreateItemFormData {
  title: string;
  description: string;
  url: string;
}

export interface CreateItemFormErrors {
  title?: string;
  description?: string;
  url?: string;
  general?: string;
}

export interface ValidationResult {
  success: boolean;
  data: CreateItemFormData;
  errors: CreateItemFormErrors;
}

export function validateCreateItemInput(
  data: Partial<CreateItemFormData>,
): ValidationResult {
  const errors: CreateItemFormErrors = {};
  const cleanData: CreateItemFormData = {
    title: (data.title || "").trim(),
    description: (data.description || "").trim(),
    url: (data.url || "").trim(),
  };

  // Title validation
  if (!cleanData.title) {
    errors.title = "Title is required";
  } else if (cleanData.title.length > 200) {
    errors.title = "Title must be less than 200 characters";
  }

  // Description validation
  if (cleanData.description.length > 2000) {
    errors.description = "Description must be less than 2000 characters";
  }

  // URL validation
  if (cleanData.url && !isValidUrl(cleanData.url)) {
    errors.url = "Please enter a valid URL";
  }

  return {
    success: Object.keys(errors).length === 0,
    data: cleanData,
    errors,
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

## Implementation Order

### Phase 1: Static Foundation

1. Create static create item page and form components
2. Add server actions for form submission
3. Create static empty tile component
4. Update hex region to render empty tiles
5. Test full functionality without JavaScript

### Phase 2: Pseudo-Static Enhancement

1. Add create mode controller with URL state
2. Create enhanced empty tile with modal support
3. Add create item modal with fallback behavior
4. Update action panel for create mode
5. Test graceful degradation

### Phase 3: Dynamic Enhancement

1. Create dynamic create item dialog with optimistic updates
2. Add progressive empty tile with error boundaries
3. Integrate with map cache for real-time updates
4. Add loading states and error handling
5. Performance optimization and testing

## Progressive Enhancement Benefits

1. **Tier 1 Benefits**:

   - Works without JavaScript
   - SEO-friendly create flow
   - Accessible to all users
   - Reliable fallback behavior

2. **Tier 2 Benefits**:

   - Enhanced UX with modals
   - URL-based state persistence
   - Graceful degradation on errors
   - Better visual feedback

3. **Tier 3 Benefits**:
   - Optimistic updates
   - Real-time cache integration
   - Immediate user feedback
   - Best-in-class UX

## Testing Strategy

### 1. Progressive Enhancement Testing

- Test each tier independently
- Verify fallback behavior
- Test with JavaScript disabled
- Performance testing at each level

### 2. Error Boundary Testing

- Network failure scenarios
- JavaScript execution errors
- Cache corruption handling
- Graceful degradation verification

### 3. Accessibility Testing

- Keyboard navigation
- Screen reader compatibility
- Form validation feedback
- Focus management
