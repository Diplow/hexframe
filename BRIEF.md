# Hexagon Click Detection Problem - Technical Brief

## Problem Statement

Right-click behavior on hexagonal tiles registers on the entire **square bounding box** instead of just the **hexagon shape**, causing misleading interactions in corner areas where tiles overlap.

## Current Behavior vs Expected

### Current (Broken)
- Right-click works anywhere in the square area around each hexagon
- In corners where squares overlap, the wrong tile responds
- User sees "all-scroll" cursor instead of expected "grab" cursor in overlapping areas
- Right-click context menu opens for wrong tile

### Expected
- Right-click should only work within the actual hexagon boundary
- Corner areas should belong to the correct neighboring tiles
- Proper cursor states ("grab" for owned tiles)
- Correct context menus

## How The Layout System Works

### Bee Hive Layout with Negative Margins
The tiles are arranged in a hexagonal bee hive pattern using:

1. **Flex rows with negative margins** (`DynamicFrameCore.tsx:278`):
   ```jsx
   style={rowIndex > 0 ? { marginTop: `-${marginTop}px` } : undefined}
   ```

2. **Intentional square overlap** to create seamless hexagon adjacency:
   ```
   Row 0: [NW] [NE]
   Row 1: [W] [CENTER] [E]  ← negative margin pulls up
   Row 2: [SW] [SE]         ← negative margin pulls up
   ```

3. **Z-index stacking**:
   - Center tile container: `zIndex: 10`
   - Neighbor tiles: `zIndex: 5`
   - Tile content: varies by interaction layer

## Current Click Handling Implementation

### Tile Structure
```
DynamicItemTile (item.tsx)
├── Outer wrapper div (drag attributes, z-index management)
└── ItemTileContent (_components/item-tile-content.tsx)
    ├── Click handler div (onClick, onContextMenu) ← PROBLEM: square area
    └── DynamicBaseTileLayout + visual content
```

### Event Flow
1. **Mouse event occurs** in overlapping area
2. **DOM event bubbling** - highest z-index tile captures first
3. **Square boundary** - any click in square triggers the tile's handlers
4. **Wrong tile responds** - center tile captures corner clicks meant for neighbors

## Key Files Involved

- `src/app/map/Canvas/NeighborTiles.tsx:286` - ✅ Fixed SE neighbor positioning
- `src/app/map/Canvas/Tile/Item/_components/item-tile-content.tsx:87-91` - ❌ Square click area
- `src/app/map/Canvas/DynamicFrameCore.tsx:277-278` - Bee hive layout system
- `src/app/map/Canvas/Tile/Item/item.tsx:67-79` - Drag wrapper with data attributes

## Previous Fix Attempts (Failed)

1. **CSS clip-path** - Visual clipping doesn't affect event boundaries
2. **Z-index manipulation** - Breaks layout hierarchy and drag system
3. **pointer-events: none** - Breaks bee hive layout and cursor states
4. **Point-in-polygon detection** - Added complexity, inconsistent behavior

## Solution Requirements

The solution must:
- ✅ Preserve the negative margin bee hive layout system
- ✅ Maintain drag functionality and cursor states
- ✅ Keep z-index hierarchy for visual layering
- ✅ Only register clicks within hexagon boundaries
- ✅ Allow corner clicks to reach correct neighbor tiles
- ✅ Work with existing event handling in `useTileInteraction`

## Success Criteria

When complete:
- Right-clicking in hexagon center → center tile context menu + "grab" cursor
- Right-clicking in corner overlapping areas → neighbor tile context menu + "grab" cursor
- No more "all-scroll" cursor in corner areas
- Preserved drag and visual behaviors