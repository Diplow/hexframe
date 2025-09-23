# MCP Services

## Mental Model
Like a specialized translator at the United Nations - converts structured conversations between AI assistants and Hexframe's hexagonal knowledge maps, enabling seamless cross-language communication through the Model Context Protocol.

## Responsibilities
- Expose Hexframe's hexagonal mapping system to AI assistants via Model Context Protocol (MCP)
- Provide dual transport support (stdio for local development, HTTP for production deployment)
- Bridge authentication between MCP clients and Hexframe's existing auth system
- Translate between MCP tool calls and Hexframe's mapping domain operations
- Handle coordinate normalization and validation for hexagonal tile operations

## Non-Responsibilities
- Tool execution logic → See `./handlers/README.md` (when it exists)
- Business logic for map operations → See `./services/README.md` (when it exists)
- Core mapping domain logic → See `~/lib/domains/mapping/README.md`
- Authentication implementation → See `~/server/auth/README.md`
- Transport layer implementation → See `./transport/README.md` (when it exists)

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.