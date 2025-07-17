# Map Page Testing Strategy

## Overview

The map page testing strategy leverages the notification-only event bus pattern. Events are used to monitor what happens in the system, making them perfect for test assertions.

## Core Testing Principles

### 1. Event Bus for Monitoring, Not Action

The event bus broadcasts notifications about completed actions:
- **Events as Test Assertions**: Verify that expected notifications were emitted
- **Past Tense Events**: `tile_created`, not `create_tile`
- **No Action Triggering**: Tests call services directly, then verify events

### 2. Component Interactions

```
Canvas ──────→ MapCache ──────→ EventBus
                  ↑                 ↑
                  │                 │
                  └──── Chat ───────┘
```

- **Canvas**: Only knows MapCache (no EventBus)
- **Chat**: Knows MapCache (for actions) and EventBus (for monitoring)
- **MapCache**: Performs actions, then emits notifications
- **Tests**: Call services directly, verify notifications were sent

## Test Organization

```
src/app/map/
├── TESTING.md (this file)
├── __tests__/
│   ├── test-providers.tsx      # Shared test providers and setup
│   ├── event-bus-helpers.ts    # Event bus testing utilities
│   ├── test-factories.ts       # Common test data factories
│   └── utils/                  # Test utilities and mocks
│       └── mockTileData.ts     # Mock tile data factory
├── Cache/
│   ├── __tests__/             # Cache integration tests
│   ├── State/__tests__/       # State management tests
│   ├── Handlers/__tests__/    # Business logic tests
│   └── Services/__tests__/    # Service layer tests
├── Canvas/
│   ├── __tests__/             # Canvas unit tests
│   └── base/                  # Base components (non-interactive)
│       └── __tests__/         # Base component tests
├── Chat/
│   └── __tests__/             # Chat unit tests
├── Hierarchy/
│   └── __tests__/             # Hierarchy unit tests
└── Services/
    └── EventBus/
        └── __tests__/         # Event bus tests
```

## Shared Test Infrastructure

### Test Providers (`src/app/map/__tests__/test-providers.tsx`)

All map components require the same set of providers for testing:

```typescript
export function MapTestProviders({ children, eventBus }: Props) {
  return (
    <EventBusProvider eventBus={eventBus}>
      <MapCacheProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MapCacheProvider>
    </EventBusProvider>
  );
}
```

### Event Bus Test Helpers

Common utilities for event bus testing:

```typescript
// Create a test event bus with recording capabilities
export function createTestEventBus() {
  const eventBus = createMockEventBus();
  return {
    eventBus,
    expectEvent: (type: string, payload?: any) => {
      expect(eventBus).toHaveEmittedEvent(type, payload);
    },
    clearEvents: () => {
      eventBus.emittedEvents.length = 0;
    }
  };
}
```

## Component Testing Strategies

### Cache Testing

Focus areas:
- State management and reducers
- Optimistic updates and rollback
- Event bus integration
- URL synchronization
- Server communication

See: `src/app/map/Cache/README.md` (Testing section)

### Canvas Testing

Focus areas:
- Tile rendering and spatial positioning
- Drag and drop operations call MapCache correctly
- View updates when MapCache state changes
- Coordinate system calculations
- Canvas does NOT interact with EventBus directly

See: `src/app/map/Canvas/__tests__/README.md`

### Chat Testing

Focus areas:
- Event-to-message translation
- Widget lifecycle management
- Command parsing and execution
- State derivation from event sequences

See: `src/app/map/Chat/TESTING.md`

### Hierarchy Testing

Focus areas:
- Tree structure rendering
- Navigation event emission
- Expand/collapse state management
- Path highlighting from events

See: `src/app/map/Hierarchy/__tests__/README.md`

## Event Flow Testing Patterns

### Pattern 1: Component Emits Event

```typescript
it('should emit navigation event when tile clicked', async () => {
  const { eventBus } = createTestEventBus();
  render(<Canvas />, { wrapper: MapTestProviders, eventBus });
  
  await userEvent.click(screen.getByTestId('tile-123'));
  
  expectEvent('map.navigation', { tileId: '123' });
});
```

### Pattern 2: Component Reacts to Event

```typescript
it('should update view when navigation event received', () => {
  const { eventBus } = createTestEventBus();
  render(<Hierarchy />, { wrapper: MapTestProviders, eventBus });
  
  eventBus.emit({
    type: 'map.navigation',
    payload: { tileId: '123' },
    source: 'test'
  });
  
  expect(screen.getByTestId('tile-123')).toHaveClass('selected');
});
```

### Pattern 3: Event Chain Verification

```typescript
it('should complete tile creation flow', async () => {
  const { eventBus, expectEvent } = createTestEventBus();
  render(<MapPage />, { wrapper: MapTestProviders, eventBus });
  
  // User action in chat
  await userEvent.type(screen.getByRole('textbox'), '/create Test Tile');
  await userEvent.keyboard('{Enter}');
  
  // Verify event chain
  expectEvent('chat.command_executed', { command: 'create' });
  expectEvent('map.tile_create_requested');
  expectEvent('map.tile_created');
  expectEvent('chat.operation_completed');
});
```

## Mocking Strategies

### MapCache Mock

Since all components depend on MapCache through the event bus:

```typescript
export const createMockMapCache = () => ({
  tiles: new Map(),
  center: 'root',
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
});
```

### Authentication Mock

```typescript
export const createMockAuth = (user = null) => ({
  user,
  isAuthenticated: !!user,
  login: vi.fn(),
  logout: vi.fn()
});
```

## Testing Best Practices

1. **Test Events, Not Implementation**: Verify what events are emitted/handled, not how
2. **Use Test IDs Consistently**: All interactive elements should have data-testid
3. **Clear Events Between Tests**: Prevent test pollution
4. **Mock Time When Needed**: For timestamp-sensitive operations
5. **Test Error Events**: Ensure error states emit appropriate events

## Running Tests

```bash
# Run all map tests
pnpm test src/app/map

# Run specific component tests
pnpm test src/app/map/Canvas
pnpm test src/app/map/Chat
pnpm test src/app/map/Hierarchy

# Watch mode for development
pnpm test:watch src/app/map

# Debug mode
pnpm test:debug src/app/map
```

## Why No Integration Tests?

Traditional integration tests verify that components work together correctly. In our event-driven architecture:

1. **Components don't know about each other**: They only know about events
2. **Event bus is the contract**: If components emit/handle the right events, they work together
3. **Unit tests cover integration**: By testing event emission and handling, we verify integration
4. **Real integration is in production**: The event bus itself is simple and battle-tested

This approach leads to:
- Faster test execution
- Better test isolation
- Easier debugging
- More maintainable tests