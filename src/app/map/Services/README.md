# Map Services

This subsystem provides specialized services for map interactions and functionality.

## Services

### DragAndDrop
- **useDOMBasedDrag**: Hook for DOM-based drag and drop functionality
- **DOMBasedDragService**: Core service for managing drag operations
- **useTileRegistration**: Hook for registering tiles as drag targets

## Usage

Services are designed to be used throughout the map application to provide consistent behavior for user interactions.

### Drag and Drop

```typescript
import { useDOMBasedDrag } from '~/app/map/Services';

const dragService = useDOMBasedDrag();
// Pass dragService to components that need drag functionality
```

## Architecture

Services follow a hook-based pattern for easy integration with React components while maintaining service layer separation.