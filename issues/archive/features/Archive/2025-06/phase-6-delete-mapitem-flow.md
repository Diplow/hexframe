# Phase 6: Delete MapItem Flow

## Objective

Implement a comprehensive item deletion flow with proper confirmation dialogs, cascade handling, error recovery, and integration with the existing mutation system.

## New Components to Create

### 1. `src/app/map/[id]/Dialogs/DeleteItemDialog.tsx`

**Purpose:** Main confirmation dialog for deleting map items

**Component Interface:**

```typescript
interface DeleteItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  item: HexTileData;
  childrenCount?: number;
  isLoading?: boolean;
  error?: string | null;
}

export function DeleteItemDialog({
  isOpen,
  onClose,
  onConfirm,
  item,
  childrenCount = 0,
  isLoading = false,
  error = null,
}: DeleteItemDialogProps) {
  const [deleteMode, setDeleteMode] = useState<'item-only' | 'with-children'>('item-only');
  const [confirmationText, setConfirmationText] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const requiredConfirmationText = item.data.name;
  const isConfirmationValid = confirmationText === requiredConfirmationText;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfirmationValid) {
      return;
    }

    try {
      await onConfirm();
    } catch (error) {
      // Error handled by parent component
    }
  };

  const getDeletionWarning = () => {
    if (childrenCount === 0) {
      return "This action cannot be undone.";
    }

    if (deleteMode === 'item-only') {
      return `This item has ${childrenCount} child item${childrenCount > 1 ? 's' : ''}. Deleting this item will move its children up one level in the hierarchy.`;
    } else {
      return `This will permanently delete this item and all ${childrenCount} of its child item${childrenCount > 1 ? 's' : ''}. This action cannot be undone.`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Item
          </DialogTitle>
          <DialogDescription>
            You are about to delete "{item.data.name}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deletion Mode Selection */}
          {childrenCount > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Deletion Options</Label>
              <RadioGroup
                value={deleteMode}
                onValueChange={(value) => setDeleteMode(value as typeof deleteMode)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="item-only" id="item-only" />
                  <Label htmlFor="item-only" className="text-sm">
                    Delete item only (preserve children)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="with-children" id="with-children" />
                  <Label htmlFor="with-children" className="text-sm text-red-600">
                    Delete item and all children
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Warning Message */}
          <div className="rounded-md bg-red-50 p-3">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Warning
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{getDeletionWarning()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type "{requiredConfirmationText}" to confirm deletion
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={requiredConfirmationText}
              disabled={isLoading}
              className={!isConfirmationValid && confirmationText ? 'border-red-500' : ''}
            />
            {!isConfirmationValid && confirmationText && (
              <p className="text-sm text-red-500">
                Text doesn't match. Please type exactly: "{requiredConfirmationText}"
              </p>
            )}
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="space-y-3 border-t pt-3">
              <Label className="text-sm font-medium">Advanced Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="backup" />
                  <Label htmlFor="backup" className="text-sm">
                    Create backup before deletion
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="notify" />
                  <Label htmlFor="notify" className="text-sm">
                    Notify collaborators of deletion
                  </Label>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || !isConfirmationValid}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {deleteMode === 'with-children' && childrenCount > 0 ? 'All' : 'Item'}
                </>
              )}
            </Button>
          </DialogFooter>

          {!showAdvancedOptions && (
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedOptions(true)}
              >
                Show advanced options
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. `src/app/map/[id]/Dialogs/BulkDeleteDialog.tsx`

**Purpose:** Dialog for bulk deletion operations

**Component Interface:**

```typescript
interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (itemIds: string[]) => Promise<void>;
  selectedItems: HexTileData[];
  isLoading?: boolean;
  error?: string | null;
}

export function BulkDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedItems,
  isLoading = false,
  error = null,
}: BulkDeleteDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    selectedItems.map(item => item.metadata.dbId)
  );

  const requiredConfirmationText = `DELETE ${selectedItems.length} ITEMS`;
  const isConfirmationValid = confirmationText === requiredConfirmationText;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfirmationValid || selectedItemIds.length === 0) {
      return;
    }

    try {
      await onConfirm(selectedItemIds);
    } catch (error) {
      // Error handled by parent component
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const totalChildrenCount = selectedItems.reduce((total, item) => {
    // Calculate children count for each item
    return total + getChildrenCount(item);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Bulk Delete Items
          </DialogTitle>
          <DialogDescription>
            You are about to delete {selectedItems.length} items
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Items List */}
          <div className="max-h-60 space-y-2 overflow-y-auto">
            <Label className="text-sm font-medium">Items to delete:</Label>
            {selectedItems.map((item) => (
              <div key={item.metadata.dbId} className="flex items-center space-x-2">
                <Checkbox
                  id={item.metadata.dbId}
                  checked={selectedItemIds.includes(item.metadata.dbId)}
                  onCheckedChange={() => toggleItemSelection(item.metadata.dbId)}
                />
                <Label htmlFor={item.metadata.dbId} className="flex-1 text-sm">
                  {item.data.name}
                  <span className="ml-2 text-xs text-gray-500">
                    ({item.metadata.coordId})
                  </span>
                </Label>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="rounded-md bg-red-50 p-3">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Warning
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    This will permanently delete {selectedItemIds.length} item{selectedItemIds.length > 1 ? 's' : ''}
                    {totalChildrenCount > 0 && ` and ${totalChildrenCount} child item${totalChildrenCount > 1 ? 's' : ''}`}.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type "{requiredConfirmationText}" to confirm deletion
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={requiredConfirmationText}
              disabled={isLoading}
              className={!isConfirmationValid && confirmationText ? 'border-red-500' : ''}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || !isConfirmationValid || selectedItemIds.length === 0}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedItemIds.length} Item{selectedItemIds.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. `src/app/map/[id]/Tile/Item/DeleteItemButton.tsx`

**Purpose:** Button component for triggering item deletion

**Component Interface:**

```typescript
interface DeleteItemButtonProps {
  item: HexTileData;
  onClick: () => void;
  className?: string;
  size?: "small" | "medium" | "large";
  variant?: "icon" | "text" | "icon-text";
}

export function DeleteItemButton({
  item,
  onClick,
  className,
  size = "medium",
  variant = "icon",
}: DeleteItemButtonProps) {
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

  const textSizeClasses = {
    small: "text-xs px-2 py-1",
    medium: "text-sm px-3 py-2",
    large: "text-base px-4 py-3"
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  };

  if (variant === "text") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center rounded bg-red-500 text-white opacity-0 shadow-lg hover:bg-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400 group-hover:opacity-100",
          textSizeClasses[size],
          className
        )}
        aria-label={`Delete item "${item.data.name}"`}
        title={`Delete "${item.data.name}"`}
      >
        Delete
      </button>
    );
  }

  if (variant === "icon-text") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1 rounded bg-red-500 text-white opacity-0 shadow-lg hover:bg-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400 group-hover:opacity-100",
          textSizeClasses[size],
          className
        )}
        aria-label={`Delete item "${item.data.name}"`}
        title={`Delete "${item.data.name}"`}
      >
        <Trash2 size={iconSizes[size]} />
        Delete
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-lg hover:bg-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400 group-hover:opacity-100",
        sizeClasses[size],
        className
      )}
      aria-label={`Delete item "${item.data.name}"`}
      title={`Delete "${item.data.name}"`}
    >
      <Trash2 size={iconSizes[size]} />
    </button>
  );
}
```

### 4. `src/app/map/[id]/State/deletion-manager.ts`

**Purpose:** Hook for managing deletion operations and recovery

**Hook Interface:**

```typescript
interface DeletionState {
  isDeleting: boolean;
  deletionError: string | null;
  deletedItems: Record<string, HexTileData>; // For recovery
  deletionHistory: DeletionRecord[];
}

interface DeletionRecord {
  id: string;
  timestamp: number;
  items: HexTileData[];
  type: "single" | "bulk" | "cascade";
  canRecover: boolean;
}

export function useDeletionManager(
  mapItems: Record<string, HexTileData>,
  deleteItemMutation: any,
) {
  const [deletionState, setDeletionState] = useState<DeletionState>({
    isDeleting: false,
    deletionError: null,
    deletedItems: {},
    deletionHistory: [],
  });

  const addToDeletionHistory = useCallback(
    (items: HexTileData[], type: DeletionRecord["type"]) => {
      const record: DeletionRecord = {
        id: `deletion-${Date.now()}`,
        timestamp: Date.now(),
        items,
        type,
        canRecover: true, // Allow recovery for 5 minutes
      };

      setDeletionState((prev) => ({
        ...prev,
        deletionHistory: [record, ...prev.deletionHistory.slice(0, 9)], // Keep last 10
      }));

      // Auto-expire recovery after 5 minutes
      setTimeout(
        () => {
          setDeletionState((prev) => ({
            ...prev,
            deletionHistory: prev.deletionHistory.map((h) =>
              h.id === record.id ? { ...h, canRecover: false } : h,
            ),
          }));
        },
        5 * 60 * 1000,
      );
    },
    [],
  );

  const deleteItem = useCallback(
    async (
      item: HexTileData,
      options: {
        deleteChildren?: boolean;
        createBackup?: boolean;
      } = {},
    ) => {
      const coordId = item.metadata.coordId;

      // Store for potential recovery
      const itemsToDelete = [item];
      if (options.deleteChildren) {
        // Add children to deletion list
        const children = getItemChildren(item, mapItems);
        itemsToDelete.push(...children);
      }

      // Store deleted items for recovery
      setDeletionState((prev) => ({
        ...prev,
        isDeleting: true,
        deletionError: null,
        deletedItems: {
          ...prev.deletedItems,
          ...itemsToDelete.reduce(
            (acc, item) => {
              acc[item.metadata.coordId] = item;
              return acc;
            },
            {} as Record<string, HexTileData>,
          ),
        },
      }));

      try {
        await deleteItemMutation.mutateAsync({
          coords: item.metadata.coordinates,
          deleteChildren: options.deleteChildren,
        });

        addToDeletionHistory(itemsToDelete, "single");
      } catch (error) {
        // Remove from deleted items on error
        setDeletionState((prev) => ({
          ...prev,
          deletionError:
            error instanceof Error ? error.message : "Deletion failed",
          deletedItems: Object.fromEntries(
            Object.entries(prev.deletedItems).filter(
              ([key]) =>
                !itemsToDelete.some((item) => item.metadata.coordId === key),
            ),
          ),
        }));
        throw error;
      } finally {
        setDeletionState((prev) => ({ ...prev, isDeleting: false }));
      }
    },
    [deleteItemMutation, mapItems, addToDeletionHistory],
  );

  const bulkDeleteItems = useCallback(
    async (itemIds: string[]) => {
      const itemsToDelete = itemIds
        .map((id) =>
          Object.values(mapItems).find((item) => item.metadata.dbId === id),
        )
        .filter(Boolean) as HexTileData[];

      setDeletionState((prev) => ({
        ...prev,
        isDeleting: true,
        deletionError: null,
        deletedItems: {
          ...prev.deletedItems,
          ...itemsToDelete.reduce(
            (acc, item) => {
              acc[item.metadata.coordId] = item;
              return acc;
            },
            {} as Record<string, HexTileData>,
          ),
        },
      }));

      try {
        // Execute bulk deletion
        await Promise.all(
          itemsToDelete.map((item) =>
            deleteItemMutation.mutateAsync({
              coords: item.metadata.coordinates,
            }),
          ),
        );

        addToDeletionHistory(itemsToDelete, "bulk");
      } catch (error) {
        setDeletionState((prev) => ({
          ...prev,
          deletionError:
            error instanceof Error ? error.message : "Bulk deletion failed",
          deletedItems: Object.fromEntries(
            Object.entries(prev.deletedItems).filter(
              ([key]) =>
                !itemsToDelete.some((item) => item.metadata.coordId === key),
            ),
          ),
        }));
        throw error;
      } finally {
        setDeletionState((prev) => ({ ...prev, isDeleting: false }));
      }
    },
    [deleteItemMutation, mapItems, addToDeletionHistory],
  );

  const recoverDeletion = useCallback(
    async (deletionId: string) => {
      const deletion = deletionState.deletionHistory.find(
        (h) => h.id === deletionId,
      );
      if (!deletion || !deletion.canRecover) {
        throw new Error("Cannot recover this deletion");
      }

      // Implement recovery logic here
      // This would typically involve calling a recovery API endpoint
      console.log("Recovering deletion:", deletion);
    },
    [deletionState.deletionHistory],
  );

  const clearDeletionError = useCallback(() => {
    setDeletionState((prev) => ({ ...prev, deletionError: null }));
  }, []);

  const getItemChildren = useCallback(
    (
      item: HexTileData,
      allItems: Record<string, HexTileData>,
    ): HexTileData[] => {
      return Object.values(allItems).filter(
        (otherItem) => otherItem.metadata.parentId === item.metadata.coordId,
      );
    },
    [],
  );

  const getChildrenCount = useCallback(
    (item: HexTileData): number => {
      return getItemChildren(item, mapItems).length;
    },
    [mapItems, getItemChildren],
  );

  return {
    deletionState,
    deleteItem,
    bulkDeleteItems,
    recoverDeletion,
    clearDeletionError,
    getChildrenCount,
    getItemChildren,
  };
}
```

### 5. `src/app/map/[id]/Components/DeletionRecoveryToast.tsx`

**Purpose:** Toast notification for deletion recovery

**Component Interface:**

```typescript
interface DeletionRecoveryToastProps {
  deletion: DeletionRecord;
  onRecover: (deletionId: string) => void;
  onDismiss: () => void;
}

export function DeletionRecoveryToast({
  deletion,
  onRecover,
  onDismiss,
}: DeletionRecoveryToastProps) {
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDismiss]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getItemsText = () => {
    if (deletion.items.length === 1) {
      return `"${deletion.items[0].data.name}"`;
    }
    return `${deletion.items.length} items`;
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 p-4 shadow-lg">
      <div className="flex items-center">
        <Trash2 className="h-5 w-5 text-red-500 mr-3" />
        <div>
          <p className="text-sm font-medium text-red-800">
            Deleted {getItemsText()}
          </p>
          <p className="text-xs text-red-600">
            Recovery available for {formatTime(timeLeft)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRecover(deletion.id)}
          disabled={!deletion.canRecover}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-red-500 hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

## Files to Modify

### 6. `src/app/map/[id]/State/interactionMode.ts`

**Changes:**

- Enhance delete mode handling with confirmation dialogs

**Updated Logic:**

```typescript
const handleTileClick = (coord: string) => {
  const currentMode = interactionMode;

  switch (currentMode) {
    case "delete":
      // Show delete confirmation dialog instead of immediate deletion
      if (mapItems[coord]) {
        setItemToDelete(coord);
        setDeleteDialogOpen(true);
      }
      break;
    // ... other cases
  }
};

const handleDeleteConfirm = async () => {
  if (itemToDelete && mapItems[itemToDelete]) {
    try {
      await actions.mutations.deleteItem({
        coordId: mapItems[itemToDelete].metadata.coordId,
      });

      // Show recovery toast
      showDeletionRecoveryToast(mapItems[itemToDelete]);
    } catch (error) {
      // Handle error
    }
  }
  setItemToDelete(null);
  setDeleteDialogOpen(false);
};
```

### 7. `src/app/map/[id]/Tile/Item/item.static.tsx`

**Changes:**

- Add delete button when in delete mode
- Add visual indicators for delete mode

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
  onDeleteClick?: () => void;
  isEditMode?: boolean;
  isDeleteMode?: boolean;
}

export const StaticItemTile = ({
  item,
  baseHexSize = 50,
  allExpandedItemIds,
  hasChildren,
  isCenter = false,
  urlInfo,
  onEditClick,
  onDeleteClick,
  isEditMode = false,
  isDeleteMode = false,
}: StaticItemTileProps) => {
  const handleTileClick = () => {
    if (isEditMode && onEditClick) {
      onEditClick();
    } else if (isDeleteMode && onDeleteClick) {
      onDeleteClick();
    }
  };

  return (
    <div
      className={cn(
        "group relative hover:z-10",
        isEditMode && "cursor-pointer hover:ring-2 hover:ring-blue-400",
        isDeleteMode && "cursor-pointer hover:ring-2 hover:ring-red-400"
      )}
      onClick={handleTileClick}
    >
      {/* Deletion overlay */}
      {isDeleteMode && (
        <div className="absolute inset-0 z-10 bg-red-500 bg-opacity-20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* ... existing tile content */}

      {isDeleteMode && onDeleteClick && (
        <DeleteItemButton
          item={item}
          onClick={onDeleteClick}
          className="absolute right-1 top-1 z-20"
          variant="icon"
        />
      )}
    </div>
  );
};
```

### 8. `src/app/map/[id]/Controls/ActionPanel.tsx`

**Changes:**

- Update delete mode description and cursor

**Updated Action:**

```typescript
{
  mode: "delete",
  label: "Delete",
  shortcut: "X",
  icon: <Trash2 className="h-5 w-5" />,
  description: "Click items to delete them (with confirmation)",
  cursor: "not-allowed",
}
```

## Integration Points

### 9. `src/app/map/[id]/Canvas/index.static.tsx`

**Changes:**

- Integrate deletion dialogs and recovery system

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
  const { dialogState, openDeleteDialog, closeDeleteDialog } = useDialogManager();
  const { mutations } = useMutations(/* ... */);
  const {
    deletionState,
    deleteItem,
    bulkDeleteItems,
    recoverDeletion,
    getChildrenCount
  } = useDeletionManager(items, mutations.deleteItemMutation);

  const [recoveryToasts, setRecoveryToasts] = useState<DeletionRecord[]>([]);

  const handleDeleteItem = async (item: HexTileData, options: any) => {
    await deleteItem(item, options);

    // Show recovery toast
    const latestDeletion = deletionState.deletionHistory[0];
    if (latestDeletion) {
      setRecoveryToasts(prev => [latestDeletion, ...prev.slice(0, 2)]); // Max 3 toasts
    }
  };

  const handleRecoverDeletion = async (deletionId: string) => {
    await recoverDeletion(deletionId);
    setRecoveryToasts(prev => prev.filter(toast => toast.id !== deletionId));
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="pointer-events-auto grid flex-grow place-items-center overflow-auto p-4">
        {/* ... existing content */}

        <DeleteItemDialog
          isOpen={dialogState.deleteItem.isOpen}
          onClose={closeDeleteDialog}
          onConfirm={() => handleDeleteItem(dialogState.deleteItem.item!, {})}
          item={dialogState.deleteItem.item!}
          childrenCount={dialogState.deleteItem.item ? getChildrenCount(dialogState.deleteItem.item) : 0}
          isLoading={deletionState.isDeleting}
          error={deletionState.deletionError}
        />
      </div>

      {/* Recovery Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {recoveryToasts.map((deletion) => (
          <DeletionRecoveryToast
            key={deletion.id}
            deletion={deletion}
            onRecover={handleRecoverDeletion}
            onDismiss={() => setRecoveryToasts(prev => prev.filter(t => t.id !== deletion.id))}
          />
        ))}
      </div>
    </div>
  );
};
```

### 10. `src/app/map/[id]/State/mutations.ts`

**Changes:**

- Enhance delete mutation with cascade options

**Updated Mutation:**

```typescript
const removeItemMutation = api.map.removeItem.useMutation({
  onMutate: async (itemToRemove: {
    coords: HexCoord;
    deleteChildren?: boolean;
  }) => {
    setItemIsRemoving(true);
    setItemRemovingError(null);

    const coordId = CoordSystem.createId(itemToRemove.coords);
    const item = itemsById[coordId];

    // Store all items that will be deleted for rollback
    const itemsToDelete = [item];
    if (itemToRemove.deleteChildren) {
      const children = getDescendants(item, itemsById);
      itemsToDelete.push(...children);
    }

    // Optimistically remove items
    itemsToDelete.forEach((item) => {
      if (item) {
        stateHelpers.deleteSingleItem(item.metadata.coordId);
      }
    });

    return { deletedItems: itemsToDelete };
  },
  onError: (err, _, context) => {
    setItemRemovingError(err.message);
    // Restore deleted items on error
    if (context?.deletedItems) {
      context.deletedItems.forEach((item) => {
        if (item) {
          stateHelpers.addSingleItem(item);
        }
      });
    }
  },
  onSuccess: () => {},
  onSettled: () => {
    setItemIsRemoving(false);
  },
});
```

## Implementation Order

1. Create deletion confirmation dialogs
2. Create deletion manager hook
3. Create recovery toast component
4. Create delete button components
5. Update tile components for delete mode
6. Update interaction mode handling
7. Integrate with canvas components
8. Add bulk deletion support
9. Implement recovery system
10. Add comprehensive testing

## Testing Strategy

- **Unit Tests:** Test deletion confirmation, recovery logic
- **Integration Tests:** Test deletion flow end-to-end
- **Cascade Tests:** Test deletion with children handling
- **Recovery Tests:** Test deletion recovery functionality
- **Bulk Tests:** Test bulk deletion operations
- **E2E Tests:** Test complete deletion workflow

## UX Considerations

- **Confirmation Required:** Always require explicit confirmation for deletions
- **Clear Warnings:** Show impact of deletion (children affected, etc.)
- **Recovery Option:** Provide time-limited recovery for accidental deletions
- **Visual Feedback:** Clear indication of delete mode and deletable items
- **Bulk Operations:** Support for selecting and deleting multiple items
- **Cascade Options:** Clear choice between deleting item only vs. with children
- **Loading States:** Proper loading indicators during deletions
- **Error Recovery:** Clear error messages and recovery options

## Error Handling

- **Network Errors:** Retry mechanisms and offline indicators
- **Permission Errors:** Clear messaging for unauthorized deletions
- **Cascade Conflicts:** Handle complex parent-child relationships
- **Recovery Failures:** Proper error handling for recovery attempts
- **Optimistic Update Failures:** Proper rollback and error messaging

## Performance Considerations

- **Optimistic Updates:** Immediate UI feedback without waiting for server
- **Batch Operations:** Efficient bulk deletion processing
- **Memory Management:** Proper cleanup of deleted item state
- **Recovery Storage:** Efficient storage of recovery data with expiration
