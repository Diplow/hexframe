# Inngest API Route

## Mental Model
Like a postal service delivery endpoint - receives job requests from Inngest cloud and routes them to the appropriate background functions for processing.

## Responsibilities
- Serve as Next.js API route handler for Inngest webhook endpoints
- Register and expose background functions to Inngest cloud service
- Handle HTTP requests (GET, POST, PUT) from Inngest for function execution and health checks
- Configure security (signing key) and logging for Inngest integration

## Non-Responsibilities
- Job logic implementation → See `~/lib/domains/agentic/README.md`
- Background function definitions → See `~/lib/domains/agentic/infrastructure/README.md`
- Queue configuration and management → See `~/lib/domains/agentic/infrastructure/README.md`
- Job status persistence → See database layer

## Interface
*See `route.ts` for the HTTP endpoint exports (GET, POST, PUT)*
*See `dependencies.json` for what this subsystem can import*

Note: This is an API route handler - other subsystems don't import from this directly. The CI tool `pnpm check:architecture` enforces this boundary.