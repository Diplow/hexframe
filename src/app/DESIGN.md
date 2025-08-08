# Hexframe Design System

Making the world more deliberate through visual system architecture.

Where individual practice meets collective wisdom.

## 1. What is a System?

Systems are the core concept of Hexframe. For a complete understanding of what systems are and how they work, see [SYSTEM.md](./SYSTEM.md).

**Key points for design**:
- Systems are hierarchical (center → children → infinite depth)
- Rule of 6 constraint (max 6 children per center)
- Spatial semantics (optional but powerful)
- Color language (optional enhancement)
- Systems evolve through practice and collaboration

## 2. Design Goals

What we want to reward and enable:

### System Exploration
**Primary Goal**: Make discovering relationships rewarding
- Frictionless navigation between levels
- Clear wayfinding (always know where you are)
- Context preservation (see where you came from)

### System Understanding
**See the forest and the trees**
- 3-depth display shows overview + detail simultaneously
- Progressive disclosure prevents overwhelm
- Visual hierarchy guides comprehension

### System Creation
**From idea to structure**
- Start with yourself as root system
- Intuitive tile manipulation
- Spatial thinking tools (opposites, neighbors)

### System Sharing
**Making systems accessible**
- Public/private toggle
- Share via URL
- Authorship preserved

## 3. Design Tools

The visual language for achieving our goals:

### Color System
**Semantic + Harmonic**
- Position colors with dual UI purposes
- Violet primary emerging from indigo/purple
- Slate neutral for cool harmony
- Depth progression shows hierarchy

For complete color philosophy and implementation, see [COLORS.md](./COLORS.md).

### Typography
**Scannable Hierarchy**
```css
--text-xs: 0.75rem;   /* Metadata */
--text-sm: 0.875rem;  /* Scale 1 tiles */
--text-base: 1rem;    /* Scale 2 tiles */
--text-lg: 1.25rem;   /* Scale 3 tiles */
```

### Spacing
**Hexagonal Rhythm**
```css
--space-1: 0.25rem;  /* Tight grouping */
--space-2: 0.5rem;   /* Related elements */
--space-3: 0.75rem;  /* Standard gap */
--space-4: 1rem;     /* Section spacing */
```

### Motion
**Meaningful Transitions**
```css
--duration-fast: 100ms;     /* Feedback */
--duration-normal: 200ms;   /* Navigation */
--duration-zoom: 250ms;     /* Depth changes */
```

### Iconography
**Visual Indicators**
- Expand/collapse (▶/▼)
- Has children (badge)
- Content type (🤖, 📊, 📝)
- Status (✓, ⚡, ⏸)

### Elevation
**Depth Cues**
- Shadows for hover/active states
- Blur for background context
- Opacity for hierarchy levels

## 4. Design Constraints

Boundaries that create clarity:

### 3-Depth Display Limit
**Show exactly 3 levels at once**
- Center (scale 3) + Children (scale 2) + Grandchildren (scale 1)
- Not a data limit - systems can be infinitely deep
- Navigate to change viewing context

### Navigation-First Interaction
**Exploration is the primary action**
- Click = navigate (for tiles with children)
- Other actions are secondary
- Minimize modal states

### User as Root
**Every system starts with a person**
- No floating projects
- Always traceable to author
- Context is part of meaning

### Performance Budget
**Instant feel**
- < 50ms response time
- < 200ms animations
- Prefetch likely targets

## 5. Design Decisions

Key choices and their trade-offs:

### Color System Architecture
**Dual-purpose colors**: Spatial positions serve UI functions
- NW Amber → Secondary actions
- NE Green → Success states
- E Cyan → Links/navigation
- W Rose → Destructive actions

See [COLORS.md](./COLORS.md) for complete color system documentation.

### Toolbox Interaction Model
**Current**: Mode-based tool selection

**Challenge**: Too many actions per tile
- Navigate, expand/collapse, create, edit, delete, move, swap

**Future Direction**: Context-sensitive primary actions

### Information Density
**Current Scales**:
- Scale 1: Title only (25 chars)
- Scale 2: Title + indicators
- Scale 3: Title + full description

**No Hover Previews**: Prevent layout instability

### Visual Hierarchy
**User Tiles vs System Tiles**
- Users: Avatar + name
- Systems: Title + description
- Different progression patterns

### Theme Modes
**Light/Dark/Auto**
- Semantic colors maintain meaning
- Depth progression inverts
- Contrast ratios preserved

### Component Architecture
**Modular Design Tokens**
- CSS custom properties
- Semantic naming
- Progressive enhancement

### Focus State Strategy
**Base outline for accessibility**
- All elements get `outline-ring/50` by default
- Provides baseline focus indicator for keyboard navigation
- Components override with `focus:outline-none` + custom ring styles
- Ensures no focusable element is ever completely invisible

**Pattern**:
```css
/* Base layer - all elements */
* { @apply outline-ring/50; }

/* Component layer - custom focus */
.button { @apply focus:outline-none focus:ring-2 focus:ring-primary; }
```

This two-layer approach ensures accessibility while allowing design flexibility.

## 6. Map Page

The primary (and currently only) interface:

### Map View (/map)
**The exploration interface**
- Full 3-depth hexagonal display
- Click to navigate into tiles
- All spatial relationships visible

### Components

#### Canvas
**The hexagonal playground**
- See [Canvas DESIGN.md](map/Canvas/DESIGN.md) for detailed specifications

#### Hierarchy
**Breadcrumb navigation**
- Shows path from user root
- Avatar → System → Current location
- Click any ancestor to navigate up

#### Toolbox
**Multi-action handler**
- Mode selection (navigate/edit/create)
- Contextual tool display
- Challenge: Too many actions per tile

---

## 7. Brand Guidelines

### Brand Name
**HexFrame** - Always styled with distinctive parts
- **Hex**: Light font weight (font-light)
- **Frame**: Bold font weight (font-bold)
- Never use "Hexframe" or "hexframe" - always "HexFrame"
- This visual treatment reinforces the dual nature: hexagonal structure + framing systems

**Implementation**:
```jsx
<span className="font-light">Hex</span><span className="font-bold">Frame</span>
```

## Implementation Priority

1. **Core Navigation**: Frictionless exploration
2. **Visual Hierarchy**: Clear depth/importance
3. **Color System**: Harmonious but meaningful
4. **Interaction Model**: Resolve toolbox challenge

## Open Questions

1. How do colors behave when navigating between users' systems?
2. Should empty tiles have dashed outlines always or just for new users?
3. How to resolve the toolbox interaction model for multiple actions per tile?

---

This design system evolves with user needs while maintaining core principles of deliberate system creation.

For future design ideas and features not yet implemented, see [FUTURE_IDEAS.md](./FUTURE_IDEAS.md).