# Map

## Mental Model
Like the main cockpit of a spacecraft - the central command center that orchestrates all navigation, communication, and operational systems to provide a unified interface for exploring the hexagonal universe.

## Responsibilities
- Serves as the Next.js page entry point for the `/map` route with URL parameter processing
- Orchestrates provider hierarchy setup for EventBus, MapResolver, and Cache subsystems
- Handles initial map resolution from URL parameters or user default maps
- Manages page-level state transitions between loading, ready, and error states
- Coordinates authentication state and user session integration
- Provides infrastructure (tRPC client, EventBus, providers) for child components to access version history features
- Parses URL composition parameter (`composition=true/false`) and passes it to Cache as boolean state for composition expansion

## Non-Responsibilities
- Tile data management and caching → See `./Cache/README.md`
- Interactive hexagonal tile rendering → See `./Canvas/README.md`
- Conversational AI interface and chat functionality → See `./Chat/README.md`
- Navigation breadcrumb visualization → See `./Hierarchy/README.md`
- Database ID to coordinate resolution → See `./MapResolver/README.md`
- Event communication and data prefetching utilities → See `./Services/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.