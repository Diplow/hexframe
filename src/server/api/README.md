# Server API

## Mental Model
Like a telephone switchboard operator that routes type-safe calls between clients and backend services.

## Responsibilities
- Configure and initialize the tRPC framework with context, middleware, and transformers
- Combine domain-specific routers into a unified AppRouter for the entire application
- Provide type-safe API contracts and context creation for client-server communication
- Export the public interface that other subsystems use to access tRPC functionality

## Non-Responsibilities
- Route-specific business logic → See `./routers/README.md`
- Authentication middleware → See `./middleware/README.md`
- Business logic services → See `./services/README.md`
- API type contracts → See `./types/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.