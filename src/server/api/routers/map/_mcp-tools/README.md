# MCP Tools

## Mental Model
Like a toolbox of adapters that translate between the Claude Agent SDK's Model Context Protocol and our hexagonal map operations, enabling AI agents to manipulate map tiles through a standardized interface.

## Responsibilities
- Create MCP tool definitions that wrap mapping service CRUD operations (getItem, addItem, updateItem, deleteItem)
- Create MCP tool definitions for query operations (getItems, getCurrentUser)
- Validate that required services (mappingService, iamService) are present in the tRPC context
- Transform between SDK input formats and domain service parameters
- Handle parentId resolution for nested tile creation operations
- Map SDK tool names to appropriate domain service methods

## Non-Responsibilities
- Actual domain logic implementation → See `~/lib/domains/mapping/README.md`
- User authentication and IAM logic → See `~/lib/domains/iam/README.md`
- tRPC middleware and service injection → See `~/server/api/trpc/README.md`
- AI agent request handling → See `~/server/api/routers/agentic/README.md`

## Interface
**Exports**: See `index.ts` for the public API:
- `createMCPTools(ctx)`: Main factory function that creates all MCP tools from tRPC context
- `MCPTool`: TypeScript interface for MCP tool structure

**Dependencies**: See `dependencies.json` in parent directory.

**Child subsystems** can import from this subsystem freely, but all other subsystems MUST use the public exports in `index.ts`. The `pnpm check:architecture` tool enforces this boundary.

## Tool Definitions

### Item Operations (_item-tools.ts)
- `getItemByCoords`: Retrieve a tile by its coordinates
- `addItem`: Create a new tile (with automatic parentId resolution)
- `updateItem`: Modify an existing tile's attributes
- `deleteItem`: Remove a tile and its descendants

### Query Operations (_query-tools.ts)
- `getItemsForRootItem`: Fetch all items in a hierarchical map
- `getCurrentUser`: Get authenticated user information

## SDK Integration
These tools are designed to work with the Claude Agent SDK's Model Context Protocol. Each tool follows the SDK's expected interface:
- `name`: String identifier for the tool
- `description`: Human-readable explanation of what the tool does
- `inputSchema`: JSON Schema defining the expected input parameters
- `execute`: Async function that performs the actual operation
