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

Mirroring the MapCache pattern for chat-specific data:

```
/src/app/map/Chat/_cache/
├── ChatCacheProvider.tsx        # State management for chat
├── use-chat-cache.ts           # Hook to access chat state
├── _reducers/
│   ├── messages.reducer.ts     # Message state management
│   ├── widgets.reducer.ts      # Active widget state
│   └── session.reducer.ts      # Chat session state
└── _actions/
    ├── message.actions.ts      # Message operations
    └── widget.actions.ts       # Widget lifecycle
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

**1. One-Way Data Flow (Canvas → Chat)**
```
MapCache updates → Canvas re-renders → Chat receives new props/callbacks
Canvas navigation → Chat shows navigation message
Tile selection → Chat displays preview widget
```

**2. Operation Flow (Chat → Canvas)**
```
User action in widget → Widget calls canvas callback → Canvas/MapCache handles operation
Widget shows loading → Operation completes → Widget updates/closes
```

**3. Chat-Specific State (Isolated)**
```
Messages array → Managed by ChatCache → Persisted to backend (future)
Widget states → Managed by ChatCache → UI-only lifecycle
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
   - Create ChatCache mirroring MapCache pattern
   - Define clear callback interfaces
   - Document data flow

2. **Phase 2**: Refactor State Management
   - Extract reducers from monolithic reducer
   - Separate message state from widget state
   - Create focused action creators

3. **Phase 3**: Refactor Widgets
   - Convert to adapter pattern
   - Remove direct MapCache imports
   - Standardize widget interfaces

4. **Phase 4**: Component Organization
   - Follow Rule of 6
   - Extract inline components
   - Add comprehensive documentation

### Key Benefits

1. **Clear Mental Model**: Canvas is core, Chat is interface
2. **No Circular Dependencies**: Unidirectional data flow
3. **Future-Ready**: Clear integration points for backend
4. **Maintainable**: Each piece has single responsibility
5. **Testable**: Widgets testable in isolation with mock callbacks

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