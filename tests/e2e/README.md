# E2E Tests with Event Bus and Log Observation

## Overview

These E2E tests use Playwright with custom utilities to observe and assert on event bus events and debug logs during test execution. This approach allows us to verify not just UI behavior, but also the internal event flow and system state.

## Key Features

### Event Bus Observer

The `EventBusObserver` class (`utils/event-bus-observer.ts`) provides:

- **Event Tracking**: Captures all events emitted through the event bus
- **Log Monitoring**: Intercepts debug logger calls to track system behavior
- **Assertions**: Custom assertions for events and logs
- **Performance Tracking**: Analyze event timing and flow

### Usage Example

```typescript
import { test, expect } from './utils/event-bus-observer';

test('should emit navigation events', async ({ page, eventBusObserver }) => {
  // Start observing
  await eventBusObserver.startObserving();
  
  // Perform actions
  await page.click('[data-testid="hex-tile"]');
  
  // Stop and analyze
  await eventBusObserver.stopObserving();
  
  // Assert on events
  eventBusObserver.expectEvent('map.navigation', { tileId: '123' });
  
  // Assert on logs
  eventBusObserver.expectLog('NAV', 'Navigating to item');
});
```

## Test Structure

### Setup
1. Navigate to the page under test
2. Start the event bus observer
3. Perform test actions
4. Stop observing and make assertions

### Available Assertions

- `expectEvent(type, payload?)` - Assert an event was emitted
- `expectNoEvent(type)` - Assert an event was NOT emitted
- `expectLog(prefix, pattern)` - Assert a log was recorded
- `getEventsByType(type)` - Get all events of a specific type
- `getLogsByPrefix(prefix)` - Get all logs with a prefix

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode for debugging
pnpm test:e2e:ui

# Run a specific test
pnpm test:e2e map-navigation-events.spec.ts
```

## Benefits

1. **Complete Visibility**: See the full event flow during user interactions
2. **Performance Insights**: Measure time between related events
3. **Debug Information**: Access to debug logs helps understand failures
4. **Integration Testing**: Verify components communicate correctly via events
5. **No Mocking Required**: Tests run against the real application

## Writing New Tests

When writing E2E tests that observe events:

1. Use the extended `test` from `utils/event-bus-observer`
2. Start observing before actions that trigger events
3. Stop observing before making assertions
4. Use semantic event types and clear assertions
5. Consider event timing for performance tests

## Common Event Patterns

### Navigation
- `map.navigation` - User navigates to a new tile
- `map.cache_updated` - Cache updates after navigation

### Tile Operations
- `map.tile_created` - New tile created
- `map.tile_updated` - Tile data modified
- `map.tiles_swapped` - Tiles swapped via drag-and-drop
- `map.tile_expanded` - Tile expanded to show children

### Authentication
- `auth.login` - User logs in
- `auth.logout` - User logs out
- `auth.session_expired` - Session expires

### Chat
- `chat.message_sent` - User sends a message
- `chat.message_received` - Message received from server