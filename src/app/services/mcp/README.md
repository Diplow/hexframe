# MCP Services

## Mental Model
Like a specialized translator at the United Nations - converts structured conversations between AI assistants and Hexframe's hexagonal knowledge maps, enabling seamless cross-language communication through the Model Context Protocol.

## Responsibilities
- Expose Hexframe's hexagonal mapping system to AI assistants via Model Context Protocol (MCP)
- Provide HTTP transport for MCP tool execution
- Define MCP tool schemas and coordinate normalization
- Bridge MCP tool calls to tRPC service layer via direct function calls
- Handle field filtering and hierarchy building for map item responses

## Non-Responsibilities
- HTTP request handling → See `~/app/api/mcp/route.ts`
- Core mapping domain logic → See `~/lib/domains/mapping/README.md`
- Authentication implementation → See `~/server/api/trpc.ts` (mcpAuthProcedure)
- tRPC service definitions → See `~/server/api/routers/`

## Architecture

### Direct tRPC Integration
MCP handlers receive a tRPC caller instance and make **direct function calls** to tRPC procedures - no HTTP overhead within the same process:

```typescript
// ✓ CORRECT: Direct tRPC call
const item = await caller.map.getItemByCoords({ coords });

// ✗ WRONG: Making HTTP requests (old approach)
const item = await callTrpcEndpoint("map.getItemByCoords", { coords });
```

### File Structure
- `handlers/tools.ts` - MCP tool definitions and schemas
- `services/` - Tool handler implementations (CRUD operations)
- `index.ts` - Public API exports

### Tile Type Classification
MCP tools support tile type classification through the `itemType` field:

| Type | Purpose | Agent Behavior |
|------|---------|----------------|
| `organizational` | Structural grouping | Always visible, helps orient |
| `context` | Reference material | Explore when relevant |
| `system` | Executable capability | Can invoke via hexecute |

- **addItem**: Optional `itemType` parameter to set type on creation
- **updateItem**: Optional `itemType` in updates object to change type
- **GET tools**: Include `itemType` in fields enum and default fields

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: All MCP tools handlers accept a `caller: TRPCCaller` parameter for direct service access.