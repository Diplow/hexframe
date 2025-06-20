# Issue: Toolbox Menu UI Improvement for Tile Interactions

**Date**: 2025-06-20
**Status**: Open
**Tags**: #enhancement #design #tiles #product
**GitHub Issue**: #pending
**Branch**: issue-1-toolbox-menu-ui-improvement

## Problem Statement
Tile buttons appearing on hover makes the general UI feel clunky. Users need a more intuitive and persistent way to interact with tiles using different tools/modes, with keyboard shortcuts for efficiency.

## User Impact
- Who is affected? All users interacting with the hexagonal map interface
- What can't they do? Cannot efficiently switch between different interaction modes without hover-based UI elements
- How critical is this to their workflow? Medium - affects core interaction patterns but doesn't block functionality
- Workarounds: Currently must hover over tiles to see action buttons

## Expected Behavior
- Persistent toolbox menu on the left side of the screen
- Click behavior changes based on selected tool
- Keyboard shortcuts for quick tool switching
- Three toggle states for the toolbox:
  1. Closed (minimized)
  2. Icons only with shortcuts and labels on hover
  3. Icons + labels + shortcuts displayed

## Context

*I am an AI assistant acting on behalf of @ulysse*

### Existing Documentation
The project has comprehensive documentation for the map interface:
- **Architecture Docs**: `/src/app/map/ARCHITECTURE.md` - Explains dual-route architecture, component hierarchy, state management, and centralized tile action management ✅
- **Canvas README**: `/src/app/map/Canvas/README.md` - Documents Canvas component as main container for hex visualization, interaction handlers via TileActionsContext ✅
- **Tile README**: `/src/app/map/Tile/README.md` - Describes tile types (Item, Empty, User), modular structure, and performance considerations ✅
- **Domain Docs**: `/src/lib/domains/mapping/README.md` - Domain-driven design with clear separation of concerns ✅
- **Drag & Drop**: Recent feature implementation with optimistic updates and visual feedback ✅

### Domain Overview
The map interface follows a hierarchical component structure:
- **Page Layer**: Handles routing and URL state
- **Canvas Layer**: Main visualization container, manages interactions through TileActionsContext
- **Frame Layer**: Groups of tiles for efficient rendering
- **Tile Layer**: Individual hexagonal units with different types (Item, Empty, User)

The architecture emphasizes:
- URL-first state management for shareable views
- Region-based caching for performance
- Centralized action management for consistent interactions
- Progressive enhancement from static to dynamic

### Key Components
**TileActionsContext** (`/src/app/map/Canvas/index.tsx`):
- Central hub for tile interactions
- Provides callbacks for clicks, hovers, drag & drop
- Currently has empty implementations for click and hover handlers (marked as TODO)

**Tile Buttons** (`/src/app/map/Tile/Item/item.buttons.tsx`):
- Edit (amber), Delete (rose), URL (blue), Expand/Collapse (slate), Navigate (slate)
- Positioned absolutely with scale-responsive sizing
- Use CSS `opacity-0` and `group-hover:opacity-100` for hover visibility

**Empty Tiles** (`/src/app/map/Tile/Empty/empty.tsx`):
- Show create button on hover for owned spaces
- Track hover state locally with React hooks
- Use semi-transparent overlay for visual feedback

### Implementation Details
**Current Hover Pattern**:
- **CSS-based**: Buttons use `opacity-0 group-hover:opacity-100` for visibility
- **Local State**: Components track `isHovered` with useState
- **Button Positioning**: Absolute positioning at `top-[10%]` centered horizontally
- **Scale-based Sizing**: Buttons scale from 6x6 (12px icons) to 20x20 (40px icons)

**Interaction Flow**:
1. User hovers over tile → CSS group-hover activates
2. Buttons fade in with opacity transition
3. Click handlers prevent event bubbling
4. Actions trigger through TileActionsContext or direct handlers

**No Existing Patterns For**:
- Toolbar/toolbox components (no matches for toolbar, toolbox, side-panel patterns)
- Keyboard shortcuts (no existing hotkey or keybind implementations)
- Persistent UI panels for tool selection

### Dependencies and Integration
- **React Context**: TileActionsContext provides interaction callbacks to all tiles
- **URL State**: Navigation and expansion states sync with URL parameters
- **Cache Layer**: Map cache handles optimistic updates and data synchronization
- **tRPC**: Backend API for persistent operations

The current architecture is well-prepared for adding a toolbox:
- TileActionsContext can be extended for tool-based click handling
- Empty click/hover handlers are ready for implementation
- Component hierarchy supports adding new UI layers

## Solution

*I am an AI assistant acting on behalf of @ulysse*

### Prerequisites
- TileActionsContext must be extended to support tool state management
- Decision needed on whether toolbox state should persist in localStorage
- Keyboard event handling infrastructure needs to be established
- Icon library selection for tool icons (currently using Lucide React)

### Possible Solutions

#### Solution 1: Context-Based Tool System with Floating Panel (Preferred)
Extend TileActionsContext to manage tool state globally with a floating toolbox panel.

**Changes Required**:
- **TileActionsContext**: Add tool state, selection methods, and keyboard handling
- **New Toolbox Component**: Floating panel with three display modes
- **Tile Components**: Update click handlers to check active tool
- **Keyboard Hook**: Global keyboard shortcut management

**Implementation Approach**:
1. Extend TileActionsContext with `activeTool`, `setActiveTool`, and tool-specific handlers
2. Create Toolbox component with Radix UI primitives for consistent styling
3. Implement keyboard shortcuts using a custom useKeyboardShortcuts hook
4. Update tile click handlers to dispatch based on active tool
5. Add visual feedback for active tool (cursor changes, tile highlights)

**Tradeoffs**:
- ✅ **Pros**: Leverages existing context infrastructure, centralized state, easy to extend
- ✅ **Pros**: Consistent with current architecture patterns
- ✅ **Pros**: Minimal performance impact, tools loaded on demand
- ❌ **Cons**: Requires updating all tile interaction points
- ❌ **Cons**: Initial complexity in coordinating tool states
- 🎯 **Best for**: Long-term maintainability and extensibility

#### Solution 2: Standalone Tool Manager with Event Bus
Create a separate tool management system with event-based communication.

**Changes Required**:
- **New ToolManager**: Singleton service managing tool state
- **Event Bus**: Custom event system for tool changes
- **Toolbox Component**: Independent UI component
- **Event Listeners**: Added to each tile component

**Implementation Approach**:
1. Create ToolManager service with event emitter
2. Build Toolbox UI that communicates via events
3. Add event listeners to tiles for tool-specific actions
4. Implement keyboard shortcuts at document level
5. Use CSS classes for visual tool states

**Tradeoffs**:
- ✅ **Pros**: Decoupled from existing systems, easier to test in isolation
- ✅ **Pros**: Can be implemented without touching TileActionsContext
- ✅ **Pros**: More flexible for future tool additions
- ❌ **Cons**: Introduces new patterns not used elsewhere
- ❌ **Cons**: Event coordination can become complex
- ❌ **Cons**: Potential memory leaks from event listeners
- 🎯 **Best for**: Rapid prototyping and experimentation

#### Solution 3: URL-State Driven Tools
Integrate tool selection into the URL state management system.

**Changes Required**:
- **URL Params**: Add `tool` parameter to URL state
- **Page Component**: Parse and propagate tool state
- **Toolbox Component**: Syncs with URL parameters
- **Router Integration**: Update navigation to preserve tool state

**Implementation Approach**:
1. Extend URL parsing to include tool parameter
2. Pass tool state through component hierarchy
3. Create Toolbox that updates URL on tool change
4. Implement keyboard shortcuts that update URL
5. Ensure tool state persists across navigation

**Tradeoffs**:
- ✅ **Pros**: Shareable tool states via URL
- ✅ **Pros**: Consistent with URL-first architecture
- ✅ **Pros**: Built-in persistence and history
- ❌ **Cons**: URL updates can cause re-renders
- ❌ **Cons**: Tool changes pollute browser history
- ❌ **Cons**: Slower tool switching due to URL updates
- 🎯 **Best for**: Collaborative workflows where tool state matters

### Recommendation
**Recommended: Solution 1 - Context-Based Tool System**

This approach best aligns with Hexframe's existing architecture while providing the flexibility needed for future enhancements. The use of TileActionsContext maintains consistency with current patterns, while the floating panel design allows for the three display modes requested. The centralized state management will make it easier to add new tools and maintain consistent behavior across all tile types.

Key advantages:
- Builds on existing infrastructure (TileActionsContext)
- Maintains architectural consistency
- Supports all requested features (keyboard shortcuts, display modes)
- Performant with minimal re-renders
- Easy to extend with new tools in the future