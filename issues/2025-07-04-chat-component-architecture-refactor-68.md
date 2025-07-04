# Issue: Chat Component Architecture Refactor

**Date**: 2025-07-04
**Status**: Open
**Tags**: #refactor #architecture #tech #chat #medium
**GitHub Issue**: #68
**Branch**: issue-68-chat-component-architecture-refactor

## Problem Statement
The new chat component has been vibe coded and needs architectural organization and structure. The current implementation lacks clear separation of concerns and consistent patterns, making it difficult to maintain and extend.

## User Impact
- Developers working on the chat feature may face confusion due to unclear code organization
- Future feature additions to chat will be harder to implement without clear architecture
- Potential for bugs due to unclear data flow and component responsibilities
- Code review and onboarding new developers becomes more challenging

## Steps to Reproduce
1. Open the chat component source files in `/src/app/map/Chat/`
2. Review the current implementation structure
3. Notice lack of clear architectural patterns and organization

## Environment
- Development environment
- All developers working on the codebase
- Frequency: Ongoing concern for maintainability

## Related Issues
- Issue #67 (remove toolbox contextual interactions) - may have introduced new patterns that should be considered

## Solution

*I am an AI assistant acting on behalf of @Diplow*

### Approach: Frontend-First Chat Architecture

The solution focuses on organizing the chat component using React patterns and frontend best practices, avoiding unnecessary backend concepts while achieving clear separation of concerns.

**Key Principles**:
1. Use React patterns (hooks, context, reducers) appropriately
2. Separate UI components from business logic using custom hooks
3. Create clear boundaries between chat and map operations
4. Implement composable widget system
5. Follow the Rule of 6 for code organization

### Implementation Strategy

1. **Reorganize State Management**
   - Split the monolithic reducer into focused reducers
   - Create custom hooks for chat operations (useChatMessages, useChatWidgets)
   - Keep ChatProvider focused on state distribution
   - Separate UI state from business state

2. **Extract Business Logic to Hooks**
   - `useChatOperations`: Handle message sending, widget management
   - `useMapIntegration`: Bridge between chat and map operations
   - `useWidgetHandlers`: Widget-specific business logic
   - Keep hooks composable and testable

3. **Implement Composable Widget System**
   - Create widget components with clear props interfaces
   - Use composition instead of registry pattern
   - Define widget lifecycle through React effects
   - Keep widgets decoupled from chat internals

4. **Decouple from Map Operations**
   - Pass callbacks as props instead of direct imports
   - Use custom events for cross-component communication
   - Create clear interfaces at component boundaries
   - Move map-specific logic to map-specific hooks

5. **Organize Components**
   - Split large files following Rule of 6
   - Extract inline components to separate files
   - Group related components in folders
   - Add README documentation for each major section

## Architecture

*I am an AI assistant acting on behalf of @Diplow*

### Current State

The chat component currently exists as a monolithic React component system with:
- All logic contained within `/src/app/map/Chat/` directory
- Mixed concerns between UI, state management, and business logic
- Direct coupling to map operations through imports
- No clear architectural hierarchy or boundaries
- 23 action types managed in a single reducer
- Widgets directly importing and using map mutations

### Core Mental Model

**Canvas as Core System, Chat as Interface Layer**

This architecture treats the Canvas as the primary system that handles all spatial logic and tile operations, while the Chat serves as a conversational interface layer to access Canvas functionality. Widgets act as UI adapters that expose specific Canvas operations in a chat-friendly format.

```
MapCache (tile data source)
    ↓
Canvas (spatial UI, coordinate system, core operations)
    ↓ (exposes operations via callbacks)
Chat (conversational interface layer)
    ↓ (renders operations as widgets)
Widgets (UI adapters for canvas operations)
```

### New Architecture

#### 1. Chat Cache System (`/src/app/map/Chat/_cache/`)

Event-driven state management for chat:

```
/src/app/map/Chat/_cache/
├── ChatCacheProvider.tsx        # State management for chat
├── use-chat-cache.ts           # Hook to access chat state
├── _events/
│   ├── event.types.ts          # ChatEvent interfaces
│   ├── event.creators.ts       # Event factory functions
│   └── event.handlers.ts       # Event → State transformations
├── _reducers/
│   ├── events.reducer.ts       # Event log management
│   ├── ui.reducer.ts           # Derived UI state
│   └── session.reducer.ts      # Chat session state
└── _selectors/
    ├── message.selectors.ts    # Derive messages from events
    └── widget.selectors.ts     # Derive active widgets from events
```

**Event-Driven Architecture:**

```typescript
// Events are the source of truth
interface ChatEvent {
  id: string;
  type: 'user_message' | 'system_message' | 'tile_selected' | 
        'navigation' | 'operation_started' | 'operation_completed' |
        'auth_required' | 'error_occurred';
  payload: unknown;
  timestamp: Date;
  actor: 'user' | 'system' | 'assistant';
}

// UI state is derived from events
interface ChatUIState {
  events: ChatEvent[];          // The immutable log
  activeWidgets: Widget[];      // Computed from events
  visibleMessages: Message[];   // Computed from events
}
```

#### 2. Widget System (`/src/app/map/Chat/_widgets/`)

Widgets using composition pattern for different capabilities:

```
/src/app/map/Chat/_widgets/
├── _base/
│   ├── WidgetContainer.tsx     # Common widget wrapper
│   └── widget.types.ts         # Base and capability interfaces
├── _capabilities/              # Composable widget behaviors
│   ├── canvas.types.ts         # Canvas operation props
│   ├── auth.types.ts           # Authentication props
│   ├── chat.types.ts           # Chat interaction props
│   └── confirmation.types.ts   # Confirmation props
├── PreviewWidget/              # Base + Canvas capabilities
│   ├── PreviewWidget.tsx
│   └── usePreviewHandlers.ts
├── LoginWidget/                # Base + Auth capabilities
├── DeleteWidget/               # Base + Canvas + Confirmation
└── ...other widgets
```

**Widget Standardization Through Composition:**

All widgets share a base interface for lifecycle and state:
```typescript
interface BaseWidgetProps {
  id: string;
  onClose?: () => void;
  isExpanded?: boolean;
  isLoading?: boolean;
  error?: { message: string };
  timestamp?: Date;
  priority?: 'info' | 'action' | 'critical';
}
```

Widgets compose additional capabilities as needed:
- **Canvas widgets**: Add `CanvasOperationProps` for tile operations
- **Auth widgets**: Add `AuthenticationProps` for login/logout
- **Confirmation widgets**: Add `ConfirmationProps` for user decisions
- **Future AI widgets**: Could add `ChatInteractionProps` for conversation

#### 3. Chat UI Components (Refactored)

```
/src/app/map/Chat/
├── README.md                   # Architecture documentation
├── _components/
│   ├── ChatHeader/
│   ├── ChatMessageList/
│   ├── ChatMessageItem/
│   └── ChatInputBar/
├── _hooks/
│   ├── use-canvas-operations.ts # Bridge to canvas callbacks
│   ├── use-chat-api.ts         # Future backend integration
│   └── use-widget-lifecycle.ts  # Widget management
├── ChatPanel.tsx               # Main container
└── types.ts                    # Chat-specific types
```

### Data Flow Architecture

**1. Event Flow (Actions → Events → UI)**
```
User Action → Create Event → Append to Event Log → UI Derives State
Canvas Action → Create Event → Append to Event Log → UI Derives State
System Action → Create Event → Append to Event Log → UI Derives State
```

**2. Event to UI Derivation**
```typescript
// Example: Tile selection flow
1. User clicks tile → Canvas callback
2. Chat creates event: { type: 'tile_selected', payload: { tileId, tileData } }
3. Event appended to log
4. Selectors derive:
   - Message: "Viewing [Tile Name]"
   - Widget: PreviewWidget with tile data
   
// Example: Operation flow  
1. User clicks "Delete" in widget
2. Chat creates event: { type: 'operation_started', payload: { op: 'delete', tileId } }
3. Widget shows loading state
4. Canvas performs deletion
5. Chat creates event: { type: 'operation_completed', payload: { op: 'delete', tileId } }
6. Selectors remove widget and add success message
```

**3. Message vs Widget Distinction**
- **Messages**: Derived from events that represent communication (user_message, system_message)
- **Widgets**: Derived from events that require user interaction (tile_selected, auth_required, operation_started)

```typescript
// Selectors determine what to show
function deriveVisibleMessages(events: ChatEvent[]): Message[] {
  return events
    .filter(e => ['user_message', 'system_message', 'operation_completed'].includes(e.type))
    .map(eventToMessage);
}

function deriveActiveWidgets(events: ChatEvent[]): Widget[] {
  // Complex logic to determine which widgets should be shown
  // based on the current event state
}
```

### Key Architectural Decisions

#### 1. **No Circular Dependencies**
- Canvas doesn't import from Chat
- Chat receives Canvas operations as callbacks
- MapCache remains independent of both

#### 2. **Clear State Boundaries**
- **MapCache**: Tile data (source of truth)
- **Canvas**: Spatial UI state (coordinates, expansion, etc.)
- **ChatCache**: Conversation state (messages, active widgets)

#### 3. **Widget as Composable UI Components**
Widgets are composable UI components that can:
- **Canvas Widgets**: Adapt Canvas operations to chat UI
- **Auth Widgets**: Handle authentication flows
- **Info Widgets**: Display system messages or notifications
- **Future AI Widgets**: Present AI responses and suggested actions

Each widget type composes the capabilities it needs:
```typescript
// Canvas widget example
type PreviewWidgetProps = BaseWidgetProps & CanvasOperationProps & {
  mode: 'view' | 'edit';
  content: string;
};

// Non-canvas widget example  
type LoginWidgetProps = BaseWidgetProps & AuthenticationProps & {
  message?: string;
};
```

#### 4. **Future Backend Integration Points**
- ChatCache will sync with backend chat domain
- Message sending will integrate with agentic domain
- Widget operations remain frontend-only (Canvas handles backend sync)

### Implementation Priorities

1. **Phase 1**: Establish Architecture
   - Create ChatCache with event-driven pattern
   - Implement event bus service
   - Define widget composition interfaces
   - Create ARCHITECTURE.md documentation

2. **Phase 2**: Refactor State Management
   - Implement event-based architecture
   - Create event creators and handlers
   - Build selectors for deriving UI state
   - Remove monolithic reducer

3. **Phase 3**: Refactor Widgets
   - Implement widget composition pattern
   - Create capability interfaces
   - Remove direct MapCache imports
   - Add visual indicators for Canvas widgets

4. **Phase 4**: Component Organization
   - Follow Rule of 6
   - Extract inline components
   - Implement virtual scrolling
   - Update ARCHITECTURE.md with implementation learnings

### Key Benefits

1. **Clear Mental Model**: Canvas is core, Chat is interface via events
2. **No Circular Dependencies**: Unidirectional data flow
3. **Future-Ready**: Events naturally map to backend persistence/streaming
4. **Maintainable**: Each piece has single responsibility
5. **Testable**: Pure functions for event handling and derivation
6. **Time Travel**: Event log enables debugging and replay
7. **Flexible UI**: Can show/hide widgets based on complex event patterns

### Event-Driven Benefits

The event-based architecture provides specific advantages:

1. **Backend Integration**: Events can be easily sent to backend chat domain
2. **AI Integration**: AI responses become events in the same log
3. **Audit Trail**: Complete history of all interactions
4. **Derived State**: UI complexity managed through selectors, not imperative updates
5. **Widget Lifecycle**: Widgets appear/disappear based on event patterns, not manual management

Example of future AI integration:
```typescript
// AI request
{ type: 'user_message', payload: { text: "Create a task tracker" } }
{ type: 'ai_processing', payload: { requestId: '123' } }

// AI response with suggested widget
{ type: 'ai_response', payload: { 
    text: "I'll help you create a task tracker. Let me set up a tile for that.",
    suggestedAction: { type: 'create_tile', data: { ... } }
  }
}

// This automatically shows: AI message + Creation widget
```

### Architecture Documentation

A detailed `ARCHITECTURE.md` file has been created at `/src/app/map/Chat/ARCHITECTURE.md` containing:
- Complete architectural design and patterns
- Widget composition examples
- Event bus integration details
- Complex flow example (cross-user tile import)
- Performance considerations
- UI design principles

**Note**: This documentation should be updated after implementation if there are any changes or additional insights discovered during development.

## Tests

*I am an AI assistant acting on behalf of @Diplow*

### Testing Strategy

The event-driven architecture requires a comprehensive testing approach that covers infrastructure, individual systems, and cross-system communication.

### 1. Event Bus Infrastructure Tests

```typescript
// event-bus.test.ts
describe('EventBus', () => {
  it('should emit events to registered listeners', () => {
    const eventBus = new EventBus();
    const listener = vi.fn();
    
    eventBus.on('test.event', listener);
    eventBus.emit({ type: 'test.event', payload: { data: 'test' } });
    
    expect(listener).toHaveBeenCalledWith({ type: 'test.event', payload: { data: 'test' } });
  });
  
  it('should support multiple listeners for same event', () => {
    // Test multiple listeners
  });
  
  it('should properly unsubscribe listeners', () => {
    // Test cleanup
  });
  
  it('should handle namespaced events correctly', () => {
    // Test map.*, chat.*, etc.
  });
});
```

### 2. MapCache Event Emission Tests

Update existing MapCache tests to verify event emission:

```typescript
// mutation-handler.test.ts updates
describe('MutationHandler with EventBus', () => {
  let eventBus: MockEventBus;
  let mapCache: MapCacheContext;
  
  beforeEach(() => {
    eventBus = createMockEventBus();
    mapCache = createMapCacheWithEventBus(eventBus);
  });
  
  it('should emit event when tile is created', async () => {
    await mapCache.createItemOptimistic(coordId, data);
    
    expect(eventBus.emit).toHaveBeenCalledWith({
      type: 'map.tile_created',
      source: 'map_cache',
      payload: expect.objectContaining({
        tileId: expect.any(String),
        tileName: data.title,
        coordId
      })
    });
  });
  
  // Similar tests for update, delete, swap, move
});
```

### 3. ChatCache Event-Driven Tests

```typescript
// chat-cache.test.ts
describe('ChatCache Event Processing', () => {
  it('should derive messages from events', () => {
    const events = [
      { type: 'user_message', payload: { text: 'Hello' } },
      { type: 'tile_selected', payload: { tileId: '123' } }
    ];
    
    const messages = deriveVisibleMessages(events);
    
    expect(messages).toHaveLength(1); // Only user_message shown
    expect(messages[0].content).toBe('Hello');
  });
  
  it('should derive widgets from events', () => {
    const events = [
      { type: 'tile_selected', payload: { tileId: '123', tileData: {...} } }
    ];
    
    const widgets = deriveActiveWidgets(events);
    
    expect(widgets).toHaveLength(1);
    expect(widgets[0].type).toBe('preview');
  });
  
  it('should handle widget lifecycle through events', () => {
    const events = [
      { type: 'operation_started', payload: { op: 'delete', tileId: '123' } },
      { type: 'operation_completed', payload: { op: 'delete', tileId: '123' } }
    ];
    
    const widgetsAtStart = deriveActiveWidgets([events[0]]);
    expect(widgetsAtStart).toHaveLength(1);
    
    const widgetsAtEnd = deriveActiveWidgets(events);
    expect(widgetsAtEnd).toHaveLength(0); // Widget closed after completion
  });
});
```

### 4. Widget Composition Tests

```typescript
// widget-composition.test.ts
describe('Widget Composition', () => {
  it('should compose base widget with canvas capabilities', () => {
    const props: PreviewWidgetProps = {
      id: '1',
      tile: mockTile,
      onTileUpdate: vi.fn(),
      onClose: vi.fn()
    };
    
    render(<PreviewWidget {...props} />);
    
    // Verify base widget features
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    
    // Verify canvas capabilities
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });
  
  it('should render canvas widget indicators', () => {
    render(<PreviewWidget {...canvasWidgetProps} />);
    
    expect(screen.getByText(/modifies map/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /map operation/i })).toBeInTheDocument();
  });
});
```

### 5. Integration Tests

```typescript
// chat-map-integration.test.ts
describe('Chat-Map Integration via EventBus', () => {
  it('should show tile preview in chat when tile selected on map', async () => {
    const { eventBus } = renderMapWithChat();
    
    // Simulate tile selection on map
    const tile = screen.getByTestId('tile-123');
    await userEvent.click(tile);
    
    // Verify event was emitted
    expect(eventBus.emit).toHaveBeenCalledWith({
      type: 'map.tile_selected',
      payload: expect.objectContaining({ tileId: '123' })
    });
    
    // Verify chat shows preview widget
    await waitFor(() => {
      expect(screen.getByRole('article', { name: /tile preview/i })).toBeInTheDocument();
    });
  });
  
  it('should update chat when map operation completes', async () => {
    const { mapCache, chatPanel } = renderMapWithChat();
    
    // Perform tile swap via map
    await mapCache.swapTiles('123', '456');
    
    // Verify chat shows completion message
    await waitFor(() => {
      expect(chatPanel).toHaveTextContent(/swapped "Tile A" with "Tile B"/i);
    });
  });
});
```

### 6. E2E Tests

```typescript
// chat-refactor.e2e.ts
test('tile import flow with chat feedback', async ({ page }) => {
  // Navigate to other user's map
  await page.goto('/map?center=other-user-tile');
  
  // Open tile preview in chat
  await page.click('[data-testid="tile-to-import"]');
  await expect(page.locator('[data-testid="preview-widget"]')).toBeVisible();
  
  // Navigate to own map
  await page.goto('/map?center=my-tile');
  
  // Verify preview persists
  await expect(page.locator('[data-testid="preview-widget"]')).toBeVisible();
  
  // Drag from preview to map
  const preview = page.locator('[data-testid="preview-drag-handle"]');
  const target = page.locator('[data-testid="empty-tile-drop-zone"]');
  await preview.dragTo(target);
  
  // Verify success message in chat
  await expect(page.locator('text=/import completed/i')).toBeVisible();
});
```

### Testing Utilities

Create test utilities for common patterns:

```typescript
// test-utils/event-bus.ts
export function createMockEventBus() {
  return {
    emit: vi.fn(),
    on: vi.fn((event, listener) => {
      // Track listeners for testing
      return () => {}; // unsubscribe
    }),
    listeners: new Map()
  };
}

// test-utils/chat-testing.ts
export function renderChatWithEvents(initialEvents: ChatEvent[] = []) {
  const eventBus = createMockEventBus();
  
  return {
    ...render(
      <ChatCacheProvider eventBus={eventBus} initialEvents={initialEvents}>
        <ChatPanel />
      </ChatCacheProvider>
    ),
    eventBus,
    emitEvent: (event: ChatEvent) => {
      // Helper to emit events in tests
    }
  };
}
```

### Test Coverage Goals

1. **Unit Tests**: 90%+ coverage of:
   - Event bus infrastructure
   - Event derivation functions (selectors)
   - Widget composition logic
   - Individual widget behavior

2. **Integration Tests**: Cover all cross-system flows:
   - Map → Chat communication
   - Widget → Map operations
   - Event lifecycle scenarios

3. **E2E Tests**: Key user workflows:
   - Tile selection and preview
   - Tile operations with feedback
   - Complex flows (import example)

### Updating Existing Tests

1. **MapCache Tests**: Add `eventBus` to test setup
   ```typescript
   const eventBus = createMockEventBus();
   const provider = <MapCacheProvider eventBus={eventBus}>
   ```

2. **Mock Event Bus in Tests**: Prevent actual cross-system communication
   ```typescript
   vi.mock('./services/event-bus', () => ({
     EventBus: vi.fn(() => createMockEventBus())
   }));
   ```

3. **Assertion Helpers**: Add custom matchers
   ```typescript
   expect.extend({
     toHaveEmittedEvent(eventBus, eventType) {
       // Custom matcher for event emission
     }
   });
   ```

### Performance & Implementation Considerations

#### 1. **Performance for Large Chat Histories**
- **Virtualization**: Use react-window for rendering only visible items
- **Event Pagination**: Load events in chunks (last 100, then more on scroll)
- **Memoized Selectors**: Cache heavy computations
- **Lazy Widget Initialization**: Widgets only mount when visible

#### 2. **Canvas Widget UI Design**
Canvas widgets should have distinct visual indicators:
- Border color/style indicating map operations
- Badge or icon showing "Modifies Map"
- Consistent visual language across all canvas widgets
- Clear affordances without being overwhelming

#### 3. **MapCache → ChatCache Synchronization via Event Bus**

```typescript
// Shared event bus service
interface EventBusService {
  emit(event: AppEvent): void;
  on(eventType: string, listener: (event: AppEvent) => void): () => void;
}

// MapCache integration
interface MapCacheContext {
  // ... existing properties
  eventBus: EventBusService;  // Injected event bus
}

// MapCache emits events
function swapTiles(tile1Id: string, tile2Id: string) {
  // Perform swap operation...
  
  // Emit domain event
  context.eventBus.emit({
    type: 'map.tiles_swapped',
    source: 'map_cache',
    payload: { tile1Id, tile2Id, tile1Name, tile2Name }
  });
}

// ChatCache listens for MapCache events
useEffect(() => {
  const unsubscribe = eventBus.on('map.tiles_swapped', (event) => {
    dispatch(createChatEvent({
      type: 'operation_completed',
      actor: 'system',
      payload: {
        operation: 'swap',
        message: `Swapped "${event.payload.tile1Name}" with "${event.payload.tile2Name}"`
      }
    }));
  });
  
  return unsubscribe;
}, [eventBus]);
```

**Benefits**:
- MapCache remains independent (just needs event bus interface)
- Chat can listen to all map operations
- Other systems can also listen (analytics, undo/redo, etc.)
- Clear event namespace (map.*, chat.*, auth.*)

## Context

*I am an AI assistant acting on behalf of @Diplow*

### Existing Documentation
Documentation review findings:
- **README Files**: ❌ No README.md exists in `/src/app/map/Chat/` directory
- **Architecture Docs**: ❌ Chat component is not mentioned in `/src/app/map/ARCHITECTURE.md`
- **Domain Documentation**: ❌ No specific chat domain documentation exists
- **Documentation vs Reality**: 📝 The only documentation found is in `/src/app/FUTURE_IDEAS.md` which describes chat as a future concept, but the implementation is already functional and complex

### Domain Overview
The Chat component serves as the primary interaction interface between users and the Hexframe map system:
- **Purpose**: Provides a conversational interface for tile operations and system navigation
- **Architecture Pattern**: Context-based state management with reducer pattern
- **Integration**: Tightly integrated with the map cache system for tile operations
- **Widget System**: Extensible widget-based UI for different interaction types

### Key Components
The chat system consists of several interconnected components:

**Core Components**:
- `ChatProvider.tsx`: Central state management using React Context and useReducer
- `ChatPanel.tsx`: Main container component with header and layout
- `ChatMessages.tsx`: Message rendering with widget support
- `ChatInput.tsx`: User input handling
- `ChatWithCenterTracking.tsx`: Map navigation tracking integration

**Widget System** (`/Widgets/`):
- `PreviewWidget.tsx`: Tile preview with inline editing capabilities
- `CreationWidget.tsx`: New tile creation interface
- `ConfirmDeleteWidget.tsx`: Deletion confirmation UI
- `LoginWidget.tsx`: Authentication flow integration
- `LoadingWidget.tsx`: Operation status feedback
- `ErrorWidget.tsx`: Error handling and retry capabilities
- `Portal.tsx`: Portal rendering for overlays

**Support Files**:
- `types.ts`: TypeScript interfaces and type definitions
- `useCenterChangeNotification.tsx`: Hook for map navigation notifications

### Implementation Details

**State Management Architecture**:
- Uses React Context (`ChatProvider`) with useReducer for predictable state updates
- State shape includes: `selectedTileId`, `messages`, `isPanelOpen`, `expandedPreviewId`
- 23 distinct action types for comprehensive state transitions
- Messages can be either strings or widget objects with type-specific data

**Widget System Design**:
- Widgets are specialized UI components embedded in chat messages
- Each widget type has its own data interface (e.g., `PreviewWidgetData`, `CreationWidgetData`)
- Widgets can trigger map operations through callbacks
- Portal-based rendering for context menus and overlays

**Message Types**:
- `system`: System-generated messages and widgets
- `user`: User input messages
- `assistant`: AI/system responses

**Current Patterns**:
- Heavy use of inline component definitions (e.g., `ChatHeader` inside `ChatPanel`)
- Mixed concerns in components (UI, business logic, and state management)
- Direct coupling to map cache operations within widgets
- Extensive test coverage (14 test files) indicating mature functionality

### Dependencies and Integration

**Internal Dependencies**:
- `MapCacheProvider`: For tile data access and mutations
- `AuthContext`: User authentication state
- `TileActionsContext`: Unified tile interaction handling
- `CoordSystem`: Hexagonal coordinate calculations
- UI components from `~/components/ui/`

**External Consumers**:
- `MapPageContent`: Integrates chat with tile actions
- `useTileSelectForChat` hook: Bridges tile selection to chat
- Empty tiles directly dispatch chat actions for creation

**Integration Points**:
- **Tile Selection**: `SELECT_TILE` action shows preview widget
- **Map Navigation**: `CENTER_CHANGED` tracks user movement
- **Tile Operations**: Create, update, delete, move, swap operations
- **Authentication**: Login/logout flows through chat widgets

**Data Flow**:
1. User interacts with map tiles
2. `TileActionsContext` captures interactions
3. Actions route through `MapPageContent` handlers
4. Chat-related actions dispatch to `ChatProvider`
5. Widgets render and can trigger map mutations
6. Map cache updates propagate back to UI

**Notable Integration Complexity**:
- Chat state tracks both UI state and operation state
- Widgets have direct access to mutation operations
- No clear boundary between chat UI and business logic
- Authentication state changes trigger chat message updates

## Implementation Plan

*I am an AI assistant acting on behalf of @Diplow*

### Overview

The implementation is structured in 7 phases, progressing from infrastructure to full integration. Each phase builds on the previous one and can be tested independently.

### Phase 1: Event Bus Infrastructure (2-3 days)

**Goal**: Create the shared event bus service that enables cross-system communication.

**Tasks**:
1. [ ] Create `EventBus` class in `/src/app/map/Services/event-bus.ts`
   - Implement emit/on/off methods
   - Add namespace support (map.*, chat.*, etc.)
   - Include TypeScript types for events

2. [ ] Create event type definitions in `/src/app/map/types/events.ts`
   - Define `AppEvent` base interface
   - Define specific event types for map operations
   - Define chat-specific event types

3. [ ] Write comprehensive EventBus tests
   - Unit tests for all EventBus methods
   - Test namespace filtering
   - Test memory leak prevention (cleanup)

4. [ ] Create test utilities in `/src/test-utils/event-bus.ts`
   - `createMockEventBus()` for testing
   - Custom Jest/Vitest matchers

**Deliverable**: Working EventBus with full test coverage

### Phase 2: MapCache Event Integration (3-4 days)

**Goal**: Update MapCache to emit events for all operations while maintaining backward compatibility.

**Tasks**:
1. [ ] Update MapCacheProvider to accept eventBus prop
   - Add optional eventBus to provider props
   - Pass eventBus to mutation handler

2. [ ] Update MutationHandler to emit events
   - [ ] Emit `map.tile_created` after successful creation
   - [ ] Emit `map.tile_updated` after successful update
   - [ ] Emit `map.tile_deleted` after successful deletion
   - [ ] Emit `map.tiles_swapped` after successful swap
   - [ ] Emit `map.tile_moved` after successful move

3. [ ] Update NavigationHandler to emit events
   - [ ] Emit `map.navigation` on center change
   - [ ] Emit `map.expansion_changed` on expand/collapse

4. [ ] Update all MapCache tests
   - Add eventBus to test setup
   - Verify events are emitted correctly
   - Ensure existing functionality unaffected

**Deliverable**: MapCache emitting all events, existing tests passing

### Phase 3: Chat Event-Driven Architecture (4-5 days)

**Goal**: Implement the new event-driven chat architecture without breaking existing functionality.

**Tasks**:
1. [ ] Create ChatCache structure in `/src/app/map/Chat/_cache/`
   - [ ] Create `ChatCacheProvider.tsx`
   - [ ] Create event reducers
   - [ ] Create selectors for deriving UI state
   - [ ] Create `use-chat-cache.ts` hook

2. [ ] Implement event handling
   - [ ] Create event creators
   - [ ] Create event-to-UI derivation logic
   - [ ] Implement message selectors
   - [ ] Implement widget selectors

3. [ ] Create migration wrapper
   - Keep existing ChatProvider working
   - Gradually migrate to event-based system
   - Ensure no breaking changes

4. [ ] Write comprehensive tests
   - Test event processing
   - Test UI derivation
   - Test selector memoization

**Deliverable**: Event-driven chat system alongside existing system

### Phase 4: Widget Refactoring (3-4 days)

**Goal**: Implement widget composition pattern and standardize widget interfaces.

**Tasks**:
1. [ ] Create widget base structure
   - [ ] Define base widget interface
   - [ ] Create capability interfaces
   - [ ] Create `WidgetContainer` component

2. [ ] Refactor existing widgets
   - [ ] PreviewWidget with composition
   - [ ] CreationWidget with composition
   - [ ] DeleteWidget with composition
   - [ ] LoginWidget with composition
   - [ ] LoadingWidget with composition
   - [ ] ErrorWidget with composition

3. [ ] Add Canvas widget indicators
   - Visual design for map-modifying widgets
   - Accessibility considerations

4. [ ] Write widget tests
   - Test composition patterns
   - Test capability interfaces
   - Test visual indicators

**Deliverable**: All widgets using new composition pattern

### Phase 5: Integration & Migration (2-3 days)

**Goal**: Connect the refactored systems and migrate from old to new architecture.

**Tasks**:
1. [ ] Connect EventBus across systems
   - Wire EventBus in main app layout
   - Connect MapCache and ChatCache

2. [ ] Implement ChatCache listeners
   - Listen for map.* events
   - Convert to chat events
   - Update UI accordingly

3. [ ] Migrate from old ChatProvider
   - Switch components to use new system
   - Remove old reducer/actions
   - Update all imports

4. [ ] Integration testing
   - Test full flows (map → chat)
   - Test widget → map operations
   - Verify no regressions

**Deliverable**: Fully integrated event-driven system

### Phase 6: Performance & Polish (2-3 days)

**Goal**: Implement performance optimizations and polish the implementation.

**Tasks**:
1. [ ] Implement virtual scrolling
   - Add react-window to ChatMessages
   - Handle variable height items
   - Test with large histories

2. [ ] Optimize selectors
   - Add proper memoization
   - Profile and optimize hot paths
   - Add performance tests

3. [ ] Implement event pagination
   - Load events in chunks
   - Implement infinite scroll
   - Add loading states

4. [ ] Polish and cleanup
   - Remove dead code
   - Update documentation
   - Add missing TypeScript types

**Deliverable**: Performant, polished implementation

### Phase 7: Documentation & Testing (1-2 days)

**Goal**: Ensure comprehensive documentation and test coverage.

**Tasks**:
1. [ ] Update documentation
   - [ ] Update Chat ARCHITECTURE.md with learnings
   - [ ] Update inline code documentation
   - [ ] Create migration guide

2. [ ] E2E test scenarios
   - [ ] Tile selection flow
   - [ ] Tile operations with feedback
   - [ ] Complex import flow

3. [ ] Final test coverage
   - Ensure 90%+ unit test coverage
   - All integration tests passing
   - E2E tests for critical paths

4. [ ] Performance benchmarks
   - Measure render performance
   - Measure memory usage
   - Document baselines

**Deliverable**: Fully documented and tested implementation

### Total Timeline: 17-22 days

### Critical Path Dependencies

```
Phase 1 (EventBus) 
    ↓
Phase 2 (MapCache) → Phase 3 (ChatCache)
                           ↓
                     Phase 4 (Widgets)
                           ↓
                     Phase 5 (Integration)
                           ↓
                     Phase 6 (Performance)
                           ↓
                     Phase 7 (Documentation)
```

### Risk Mitigation

1. **Backward Compatibility**: Each phase maintains existing functionality
2. **Incremental Migration**: Can pause at any phase if issues arise
3. **Feature Flags**: Consider adding flags to toggle new system
4. **Rollback Plan**: Old code removed only after new system proven stable

### Success Criteria

1. All existing functionality preserved
2. Event-driven architecture fully implemented
3. Performance equal or better than current
4. 90%+ test coverage maintained
5. Documentation complete and accurate