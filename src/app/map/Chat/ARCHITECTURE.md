# Architecture: Chat Subsystem

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
Chat/
├── interface.ts              # Public API
├── dependencies.json         # Allowed imports
├── ChatPanel.tsx            # Main component entry point
├── types.ts                 # Shared type definitions
├── Input/                   # User input handling
│   ├── index.tsx           # Input component
│   ├── _components/        # Input-specific components
│   ├── _hooks/             # Input state management
│   └── _services/          # Input processing logic
├── Timeline/                # Timeline display (messages + widgets)
│   ├── index.tsx           # Timeline container
│   ├── *Renderer.tsx       # Content renderers
│   ├── _handlers/          # Action handlers
│   ├── _hooks/             # Timeline-specific hooks
│   ├── _renderers/         # Internal widget rendering
│   ├── _utils/             # Timeline utilities
│   └── Widgets/            # Widget subsystems (children of timeline)
│       ├── AIResponseWidget/
│       ├── LoginWidget/
│       └── PreviewWidget/
├── _hooks/                  # Chat-level hooks
│   ├── useAIChat.ts        # AI integration
│   └── useAIChatIntegration.ts
├── _settings/               # Configuration management
├── _state/                  # Event-driven state management
│   ├── ChatProvider.tsx    # React context provider
│   ├── useChatState.ts     # Main state hook
│   ├── types.ts            # State type definitions
│   ├── _events/            # Event system
│   ├── _reducers/          # State reducers
│   └── _selectors/         # Derived state selectors
└── __tests__/               # Test files
```

## Key Patterns

- **Event-Driven Architecture**: All interactions create immutable events, UI state is derived from event log
- **Clean Subsystem Hierarchy**: Timeline contains Widgets as children, establishing proper containment
- **Unified Timeline**: Single component handles both messages and widgets in chronological order
- **Command Processing**: Text input is parsed and routed to appropriate handlers
- **AI Integration**: Seamless integration with AI chat capabilities
- **Context Provider Pattern**: React context for state management across component tree

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core React hooks and components |
| lucide-react | Icon components |
| ~/lib/utils | Utility functions (cn for classnames) |
| ~/components/ui/* | Shared UI components |
| ~/lib/auth/* | Authentication client |
| ~/lib/debug/* | Debug logging |
| ~/contexts/* | App-level contexts |
| ../Services/EventBus | Event communication system |
| ../types/* | Shared type definitions |

## Interactions

### Inbound (Who uses this subsystem)
- **Map Page** → Renders ChatPanel as part of map interface
- **Canvas** → Sends request events for user input (edit, delete confirmation)

### Outbound (What this subsystem uses)
- **EventBus** ← For listening to map events and sending notifications
- **MapCache** ← For performing tile operations via commands
- **IAM Domain** ← For authentication state and operations
- **Agentic Domain** ← For AI chat integration

## Event Flow Architecture

The Chat subsystem follows a notification-only event pattern:

1. **User Action** → Chat processes command → Calls MapCache
2. **MapCache** → Performs operation → Emits past-tense notification
3. **Chat** → Receives notification (including its own) → Updates UI

This ensures Chat treats its own operations identically to external ones, maintaining consistency and preventing race conditions.