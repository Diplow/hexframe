# MCP Server Architecture

This document explains how the MCP (Model Context Protocol) server integration works with the Claude Agent SDK.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  User's Next.js App (Your Application)                         │
│  ├─ tRPC API (/services/api/trpc/*)                           │
│  │   └─ Requires authentication (session or API key)           │
│  │                                                              │
│  ├─ MCP HTTP Endpoint (/api/mcp)                               │
│  │   ├─ Accepts x-api-key header for authentication            │
│  │   ├─ Validates API key via better-auth                      │
│  │   └─ Runs tools with authenticated request context          │
│  │                                                              │
│  └─ Claude Agent SDK (subprocess)                              │
│      ├─ Spawned by claude-agent-sdk.repository.ts              │
│      ├─ Connects to HTTP MCP server with API key               │
│      └─ Calls tools via JSON-RPC over HTTP                     │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. HTTP MCP Server (`/api/mcp`)

**Location**: `src/app/api/mcp/route.ts`

**Purpose**: Exposes MCP tools over HTTP with API key authentication

**Protocol**: JSON-RPC 2.0

**Methods**:
- `initialize` - Handshake to establish connection
- `tools/list` - Returns list of available tools
- `tools/call` - Executes a tool with given arguments

**Authentication**:
- Uses `x-api-key` header
- Validates key via `auth.api.verifyApiKey()`
- Runs tool handlers within `runWithRequestContext()` to provide auth context

### 2. Claude Agent SDK Configuration

**Location**: `src/lib/domains/agentic/repositories/claude-agent-sdk.repository.ts`

**Configuration**:
```typescript
const mcpServers = {
  hexframe: {
    type: 'http',
    url: `${HEXFRAME_API_BASE_URL}/api/mcp`,
    headers: {
      'x-api-key': HEXFRAME_MCP_API_KEY
    }
  }
}
```

**Environment Variables**:
- `HEXFRAME_MCP_API_KEY` - API key for MCP authentication
- `HEXFRAME_API_BASE_URL` - Base URL (defaults to http://localhost:3000)

### 3. MCP Tools

**Location**: `src/app/services/mcp/handlers/tools.ts`

**Available Tools**:
- `getItemsForRootItem` - Get hierarchical tile structure
- `getItemByCoords` - Get single tile by coordinates
- `addItem` - Create new tile
- `updateItem` - Update existing tile
- `deleteItem` - Delete tile
- `moveItem` - Move tile to new location
- `getCurrentUser` - Get current user info

### 4. Tool Handlers

**Location**: `src/app/services/mcp/services/map-items.ts`

**How they work**:
1. Receive tool arguments (e.g., coords, title)
2. Call tRPC endpoints via `callTrpcEndpoint()`
3. Use API key from request context for authentication
4. Return results to Claude

## Authentication Flow

```
1. User makes AI chat request → tRPC endpoint
2. tRPC creates Claude SDK repository with tools
3. SDK spawns subprocess with MCP config
4. Subprocess connects to /api/mcp with API key
5. MCP server validates API key
6. Tool executes within authenticated context
7. Result returned to Claude → User
```

## Development vs Production

### Development
```env
HEXFRAME_API_BASE_URL=http://localhost:3000
HEXFRAME_MCP_API_KEY=EqkuRencRFtJGaOQhgvjhpwKSKaiYgmAyERzZcZHzJPuDAmAtjkyKBlZAJDDhTWa
```

### Production
```env
HEXFRAME_API_BASE_URL=https://hexframe.ai
HEXFRAME_MCP_API_KEY=wXhdqorFEuGQcosdgMfyGSYPAIzftFnUaFVHbbFmXlXuAJCmCSvnmNcFzEnvHmpf
```

## Why This Architecture?

### ✅ Benefits

1. **Proper Authentication**: API keys provide secure, scoped access
2. **Same Server for All Clients**: Used by both Claude Code and Claude Agent SDK
3. **Centralized Logic**: All tool logic in one place
4. **Production Ready**: Works in serverless environments
5. **Debuggable**: HTTP requests are easy to inspect

### ❌ What Doesn't Work

**Inline MCP Server (Previous Approach)**:
```typescript
// This doesn't work because subprocess has no auth context
const mcpServers = {
  hexframe: createSdkMcpServer({
    tools: [/* tools that need database access */]
  })
}
```

The inline approach spawns tools in the SDK subprocess which:
- Has no database connection
- Has no session context
- Can't access authenticated APIs

## Testing

Test the MCP server directly:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: EqkuRencRFtJGaOQhgvjhpwKSKaiYgmAyERzZcZHzJPuDAmAtjkyKBlZAJDDhTWa" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "addItem",
        "description": "...",
        "inputSchema": { ... }
      },
      ...
    ]
  }
}
```

## Troubleshooting

### "Authentication failed" Error

**Cause**: Invalid or missing API key

**Solution**:
1. Check `HEXFRAME_MCP_API_KEY` is set in `.env`
2. Verify API key exists in database
3. Check MCP server logs for validation errors

### "Permission denied" Error

**Cause**: API key doesn't have access to the resource

**Solution**:
1. Check API key belongs to correct user
2. Verify user owns the tiles being accessed
3. Check IAM permissions

### Tools Not Available to Claude

**Cause**: MCP server not connecting or tools not passed

**Solution**:
1. Check `tools` parameter is passed to `generate()`
2. Verify `HEXFRAME_MCP_API_KEY` is set
3. Check server logs for MCP connection errors
4. Test MCP endpoint directly with curl

## Related Files

- `src/app/api/mcp/route.ts` - HTTP MCP server endpoint
- `src/app/services/mcp/handlers/tools.ts` - Tool definitions
- `src/app/services/mcp/services/map-items.ts` - Tool handlers
- `src/app/services/mcp/services/api-helpers.ts` - tRPC client
- `src/lib/utils/request-context.ts` - Request context management
- `src/lib/domains/agentic/repositories/claude-agent-sdk.repository.ts` - SDK config
