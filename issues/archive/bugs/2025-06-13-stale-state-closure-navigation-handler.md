# Debug Session: Stale State Closure in Navigation Handler

## Issue Description
The navigation handler (and other handlers) capture a stale snapshot of the state object at creation time, causing them to operate on outdated data after dispatch updates.

## Working Assumption
The handlers are created once with the initial state and never receive updates when the state changes through React's immutable updates. This is a classic React closure issue where functions capture variables from their creation scope.

## Architectural Context
Based on the codebase architecture:
- **Layer**: Frontend - Map Cache system
- **Components**: 
  - `/src/app/map/Cache/Handlers/navigation-handler.ts`
  - `/src/app/map/Cache/Handlers/data-handler.ts`
  - `/src/app/map/Cache/Handlers/mutation-handler.ts`
  - `/src/app/map/Cache/provider.tsx`
- **How it should work**: Handlers should always access the current state, not a snapshot from creation time

## Investigation Log

### Reproduction Steps
1. Handler is created with initial state in provider.tsx
2. User performs action that updates state (e.g., navigation)
3. Handler continues using old state reference
4. Subsequent operations read stale data

### Specific Issues Found
In `navigation-handler.ts`:
- Line 40: `const existingItem = state.itemsById[itemCoordId]` - reads from captured state
- Line 46: `if (!existingItem || !state.regionMetadata[itemCoordId])` - checks stale region metadata
- Line 56: `const item = state.itemsById[itemCoordId]` - reads from stale state again
- Line 128: `await dataHandler.loadRegion(itemCoordId, state.cacheConfig.maxDepth)` - uses stale config
- Line 175-182: `toggleItemExpansionWithURL` reads stale currentCenter and expandedItemIds

### Hypothesis
The handlers receive `state` as a value at creation time, not a reference to the current state. React's state updates create new state objects, but handlers continue referencing the old one.

### Tests to Create
Need to create a test that:
1. Creates a handler with initial state
2. Updates the state through dispatch
3. Verifies the handler sees the updated state

### Tests Created
Created `stale-closure.test.ts` with two tests:
1. **navigation handler should use current maxDepth config not stale value**: 
   - Expected maxDepth 5, got 2 - proves handler uses stale config
2. **data handler should see updated state items**:
   - Expected no prefetch (item exists), but prefetch was called - proves handler doesn't see updated items

Both tests fail as expected, confirming the bug.

## Resolution Plan
1. Create test demonstrating the issue
2. Modify handlers to accept `getState` function instead of state directly
3. Update provider to pass `getState` callback
4. Verify all handlers use `getState()` instead of captured state

## Resolution

### Root Cause
Handlers were capturing the state object at creation time, causing them to operate on stale data after React state updates.

### Fix Applied
1. **Updated handler interfaces**: Changed from `state: CacheState` to `getState: () => CacheState`
2. **Modified handlers**:
   - `navigation-handler.ts`: All state references changed to `getState()` calls
   - `data-handler.ts`: Updated to use `getState()` throughout
   - `mutation-handler.ts`: Changed to use `getState()` for all state access
3. **Updated provider**: Added `useRef` and `useCallback` to create stable `getState` function
4. **Fixed all tests**: Updated test files to pass `getState` function instead of state

### Verification
- Created test `stale-closure.test.ts` that demonstrates the bug and passes after fix
- All handler tests updated and passing
- The fix ensures handlers always access current state, not stale snapshots

### Side Effects
None - this is a purely internal implementation change that maintains the same API

### Tests Added
- `stale-closure.test.ts`: Tests that handlers see updated state after dispatch
  - Verifies navigation handler uses current maxDepth config
  - Verifies handler sees items added to state after creation