# Server API

The tRPC API layer for Hexframe, providing type-safe endpoints for client-server communication.

## Structure

- `routers/` - API route handlers organized by domain
- `middleware/` - tRPC middleware for authentication, logging, etc.
- `services/` - Business logic services
- `types/` - Shared API types and contracts
- `trpc.ts` - tRPC configuration and context setup
- `root.ts` - Root router combining all sub-routers

## Usage

All API endpoints are type-safe through tRPC and follow REST-like naming conventions within the RPC framework.

See `CACHING.md` for caching strategies and `ARCHITECTURE.md` for architectural details.