# Issue: Remove static pages and reintegrate components to dynamic pages

**Date**: 2025-07-07
**Status**: Open
**Tags**: #refactor #architecture #tech #medium
**GitHub Issue**: #70
**Branch**: issue-70-remove-static-pages

## Problem Statement
The codebase currently has both static and dynamic versions of pages. Static components need to be reintegrated into dynamic pages where the dynamic version uses the static version. Static versions that are not used by dynamic pages should be removed to reduce code duplication and maintenance overhead.

## User Impact
- Developers face confusion with duplicate page implementations
- Maintenance burden of keeping static and dynamic versions in sync
- Potential inconsistencies between static and dynamic page behaviors
- Increased codebase complexity affecting development velocity

## Steps to Reproduce
1. Examine the codebase for pages with both static and dynamic versions
2. Identify which static components are used by dynamic pages
3. Note the redundancy and maintenance challenges

## Environment
- Development environment
- All pages with static/dynamic duplicates
- Frequency: Ongoing maintenance issue

## Related Issues
- Architecture and code organization improvements
- Technical debt reduction

## Context

*I am an AI assistant acting on behalf of @Diplow*

### Existing Documentation
Hexframe follows a **dual-route architecture** with clear separation:
- **README Files**: 
  - `/src/app/map/ARCHITECTURE.md` - Comprehensive dual-route architecture documentation ✅
  - `/src/server/README.md` - Server architecture with tRPC ✅
  - `/src/lib/domains/README.md` - Domain-Driven Design structure ✅
- **Architecture Docs**: Documentation accurately describes the intentional static/dynamic split
- **Documentation vs Reality**: Architecture documentation matches implementation ✅

### Domain Overview
The codebase implements a deliberate dual-route architecture:
- **`/map`** - Dynamic route with full JavaScript interactivity, client-side caching, real-time features
- **`/static/map`** - Static route with server-side rendering, URL-based state, works without JavaScript

This approach avoids progressive enhancement complexity while maintaining both static and dynamic experiences.

### Key Components

#### Static/Dynamic Page Pairs:
1. **Map Page**
   - Static: `/src/app/static/map/page.tsx`
   - Dynamic: `/src/app/map/page.tsx`

2. **Canvas Components**
   - StaticMapCanvas: `/src/app/static/map/Canvas/index.tsx`
   - DynamicMapCanvas: `/src/app/map/Canvas/index.tsx`
   - StaticFrame: `/src/app/static/map/Canvas/frame.tsx`
   - DynamicFrame: `/src/app/map/Canvas/frame.tsx`

3. **Tile Components**
   - Item Tile: Both versions in respective `/Tile/Item/item.tsx`
   - Base Tile: Both versions in respective `/Tile/Base/`
   - Auth Tile: Both versions in respective `/Tile/Auth/auth.tsx`
   - Empty Tile: Both versions in respective `/Tile/Empty/empty.tsx`
   - Hierarchy Tile: Static only `/src/app/static/map/Tile/Hierarchy/hierarchy-tile.tsx`

4. **Controls**
   - ParentHierarchy: Both versions exist

5. **Create Flow**
   - Static: Standalone page `/src/app/static/map/create/page.tsx`
   - Dynamic: Dialog-based `/src/app/map/Dialogs/create-item.tsx`

### Implementation Details

#### Static Components Used by Dynamic Pages:
1. **Direct Component Usage**:
   - `StaticFrame` - Used in `/src/app/map/Canvas/LifeCycle/loading-skeleton.tsx:116`
   - `StaticBaseTileLayout` - Used in `/src/app/map/Controls/ParentHierarchy/parent-hierarchy.tsx`

2. **Shared Utilities**:
   - Validation utilities from `~/app/static/map/create/validation.utils` used in:
     - `/src/app/map/Dialogs/create-item.tsx:13`
     - `/src/app/map/Dialogs/create-item.modal.tsx`
     - `/src/app/map/Dialogs/update-item.tsx`

3. **Type Definitions**:
   - `TileScale`, `TileColor`, `TileCursor`, `TileStroke` - Shared types from static components
   - Props interfaces for consistency

4. **Re-export Pattern**:
   - `/src/app/map/Tile/index.ts` serves as central hub re-exporting both static and dynamic components

#### Naming Conventions:
- Static components prefixed with "Static" (e.g., StaticMapCanvas, StaticFrame)
- Dynamic components prefixed with "Dynamic" or unprefixed
- Shared types maintain consistent naming

### Dependencies and Integration

#### Static → Dynamic Dependencies:
- Static components provide base rendering functionality
- Static types ensure API consistency
- Static validation utilities provide form validation logic

#### Dynamic → Static Dependencies:
- Loading skeleton uses StaticFrame for consistent loading states
- Parent hierarchy control uses StaticBaseTileLayout
- Create/update dialogs use validation utilities

#### Shared Dependencies:
- Both use domain logic from `/src/lib/domains/`
- Both use UI components from shared component library
- Both follow the same type definitions for consistency

#### Integration Points:
- Type system ensures compatibility between static/dynamic versions
- Validation logic shared to maintain consistency
- Central re-export file (`/src/app/map/Tile/index.ts`) manages component visibility

### Current Architecture Benefits:
1. **Clear Separation**: Each route has its own implementation
2. **Minimal Coupling**: Only 2 static components directly used by dynamic
3. **Type Safety**: Shared types ensure consistency
4. **Progressive Enhancement Path**: Could evolve from current dual-route to progressive enhancement

### Technical Debt Identified:
1. **Duplication**: Most components have near-identical static/dynamic versions
2. **Maintenance Burden**: Changes often need to be made in two places
3. **Inconsistent Patterns**: Some components (HierarchyTile) exist only in static version
4. **Mixed Responsibilities**: Dynamic pages importing static components for non-static purposes (loading states)

## Solution

*I am an AI assistant acting on behalf of @Diplow*

### Solution Approaches

#### Approach 1: Selective Component Removal (Conservative)

**Overview**: Remove only unused static components while preserving the dual-route architecture for future needs.

**Implementation Steps**:
1. **Preserve Used Components**:
   - Keep `StaticFrame` in `/src/app/static/map/Canvas/frame.tsx`
   - Keep `StaticBaseTileLayout` in `/src/app/static/map/Tile/Base/base.tsx`
   - Keep validation utilities in `/src/app/static/map/create/validation.utils.ts`

2. **Move Shared Resources**:
   - Move type definitions to `/src/app/map/types/tile-types.ts`
   - Move validation utilities to `/src/lib/domains/mapping/utils/validation.ts`

3. **Remove Unused Components**:
   - Delete unused static tile variants (Item, Auth, Empty)
   - Delete static create page (already replaced by dialog)
   - Delete StaticMapCanvas (not used by dynamic)

4. **Clean Up Exports**:
   - Update `/src/app/map/Tile/index.ts` to remove deleted exports
   - Update imports in dynamic components

**Affected Files**:
- Delete: ~15 files in `/src/app/static/map/`
- Move: 3-4 utility files
- Update: 5-10 import statements

#### Approach 2: Complete Static Route Removal (Aggressive)

**Overview**: Remove the entire `/static/map` route and extract only the necessary components into the dynamic route structure.

**Implementation Steps**:
1. **Extract Required Components**:
   - Create `/src/app/map/components/StaticFrame.tsx` (rename to `BaseFrame`)
   - Create `/src/app/map/components/BaseTileLayout.tsx`
   - Move validation utilities to domain layer

2. **Remove Static Route**:
   - Delete entire `/src/app/static/` directory
   - Remove static route from routing configuration
   - Update documentation to reflect single-route architecture

3. **Refactor Dynamic Components**:
   - Update loading skeleton to use new `BaseFrame`
   - Update parent hierarchy to use new `BaseTileLayout`
   - Remove "Static" prefix from moved components

4. **Update Architecture**:
   - Revise ARCHITECTURE.md to document single-route approach
   - Remove references to dual-route pattern

**Affected Files**:
- Delete: Entire `/src/app/static/` directory (~40+ files)
- Create: 3-4 new component files
- Update: 10-15 files with import changes
- Documentation: 2-3 architecture files

#### Approach 3: Progressive Unification (Recommended)

**Overview**: Create a unified component library that serves both static rendering needs and dynamic functionality, preparing for potential future progressive enhancement.

**Implementation Steps**:
1. **Phase 1: Create Unified Components**:
   - Create `/src/app/map/components/base/` directory
   - Move `StaticFrame` → `BaseFrame` with render mode prop
   - Move `StaticBaseTileLayout` → `BaseTileLayout` with interactive prop
   - Create shared tile components with progressive enhancement support

2. **Phase 2: Migrate Dynamic Components**:
   - Update loading skeleton to use `BaseFrame` with `mode="static"`
   - Update dynamic tiles to extend base tile components
   - Implement feature detection for progressive enhancement

3. **Phase 3: Remove Redundancy**:
   - Delete unused static components
   - Keep `/static/map` route but simplify to use unified components
   - Consolidate duplicate code into base components

4. **Phase 4: Documentation & Testing**:
   - Update architecture documentation
   - Add tests for unified components
   - Document progressive enhancement patterns

**Component Structure**:
```typescript
// BaseFrame component with progressive enhancement
interface BaseFrameProps {
  mode?: 'static' | 'dynamic';
  interactive?: boolean;
  // ... other props
}

// BaseTile with feature detection
interface BaseTileProps {
  enhanceOnClient?: boolean;
  staticFallback?: ReactNode;
  // ... other props
}
```

**Affected Files**:
- Create: 8-10 unified component files
- Update: 15-20 existing components
- Delete: 20-25 redundant static files
- Tests: 5-10 new test files

### Tradeoff Analysis

#### Approach 1: Selective Component Removal
**Pros**:
- ✅ Minimal risk, preserves existing architecture
- ✅ Quick to implement (1-2 days)
- ✅ Easy to rollback if needed
- ✅ Maintains dual-route option for future

**Cons**:
- ❌ Doesn't fully address duplication problem
- ❌ Technical debt remains for kept components
- ❌ Inconsistent patterns persist

**Best For**: Teams wanting minimal disruption while reducing some duplication

#### Approach 2: Complete Static Route Removal
**Pros**:
- ✅ Maximum code reduction
- ✅ Simplest final architecture
- ✅ No more dual maintenance
- ✅ Clear single-route pattern

**Cons**:
- ❌ Loses no-JavaScript fallback option
- ❌ Major architectural change
- ❌ Difficult to reverse
- ❌ May impact SEO/accessibility goals

**Best For**: Teams committed to JavaScript-only experience

#### Approach 3: Progressive Unification
**Pros**:
- ✅ Sets foundation for progressive enhancement
- ✅ Reduces duplication while maintaining flexibility
- ✅ Improved component reusability
- ✅ Better long-term architecture

**Cons**:
- ❌ Most complex implementation (3-5 days)
- ❌ Requires careful design of base components
- ❌ Initial increase in abstraction complexity

**Best For**: Teams wanting to eliminate duplication while keeping architectural flexibility

### Recommended Approach

**Recommendation: Approach 3 - Progressive Unification**

**Rationale**:
1. **Addresses Core Problem**: Eliminates the maintenance burden of duplicate components
2. **Maintains Flexibility**: Preserves ability to offer static/dynamic experiences
3. **Future-Proof**: Sets foundation for progressive enhancement if needed
4. **Incremental**: Can be implemented in phases with value at each step
5. **Aligns with Architecture**: Respects the dual-route design while reducing duplication

**Implementation Priority**:
1. Start with Phase 1 (unified base components) - delivers immediate value
2. Phase 2 can be done incrementally as components are touched
3. Phase 3 cleanup can be scheduled separately
4. Phase 4 ensures quality and knowledge transfer

**Success Metrics**:
- 50-70% reduction in component files
- Single source of truth for component logic
- Maintained performance for both routes
- Improved developer experience

### Migration Strategy

**Week 1**: 
- Create base component directory structure
- Implement BaseFrame and BaseTileLayout
- Update loading skeleton as proof of concept

**Week 2**:
- Migrate tile components to unified pattern
- Update dynamic components to use base components
- Test both routes thoroughly

**Week 3**:
- Remove redundant static components
- Update documentation
- Add comprehensive tests

**Rollback Plan**:
- Git history preserves all static components
- Feature flags can toggle between old/new implementations
- Phased approach allows stopping at any point