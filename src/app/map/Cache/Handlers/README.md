# Cache Handlers

## Mental Model
Like specialized departments in a library - each handler is a specialized department (Data Acquisition, Navigation Services, Record Keeping, Family Tree Research) that knows how to perform specific complex operations on the library's collection.

## Responsibilities
- Provides specialized operation handlers for different cache behaviors (data loading, navigation, mutations, ancestor loading)
- Implements complex business logic for cache operations with proper error handling and state coordination
- Manages optimistic updates and rollback mechanisms for mutations
- Coordinates between the cache state and external services (server, storage)
- Handles progressive loading strategies and cache population

## Non-Responsibilities
- Cache state management → See `../State/README.md`
- External service communication → See `../Services/README.md`
- Cache synchronization strategies → See `../Sync/README.md`
- Internal navigation utilities → See `./_internals/` (internal module)
- Test implementations → See `./__tests__/` (test module)

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.