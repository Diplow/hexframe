# Chat Component Testing

## Overview

This document details the testing approach for the Chat component. The testing strategy follows the map-wide patterns documented in [`src/app/map/TESTING.md`](../TESTING.md).

## Core Testing Principle: Notification-Only Events

The Chat component follows the notification-only event pattern:

1. **Events are Past Tense**: `tile_created`, not `create_tile`
2. **Events are Notifications**: They describe what happened, not what should happen
3. **Actions Use MapCache**: Chat triggers actions by calling MapCache directly
4. **Chat Listens to ALL Events**: Including notifications from its own actions

This means tests should:
- Call MapCache methods directly to trigger actions
- Verify notification events are emitted after actions complete
- Check that Chat updates its UI based on received notifications

## Test Structure

```
Chat/
├── __tests__/
│   └── ChatPanel.test.tsx
├── Cache/__tests__/
│   ├── reducers.test.ts
│   └── selectors.test.ts
├── Input/__tests__/
│   ├── Input.test.tsx
│   ├── useCommandHandling.test.ts
│   └── chatInputService.test.ts
├── Messages/__tests__/
│   ├── UnifiedTimeline.test.tsx
│   ├── WidgetManager.test.tsx
│   └── useAuthStateCoordinator.test.ts
└── Widgets/__tests__/
    ├── TileWidget.test.tsx
    ├── CreationWidget.test.tsx
    ├── LoginWidget.test.tsx
    └── WidgetContainer.test.tsx
```

## Key Testing Areas

### 1. Event-to-UI Translation

The Chat component's primary responsibility is translating map events (notifications about completed actions) into chat messages and widgets:

```typescript
// Test that map navigation events create appropriate chat messages
it('should display navigation message when map.navigation event occurs', async () => {
  const { eventBus } = createTestEventBus();
  render(<ChatPanel />, { wrapper: MapTestProviders });
  
  // Emit notification about completed navigation (past tense!)
  eventBus.emit({
    type: 'map.navigation',  // NOT 'map.navigate' - this is a notification
    payload: { toCenterName: 'Project Hub' },
    source: 'map_cache'
  });
  
  await waitFor(() => {
    expect(screen.getByText('Navigated to Project Hub')).toBeInTheDocument();
  });
});
```

### 2. Widget Lifecycle

Widgets are created from events and interact with the Canvas through callbacks:

```typescript
// Test widget creation from tile selection
it('should create tile widget on tile_selected event', async () => {
  const { eventBus } = createTestEventBus();
  render(<WidgetManager />, { wrapper: MapTestProviders });
  
  eventBus.emit({
    type: 'map.tile_selected',
    payload: { tileId: '123', tileData: { name: 'Test Tile' } },
    source: 'canvas'
  });
  
  await waitFor(() => {
    expect(screen.getByTestId('tile-widget')).toBeInTheDocument();
  });
});
```

### 3. Command Processing

The Input component processes user commands and triggers actions through MapCache, NOT through events:

```typescript
// Test slash command execution
it('should process command and call MapCache directly', async () => {
  const { eventBus, expectEvent } = createTestEventBus();
  const mapCache = createMockMapCache();
  render(<Input />, { wrapper: MapTestProviders, mapCache });
  
  await userEvent.type(screen.getByRole('textbox'), '/create New Tile{Enter}');
  
  // Command calls MapCache directly, not via events
  expect(mapCache.createTile).toHaveBeenCalledWith({
    name: 'New Tile'
  });
  
  // Later, we verify the notification event was received
  expectEvent('map.tile_created', {
    tileName: 'New Tile'
  });
});
```

### 4. State Management

The useChatState hook manages the event log and derives UI state internally:

```typescript
// Test state derivation from events
describe('useChatState', () => {
  it('should process events and expose messages through domain operations', () => {
    const { eventBus } = createTestEventBus();
    
    render(<ChatPanel />, { wrapper: TestProviders, mockEventBus: eventBus });
    
    // Emit an event
    eventBus.emit({
      type: 'map.tile_created',
      source: 'map_cache',
      payload: { tileName: 'New Tile' }
    });
    
    // Verify the message appears
    expect(screen.getByText('Created "New Tile"')).toBeInTheDocument();
  });
});
```

## Chat-Specific Test Utilities

### Event Factories

```typescript
export const createChatEvent = (overrides?: Partial<ChatEvent>): ChatEvent => ({
  id: `event-${Date.now()}`,
  type: 'user_message',
  payload: { content: 'Test message' },
  timestamp: new Date(),
  actor: 'user',
  ...overrides
});

export const createWidget = (overrides?: Partial<Widget>): Widget => ({
  id: `widget-${Date.now()}`,
  type: 'tile',
  props: {},
  timestamp: new Date(),
  ...overrides
});
```

### Mock Helpers

```typescript
// Mock for testing widget-canvas interactions
export const createMockCanvasCallbacks = () => ({
  onTileCreate: vi.fn().mockResolvedValue({ id: 'new-tile' }),
  onTileUpdate: vi.fn().mockResolvedValue(true),
  onTileDelete: vi.fn().mockResolvedValue(true),
  onNavigate: vi.fn()
});
```

## Common Test Patterns

### Testing Event Chains

```typescript
it('should complete tile creation flow', async () => {
  const { eventBus, expectEvent, clearEvents } = createTestEventBus();
  const mapCache = createMockMapCache();
  
  render(
    <ChatPanel />,
    { wrapper: MapTestProviders, mapCache }
  );
  
  // User types create command
  await userEvent.type(screen.getByRole('textbox'), '/create Test Tile{Enter}');
  
  // Verify creation widget appears
  await waitFor(() => {
    expect(screen.getByTestId('creation-widget')).toBeInTheDocument();
  });
  
  // Complete creation
  await userEvent.click(screen.getByText('Create'));
  
  // Verify MapCache was called directly (NOT via events)
  expect(mapCache.createTile).toHaveBeenCalledWith({
    name: 'Test Tile'
  });
  
  // Verify notification event about completed creation
  expectEvent('map.tile_created', {
    tileName: 'Test Tile'
  });
  
  // Chat shows completion message after receiving the notification
  await waitFor(() => {
    expect(screen.getByText('Created "Test Tile"')).toBeInTheDocument();
  });
});
```

### Testing Error Scenarios

```typescript
it('should show error widget when operation fails', async () => {
  const { eventBus } = createTestEventBus();
  render(<ChatPanel />, { wrapper: MapTestProviders });
  
  eventBus.emit({
    type: 'chat.error_occurred',
    payload: {
      error: { message: 'Failed to create tile: Name already exists' },
      context: 'tile_creation'
    },
    source: 'map_cache'
  });
  
  await waitFor(() => {
    const errorWidget = screen.getByTestId('error-widget');
    expect(errorWidget).toHaveTextContent('Failed to create tile: Name already exists');
  });
});
```

## Running Chat Tests

```bash
# Run all Chat tests
pnpm test src/app/map/Chat

# Run specific test suites
pnpm test src/app/map/Chat/Cache
pnpm test src/app/map/Chat/Widgets

# Watch mode for TDD
pnpm test:watch src/app/map/Chat

# Debug a specific test
pnpm test:debug src/app/map/Chat/__tests__/ChatPanel.test.tsx
```