# MCP Architecture Refactor Plan

## Executive Summary

The current MCP implementation has a **fundamental architectural flaw**: it makes HTTP requests back to its own tRPC API instead of calling domain services directly. This creates unnecessary network overhead, exposes internal APIs publicly, and violates the principle of direct service access within the same application.

## Current Architecture (Problematic)

```
External AI Agent (Claude Desktop, etc.)
  ↓ HTTP POST (JSON-RPC to /api/mcp)
[src/app/api/mcp/route.ts]
  ↓ imports handlers from src/app/services/mcp/
[src/app/services/mcp/handlers/tools.ts]
  ↓ calls handlers in src/app/services/mcp/services/map-items.ts
[src/app/services/mcp/services/map-items.ts]
  ↓ calls api-helpers.callTrpcEndpoint()
[src/app/services/mcp/services/api-helpers.ts]
  ↓ fetch("http://localhost:3000/services/api/trpc/map.getItemByCoords")
[src/app/services/api/trpc/[trpc]/route.ts]  ← Makes HTTP request to ITSELF!
  ↓
tRPC Router → MappingService → Repository → Database
```

### Problems with Current Architecture

1. **Unnecessary HTTP Overhead**: Makes network requests to itself (localhost in dev, same container in prod)
2. **Security Risk**: Exposes tRPC endpoints publicly with API key auth (should be session-only or internal)
3. **Latency**: Extra serialization/deserialization and HTTP round-trip
4. **Complexity**: More moving parts, harder to debug
5. **Maintenance**: Changes require updating both MCP handlers AND tRPC endpoints
6. **Dead Code**: `src/app/services/mcp/server.ts` (stdio-based) is completely unused

## Target Architecture (Correct)

```
External AI Agent (Claude Desktop, etc.)
  ↓ HTTP POST (JSON-RPC to /api/mcp)
[src/app/api/mcp/route.ts]
  ↓ creates tRPC caller with createTRPCContext()
  ↓ direct function call: caller.map.getItemByCoords()
tRPC Router → MappingService → Repository → Database
```

### Benefits of Target Architecture

1. **Direct Service Access**: No HTTP overhead within same process
2. **Type Safety**: Full TypeScript type checking end-to-end
3. **Security**: tRPC endpoints remain private (session-only), MCP has separate auth
4. **Performance**: No serialization overhead, no network latency
5. **Simplicity**: One code path, easier to debug
6. **Maintainability**: Changes to domain logic automatically reflected in MCP

## Refactoring Steps

### Phase 1: Remove Unused Stdio Infrastructure

**Why**: The stdio-based server (`server.ts`) is completely unused. The HTTP-based route handler (`src/app/api/mcp/route.ts`) is the only active implementation.

**Files to Delete**:
- `src/app/services/mcp/server.ts` - Unused stdio server
- Any stdio-specific configuration in `.vscode/mcp.json` (if present)

**Verification**:
```bash
# Search for any references to server.ts
rg "services/mcp/server" --type ts
rg "StdioServerTransport" --type ts
```

### Phase 2: Refactor MCP Route to Use Direct tRPC Calls

**Current**: `src/app/api/mcp/route.ts` imports handlers that make HTTP calls

**Target**: `src/app/api/mcp/route.ts` creates tRPC caller and calls directly

**Implementation**:

```typescript
// src/app/api/mcp/route.ts
import { createTRPCContext } from '~/server/api/trpc'
import { appRouter } from '~/server/api/root'
import { mcpTools } from '~/app/services/mcp'

export async function POST(request: Request) {
  // ... existing auth validation ...

  if (jsonRpcRequest.method === 'tools/call') {
    const toolName = jsonRpcRequest.params?.name;
    const toolArgs = jsonRpcRequest.params?.arguments;

    // Create tRPC context with auth
    const ctx = await createTRPCContext({
      headers: request.headers,
      // Include auth context from validateApiKey
    })

    // Create caller - this gives us direct access to all tRPC procedures
    const caller = appRouter.createCaller(ctx)

    // Execute tool with direct tRPC call (no HTTP)
    const result = await executeTool(caller, toolName, toolArgs)

    return Response.json({
      jsonrpc: '2.0',
      id: jsonRpcRequest.id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      }
    })
  }
}
```

### Phase 3: Update Tool Handlers to Accept tRPC Caller

**Current**: Handlers use `callTrpcEndpoint()` helper that makes HTTP calls

**Target**: Handlers receive `caller` parameter and make direct function calls

**Example Transformation**:

```typescript
// BEFORE: src/app/services/mcp/services/map-items.ts
export async function addItemHandler(coords, title, content, preview, url) {
  const newItem = await callTrpcEndpoint<MapItem>("map.addItem", {
    coords, parentId, title, content, preview, url,
  }, { requireAuth: true });
  return newItem;
}

// AFTER: src/app/services/mcp/_handlers/add-item.ts
export async function addItemHandler(
  caller: ReturnType<typeof appRouter.createCaller>,
  coords,
  title,
  content,
  preview,
  url
) {
  // Direct function call - no HTTP!
  const newItem = await caller.map.addItem({
    coords, parentId, title, content, preview, url,
  });
  return newItem;
}
```

### Phase 4: Reorganize File Structure

**Current Structure** (confusing):
```
src/app/services/mcp/
├── server.ts              # UNUSED stdio server
├── index.ts
├── services/              # Confusingly named "services"
│   ├── map-items.ts       # Tool handlers
│   ├── api-helpers.ts     # HTTP helper (to be deleted)
│   ├── hierarchy-utils.ts
│   └── ...
└── handlers/
    └── tools.ts           # Tool definitions
```

**Target Structure** (clear):
```
src/app/services/mcp/
├── README.md
├── index.ts               # Public API exports
├── dependencies.json
├── _handlers/             # MCP tool handlers (internal)
│   ├── get-items.ts       # One file per tool
│   ├── get-item.ts
│   ├── add-item.ts
│   ├── update-item.ts
│   ├── delete-item.ts
│   ├── move-item.ts
│   └── get-current-user.ts
├── _lib/                  # Internal utilities
│   └── hierarchy-builder.ts  # (rename from hierarchy-utils.ts)
└── tools.ts               # Tool definitions (schema + handler mapping)
```

**Rationale**:
- `_handlers/`: One file per tool, easy to find and maintain
- `_lib/`: Clear separation of utilities vs handlers
- Removed `services/` folder - confusing nested "services"
- Removed `api-helpers.ts` - no longer needed
- Prefix `_` indicates internal implementation details

### Phase 5: Update Authentication Context Flow

**Current**: API key extracted in route, but context not properly passed to tRPC

**Target**: API key validation → create tRPC context with auth → inject into caller

**Implementation**:

```typescript
// src/app/api/mcp/route.ts
export async function POST(request: Request) {
  // Validate API key (existing logic)
  const authContext = await validateApiKey(request);
  if (!authContext) {
    return Response.json(/* error */);
  }

  // Create tRPC context with auth info
  const ctx = await createTRPCContext({
    headers: request.headers,
    req: request,
  })

  // Inject authenticated user into context
  // This ensures tRPC's protectedProcedure middleware works correctly
  ctx.session = {
    user: {
      id: authContext.userId,
      // ... other user fields
    }
  }

  const caller = appRouter.createCaller(ctx)

  // Now caller has authenticated context
  const result = await caller.map.getItemByCoords({ coords })
}
```

### Phase 6: Update Dependencies and Exports

**Files to Update**:
- `src/app/services/mcp/index.ts` - Update exports to reflect new structure
- `src/app/services/mcp/dependencies.json` - Add `~/server/api/root` and `~/server/api/trpc`
- `src/app/api/mcp/dependencies.json` - Ensure can import from `~/server/api/*`

**Example**:

```json
// src/app/services/mcp/dependencies.json
{
  "subsystem": "src/app/services/mcp",
  "allowedDependencies": [
    "~/server/api/root",
    "~/server/api/trpc",
    "~/lib/domains/mapping",
    "~/lib/domains/iam"
  ]
}
```

### Phase 7: Testing Strategy

**Unit Tests**:
- Create mock tRPC caller for testing handlers
- Test each handler in isolation
- Verify error handling and validation

**Integration Tests**:
- Test full MCP JSON-RPC flow via HTTP
- Verify authentication works correctly
- Test all tool operations end-to-end

**Example Test**:

```typescript
// src/app/services/mcp/__tests__/add-item-handler.test.ts
import { describe, it, expect, vi } from 'vitest'
import { addItemHandler } from '../_handlers/add-item'

describe('addItemHandler', () => {
  it('should call tRPC map.addItem with correct params', async () => {
    const mockCaller = {
      map: {
        addItem: vi.fn().mockResolvedValue({ id: '123', title: 'Test' })
      }
    }

    const result = await addItemHandler(
      mockCaller,
      { userId: 1, groupId: 0, path: [1] },
      'Test Title'
    )

    expect(mockCaller.map.addItem).toHaveBeenCalledWith({
      coords: { userId: 1, groupId: 0, path: [1] },
      title: 'Test Title',
      // ...
    })
    expect(result.id).toBe('123')
  })
})
```

## Migration Checklist

- [ ] **Phase 1**: Delete unused stdio infrastructure
  - [ ] Delete `src/app/services/mcp/server.ts`
  - [ ] Remove stdio references from config files
  - [ ] Verify no code references stdio server

- [ ] **Phase 2**: Refactor MCP route to use direct tRPC calls
  - [ ] Import `createTRPCContext` and `appRouter`
  - [ ] Create caller in POST handler
  - [ ] Update tool execution to use caller

- [ ] **Phase 3**: Update tool handlers
  - [ ] Add `caller` parameter to all handlers
  - [ ] Replace `callTrpcEndpoint()` with direct `caller.*` calls
  - [ ] Remove HTTP-specific error handling

- [ ] **Phase 4**: Reorganize file structure
  - [ ] Create `_handlers/` directory
  - [ ] Split handlers into one-file-per-tool
  - [ ] Create `_lib/` directory
  - [ ] Move utilities to `_lib/`
  - [ ] Delete `services/` folder
  - [ ] Delete `api-helpers.ts`

- [ ] **Phase 5**: Update authentication context flow
  - [ ] Modify `createTRPCContext` call to include auth
  - [ ] Inject session into context
  - [ ] Verify protected procedures work

- [ ] **Phase 6**: Update dependencies
  - [ ] Update `dependencies.json` files
  - [ ] Update `index.ts` exports
  - [ ] Run `pnpm check:architecture`

- [ ] **Phase 7**: Testing
  - [ ] Write unit tests for handlers
  - [ ] Write integration tests for MCP route
  - [ ] Run full test suite
  - [ ] Manual testing with Claude Desktop

- [ ] **Phase 8**: Documentation
  - [ ] Update `src/app/services/mcp/README.md`
  - [ ] Update `src/server/README.md` to clarify MCP integration
  - [ ] Add code comments explaining architecture

## Success Criteria

1. ✅ No HTTP calls from MCP handlers to tRPC endpoints
2. ✅ All stdio-specific code removed
3. ✅ `pnpm check:architecture` passes
4. ✅ `pnpm typecheck` passes
5. ✅ All tests pass
6. ✅ Manual testing with Claude Desktop works
7. ✅ MCP tools respond faster (no HTTP overhead)
8. ✅ Code is easier to understand and maintain

## Estimated Effort

- Phase 1: 30 minutes (simple deletion)
- Phase 2: 2 hours (refactor route handler)
- Phase 3: 3 hours (update all tool handlers)
- Phase 4: 2 hours (reorganize files)
- Phase 5: 1 hour (fix auth context)
- Phase 6: 30 minutes (update dependencies)
- Phase 7: 4 hours (comprehensive testing)
- Phase 8: 1 hour (documentation)

**Total**: ~14 hours

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing MCP clients | High | Test thoroughly before deploying |
| Auth context not properly set | High | Add integration tests for auth |
| Missing error handling | Medium | Review all error paths |
| Performance regression | Low | Benchmark before/after |

## References

- Vercel MCP Template: https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js
- tRPC `createCaller` docs: https://trpc.io/docs/server/server-side-calls
- Model Context Protocol spec: https://github.com/ModelContextProtocol/mcp

## Questions to Resolve

1. Should we keep backward compatibility with any external clients?
2. Do we want to expose MCP over HTTP publicly, or restrict to specific origins?
3. Should we version the MCP API endpoint (e.g., `/api/mcp/v1`)?
4. Do we need rate limiting on the MCP endpoint?

---

**Created**: 2025-11-17
**Status**: Planning
**Owner**: Development Team