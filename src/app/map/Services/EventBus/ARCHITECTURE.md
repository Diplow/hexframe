# EventBus Architecture

## Design Pattern
Implements the Observer pattern for event-driven communication.

## Components
- **EventBus**: Core event emitter with typed events
- **EventBusProvider**: React context provider
- **useEventBus**: React hook for accessing the bus

## Event Flow
1. Components/services emit events through the bus
2. Registered listeners receive events
3. Listeners process events asynchronously

## Dependencies
- React for context/hooks
- TypeScript for type safety