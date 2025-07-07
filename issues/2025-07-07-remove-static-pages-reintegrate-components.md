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