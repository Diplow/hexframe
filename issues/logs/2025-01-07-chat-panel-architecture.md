# Chat Panel Technical Architecture

**Date**: 2025-01-07
**Issue**: #65 - Chat Panel for System Interaction
**Status**: Architecture Documentation

## Executive Summary

This document defines the technical architecture for transforming Hexframe's tile preview functionality into a comprehensive chat-based system interface. The chat panel represents a fundamental shift from passive content viewing to active system interaction, laying the groundwork for AI-powered conversations with tiles and systems.

## Current Architecture Analysis

### Component Structure

The map application follows a clear hierarchical pattern with providers wrapping the component tree:

```
MapPage
├── TileActionsProvider (Tool management)
│   └── ToolStateManager (Keyboard & cursor)
│       └── MapContent (Event wrapper)
│           └── MapCacheProvider (Data state)
│               ├── DynamicMapCanvas
│               ├── ParentHierarchy
│               └── MapControls
│           ├── Toolbox
│           └── OfflineIndicator
```

### State Management Architecture

#### MapCacheProvider
The central data management system using React Context + useReducer pattern:

**Core State**:
- `itemsById`: Map of coordinate IDs to tile data
- `regionMetadata`: Hierarchical loading metadata
- `currentCenter`: Active map center coordinate
- `expandedItemIds`: Array of expanded tile IDs
- Loading states, error handling, cache configuration

**Key Services**:
- `dataOperations`: Loading and cache management
- `mutationOperations`: CRUD operations with optimistic updates
- `navigationOperations`: Map navigation and history
- `syncOperations`: Background data synchronization

#### TileActionsProvider
Tool-based interaction system:

**State**:
- `activeTool`: Current tool (expand, navigate, create, edit, delete, drag)
- `disabledTools`: Set of disabled tool IDs
- Tool-specific click handlers

**Notable**: The 'select' tool exists in the type system but is not exposed in the UI, making it perfect for chat selection.

### Layout System

Current layout uses nested flex containers:
- Fixed left Toolbox (64px closed, 192px open)
- Flexible center MapCanvas
- Fixed right ParentHierarchy
- Overlaid MapControls

## New Chat Panel Architecture

### Architectural Decisions

1. **Extend vs Create**: Extend MapCacheProvider rather than creating new context
2. **Split vs Overlay**: Resizable split panel for maximum visibility
3. **Message-Based**: Structure as conversation from day one
4. **Widget System**: Extensible message types beyond text

### Extended State Structure

```typescript
// Extended MapCache state
interface ChatState {
  selectedTileId: string | null;
  messages: ChatMessage[];
  isPanelOpen: boolean;
  panelWidth: number; // Stored as percentage
  // Future additions commented for clarity:
  // activePersona?: 'explorer' | 'architect';
  // conversationMode?: 'preview' | 'chat' | 'compose';
  // userContext?: UserSystemContext;
}

interface ChatMessage {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string | ChatWidget;
  metadata?: {
    tileId?: string;
    timestamp: Date;
    persona?: string;
  };
}

// Widget system for rich interactions
type ChatWidget = 
  | PreviewWidget
  | SearchWidget
  | ComparisonWidget
  | ActionWidget;

interface PreviewWidget {
  type: 'preview';
  tileId: string;
  title: string;
  content: string; // Markdown
  systemContext?: {
    parentTile?: string;
    childTiles?: string[];
    relatedSystems?: string[];
  };
}
```

### Component Architecture

```
MapPage (Modified)
└── Providers (unchanged)
    └── MapCacheProvider (extended)
        └── SplitLayout (NEW)
            ├── MapSection (flex-1)
            │   ├── Toolbox
            │   ├── DynamicMapCanvas
            │   └── ParentHierarchy
            └── ChatPanel (40% default)
                ├── ChatHeader
                │   ├── Title
                │   ├── ResizeHandle
                │   └── CloseButton
                ├── ChatMessages
                │   ├── MessageList
                │   └── WidgetRenderer
                └── ChatFooter (future)
                    └── ChatInput
```

### Layout Implementation

```tsx
// New layout structure in page.tsx
<div className="relative h-full w-full">
  <div className="flex h-full">
    {/* Map Section */}
    <div className="relative flex flex-1 min-w-0">
      <Toolbox />
      <div className="flex-1 flex flex-col">
        <DynamicMapCanvas />
        <MapControls />
      </div>
      <ParentHierarchy />
    </div>
    
    {/* Resizable Divider */}
    <ResizableDivider 
      onResize={(width) => dispatch({ type: 'RESIZE_CHAT', payload: width })}
    />
    
    {/* Chat Panel */}
    {chatState.isPanelOpen && (
      <ChatPanel className="h-full" style={{ width: `${chatState.panelWidth}%` }} />
    )}
  </div>
  
  <OfflineIndicator />
</div>
```

### State Flow Architecture

```
1. Tool Selection Flow:
   User → Toolbox → Select 'select' tool → Update TileActionsProvider

2. Tile Selection Flow:
   User clicks tile → TileActionsProvider.onSelectClick → 
   MapCache dispatch SELECT_TILE → Update chatState → 
   Add preview message → Render in ChatPanel

3. Message Management Flow:
   New message → Dispatch ADD_MESSAGE → Update messages array →
   Scroll to bottom → Persist to localStorage (optional)

4. Panel State Flow:
   Resize handle drag → Calculate percentage → Dispatch RESIZE_CHAT →
   Update panelWidth → CSS reflow → Persist preference
```

### Integration Points

#### 1. Tool System Integration

Enable the hidden 'select' tool:
```typescript
// In Toolbox TOOLS array
{ id: 'select', label: 'Select', icon: MousePointer, shortcut: 'S', color: 'blue' }

// In TileActionsProvider
case 'select':
  dispatch({ 
    type: 'SELECT_TILE_FOR_CHAT', 
    payload: tileData.metadata.coordId 
  });
  break;
```

#### 2. Tile Display Simplification

```typescript
// Simplified DynamicTileContent
export const DynamicTileContent = ({ data, scale, isSelected, depth }) => {
  const textColor = getTextColorForDepth(depth);
  
  return (
    <div className={cn(
      "flex h-full w-full items-center justify-center px-4",
      isSelected && "ring-2 ring-primary ring-offset-2"
    )}>
      <h3 className={cn(
        "text-center font-medium truncate",
        textColor,
        scale === 1 ? "text-xs" : scale === 2 ? "text-sm" : "text-base"
      )}>
        {data.title || 'Untitled'}
      </h3>
    </div>
  );
};
```

#### 3. Cache Reducer Extensions

```typescript
// New action types
const CHAT_ACTIONS = {
  SELECT_TILE_FOR_CHAT: "SELECT_TILE_FOR_CHAT",
  ADD_CHAT_MESSAGE: "ADD_CHAT_MESSAGE",
  CLEAR_CHAT: "CLEAR_CHAT",
  TOGGLE_CHAT_PANEL: "TOGGLE_CHAT_PANEL",
  RESIZE_CHAT: "RESIZE_CHAT",
} as const;

// Reducer case handlers
case CHAT_ACTIONS.SELECT_TILE_FOR_CHAT:
  const tile = state.itemsById[action.payload];
  if (!tile) return state;
  
  const previewMessage: ChatMessage = {
    id: generateId(),
    type: 'system',
    content: {
      type: 'preview',
      tileId: action.payload,
      title: tile.data.name || 'Untitled',
      content: tile.data.description || '',
    },
    metadata: {
      tileId: action.payload,
      timestamp: new Date(),
    },
  };
  
  return {
    ...state,
    chatState: {
      ...state.chatState,
      selectedTileId: action.payload,
      messages: [...state.chatState.messages, previewMessage],
      isPanelOpen: true,
    },
  };
```

## Mental Model & Design Philosophy

### Core Concepts

1. **Chat as Primary Interface**
   - Not a sidebar or preview panel
   - The main way users interact with systems
   - Conversation builds understanding

2. **Progressive Disclosure**
   - Start with simple tile preview
   - Add context about relationships
   - Evolve to full system interaction
   - Future: AI-powered conversations

3. **Widget-Based Extensibility**
   - Messages aren't just text
   - Rich interactions through widgets
   - Pluggable widget types
   - Future widgets emerge from needs

4. **Spatial-Conversational Bridge**
   - Map shows "where" (spatial relationships)
   - Chat shows "what" and "why" (meaning)
   - Together: Complete system understanding

### Information Architecture

```
Tile Selection → Preview Widget → System Context → Interaction Options

Example Flow:
1. User selects "Goal Clarification" tile
2. Preview widget shows tile content
3. System adds context: "Part of Planning System with 3 subtasks"
4. Future: Options to explore, modify, or chat with the system
```

### Design Patterns

1. **Conversation History as Context**
   ```
   - Selected "Project Planning"
   - Selected "Goal Clarification" 
   - Pattern detected: Exploring planning systems
   - Future: Suggest related systems
   ```

2. **Widget Registry Pattern**
   ```typescript
   const widgetRegistry = {
     preview: PreviewWidget,
     search: SearchWidget,
     comparison: ComparisonWidget,
   };
   
   function renderWidget(widget: ChatWidget) {
     const Component = widgetRegistry[widget.type];
     return <Component {...widget} />;
   }
   ```

3. **Progressive Enhancement Structure**
   - Static: Render markdown content
   - Enhanced: Add interactions
   - Future: Stream AI responses
   - All using same message structure

## Implementation Roadmap

### Phase 1: Foundation (Current Task)
- [x] Architecture documentation
- [ ] Create Chat component structure
- [ ] Extend MapCache state
- [ ] Implement split layout
- [ ] Enable select tool
- [ ] Basic message display

### Phase 2: Core Features
- [ ] Tile selection flow
- [ ] Preview widget rendering
- [ ] Message history
- [ ] Panel resize/collapse
- [ ] Preference persistence
- [ ] Keyboard shortcuts

### Phase 3: Polish
- [ ] Smooth animations
- [ ] Mobile responsive
- [ ] Accessibility (ARIA)
- [ ] Error boundaries
- [ ] Loading states
- [ ] Empty states

### Phase 4: Enhanced Interactions (Future)
- [ ] System context display
- [ ] Related tiles suggestions
- [ ] Search widget
- [ ] Comparison widget
- [ ] Basic AI responses

## Technical Considerations

### Performance
- Virtual scrolling for long conversations
- Memoized widget rendering
- Debounced resize handling
- Lazy widget loading

### State Persistence
- Panel width to localStorage
- Conversation history (optional)
- Selected tile highlighting
- Tool preference

### Mobile Adaptation
- Full-screen overlay on mobile
- Swipe to dismiss
- Bottom sheet alternative
- Touch-optimized widgets

### Accessibility
- Keyboard navigation between messages
- Screen reader announcements
- Focus management
- High contrast support

## Success Metrics

1. **User Experience**
   - Seamless tile selection
   - Smooth panel interactions
   - Clear visual feedback
   - Intuitive widget display

2. **Developer Experience**
   - Clear component boundaries
   - Easy to add new widgets
   - Testable architecture
   - Documented patterns

3. **System Extensibility**
   - Ready for AI integration
   - Supports new message types
   - Handles future personas
   - Scales with features

## Conclusion

The Chat Panel architecture transforms Hexframe from a mapping tool to a system interaction platform. By building on existing patterns (providers, reducers, components) while introducing new concepts (messages, widgets, conversations), we create a foundation that's both familiar to developers and revolutionary for users.

The key insight: We're not building a preview panel that might become chat. We're building a chat system that starts with preview functionality. This mindset shift ensures every architectural decision supports the ultimate vision of conversational system interaction.