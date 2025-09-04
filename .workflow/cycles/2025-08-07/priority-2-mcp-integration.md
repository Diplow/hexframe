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