# Issue #56 Log: Add Dark Mode Toggle

This file documents the complete history and evolution of issue #56.

## 2025-06-22 10:00 - Issue Created

*Created by @Diplow via /issue command*

### Initial Problem Statement
Users would like the ability to toggle between light and dark modes in the Hexframe application to improve visual comfort and accessibility, especially during extended use or in different lighting conditions.

### Initial Tags
#feature #design #accessibility #medium

---

## 2025-06-22 10:43 - GitHub Issue Created

*GitHub issue #56 created successfully*

### GitHub Issue Details
- Issue Number: #56
- URL: https://github.com/Diplow/hexframe/issues/56
- Labels: feature, design, accessibility, medium
- Status: Open

---

## 2025-06-22 11:00 - Context Analysis

*Added by @Diplow via /context command*

### Investigation Process
- Examined issue #56 documentation for dark mode toggle feature request
- Analyzed styling infrastructure (Tailwind CSS, CSS variables, shadcn/ui)
- Searched for existing theme management and dark mode implementation
- Investigated state management patterns for user preferences
- Reviewed UI component structure to identify toggle placement options
- Checked color system and CSS architecture

### Detailed Findings

**Styling Infrastructure**:
- Tailwind CSS with `darkMode: ["class"]` configuration
- Complete dark mode styles defined in globals.css using `.dark` selector
- OKLCH color space for modern color management
- CSS custom properties for theme variables
- shadcn/ui components with Radix UI primitives
- `cn()` utility for class merging (clsx + tailwind-merge)

**Current Theme State**:
- Dark mode CSS fully defined but never activated
- No JavaScript logic to apply `.dark` class
- No theme provider or context
- No persistence mechanism for theme preference
- No system preference detection

**State Management Patterns**:
1. Direct localStorage (e.g., toolbox visibility)
2. Storage Service with dedicated user preference methods
3. React Context pattern (AuthContext, MappingUserProvider)
4. No existing user settings/preferences in database

**UI Architecture**:
- No header/navbar component exists
- Bottom-positioned controls (toolbox, map controls)
- Gradient backgrounds in map interface
- Footer only on static pages, not map view

### Synthesis
The application has a complete dark mode styling infrastructure that's never been activated. All the CSS groundwork is done - it just needs the JavaScript logic to:
1. Toggle the `.dark` class on the `<html>` element
2. Persist user preference in localStorage
3. Provide a UI control for toggling
4. Optionally detect system preference

The implementation would follow existing patterns:
- Use localStorage via Storage Service for persistence
- Create a Theme Context following auth pattern
- Place toggle in toolbox or create minimal header

### Changes Made to Issue File
- Added comprehensive Context section with 4 subsections
- Documented existing infrastructure (styling ready, logic missing)
- Identified key components and integration points
- Listed UI placement options for theme toggle
- Key insight: Dark mode CSS exists but needs activation logic

---

## 2025-06-22 11:15 - Additional Context: Canvas Color System

*Updated by @Diplow based on reflection about Canvas color system*

### Additional Findings
**Canvas/Map Color System Analysis**:
- The `getColor()` function maps tile coordinates to colors based on:
  - Direction (first path segment) → Base color (amber, green, cyan, indigo, purple, rose)
  - Depth (path length) → Tint intensity (200, 300, 400... up to 900)
- This creates a visual hierarchy optimized for light backgrounds
- Colors are applied as hardcoded Tailwind classes without dark variants
- The system affects all tile rendering, making this the most complex part of dark mode implementation

**Scope of Color System**:
- Used in: StaticBaseTileLayout, DynamicFrame, DynamicEmptyTile
- Stroke colors also hardcoded for light mode (zinc-950, zinc-900)
- Button colors in tiles (amber-600, rose-600, blue-800) lack dark variants
- Text colors (zinc-950, cyan-800) assume light backgrounds

**Positive Finding**: 
- The Toolbox component already demonstrates proper dark mode patterns with classes like `bg-cyan-100 dark:bg-cyan-900/20`
- This provides a template for updating other components

### Updated Context Section
- Added "Canvas/Map Color System" subsection highlighting the direction/depth color mapping
- Noted that this system was designed for light backgrounds only
- Identified the Toolbox as already implementing dark mode patterns

---

## 2025-06-22 11:20 - Additional Context: Map Layout Background

*Updated by @Diplow identifying map layout gradients*

### Additional Finding
**Map Layout Background**:
- The `/src/app/map/layout.tsx` uses a complex gradient background system
- Three layered gradients using the directional colors in dark shades (900)
- Includes an SVG noise texture overlay for visual depth
- Currently hardcoded for dark mode only - will need light mode variant

This is more localized than the Canvas color system but still needs adaptation.

---

## 2025-06-22 11:30 - Solution Design

*Added by @Diplow via /solution command*

### Design Process
Analyzed three different implementation approaches based on:
- Context findings (CSS ready, Canvas colors need work)
- Existing patterns (Storage Service, React Context)
- Implementation complexity vs user value
- Incremental delivery possibilities

### Solution Approaches

**Solution 1: Minimal Dark Mode**
- Basic toggle without Canvas color adaptation
- 1-2 day implementation
- Leaves tiles light (functional but incomplete)

**Solution 2: Full Dark Mode with Inverted Tints**
- Complete implementation with tint inversion strategy
- Light: 200→900 (darker), Dark: 800→100 (lighter)
- 3-4 day implementation
- Maintains visual hierarchy

**Solution 3: Advanced Theme System**
- Custom OKLCH palettes for each theme
- System preference detection
- Smooth transitions
- 5-7 day implementation

### Recommendation
Selected Solution 2 as the best balance of:
- Complete user experience
- Reasonable implementation effort
- Leverages existing color system
- Can be enhanced incrementally

### Implementation Plan
Phased approach over 3 days:
1. Theme infrastructure (provider, toggle, persistence)
2. Canvas color adaptation (inverted tints)
3. UI refinements (strokes, buttons, text)

### Key Design Decisions
- Use tint inversion for Canvas colors (simple, effective)
- Place toggle in Toolbox (consistent with existing controls)
- Use Storage Service for persistence (existing pattern)
- Apply `.dark` class to `<html>` element (Tailwind convention)

---