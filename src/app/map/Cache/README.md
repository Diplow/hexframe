# Cache

## Mental Model
Like a smart library circulation desk that keeps track of which books are currently available, anticipates what readers will need next, and can instantly provide information while coordinating with the central catalog and storage systems.

## Responsibilities
- Provides centralized client-side state management for hexagonal map data as single source of truth
- Stores and retrieves tiles with both structural (positive directions 1-6) and composed children (negative directions -1 to -6)
- Implements optimistic update coordination with rollback capabilities for seamless user experience
- Manages region-based data loading, prefetching, and invalidation strategies for performance
- Coordinates navigation state synchronization between cache state and URL parameters
- Tracks composition expansion state (isCompositionExpanded) for controlling composed children visibility
- Emits events for cross-system communication when cache operations complete

## Non-Responsibilities
- Pure state management (reducers, actions, selectors) → See `./State/README.md`
- Complex operation coordination and business logic → See `./Handlers/README.md`
- External service communication (server, storage) → See `./Services/README.md`
- Background synchronization strategies → See `./Sync/README.md`
- Map component rendering → See `../Canvas/README.md`
- User interaction handling → See `../Canvas/InteractionModes/README.md`
- Server-side data persistence → See `~/server/api/routers/map/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.