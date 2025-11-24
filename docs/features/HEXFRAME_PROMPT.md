# Hexframe Prompt: Tiles as Executable Tasks

## Overview

Hexframe transforms tile hierarchies into structured AI prompts through a deterministic process called **hexecute**. This makes tiles executable: any tile can become a task specification that AI agents can understand and act upon.

## How Tiles Become Prompts

The `hexecute` tool transforms a tile into an XML prompt using this fixed template:

```xml
<context>
{Concatenation of all composed children (-1 to -6) **title** and **content**}
</context>

<subtasks>
{Concatenation of all structural children (1-6) **title** and **preview**}
</subtasks>

<execution-history>
<concept>
This tile tracks execution progress across agent sessions. Agents update this as they
complete subtasks, enabling continuity and observability. If empty, this is the first execution.
</concept>
{Content of child at direction 0, or empty if doesn't exist}
</execution-history>

<task>
<goal>{Tile's **title**}</goal>
{Tile's **content**}
</task>

<instructions>
{User-provided instructions for this specific execution}
</instructions>
```

### Prompt Structure Rationale

- **Context**: Composed children provide reference materials, constraints, templates - everything the agent needs to understand *how* to work
- **Subtasks**: Structural children are decomposed work units - the agent sees what needs doing without loading full details
- **Execution History**: State management across sessions - what's been tried, what worked, what's next
- **Task**: The actual goal and requirements from the tile itself
- **Instructions**: Runtime input from the user (optional)

## Why This Works: Core Hypothesis

### 1. **Observability**
The execution history creates a living log:
- What subtasks have been attempted/completed
- What decisions were made and why
- What blockers emerged
- What the next step should be

Users can inspect direction-0 tiles to understand system state without parsing agent logs.

### 2. **Easier Creation**
System thinkers already decompose problems hierarchically. Hexframe makes this decomposition *executable*:
- Tile title = task goal (what to achieve)
- Tile content = task requirements (acceptance criteria, constraints)
- Tile preview = task summary (for parent context)
- Composed children = reference materials (how to work)
- Structural children = subtasks (work breakdown)

No new mental model required - just structure thinking as tiles, then `hexecute`.

### 3. **Framework for AI Systems**
The prompt template enforces good AI task design:
- Clear goal separation (task vs context)
- Explicit state management (execution history)
- Hierarchical decomposition (subtasks)
- Reference materials (composed children)

Users get a *pattern* for thinking about AI orchestration without writing prompts.

### 4. **Abstraction of Orchestration Complexity**
Instead of writing:
- Prompt chains manually
- State management logic
- Task coordination code
- Context assembly pipelines

Users just organize tiles. Hexframe handles the rest.

## Recursive Execution Model

Hexframe orchestration is **fractal**: every task is handled identically, regardless of hierarchy level.

### The Uniform Task Pattern

Every task, whether root, branch, or leaf, follows the same execution flow:

1. **Read execution history** at `[...path, 0]` to understand current state
2. **Read context** from composed children (directions -1 to -6)
3. **Read subtasks** from structural children (directions 1-6)
4. **Update execution history** with planned approach
5. **For each subtask**: Call `hexecute([...path, N], "instructions from parent")`
   - This spawns a **new agent session** that follows this same pattern
   - Parent waits for subtask completion
6. **Update execution history** with completion status and summary

### Key Properties

- **Uniform interface**: Every task uses identical prompt structure and execution flow
- **Independent sessions**: Each subtask is a separate agent invocation
- **Scoped state**: Each task's execution history (`[path, 0]`) only tracks its own work
- **Composable**: Deep hierarchies work naturally - subtasks spawn their own subtasks
- **No special cases**: Leaf tasks simply have zero subtasks to execute

### Example Execution Flow

```
Tile: "Implement user authentication" [1]
├─ Composed children (context):
│  ├─ [-1] "Security requirements"
│  └─ [-2] "API documentation"
├─ Structural children (subtasks):
│  ├─ [1,1] "Create database schema"
│  ├─ [1,2] "Build login endpoint"
│  └─ [1,3] "Add password hashing"
└─ Execution history:
   └─ [1,0] "Started 2025-11-21, completed schema, working on endpoint..."
```

**Agent execution:**
1. Reads hexecute prompt for `[1]`
2. Sees 3 subtasks in `<subtasks>` section
3. Calls `hexecute([1,1], "Use PostgreSQL with Drizzle ORM")`
4. New agent works on `[1,1]`, updates `[1,1,0]` with progress
5. Original agent reads `[1,1,0]`, confirms completion
6. Updates `[1,0]`: "Completed schema, starting endpoint..."
7. Proceeds to `[1,2]`

## Execution History: The State Layer

### Storage Location
Each tile's execution history lives in its **direction-0 child**:
- Tile `[1, 3]` → execution history at `[1, 3, 0]`
- Tile `[2]` → execution history at `[2, 0]`
- Root tile `[]` → execution history at `[0]`

### Content Structure
The direction-0 tile content is **free-form text** written by agents, typically containing:
- **Status**: What's been completed, what's in progress
- **Decisions**: Why certain approaches were chosen
- **Blockers**: What's preventing progress
- **Next steps**: What should happen next

Example:
```
## Status
- ✓ Database schema created (migration 0012)
- ⧗ Login endpoint partially implemented
- ☐ Password hashing not started

## Decisions
Used bcrypt over argon2 for password hashing due to better ecosystem support.

## Blockers
Need clarification on OAuth integration scope before completing login endpoint.

## Next Steps
1. Complete login endpoint with basic email/password
2. Add OAuth once scope is clarified
3. Implement password hashing
```

### Update Protocol
Agents update execution history using standard Hexframe MCP tools:

1. **Agent receives prompt** with current execution history in `<execution-history>` section
2. **Before starting work**: Agent calls `updateItem([...path, 0], {content: "🟡 STARTED [timestamp]: [approach]"})`
3. **Agent performs work** (reads context, executes subtasks via hexecute)
4. **After completion**: Agent calls `updateItem([...path, 0], {content: "✅ COMPLETED [timestamp]: [summary + next steps]"})`
5. **If blocked**: Agent calls `updateItem([...path, 0], {content: "🔴 BLOCKED [timestamp]: [issue]"})`

No special tools required - just `getItemByCoords` to read and `updateItem` to write.

### Scoped Execution Histories
Each task maintains its **own** execution history, scoped to its work:

```
Parent [1] execution history at [1,0]:
  "🟡 STARTED: Plan is to complete schema, endpoint, and hashing in sequence.
   ✅ Subtask [1,1] completed successfully
   🟡 Working on subtask [1,2]..."

Child [1,2] execution history at [1,2,0]:
  "🟡 STARTED: Implementing /login POST endpoint with tRPC
   ✅ COMPLETED: Added endpoint, returns JWT. TODO: Add rate limiting."
```

The parent's history tracks **which subtasks** have been attempted. Each child's history tracks **detailed implementation** of that subtask. No cross-referencing needed during execution.

### Observability Benefits
Users can:
- **Inspect `[1, 0]`** to see top-level progress
- **Drill into `[1, 2, 0]`** to see subtask details
- **Trace execution** by following direction-0 tiles down the hierarchy
- **Resume work** by reading execution history and continuing from last known state
- **Understand decisions** by reviewing historical context in direction-0 tiles

### Rewinding and Resuming
When execution needs correction, users manually reset state:

1. **Inspect execution histories** to identify where things went wrong
2. **Manually revert tile changes** (or use future rewind tool) to desired state
3. **Edit execution history** at direction-0 to mark "restart from step X"
4. **Run hexecute again** - agent reads updated history, skips completed work

Example execution history edit:
```
## Status
- ✅ Database schema created (migration 0012)
- ❌ Login endpoint had bug, REVERTED
- ☐ Password hashing not started

## Next Steps
Restart from step 2 (login endpoint) using different approach...
```

Agents interpret execution history to understand what's been done and what needs doing. This provides **flexible rewinding** without complex rollback automation.

## Implementation Status

**Current (MVP):**
- `hexecute` tool generates deterministic XML prompts from tiles
- Execution history included in prompt template
- Manual agent updates to direction-0 tiles

**Future enhancements:**
- Structured execution history format (beyond free-form text)
- Task Trace database for execution analytics
- **Flattened execution view**: While execution is recursive (subagents spawning subagents), the observability UI can flatten direction-0 tiles into a linear trace for easier debugging
- Orchestration customization via special composed children

## User Mental Model

> **"A tile is a task specification. Hexecute makes it executable."**

To use Hexframe orchestration:
1. **Create tile hierarchy** decomposing your goal
2. **Add context** via composed children (directions -1 to -6)
3. **Run hexecute** on the root tile
4. **Give prompt to AI agent** (Claude Code, etc.)
5. **Agent executes**, updating direction-0 tiles with progress
6. **Inspect execution histories** to track progress
7. **Resume or iterate** by running hexecute again with new instructions

The key insight: **you're not writing prompts, you're organizing knowledge**. Hexframe turns that organization into executable orchestration.