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

## Process

Execute this loop until complete or blocked:

### 1. Get the next step prompt
Call `mcp__hexframe__hexecute` (or `mcp__debughexframe__hexecute` if specified) with the coordinates.

**Why hexecute**: The `hexecute` tool is responsible for gathering all necessary context from the tile hierarchy - it reads the task tile, its context children, subtask previews, and the hexplan state. The resulting prompt contains everything the subagent needs to execute one step.

### 2. Check the response status
The response will contain one of:
- `<hexplan-status>COMPLETE</hexplan-status>` → Stop, report success
- `<hexplan-status>BLOCKED</hexplan-status>` → Stop, report blocker to user
- `<execution-instructions>` → Continue to step 3

### 3. Spawn a subagent
Use the Task tool with `subagent_type: "general-purpose"` to execute the prompt.

**CRITICAL**: Pass the EXACT prompt returned by hexecute to the subagent. Do NOT summarize, interpret, or craft your own prompt. The hexecute output already includes `<execution-instructions>` that tell the subagent to execute only one step.

The subagent will:
- Execute ONE step from the hexplan (the first 📋 step)
- Update the hexplan tile (mark that step ✅ or 🔴)
- Return a summary of what it did

### 4. Check subagent result
- If success → Go back to step 1
- If error → Stop and report to user

### 5. Repeat
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

## Implementation Notes

- Each step runs in a separate subagent (Claude Code limitation: no nested subagents)
- Progress is persisted in the hexplan tile, making execution resumable
- The hexplan uses a flat numbered list (1.1, 1.2, 2.1...) for easy iteration
