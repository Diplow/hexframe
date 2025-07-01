# Issue: Chat Panel for System Interaction

**Date**: 2025-01-07
**Status**: Open
**Tags**: #feature #design #tiles #high
**GitHub Issue**: #65
**Branch**: issue-3-preview-panel-tiles

## Problem Statement
We need a chat panel to enable interaction with tiles and systems. This panel will start by showing tile content but will evolve into a full conversational interface for system interaction. The chat establishes the foundation for users to explore, understand, and eventually converse with systems. Tiles should display only titles, with all content and interaction happening through the chat interface.

## User Impact
- Users cannot easily read tile content without clicking into each tile
- Current tile display may be cluttered with too much information
- No dedicated space for system interaction and content exploration
- Users need a conversational interface to understand and interact with systems
- Foundation needed for future AI-powered system conversations

## Expected Behavior
1. Tiles show simplified display with just the title
2. Selecting a tile sends it to the chat panel for exploration
3. Chat panel displays content as a widget within conversation flow
4. Chat builds conversation history as user explores different tiles
5. Chat panel takes significant screen space (resizable)
6. Layout adjusts responsively to accommodate the chat panel
7. Foundation supports future interactive conversations with systems

## Current Behavior
- Tiles display content directly on the tile surface
- No chat interface for system interaction
- Limited space on tiles for displaying full content
- No foundation for conversational system exploration

## Environment
- Component: Map view interface
- User role: All users navigating tile maps
- Frequency: Core feature - used constantly during map navigation

## Related Issues
- Previous tile display improvements
- Map canvas layout optimizations

## Context

*I am an AI assistant acting on behalf of @ulysse*

### Existing Documentation

**README Files**:
- `/src/app/map/ARCHITECTURE.md`: Comprehensive map application architecture
  - ✅ Dual-route architecture (dynamic `/map` vs static `/static/map`)
  - ✅ Component hierarchy and state management strategy
  - ✅ Centralized tile action management pattern
  - ✅ Region-based caching with hierarchical loading
- `/src/lib/domains/README.md`: Domain-driven design structure
  - ✅ Clear separation of entities, actions, services, and repositories
- `/CHAT.md`: Detailed vision and design philosophy for the chat panel
  - ✅ Evolution from preview panel to chat interface
  - ✅ AI orchestration architecture
  - ✅ Phased implementation approach

**Documentation vs Reality**: 
- ✅ Architecture matches implementation
- ✅ Component hierarchy follows documented patterns
- 📝 No existing chat/preview components (greenfield development)

### Domain Overview

The map application follows a hierarchical architecture:
- **Page Layer**: Server-side data fetching and URL parameter management
- **Canvas Layer**: Orchestrates hexagonal frame rendering and manages cache synchronization
- **Frame Layer**: Recursive hexagonal layout with expansion logic
- **Tile Layer**: Individual tile rendering with content and interaction buttons
- **Controls Layer**: Toolbox, ParentHierarchy, and MapControls for UI management

Key architectural patterns:
- URL-first state management for shareable/bookmarkable state
- Centralized tile action coordination to avoid hook proliferation
- Provider-based state management (MapCacheProvider, TileActionsProvider)
- Tool-based interaction system (select, navigate, expand, create, edit, delete, drag)

### Key Components

**Layout Structure** (`/src/app/map/page.tsx`):
- Main container with `TileActionsProvider` and `ToolStateManager` wrappers
- `MapContent` wrapper for keyboard shortcuts and tool cursor
- `MapCacheProvider` for data management
- Core layout components:
  - `DynamicMapCanvas`: Center area for hexagonal map display
  - `Toolbox`: Left side tool selection (fixed position)
  - `ParentHierarchy`: Right side breadcrumb navigation
  - `MapControls`: Additional controls (scale, etc.)
  - `OfflineIndicator`: Status indicator

**Tile Display** (`/src/app/map/Tile/Item/`):
- `DynamicItemTile`: Main tile component with interaction logic
- `ItemTileContent`: Visual presentation layer
- `DynamicTileContent`: Markdown rendering with scale-based display
  - Scale 1: Title only (truncated to 25 chars)
  - Scale 2: Title + truncated description (200 chars), full content on hover
  - Scale 3+: Full markdown content with scrolling

**State Management**:
- `MapCacheProvider`: Centralized data cache with offline support
  - Items stored by coordinate ID
  - Region metadata for hierarchical loading
  - Background sync capabilities
- `TileActionsProvider`: Tool state and tile interaction dispatch
  - Active tool selection (persisted to localStorage)
  - Tool-specific click handlers
  - Drag and drop coordination

**Tool System** (`/src/app/map/Controls/Toolbox/`):
- Six primary tools: expand, navigate, create, edit, drag, delete
- 'select' tool exists but not in UI (reserved for future use)
- Keyboard shortcuts for each tool
- Visual states: closed, icons, full (with labels)

### Implementation Details

**File Organization**:
```
/src/app/map/
├── page.tsx                    # Main page component
├── Canvas/                     # Map rendering
│   ├── index.tsx              # DynamicMapCanvas
│   ├── frame.tsx              # Hexagonal frame recursion
│   └── TileActionsContext.tsx # Tool interaction dispatch
├── Tile/                      
│   └── Item/                  # Item tile components
│       ├── item.tsx           # Main tile component
│       ├── content.tsx        # Markdown content display
│       └── _components/       # Sub-components
├── Cache/                     # Data management
│   └── map-cache.tsx         # Cache provider and hooks
├── Controls/                  # UI controls
│   ├── Toolbox/              # Tool selection
│   ├── ParentHierarchy/      # Breadcrumb navigation
│   └── index.tsx             # MapControls
└── _components/              # Shared components
```

**Design Patterns**:
- Hook composition for complex state logic
- Provider pattern for cross-component state sharing
- Centralized action dispatch to reduce component complexity
- Progressive enhancement with static fallbacks

**Data Flow**:
1. URL parameters → Page component → Initial state
2. MapCache loads data from server/localStorage
3. Canvas renders tiles from cache
4. Tool interactions dispatch through TileActionsContext
5. State changes update cache → Re-render affected tiles

### Dependencies and Integration

**Internal Dependencies**:
- Auth context for user permissions
- Theme context for dark mode support
- Router for navigation
- tRPC for server communication

**External Consumers**:
- No direct consumers (top-level page component)
- Provides contexts consumed by child components

**API Contracts**:
- Server service interface for data fetching
- Storage service interface for localStorage
- Mutation operations for CRUD actions

**Key Integration Points for Chat Panel**:
1. Layout modification in `page.tsx` to add split panel
2. State extension in `MapCacheProvider` for chat state
3. New tool type in `TileActionsProvider` for selection
4. Simplified `DynamicTileContent` to show only titles
5. New Chat component hierarchy parallel to existing controls

### Technical Constraints

1. **Performance**: Must handle hundreds of tiles efficiently
2. **State Management**: Chat state should integrate with existing providers
3. **Layout**: Must accommodate existing fixed-position controls
4. **Mobile**: Should gracefully adapt to small screens
5. **Tool Integration**: Selection behavior must work with tool system
6. **Offline Support**: Chat should work with cached data

## Solution

### Approach 1: Resizable Split Panel (Recommended)

**Implementation**: Create a vertical split layout with map on left, chat on right
- Add `ChatPanel` component with message-based interface
- Implement resizable splitter using CSS resize or react-resizable-panels
- Add chat state to MapCacheProvider for conversation management
- Modify main layout to use flexbox/grid split

**Components**:
- `/src/app/map/Chat/ChatPanel.tsx` - New chat component
- `/src/app/map/page.tsx` - Update layout structure
- `/src/lib/domains/map/contexts/MapCacheContext.tsx` - Add chat state

**Note**: See `/CHAT.md` for detailed design philosophy and vision

**Pros**:
- Maximum preview space as requested
- Familiar split-pane UI pattern
- Both map and preview always visible
- Resizable for user preference

**Cons**:
- Reduces map canvas space
- Complex responsive behavior on mobile
- Requires layout restructuring

### Approach 2: Overlay Drawer Panel

**Implementation**: Floating panel that slides in from right
- Preview panel overlays map content
- Toggle button or tile selection opens panel
- Semi-transparent background option
- Fixed or percentage width

**Components**:
- `/src/app/map/Preview/PreviewDrawer.tsx` - Drawer component
- `/src/app/map/Controls/PreviewToggle.tsx` - Toggle button
- Minimal changes to existing layout

**Pros**:
- Preserves full map space when closed
- Easier mobile adaptation
- Less intrusive to current layout
- Smooth transition animations

**Cons**:
- Covers map content when open
- Not always visible
- Less screen real estate for preview

### Approach 3: Bottom Sheet Panel

**Implementation**: Slide-up panel from bottom of screen
- Adjustable height with drag handle
- Collapsible to show just title bar
- Map canvas adjusts height dynamically

**Components**:
- `/src/app/map/Preview/BottomSheet.tsx` - Sheet component
- Update canvas height calculations

**Pros**:
- Works well on mobile (familiar pattern)
- Adjustable preview size
- Map stays visible above

**Cons**:
- Less natural for desktop reading
- Horizontal space underutilized
- May feel cramped

### Recommended Solution: Approach 1 with Progressive Enhancement

**Phase 1**: Chat Foundation
1. Add ChatPanel component with message-based interface
2. Implement basic 60/40 split layout
3. Add chat state management with conversation history
4. Simplify tile display to show only titles
5. Display tile content as preview widget in chat flow

**Phase 2**: Enhanced Interaction
1. Add resizable splitter
2. Implement panel collapse/expand
3. Add initial system messages and guidance
4. Optimize responsive behavior

**Phase 3**: AI Integration Preparation
1. Structure for multiple message types
2. Widget system for rich interactions
3. Foundation for persona switching
4. Mobile optimization with overlay mode

### Technical Details

**State Management**:
```typescript
// In MapCacheContext
interface ChatState {
  selectedTileId: string | null;
  messages: ChatMessage[];
  isPanelOpen: boolean;
  panelWidth: number;
}

interface ChatMessage {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string | ChatWidget;
  metadata?: {
    tileId?: string;
    timestamp: Date;
  };
}
```

**Layout Structure**:
```tsx
<div className="flex h-screen">
  <Toolbox />
  <div className="flex-1 flex">
    <MapCanvas className="flex-1" />
    <ChatPanel className="w-[40%]" />
  </div>
  <ParentHierarchy />
</div>
```

**Tile Simplification**:
- Modify `DynamicTileContent` to show only title at all scales
- Remove description and URL from tile display
- Add visual indicator for selected tile

### Next Steps
1. Create PreviewPanel component structure
2. Implement selection state management
3. Update tile content display
4. Adjust layout components
5. Add responsive breakpoints