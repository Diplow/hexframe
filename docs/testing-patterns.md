# Testing Patterns Guide

## Overview

This guide documents the testing patterns and utilities available in the Hexframe codebase, with a focus on event bus integration and proper component isolation.

## Test Utilities

### 1. Event Bus Mocking (`/src/test-utils/event-bus.ts`)

```typescript
import { createMockEventBus } from '~/test-utils/event-bus';

const mockEventBus = createMockEventBus();

// Verify events
expect(mockEventBus).toHaveEmittedEvent('map.tile_created', { tileId: '123' });

// Clear events between tests
mockEventBus.emittedEvents.length = 0;
```

### 2. Integrated Test Providers (`/src/test-utils/providers.tsx`)

```typescript
import { TestProviders, createTestSetup } from '~/test-utils/providers';

// Option 1: Use TestProviders directly
const { getByText } = render(
  <TestProviders>
    <YourComponent />
  </TestProviders>
);

// Option 2: Use createTestSetup for more control
const { wrapper, eventBus, expectEvent } = createTestSetup();
const { result } = renderHook(() => useYourHook(), { wrapper });

// Assert on events
expectEvent('map.navigation', { tileId: 'abc' });
```

### 3. Event Bus Context (`/src/app/map/Context/event-bus-context.tsx`)

```typescript
import { useEventBus } from '~/app/map/Context/event-bus-context';

function YourComponent() {
  const eventBus = useEventBus();
  
  useEffect(() => {
    const unsubscribe = eventBus.on('map.tile_created', (event) => {
      console.log('Tile created:', event.payload);
    });
    return unsubscribe;
  }, [eventBus]);
}
```

## Testing Patterns

### Unit Tests with Event Bus

```typescript
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { createTestSetup } from '~/test-utils/providers';

describe('Component with Event Bus', () => {
  it('should emit events on user actions', async () => {
    const { wrapper, eventBus } = createTestSetup();
    
    const { getByRole } = render(<YourComponent />, { wrapper });
    
    // Perform action
    await userEvent.click(getByRole('button'));
    
    // Verify event was emitted
    expect(eventBus).toHaveEmittedEvent('your.event', { 
      expectedPayload: 'value' 
    });
  });
});
```

### Integration Tests

```typescript
describe('Cross-Component Communication', () => {
  it('should update other components via events', async () => {
    const { wrapper, eventBus } = createTestSetup({ 
      useRealEventBus: true // Use real EventBus for integration tests
    });
    
    const { getByTestId } = render(
      <div>
        <ComponentA />
        <ComponentB />
      </div>,
      { wrapper }
    );
    
    // Action in ComponentA should affect ComponentB via events
    await userEvent.click(getByTestId('component-a-button'));
    
    // Verify ComponentB received the update
    expect(getByTestId('component-b-status')).toHaveTextContent('Updated');
  });
});
```

### E2E Tests with Event Observation

```typescript
import { test, expect } from '../utils/event-bus-observer';

test('should track complete event flow', async ({ page, eventBusObserver }) => {
  await page.goto('/map');
  await eventBusObserver.startObserving();
  
  // Perform user actions
  await page.click('[data-testid="tile"]');
  
  await eventBusObserver.stopObserving();
  
  // Verify event sequence
  const events = eventBusObserver.getEvents();
  expect(events[0].type).toBe('map.tile_clicked');
  expect(events[1].type).toBe('map.navigation');
  expect(events[2].type).toBe('map.cache_updated');
});
```

## Best Practices

### 1. Event Naming Convention

Use dot notation with clear namespaces:
- `map.tile_created` - Map domain, tile creation
- `auth.login_success` - Auth domain, login success
- `chat.message_sent` - Chat domain, message sent

### 2. Event Payload Structure

Keep payloads minimal and typed:
```typescript
interface TileCreatedEvent extends AppEvent {
  type: 'map.tile_created';
  payload: {
    tileId: string;
    parentId?: string;
    coordinates: HexCoordinates;
  };
}
```

### 3. Test Organization

- Mock event bus for unit tests (isolation)
- Real event bus for integration tests (interaction)
- E2E observer for full flow verification

### 4. Avoid Direct State Manipulation

Instead of:
```typescript
// ❌ Don't manipulate state directly
component.setState({ tiles: newTiles });
```

Do:
```typescript
// ✅ Emit events and let components react
eventBus.emit({
  type: 'map.tiles_updated',
  source: 'test',
  payload: { tiles: newTiles }
});
```

### 5. Clean Up in Tests

Always clean up event listeners and clear event history:
```typescript
afterEach(() => {
  mockEventBus.emittedEvents.length = 0;
  mockEventBus.emit.mockClear();
});
```

## Common Patterns

### Testing Loading States

```typescript
it('should show loading state during async operations', async () => {
  const { wrapper, eventBus } = createTestSetup();
  
  const { getByTestId } = render(<AsyncComponent />, { wrapper });
  
  // Trigger async operation
  await userEvent.click(getByTestId('load-button'));
  
  // Verify loading event
  expect(eventBus).toHaveEmittedEvent('data.loading_started');
  
  // Wait for completion
  await waitFor(() => {
    expect(eventBus).toHaveEmittedEvent('data.loading_completed');
  });
});
```

### Testing Error Handling

```typescript
it('should emit error events on failure', async () => {
  const { wrapper, eventBus } = createTestSetup();
  
  // Mock API to fail
  server.use(
    rest.post('/api/tiles', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );
  
  const { getByRole } = render(<TileCreator />, { wrapper });
  
  await userEvent.click(getByRole('button', { name: 'Create' }));
  
  expect(eventBus).toHaveEmittedEvent('map.tile_creation_failed', {
    error: expect.objectContaining({
      message: expect.any(String)
    })
  });
});
```

### Testing Side Effects

```typescript
it('should trigger side effects via events', async () => {
  const { wrapper, eventBus } = createTestSetup();
  
  render(<MapCache />, { wrapper });
  
  // Simulate an external event
  eventBus.emit({
    type: 'auth.logout',
    source: 'test',
    payload: {}
  });
  
  // Verify cache cleared itself
  await waitFor(() => {
    expect(eventBus).toHaveEmittedEvent('map.cache_cleared');
  });
});
```

## Migration Guide

When refactoring existing tests to use event bus:

1. Replace prop drilling with event bus
2. Convert callbacks to event emissions
3. Replace direct state checks with event assertions
4. Use TestProviders instead of manual provider setup

### Before:
```typescript
const onTileClick = vi.fn();
render(<Tile onClick={onTileClick} />);
click(tile);
expect(onTileClick).toHaveBeenCalled();
```

### After:
```typescript
const { wrapper, eventBus } = createTestSetup();
render(<Tile />, { wrapper });
click(tile);
expect(eventBus).toHaveEmittedEvent('map.tile_clicked');
```

## Debugging Tips

1. Enable console logging in tests:
   ```typescript
   debugLogger.setOptions({ enableConsole: true });
   ```

2. View all emitted events:
   ```typescript
   console.log('Events:', mockEventBus.emittedEvents);
   ```

3. Use event bus observer in E2E tests for full visibility

4. Check event listener count:
   ```typescript
   console.log('Listeners:', eventBus.getListenerCount('map.*'));
   ```