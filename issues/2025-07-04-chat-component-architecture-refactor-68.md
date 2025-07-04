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

### Approach: Domain-Driven Chat Architecture

The solution involves restructuring the chat component into a proper domain with clear separation of concerns, following Hexframe's established patterns.

**Key Principles**:
1. Extract business logic into a chat domain
2. Separate UI components from state management
3. Create clear boundaries between chat and map operations
4. Implement proper widget registry pattern
5. Follow the Rule of 6 for code organization

### Implementation Strategy

1. **Create Chat Domain** (`/src/lib/domains/chat/`)
   - Define chat entities and types
   - Implement chat actions (send message, manage widgets)
   - Create chat service for coordinating operations
   - Define repository interfaces for future persistence

2. **Refactor State Management**
   - Move reducer logic to domain actions
   - Simplify ChatProvider to be a thin wrapper
   - Separate UI state from domain state
   - Create proper action creators

3. **Implement Widget Registry**
   - Create widget registry pattern for extensibility
   - Define widget interfaces and lifecycle
   - Separate widget rendering from chat messages
   - Enable dynamic widget registration

4. **Decouple from Map Operations**
   - Use events/callbacks instead of direct coupling
   - Define clear interfaces for map integration
   - Move map-specific logic out of widgets
   - Create adapter layer for map operations

5. **Organize Components**
   - Split large files following Rule of 6
   - Extract inline components to separate files
   - Create proper component hierarchy
   - Add comprehensive documentation

## Architecture

*I am an AI assistant acting on behalf of @Diplow*

### Current State

The chat component currently exists as a monolithic React component system with:
- All logic contained within `/src/app/map/Chat/` directory
- Mixed concerns between UI, state management, and business logic
- Direct coupling to map operations through imports
- No clear domain boundaries or separation of concerns
- 23 action types managed in a single reducer
- Widgets directly importing and using map mutations

### New Components

#### 1. Chat Domain (`/src/lib/domains/chat/`)

**Structure**:
```
/src/lib/domains/chat/
├── README.md                    # Domain documentation
├── _objects/                    # Domain entities
│   ├── message.ts              # Message entity
│   ├── widget.ts               # Widget entity
│   └── chat-session.ts         # Session aggregate
├── _actions/                    # Business logic
│   ├── message.actions.ts      # Message operations
│   ├── widget.actions.ts       # Widget lifecycle
│   └── session.actions.ts      # Session management
├── _repositories/               # Data interfaces
│   └── chat.repository.ts      # Repository interface
├── services/                    # Domain services
│   └── chat.service.ts         # Main service facade
└── types/                       # Domain types
    ├── constants.ts            # Action types, widget types
    ├── contracts.ts            # Public interfaces
    └── errors.ts               # Domain errors
```

#### 2. Widget Registry System (`/src/app/map/Chat/_widgets/`)

**Structure**:
```
/src/app/map/Chat/_widgets/
├── registry.ts                  # Widget registry
├── base-widget.tsx             # Base widget component
├── widget-provider.tsx         # Widget context provider
└── widgets/                    # Widget implementations
    ├── preview/
    ├── creation/
    ├── confirm-delete/
    └── ...
```

#### 3. Chat UI Components (Refactored)

**Structure**:
```
/src/app/map/Chat/
├── README.md                    # Component documentation
├── _components/                 # UI components
│   ├── ChatHeader.tsx          # Extracted header
│   ├── ChatMessageList.tsx     # Message rendering
│   ├── ChatMessageItem.tsx     # Individual message
│   └── ChatInputBar.tsx        # Input handling
├── _hooks/                      # React hooks
│   ├── use-chat-state.ts       # State management
│   ├── use-chat-actions.ts     # Action dispatching
│   └── use-widget-renderer.ts  # Widget rendering
├── _providers/                  # Context providers
│   ├── ChatProvider.tsx        # Simplified provider
│   └── ChatBridge.tsx          # Map integration bridge
├── ChatPanel.tsx               # Main container
└── types.ts                    # UI-specific types
```

### Modified Components

1. **ChatProvider**: Simplified to use domain service instead of complex reducer
2. **ChatMessages**: Refactored to use widget registry for rendering
3. **Widgets**: Converted to use standardized interfaces and callbacks
4. **Integration Hooks**: Modified to use event-based communication

### Data Flow

```
User Input → UI Component → Domain Action → State Update → UI Render
                              ↓
                        Side Effects
                              ↓
                    External Systems (Map)
```

**Detailed Flow**:
1. User interacts with chat (type message, click tile)
2. UI component captures interaction
3. Domain action is dispatched through service
4. Domain logic processes action (validation, transformation)
5. State is updated through domain-managed store
6. UI re-renders based on state changes
7. Side effects (map operations) triggered via callbacks

### Mental Model

Think of the chat system as three distinct layers:

1. **Domain Layer** (Business Logic)
   - What can be done (actions)
   - What exists (entities)
   - How things work (services)

2. **UI Layer** (Presentation)
   - How things look (components)
   - User interactions (events)
   - Visual state (local state)

3. **Integration Layer** (Adapters)
   - Bridge to map system
   - Event translation
   - Callback coordination

**Widget Mental Model**:
- Widgets are **self-contained UI units** with defined lifecycles
- Registry pattern allows **dynamic widget types**
- Widgets communicate via **events**, not direct imports
- Each widget has **clear input/output contracts**

### Key Patterns

1. **Domain-Driven Design**
   - Business logic in domain layer
   - UI is a thin presentation layer
   - Clear boundaries between domains

2. **Registry Pattern** (for widgets)
   ```typescript
   interface WidgetDefinition {
     type: string;
     component: React.ComponentType<WidgetProps>;
     validator: (data: unknown) => boolean;
   }
   ```

3. **Event-Driven Integration**
   ```typescript
   interface ChatEvent {
     type: string;
     payload: unknown;
   }
   
   // Instead of direct imports:
   onTileOperation?.(event: ChatEvent)
   ```

4. **Facade Pattern** (ChatService)
   ```typescript
   class ChatService {
     sendMessage(content: string): Promise<void>
     showWidget(type: string, data: unknown): void
     handleMapEvent(event: MapEvent): void
   }
   ```

5. **Separation of Concerns**
   - Domain: What and Why
   - UI: How it looks
   - Integration: How it connects

### Implementation Priorities

1. **Phase 1**: Domain extraction
   - Create domain structure
   - Move business logic
   - Define interfaces

2. **Phase 2**: Widget refactoring
   - Implement registry
   - Convert existing widgets
   - Standardize interfaces

3. **Phase 3**: UI reorganization
   - Extract components
   - Simplify provider
   - Add documentation

4. **Phase 4**: Integration cleanup
   - Remove direct coupling
   - Implement event system
   - Create adapter layer

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