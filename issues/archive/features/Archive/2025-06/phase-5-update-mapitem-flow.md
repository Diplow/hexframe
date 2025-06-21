# Phase 5: Update MapItem Flow

## Objective

Implement a comprehensive item update flow that allows users to edit existing map items with proper form validation, error handling, and integration with the existing mutation system.

## New Components to Create

### 1. `src/app/map/[id]/Dialogs/UpdateItemDialog.tsx`

**Purpose:** Main dialog for updating existing map items

**Component Interface:**

```typescript
interface UpdateItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateItemFormData) => Promise<void>;
  item: HexTileData;
  isLoading?: boolean;
  error?: string | null;
}

export function UpdateItemDialog({
  isOpen,
  onClose,
  onSubmit,
  item,
  isLoading = false,
  error = null,
}: UpdateItemDialogProps) {
  const [formData, setFormData] = useState<UpdateItemFormData>({
    title: item.data.name,
    description: item.data.description,
    url: item.data.url,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const originalData = {
      title: item.data.name,
      description: item.data.description,
      url: item.data.url,
    };

    setHasChanges(
      formData.title !== originalData.title ||
      formData.description !== originalData.description ||
      formData.url !== originalData.url
    );
  }, [formData, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error handled by parent component
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      // Show confirmation dialog for unsaved changes
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Item</DialogTitle>
          <DialogDescription>
            Edit item at position {item.metadata.coordId}
          </DialogDescription>
        </DialogHeader>

        <UpdateItemForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          hasChanges={hasChanges}
        />

        <UnsavedChangesDialog
          isOpen={showUnsavedChangesDialog}
          onClose={() => setShowUnsavedChangesDialog(false)}
          onDiscard={() => {
            setShowUnsavedChangesDialog(false);
            onClose();
          }}
          onSave={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
```

### 2. `src/app/map/[id]/Dialogs/UpdateItemForm.tsx`

**Purpose:** Form component with validation for item updates

**Component Interface:**

```typescript
interface UpdateItemFormData {
  title: string;
  description: string;
  url: string;
}

interface UpdateItemFormProps {
  data: UpdateItemFormData;
  onChange: (data: UpdateItemFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error?: string | null;
  hasChanges: boolean;
}

export function UpdateItemForm({
  data,
  onChange,
  onSubmit,
  isLoading,
  error,
  hasChanges,
}: UpdateItemFormProps) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const validateForm = useCallback((formData: UpdateItemFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    if (formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    if (formData.url && !isValidUrl(formData.url)) {
      errors.url = 'Please enter a valid URL';
    }

    return errors;
  }, []);

  const handleFieldChange = (field: keyof UpdateItemFormData, value: string) => {
    const newData = { ...data, [field]: value };
    onChange(newData);
    setIsDirty(true);

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(data);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    onSubmit(e);
  };

  // Auto-save functionality (optional)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!isDirty || !hasChanges) return;

    const autoSaveTimer = setTimeout(() => {
      const errors = validateForm(data);
      if (Object.keys(errors).length === 0) {
        setAutoSaveStatus('saving');
        // Trigger auto-save (could be a separate callback)
        // onAutoSave?.(data);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [data, isDirty, hasChanges, validateForm]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="Enter item title"
          disabled={isLoading}
          className={validationErrors.title ? 'border-red-500' : ''}
        />
        {validationErrors.title && (
          <p className="text-sm text-red-500">{validationErrors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="Enter item description"
          disabled={isLoading}
          className={validationErrors.description ? 'border-red-500' : ''}
          rows={4}
        />
        {validationErrors.description && (
          <p className="text-sm text-red-500">{validationErrors.description}</p>
        )}
        <div className="text-right text-xs text-gray-500">
          {data.description.length}/500 characters
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          value={data.url}
          onChange={(e) => handleFieldChange('url', e.target.value)}
          placeholder="https://example.com"
          disabled={isLoading}
          className={validationErrors.url ? 'border-red-500' : ''}
        />
        {validationErrors.url && (
          <p className="text-sm text-red-500">{validationErrors.url}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {autoSaveStatus === 'saving' && (
        <div className="flex items-center text-sm text-gray-600">
          <LoadingSpinner className="mr-2 h-3 w-3" />
          Auto-saving...
        </div>
      )}

      {autoSaveStatus === 'saved' && (
        <div className="text-sm text-green-600">
          ✓ Changes saved automatically
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onChange(data)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !hasChanges}>
          {isLoading ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Updating...
            </>
          ) : hasChanges ? (
            'Save Changes'
          ) : (
            'No Changes'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
```

### 3. `src/app/map/[id]/Dialogs/UnsavedChangesDialog.tsx`

**Purpose:** Dialog to handle unsaved changes when user tries to close

**Component Interface:**

```typescript
interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedChangesDialog({
  isOpen,
  onClose,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. What would you like to do?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button onClick={onSave} className="w-full">
            Save Changes
          </Button>
          <Button onClick={onDiscard} variant="outline" className="w-full">
            Discard Changes
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full">
            Continue Editing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. `src/app/map/[id]/Tile/Item/EditItemButton.tsx`

**Purpose:** Button component for triggering item edit

**Component Interface:**

```typescript
interface EditItemButtonProps {
  item: HexTileData;
  onClick: () => void;
  className?: string;
  size?: "small" | "medium" | "large";
}

export function EditItemButton({
  item,
  onClick,
  className,
  size = "medium",
}: EditItemButtonProps) {
  const sizeClasses = {
    small: "h-6 w-6",
    medium: "h-8 w-8",
    large: "h-12 w-12"
  };

  const iconSizes = {
    small: 12,
    medium: 16,
    large: 24
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center justify-center rounded-full bg-blue-500 text-white opacity-0 shadow-lg hover:bg-blue-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 group-hover:opacity-100",
        sizeClasses[size],
        className
      )}
      aria-label={`Edit item "${item.data.name}"`}
      title={`Edit "${item.data.name}"`}
    >
      <Edit size={iconSizes[size]} />
    </button>
  );
}
```

### 5. `src/app/map/[id]/State/update-manager.ts`

**Purpose:** Hook for managing update operations and optimistic updates

**Hook Interface:**

```typescript
interface UpdateState {
  isUpdating: boolean;
  updateError: string | null;
  optimisticUpdates: Record<string, Partial<HexTileData>>;
}

export function useUpdateManager(
  mapItems: Record<string, HexTileData>,
  updateItemMutation: any,
) {
  const [updateState, setUpdateState] = useState<UpdateState>({
    isUpdating: false,
    updateError: null,
    optimisticUpdates: {},
  });

  const applyOptimisticUpdate = useCallback(
    (coordId: string, updates: Partial<HexTileData>) => {
      setUpdateState((prev) => ({
        ...prev,
        optimisticUpdates: {
          ...prev.optimisticUpdates,
          [coordId]: updates,
        },
      }));
    },
    [],
  );

  const clearOptimisticUpdate = useCallback((coordId: string) => {
    setUpdateState((prev) => ({
      ...prev,
      optimisticUpdates: {
        ...prev.optimisticUpdates,
        [coordId]: undefined,
      },
    }));
  }, []);

  const updateItem = useCallback(
    async (item: HexTileData, updates: UpdateItemFormData) => {
      const coordId = item.metadata.coordId;

      // Apply optimistic update
      const optimisticItem = {
        ...item,
        data: {
          ...item.data,
          name: updates.title,
          description: updates.description,
          url: updates.url,
        },
      };

      applyOptimisticUpdate(coordId, optimisticItem);
      setUpdateState((prev) => ({
        ...prev,
        isUpdating: true,
        updateError: null,
      }));

      try {
        await updateItemMutation.mutateAsync({
          coords: item.metadata.coordinates,
          data: {
            title: updates.title,
            descr: updates.description,
            url: updates.url,
          },
        });

        clearOptimisticUpdate(coordId);
      } catch (error) {
        // Revert optimistic update on error
        clearOptimisticUpdate(coordId);
        setUpdateState((prev) => ({
          ...prev,
          updateError: error instanceof Error ? error.message : "Update failed",
        }));
        throw error;
      } finally {
        setUpdateState((prev) => ({ ...prev, isUpdating: false }));
      }
    },
    [updateItemMutation, applyOptimisticUpdate, clearOptimisticUpdate],
  );

  const getItemWithOptimisticUpdates = useCallback(
    (coordId: string): HexTileData | undefined => {
      const baseItem = mapItems[coordId];
      const optimisticUpdate = updateState.optimisticUpdates[coordId];

      if (!baseItem) return undefined;
      if (!optimisticUpdate) return baseItem;

      return { ...baseItem, ...optimisticUpdate };
    },
    [mapItems, updateState.optimisticUpdates],
  );

  return {
    updateState,
    updateItem,
    getItemWithOptimisticUpdates,
    clearUpdateError: () =>
      setUpdateState((prev) => ({ ...prev, updateError: null })),
  };
}
```

## Files to Modify

### 6. `src/app/map/[id]/Canvas/hex-region.static.tsx`

**Changes:**

- Add support for edit mode interaction with existing items
- Integrate edit dialog triggering

**Updated Logic:**

```typescript
// In the RenderChild component
const RenderChild = ({
  coords,
  mapItems,
  expandedItemIds,
  urlInfo,
}: RenderChildProps) => {
  const item = mapItems[coords];
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { data: interactionData } = useInteractionMode(/* ... */);

  if (item) {
    return (
      <>
        <StaticItemTile
          item={item}
          baseHexSize={baseHexSize}
          allExpandedItemIds={expandedItemIds}
          hasChildren={hasChildren(item)}
          isCenter={coordId === center}
          urlInfo={urlInfo}
          onEditClick={interactionData.interactionMode === "edit" ? () => setShowEditDialog(true) : undefined}
          isEditMode={interactionData.interactionMode === "edit"}
        />

        <UpdateItemDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          item={item}
          onSubmit={handleUpdateItem}
        />
      </>
    );
  }

  // ... existing empty tile logic
};
```

### 7. `src/app/map/[id]/Tile/Item/item.static.tsx`

**Changes:**

- Add edit button when in edit mode
- Add click handler for edit functionality

**Updated Component:**

```typescript
interface StaticItemTileProps {
  item: HexTileData;
  baseHexSize?: number;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter?: boolean;
  urlInfo: URLInfo;
  onEditClick?: () => void;
  isEditMode?: boolean;
}

export const StaticItemTile = ({
  item,
  baseHexSize = 50,
  allExpandedItemIds,
  hasChildren,
  isCenter = false,
  urlInfo,
  onEditClick,
  isEditMode = false,
}: StaticItemTileProps) => {
  const handleTileClick = () => {
    if (isEditMode && onEditClick) {
      onEditClick();
    }
  };

  return (
    <div
      className={cn(
        "group relative hover:z-10",
        isEditMode && "cursor-pointer hover:ring-2 hover:ring-blue-400"
      )}
      onClick={handleTileClick}
    >
      {/* ... existing tile content */}

      {isEditMode && onEditClick && (
        <EditItemButton
          item={item}
          onClick={onEditClick}
          className="absolute right-1 top-1 z-20"
        />
      )}
    </div>
  );
};
```

### 8. `src/app/map/[id]/State/dialog-manager.ts`

**Changes:**

- Add update dialog state management

**Updated Interface:**

```typescript
interface DialogState {
  createItem: {
    isOpen: boolean;
    coordinates: HexCoord | null;
  };
  editItem: {
    isOpen: boolean;
    item: HexTileData | null;
  };
  updateItem: {
    isOpen: boolean;
    item: HexTileData | null;
  };
}

export function useDialogManager() {
  // ... existing code

  const openUpdateDialog = useCallback((item: HexTileData) => {
    setDialogState((prev) => ({
      ...prev,
      updateItem: { isOpen: true, item },
    }));
  }, []);

  const closeUpdateDialog = useCallback(() => {
    setDialogState((prev) => ({
      ...prev,
      updateItem: { isOpen: false, item: null },
    }));
  }, []);

  return {
    dialogState,
    // ... existing methods
    openUpdateDialog,
    closeUpdateDialog,
  };
}
```

### 9. `src/app/map/[id]/Controls/ActionPanel.tsx`

**Changes:**

- Update edit mode description to clarify create vs edit functionality

**Updated Action:**

```typescript
{
  mode: "edit",
  label: "Create/Edit",
  shortcut: "C",
  icon: <Edit className="h-5 w-5" />,
  description: "Click empty spaces to create new items, or existing items to edit them",
  cursor: "text",
}
```

## Integration Points

### 10. `src/app/map/[id]/Canvas/index.static.tsx`

**Changes:**

- Integrate update dialog with mutation system

**Updated Component:**

```typescript
export const StaticMapCanvas = ({
  centerInfo,
  items,
  expandedItemIds = [],
  baseHexSize = 50,
  urlInfo,
  children,
}: StaticMapCanvasProps) => {
  const { dialogState, openUpdateDialog, closeUpdateDialog } = useDialogManager();
  const { mutations } = useMutations(/* ... */);
  const { updateItem, updateState } = useUpdateManager(items, mutations.updateItemMutation);

  const handleUpdateItem = async (data: UpdateItemFormData) => {
    if (!dialogState.updateItem.item) return;

    await updateItem(dialogState.updateItem.item, data);
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="pointer-events-auto grid flex-grow place-items-center overflow-auto p-4">
        {/* ... existing content */}

        <UpdateItemDialog
          isOpen={dialogState.updateItem.isOpen}
          onClose={closeUpdateDialog}
          onSubmit={handleUpdateItem}
          item={dialogState.updateItem.item!}
          isLoading={updateState.isUpdating}
          error={updateState.updateError}
        />
      </div>
    </div>
  );
};
```

## Implementation Order

1. Create update form validation utilities
2. Create UnsavedChangesDialog component
3. Create UpdateItemForm component
4. Create UpdateItemDialog component
5. Create EditItemButton component
6. Create update manager hook
7. Update tile components to support edit mode
8. Update dialog manager for update dialogs
9. Integrate with canvas components
10. Add comprehensive testing

## Testing Strategy

- **Unit Tests:** Test form validation, unsaved changes handling
- **Integration Tests:** Test update flow end-to-end
- **Optimistic Updates Tests:** Test optimistic update behavior and rollback
- **Form Tests:** Test auto-save, validation, character limits
- **E2E Tests:** Test complete item update workflow

## UX Considerations

- **Unsaved Changes:** Clear warning when user tries to close with unsaved changes
- **Auto-save:** Optional auto-save functionality for better UX
- **Visual Feedback:** Clear indication of edit mode and editable items
- **Form Validation:** Real-time validation with helpful error messages
- **Loading States:** Proper loading indicators during updates
- **Optimistic Updates:** Immediate UI feedback with rollback on error
- **Keyboard Support:** Proper tab order and keyboard shortcuts
- **Accessibility:** ARIA labels and screen reader support

## Error Handling

- **Network Errors:** Retry mechanisms and offline indicators
- **Validation Errors:** Field-level and form-level error display
- **Conflict Resolution:** Handle concurrent edit conflicts gracefully
- **Permission Errors:** Clear messaging for unauthorized actions
- **Optimistic Update Failures:** Proper rollback and error messaging

## Performance Considerations

- **Optimistic Updates:** Immediate UI feedback without waiting for server
- **Form Debouncing:** Debounced validation and auto-save
- **Memory Management:** Proper cleanup of optimistic update state
- **Efficient Re-renders:** Minimize unnecessary component re-renders
