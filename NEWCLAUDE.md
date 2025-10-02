# CLAUDE.md

This file provides guidance to AI agents when working with code in this repository.

## 📚 PROGRESSIVE CONTEXT SYSTEM

**For project context, use the living CLAUDE System in HexFrame tiles instead of static documentation.**

### Two-Step Progressive Context Process

**Step 1: Get Overview**
```
Use: mcp__hexframe__getItemsForRootItem
Parameters: { userId: 1, groupId: 0, depth: 2, fields: ["title", "preview"] }
Root coordinates: 1,0:2 (CLAUDE System)
```

**Step 2: Get Detailed Context**
```
Use: mcp__hexframe__getItemByCoords
Parameters: { coords: {userId: 1, groupId: 0, path: [2, X]}, fields: ["title", "descr"] }
Where X = tile number (1-6) for specific context
```

### CLAUDE System Structure

- **Tile 1** (path: [2,1]): Project Overview - HexFrame mission, current status
- **Tile 2** (path: [2,2]): Architecture - Tech stack, domain structure
- **Tile 3** (path: [2,3]): Current Workflow - Active milestone, priorities
- **Tile 4** (path: [2,4]): Development Commands - Build, test, lint commands
- **Tile 5** (path: [2,5]): Code Standards - Rule of 6, SLA principles
- **Tile 6** (path: [2,6]): Team Culture - Values, decision-making

### Quick Access Pattern

1. **First call**: Get overview with preview fields to scan available context
2. **Follow-up calls**: Get full descriptions only for relevant tiles
3. **As needed**: Drill deeper into specific areas based on your task

## 🔄 HIERARCHICAL DOCUMENTATION NAVIGATION

When understanding any part of the codebase, read documentation hierarchically:

1. **Start here** with MCP calls to CLAUDE System tiles
2. **Navigate to relevant subsystem** README.md files:
   - `src/lib/domains/README.md` - For business logic and data persistence
   - `src/app/map/README.md` - For frontend/UI questions
   - `src/server/README.md` - For backend/API questions
3. **Drill deeper** into specific subsystem README.md files as needed
4. **Read before acting** - Always read the relevant context before modifying code

## 🏃 IMMEDIATE ACTION WORKFLOW

1. Call CLAUDE System tile 3 (Current Workflow) for current priorities
2. Based on active milestone, determine next action
3. Use relevant context tiles as needed for the specific task
4. Follow development commands from tile 4 for validation

## Important Notes

- **Living System**: Context evolves with the project - no manual CLAUDE.md updates needed
- **Progressive Disclosure**: Get only the context you need, when you need it
- **MCP Integration**: All project context available through structured tile access
- **Tone & Style**: Keep responses concise and direct (see Team Culture tile)

---

*This system demonstrates HexFrame's core value: using spatial organization to make AI context discoverable and maintainable.*