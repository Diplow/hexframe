# Hexrun - Execute Hexframe Plans Step by Step

## Purpose
Execute a hexframe plan one step at a time, spawning subagents for each step until completion or error.

## Syntax
```
/hexrun <coordinates> [instruction]
```

Coordinates use format `userId,groupId:path` (e.g., `abc123,0:6`).

## Examples
```
/hexrun fZRHqrORpUkoV14TRmtW0GA5kFV7UN0X,0:6
/hexrun abc123,0:4 Use the debughexframe MCP server
```

## Key Concept: Root Coordinates

The `<coordinates>` argument is the **root coord** for this execution session. Store it at the start - you'll need it throughout:
- The root hexplan lives at `{root_coords},0`
- All leaf tasks in the root hexplan are relative to this root
- The sync agent needs both root_coords and the last completed step coords

## Process

Execute this loop until complete or blocked:

### 1. Get the next step prompt
Call `mcp__hexframe__hexecute` (or `mcp__debughexframe__hexecute` if specified) with the root coordinates.

**Why hexecute**: The `hexecute` tool is responsible for gathering all necessary context from the tile hierarchy - it reads the task tile, its context children, subtask previews, and the hexplan state. The resulting prompt contains everything the subagent needs to execute one step.

### 2. Check the response status
The response will contain one of:
- `<hexplan-status>COMPLETE</hexplan-status>` → Stop, report success
- `<hexplan-status>BLOCKED</hexplan-status>` → Stop, report blocker to user
- `<execution-instructions>` → Continue to step 3

### 3. Spawn a subagent to execute the step
Use the Task tool with `subagent_type: "general-purpose"` to execute the prompt. Use opus model.

**CRITICAL**: Pass the EXACT prompt returned by hexecute to the subagent. Do NOT summarize, interpret, or craft your own prompt. The hexecute output already includes `<execution-instructions>` that tell the subagent to execute only one step.

The subagent will:
- Execute ONE step from the hexplan (the first 📋 step)
- Update the leaf's hexplan tile (mark that step ✅ or 🔴)
- Return a summary including the coords of the step it executed

### 4. Run the Sync Agent
After each step completes, spawn the sync agent to update the root hexplan:

1. Call hexecute on the sync agent tile with `deleteHexplan: true` to ensure fresh execution:
   ```
   mcp__hexframe__hexecute({
     taskCoords: "fZRHqrORpUkoV14TRmtW0GA5kFV7UN0X,0:1,3",
     instruction: "root_coords={root_coords} last_step_coords={step_coords_from_subagent}",
     deleteHexplan: true
   })
   ```
   (Use `mcp__debughexframe__hexecute` if using the debug server)

2. Spawn a subagent with the sync agent prompt (use haiku model - sync is lightweight)

The sync agent:
- Reads the leaf's hexplan to see what happened
- Updates the root hexplan with progress
- Detects meta-leaf expansions and adds new tasks
- Returns a brief sync summary

### 5. Check results and repeat
- If sync agent reports blocked → Stop and report to user
- If error → Stop and report to user
- Otherwise → Go back to step 1

Continue until `<hexplan-status>COMPLETE</hexplan-status>` or an error occurs.

## User Control Points

Between each step, the user can:
- Press Ctrl+C to stop execution
- Review the hexplan to see progress
- Edit the hexplan to modify upcoming steps
- Resume by running `/hexrun` again with the same coordinates

## MCP Server Selection

By default, uses `mcp__hexframe__hexecute`. To use the debug server, include it in the instruction:
```
/hexrun abc123,0:6 Use the debughexframe MCP server
```

## Implementation Notes

- Each step runs in a separate subagent (Claude Code limitation: no nested subagents)
- Progress is persisted in hexplan tiles, making execution resumable
- Root hexplan lists ALL leaf tasks for single-pass execution tracking
- Sync agent runs after each step to propagate status to root hexplan
- Sync agent uses haiku (cheap/fast), step execution uses opus (capable)
- Meta-leaf expansion: if a leaf creates children, sync agent adds them to root hexplan
