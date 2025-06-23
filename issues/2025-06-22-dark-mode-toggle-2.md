# Issue: Add Dark Mode Toggle

**Date**: 2025-06-22
**Status**: In Progress
**Updated**: 2025-06-22
**Tags**: #feature #design #accessibility #medium
**GitHub Issue**: #56
**Branch**: issue-2-dark-mode-toggle

## Problem Statement
Users would like the ability to toggle between light and dark modes in the Hexframe application to improve visual comfort and accessibility, especially during extended use or in different lighting conditions.

## User Impact
- Who is affected? All users of the Hexframe application
- What can't they do? Cannot switch to a dark theme for better visual comfort
- How critical is this to their workflow? Medium - affects user comfort and accessibility but doesn't block core functionality

## Steps to Reproduce
1. Open the Hexframe application
2. Look for a dark mode toggle option in the UI
3. Notice there is no way to switch to dark mode

## Environment
- Browser/OS: All browsers and operating systems
- User role: All users
- Frequency: Persistent - the option is always missing

## Related Issues
- None identified yet

## Context

*I am an AI assistant acting on behalf of @Diplow*

### Existing Documentation
- **Styling System**: Well-documented Tailwind CSS setup with shadcn/ui components
- **CSS Architecture**: Uses CSS custom properties (variables) for theming in `/src/styles/globals.css`
- **Documentation vs Reality**: Dark mode infrastructure exists (✅) but is not activated (❌)

### Domain Overview
The application uses a modern styling architecture:
- **Tailwind CSS**: Utility-first CSS framework configured with class-based dark mode
- **shadcn/ui**: Component library built on Radix UI primitives
- **CSS Custom Properties**: OKLCH color space variables for consistent theming
- **No existing theme management**: Dark mode styles defined but never applied (📝)

### Key Components
Components that would be affected by dark mode:
- **Root Layout** (`/src/app/layout.tsx`): Where theme class should be applied
- **All UI Components**: Already have dark mode classes defined (e.g., `dark:bg-gray-800`)
- **Map Interface**: Uses gradient backgrounds that would need theme variants
- **Toolbox & Controls**: Bottom-positioned UI elements that use theme colors

### Implementation Details
**Current Color System**:
- Light theme: White backgrounds with dark text (OKLCH color space)
- Dark theme: Dark backgrounds with light text (defined but unused)
- Chart colors: 5 predefined colors for data visualization
- Sidebar-specific color variables

**Canvas/Map Color System** (Not dark-mode ready):
- **Direction-based colors**: Each hexagon direction maps to a color (amber, green, cyan, indigo, purple, rose)
- **Depth-based tints**: Colors darken with depth (200→300→400...→900)
- **Light-only design**: System assumes light backgrounds throughout
- **Hardcoded classes**: Uses direct Tailwind classes like `fill-amber-200` without dark variants
- **Affected components**: All tile rendering, strokes, and map visualization

**Map Layout Background** (Dark-only design):
- **Gradient system**: Three layered gradients using directional colors
- **Dark hardcoded**: Uses 900 shades (indigo-900, amber-900, etc.) 
- **Noise texture**: SVG noise overlay for visual depth
- **Located in**: `/src/app/map/layout.tsx`

**Styling Patterns**:
- Utility-first approach with Tailwind classes
- `cn()` utility for class name merging
- Limited CSS modules usage (only auth tile)
- No CSS-in-JS solutions
- **Exception**: Toolbox already implements dark mode patterns

**Dark Mode Configuration**:
- Tailwind: `darkMode: ["class"]` in config
- CSS: `.dark` selector with complete color overrides
- Missing: JavaScript to toggle the `.dark` class on `<html>` element

### Dependencies and Integration
**State Management Patterns**:
- **localStorage**: Used for UI preferences (e.g., toolbox visibility)
- **Storage Service**: Abstraction with `saveUserPreferences()` method
- **React Context**: Pattern used for auth and user state
- **No theme context**: Would need to be created

**UI Placement Options**:
1. **Toolbox area**: Bottom-right with existing tools
2. **Map Controls**: Bottom-left control area  
3. **New Header**: Could add minimal top bar (none exists)
4. **Footer**: Exists but only on static pages

**Required Dependencies**:
- Icon library needed (likely lucide-react to match UI patterns)
- No existing sun/moon icons for theme toggle
- All color infrastructure already in place

## Solution

*I am an AI assistant acting on behalf of @Diplow*

### Solution 1: Minimal Dark Mode (Quick Win)

**Overview**: Implement basic theme toggle without addressing Canvas colors initially.

**Implementation**:
1. Create `ThemeProvider` context using existing patterns
2. Add theme toggle to Toolbox (already has dark mode patterns)
3. Use Storage Service for persistence
4. Apply `.dark` class to `<html>` element
5. Add theme-aware gradients to map layout

**Components**:
- New: `/src/contexts/ThemeContext.tsx`
- New: `/src/components/ThemeToggle.tsx`
- Modified: `/src/app/layout.tsx` (wrap with provider)
- Modified: `/src/app/map/layout.tsx` (theme-aware gradients)
- Modified: `/src/app/map/Controls/Toolbox/Toolbox.tsx` (add toggle)

**Canvas Strategy**: Leave tiles in light colors temporarily (acceptable contrast on dark backgrounds)

**Pros**:
- Quick implementation (1-2 days)
- All UI components work immediately
- Establishes foundation for future improvements
- Non-breaking change

**Cons**:
- Canvas tiles remain light (suboptimal but functional)
- Incomplete dark mode experience
- May confuse users expecting full dark mode

### Solution 2: Full Dark Mode with CSS Variables (Recommended)

**Overview**: Complete dark mode using Tailwind CSS variables for theme-aware colors.

**Implementation**:
1. Everything from Solution 1
2. Define directional depth colors as CSS variables (e.g., `--color-nw-depth-1`)
3. Create Tailwind classes for each direction/depth combination
4. Update tile components to use semantic color classes
5. Add theme-aware stroke and UI colors

**Design System Foundation**:
```css
/* Semantic action colors */
--color-action-create: var(--green);
--color-action-edit: var(--amber);
--color-action-delete: var(--destructive);
--color-action-navigate: var(--primary);
--color-action-external: var(--accent);

/* Canvas depth colors */
--color-nw-depth-1: var(--amber-200);
--color-nw-depth-2: var(--amber-300);
/* ... up to depth-9 */

/* Dark mode (.dark) */
--color-action-create: var(--green);
--color-action-edit: var(--amber);
/* Canvas colors inverted */
--color-nw-depth-1: var(--amber-800);
--color-nw-depth-2: var(--amber-700);
```

**Benefits**:
- Consistent action colors across the app
- Single source of truth for theming
- Easy to maintain and extend
- Automatic dark mode support

**Components**:
- Everything from Solution 1
- Modified: `/src/styles/globals.css` (CSS variables)
- Modified: `/config/tailwind.config.ts` (custom color classes)
- Modified: `/src/app/map/types/tile-data.ts` (return semantic classes)
- Modified: All tile components (use new classes)

**Pros**:
- Clean CSS-based solution
- Foundation for future enhancements
- Easier debugging and maintenance
- No runtime color calculations

**Cons**:
- More initial CSS setup
- Need to update safelist in Tailwind config
- Larger CSS file (but better performance)

### Solution 3: Advanced Theme System with Custom Palettes

**Overview**: Sophisticated theme system with optimized color palettes for each mode.

**Implementation**:
1. Everything from Solution 1
2. Design custom color palettes optimized for each theme
3. Create color mapping system using CSS variables
4. Implement smooth theme transitions
5. Add system preference detection
6. Include high contrast mode option

**Advanced Features**:
- Custom OKLCH color scales for dark mode
- Smooth transitions between themes
- Respects system preferences
- Accessibility-first color choices
- Theme customization hooks for future

**Components**:
- Everything from Solution 2
- New: `/src/lib/theme/` (theme system)
- New: Theme-specific color scales in globals.css
- Modified: Extensive CSS variable usage

**Pros**:
- Best user experience
- Optimized color contrast
- Future-proof architecture
- Accessibility benefits

**Cons**:
- Significant implementation effort (5-7 days)
- Requires color design expertise
- More complex to maintain

### Recommended Approach: Solution 2 (Full Dark Mode with CSS Variables)

**Rationale**:
- Clean CSS-based solution aligned with Tailwind patterns
- Sets foundation for future theme enhancements
- Better performance (no runtime calculations)
- Easier to debug and maintain
- Natural path to Solution 3 features

**Implementation Phases**:

**Phase 1** (Day 1):
- Theme provider and context
- Theme toggle component
- localStorage persistence
- Basic theme switching
- Define semantic color variables for actions

**Phase 2** (Day 2):
- Define CSS variables for all direction/depth combinations
- Update Tailwind config with custom color classes
- Modify getColor() to return semantic classes
- Update tile components to use new classes

**Phase 3** (Day 3):
- Migrate hardcoded buttons to semantic variants
- Update stroke and text colors
- Establish consistent action-to-color mapping
- Testing and refinement

**Future Enhancements**:
- System preference detection
- Smooth transitions
- Custom color palettes
- Theme customization UI

## Implementation Progress

### Completed (Phase 1 & 2)
✅ Created ThemeContext with provider pattern
✅ Added ThemeToggle component with sun/moon icons
✅ Integrated toggle into app layout and Toolbox
✅ localStorage persistence for theme preference
✅ Made map layout gradients theme-aware
✅ Created CSS variables for all direction/depth combinations
✅ Updated Tailwind config with semantic color classes
✅ Modified getColor() to return semantic classes
✅ Updated tile components to handle both color formats
✅ Added dynamic text colors based on tile depth
✅ Fixed TypeScript errors related to color type changes
✅ Fixed center tile dark mode color (was black, now zinc-800)
✅ Fixed tile stroke colors for dark mode using CSS variables
✅ Fixed hierarchy tile colors and text contrast
✅ Fixed toolbox chevron color in dark mode
✅ Fixed dynamic tile hardcoded strokes

### Issues Resolved
1. **Scale 2 tile strokes**: Fixed hardcoded stroke colors in DynamicBaseTileLayout
2. **Hierarchy tiles**: Now use semantic color system with proper text contrast
3. **Toolbox chevron**: Added explicit color classes for visibility
4. **Center tile**: Changed from zinc-900 to zinc-800 for better visibility

### Remaining Tasks (Phase 3)
⏳ Update hardcoded button colors to semantic variants
⏳ Add design system color variables for actions
⏳ Establish consistent action-to-color mapping
⏳ Testing and refinement