# MCP Server for Hexframe

This directory contains the Model Context Protocol (MCP) server implementation for the Visual Deliberation Environment (Hexframe). The MCP server exposes mapItems and their hierarchical relationships to LLMs.

## Architecture

```
/src/app/mcp/
  /[transport]/
    route.ts          # Dynamic route handler for MCP transport (SSE/HTTP)
  /services/
    map-items.ts      # MapItems resource implementations
  README.md           # This file
```

## Available Resources

### 1. Get Items from Root (`map://items/{rootId}`)

Retrieves a hierarchical structure of mapItems starting from any root item.

**Parameters:**

- `rootId`: The coordinate ID of the root item (e.g., "1,0" or "1,0:1,2,3")

**Returns:** JSON structure with the root item and its children (up to 3 levels deep)

### 2. Get Single Item (`map://item/{itemId}`)

Retrieves a specific mapItem with minimal hierarchy context (parent and direct children).

**Parameters:**

- `itemId`: The coordinate ID of the item

**Returns:** JSON structure with the item, its parent, and direct children

## Authentication

The MCP server uses the public tRPC API endpoints, which means:

- No authentication is required for reading public mapItems
- The server makes HTTP calls to the public API endpoints
- Future enhancement: Add authentication support for private maps

## Testing

### Local Testing

1. Start the development server:

   ```bash
   pnpm dev
   ```

2. Test the HTTP endpoints:

   ```bash
   # Test GET endpoint
   curl http://localhost:3000/mcp/sse
   
   # Test POST endpoint
   curl -X POST http://localhost:3000/mcp/sse \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

Note: The current implementation provides HTTP endpoints but doesn't fully implement the MCP protocol over HTTP. 
For proper MCP integration, you would typically use stdio transport with a dedicated MCP client.

## Integration with LLMs

To use this MCP server with an LLM client:

1. Configure the LLM client to connect to: `http://localhost:3000/mcp/sse`
2. The LLM will have access to the resources defined in this server
3. Example usage in an LLM conversation:
   - "Show me the items under root 1,0"
   - "What are the children of item 1,0:1,2"

## Development Notes

- The server uses the Vercel MCP adapter for Next.js integration
- Resources are implemented using the MCP SDK's ResourceTemplate
- All data access goes through the public tRPC API via HTTP calls
- The hex coordinate system is hierarchical (not q/r based)
- No direct domain dependencies - uses only public API endpoints

## Setup Instructions

### Automatic Configuration (Recommended)

The MCP Keys widget in the Hexframe UI now generates complete Claude Desktop configurations:

1. Create an API key using the MCP Keys widget in the chat interface
2. Copy the generated configuration (automatically detects environment)
3. Paste into your Claude Desktop MCP settings

The configuration automatically detects:
- **Production**: Uses HTTP transport to deployed Vercel instance
- **Local Development**: Uses stdio transport to local MCP server

### Manual Configuration

For manual setup or advanced use cases, see [MCP_SETUP.md](/MCP_SETUP.md) in the project root.

## Future Enhancements

- [ ] Implement proper authentication
- [ ] Add caching layer for performance
- [ ] Support for different depth levels via query parameters
- [ ] Add tools for mutations (create, update, delete items)
- [ ] Add prompts for common exploration patterns
- [ ] Support for filtering items by type or content
- [ ] Add WebSocket/SSE transport for real-time updates
