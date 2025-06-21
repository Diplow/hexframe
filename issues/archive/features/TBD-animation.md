# Feature plan: animate dynamic navigation and expansion/collapse

## Problem

When navigating to a lower tier tile, the user has no feedback to show whats currently happening.

## High Level Goals

Those animation should only happen in dynamic mode.

1. When expanding a tile, the expanded tile should shrink until it fits its new scale and then the children should fade in.
2. When collapsing a tile, the children should fade out and then the collapsed tile should grow until it fits its new scale.
3. When navigating to a "sub" tile, hierarchy elements should appear progressively (lower level parent first) shrinking from the current display of this tile. At the same time, the destination tile should grow until it fits the current center.
4. When navigating to a "hierarchy" tile, the hierarchy tile should grow and translate to become the new "center tile" (both the scale 3 layout and the scale 2 "center"). The current center should shrink and translate to its new placement.

## Implementation details

### Core Animation Strategy

Use CSS transitions with element IDs and state classes to create smooth animations. The approach will rely on:

- **Element IDs**: Each tile gets a unique, stable ID based on its coordinates/path (using existing `data-tile-id` attribute)
- **State Classes**: CSS classes that define different animation states
- **CSS Custom Properties**: For dynamic scale, position, and opacity values
- **Transition Delays**: For progressive/sequential animations

### Current Scale System Understanding

Based on the codebase analysis:

- **TileScale**: `-2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6` (not just 1-3!)
- **Size Calculation**: `baseHexSize * Math.sqrt(3) * Math.pow(3, scale - 1)` for width
- **Scale Progression**: Each scale level increases size by factor of 3
- **Common Scales**: Mainly 1, 2, 3 are used, with 3 being the default map scale
- **Expansion Behavior**: When expanded, children render at `(scale - 1)` level

### 1. Tile Expansion Animation

**HTML Structure** (using existing component structure):

```html
<div
  data-tile-id="{coordId}"
  class="tile-container"
  data-animation-state="idle|expanding|collapsing"
>
  <div class="tile-hexagon">
    <!-- StaticBaseTileLayout content -->
  </div>
  <div
    class="tile-children-region"
    data-children-state="hidden|fading-in|visible"
  >
    <!-- StaticHexRegion children -->
  </div>
</div>
```

**CSS Implementation**:

```css
/* Base tile container - already has transitions */
[data-tile-id] {
  transition:
    transform 300ms ease-out,
    scale 300ms ease-out;
}

/* Expansion: tile shrinks to accommodate children */
[data-animation-state="expanding"] {
  transform: scale(var(--expansion-scale, 0.9));
}

/* Children fade in after parent shrinks */
.tile-children-region[data-children-state="hidden"] {
  opacity: 0;
  pointer-events: none;
}

.tile-children-region[data-children-state="fading-in"] {
  opacity: 0;
  animation: childrenFadeIn 250ms ease-in 300ms forwards;
}

@keyframes childrenFadeIn {
  to {
    opacity: 1;
    pointer-events: auto;
  }
}
```

### 2. Tile Collapse Animation

**State Sequence**:

1. `data-children-state="fading-out"` → children fade out (200ms)
2. `data-animation-state="growing"` → tile grows to original scale (300ms, delayed 200ms)

**CSS Implementation**:

```css
.tile-children-region[data-children-state="fading-out"] {
  animation: childrenFadeOut 200ms ease-out forwards;
}

@keyframes childrenFadeOut {
  to {
    opacity: 0;
    pointer-events: none;
  }
}

[data-animation-state="growing"] {
  animation: tileGrow 300ms ease-out 200ms forwards;
}

@keyframes tileGrow {
  from {
    transform: scale(var(--expansion-scale, 0.9));
  }
  to {
    transform: scale(1);
  }
}
```

### 3. Navigation Animation (Sub-tile to Center)

**Current Navigation**: Uses `navigateToItem()` from MapCache to update center and URL

**HTML Structure** (using existing ParentHierarchy component):

```html
<div class="parent-hierarchy" data-nav-state="appearing">
  <div
    data-tile-id="parent-{level}"
    class="hierarchy-tile"
    data-hierarchy-state="hidden|appearing|visible"
    style="--appear-delay: {level * 100}ms"
  ></div>
  <div
    data-tile-id="{destination}"
    class="destination-tile"
    data-nav-state="growing-to-center"
  ></div>
</div>
```

**CSS Implementation**:

```css
/* Hierarchy tiles appear progressively */
.hierarchy-tile[data-hierarchy-state="appearing"] {
  opacity: 0;
  transform: scale(var(--current-scale, 1)) translateY(20px);
  animation: hierarchyAppear 400ms ease-out var(--appear-delay, 0ms) forwards;
}

@keyframes hierarchyAppear {
  to {
    opacity: 1;
    transform: scale(var(--hierarchy-target-scale, 0.6)) translateY(0);
  }
}

/* Destination tile grows and centers */
[data-nav-state="growing-to-center"] {
  transform: scale(var(--nav-initial-scale, 0.3))
    translate(var(--nav-offset-x, 0), var(--nav-offset-y, 0));
  animation: growToCenter 500ms ease-out forwards;
}

@keyframes growToCenter {
  to {
    transform: scale(1) translate(0, 0);
  }
}
```

### 4. Hierarchy Navigation Animation (Parent to Center)

**Current Behavior**: ParentHierarchy tiles use `navigateToItem()` on click

**CSS Implementation**:

```css
/* Current center shrinks and moves to hierarchy position */
[data-nav-state="shrinking-to-hierarchy"] {
  animation: shrinkToHierarchy 400ms ease-out forwards;
}

@keyframes shrinkToHierarchy {
  to {
    transform: scale(var(--hierarchy-scale, 0.6))
      translate(var(--hierarchy-x, 200px), var(--hierarchy-y, -300px));
  }
}

/* Hierarchy tile becomes new center */
[data-nav-state="becoming-center"] {
  transform: scale(var(--hierarchy-scale, 0.6))
    translate(var(--hierarchy-x, 200px), var(--hierarchy-y, -300px));
  animation: becomeCenter 400ms ease-out forwards;
}

@keyframes becomeCenter {
  to {
    transform: scale(1) translate(0, 0);
  }
}
```

### 5. Integration with Existing Components

**Hook into MapCache navigateToItem**:

```typescript
// In DynamicMapCanvas or new animation hook
const useNavigationAnimations = () => {
  const { navigateToItem } = useMapCache();

  const animatedNavigateToItem = async (targetCoordId: string) => {
    // 1. Set animation states on relevant tiles
    setTileAnimationState(targetCoordId, "growing-to-center");

    // 2. Calculate hierarchy and set progressive delays
    const hierarchy = getParentHierarchy(targetCoordId);
    hierarchy.forEach((parent, index) => {
      setTileAnimationState(parent.coordId, "appearing", {
        "--appear-delay": `${index * 100}ms`,
        "--hierarchy-target-scale": "0.6",
      });
    });

    // 3. Execute navigation
    await navigateToItem(targetCoordId);

    // 4. Clean up animation states after completion
    setTimeout(() => cleanupAnimationStates(), 500);
  };

  return { animatedNavigateToItem };
};
```

**Hook into Dynamic Tile Buttons**:

```typescript
// Update DynamicTileButtons expansion handler
const handleExpansion = async (e: React.MouseEvent) => {
  e.preventDefault();
  setIsToggling(true);

  // Set animation state before toggling
  const isCurrentlyExpanded = allExpandedItemIds.includes(item.metadata.dbId);
  const animationState = isCurrentlyExpanded ? "collapsing" : "expanding";

  setTileAnimationState(item.metadata.coordId, animationState);

  try {
    toggleItemExpansionWithURL(item.metadata.dbId, urlInfo);
  } finally {
    // Clean up animation state
    setTimeout(() => setTileAnimationState(item.metadata.coordId, "idle"), 500);
    setIsToggling(false);
  }
};
```

### 6. Animation State Management

**React Hook for Animation States**:

```typescript
interface TileAnimationState {
  coordId: string;
  animationState:
    | "idle"
    | "expanding"
    | "collapsing"
    | "growing-to-center"
    | "shrinking-to-hierarchy";
  cssProperties: Record<string, string>;
}

const useAnimationController = () => {
  const [animatingTiles, setAnimatingTiles] = useState<
    Map<string, TileAnimationState>
  >(new Map());

  const setTileAnimationState = (
    coordId: string,
    state: string,
    properties: Record<string, string> = {},
  ) => {
    const element = document.querySelector(`[data-tile-id="${coordId}"]`);
    if (element) {
      element.setAttribute("data-animation-state", state);
      Object.entries(properties).forEach(([key, value]) => {
        (element as HTMLElement).style.setProperty(key, value);
      });
    }
  };

  const cleanupAnimationStates = () => {
    document.querySelectorAll("[data-animation-state]").forEach((element) => {
      element.setAttribute("data-animation-state", "idle");
    });
  };

  return { setTileAnimationState, cleanupAnimationStates };
};
```

### 7. Scale-Aware Animation Parameters

**Dynamic Scale Calculations**:

```typescript
const getAnimationProperties = (
  fromScale: TileScale,
  toScale: TileScale,
  baseHexSize = 50,
) => {
  // Calculate size ratios based on actual scale formula
  const fromSize =
    fromScale === 1
      ? baseHexSize * Math.sqrt(3)
      : baseHexSize * Math.sqrt(3) * Math.pow(3, fromScale - 1);

  const toSize =
    toScale === 1
      ? baseHexSize * Math.sqrt(3)
      : baseHexSize * Math.sqrt(3) * Math.pow(3, toScale - 1);

  return {
    "--expansion-scale": (toSize / fromSize).toString(),
    "--hierarchy-scale": "0.6", // Fixed hierarchy scale
    "--nav-initial-scale": "0.3", // Fixed navigation start scale
  };
};
```

### 8. Tailwind Integration

**Custom Animation Classes**:

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      animation: {
        "children-fade-in": "childrenFadeIn 250ms ease-in forwards",
        "children-fade-out": "childrenFadeOut 200ms ease-out forwards",
        "tile-grow": "tileGrow 300ms ease-out forwards",
        "hierarchy-appear": "hierarchyAppear 400ms ease-out forwards",
        "grow-to-center": "growToCenter 500ms ease-out forwards",
        "shrink-to-hierarchy": "shrinkToHierarchy 400ms ease-out forwards",
        "become-center": "becomeCenter 400ms ease-out forwards",
      },
      keyframes: {
        childrenFadeIn: {
          to: { opacity: "1", "pointer-events": "auto" },
        },
        childrenFadeOut: {
          to: { opacity: "0", "pointer-events": "none" },
        },
        tileGrow: {
          from: { transform: "scale(var(--expansion-scale, 0.9))" },
          to: { transform: "scale(1)" },
        },
        hierarchyAppear: {
          to: {
            opacity: "1",
            transform:
              "scale(var(--hierarchy-target-scale, 0.6)) translateY(0)",
          },
        },
        growToCenter: {
          to: { transform: "scale(1) translate(0, 0)" },
        },
        shrinkToHierarchy: {
          to: {
            transform:
              "scale(var(--hierarchy-scale, 0.6)) translate(var(--hierarchy-x, 200px), var(--hierarchy-y, -300px))",
          },
        },
        becomeCenter: {
          to: { transform: "scale(1) translate(0, 0)" },
        },
      },
    },
  },
};
```

### 9. Performance Considerations

- **Leverage existing transitions**: StaticBaseTileLayout already has `transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"`
- **Use existing data-tile-id**: Each tile already has `data-tile-id={coordId}` for targeting
- **GPU acceleration**: Animations use `transform` and `opacity` only
- **Cleanup**: Animation states are reset after completion to prevent memory leaks
- **Progressive enhancement**: Animations only run in dynamic mode

This approach integrates smoothly with the existing architecture while providing the smooth visual feedback users need during navigation and expansion operations.
