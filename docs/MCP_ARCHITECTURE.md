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
- `ENCRYPTION_KEY` - 32-byte encryption key (64 hex chars) for internal API keys
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
1. User makes AI chat request → tRPC endpoint (with session/userId)
2. tRPC creates Claude SDK repository with userId
3. SDK fetches/creates user's encrypted internal MCP key
4. SDK spawns subprocess with MCP config (using decrypted key)
5. Subprocess connects to /api/mcp with internal API key
6. MCP server validates internal key → gets userId
7. Tool executes within user's authenticated context
8. Result returned to Claude → User
```

## Internal vs External API Keys

**External API Keys** (better-auth `apikey` table):
- Created by users via UI
- Shown ONCE to user, then hashed in DB
- Used for external tools, CLI, third-party integrations
- Server validates by comparing hash(incoming_key) with stored hash

**Internal API Keys** (`internal_api_key` table):
- Auto-created when user first uses AI chat
- NEVER shown to user (server-only)
- Encrypted (not hashed) using `ENCRYPTION_KEY`
- Server decrypts to get plaintext for MCP authentication
- One key per (userId, purpose) pair

**Security Model**:
- Internal keys stored encrypted with AES-256-GCM
- Only server can decrypt (needs `ENCRYPTION_KEY` from env)
- Keys never leave server environment (DB → Backend → SDK subprocess → MCP endpoint)
- Separate table prevents accidental exposure in API responses

## Development vs Production

### Development
```env
HEXFRAME_API_BASE_URL=http://localhost:3000
ENCRYPTION_KEY=<64 hex chars - generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### Production
```env
HEXFRAME_API_BASE_URL=https://hexframe.ai
ENCRYPTION_KEY=<64 hex chars - DIFFERENT from dev, securely stored>
```

## Why This Architecture?

### ✅ Benefits

1. **Per-User Isolation**: Each user has their own encrypted MCP key
2. **Zero Cross-User Risk**: User A cannot access User B's tiles
3. **Defense-in-Depth**: Keys encrypted at rest, only decrypted server-side
4. **Auto-Managed**: Users don't see/manage these keys (created automatically)
5. **Production Ready**: Works in serverless environments
6. **Debuggable**: HTTP requests are easy to inspect
7. **Secure by Default**: DB breach alone doesn't leak keys (needs ENCRYPTION_KEY too)

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

**Cause**: Invalid or missing internal API key

**Solution**:
1. Check `ENCRYPTION_KEY` is set in `.env` (64 hex chars)
2. Verify user has an internal API key in `internal_api_key` table
3. Check MCP server logs for validation/decryption errors
4. Try rotating the key: call `rotateInternalApiKey(userId, 'mcp')`

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
2. Verify `userId` is passed to ClaudeAgentSDKRepository constructor
3. Check `ENCRYPTION_KEY` is set in `.env`
4. Check server logs for MCP connection errors or key generation failures
5. Test MCP endpoint directly with curl (use internal API key from DB)

## Related Files

- `src/app/api/mcp/route.ts` - HTTP MCP server endpoint
- `src/app/services/mcp/handlers/tools.ts` - Tool definitions
- `src/app/services/mcp/services/map-items.ts` - Tool handlers
- `src/lib/utils/request-context.ts` - Request context management
- `src/lib/domains/agentic/repositories/claude-agent-sdk.repository.ts` - SDK config
- `src/lib/domains/iam/services/internal-api-key.service.ts` - Internal key management
- `src/lib/domains/iam/infrastructure/encryption.ts` - AES-256-GCM encryption
- `src/server/db/schema/_tables/auth/internal-api-keys.ts` - Database schema
