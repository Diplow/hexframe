# Phase 1: Remove Outdated Controls

## Overview

Remove the minimap and scale controls along with all related code, including the focus parameter in the query string. This phase simplifies the UI and prepares for the new dynamic map implementation. **Note:** Scale and baseHexSize props will be kept in components with proper defaults, but their URL initialization will be removed.

## Files to Modify

### 1. Remove MiniMap Components

**Files to delete:**

- `src/app/map/[id]/Canvas/mini-map.static.tsx`
- `src/app/map/[id]/Controls/mini-map.controller.tsx`

**Files to modify:**

- `src/app/map/[id]/Controls/index.tsx`
  - Remove: `export { MiniMapController } from "./mini-map.controller";`

### 2. Remove Scale Controller

**Files to delete:**

- `src/app/map/[id]/Controls/scale.controller.tsx`

**Files to modify:**

- `src/app/map/[id]/Controls/index.tsx`
  - Remove: `export { ScaleController } from "./scale.controller";`

### 3. Update StaticMapCanvas

**File:** `src/app/map/[id]/Canvas/index.static.tsx`

**Keep props but use defaults:**

```typescript
// Keep these props but use proper defaults
scale?: number; // Default to 3
baseHexSize?: number; // Default to 50
```

**Components to remove from render:**

```typescript
// Remove these components from the render method
<ScaleController scale={scale} />
<MiniMapController
  minimapItemsData={items}
  expandedItemIds={expandedItemIds}
  currentMapCenterCoordId={centerInfo.center}
  urlInfo={urlInfo}
/>
```

### 4. Update StaticHexRegion

**File:** `src/app/map/[id]/Canvas/hex-region.static.tsx`

**Keep props but use defaults:**

```typescript
// Keep these props but use proper defaults
baseHexSize?: number; // Default to 50
scale?: TileScale; // Default to 3
```

**Keep scale-related logic but use fixed defaults:**

- Keep all scale calculations and transformations
- Keep `marginTop` calculations based on scale
- Use fixed default scale of 3 instead of URL-based scale

### 5. Update Page Component

**File:** `src/app/map/[id]/page.tsx`

**Remove from URL parameters handling:**

```typescript
// Remove from searchParams interface
scale?: string;
focus?: string;

// Remove from URLInfo type
scale?: string;
focus?: string;

// Remove from initMapParameters function
scale: urlInfo.scale ? parseInt(urlInfo.scale) : 3,
focus: urlInfo.focus!,

// Remove focus redirection logic
if (!urlInfo.focus) {
  // ... entire focus redirection block
}
```

**Update StaticMapCanvas call:**

```typescript
// Remove scale prop (will use default), keep expandedItemIds
// scale={scale} // Remove this line
expandedItemIds = { expandedItemIds }; // Keep this
```

### 6. Update URL Info Types

**File:** `src/app/map/[id]/types/url-info.ts`

```typescript
// Remove from URLInfo interface
scale?: string;
focus?: string;

// Remove from URLSearchParams interface
scale?: string;
focus?: string;
```

### 7. Update Tile Components

**Files to modify:**

- `src/app/map/[id]/Tile/Base/base.static.tsx`
- `src/app/map/[id]/Tile/Item/item.static.tsx`
- `src/app/map/[id]/Tile/Item/item.buttons.static.tsx`

**Keep scale-related props but use defaults:**

```typescript
// Keep these props but use proper defaults
scale?: TileScale; // Default to 3
baseHexSize?: number; // Default to 50

// Keep all scale-based calculations and logic
```

### 8. Update Storybook Files

**Files to update:**

- `src/app/map/[id]/Canvas/hex-region.static.stories.tsx`
- `src/app/map/[id]/Tile/Base/base.static.stories.tsx`
- `src/app/map/[id]/Tile/Item/item.static.stories.tsx`

**Keep scale-related controls and props in stories but update defaults:**

- Keep scale controls in Storybook for testing different scales
- Update default values to use scale: 3, baseHexSize: 50
- Ensure stories work with the new default values

### 9. Clean Up Imports

**Files to check for unused imports:**

- `src/app/map/[id]/Canvas/index.static.tsx`
- `src/app/map/[id]/page.tsx`

**Remove imports for:**

- `ScaleController`
- `MiniMapController`
- Keep `TileScale` type (still used in components)

## Testing Checklist

1. **Verify map renders without controls:**

   - [ ] Map displays correctly without minimap
   - [ ] Map displays correctly without scale controller
   - [ ] No console errors related to missing components
   - [ ] Map uses default scale of 3 and baseHexSize of 50

2. **Verify URL parameters work:**

   - [ ] `expandedItems` parameter still functions
   - [ ] Navigation between maps works
   - [ ] No errors related to missing `scale` or `focus` parameters

3. **Verify tile interactions:**

   - [ ] Tiles render with default scale (3) and baseHexSize (50)
   - [ ] All scale-based calculations work with defaults
   - [ ] Expand/collapse functionality works
   - [ ] Navigation between tiles works

4. **Verify Storybook:**
   - [ ] All stories render without errors
   - [ ] Scale controls still work in Storybook for testing
   - [ ] Default values are properly set

## Implementation Order

1. Remove MiniMap components and references
2. Remove Scale controller components and references
3. Update StaticMapCanvas to remove control rendering but keep props with defaults
4. Update page.tsx to remove URL parameter handling but keep component props
5. Update tile components to use default values instead of URL-derived values
6. Update type definitions to remove URL-related scale/focus types
7. Clean up imports for removed controllers
8. Update Storybook stories to use new defaults
9. Test all functionality with fixed defaults

## Notes

- This phase focuses on removing URL-based scale control while preserving component flexibility
- All scale-related logic and calculations are preserved in components
- Default scale of 3 and baseHexSize of 50 provide a good default experience
- Storybook stories retain scale controls for testing different configurations
- All existing expand/collapse and navigation functionality remains intact
- The ActionPanel continues to work as before
