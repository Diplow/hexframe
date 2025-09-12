# Chat State Management

Central state management for the Chat subsystem, handling event processing, message derivation, and widget lifecycle management.

## Architecture

```
_state/
├── index.ts                    # Public API
├── ChatProvider.tsx            # React context provider
├── useChatState.ts            # Main state hook
├── types.ts                   # Core type definitions
├── _events/                   # Event processing
│   ├── event.types.ts         # Event type definitions
│   ├── event.creators.ts      # Event creation utilities
│   └── event.validators.ts    # Event validation
├── _reducers/                 # State reducers
│   └── events.reducer.ts      # Events reducer
└── _selectors/                # State selectors
    └── message.selectors.ts   # Message and widget selectors
```

## Key Components

### ChatProvider
React context provider that makes chat state available throughout the component tree.

### useChatState Hook
Main hook that:
- Manages event stream processing
- Derives messages and widgets from events
- Handles state transitions and lifecycle
- Integrates with external event bus

### Event System
- **Events**: Immutable event stream representing all chat interactions
- **Reducers**: Pure functions for state transitions
- **Selectors**: Derive UI state from event stream
- **Validators**: Transform map events to chat events

## Dependencies

- **React**: Context and hooks
- **Map Services**: Event bus integration  
- **Map Types**: Shared type definitions
- **Chat Settings**: Configuration and preferences

## Usage

```tsx
import { ChatProvider, useChatState } from '~/app/map/Chat/_state';

// Provide state context
<ChatProvider>
  <ChatInterface />
</ChatProvider>

// Use state in components
const { messages, widgets, sendMessage } = useChatState();
```

## State Flow

1. **External events** arrive via EventBus
2. **Event validators** transform to ChatEvents  
3. **Events reducer** appends to event stream
4. **Message selectors** derive Messages from events
5. **Widget selectors** derive Widgets from events
6. **UI components** render derived state