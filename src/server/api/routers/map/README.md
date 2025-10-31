# Map Router

## Mental Model
Like a telephone switchboard operator, connecting frontend map requests to the right backend services and translating between different data formats.

## Responsibilities
- Expose tRPC API endpoints for all hexagonal map operations (CRUD, navigation, queries, composition, history, copy)
- Validate incoming request data using Zod schemas for coordinates, items, user maps, and copy operations
- Aggregate user map management and item operations into a unified router interface
- Provide backward compatibility by exposing nested router endpoints as flat legacy endpoints
- Transform domain service responses into API-friendly formats using contract adapters (including originId tracking)
- Expose composition queries (getComposedChildren, hasComposition) for direction 0 child tiles
- Expose version history queries (getItemHistory, getItemVersion) with pagination support
- Expose deep copy operation (copyMapItem) with ownership validation for copying items and their subtrees

## Non-Responsibilities
- Business logic and domain rules → See `~/lib/domains/mapping/README.md`
- Database operations and persistence → See `~/lib/domains/mapping/README.md`
- User authentication and session management → See `~/server/api/trpc/README.md`
- Response caching and performance optimization → See `~/server/api/services/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.