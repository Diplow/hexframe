# Map Application Architecture

## Overview

The map application provides a single dynamic route (`/map`) with full JavaScript interactivity, client-side caching, and real-time features. The architecture has been simplified from the previous dual-route approach to focus on delivering the best interactive experience.

## Core Architectural Principles

### 1. Single-Route Dynamic Architecture

The application provides a unified dynamic experience:

- **Dynamic Route (`/map`)**: Full client-side interactivity with caching and real-time features
- **Base Components**: Reusable components (`BaseFrame`, `BaseTileLayout`) for rendering without interactivity when needed

### 2. Component Organization Strategy

**Unified Component Library**: All components live within the `/map` route hierarchy, with base components extracted for reusability in non-interactive contexts (e.g., loading states).

**Shared Business Logic**: Core business logic (domains, utilities) is centralized and shared across all components to maintain consistency.

**Focused Development**: Single architecture allows focused development on interactive features while maintaining clean component boundaries.

### 3. Event-Driven Communication

**Event Bus Pattern**: The map uses a shared event bus for cross-system communication, enabling loose coupling between components like MapCache and ChatCache.

```typescript
interface EventBusService {
  emit(event: AppEvent): void;
  on(eventType: string, listener: (event: AppEvent) => void): () => void;
}

// Event namespaces
// map.*   - Map operations (tile CRUD, navigation, selection)
// chat.*  - Chat operations (messages, widgets)
// auth.*  - Authentication events
// sync.*  - Synchronization events
```

The Event Bus implementation is located in `/map/Services/EventBus/`.

## Major Components

### 1. MapCache (`/map/Cache`)

The central data management system that handles all map data operations, caching, and synchronization. It serves both the Canvas and Chat components.

**Key Features**:
- Region-based hierarchical loading
- Optimistic updates with rollback
- Event bus integration for cross-component communication
- URL synchronization for shareable views

See [Cache/ARCHITECTURE.md](./Cache/ARCHITECTURE.md) for detailed architecture.

### 2. Canvas (`/map/Canvas`)

The visual rendering layer responsible for the hexagonal map interface and tile interactions.

**Key Features**:
- Hierarchical component structure (Canvas → Frame → Tile)
- Centralized action management for performance
- Drag-and-drop system with optimistic updates
- Context menu system

See [Canvas/ARCHITECTURE.md](./Canvas/ARCHITECTURE.md) for detailed architecture.

### 3. Chat (`/map/Chat`)

The conversational interface layer that provides an alternative way to interact with the map through commands and messages.

**Key Features**:
- Event-driven state management
- Widget system for complex interactions
- Command processing
- Real-time event translation

See [Chat/ARCHITECTURE.md](./Chat/ARCHITECTURE.md) for detailed architecture.

### 4. Hierarchy (`/map/Hierarchy`)

The navigation control that shows the hierarchical path from the root to the current tile.

**Key Features**:
- Breadcrumb-style navigation
- Quick access to parent tiles
- Visual hierarchy representation

## State Management Strategy

### URL-First State Management

The application prioritizes URL parameters for shareable and bookmarkable state:

- **Expansion state**: Which tiles are expanded/collapsed
- **Focus state**: Current viewport center
- **Scale state**: Zoom level
- **Filter state**: Applied filters and search parameters

### Hierarchical State Layers

1. **URL State** (highest priority): Shareable, SEO-friendly, persistent across sessions
2. **localStorage State**: User preferences and interaction modes
3. **Component State**: Temporary UI state (drag operations, dialogs, loading states)
4. **Cache State**: Server data with background synchronization

## Page Layer Architecture

### Page Layer (`page.tsx`)

**Responsibility**: Server-side data fetching, URL parameter parsing, initial data formatting

- Fetches map data via tRPC
- Validates and processes URL parameters
- Renders appropriate canvas component based on requirements
- Handles initial focus and redirection logic

## Communication Layer (Event Bus)

The event bus serves a **dual purpose** in the application:
1. **Notification Events**: Broadcast what has happened (most common)
2. **Request Events**: Ask another component to perform an action (UI coordination)

### Event Types and Usage

#### 1. Notification Events (90% of events)

**Events describe the past**:
- ✅ `map.tile_created` - "A tile was created"
- ✅ `auth.logged_in` - "User logged in"
- ✅ `map.tiles_swapped` - "Tiles were swapped"

**Flow**: Component → Service → State Change → Notification Event

```typescript
// Direct action, then notification
const tile = await mapCache.createTile(data);
eventBus.emit({
  type: 'map.tile_created',  // Past tense!
  source: 'map_cache',
  payload: { tileId: tile.id, tileName: tile.name }
});
```

#### 2. Request Events (10% of events)

**Events request UI coordination**:
- ✅ `map.edit_requested` - "Canvas asks Chat to show edit widget"
- ✅ `map.delete_requested` - "Canvas asks Chat to show delete confirmation"

**Flow**: Component A → Request Event → Component B → UI Action

```typescript
// Canvas requests Chat to handle user input
eventBus.emit({
  type: 'map.edit_requested',  // Request form
  source: 'canvas',
  payload: { tileId, tileData }
});
```

### Why Request Events?

Request events are justified when:
- One component has capabilities another lacks (Chat handles text input better than Canvas)
- Direct coupling would violate component boundaries
- UI coordination requires cross-component interaction
- The alternative would be awkward shared state or direct dependencies

### How Components Interact

```
Canvas ──────→ MapCache ──────→ EventBus
    │             ↑                 ↑
    │             │                 │
    └─(requests)─→└──── Chat ───────┘
```

**Component Knowledge**:
- **Canvas**: Knows MapCache (for data) and can emit request events
- **Chat**: Knows MapCache (for mutations) AND EventBus (for all events)
- **MapCache**: Only knows EventBus (to notify about changes)
- **EventBus**: Knows nothing (pure message broker)

### Implementation Patterns

```typescript
// Notification Event (after action completes)
function swapTiles(tile1Id: string, tile2Id: string) {
  const result = performSwapOperation(tile1Id, tile2Id);
  updateCacheState(result);
  
  eventBus.emit({
    type: 'map.tiles_swapped',  // Past tense - notification
    source: 'map_cache',
    payload: { tile1Id, tile2Id }
  });
}

// Request Event (asking for UI action)
function handleEditClick(tileData: TileData) {
  eventBus.emit({
    type: 'map.edit_requested',  // Request form
    source: 'canvas',
    payload: { 
      tileId: tileData.id,
      tileData,
      openInEditMode: true 
    }
  });
}
```

### Benefits of This Dual Approach

1. **Flexibility**: Supports both data flow and UI coordination
2. **Clear Intent**: Event names clearly indicate notifications vs requests
3. **Component Isolation**: Canvas and Chat remain decoupled
4. **Single Communication Channel**: All cross-component communication goes through event bus
5. **Testability**: Both patterns are easy to test and mock

## Event Validation with Zod

To ensure type safety and prevent runtime errors from malformed events, the system uses Zod schemas for event validation. This provides:

**Benefits**:
- **Runtime Type Safety**: Events are validated before processing
- **Clear Contracts**: Event schemas serve as documentation
- **Error Prevention**: Invalid events are caught early
- **Better Developer Experience**: TypeScript types derived from schemas

**Implementation**:
```typescript
// Event schemas in /map/types/event-schemas.ts
export const mapTileSelectedEventSchema = baseEventSchema.extend({
  type: z.literal('map.tile_selected'),
  source: z.literal('map_cache'),
  payload: z.object({
    tileId: z.string(),
    tileData: z.object({
      title: z.string(),
      description: z.string().optional(),
      content: z.string().optional(),
      coordId: z.string(),
    }),
    openInEditMode: z.boolean().optional(),
  }),
});

// Validation in event processors
export function validateAndTransformMapEvent(mapEvent: AppEvent): ChatEvent | null {
  const validationResult = safeValidateEvent(mapEvent);
  
  if (!validationResult.success) {
    console.warn('Invalid event received:', validationResult.error);
    return null;
  }
  
  // Process validated event with full type safety
  const validEvent = validationResult.data;
  // ...
}
```

**Event Validation Pattern**:
1. Define Zod schemas for all event types
2. Use discriminated unions for type-safe event handling
3. Validate events at system boundaries (when receiving from event bus)
4. Log validation errors for debugging
5. Gracefully handle invalid events without crashing

## Key Features

### Core Dynamic Features

**1. Map Edition (CRUD + Move Operations)**
- Immediate feedback with optimistic updates
- Complex state management with MapCache
- Real-time synchronization

**2. Authentication State Management**
- Session changes and permission updates
- Real-time auth status
- Auth context with dynamic components

**3. URL-Based Navigation**
- Shareable state via URL parameters
- Instant navigation with client-side routing
- SEO-friendly implementation

**4. Tile Expansion/Collapse**
- URL expandedItems parameter for shareable state
- Smooth transitions with client-side animations
- Maintains state across page refreshes

**5. Scale Changes**
- URL parameter with smooth zoom transitions
- Client-side rendering optimizations
- Consistent state management

## Performance Optimizations

### Client-Side Performance
- **Smooth Interactions**: Instant client-side state updates
- **Background Sync**: Fresh data without page reloads
- **Optimistic Updates**: Immediate feedback for user actions
- **Intelligent Caching**: Reduced server load and faster navigation
- **Centralized Actions**: Single set of handlers for hundreds of tiles

### Server-Side Benefits
- **Initial SSR**: Fast first contentful paint
- **Shareable URLs**: All state encoded in URL
- **SEO Optimized**: Server-rendered content for crawlers
- **Progressive Loading**: Hierarchical data loading strategy

## Testing Strategy

The map application follows an event-driven testing approach that leverages the event bus architecture. See [TESTING.md](./TESTING.md) for comprehensive testing guidelines.
