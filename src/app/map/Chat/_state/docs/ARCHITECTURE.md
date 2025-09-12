# Chat State Architecture

## Subsystem Purpose
Provides centralized state management for the Chat subsystem using event sourcing patterns.

## Design Principles

### Event Sourcing
- **Immutable event stream** is the source of truth
- **Derived state** (messages, widgets) computed from events
- **Time travel** and debugging capabilities through event replay
- **Predictable updates** through pure reducers

### Unidirectional Data Flow
```
External Event → Validator → ChatEvent → Reducer → Event Stream → Selectors → UI State
```

### Separation of Concerns
- **Events**: What happened (data)
- **Reducers**: How state changes (logic)
- **Selectors**: What to show (derivation)
- **Providers**: Where to access (context)

## Key Architectural Patterns

### Event-Driven State
State changes only through events, never direct mutation.

```typescript
// ✅ Correct: Update through events
dispatch({ type: 'user_message', payload: { text: 'Hello' } });

// ❌ Wrong: Direct state mutation  
state.messages.push(newMessage);
```

### Derived State Pattern
Messages and widgets are computed from events, not stored directly.

```typescript
// Messages derived from events in real-time
const messages = useMemo(() => 
  deriveVisibleMessages(events), [events]
);
```

### Context-Based Access
State accessed through React context, not global state.

```typescript
// State scoped to ChatProvider tree
const ChatContext = createContext<ChatState | null>(null);
```

## Integration Points

### External Dependencies
- **EventBus**: Receives map-level events (tile selection, operations)
- **Settings**: Respects user preferences for message visibility
- **Types**: Uses shared type definitions with map layer

### Internal Boundaries
- **Events**: Self-contained event processing
- **Reducers**: Pure state transition functions
- **Selectors**: Memoized derivation functions

## Quality Constraints

### Performance
- **Memoized selectors** prevent unnecessary recalculations
- **Immutable updates** enable efficient change detection
- **Event pruning** prevents unbounded memory growth

### Testability  
- **Pure functions** for reducers and selectors
- **Isolated event processing** for unit testing
- **Deterministic state** from event replay

### Maintainability
- **Clear separation** between state logic and UI logic
- **Type safety** throughout event and state handling
- **Documented event contracts** for integration

## Future Considerations

### Scalability
- Consider event stream persistence for large histories
- Implement event compaction for memory management
- Add event indexing for performance optimization

### Extensibility
- Plugin system for custom event handlers
- Configurable selector composition
- Dynamic widget registration system