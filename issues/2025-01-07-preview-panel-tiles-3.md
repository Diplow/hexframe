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
2. Implement layout with chat taking maximum available space
3. Add chat state management with conversation history (no persistence yet)
4. Simplify tile display to show only titles
5. Display tile content as preview widget in chat flow
6. Desktop-only focus for initial implementation

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

### Technical Architecture

#### Current Architecture

**Component Hierarchy**:
```
MapPage (page.tsx)
├── TileActionsProvider (tool state management)
│   └── ToolStateManager (keyboard shortcuts, cursor)
│       └── MapContent (wrapper for keyboard & cursor)
│           └── MapCacheProvider (data state management)
│               ├── DynamicMapCanvas (center area)
│               │   ├── CanvasThemeContext
│               │   ├── LegacyTileActionsContext (drag/drop)
│               │   └── DynamicFrame → ItemTile → DynamicTileContent
│               ├── ParentHierarchy (right side)
│               └── MapControls (additional controls)
│           └── Toolbox (left side, fixed position)
│           └── OfflineIndicator
```

**State Management**:
- **MapCacheProvider**: Centralized data cache with region-based loading
  - `itemsById`: Tile data indexed by coordinate ID
  - `regionMetadata`: Loading state for hierarchical regions
  - `currentCenter`, `expandedItemIds`: Navigation state
  - Handles server sync, mutations, offline mode

- **TileActionsProvider**: Tool-based interaction system
  - `activeTool`: Current tool (expand, navigate, create, edit, delete, drag)
  - `setActiveTool`: Tool switching (persisted to localStorage)
  - Tool-specific click handlers dispatched by active tool
  - Note: 'select' tool exists but not in UI (reserved for future use)

**Layout Structure**:
```tsx
// Current layout in page.tsx
<div className="relative flex h-full w-full flex-col">
  <TileActionsProvider>
    <ToolStateManager>
      <MapContent>
        <MapCacheProvider>
          <DynamicMapCanvas /> // Main map area
          <ParentHierarchy />  // Right side hierarchy
          <MapControls />      // Additional controls
        </MapCacheProvider>
        <Toolbox />           // Left side toolbox
        <OfflineIndicator />  // Status indicator
      </MapContent>
    </ToolStateManager>
  </TileActionsProvider>
</div>
```

**Tile Content Display** (DynamicTileContent):
- Scale 1: Title only (truncated to 25 chars)
- Scale 2: Title + truncated description (200 chars), full on hover
- Scale 3+: Full markdown content with scrolling

#### New Architecture for Chat Panel

**Component Hierarchy (Updated)**:
```
MapPage (page.tsx)
├── TileActionsProvider (extended with 'select' tool)
│   └── ToolStateManager
│       └── MapContent
│           └── MapCacheProvider (data only - no UI state)
│               └── ChatProvider (NEW - separate chat state)
│                   └── FlexLayout (NEW)
│                       ├── LeftSection (fixed)
│                       │   └── Toolbox
│                       ├── CenterSection (min-width for scale 3 tile)
│                       │   └── DynamicMapCanvas
│                       ├── RightSection (fixed)
│                       │   └── ParentHierarchy
│                       └── ChatPanel (NEW - takes remaining space)
│                           ├── ChatHeader
│                           ├── ChatMessages
│                           │   ├── SystemMessage
│                           │   └── PreviewWidget
│                           └── ChatInput (future)
```

**Separate Chat State (ChatProvider)**:
```typescript
// New ChatProvider - separate from MapCacheProvider
interface ChatState {
  selectedTileId: string | null;
  messages: ChatMessage[];
  isPanelOpen: boolean;
  // No persistence in Phase 1 - stored in memory only
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

interface ChatWidget {
  type: 'preview' | 'search' | 'comparison' | 'action';
  data: any; // Widget-specific data
}

// MapCacheProvider remains focused on data only
// UI state separation can be addressed in future refactoring
```

**Layout Changes**:
```tsx
// New flex layout structure - desktop only
<div className="relative flex h-full w-full">
  <TileActionsProvider>
    <ToolStateManager>
      <MapContent>
        <MapCacheProvider>
          <ChatProvider>
            <div className="flex h-full w-full">
              {/* Fixed Left: Toolbox */}
              <Toolbox className="flex-shrink-0" />
              
              {/* Min-width Center: Canvas (scale 3 tile) */}
              <div className="flex-shrink-0" style={{ minWidth: '400px' }}>
                <DynamicMapCanvas />
                <MapControls />
              </div>
              
              {/* Fixed Right: Hierarchy */}
              <ParentHierarchy className="flex-shrink-0" />
              
              {/* Flexible: Chat takes remaining space */}
              {chatState.isPanelOpen && (
                <ChatPanel className="flex-1 border-l overflow-hidden" />
              )}
            </div>
            
            <OfflineIndicator />
          </ChatProvider>
        </MapCacheProvider>
      </MapContent>
    </ToolStateManager>
  </TileActionsProvider>
</div>
```

**Tool System Integration**:
1. Enable 'select' tool in Toolbox UI
2. Add select handler to TileActionsProvider:
   ```typescript
   onSelectClick: (tileData: TileData) => {
     dispatch({ 
       type: 'SELECT_TILE_FOR_CHAT', 
       payload: tileData.metadata.coordId 
     });
   }
   ```
3. Update tile visual state for selected tiles

**Simplified Tile Display**:
```typescript
// Modified DynamicTileContent
export const DynamicTileContent = ({ data, scale, tileId, isSelected }) => {
  // Always show only title, regardless of scale
  return (
    <div className={cn(
      "flex h-full w-full items-center justify-center px-4",
      isSelected && "ring-2 ring-primary"
    )}>
      <h3 className="text-center font-medium truncate">
        {data.title || 'Untitled'}
      </h3>
    </div>
  );
};
```

**Chat Panel Architecture**:
```typescript
// /src/app/map/Chat/ChatPanel.tsx
export function ChatPanel({ className }: { className?: string }) {
  const { selectedTileId, messages, dispatch } = useChat();
  const { itemsById } = useMapCache(); // Read tile data
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ChatHeader 
        onClose={() => dispatch({ type: 'CLOSE_CHAT' })}
      />
      
      <ChatMessages messages={messages} />
      
      {/* Future: ChatInput for interactive mode */}
    </div>
  );
}

// /src/app/map/Chat/ChatMessages.tsx
export function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <SystemMessage>
          Welcome to Hexframe! Select a tile to explore its content.
        </SystemMessage>
      )}
      
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}

// /src/app/map/Chat/Widgets/PreviewWidget.tsx
export function PreviewWidget({ tileId, content, title }: PreviewWidgetProps) {
  return (
    <Card className="max-w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactMarkdown className="prose prose-sm max-w-none">
          {content}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
}
```

### Mental Model

**Chat as System Interface**:
1. **Not just preview**: Chat is the primary interface for system interaction
2. **Conversation history**: Builds context as users explore tiles
3. **Widget-based**: Rich interactions beyond text (previews, searches, actions)
4. **Progressive**: Start with preview, evolve to full AI interaction

**State Flow**:
```
User clicks tile → 
TileActionsProvider (select tool) → 
ChatProvider dispatch → 
Add preview message → 
Render in ChatPanel
(MapCache provides tile data via hook)
```

**Design Constraints**:
- Desktop-only for Phase 1 (no mobile optimization)
- No persistence (messages lost on refresh)
- Chat takes maximum available screen space
- Fixed toolbox, minimum canvas, fixed hierarchy

**Future Extensibility**:
- Message types ready for AI responses
- Widget system supports rich interactions
- State structure supports personas and modes
- Persistence can be added later
- Mobile layout can be addressed separately

### Key Implementation Patterns

**1. Provider-Based State Management**
- Create separate ChatProvider for chat state (not extending MapCache)
- MapCacheProvider remains focused on data only
- Clear separation of concerns: data vs UI state
- ChatProvider reads from MapCache when needed

**2. Component Composition**
- ChatPanel composed of smaller, focused components
- Widgets as pluggable message types
- Reusable message components for different types

**3. Type-Safe Interfaces**
```typescript
// Discriminated unions for messages
type ChatMessage = 
  | { type: 'system'; content: string; ... }
  | { type: 'preview'; widget: PreviewWidget; ... }
  | { type: 'user'; content: string; ... }
  | { type: 'assistant'; content: string; ... };

// Type-safe widget system
interface WidgetRegistry {
  preview: PreviewWidget;
  search: SearchWidget;
  comparison: ComparisonWidget;
}
```

**4. Progressive Enhancement Ready**
- Static content display works without JS
- Chat messages structured for future streaming
- Widget system supports dynamic loading
- Layout supports mobile adaptation

### Implementation Steps

1. **Phase 1: Foundation**
   - Create Chat component structure
   - Extend MapCache with chat state
   - Implement basic split layout
   - Add 'select' tool to UI

2. **Phase 2: Core Features**
   - Tile selection and preview display
   - Message history management
   - Resizable panel with persistence
   - Simplified tile display

3. **Phase 3: Polish**
   - Smooth animations
   - Mobile responsive design
   - Keyboard navigation
   - Accessibility features

### Next Steps
1. Create Chat component structure in `/src/app/map/Chat/`
2. Extend MapCache state with chat properties
3. Update page.tsx layout to split view
4. Enable 'select' tool in Toolbox
5. Simplify DynamicTileContent to show only titles
6. Implement tile selection flow
7. Add preview widget for tile content

## Tests

### Unit Tests

#### ChatProvider Tests (`/src/app/map/Chat/__tests__/ChatProvider.test.tsx`)
```typescript
describe('ChatProvider', () => {
  it('should initialize with empty message state');
  it('should handle SELECT_TILE action and add preview message');
  it('should handle CLOSE_CHAT action');
  it('should maintain message history across tile selections');
  it('should generate unique message IDs');
  it('should clear messages on provider unmount (no persistence)');
});
```

#### ChatPanel Tests (`/src/app/map/Chat/__tests__/ChatPanel.test.tsx`)
```typescript
describe('ChatPanel', () => {
  it('should render chat header with close button');
  it('should display welcome message when no messages');
  it('should render messages in chronological order');
  it('should apply correct layout classes for desktop');
  it('should handle overflow with scrollable message area');
  it('should pass close action to header');
});
```

#### ChatMessages Tests (`/src/app/map/Chat/__tests__/ChatMessages.test.tsx`)
```typescript
describe('ChatMessages', () => {
  it('should render empty state with welcome message');
  it('should render system messages with correct styling');
  it('should render preview widgets for tile content');
  it('should maintain scroll position when new messages added');
  it('should apply correct spacing between messages');
});
```

#### PreviewWidget Tests (`/src/app/map/Chat/Widgets/__tests__/PreviewWidget.test.tsx`)
```typescript
describe('PreviewWidget', () => {
  it('should render tile title in card header');
  it('should render markdown content with proper formatting');
  it('should handle empty content gracefully');
  it('should apply max-width constraints');
  it('should render links as clickable');
  it('should escape dangerous HTML in markdown');
});
```

#### Simplified Tile Display Tests (`/src/app/map/Tile/Item/__tests__/content.test.tsx`)
```typescript
describe('DynamicTileContent - Simplified', () => {
  it('should only display title regardless of scale');
  it('should truncate long titles appropriately');
  it('should show "Untitled" for tiles without title');
  it('should apply selected state ring when selected');
  it('should center title text in tile');
  it('should not show description or URL at any scale');
});
```

### Integration Tests

#### Chat-Map Integration (`/src/app/map/__tests__/chat-integration.test.tsx`)
```typescript
describe('Chat-Map Integration', () => {
  it('should open chat panel when select tool is active and tile clicked');
  it('should update chat with preview when different tile selected');
  it('should highlight selected tile on map');
  it('should access tile data from MapCache in chat');
  it('should maintain chat state when switching tools');
  it('should clear tile selection when chat closed');
});
```

#### Layout Integration (`/src/app/map/__tests__/layout-integration.test.tsx`)
```typescript
describe('Layout with Chat Panel', () => {
  it('should render toolbox, canvas, hierarchy, and chat in correct order');
  it('should give chat panel flex-1 to take remaining space');
  it('should maintain minimum width for canvas (400px)');
  it('should keep toolbox and hierarchy at fixed widths');
  it('should hide chat panel when isPanelOpen is false');
  it('should apply correct border between map and chat');
});
```

#### Provider Integration (`/src/app/map/__tests__/provider-integration.test.tsx`)
```typescript
describe('Provider Integration', () => {
  it('should nest ChatProvider inside MapCacheProvider');
  it('should allow ChatPanel to read MapCache data');
  it('should keep chat state separate from map data state');
  it('should not persist chat messages on refresh');
  it('should dispatch chat actions through ChatProvider');
});
```

### E2E Tests

#### Basic Chat Workflow (`/e2e/chat/basic-workflow.spec.ts`)
```typescript
test.describe('Chat Panel - Basic Workflow', () => {
  test('should show chat panel when selecting tiles', async ({ page }) => {
    // Navigate to map
    // Click select tool in toolbox
    // Verify chat panel not visible initially
    // Click a tile
    // Verify chat panel appears
    // Verify welcome message shown
    // Verify tile content displayed as preview widget
    // Click another tile
    // Verify both previews in chat history
    // Close chat panel
    // Verify chat panel hidden
  });
});
```

#### Desktop Layout (`/e2e/chat/desktop-layout.spec.ts`)
```typescript
test.describe('Chat Panel - Desktop Layout', () => {
  test('should allocate space correctly on desktop', async ({ page }) => {
    // Set desktop viewport (1920x1080)
    // Open chat panel
    // Measure toolbox width (fixed)
    // Measure canvas width (>= 400px)
    // Measure hierarchy width (fixed)
    // Measure chat width (remaining space)
    // Verify no horizontal scroll
    // Verify chat takes maximum available width
  });
});
```

#### Conversation History (`/e2e/chat/conversation-history.spec.ts`)
```typescript
test.describe('Chat Panel - Conversation History', () => {
  test('should build conversation as user explores', async ({ page }) => {
    // Select first tile
    // Verify preview appears with timestamp
    // Select second tile
    // Verify both previews visible in order
    // Scroll to top of chat
    // Verify first message still visible
    // Select multiple tiles quickly
    // Verify all selections recorded
    // Refresh page
    // Verify chat history cleared (no persistence)
  });
});
```

#### Tile Selection Visual Feedback (`/e2e/chat/selection-feedback.spec.ts`)
```typescript
test.describe('Tile Selection - Visual Feedback', () => {
  test('should highlight selected tile', async ({ page }) => {
    // Activate select tool
    // Click tile
    // Verify tile has selection ring
    // Click different tile
    // Verify previous tile ring removed
    // Verify new tile has ring
    // Close chat
    // Verify selection ring removed
  });
});
```

### Performance Tests

#### Message Rendering Performance
```typescript
describe('Chat Performance', () => {
  it('should handle 100+ messages without lag');
  it('should virtualize long message lists');
  it('should not re-render unchanged messages');
  it('should debounce rapid tile selections');
});
```

### Accessibility Tests

#### Keyboard Navigation
```typescript
describe('Chat Accessibility', () => {
  it('should support keyboard navigation to chat panel');
  it('should trap focus within chat when open');
  it('should announce new messages to screen readers');
  it('should provide ARIA labels for all interactive elements');
  it('should support Escape key to close chat');
});
```

### Visual Regression Tests

#### Chat Component Snapshots
- ChatPanel in empty state
- ChatPanel with messages
- PreviewWidget with various content types
- System messages styling
- Selected tile visual state

### Test Implementation Notes

1. **Mock Requirements**:
   - Mock MapCacheProvider for isolated tests
   - Mock markdown rendering for unit tests
   - Mock tile data for consistent testing

2. **Test Data**:
   - Create fixture tiles with various content types
   - Include edge cases (empty content, very long titles)
   - Test with different markdown features

3. **Coverage Goals**:
   - 90%+ coverage for new Chat components
   - Integration tests for all user workflows
   - E2E tests for critical paths

4. **Desktop-Only Focus**:
   - Skip mobile viewport tests in Phase 1
   - Document mobile tests for future phases
   - Focus on desktop layout scenarios