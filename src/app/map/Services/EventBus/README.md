# EventBus

## Mental Model
Like a postal system that delivers messages between disconnected parts of a city, allowing senders to broadcast events without knowing who will receive them.

## Responsibilities
- Emit typed events with namespaced event types (e.g., 'map.tile_created', 'auth.login')
- Register and manage event listeners for specific event types or wildcard patterns
- Support wildcard subscriptions (e.g., 'map.*' to listen to all map events, '*' for all events)
- Provide React integration through context and hooks (EventBusProvider, useEventBus)
- Isolate listener errors to prevent cascade failures across the application

## Non-Responsibilities
- Drag and drop operations → See `../DragAndDrop/README.md`
- Data prefetching and caching → See `../PreFetch/README.md`
- Event type definitions → See `~/app/map/types/events`
- Persistent event storage or replay functionality
- Event ordering or priority handling

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.