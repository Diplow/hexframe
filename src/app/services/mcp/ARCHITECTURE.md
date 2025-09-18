# MCP Service Architecture

This service provides Model Context Protocol (MCP) server implementation for Hexframe, enabling both local development (stdio transport) and production deployment (HTTP transport) scenarios.

## Purpose

The MCP service bridges Hexframe's hexagonal mapping system with AI assistants like Claude Desktop, providing structured access to user maps, tiles, and hierarchical knowledge structures.

## Core Components

### Transport Layer
- **stdio transport** (`server.ts`): Local development server using stdio communication
- **HTTP transport** (`/api/mcp/route.ts`): Production server using Vercel's MCP adapter

### Shared Logic
- **handlers/** (`tools.ts`): Shared MCP tool definitions and execution logic
- **services/** (`map-items.ts`): Core business logic for map operations

### Configuration
- **dependencies.json**: Subsystem dependency boundaries
- **README.md**: Setup and usage documentation

## Key Features

### Dual Deployment Support
- **Local Development**: stdio transport for direct Claude Desktop integration
- **Production**: HTTP transport deployed on Vercel with API key authentication

### Authentication Integration
- Uses existing better-auth API key system
- Validates user permissions for map operations
- Supports both x-api-key header and bearer token authentication

### Tool Coverage
- `getCurrentUser`: Get authenticated user information
- `getItemsForRootItem`: Retrieve hierarchical map structures
- `getItemByCoords`: Get specific tiles by coordinates
- `addItem`: Create new tiles
- `updateItem`: Modify existing tiles
- `deleteItem`: Remove tiles and subtrees
- `moveItem`: Relocate tiles within hierarchies

## External Dependencies

### Allowed Dependencies
- `@modelcontextprotocol/sdk/*`: Core MCP protocol implementation
- `@vercel/mcp-adapter`: Production HTTP transport adapter
- `~/lib/domains/mapping`: Access to mapping domain logic
- `~/server/auth`: Authentication and API key validation

### Integration Points
- **Mapping Domain**: Read/write operations on hexagonal maps
- **IAM Domain**: User authentication and API key validation
- **tRPC API**: Internal API calls for data operations

## Environment Detection

The service automatically detects deployment environment:
- **Production**: Uses `BETTER_AUTH_URL`, `VERCEL_URL`, or `NODE_ENV=production`
- **Local**: Defaults when production indicators are absent

## Security Model

- **API Key Authentication**: Required for all write operations
- **User Isolation**: Operations scoped to authenticated user's maps
- **Environment Variables**: Secure API key storage and validation
- **Input Validation**: All tool inputs validated against schemas

This architecture enables seamless MCP integration across development and production environments while maintaining security and proper domain boundaries.