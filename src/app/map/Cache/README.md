# Cache

## Why This Exists
The Cache subsystem provides centralized client-side state management for hexagonal map data. It serves as a single source of truth for all map operations including data loading, optimistic mutations, navigation coordination, and background synchronization. The cache abstracts away the complexity of coordinating between server APIs, local storage, URL state, and React components.

## Mental Model
Think of this subsystem as a smart data layer that sits between UI components and external data sources, providing immediate responses while coordinating background operations.

## Core Responsibility
This subsystem owns:
- Map item state management (cached tiles/data)
- Optimistic update coordination and rollback
- Navigation state synchronization with URL
- Background data loading and prefetching
- Event emission for cross-system communication

This subsystem does NOT own:
- Rendering of map components (delegated to Canvas/Tile)
- User interaction handling (delegated to Canvas interaction modes)
- Server-side data persistence (delegated to tRPC API routers)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `MapCacheProvider` - React provider for cache context
- `useMapCache` - Hook providing all cache operations

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.

