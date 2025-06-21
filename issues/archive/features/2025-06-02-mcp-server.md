# Feature plan: expose mapItems to LLMs via an MCP server

An example of how to implement an mcp server for next: https://github.com/vercel-labs/mcp-for-next.js/

## Overview

The Model Context Protocol (MCP) allows applications to provide context for LLMs in a standardized way. For VDE (Visual Deliberation Environment), we'll expose mapItems and their hierarchical relationships to LLMs, enabling them to understand and interact with the knowledge graph structure.

## Architecture Design (Minimal Implementation)

### MCP Server Structure

```
/src/app/mcp/
  /[transport]/
    route.ts          # Dynamic route handler for MCP transport
  /services/
    map-items.ts      # MapItems resource implementation
```

### Core Components

1. **Resources** (GET-like endpoints for loading context):
   - `map://items/{rootId}` - Get all items starting from a root item (any mapItem can be a root)
   - `map://item/{itemId}` - Get specific item details with its hierarchy context

## Implementation Plan

### Phase 1: Basic Setup
1. Install dependencies:
   ```bash
   pnpm add @modelcontextprotocol/sdk @vercel/mcp-adapter
   ```

2. Create base MCP server route at `/src/app/mcp/[transport]/route.ts`

3. Set up authentication integration with existing Better-Auth system

### Phase 2: MapItems Resources
1. Implement resource handler for `map://items/{rootId}` endpoint
2. Integrate with existing mapping domain services to fetch hierarchy
3. Return items with their hierarchical relationships from the root

### Phase 3: Testing & Documentation
1. Create unit tests for MCP endpoints
2. Test with local LLM clients
3. Document the resource schema and usage patterns

### Phase 4: Future Enhancements (after minimal implementation works)
1. Add more resource endpoints as needed
2. Consider adding tools for mutations (create, update, delete)
3. Implement caching and performance optimizations

## Security Considerations

- Respect existing map permissions (private/public)
- Use user authentication tokens from Better-Auth
- Implement rate limiting per user
- Sanitize all inputs to prevent injection attacks

## Integration Points

- Leverage existing tRPC routers for data access
- Use mapping domain services for business logic
- Integrate with map cache system for performance
- Maintain consistency with URL-based state management

## Example Implementation

```typescript
// /src/app/mcp/[transport]/route.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpAdapter } from "@vercel/mcp-adapter";
import { mapItemsResource, mapItemResource } from "../services/map-items";

const server = new McpServer({
  name: "vde-mcp-server",
  version: "1.0.0"
});

// Register resources (minimal implementation)
server.resource("map://items/{rootId}", mapItemsResource);
server.resource("map://item/{itemId}", mapItemResource);

// Export route handler
export const { GET, POST } = createMcpAdapter(server);
```

## Benefits

1. **For Users**: Their knowledge maps become accessible to AI assistants
2. **For LLMs**: Structured access to hierarchical knowledge graphs
3. **For Development**: Standardized protocol for AI integration
4. **For Platform**: New ways to interact with and analyze maps

## Understanding the Hex Coordinate System

The VDE uses a hierarchical hex coordinate system (not q/r coordinates):
- Base position: `userId,groupId` (e.g., "1,0")
- Hierarchical path: Array of HexDirection values (1-6) representing the path from root
- Example coordinate ID: `1,0:1,2,3` means userId=1, groupId=0, with path [NorthWest, NorthEast, East]
- Any mapItem can serve as a root for traversal

## Next Steps

1. Create a glossary for consistent terminology (REMINDER)
2. Create README about hex coordinates system and add to memory (REMINDER)
3. Review and approve the minimal architecture design
4. Install MCP SDK dependencies
5. Implement Phase 1 (Basic Setup) with single rootId endpoint
6. Test with a simple LLM client before adding more features

## Development Guidelines

- Always start with minimal implementation
- Test each phase before adding complexity
- Follow existing patterns in the codebase
- Maintain consistency with the domain-driven architecture
