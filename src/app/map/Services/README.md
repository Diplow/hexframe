# Services Subsystem

Core infrastructure services for the map application, providing essential functionality for communication, data management, and user interactions.

## Services Overview

### EventBus
System-wide communication service enabling decoupled component interactions through event-driven patterns.

### PreFetch
Data loading and caching service for optimizing map performance and user experience.

### DragAndDrop
DOM-based drag and drop system for tile interactions and spatial operations.

## Usage

```typescript
import {
  EventBus,
  preloadUserMapData,
  DOMBasedDragService
} from '~/app/map/Services';
```

## Architecture

See `ARCHITECTURE.md` for detailed design patterns and service boundaries.