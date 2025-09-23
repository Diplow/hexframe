# MapResolver

## Mental Model
Like a GPS navigation service that converts addresses (database IDs or user input) into precise coordinates that maps can understand.

## Responsibilities
- Resolve database map IDs to hexagonal coordinates via tRPC backend calls
- Parse and validate coordinate strings from user input
- Cache resolution results to prevent redundant network requests
- Provide React context and hooks for map coordinate resolution throughout the map subsystem
- Handle loading states and error conditions during resolution process

## Non-Responsibilities
- Map rendering or visualization → See `../Canvas/README.md`
- Map data caching beyond resolution results → See `../Cache/README.md`
- Chat functionality → See `../Chat/README.md`
- Hierarchy management → See `../Hierarchy/README.md`
- Other map services → See `../Services/README.md`
- Database operations or business logic → Uses tRPC client for backend communication

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.