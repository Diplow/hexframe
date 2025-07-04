# Chat Component Architecture

## Overview

The Chat component serves as a conversational interface layer to the Canvas system. It follows an event-driven architecture where all actions create immutable events, and the UI state (messages and widgets) is derived from these events.

## Core Mental Model

**Canvas as Core System, Chat as Interface Layer**

```
MapCache (tile data source)
    ↓
Canvas (spatial UI, coordinate system, core operations)
    ↓ (exposes operations via callbacks)
Chat (conversational interface layer)
    ↓ (renders operations as widgets)
Widgets (UI adapters for canvas operations)
```

## Architecture Components

### 1. Event-Driven State Management

All interactions create events that form an immutable log:

```typescript
interface ChatEvent {
  id: string;
  type: 'user_message' | 'system_message' | 'tile_selected' | 
        'navigation' | 'operation_started' | 'operation_completed' |
        'auth_required' | 'error_occurred';
  payload: unknown;
  timestamp: Date;
  actor: 'user' | 'system' | 'assistant';
}
```

UI state is derived from events:

```typescript
interface ChatUIState {
  events: ChatEvent[];          // The immutable log
  activeWidgets: Widget[];      // Computed from events
  visibleMessages: Message[];   // Computed from events
}
```

### 2. Widget System

Widgets use composition pattern for different capabilities:

```typescript
// Base interface for all widgets
interface BaseWidgetProps {
  id: string;
  onClose?: () => void;
  isExpanded?: boolean;
  isLoading?: boolean;
  error?: { message: string };
  timestamp?: Date;
  priority?: 'info' | 'action' | 'critical';
}

// Capability interfaces
interface CanvasOperationProps {
  tile?: TileData;
  coordId?: string;
  onTileUpdate?: (id: string, data: any) => void;
  onTileCreate?: (coordId: string, data: any) => void;
  onTileDelete?: (id: string) => void;
}

// Composed widget types
type PreviewWidgetProps = BaseWidgetProps & CanvasOperationProps & {
  mode: 'view' | 'edit';
  content: string;
};
```

### 3. Event Bus Integration

MapCache and ChatCache communicate through a shared event bus:

```typescript
// MapCache emits events
function swapTiles(tile1Id: string, tile2Id: string) {
  // Perform swap operation...
  
  // Emit domain event
  context.eventBus.emit({
    type: 'map.tiles_swapped',
    source: 'map_cache',
    payload: { tile1Id, tile2Id, tile1Name, tile2Name }
  });
}

// ChatCache listens and converts to chat events
useEffect(() => {
  const unsubscribe = eventBus.on('map.tiles_swapped', (event) => {
    dispatch(createChatEvent({
      type: 'operation_completed',
      actor: 'system',
      payload: {
        operation: 'swap',
        message: `Swapped "${event.payload.tile1Name}" with "${event.payload.tile2Name}"`
      }
    }));
  });
  
  return unsubscribe;
}, [eventBus]);
```

## Complex Flow Example: Cross-User Tile Import

This example demonstrates how the architecture handles complex multi-step operations:

### Scenario
User wants to import a tile (and its descendants) from another user's map to their own.

### Flow

1. **User Opens Preview of External Tile**
   ```typescript
   EventBus.emit({
     type: 'map.tile_selected',
     payload: { tileId, tileData, userId: 'other-user' }
   })
   ```
   → Chat shows PreviewWidget with import capability

2. **User Navigates to Own Map (Preview Persists)**
   ```typescript
   EventBus.emit({
     type: 'map.navigation',
     payload: { newCenter, userId: 'current-user' }
   })
   ```
   → Import preview widget remains open

3. **User Drags from Widget to Canvas**
   - PreviewWidget provides drag source (tile icon)
   - Canvas shows drop zones on empty tiles
   - On drop, Canvas validates and initiates import

4. **Import Operation Executes**
   ```typescript
   EventBus.emit({
     type: 'map.import_requested',
     payload: { 
       sourceTileId, 
       sourceUserId, 
       targetCoordId,
       includeDescendants: true 
     }
   })
   ```

5. **Completion**
   ```typescript
   EventBus.emit({
     type: 'map.import_completed',
     payload: { importedTiles: [...], rootCoordId }
   })
   ```
   → Chat shows success message and closes import widget

### Key Architectural Benefits Demonstrated

1. **Event-driven coordination** - Complex flow handled through events
2. **Widget persistence** - Import widget survives navigation
3. **Loose coupling** - Systems coordinate without direct dependencies
4. **Composable capabilities** - Import capability added to preview widget

## Performance Considerations

### Virtual Scrolling
For large chat histories, use react-window:

```typescript
<VariableSizeList
  height={600}
  itemCount={items.length}
  itemSize={getItemSize}
  overscanCount={5}
>
  {({ index, style }) => (
    <div style={style}>
      {renderItem(items[index])}
    </div>
  )}
</VariableSizeList>
```

### Event Management
- Event pagination: Load in chunks
- Memoized selectors for derived state
- Event compaction for old events

## UI Design Principles

### Canvas Widget Indicators
Canvas widgets should clearly indicate they modify the map:
- Distinct border color/style
- "Modifies Map" badge or icon
- Consistent visual language
- Accessibility considerations (not just color)

## Future Integration Points

1. **Backend Chat Domain** - Events can be persisted/streamed
2. **AI Integration** - AI responses as events in the same log
3. **Collaboration** - Real-time event sharing between users
4. **Undo/Redo** - Event log enables time travel