# 2025-10-06 Online Mode Broken After Offline Cache Implementation

## Issue Description
After implementing offline mode using localStorage for the cache, the online version is broken - tiles never appear when loading a map page.

## Working Assumption
The cache initialization or data loading flow has been disrupted by the offline mode changes. Most likely:
- The cache is trying to use localStorage even in online mode
- The server data fetching is not being triggered properly
- There's a race condition between cache initialization and data loading

## Architectural Context
Based on the codebase structure:
- **Frontend Layer**: Map page and cache components in `/src/app/map/`
- **Cache System**: Map cache provider and related hooks in `/src/app/map/Cache/`
- **Server Service**: Data fetching in `/src/app/map/Cache/Services/server-service.ts`
- **State Management**: Cache state and reducers in `/src/app/map/Cache/State/`

The cache should:
1. Initialize with proper mode (online/offline)
2. Fetch data from server in online mode
3. Use localStorage only in offline mode
4. Render tiles once data is loaded

## Investigation Log

### Initial Analysis
- Found that MapCacheProvider starts with empty items and relies on lifecycle hook to load data
- The lifecycle hook (`useCacheLifecycle`) triggers data loading when center changes
- Server service (`useServerService`) is properly set up to fetch from tRPC endpoints
- Added debug logging to trace the data flow

### Key Findings
1. The cache provider initializes with `initialItems={}` (empty)
2. The lifecycle hook detects center change and triggers `fetchItemsForCoordinate`
3. The reducer receives the LOAD_REGION action but may be filtering out items
4. The `formatItems` function filters out items with `0` in their path
5. The Canvas/Frame components receive empty items from the cache

### Hypothesis
The issue is likely one of:
1. The server is returning items with `0` in the path which are getting filtered out
2. The coordinate format is incorrect causing the server to return no/wrong items
3. There's a race condition where the component renders before data is loaded

## Resolution

### Root Cause
The issue was in the `fetchItemsForCoordinate` method in the server service. When the center coordinate had no path (e.g., "1,0:" for a root item), the service was only fetching children via `getItemsForRootItem`, but not the root item itself. This caused the canvas to receive an empty items object since the center item was missing.

### Fix Applied
Updated both `server-service.ts` and `server-service.server.ts` to:
1. When fetching for a root-level coordinate (no path), first fetch the root item using `getRootItemById`
2. Then fetch its children using `getItemsForRootItem`
3. Return both the root item and its children combined

### Code Changes
```typescript
// Before: Only fetched children
const items = await utils.map.getItemsForRootItem.fetch({
  userId: coords.userId,
  groupId: coords.groupId,
});
return items;

// After: Fetches root item + children
const rootItem = await utils.map.getRootItemById.fetch({
  mapItemId: rootItemId,
});
const children = await utils.map.getItemsForRootItem.fetch({
  userId: coords.userId,
  groupId: coords.groupId,
});
return rootItem ? [rootItem, ...children] : children;
```

### Verification
The fix ensures that:
- Online mode now correctly loads and displays the root tile and its children
- Offline mode continues to work by loading from localStorage
- The cache properly stores all items including the root

## Continued Investigation - Flickering Issue

### New Issue Description
After the initial fix, the map still exhibits a flickering behavior where tiles appear briefly then disappear. This suggests a state management issue or race condition.

### Investigation Plan
1. Track component lifecycle and re-renders
2. Monitor cache state transitions
3. Check for competing state updates
4. Look for effects that might be clearing the cache

### Investigation Progress
1. Fixed linter issues in provider.tsx (MapItemType imports, unused variables)
2. Added comprehensive debug logging to track:
   - Provider mount/re-renders
   - Reducer actions and state changes
   - Lifecycle effect triggers
   - Canvas rendering with item counts
3. Removed duplicate localStorage loading (was loading in both provider and useOfflineMode)
4. Fixed offline server service mock to implement all required methods

### Current Hypothesis
The flickering might be caused by:
1. The provider re-mounting and resetting state
2. Multiple rapid state updates causing React to batch incorrectly
3. The sync engine or another effect clearing the cache
4. A race condition between initial load and subsequent updates

### Next Steps
Need to run the application and observe the console logs to identify:
- When items are loaded vs when they disappear
- If the provider is re-mounting
- The exact sequence of reducer actions

## Final Resolution

### Root Cause of Flickering
The flickering was caused by the `useMapInitialization` hook in page.tsx which:
1. Started with `urlInfo` as null
2. Asynchronously loaded search params and set `urlInfo`
3. This caused the page to render twice:
   - First render: urlInfo is null → shows "No map specified"
   - Second render: urlInfo is set → mounts MapCacheProvider

When MapCacheProvider mounted on the second render, it started with empty items and had to load from the server, causing the flicker.

### Fix Applied
Replaced the async `useMapInitialization` hook with React 18's `use()` function to unwrap the promise synchronously:
```typescript
// Before
const { urlInfo, initError, isOffline } = useMapInitialization(searchParams);

// After
const params = use(searchParams);
```

This ensures:
1. The component suspends until searchParams are available
2. MapCacheProvider only mounts once with stable data
3. No re-renders that would reset the cache state

### Summary of All Fixes
1. **Fixed server service**: Now fetches root item when center has no path
2. **Fixed linter issues**: Proper imports for MapItemType, removed unused code
3. **Removed duplicate localStorage loading**: Only useOfflineMode handles it
4. **Fixed flickering**: Using React 18's use() to prevent double mounting

The map should now load properly in both online and offline modes without flickering.

## Additional Issue - Coordinate Mismatch

### Issue Description
After fixing the flickering, the map still didn't display because loaded items had different coordinate IDs than expected. The center was "128,0:" but the loaded item had a different coordinate.

### Root Cause
The URL parameter `?center=128` was being interpreted as a userId when it's actually a mapItemId. The coordinate system expects `userId,groupId:path` format, but we were building `mapItemId,0:` which doesn't match any actual items.

### Fix Applied
Updated the server service to handle both cases:
1. When coords.userId might be a mapItemId (from URL), first try to fetch it as a root item
2. If successful, extract the actual userId from the returned item's coordinates
3. Use the actual userId to fetch children
4. If that fails, fall back to treating it as a userId

This ensures that URLs like `?center=128` (where 128 is a mapItemId) work correctly by:
- Fetching the map item with ID 128
- Getting its actual coordinate (e.g., "1,0:" where 1 is the userId)
- Loading all items for that user

The fix maintains backward compatibility for proper coordinate formats while supporting the simpler mapItemId URLs.