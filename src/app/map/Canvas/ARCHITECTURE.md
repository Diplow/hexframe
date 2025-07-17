# Canvas Architecture

## Overview

The Canvas layer is responsible for rendering the hexagonal map interface and managing tile interactions. It follows a hierarchical component structure from Canvas → Frame → Tile, with each layer having specific responsibilities.

## Key Architectural Principles

1. **Canvas primarily interacts with MapCache**: For all data operations and state changes
2. **Canvas can emit request events**: For UI coordination with Chat when it needs text input capabilities
3. **Canvas doesn't listen to EventBus**: It only renders MapCache state and emits requests when needed

## Component Architecture Layers

### 1. Canvas Layer

#### Dynamic Canvas (`/map/Canvas/index.tsx`)

**Type**: Dynamic (Client-Side)

**Responsibilities**:
- Manages cache synchronization and background updates
- Provides centralized tile action management
- Handles client-side state and interactions
- Integrates with MapCache for data management
- Orchestrates layout of hex frames and overlays

**Key Features**:
- Acts as a **centralized action coordinator** to avoid hook proliferation
- Provides TileActionsContext to all descendant tiles
- Manages interaction modes (select, edit, delete, etc.)
- Optimizes performance with single set of handlers for all tiles

### 2. Frame Layer

#### Dynamic Frame (`/map/Canvas/frame.tsx`)

**Type**: Dynamic (Client-Side)

**Responsibilities**:
- Recursive hexagonal layout rendering with client-side features
- Handles expansion with smooth transitions
- Manages drag-and-drop zones
- Integrates with centralized action management

#### Base Frame (`/map/components/BaseFrame.tsx`)

**Type**: Base Component (No Interactivity)

**Responsibilities**:
- Recursive hexagonal layout rendering for non-interactive contexts
- Used by loading skeleton and other static displays
- Pure rendering without client-side state
- Renders tile components in hexagonal patterns

### 3. Tile Layer

#### Dynamic Tiles

**ItemTile** (`/map/Tile/Item/item.tsx`)
- Full client-side interactivity
- Optimistic updates for edits
- Integrated with MapCache
- Real-time synchronization

**ItemButtons** (`/map/Tile/Item/item.buttons.tsx`)
- Dynamic button states based on permissions
- Client-side action handlers
- Loading states during mutations
- Context-aware visibility

#### Base Tile Components

**BaseTileLayout** (`/map/components/BaseTileLayout.tsx`)
- Core hexagonal tile rendering
- Handles sizing, colors, and strokes
- Used by all tile types for consistent appearance
- No interactivity or state management

## Hexagonal Layout System

The Canvas uses a coordinate system for hexagonal positioning:

```typescript
// Hexagonal coordinate system
interface HexCoordinate {
  userId: number;
  groupId: number;
  path: string; // e.g., "A1B2C3"
}

// Position calculation for hexagons
const HEX_POSITIONS = [
  { q: 0, r: 0 },    // Center
  { q: 1, r: -1 },   // Top-right
  { q: 1, r: 0 },    // Right
  { q: 0, r: 1 },    // Bottom-right
  { q: -1, r: 1 },   // Bottom-left
  { q: -1, r: 0 },   // Left
  { q: 0, r: -1 },   // Top-left
];
```

## Drag and Drop Architecture

The Canvas implements a sophisticated drag-and-drop system for tile manipulation:

### Key Components

1. **useDragAndDrop Hook** (`/hooks/useDragAndDrop.ts`)
   - Manages drag state and events
   - Calculates valid drop targets
   - Handles drag permissions

2. **Optimistic Operations**
   - **Swap**: Exchange positions of two tiles
   - **Move**: Move tile to empty position
   - Both operations update immediately with server sync

3. **Drop Target Calculation**
   - Validates drop permissions
   - Highlights valid drop zones
   - Prevents invalid operations

### Example Flow

```typescript
// Drag operation flow
1. User starts dragging tile A
2. Canvas calculates valid drop targets
3. User hovers over tile B
4. Canvas shows swap preview
5. User drops → Canvas calls mapCache.swapTiles()
6. MapCache updates state and emits notification
7. Server sync in background
8. Canvas re-renders with new state
// Note: For data operations, Canvas uses MapCache, not EventBus
```

## Context Menu System

The Canvas provides context-sensitive menus for tiles:

```typescript
interface TileContextMenuProps {
  tile: HexTileData;
  position: { x: number; y: number };
  onClose: () => void;
}

// Context menu appears on right-click
// Options based on:
// - User permissions
// - Tile state
// - Current interaction mode
```

## UI Coordination via Request Events

When Canvas needs capabilities that Chat provides (like text input), it emits request events:

### Request Event Examples

```typescript
// Edit action - Canvas requests Chat to show edit widget
function handleEditClick(tileData: TileData) {
  eventBus.emit({
    type: 'map.edit_requested',
    source: 'canvas',
    payload: {
      tileId: tileData.metadata.coordId,
      tileData: {
        title: tileData.data.name,
        content: tileData.data.description,
        coordId: tileData.metadata.coordId,
      },
      openInEditMode: true
    }
  });
}

// Delete action - Canvas requests Chat to show confirmation
function handleDeleteClick(tileData: TileData) {
  eventBus.emit({
    type: 'map.delete_requested',
    source: 'canvas',
    payload: {
      tileId: tileData.metadata.coordId,
      tileName: tileData.data.name
    }
  });
}
```

### Why Request Events?

- **Text Input**: Chat is better equipped to handle text input than Canvas
- **User Confirmation**: Chat can show confirmation dialogs naturally
- **Complex Interactions**: Chat's widget system handles multi-step operations
- **Maintains Separation**: Canvas and Chat remain loosely coupled

## Performance Optimizations

### Centralized Action Management

Instead of each tile having its own hooks and handlers:

```typescript
// ❌ Avoid: Hook proliferation
function Tile({ data }) {
  const { mutate } = useMutation();
  const handleClick = () => mutate(data);
  // Multiplied by hundreds of tiles = performance issue
}

// ✅ Preferred: Centralized handlers
function Canvas() {
  const actions = useTileActions(); // Single instance
  
  return (
    <TileActionsContext.Provider value={actions}>
      {/* All tiles share the same handlers */}
    </TileActionsContext.Provider>
  );
}
```

### Render Optimization

- Tiles only re-render when their data changes
- Mutation state isolated from render state
- React.memo for expensive components
- Virtual scrolling for large maps (future)

## Error Handling

The Canvas includes comprehensive error boundaries:

```typescript
// Error boundary catches and displays errors gracefully
<ErrorBoundary fallback={<MapErrorFallback />}>
  <Canvas />
</ErrorBoundary>

// Specific error states:
// - Loading failures
// - Permission errors
// - Network issues
// - Invalid data
```

## Loading States

Progressive loading strategy:

1. **Skeleton**: BaseFrame with placeholder data
2. **Partial**: Show loaded tiles, loading indicators for pending
3. **Complete**: Full interactive map
4. **Background**: Continuous sync without disrupting UI

## Future Enhancements

- **Virtual Scrolling**: For maps with thousands of tiles
- **WebGL Rendering**: For extreme performance needs
- **Gesture Support**: Pinch zoom, swipe navigation
- **Collaborative Cursors**: Show other users' positions
- **Offline Mode**: Full offline capability with sync queue