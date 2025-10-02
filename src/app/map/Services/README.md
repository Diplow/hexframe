# Services

## Mental Model
Like a utility toolkit for mechanics, providing specialized tools and systems that components can use to perform complex operations without building everything from scratch.

## Responsibilities
- Export event communication infrastructure through EventBus for decoupled messaging
- Provide DOM-based drag and drop functionality with validation and React integration
- Handle data prefetching and transformation from API to map tile format
- Offer React hooks and service classes for component integration
- Manage complex interaction patterns that span multiple components

## Non-Responsibilities
- Event Bus implementation details → See `./EventBus/README.md`
- Drag and drop operation logic and state management → See `./DragAndDrop/README.md`
- Prefetch caching and data transformation → See `./PreFetch/README.md`
- Map data persistence → See `../Cache/README.md`
- Canvas rendering and tile display → See `../Canvas/README.md`
- User authentication and context → See `~/contexts/UnifiedAuthContext`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.