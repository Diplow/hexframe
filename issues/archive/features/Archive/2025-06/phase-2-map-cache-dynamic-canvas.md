# Phase 2: Map Cache and Dynamic Canvas

## Overview

Implement a map cache system and create a dynamic MapCanvas that feeds on that cache. This enables server-side rendering with client-side hydration and background synchronization, taking advantage of Next.js 15 features while following the **progressive enhancement architecture** principles.

## Architecture Compliance

This implementation follows the architectural principles defined in [ARCHITECTURE.md](../../../src/app/map/[id]/ARCHITECTURE.md):

- **Progressive Enhancement**: Static components remain unchanged, dynamic components wrap them
- **Item-Based Caching**: Cache individual items by coordId to avoid duplication
- **Centralized Tile Actions**: DynamicMapCanvas provides centralized action coordination
- **Hierarchical Loading**: Depth-based incremental loading with practical limits
- **URL-First State**: Maintain URL parameters as primary state source

## New Components to Create

### 1. Enhanced MapCacheProvider Component

**File:** `src/app/map/[id]/State/map-cache.tsx` (enhance existing)

**Current Implementation Review:**

- ✅ Already has `MapCacheProvider` with initial items support
- ✅ Already has `useMapCache` hook
- ✅ Already has background sync with `getItemsForRegion`
- ✅ Already has smart re-rendering with change detection

**Architectural Compliance Enhancements:**

```typescript
// Item-based cache structure (per ARCHITECTURE.md)
interface ItemCacheKey {
  coordId: string; // "userId,groupId:path" - unique coordinate
  loadedAt: number; // For cache invalidation
}

interface RegionMetadata {
  centerCoordId: string; // Focal point that was loaded
  maxDepth: number; // Maximum depth loaded from this center
  loadedAt: number; // When this region was loaded
  itemCoordIds: string[]; // Which items were loaded
}

interface MapCacheState {
  // Item-based cache (no duplication)
  itemsById: Record<string, HexTileData>; // Key: coordId

  // Region metadata tracking
  regionMetadata: Record<string, RegionMetadata>; // Key: "userId,groupId:centerPath"

  // Cache control
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;

  // Cache configuration
  cacheConfig: {
    maxAge: number; // Cache duration in ms
    backgroundRefreshInterval: number; // Background refresh interval
    enableOptimisticUpdates: boolean;
    maxDepth: number; // Maximum depth to load
  };
}

interface MapCacheContextValue {
  state: MapCacheState;
  dispatch: React.Dispatch<MapCacheAction>;

  // Hierarchical loading methods (per ARCHITECTURE.md)
  loadMapRegion: (centerCoordId: string, maxDepth?: number) => Promise<void>;
  loadItemChildren: (itemCoordId: string, maxDepth?: number) => Promise<void>;

  // Cache validation methods
  hasRequiredDepth: (centerCoordId: string, requiredDepth: number) => boolean;
  hasItem: (coordId: string) => boolean;
  getRegionItems: (centerCoordId: string, maxDepth: number) => HexTileData[];

  // Cache control methods
  invalidateRegion: (centerCoordId: string) => void;
  invalidateAll: () => void;
  prefetchRegion: (centerCoordId: string) => Promise<void>;
}
```

### 2. Enhanced DynamicMapCanvas Component

**File:** `src/app/map/[id]/Canvas/index.dynamic.tsx` (enhance existing)

**Architectural Compliance Requirements:**

- **Wrapper Enhancement Pattern**: Wraps StaticMapCanvas without changing it
- **Centralized Tile Actions**: Provides action coordination via React Context
- **Progressive Enhancement**: Works as hydration bridge
- **Data Source Abstraction**: Provides cached data to static components

```typescript
// Centralized Tile Actions Context (per ARCHITECTURE.md)
interface TileActionsContextValue {
  handleTileClick: (coordId: string, event: MouseEvent) => void;
  handleTileDrag: (coordId: string, event: DragEvent) => void;
  handleTileHover: (coordId: string, isHovering: boolean) => void;
  interactionMode: ActionMode;
}

const TileActionsContext = createContext<TileActionsContextValue | null>(null);

export function useTileActionsContext() {
  const context = useContext(TileActionsContext);
  if (!context) {
    throw new Error("useTileActionsContext must be used within DynamicMapCanvas");
  }
  return context;
}

interface DynamicMapCanvasProps {
  centerInfo: CenterInfo;
  expandedItemIds: string[];
  urlInfo: URLInfo;

  // Progressive enhancement options
  fallback?: ReactNode;
  errorBoundary?: ReactNode;
  enableBackgroundSync?: boolean;
  syncInterval?: number;

  // Cache control
  cacheConfig?: {
    maxAge: number;
    backgroundRefreshInterval: number;
    enableOptimisticUpdates: boolean;
    maxDepth: number;
  };
}

export function DynamicMapCanvas({
  centerInfo,
  expandedItemIds,
  urlInfo,
  fallback,
  errorBoundary,
  enableBackgroundSync = true,
  syncInterval = 30000,
  cacheConfig,
}: DynamicMapCanvasProps) {
  const { state, loadMapRegion, hasRequiredDepth, invalidateRegion } = useMapCache();
  const [isHydrated, setIsHydrated] = useState(false);

  // Feature detection (per ARCHITECTURE.md)
  const [capabilities, setCapabilities] = useState({
    hasJS: false,
    hasLocalStorage: false,
  });

  useEffect(() => {
    setCapabilities({
      hasJS: true,
      hasLocalStorage: typeof localStorage !== "undefined",
    });
    setIsHydrated(true);
  }, []);

  // Centralized tile actions (per ARCHITECTURE.md)
  const { interactionMode, mutations } = useInteractionMode();

  const tileActions = useMemo(() => ({
    handleTileClick: (coordId: string, event: MouseEvent) => {
      switch (interactionMode) {
        case 'edit':
          mutations.setTileToMutate(coordId);
          break;
        case 'delete':
          // Show confirmation dialog
          break;
        case 'expand':
          // Handle expansion via URL (keep pseudo-static)
          break;
      }
    },
    handleTileDrag: (coordId: string, event: DragEvent) => {
      // Handle drag operations
    },
    handleTileHover: (coordId: string, isHovering: boolean) => {
      // Handle hover state
    },
    interactionMode,
  }), [interactionMode, mutations]);

  // Hierarchical loading with depth control
  useEffect(() => {
    if (!isHydrated) return;

    const requiredDepth = cacheConfig?.maxDepth || 3;
    if (!hasRequiredDepth(centerInfo.center, requiredDepth)) {
      loadMapRegion(centerInfo.center, requiredDepth);
    }
  }, [centerInfo.center, isHydrated, loadMapRegion, hasRequiredDepth, cacheConfig?.maxDepth]);

  // Background sync with interval
  useEffect(() => {
    if (!enableBackgroundSync || !isHydrated || !capabilities.hasJS) return;

    const interval = setInterval(() => {
      loadMapRegion(centerInfo.center);
    }, syncInterval);

    return () => clearInterval(interval);
  }, [centerInfo.center, enableBackgroundSync, syncInterval, loadMapRegion, isHydrated, capabilities.hasJS]);

  // Progressive enhancement fallbacks
  if (!isHydrated || state.isLoading) {
    return fallback || <MapLoadingSkeleton />;
  }

  if (state.error) {
    return errorBoundary || (
      <MapErrorBoundary
        error={state.error}
        onRetry={() => invalidateRegion(centerInfo.center)}
      />
    );
  }

  // Wrapper enhancement pattern (per ARCHITECTURE.md)
  return (
    <TileActionsContext.Provider value={tileActions}>
      <StaticMapCanvas
        centerInfo={centerInfo}
        items={state.itemsById}
        expandedItemIds={expandedItemIds}
        urlInfo={urlInfo}
      />
    </TileActionsContext.Provider>
  );
}
```

### 3. Cache Utilities with Hierarchical Loading

**File:** `src/app/map/[id]/State/cache-utils.ts`

```typescript
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { HexTileData } from "./types";

export const cacheUtils = {
  // Cache validation
  isStale: (lastFetched: number, maxAge: number): boolean => {
    return Date.now() - lastFetched > maxAge;
  },

  shouldRefresh: (
    regionKey: string,
    metadata: Record<string, RegionMetadata>,
    maxAge: number,
  ): boolean => {
    const regionMetadata = metadata[regionKey];
    if (!regionMetadata) return true;
    return cacheUtils.isStale(regionMetadata.loadedAt, maxAge);
  },

  // Key generation (item-based per ARCHITECTURE.md)
  createRegionKey: (centerCoordId: string): string => {
    const coords = CoordSystem.parseId(centerCoordId);
    return `${coords.userId}-${coords.groupId}:${coords.path.join(",")}`;
  },

  createItemKey: (coordId: string): string => {
    return coordId; // Items are keyed by their coordId directly
  },

  // Hierarchical loading helpers (per ARCHITECTURE.md)
  getItemsAtDepth: (
    centerCoordId: string,
    items: Record<string, HexTileData>,
    targetDepth: number,
  ): HexTileData[] => {
    const centerCoords = CoordSystem.parseId(centerCoordId);
    const centerDepth = centerCoords.path.length;

    return Object.values(items).filter((item) => {
      const itemDepth = item.metadata.coordinates.path.length;
      return itemDepth === centerDepth + targetDepth;
    });
  },

  getMaxLoadedDepth: (
    centerCoordId: string,
    items: Record<string, HexTileData>,
  ): number => {
    const centerCoords = CoordSystem.parseId(centerCoordId);
    const centerDepth = centerCoords.path.length;

    let maxDepth = 0;
    Object.values(items).forEach((item) => {
      const itemDepth = item.metadata.coordinates.path.length;
      const relativeDepth = itemDepth - centerDepth;
      if (relativeDepth > maxDepth) {
        maxDepth = relativeDepth;
      }
    });

    return maxDepth;
  },

  // Check if we have sufficient depth loaded
  hasRequiredDepth: (
    centerCoordId: string,
    items: Record<string, HexTileData>,
    requiredDepth: number,
  ): boolean => {
    const loadedDepth = cacheUtils.getMaxLoadedDepth(centerCoordId, items);
    return loadedDepth >= requiredDepth;
  },

  // Get items for a specific region and depth
  getRegionItems: (
    centerCoordId: string,
    items: Record<string, HexTileData>,
    maxDepth: number,
  ): HexTileData[] => {
    const centerCoords = CoordSystem.parseId(centerCoordId);
    const centerDepth = centerCoords.path.length;

    return Object.values(items).filter((item) => {
      const itemDepth = item.metadata.coordinates.path.length;
      const relativeDepth = itemDepth - centerDepth;
      return relativeDepth >= 0 && relativeDepth <= maxDepth;
    });
  },
};
```

### 4. Progressive Enhancement Components

**File:** `src/app/map/Canvas/loading-skeleton.tsx`

```typescript
interface MapLoadingSkeletonProps {
  className?: string;
  message?: string;
}

export function MapLoadingSkeleton({
  className,
  message = "Loading map..."
}: MapLoadingSkeletonProps) {
  return (
    <div className={cn("relative flex h-full w-full flex-col", className)}>
      <div className="grid flex-grow place-items-center overflow-auto p-4">
        {/* Accessible loading indicator */}
        <div className="relative" role="status" aria-label={message}>
          <HexagonSkeleton size="large" />

          {/* Skeleton for surrounding tiles */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            <div className="flex gap-2">
              <HexagonSkeleton size="medium" />
              <HexagonSkeleton size="medium" />
            </div>
          </div>
          <div className="absolute top-8 -left-20">
            <HexagonSkeleton size="medium" />
          </div>
          <div className="absolute top-8 -right-20">
            <HexagonSkeleton size="medium" />
          </div>
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
            <div className="flex gap-2">
              <HexagonSkeleton size="medium" />
              <HexagonSkeleton size="medium" />
            </div>
          </div>

          {/* Screen reader text */}
          <span className="sr-only">{message}</span>
        </div>
      </div>
    </div>
  );
}
```

**File:** `src/app/map/[id]/Canvas/error-boundary.tsx`

```typescript
interface MapErrorBoundaryProps {
  error: Error;
  onRetry: () => void;
  className?: string;
}

export function MapErrorBoundary({ error, onRetry, className }: MapErrorBoundaryProps) {
  return (
    <div className={cn("grid h-full place-items-center", className)}>
      <div className="text-center" role="alert">
        <div className="mb-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Failed to load map
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={onRetry}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Try Again
        </button>

        {/* Fallback instructions */}
        <noscript>
          <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">
              JavaScript is required for interactive features.
              Please enable JavaScript or refresh the page.
            </p>
          </div>
        </noscript>
      </div>
    </div>
  );
}
```

## Files to Modify

### 1. Update Page Component for Progressive Enhancement

**File:** `src/app/map/[id]/page.tsx`

```typescript
export default async function HexMapPage({
  params,
  searchParams,
}: HexMapPageProps) {
  // ... existing SSR data fetching ...

  // Progressive enhancement decision (per ARCHITECTURE.md)
  const isDynamic = searchParams.isDynamic === 'true';

  if (isDynamic) {
    return (
      <div className="relative flex h-full w-full flex-col">
        <MapCacheProvider
          initialItems={mapItems}
          cacheConfig={{
            maxAge: 300000, // 5 minutes
            backgroundRefreshInterval: 30000, // 30 seconds
            enableOptimisticUpdates: true,
            maxDepth: 3, // Hierarchical loading depth
          }}
        >
          <DynamicMapCanvas
            centerInfo={centerInfo}
            expandedItemIds={expandedItemIds}
            urlInfo={urlInfo}
            enableBackgroundSync={true}
            syncInterval={30000}
            fallback={<MapLoadingSkeleton />}
            errorBoundary={<MapErrorBoundary error={new Error("Failed to load")} onRetry={() => {}} />}
            cacheConfig={{
              maxAge: 300000,
              backgroundRefreshInterval: 30000,
              enableOptimisticUpdates: true,
              maxDepth: 3,
            }}
          />
        </MapCacheProvider>
      </div>
    );
  }

  // Default to static rendering (per ARCHITECTURE.md)
  return (
    <div className="relative flex h-full w-full flex-col">
      <StaticMapCanvas
        centerInfo={centerInfo}
        items={mapItems}
        expandedItemIds={expandedItemIds}
        urlInfo={urlInfo}
      />
    </div>
  );
}
```

### 2. Enhanced Map Cache State with Item-Based Structure

**File:** `src/app/map/[id]/State/map-cache.tsx`

**Key Changes for Architectural Compliance:**

```typescript
// Updated state structure (item-based per ARCHITECTURE.md)
interface MapCacheState {
  // Item-based cache - no duplication
  itemsById: Record<string, HexTileData>; // Key: coordId

  // Region metadata for hierarchical loading
  regionMetadata: Record<string, RegionMetadata>; // Key: "userId,groupId:centerPath"

  // Error handling and loading states
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;

  // Cache configuration
  cacheConfig: {
    maxAge: number;
    backgroundRefreshInterval: number;
    enableOptimisticUpdates: boolean;
    maxDepth: number;
  };
}

// Updated actions for hierarchical loading
type MapCacheAction =
  | {
      type: "LOAD_REGION";
      payload: {
        items: MapItemAPIContract[];
        centerCoordId: string;
        maxDepth: number;
      };
    }
  | {
      type: "LOAD_ITEM_CHILDREN";
      payload: {
        items: MapItemAPIContract[];
        parentCoordId: string;
        maxDepth: number;
      };
    }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: Error | null }
  | { type: "INVALIDATE_REGION"; payload: string }
  | { type: "INVALIDATE_ALL" }
  | {
      type: "UPDATE_CACHE_CONFIG";
      payload: Partial<MapCacheState['cacheConfig']>;
    };

// Enhanced reducer with hierarchical loading support
function mapCacheReducer(
  state: MapCacheState,
  action: MapCacheAction,
): MapCacheState {
  switch (action.type) {
    case "LOAD_REGION": {
      const { items, centerCoordId, maxDepth } = action.payload;
      const newItems = _formatItems(items);
      const regionKey = cacheUtils.createRegionKey(centerCoordId);

      // Update items (item-based, no duplication)
      let updatedItems = state.itemsById;
      newItems.forEach((item) => {
        updatedItems = itemsReducer(updatedItems, {
          type: "ADD_ITEM",
          payload: { item },
        });
      });

      // Update region metadata
      const newRegionMetadata = {
        ...state.regionMetadata,
        [regionKey]: {
          centerCoordId,
          maxDepth,
          loadedAt: Date.now(),
          itemCoordIds: newItems.map(item => item.metadata.coordId),
        },
      };

      return {
        ...state,
        itemsById: updatedItems,
        regionMetadata: newRegionMetadata,
        lastUpdated: Date.now(),
        error: null,
      };
    }

    case "LOAD_ITEM_CHILDREN": {
      const { items, parentCoordId, maxDepth } = action.payload;
      const newItems = _formatItems(items);

      // Check for changes to prevent unnecessary re-renders
      const hasChanges = _hasDataChanges(state.itemsById, newItems);
      if (!hasChanges) {
        return state;
      }

      // Update items
      let updatedItems = state.itemsById;
      newItems.forEach((item) => {
        updatedItems = itemsReducer(updatedItems, {
          type: "UPDATE_ITEM",
          payload: { coordId: item.metadata.coordId, item },
        });
      });

      return {
        ...state,
        itemsById: updatedItems,
        lastUpdated: Date.now(),
      };
    }

    case "INVALIDATE_REGION": {
      const regionKey = action.payload;
      const newRegionMetadata = { ...state.regionMetadata };
      delete newRegionMetadata[regionKey];

      return {
        ...state,
        regionMetadata: newRegionMetadata,
      };
    }

    case "INVALIDATE_ALL": {
      return {
        ...state,
        itemsById: {},
        regionMetadata: {},
        lastUpdated: 0,
      };
    }

    // ... other cases
  }
}

// Enhanced provider with hierarchical loading methods
export function MapCacheProvider({
  children,
  initialItems,
  cacheConfig = {
    maxAge: 300000,
    backgroundRefreshInterval: 30000,
    enableOptimisticUpdates: true,
    maxDepth: 3,
  },
}: {
  children: ReactNode;
  initialItems?: Record<string, HexTileData>;
  cacheConfig?: Partial<MapCacheState['cacheConfig']>;
}) {
  const [state, dispatch] = useReducer(mapCacheReducer, {
    itemsById: initialItems || {},
    regionMetadata: {},
    isLoading: false,
    error: null,
    lastUpdated: Date.now(),
    cacheConfig: {
      maxAge: 300000,
      backgroundRefreshInterval: 30000,
      enableOptimisticUpdates: true,
      maxDepth: 3,
      ...cacheConfig,
    },
  });

  const utils = api.useUtils();

  // Hierarchical loading methods (per ARCHITECTURE.md)
  const loadMapRegion = useCallback(
    async (centerCoordId: string, maxDepth = state.cacheConfig.maxDepth) => {
      const regionKey = cacheUtils.createRegionKey(centerCoordId);

      // Check if we need to load
      if (
        state.regionMetadata[regionKey] &&
        !cacheUtils.shouldRefresh(regionKey, state.regionMetadata, state.cacheConfig.maxAge) &&
        state.regionMetadata[regionKey].maxDepth >= maxDepth
      ) {
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const coords = CoordSystem.parseId(centerCoordId);
        const items = await utils.map.getItemsForRootItem.fetch({
          userId: coords.userId,
          groupId: coords.groupId,
        });

        dispatch({
          type: "LOAD_REGION",
          payload: { items, centerCoordId, maxDepth },
        });
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: error as Error });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.regionMetadata, state.cacheConfig, utils.map.getItemsForRootItem],
  );

  const loadItemChildren = useCallback(
    async (itemCoordId: string, maxDepth = 2) => {
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const coords = CoordSystem.parseId(itemCoordId);
        const items = await utils.map.getItemsForRootItem.fetch({
          userId: coords.userId,
          groupId: coords.groupId,
        });

        dispatch({
          type: "LOAD_ITEM_CHILDREN",
          payload: { items, parentCoordId: itemCoordId, maxDepth },
        });
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: error as Error });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [utils.map.getItemsForRootItem],
  );

  // Cache validation methods
  const hasRequiredDepth = useCallback(
    (centerCoordId: string, requiredDepth: number): boolean => {
      return cacheUtils.hasRequiredDepth(centerCoordId, state.itemsById, requiredDepth);
    },
    [state.itemsById],
  );

  const hasItem = useCallback(
    (coordId: string): boolean => {
      return !!state.itemsById[coordId];
    },
    [state.itemsById],
  );

  const getRegionItems = useCallback(
    (centerCoordId: string, maxDepth: number): HexTileData[] => {
      return cacheUtils.getRegionItems(centerCoordId, state.itemsById, maxDepth);
    },
    [state.itemsById],
  );

  // Cache control methods
  const invalidateRegion = useCallback((centerCoordId: string) => {
    const regionKey = cacheUtils.createRegionKey(centerCoordId);
    dispatch({ type: "INVALIDATE_REGION", payload: regionKey });
  }, []);

  const invalidateAll = useCallback(() => {
    dispatch({ type: "INVALIDATE_ALL" });
  }, []);

  const prefetchRegion = useCallback(
    async (centerCoordId: string) => {
      // Prefetch without showing loading state
      await loadMapRegion(centerCoordId);
    },
    [loadMapRegion],
  );

  const contextValue = {
    state,
    dispatch,
    loadMapRegion,
    loadItemChildren,
    hasRequiredDepth,
    hasItem,
    getRegionItems,
    invalidateRegion,
    invalidateAll,
    prefetchRegion,
  };

  return (
    <MapCacheContext.Provider value={contextValue}>
      {children}
    </MapCacheContext.Provider>
  );
}
```

## Integration Points

### 1. Progressive Enhancement in Layout

**File:** `src/app/map/[id]/layout.tsx`

```typescript
"use client";

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-screen flex-1 overflow-hidden bg-zinc-600 p-0">
      {/* Progressive enhancement wrapper */}
      <noscript>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="rounded-lg bg-white p-6 text-center">
            <h2 className="mb-4 text-xl font-semibold">JavaScript Required</h2>
            <p className="text-gray-600">
              This interactive map requires JavaScript for full functionality.
              Basic navigation is available without JavaScript.
            </p>
          </div>
        </div>
      </noscript>
      {children}
    </main>
  );
}
```

### 2. Enhanced ActionPanel Integration

**File:** `src/app/map/[id]/Controls/ActionPanel.tsx`

**Add cache status integration:**

```typescript
interface ActionPanelProps {
  className?: string;
  activeMode: ActionMode;
  onModeChange: (mode: ActionMode) => void;

  // Cache status integration (optional)
  cacheStatus?: {
    isLoading: boolean;
    lastUpdated: number;
    error: Error | null;
    itemCount: number;
  };
}

export function ActionPanel({
  className,
  activeMode,
  onModeChange,
  cacheStatus,
}: ActionPanelProps) {
  // ... existing implementation ...

  // Add cache status indicator if provided
  const renderCacheStatus = () => {
    if (!cacheStatus) return null;

    return (
      <div className="mt-2 border-t pt-2">
        <div className="text-xs text-gray-500">
          {cacheStatus.isLoading && "Syncing..."}
          {!cacheStatus.isLoading && (
            <>
              {cacheStatus.itemCount} items loaded
              {cacheStatus.lastUpdated && (
                <div>
                  Last sync: {new Date(cacheStatus.lastUpdated).toLocaleTimeString()}
                </div>
              )}
            </>
          )}
          {cacheStatus.error && (
            <div className="text-red-500">Sync error</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(/* ... existing classes ... */, className)}>
      {/* ... existing content ... */}
      {renderCacheStatus()}
    </div>
  );
}
```

## Testing Strategy

### 1. Unit Tests for Cache System

**File:** `src/app/map/[id]/State/__tests__/map-cache.test.tsx`

```typescript
describe("MapCache - Architectural Compliance", () => {
  describe("Item-based caching", () => {
    test("should cache items by coordId without duplication", () => {});
    test("should update items efficiently across regions", () => {});
    test("should maintain single source of truth per item", () => {});
  });

  describe("Hierarchical loading", () => {
    test("should load items progressively by depth", () => {});
    test("should respect maxDepth configuration", () => {});
    test("should track region metadata correctly", () => {});
  });

  describe("Cache validation", () => {
    test("should detect when required depth is available", () => {});
    test("should identify stale cache entries", () => {});
    test("should handle cache invalidation properly", () => {});
  });

  describe("Progressive enhancement", () => {
    test("should work without JavaScript", () => {});
    test("should gracefully degrade on errors", () => {});
    test("should provide appropriate fallbacks", () => {});
  });
});
```

### 2. Integration Tests for Dynamic Canvas

**File:** `src/app/map/[id]/__tests__/dynamic-canvas.test.tsx`

```typescript
describe("DynamicMapCanvas - Architectural Compliance", () => {
  describe("Wrapper enhancement pattern", () => {
    test("should wrap StaticMapCanvas without modifying it", () => {});
    test("should provide data source abstraction", () => {});
    test("should maintain backward compatibility", () => {});
  });

  describe("Centralized tile actions", () => {
    test("should provide action coordination via context", () => {});
    test("should handle interaction modes centrally", () => {});
    test("should optimize performance with shared handlers", () => {});
  });

  describe("Progressive enhancement", () => {
    test("should hydrate correctly from SSR", () => {});
    test("should handle feature detection", () => {});
    test("should provide appropriate fallbacks", () => {});
  });
});
```

## Implementation Order

1. **Enhance Cache System (Item-based)**:

   - Update MapCacheState structure
   - Implement hierarchical loading methods
   - Add cache validation utilities

2. **Implement Progressive Enhancement**:

   - Create loading/error components
   - Add feature detection
   - Implement fallback strategies

3. **Enhance DynamicMapCanvas**:

   - Add centralized tile actions
   - Implement wrapper enhancement pattern
   - Add hydration handling

4. **Update Page Component**:

   - Add progressive enhancement decision logic
   - Integrate cache configuration
   - Maintain URL-first state management

5. **Add Testing**:

   - Unit tests for cache compliance
   - Integration tests for canvas enhancement
   - Progressive enhancement tests

6. **Performance Optimization**:
   - Implement intelligent prefetching
   - Add cache expiration strategies
   - Optimize memory usage

## Performance Considerations

### 1. Cache Strategy (per ARCHITECTURE.md)

- **Item-based caching**: No duplication, efficient updates
- **Hierarchical loading**: Progressive depth-based loading
- **Smart invalidation**: Coordinate-based cache invalidation
- **Memory efficiency**: Bounded cache size with cleanup

### 2. Progressive Enhancement

- **Server-first**: Full SSR with no hydration delay
- **Client enhancement**: Background sync and optimistic updates
- **Graceful degradation**: Fallbacks for all dynamic features
- **Feature detection**: Capability-based enhancement

### 3. Centralized Actions

- **Performance**: Single handler set vs N×handlers for N tiles
- **Memory efficiency**: Reduced memory footprint for large maps
- **Consistency**: Centralized interaction logic
- **Maintainability**: Single source of truth for actions

## Notes

- **Architectural Compliance**: This implementation strictly follows the progressive enhancement principles defined in ARCHITECTURE.md
- **Backward Compatibility**: All static components remain unchanged and reusable
- **URL-First State**: Maintains URL parameters as the primary state source for shareable/bookmarkable features
- **Item-based Caching**: Implements the recommended cache structure to avoid duplication and enable efficient updates
- **Centralized Actions**: Follows the centralized tile action management pattern for performance and consistency
- **Hierarchical Loading**: Implements depth-based incremental loading with practical limits as specified in the architecture
