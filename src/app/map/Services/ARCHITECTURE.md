# Services Architecture

## Overview

The Services subsystem provides reusable business logic and interaction patterns for the map application.

## Design Principles

### Service Layer Pattern
- Services encapsulate complex business logic
- React hooks provide clean integration with components
- Services can be shared across multiple components

### Event-Driven Architecture
- Services use the EventBus for loose coupling
- Components subscribe to service events
- State changes are propagated through events

## Structure

```
Services/
├── DragAndDrop/           # Drag and drop functionality
│   ├── DOMBasedDragService.ts
│   ├── useDOMBasedDrag.ts
│   └── useTileRegistration.ts
└── index.ts               # Service exports
```

## Service Lifecycle

1. **Instantiation**: Services are created via React hooks
2. **Configuration**: Services are configured with validation callbacks
3. **Event Handling**: Services listen to and emit events
4. **Cleanup**: Services clean up resources on unmount

## Integration Patterns

### Shared Service Instance
Services can be instantiated at a high level and passed down to components that need them, ensuring consistent state across the application.

### Direct Service Usage
Components can instantiate their own service instances when isolation is needed.

## Dependencies

- EventBus: For event-driven communication
- MapCache: For tile data and operations
- UnifiedAuth: For user context and permissions