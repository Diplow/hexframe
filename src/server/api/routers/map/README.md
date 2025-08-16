# Map Router

## Why This Exists
This subsystem provides tRPC API endpoints for all map-related operations in Hexframe. It handles user map management, item CRUD operations, and spatial navigation within hexagonal maps.

## Mental Model
The API gateway for hexagonal map operations, translating frontend requests into domain service calls.

## Core Responsibility
This subsystem owns:
- User map management endpoints (create, update, delete maps)
- Map item CRUD operations (add, update, remove, move items)
- Spatial queries (get items by coordinates, descendants, ancestors)
- Input validation and authorization checks

This subsystem does NOT own:
- Business logic (delegated to mapping domain)
- Database operations (delegated to repositories)
- Authentication (delegated to tRPC middleware)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `mapRouter` - Main tRPC router with nested user and items routers

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.