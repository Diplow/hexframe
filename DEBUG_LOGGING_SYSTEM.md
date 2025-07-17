# Debug Logging System

## Overview

The debug logging system has been updated to:
1. Store the last 2000 logs in memory (configurable)
2. Disable console logging by default
3. Provide smart display modes via `/debug` commands
4. Group consecutive identical logs in succinct mode

## Key Features

### 1. Log Storage
- Always stores logs in memory buffer (last 2000 by default)
- Buffer size is configurable via `debugLogger.setOptions({ maxBufferSize: 2000 })`
- Logs are stored even when console logging is disabled

### 2. Display Modes

#### Full Mode (`/debug/full`)
- Shows complete log entries with timestamps, prefixes, messages, and data
- Example:
  ```
  13:45:23 [DEBUG][RENDER][CANVAS] DynamicMapCanvas render | {"center":"tile-123","itemCount":42}
  ```

#### Succinct Mode (`/debug/succinct`)
- Groups consecutive logs with the same prefix (regardless of message content or data)
- Shows only prefixes for repeated logs with count
- Includes short identifiers (max 30 chars) to provide context
- Example:
  ```
  (5) 13:45:20 [DEBUG][RENDER][CANVAS] coord:tile-123-4 [13:45:20 - 13:45:24]
  13:45:25 [DEBUG][API] /api/map/tiles
  (3) 13:45:26 [DEBUG][EVENTBUS] map.tile_selected [13:45:26 - 13:45:28]
  ```
- Note: Logs are grouped by prefix only, so different messages with the same prefix will be grouped together

##### Identifiers by Log Type:
- **Canvas Render**: Shows coordinates (`coord:`, `center:`, `tile:`, `frame:`) or item count
- **API**: Shows API name and relevant arguments:
  - tRPC: `user.getUserMap userId` (API path + input keys)
  - Auth: `auth.sign-in` (extracted action from endpoint)
  - HTTP: `/api/health` (endpoint path)
  - Responses: `user.getUserMap 200 125ms` (API + status + duration)
- **Map Cache Handlers**: Shows handler name and main argument (e.g., `NavigationHandler.navigateToItem db-123`)
- **EventBus**: Shows event type (e.g., `map.tile_selected`)
- **Chat Render**: Shows component type (e.g., `Input component rendered`) or actor
- **Hierarchy Render**: Differentiates components:
  - `ParentHierarchy tile-id` for ParentHierarchy components
  - `UserProfileTile username` for UserProfileTile components
  - `DynamicHierarchyTile coord-id` for DynamicHierarchyTile components

##### Fallback Behavior:
- If no specific identifier is found, uses text before "|" in the message (max 30 chars)
- All identifiers are limited to 30 characters maximum

### 3. Chat Commands

- `/debug` - Show available debug commands
- `/debug/full` - Display available full mode options
  - `/debug/full/10` - Display last 10 logs in full mode
  - `/debug/full/25` - Display last 25 logs in full mode
  - `/debug/full/50` - Display last 50 logs in full mode
  - `/debug/full/100` - Display last 100 logs in full mode
  - `/debug/full/all` - Display all logs in full mode
- `/debug/succinct` - Display available succinct mode options
  - `/debug/succinct/10` - Display last 10 log groups in succinct mode
  - `/debug/succinct/25` - Display last 25 log groups in succinct mode
  - `/debug/succinct/50` - Display last 50 log groups in succinct mode
  - `/debug/succinct/100` - Display last 100 log groups in succinct mode
  - `/debug/succinct/all` - Display all log groups in succinct mode
- `/debug/clear` - Clear the debug log buffer
- `/debug/console` - Toggle console logging on/off

### 4. Console Logging
- Disabled by default to reduce console noise
- Can be enabled via `/debug/console` command
- Can be programmatically controlled: `debugLogger.setOptions({ enableConsole: true })`

## Implementation Details

### Log Entry Structure
```typescript
interface DebugLogEntry {
  timestamp: number;
  prefix: string;      // e.g., "[DEBUG][RENDER][CANVAS]"
  message: string;
  data?: Record<string, unknown>;
}
```

### Grouped Log Structure (Succinct Mode)
```typescript
interface GroupedLogEntry {
  timestamp: number;
  prefix: string;
  message: string;
  data?: Record<string, unknown>;
  count: number;           // Number of consecutive identical logs
  firstTimestamp: number;  // Start of group
  lastTimestamp: number;   // End of group
}
```

### Usage Example
```typescript
import { loggers } from '~/lib/debug/debug-logger';

// Log with pre-configured loggers
loggers.render.canvas('Component rendered', { props: {...} });
loggers.api('API call made', { endpoint: '/api/user' });
loggers.mapCache.handlers('Cache updated', { region: 'center' });

// Or create custom logger
const myLogger = debugLogger.createLogger(['DEBUG', 'CUSTOM']);
myLogger('Custom log message', { customData: 123 });
```

## Benefits

1. **Performance**: No console output by default, reducing performance impact
2. **Debugging**: Access to recent logs via chat commands for troubleshooting
3. **Clarity**: Succinct mode reduces noise from repeated logs
4. **Flexibility**: Can toggle console logging when needed
5. **Integration**: Works seamlessly with existing chat system