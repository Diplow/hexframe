# Tile Components

The Tile components are the visual building blocks of the Hexframe map, representing different types of hexagonal tiles that users interact with.

## Overview

Tiles are the core visual elements in Hexframe, each representing a node in the hierarchical map structure. They come in different types (Item, Empty, User) and support various interactions including drag-and-drop, editing, and navigation.

## Component Types

### 1. **ItemTile** (`Item/`)
- Represents tiles with content (name, description, URL)
- Supports full interactions: drag, drop, edit, delete
- Can be expanded to show children
- Owner-based permissions

### 2. **EmptyTile** (`Empty/`)
- Represents unoccupied positions
- Drop targets for creating new items
- Visual placeholders in the hexagonal grid

### 3. **UserTile** (`User/`)
- Special root tiles representing users
- Cannot be dragged or deleted
- Entry points to user spaces

## Shared Components

### Test Identification (`_shared/test-identifier.ts`)
Generates consistent test IDs from tile coordinates:
- **Purpose**: Enable reliable E2E testing across all tile types
- **Format**: `tile-{userId}-{groupId}` for root, `tile-{userId}-{groupId}-{path}` for children
- **Usage**: All tile types should use this for their `data-testid` attribute

### Dialog Management (`_shared/use-tile-dialogs.ts`)
Reusable hook for managing edit/delete dialogs:
- **Purpose**: Consistent dialog behavior across tile types
- **Features**: 
  - Exclusive dialog states (only one open at a time)
  - Clean open/close handlers
  - Memory efficient with lazy loading

### Interaction State (`_types/interaction-state.ts`)
Unified interface for tile interaction state:
```typescript
interface TileInteractionState {
  // Drag state
  isDraggable: boolean;
  isBeingDragged: boolean;
  dragProps: React.DragHTMLAttributes<HTMLDivElement>;
  
  // Drop state
  isValidDropTarget: boolean;
  isDropTargetActive: boolean;
  dropOperation: 'move' | 'swap' | null;
  dropProps: React.DragHTMLAttributes<HTMLDivElement>;
  
  // Edit state
  canEdit: boolean;
  
  // Visual state
  cursor: string;
  previewState?: PreviewState;
}
```

### Preview System (`_preview/`)
Extensible system for visual previews during interactions:
- **Types**: Base `PreviewState` interface for different preview types
- **Implementations**:
  - `SwapPreviewState`: Shows color changes during swap operations
  - Future: Position previews, hierarchy previews, etc.

## Architecture Patterns

### 1. **Modular Structure**
Each tile type follows consistent module organization:
```
TileType/
├── index.tsx              # Public exports
├── tile-type.tsx          # Main component (thin)
├── _hooks/                # State management
├── _validators/           # Business logic
├── _coordinators/         # Event coordination
├── _utils/                # Pure utilities
└── _components/           # Sub-components
```

### 2. **Hook-Based State**
Complex state logic extracted to custom hooks:
- Interaction state from context
- Dialog management
- Computed properties

### 3. **Coordinator Pattern**
Event handling separated into coordinators:
- Transform context data into DOM props
- Handle browser events
- No state management

### 4. **Validator Pattern**
Pure functions for business rules:
- Permission checks
- Drop target validation
- No side effects

## Usage Guidelines

### Creating a New Tile Type

1. **Use Shared Components**:
   ```tsx
   import { generateTileTestId } from '../_shared/test-identifier';
   import { useTileDialogs } from '../_shared/use-tile-dialogs';
   ```

2. **Follow Module Structure**:
   - Keep main component under 50 lines
   - Extract logic to appropriate modules
   - Use consistent naming patterns

3. **Implement Required Props**:
   ```tsx
   interface TileProps {
     scale?: TileScale;
     baseHexSize?: number;
     interactive?: boolean;
     // Type-specific props...
   }
   ```

### Testing

1. **Use Test IDs**: All tiles must use `generateTileTestId()` for consistent test identification
2. **Test Modules**: Each module should have focused unit tests
3. **Integration Tests**: Test tile interactions within the Canvas context

## Performance Considerations

1. **Lazy Loading**: Dialogs and heavy components should be lazy loaded
2. **Memoization**: Use React.memo for tiles that don't change often
3. **Context Usage**: Minimize context reads to prevent unnecessary re-renders

## Related Documentation

- [Canvas Documentation](../Canvas/README.md) - Parent component and interaction context
- [Cache Documentation](../Cache/README.md) - Data management
- [Mapping Domain](../../../lib/domains/mapping/README.md) - Domain logic