# Server Service Architecture

## Overview

The server service provides a unified interface for **query operations** with built-in retry logic, error handling, and support for both client-side and server-side usage.

**Mutations are NOT handled by this service** - they should use tRPC mutation hooks directly for proper client-side patterns.

## Architecture Decisions

### 1. Hybrid Approach: Pure Function + Hook Wrapper

- **`createServerService(utils, config)`** - Pure factory function for easy testing
- **`useServerService(config)`** - React hook wrapper for convenient component usage

### 2. Query-Only Focus

This service handles only query operations:

- `fetchItemsForCoordinate` - Load items for a coordinate region
- `getItemByCoordinate` - Get single item by coordinate
- `getRootItemById` - Get root item by database ID
- `getDescendants` - Get item descendants

### 3. Mutations Use tRPC Hooks Directly

Mutations should use tRPC hooks in components:

```tsx
const createMutation = api.map.addItem.useMutation();
const updateMutation = api.map.updateItem.useMutation();
const deleteMutation = api.map.removeItem.useMutation();
```

The mutation handlers coordinate cache updates and optimistic UI.

### 4. Static Version for Server-side

`createStaticServerService()` provides the same interface for server actions, API routes, and SSR (including mutations for server-side contexts).

## Usage Examples

### In Client Components (Recommended)

```tsx
function MyMapComponent() {
  const serverService = useServerService({ retryAttempts: 3 });

  const handleFetchItems = async () => {
    try {
      const items = await serverService.fetchItemsForCoordinate({
        centerCoordId: "1,2",
        maxDepth: 3,
      });
      console.log("Fetched:", items);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  };

  return (
    <div>
      <button onClick={handleFetchItems}>Fetch Items</button>
    </div>
  );
}
```

### For Mutations in Components

```tsx
function MyMutationComponent() {
  const createMutation = api.map.addItem.useMutation({
    onSuccess: (data) => {
      // Handle success, update cache via mutation handler
    },
    onError: (error) => {
      // Handle error, rollback optimistic updates
    },
  });

  const handleCreateItem = () => {
    createMutation.mutate({
      coords: { userId: 1, groupId: 2, path: [1] },
      parentId: 123,
      title: "New Item",
      descr: "Description",
      url: "https://example.com",
    });
  };

  return (
    <button onClick={handleCreateItem} disabled={createMutation.isLoading}>
      {createMutation.isLoading ? "Creating..." : "Create Item"}
    </button>
  );
}
```

### In Cache Handlers

```tsx
// Data handler using server service
function CacheComponent() {
  const [state, dispatch] = useReducer(cacheReducer, initialState);

  // Use the server service hook for queries
  const dataHandler = createDataHandlerWithServerService(
    dispatch,
    state,
    { retryAttempts: 5, timeoutMs: 15000 }, // Custom config
  );

  // Use simplified mutation handler (no server service needed)
  const mutationHandler = createMutationHandlerForCache(
    dispatch,
    state,
    dataHandler,
  );

  return <div>{/* Your cache UI */}</div>;
}
```

### In Tests (Pure Function Approach)

```tsx
describe("My Cache Tests", () => {
  test("data handler works with mocked service", async () => {
    const mockUtils = {
      map: {
        getItemsForRootItem: { fetch: vi.fn().mockResolvedValue([]) },
        getItemByCoords: { fetch: vi.fn() },
        getRootItemById: { fetch: vi.fn() },
        getDescendants: { fetch: vi.fn() },
      },
    };

    const handler = createDataHandlerWithMockableService(
      mockDispatch,
      mockState,
      mockUtils,
      { retryAttempts: 1 },
    );

    await handler.loadRegion("1,2", 2);

    expect(mockUtils.map.getItemsForRootItem.fetch).toHaveBeenCalledWith({
      userId: 1,
      groupId: 2,
    });
  });
});
```

### In Server Actions

```tsx
// form-actions.ts
async function createItemAction(formData: FormData) {
  "use server";

  const serverService = await createStaticServerService({
    retryAttempts: 2,
  });

  try {
    const result = await serverService.createItem({
      coordId: formData.get("coordId") as string,
      data: {
        name: formData.get("title") as string,
        description: formData.get("description") as string,
        url: formData.get("url") as string,
      },
    });

    revalidatePath("/map");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### In API Routes

```tsx
// app/api/items/route.ts
import { createStaticServerService } from "~/app/map/Cache/Services/server/server-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const centerCoordId = searchParams.get("centerCoordId");
  const maxDepth = parseInt(searchParams.get("maxDepth") || "3");

  try {
    const serverService = await createStaticServerService();

    const result = await serverService.fetchItemsForCoordinate({
      centerCoordId: centerCoordId!,
      maxDepth,
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
```

## Configuration Options

```tsx
interface ServiceConfig {
  enableRetry?: boolean; // Default: true
  retryAttempts?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms (exponential backoff)
  timeoutMs?: number; // Default: 10000ms
}
```

## Error Handling

The service provides structured error types:

- `ServiceError`: Base error with error codes
- `NetworkError`: Network-related failures
- `TimeoutError`: Operation timeouts

```tsx
try {
  await serverService.fetchItemsForCoordinate(params);
} catch (error) {
  if (error instanceof ServiceError) {
    console.log("Service error:", error.code, error.message);
  } else if (error instanceof NetworkError) {
    console.log("Network issue:", error.message);
  } else if (error instanceof TimeoutError) {
    console.log("Request timed out:", error.message);
  }
}
```

## Testing

### Pure Function Approach (Recommended)

```tsx
import { createServerService, createMockServerService } from "...";

// Test with real service factory
const mockUtils = { map: { getItemsForRootItem: { fetch: vi.fn() } } };
const service = createServerService(mockUtils, { retryAttempts: 1 });

// Test with mock service
const mockService = createMockServerService({
  fetchItemsForCoordinate: vi.fn().mockResolvedValue([]),
});
```

### Hook Testing

```tsx
import { renderHook } from "@testing-library/react";
import { useServerService } from "...";

const { result } = renderHook(() => useServerService(), {
  wrapper: TRPCProvider,
});
```

## Migration Guide

### From Direct tRPC Utils

**Before:**

```tsx
const utils = api.useUtils();
const items = await utils.map.getItemsForRootItem.fetch({ userId, groupId });
```

**After:**

```tsx
const serverService = useServerService();
const items = await serverService.fetchItemsForCoordinate({
  centerCoordId: "1,2",
  maxDepth: 3,
});
```

### From Mutation Service Approach

**Before:**

```tsx
const serverService = useServerService();
await serverService.createItem(data); // ❌ Architectural error
```

**After:**

```tsx
const createMutation = api.map.addItem.useMutation(); // ✅ Proper pattern
createMutation.mutate(data);
```

## Benefits

1. **Clear Separation**: Queries vs mutations handled appropriately
2. **Easy Testing**: Pure function approach with direct mocking
3. **Consistent Interface**: Same API for components, cache, server actions
4. **Type Safety**: Full TypeScript support with structured errors
5. **Flexible Configuration**: Per-use configuration for retry logic
6. **Proper Client Patterns**: Mutations use React hooks as intended
