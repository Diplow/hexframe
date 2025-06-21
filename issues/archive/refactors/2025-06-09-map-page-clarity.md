# Refactor Session: Map Page Clarity

## Initial Section

### Target Code
- **File**: `src/app/map/page.tsx`
- **Current Line Count**: 295 lines
- **Type**: React component (Next.js page)

### Refactoring Goal
Improve clarity and maintainability of the map page component by:
1. Breaking down the large component into smaller, focused functions
2. Separating concerns (data fetching, URL handling, rendering)
3. Making the data flow more explicit
4. Following the Rule of 6 and Fundamental Rule principles

### Current State Analysis
The `MapPage` component currently handles multiple responsibilities:
1. **URL parameter parsing** - Extracting and validating search params
2. **Data fetching** - Loading root item and related map items
3. **Data transformation** - Converting API responses to component state
4. **URL synchronization** - Managing browser history
5. **Loading states** - Multiple loading/error scenarios
6. **Component rendering** - Orchestrating child components

The component has:
- 2 useEffect hooks with complex logic (lines 64-100, 107-194)
- Inline data processing (lines 153-162, 175-177)
- Multiple conditional renders for different states
- Console logging throughout for debugging
- Non-null assertions (!) used frequently

## Pre-Refactoring Analysis

### Existing Domain Concepts Found

From exploring the codebase:

1. **From mapping domain** (`src/lib/domains/mapping/`):
   - `CoordSystem` - Already used for coordinate parsing/formatting
   - `MapItemAPIContract` - Type for API responses (used via adapt function)

2. **From app/map types**:
   - `TileData` - Data structure for map tiles
   - `adapt` - Transforms MapItemAPIContract to TileData
   - `URLInfo` - URL parameter structure

3. **From app/map components**:
   - `MapCacheProvider` - State management for map data
   - `DynamicMapCanvas` - Map rendering component
   - `MapLoadingSkeleton` - Loading state component
   - `MapErrorBoundary` - Error handling component

4. **From commons/trpc**:
   - `api.useUtils()` - TRPC utilities for data fetching

### New Concepts Identified

1. **MapInitializer** - Handles initial setup from URL params
   - Parses search params
   - Validates required parameters
   - Creates URLInfo structure

2. **MapDataFetcher** - Orchestrates data loading
   - Fetches root item
   - Fetches related items
   - Handles error states

3. **MapDataProcessor** - Transforms API data to component state
   - Filters invalid items
   - Builds item lookup
   - Extracts expanded items

4. **MapStateManager** - Manages component state transitions
   - Loading states
   - Error states
   - Success states

5. **URLFocusManager** - Handles URL focus parameter logic
   - Sets default focus if missing
   - Updates browser history

### Structural Issues

1. **Rule of 6 Violations**:
   - The main component is 295 lines (should be ~50)
   - Complex useEffect hooks exceed 50 lines each
   - Multiple responsibilities in single functions

2. **Clarity Problems**:
   - Non-null assertions make assumptions unclear
   - Inline data processing obscures intent
   - Console logging mixed with business logic
   - Complex conditional logic in effects

3. **Data Flow Issues**:
   - State dependencies between urlInfo and mapData
   - Unclear when data fetching should occur
   - URL sync logic mixed with data fetching

### Proposed Changes

1. **Extract Custom Hooks**:
   - `useMapInitialization` - Handle URL params and initial setup
   - `useMapData` - Manage data fetching and processing
   - `useURLSync` - Handle URL synchronization separately

2. **Extract Pure Functions**:
   - `parseSearchParams` - Convert search params to URLInfo
   - `processMapItems` - Transform API items to component format
   - `buildCenterInfo` - Create center info from root item

3. **Simplify Main Component**:
   - Reduce to ~50 lines
   - Clear separation of concerns
   - Single responsibility per function

4. **Improve Type Safety**:
   - Remove non-null assertions
   - Use proper null checks
   - Make assumptions explicit

## User Validation

### Decisions Made
1. **New Domain Concepts**: Keep as implementation details (not formal domain concepts)
2. **Console Logging**: Remove entirely
3. **URL Synchronization**: Remove the browser history update behavior
4. **Error Handling**: Maintain granular error boundaries

### Approved Refactoring Approach
- Extract custom hooks as implementation details
- Remove all console.log statements
- Simplify URL handling (no browser history updates)
- Keep detailed error states and boundaries

## Post-Refactoring Summary

### Changes Applied

1. **Main Component Reduction**:
   - From: 295 lines
   - To: 93 lines
   - Clear focus: rendering the map with proper state handling

2. **Extracted Components**:
   - `_hooks/use-map-initialization.ts` (46 lines) - URL parameter handling
   - `_hooks/use-map-data.ts` (126 lines) - Data fetching and processing with proper types
   - `_components/map-state-handler.tsx` (56 lines) - Consolidated error and loading state handling

3. **Improvements Made**:
   - Removed all console.log statements
   - Removed URL history manipulation
   - Clear separation of concerns
   - Error/loading states abstracted away from main component
   - Main page focuses on map rendering logic
   - Each function has a single responsibility
   - Followed the Fundamental Rule (name → what, args → what's needed, body → how)
   - Added proper TypeScript types (removed `any` types)

4. **Data Flow Clarity**:
   - Initialization: searchParams → URLInfo
   - Data fetching: URLInfo → MapData
   - Rendering: MapData → UI Components
   - Error handling: Granular error states preserved

### Metrics

| Metric | Before | After |
|--------|--------|-------|
| Main component lines | 295 | 93 |
| Functions in main | 3 | 1 |
| useEffect hooks | 2 complex | 0 (moved to hooks) |
| Console.log calls | 8 | 0 |
| Non-null assertions | 12 | 8 (justified by state handler) |
| `any` types | 3 | 0 |

### Final Adjustments (User Feedback)

After initial refactoring, user requested removal of the MapView abstraction:
- Moved map rendering logic directly to page.tsx (where it belongs)
- Consolidated all error/loading states into MapStateHandler
- Result: page.tsx focuses on the actual map rendering while state handling is abstracted

### Future Considerations

1. The `use-map-data.ts` hook is 126 lines, which could be further split if needed
2. The cache configuration could be externalized to a config file
3. Error messages could be centralized for consistency
4. Non-null assertions in page.tsx are safe due to MapStateHandler guarantees, but could be eliminated with a more sophisticated type system