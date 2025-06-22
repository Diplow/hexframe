# Issue: Add Dark Mode Toggle

**Date**: 2025-06-22
**Status**: Open
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

**Styling Patterns**:
- Utility-first approach with Tailwind classes
- `cn()` utility for class name merging
- Limited CSS modules usage (only auth tile)
- No CSS-in-JS solutions

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