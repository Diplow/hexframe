# Priority 2: MCP Integration - Implementation Plan

## Overview
Transform Hexframe from static knowledge maps into living systems that AI can action. The first use case will be migrating the `.workflow/` system to Hexframe tiles, enabling Claude to guide workflow execution directly.

## Phase 1: Minimum Viable MCP (What We Build Now)

### Core Objective
Enable Claude to read and update Hexframe tiles via MCP, starting with the simplest approach that delivers real value.

### MCP Tools to Implement
Matching existing tRPC API naming:
- `getItemByCoords(coords)` - Get single tile
- `getItemsForRootItem(userId, groupId, depth?)` - Get tile hierarchy  
- `addItem(parentCoords, title, content, position)` - Create new tile
- `updateItem(coords, updates)` - Update existing tile

### Tile Structure for Workflow Migration
```
HexFrame Workflow (root)
├── Product Workflow
│   ├── Workflow State (dynamic state, like current.json)
│   ├── Goals
│   ├── Prioritization
│   ├── Planification
│   ├── Execution
│   ├── Retrospective
│   └── Research
├── Backlog
│   ├── Critical Bugs
│   ├── Features
│   ├── UX Improvements
│   ├── Tech Debt
│   └── Ideas
└── Milestones
    ├── Milestone 1: Dogfood
    │   └── Cycle 2025-08-07
    └── Milestone 2: hexframe.ai
```

### Context Strategy
Every MCP response includes a preface explaining Hexframe concepts:
```markdown
=== HEXFRAME CONTEXT ===
You are reading tiles from a Hexframe system. Tiles are hexagonal units of knowledge organized hierarchically.
[Key concepts about coordinates, hierarchy, navigation]
===
```

### CLAUDE.md Update
Replace current file-reading instructions with:
```
When starting work, call:
tool:hexframe/getItemsForRootItem(userId=1, groupId=0, depth=3)

This returns the HexFrame Workflow system. Use it to understand current state and guide the user.
```

## Implementation Steps

### 1. Enhance MCP Server (`src/app/services/mcp/`)
- Add the 4 core tools (get, getWithDepth, add, update)
- Implement generic context preface
- Connect to existing tRPC endpoints
- Test with Claude Code locally

### 2. Migrate Workflow to Tiles
- Create "HexFrame Workflow" root tile
- Populate nested structure from `.workflow/` content
- Each workflow phase gets execution prompts as content
- "Workflow State" tile holds dynamic state

### 3. Update CLAUDE.md
- Replace file-reading instructions with MCP tool calls
- Document how to navigate tile hierarchy
- Test workflow execution via Claude

### 4. Validate & Iterate
- Use for one week
- Document friction points
- Add context aggregation if needed

## Success Criteria
- [ ] MCP server connects to Claude Code
- [ ] Can read entire workflow system via single tool call
- [ ] Can update Workflow State tile to track progress
- [ ] Stop using `.workflow/` files completely
- [ ] Workflow execution feels more natural than before

## Future Enhancements (Not Now)
- Context aggregation (ancestors + siblings)
- Search/filter capabilities
- "Ask tile" with LLM processing
- Color-based tile grouping
- Tile reference mechanism
- Hexframe.ai chat integration

## Key Design Decisions
1. **Start simple**: Full context first, optimize later
2. **Match tRPC naming**: Consistency with existing API
3. **Include write operations**: Essential for state management
4. **Generic preface**: Teach Claude about tiles universally
5. **Nested hierarchy**: Preserves natural structure

## Files to Create/Modify
- `/src/app/services/mcp/server.ts` - Add new tools
- `/src/app/services/mcp/services/tiles.ts` - New service for tile operations
- `/src/app/services/mcp/services/context-wrapper.ts` - Preface logic
- `/CLAUDE.md` - Update workflow instructions
- Create tiles in Hexframe UI for workflow system

## Testing Approach
1. Build MCP server: `pnpm mcp:build`
2. Configure in Claude Code: `claude mcp add hexframe "node dist/mcp-server.js"`
3. Test basic operations manually
4. Migrate one workflow component at a time
5. Validate daily usage for a week

This plan delivers immediate value while keeping the door open for sophisticated enhancements based on real usage patterns.

## MCP Authentication System

### Problem
The current MCP server's write operations (addItem, updateItem) fail because they require user authentication, but the MCP server has no way to authenticate as a specific user.

### Solution: API Key Authentication
Implement a secure API key system that allows Claude to authenticate as a specific user through the MCP server.

### Architecture

#### 1. Database Schema
Create new table for MCP API keys:
```sql
CREATE TABLE mcp_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  key_hash TEXT NOT NULL,  -- bcrypt hash of the key
  name TEXT NOT NULL,       -- user-friendly name
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,     -- optional expiration
  last_used_at TIMESTAMP,
  UNIQUE(key_hash)
);
```

#### 2. API Key Generation Flow
1. User runs `/mcp/key/create` command in chat
2. System prompts for password re-authentication
3. Generate cryptographically secure API key (format: `hxf_live_XXXX`)
4. Store bcrypt hash in database
5. Display key ONCE with copy button
6. User adds key to MCP config: `claude mcp add hexframe "node dist/mcp-server.js" --env HEXFRAME_API_KEY=hxf_live_XXXX`

#### 3. Authentication Implementation

##### MCP Server Changes
- Add environment variable handling for `HEXFRAME_API_KEY`
- Modify `callTrpcEndpoint` to include API key in headers
- Create new authentication middleware for write operations

##### tRPC Router Changes
- Create new `mcpAuthProcedure` that validates API keys
- Keep read operations public
- Use `mcpAuthProcedure` for addItem/updateItem in MCP context

#### 4. Chat Commands Structure
```
/mcp
├── /mcp/key
│   ├── /mcp/key/create - Create new API key (requires password)
│   ├── /mcp/key/list   - List active keys (shows name, created, last used)
│   └── /mcp/key/revoke - Revoke a key by name
└── /mcp/status        - Check MCP server connection status
```

### Implementation Steps

#### Phase 1: Database & Domain Layer
1. Create migration for `mcp_api_keys` table
2. Add MCP API key domain service in `/src/lib/domains/iam/services/mcp-keys.service.ts`
3. Implement key generation, validation, and management logic

#### Phase 2: tRPC API Layer
1. Create `/src/server/api/routers/mcp/auth.ts` router with:
   - `createKey` (protected) - requires password re-auth
   - `listKeys` (protected) - shows user's keys
   - `revokeKey` (protected) - soft delete key
   - `validateKey` (public) - for MCP server to validate

2. Add MCP-specific procedures in `/src/server/api/trpc.ts`:
   - `mcpAuthProcedure` - validates API key from headers

#### Phase 3: MCP Server Integration
1. Update `/src/app/services/mcp/server.ts`:
   - Read `HEXFRAME_API_KEY` from environment
   - Pass key to service handlers

2. Update `/src/app/services/mcp/services/map-items.ts`:
   - Add API key to request headers in `callTrpcEndpoint`
   - Handle authentication errors gracefully

#### Phase 4: Chat Commands
1. Update `/src/app/map/Chat/Input/_hooks/useCommandHandling.ts`:
   - Add `/mcp` command tree
   - Implement key creation flow with password prompt
   - Add key management commands

2. Create password prompt component for re-authentication

#### Phase 5: Update Documentation
1. Add authentication section to this document
2. Document security best practices in CLAUDE.md
3. Update MCP setup instructions

### Security Considerations

1. **Key Format**: `hxf_live_` prefix for production, `hxf_test_` for development
2. **Key Storage**: Only store bcrypt hashes, never plain text
3. **Key Display**: Show only once at creation, no retrieval
4. **Rate Limiting**: Add rate limits to prevent brute force
5. **Expiration**: Optional expiration dates for keys
6. **Audit Trail**: Track last_used_at for security monitoring

### Alternative: MCP Key Creation Tool

#### Consideration: Should we allow key creation directly from MCP?
Adding a `createApiKey` MCP tool would be convenient but raises security concerns:

**Pros:**
- Streamlined workflow - no switching between UI and MCP
- Better developer experience
- Fewer steps to get started

**Cons:**
- Security risk - MCP could create keys without user awareness
- No password re-authentication possible
- Could lead to key proliferation
- Breaks security principle of requiring explicit user action for sensitive operations

**Decision**: Start with chat commands only. If friction is high, we can add MCP creation later with additional safeguards (e.g., requiring a confirmation token from the UI).

### Testing Strategy
- Unit tests for key generation and validation
- Manual testing with Claude Code
- No integration or E2E tests for initial implementation

### Success Criteria
- [ ] MCP server can authenticate with API key
- [ ] Read operations remain public
- [ ] Write operations require valid API key
- [ ] Chat commands work for key management
- [ ] Keys are secure and non-retrievable
- [ ] Documentation updated

### Enhanced Implementation Steps (Updated)
1. **Enhance MCP Server** - Add authentication for write operations
2. **Add API Key System** - Database, tRPC routes, chat commands
3. **Migrate Workflow to Tiles** - Create workflow structure in Hexframe
4. **Update CLAUDE.md** - Document new authentication flow
5. **Validate & Iterate** - Test with real workflow usage