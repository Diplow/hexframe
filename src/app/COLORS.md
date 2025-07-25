# Hexframe Color System

This document explains the philosophy and structure behind Hexframe's color system.

## Core Philosophy

Hexframe uses a **dual-purpose color system** where spatial colors (tile positions) also serve functional roles in the UI. This creates visual harmony while reducing cognitive load - users learn one color language that works everywhere.

## Color Selection Process

### The 6 Spatial Colors

We systematically selected colors from Tailwind's palette:
- **17 non-neutral colors** available (excluding slate, gray, zinc, neutral, stone)
- Selected every 3rd color for even distribution around the color wheel
- Exception: Indigo and Purple are closer (only 2 colors apart)

**Result:**
- Northwest: **Amber** (yellow-orange)
- Northeast: **Green** 
- East: **Cyan**
- Southeast: **Indigo** (blue-purple)
- Southwest: **Purple**
- West: **Rose** (red-pink)

### Primary Color: Violet

**Why Violet?**
- Sits between Indigo (SE) and Purple (SW) on the color wheel
- Literally "emerges" from the deep thinking quadrant (South)
- Distinct from all spatial colors
- Works well in light and dark modes
- Thematically fits Hexframe's mission of deliberate thought

### Neutral Color: Slate

**Why Slate over other grays?**
- Cool gray with subtle blue undertone
- Harmonizes with violet primary
- Feels technical/digital
- Works well with our cool-leaning palette

## Dual-Purpose Mapping

Each spatial color serves a functional role in the UI:

| Direction | Color | Spatial Meaning | UI Function |
|-----------|-------|-----------------|-------------|
| NW | Amber | Forward/Progress | Secondary actions, warnings |
| NE | Green | Growth/Positive | Success states |
| E | Cyan | New horizons | Links, navigation |
| SE | Indigo | Deep analysis | (Spatial only) |
| SW | Purple | Creative insight | AI/creative thinking |
| W | Rose | Sunset/Ending | Destructive actions |

## Color Variants

Each color has three variants for different states:
- **Light** (400): Backgrounds, disabled states
- **Default** (600): Primary usage
- **Dark** (800): Hover states, emphasis

## Depth System

Tiles use depth variants to show hierarchy:
- **Depth 1-3**: Light shades (higher in hierarchy)
- **Depth 4-6**: Medium shades
- **Depth 7-8**: Dark shades (deeper in hierarchy)

In dark mode, this inverts: deeper tiles become lighter.

## Design Narrative

The color system tells a story:
- **North** (Amber/Green): Practical action and progress
- **East/West** (Cyan/Rose): The navigation cycle - explore forward, remove/end
- **South** (Indigo/Purple/Violet): Deep thought, where primary actions originate

## Implementation

```css
/* Spatial colors become semantic aliases */
--color-secondary: var(--color-nw);     /* Amber */
--color-success: var(--color-ne);       /* Green */
--color-link: var(--color-e);           /* Cyan */
--color-ai: var(--color-sw);            /* Purple */
--color-destructive: var(--color-w);    /* Rose */
```

Additionally, AI colors have RGB variants for opacity support:
```css
--color-ai-rgb: 147 51 234;      /* purple-600 */
--color-ai-light-rgb: 192 132 252; /* purple-400 */
--color-ai-dark-rgb: 107 33 168;   /* purple-800 */
```

This creates a memorable system: once users learn that "East is cyan for exploration," they intuitively understand that cyan links lead somewhere new.