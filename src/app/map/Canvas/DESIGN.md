# Canvas Design

The hexagonal playground for visual system architecture.

## Overview

The Canvas is the primary visualization component of Hexframe, rendering the hexagonal tile system with three levels of depth simultaneously. It transforms abstract system hierarchies into spatial, explorable interfaces.

## Design Principles

### Hexagonal Grid
- **60° angles**: True hexagonal geometry
- **Equal spacing**: Consistent gaps between tiles
- **Center focus**: Current tile always in the middle
- **Radial layout**: Children arranged around center

### Visual Hierarchy Through Scale
```
Scale 3 (Center): Full detail - title + description
Scale 2 (Children): Medium detail - title + indicators
Scale 1 (Grandchildren): Minimal detail - title only
```

### Depth Visualization
- **3-level display**: Always show exactly 3 generations
- **Progressive disclosure**: Navigate to see deeper levels
- **Context preservation**: Always know where you are

## Component Architecture

### Canvas Container
```tsx
<div className="relative w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
  {/* Canvas content */}
</div>
```

### Tile Rendering
```tsx
const tileClasses = {
  base: 'hexagon absolute transition-all duration-200',
  scale3: 'w-64 h-64 text-lg',
  scale2: 'w-32 h-32 text-base', 
  scale1: 'w-16 h-16 text-sm'
};
```

### Color Inheritance
Tiles inherit color from their position or parent:
- **Positioned tiles**: Use spatial color (NW, NE, E, SE, SW, W)
- **Unpositioned tiles**: Inherit parent's color
- **User tiles**: Special treatment with avatars

## Interaction Patterns

### Primary Interactions
1. **Click to navigate**: Enter a tile with children
2. **Hover for focus**: Subtle elevation change
3. **Drag to reposition**: Move tiles between positions
4. **Context menu**: Right-click for more actions

### Visual Feedback
```tsx
const interactionClasses = {
  hover: 'hover:shadow-lg hover:scale-105 hover:z-10',
  active: 'active:scale-95',
  dragging: 'opacity-50 cursor-move',
  dropTarget: 'ring-2 ring-violet-600 ring-offset-2'
};
```

### Animation Timing
- **Navigation zoom**: 250ms ease-in-out
- **Hover transitions**: 200ms ease
- **Drag feedback**: 100ms instant
- **Layout shifts**: 200ms ease-in-out

## Spatial Color System

Following the design system's dual-purpose colors:

| Position | Color | Meaning |
|----------|-------|---------|
| NW | `bg-amber-600` | Forward/Progress |
| NE | `bg-green-600` | Growth/Positive |
| E | `bg-cyan-600` | New horizons |
| SE | `bg-indigo-600` | Deep analysis |
| SW | `bg-purple-600` | Creative insight |
| W | `bg-rose-600` | Sunset/Ending |

## Empty State Handling

### New User Experience
```tsx
<div className="hexagon border-2 border-dashed border-slate-300 dark:border-slate-600">
  <span className="text-slate-400">Click to add</span>
</div>
```

### Empty Positions
- Dashed outline for new users
- Subtle dots for experienced users
- Clear affordance for creation

## Performance Considerations

### Rendering Optimization
- **Viewport culling**: Only render visible tiles
- **Level-of-detail**: Reduce detail at scale 1
- **Batch updates**: Group layout calculations
- **CSS transforms**: Hardware acceleration

### Prefetching Strategy
- Preload children of hovered tiles
- Cache recently visited regions
- Progressive enhancement for deep trees

## Accessibility

### Keyboard Navigation
```tsx
const keyboardClasses = {
  focus: 'focus:outline-none focus:ring-2 focus:ring-violet-600',
  selected: 'ring-2 ring-violet-600'
};
```

- **Tab**: Navigate between tiles
- **Enter**: Activate/navigate into tile
- **Arrow keys**: Move between siblings
- **Escape**: Navigate to parent

### Screen Reader Support
- Descriptive ARIA labels
- Level announcements
- Relationship descriptions
- Navigation hints

## Responsive Behavior

### Mobile Adaptations
- Touch-friendly tap targets (min 44px)
- Pinch to zoom gestures
- Simplified drag interactions
- Reduced visual complexity

### Breakpoint Adjustments
```tsx
const responsiveClasses = {
  mobile: 'sm:scale-75',    // Smaller tiles on mobile
  tablet: 'md:scale-90',    // Medium scaling
  desktop: 'lg:scale-100'   // Full size on desktop
};
```

## State Management

### Canvas State
- Current center tile ID
- Expanded items set
- Zoom level (for future)
- Interaction mode

### Tile State
- Position (x, y coordinates)
- Scale (1, 2, or 3)
- Color (inherited or assigned)
- Expansion status

## Integration Points

### With MapCache
- Receives tile data from cache
- Triggers navigation events
- Handles optimistic updates

### With EventBus
- Emits interaction events
- Listens for external updates
- Coordinates with Chat

### With Toolbox
- Receives mode changes
- Handles tool-specific interactions
- Updates cursor states

## Future Enhancements

### Planned Features
1. **Zoom controls**: Smooth scaling beyond 3 levels
2. **Minimap**: Overview navigation
3. **Search highlighting**: Visual search results
4. **Collaboration cursors**: Multi-user awareness
5. **Animation preferences**: Respect reduced motion

### Technical Improvements
- WebGL rendering for large maps
- Virtual scrolling for deep hierarchies
- Progressive loading indicators
- Offline mode enhancements

## Design Decisions

### Fixed 3-Level Display
**Choice**: Always show exactly 3 levels
**Rationale**: Balances overview with detail
**Alternative**: Considered infinite zoom, too complex

### Hexagonal Over Square
**Choice**: Hexagonal grid
**Rationale**: 6 connections match human cognitive limits
**Trade-off**: More complex positioning math

### Center-Focused Navigation
**Choice**: Always center the current tile
**Rationale**: Clear focus, predictable navigation
**Alternative**: Free-form panning was disorienting

See the main [DESIGN.md](/src/app/DESIGN.md) for overall design system guidelines.