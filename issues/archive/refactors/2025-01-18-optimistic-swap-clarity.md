# Refactor Session: optimistic-swap.ts Clarity

## Initial Section

**Target Code**: `src/app/map/Canvas/hooks/_orchestrators/optimistic-swap.ts` (276 lines)

**Refactoring Goal**: Improve clarity by applying the Fundamental Rule, Rule of 6, and establishing clear domain concepts for optimistic UI updates during tile swap operations.

**Current State Analysis**: 
- Single file with 4 functions handling optimistic swap operations
- Main function `performOptimisticSwap` is 74 lines (exceeds 50-line guideline)
- Complex nested data transformations for swapping tiles and their children
- Mixed concerns: UI state management, coordinate transformations, and cache updates

## Pre-Refactoring Analysis

### Existing Domain Concepts Found

From reading domain READMEs:

1. **From mapping domain** (`src/lib/domains/mapping/README.md`):
   - `CoordSystem` (utils/hex-coordinates.ts) - Already used for coordinate operations
   - `Coord` type - Already imported and used
   - Coordinate transformation utilities

2. **From app/map utilities**:
   - `getColor` (types/tile-data.ts) - Already used for color calculations
   - `TileData` type - Core data structure
   - `CacheState` and `cacheSelectors` - Cache management patterns

### New Concepts Identified

1. **TileSwapOperation** - Encapsulates the logic of swapping two tiles' positions
   - Currently mixed into the main function
   - Includes coordinate swapping, color updates, and parent reassignment

2. **ChildrenRelocationStrategy** - Manages how children follow their parent during swaps
   - Currently embedded in `moveChildrenToNewParent` helper
   - Calculates relative paths and new positions

3. **OptimisticUpdateRollback** - Pattern for capturing state and rolling back on failure
   - Currently inline in main function
   - Could be a reusable pattern for all optimistic updates

4. **ServerSyncronizer** - Confirms optimistic updates with server response
   - Currently the `confirmServerSwapUpdate` function
   - Could be generalized for all server confirmations

### Structural Issues

1. **Rule of 6 Violations**:
   - `performOptimisticSwap` function: 74 lines (exceeds 50-line guideline)
   - Single file doing multiple responsibilities

2. **Clarity Issues**:
   - Function name `performOptimisticSwap` doesn't reveal it also handles non-optimistic cases
   - Mixed abstraction levels (high-level flow with low-level coordinate math)
   - Helper functions at bottom make flow harder to follow
   - Complex parameter drilling through multiple functions

3. **Missing Abstractions**:
   - Rollback pattern is inline rather than extracted
   - Coordinate transformations mixed with UI updates
   - No clear separation between optimistic update logic and API interaction

### Proposed Changes

1. **Apply Rule of 6 Structure**:
   ```
   _orchestrators/
     optimistic-swap/
       index.ts                    # Main export (performOptimisticSwap)
       swap-operation.ts           # TileSwapOperation logic
       children-relocation.ts      # ChildrenRelocationStrategy
       rollback-handler.ts         # OptimisticUpdateRollback pattern
       server-sync.ts             # ServerSyncronizer
       types.ts                   # Shared types
   ```

2. **Apply Fundamental Rule**:
   - Rename main function to clarify dual behavior
   - Extract clear, single-purpose functions
   - Each function name reveals intent without reading body

3. **Improve Abstraction Levels**:
   - High-level orchestration in main function
   - Domain logic in dedicated modules
   - Clear separation of concerns

## Concepts for Validation

I'm about to refactor optimistic-swap.ts. Here are the concepts I've identified:

**Existing concepts I'll reuse:**
- From mapping domain: `CoordSystem`, `Coord` type for all coordinate operations
- From app/map: `TileData`, `CacheState`, `getColor` for tile management

**New concepts that might need definition:**

1. **TileSwapOperation** - Encapsulates the complete logic of swapping two tiles:
   - Swaps coordinates between tiles
   - Updates colors based on new positions
   - Reassigns parent relationships
   - Maintains data consistency

2. **ChildrenRelocationStrategy** - Manages how child tiles follow their parent during swaps:
   - Calculates relative paths from old parent
   - Applies paths to new parent location
   - Updates all child metadata and colors

3. **OptimisticUpdateRollback** - Reusable pattern for optimistic UI updates:
   - Captures current state before changes
   - Provides rollback mechanism on failure
   - Could be used across all optimistic operations

4. **ServerSynchronizer** - Confirms optimistic updates with server responses:
   - Maps server response to cache updates
   - Ensures consistency between optimistic and actual state
   - Handles partial update scenarios

Should these new concepts be added to UBIQUITOUS.md? Are there better names or existing patterns I should use instead?

## User Validation

**Concepts Approved**: All four concepts approved with current naming
- TileSwapOperation ✓
- ChildrenRelocationStrategy ✓  
- OptimisticUpdateRollback ✓ (Yes, make it a general pattern)
- ServerSynchronizer ✓

**Documentation Location**: Update `src/app/map/Canvas/README.md` with new concepts

**Naming Decisions**: Keep proposed names as they clearly express intent

**Scope Adjustments**: 
- OptimisticUpdateRollback should be designed as a reusable pattern for all optimistic updates
- Focus on making it generic enough to use across the codebase

## Post-Refactoring Summary

### Changes Applied

1. **Structural Reorganization**:
   - Created new folder structure: `_orchestrators/optimistic-swap/`
   - Split 276-line file into 6 focused modules
   - Each module follows single responsibility principle

2. **Files Created**:
   - `types.ts` (42 lines) - Shared interfaces and type definitions
   - `rollback-handler.ts` (76 lines) - Generic optimistic update pattern
   - `swap-operation.ts` (117 lines) - Tile swapping logic
   - `children-relocation.ts` (108 lines) - Children movement strategy
   - `server-sync.ts` (77 lines) - Server response synchronization
   - `index.ts` (146 lines) - Main orchestration
   - Original file now just re-exports (5 lines)

3. **Clarity Improvements**:
   - Function names now clearly express intent
   - Each module has focused responsibility
   - Complex operations broken into steps
   - Generic rollback pattern can be reused

### Concepts Introduced

1. **OptimisticUpdateRollback** - Now a generic pattern with:
   - Type-safe state capture and rollback
   - Higher-order function `withRollback` for wrapping operations
   - Complete flow handler `executeOptimisticUpdate`

2. **TileSwapOperation** - Clear separation of swap logic
3. **ChildrenRelocationStrategy** - Explicit handling of hierarchical updates
4. **ServerSynchronizer** - Clean interface for server confirmations

All concepts documented in `src/app/map/Canvas/README.md`

### Before/After Metrics

**Before**:
- 1 file with 276 lines
- 4 functions, main function 74 lines
- Mixed concerns and abstraction levels
- Helper functions at bottom

**After**:
- 7 files (including re-export)
- Largest file 146 lines (orchestrator, acceptable for low-level)
- 16 focused functions across modules
- Clear separation of concerns
- Reusable patterns extracted

### Future Considerations

1. **Extend OptimisticUpdateRollback**:
   - Could be moved to a shared utilities location
   - Consider adding middleware support
   - Add TypeScript generics for different state types

2. **Additional Refactoring Opportunities**:
   - Other optimistic operations could use the rollback pattern
   - Server synchronization could be generalized further
   - Consider creating a drag-and-drop domain module

3. **Testing Improvements**:
   - Each module can now be tested in isolation
   - Rollback pattern enables better error testing
   - Mock strategies for each component

### Verification

- ✅ Linter passes with no errors
- ✅ TypeScript compilation successful
- ✅ All imports resolved correctly
- ✅ Domain concepts documented in Canvas README
- ✅ Original functionality preserved through re-exports