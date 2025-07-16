# Chat Component Architecture

## Overview

The Chat component serves as a conversational interface layer to the Canvas system. It follows an event-driven architecture where all actions create immutable events, and the UI state (messages and widgets) is derived from these events.

## Core Mental Model

**Components interact through MapCache and EventBus**

```
Canvas ──────→ MapCache ──────→ EventBus
                  ↑                 ↑
                  │                 │
                  └──── Chat ───────┘
```

### Key Architectural Principles

1. **No Direct Component Communication**: Canvas and Chat don't know about each other
2. **MapCache is Shared Infrastructure**: Both Canvas and Chat use MapCache for state
3. **EventBus is Notification-Only**: Events describe what happened, not what should happen
4. **Chat Treats Own Actions Equally**: Chat listens to ALL events, including those from its own actions

### Information Flow Patterns

#### Pattern 1: Chat Mutates via MapCache
```
Chat Widget → MapCache.createTile() → State Change → Event Notification
```
*Example: User clicks "Create Tile" widget → mapCache.createTile() → "tile_created" event*

#### Pattern 2: Chat Reacts to ALL Events
```
Any Component → MapCache → Event Bus → Chat Display Update
```
*Example: Canvas drag → MapCache.moveTile() → "tile_moved" event → Chat shows message*

**Critical Insight**: Chat should NOT anticipate its own actions. It waits for the event notification like any other listener.

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

The Chat listens to the event bus for two types of events:
1. **Notification events** - Past-tense notifications about what happened
2. **Request events** - UI coordination requests from Canvas

```typescript
// MapCache performs action, then notifies
function navigateToCenter(center: string) {
  // 1. Update state (the actual action)
  updateCacheState(center);
  
  // 2. Notify about what happened (past tense)
  context.eventBus.emit({
    type: 'map.navigation',  // NOT 'map.navigate'
    source: 'map_cache',
    payload: { 
      fromCenterId: previousCenter,
      toCenterId: center, 
      toCenterName: getTileName(center) 
    }
  });
}

// Chat listens to notifications and updates display
useEffect(() => {
  const unsubscribe = eventBus.on('map.*', (event) => {
    // Validate and transform the notification
    const chatEvent = validateAndTransformMapEvent(event);
    if (chatEvent) {
      dispatch(chatEvent);  // Update chat display
    }
  });
  
  return unsubscribe;
}, [eventBus]);

// Events are notifications about completed actions
function validateAndTransformMapEvent(mapEvent: AppEvent): ChatEvent | null {
  switch (mapEvent.type) {
    case 'map.navigation':  // Something WAS navigated
      return {
        type: 'navigation',
        actor: 'system',
        payload: {
          toTileId: mapEvent.payload.toCenterId,
          toTileName: mapEvent.payload.toCenterName
        }
      };
    case 'map.tiles_swapped':  // Tiles WERE swapped
      return {
        type: 'operation_completed',
        actor: 'system',
        payload: {
          operation: 'swap',
          message: `Swapped "${mapEvent.payload.tile1Name}" with "${mapEvent.payload.tile2Name}"`
        }
      };
    // All events describe what already happened
  }
}

// Chat also handles request events from Canvas
function handleRequestEvents(event: AppEvent): void {
  switch (event.type) {
    case 'map.edit_requested':  // Canvas requests edit widget
      dispatch({
        type: 'tile_selected',
        actor: 'system',
        payload: {
          tileId: event.payload.tileId,
          tileData: event.payload.tileData,
          openInEditMode: true  // Automatically open in edit mode
        }
      });
      break;
      
    case 'map.delete_requested':  // Canvas requests delete confirmation
      dispatch({
        type: 'operation_started',
        actor: 'user',
        payload: {
          operation: 'delete',
          tileId: event.payload.tileId,
          data: {
            tileName: event.payload.tileName
          }
        }
      });
      break;
  }
}
```

### Request Event Handling

When Canvas needs text input or user confirmation, it sends request events:

- **Edit Request**: Canvas context menu → `map.edit_requested` → Chat shows edit widget
- **Delete Request**: Canvas context menu → `map.delete_requested` → Chat shows confirmation

This pattern allows Canvas to leverage Chat's superior text handling capabilities while maintaining loose coupling.

## Complex Flow Example: Tile Creation via Chat

This example demonstrates the notification-only event pattern:

### Scenario
User creates a new tile through the chat interface.

### Flow

1. **User Types Command in Chat**
   ```typescript
   // User: "/create My New Tile"
   ```

2. **Chat Processes Command and Calls MapCache**
   ```typescript
   // Chat command handler
   const result = await mapCache.createTile({
     name: "My New Tile",
     coordId: targetCoordId
   });
   ```

3. **MapCache Creates Tile and Emits Notification**
   ```typescript
   // Inside MapCache
   const tile = await database.createTile(data);
   
   // Notify about what happened (past tense!)
   eventBus.emit({
     type: 'map.tile_created',  // NOT 'map.create_tile'
     source: 'map_cache',
     payload: { 
       tileId: tile.id,
       tileName: tile.name,
       coordId: tile.coordId
     }
   });
   ```

4. **Chat Receives Its Own Notification**
   ```typescript
   // Chat listens to ALL events, including from its own actions
   eventBus.on('map.tile_created', (event) => {
     // Show success message
     dispatch({
       type: 'operation_completed',
       payload: {
         operation: 'create',
         message: `Created "${event.payload.tileName}"`
       }
     });
   });
   ```

### Key Architectural Benefits Demonstrated

1. **No Special Cases**: Chat treats its own operations identically to others
2. **Single Action Path**: Creation only happens through MapCache
3. **Consistent Notifications**: All components learn about changes the same way
4. **No Anticipation**: Chat doesn't assume success - it waits for confirmation

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

## Testing Strategy

The Chat component testing approach is documented in [TESTING.md](./TESTING.md).

## Future Integration Points

1. **Backend Chat Domain** - Events can be persisted/streamed
2. **AI Integration** - AI responses as events in the same log
3. **Collaboration** - Real-time event sharing between users
4. **Undo/Redo** - Event log enables time travel