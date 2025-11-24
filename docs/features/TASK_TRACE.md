# Task Trace

**Task Trace** provides observability and control over complex Hexframe plan executions through a complete audit trail with rollback capabilities.

## Overview

Hexframe executes complex plans through a three-level prompt generation system:

1. **Level 0: hexecute (non-agentic)** - Free concatenation of tiles into structured prompt
2. **Level 1: Orchestrator Generation (agentic)** - Generates final orchestration prompt with initialization
3. **Level 2: Orchestrator Execution (interactive)** - User runs the plan, spawning autonomous subtasks

Task Trace captures all three levels plus subtask executions in a unified timeline, enabling debugging, observability, and rollback.

## Execution Modes

### Free Tier: Claude Code + MCP

**User Experience:**
1. User runs `hexecute` on task coordinates
2. Level 0 generates Level 1 prompt (instant, no API cost)
3. User copies Level 1 prompt into new session
4. Level 1 agent generates orchestrator prompt
5. User copies orchestrator prompt into new session
6. User executes the plan

**Limitations:**
- Manual copy-paste between sessions
- No automatic Task Trace (user must manually track)
- No built-in rollback
- "Good enough" for advanced users who want to avoid API costs

**Future Enhancement:**
Custom MCP server (`hexframe-orchestrator`) could automate session spawning, eliminating copy-paste.

### Paid Tier: hexframe.ai

**User Experience:**
1. User clicks "Execute Plan" on a task tile
2. Loading spinner: "Preparing orchestration..."
3. Level 0 + Level 1 run in background (2-5 seconds)
4. Chat interface seamlessly transitions to Level 2
5. User sees: "Ready to execute [Plan Name]. Respond to begin."
6. Task Trace automatically captures everything

**Benefits:**
- Zero friction: no copy-paste, no manual session management
- Complete observability via Task Trace UI
- One-click rollback to any previous step
- Professional execution experience

## Task Trace Features

### 1. Complete Audit Trail

Every step in a complex execution is recorded:

```typescript
interface TaskTrace {
  id: string
  rootTask: Coordinates
  userId: string
  startedAt: Date
  status: 'running' | 'completed' | 'failed' | 'rolled_back'
  steps: TraceStep[]
  currentStep: string
}

interface TraceStep {
  id: string
  type: 'hexecute' | 'orchestrator_generated' | 'orchestrator_execution' | 'subtask_spawned'
  timestamp: Date
  prompt?: string              // Generated prompt at this step
  sessionId?: string           // Associated chat session
  tilesSnapshot?: SnapshotId   // State of tiles for rollback
  parentStep?: string          // Tree structure for subtasks
  invalidatedAt?: Date         // Marked when rolled back
}
```

### 2. Timeline Visualization

**UI Components:**

**Top-level view:**
```
Task Trace: Add Private/Public Tiles Feature
├─ hexecute                    [2025-11-21 14:00:01] ✓
├─ Orchestrator Generated      [2025-11-21 14:00:03] ✓
└─ Orchestrator Execution      [2025-11-21 14:00:05] ⟳
   ├─ Phase 1: Clarify Task    [2025-11-21 14:01:22] ✓
   │  └─ Subtask: Analyze DB   [2025-11-21 14:01:45] ✓
   ├─ Phase 2: Identify Tasks  [2025-11-21 14:05:12] ✓
   └─ Phase 3: Engineer Context [2025-11-21 14:08:33] ⟳ (current)
```

**Per-step detail view:**
- Full prompt used
- Session transcript (if applicable)
- Tiles state at that moment
- Execution history content
- "Rollback to here" button

### 3. Rollback Capability

**How it works:**

When user clicks "Rollback to Step X":

1. **Restore tiles state** from snapshot
2. **Restore execution history tile** content
3. **Create fresh session** from that point with the step's prompt
4. **Invalidate future steps** (marked but kept for reference)
5. **User continues** from rolled-back state

**Example scenario:**

```
User executes plan → Phase 3 produces wrong database schema
User clicks "Rollback to Phase 2: Identify Tasks"
→ Tiles restored to post-Phase-2 state
→ Execution history rewound
→ Fresh session starts with Phase 3 prompt
→ User can provide additional context: "Use UUID for item IDs, not integers"
→ Phase 3 re-executes with better context
```

### 4. Subtask Tree

Task Trace captures hierarchical subtask spawning:

```
Orchestrator Execution
├─ Phase 1
│  ├─ Subtask 1.1
│  └─ Subtask 1.2
│     └─ Nested Task 1.2.1
├─ Phase 2
└─ Phase 3
```

Each subtask's execution is a node in the tree, with its own:
- Prompt used
- Session transcript
- Tiles created/modified
- Completion status

## Implementation Architecture

### Database Schema

```sql
-- Task traces (top-level audit logs)
CREATE TABLE task_traces (
  id UUID PRIMARY KEY,
  root_task_coords TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL,
  current_step_id UUID REFERENCES trace_steps(id)
);

-- Individual steps in trace
CREATE TABLE trace_steps (
  id UUID PRIMARY KEY,
  trace_id UUID REFERENCES task_traces(id),
  parent_step_id UUID REFERENCES trace_steps(id),
  step_type TEXT NOT NULL,
  prompt TEXT,
  session_id UUID REFERENCES chat_sessions(id),
  tiles_snapshot_id UUID REFERENCES snapshots(id),
  created_at TIMESTAMP NOT NULL,
  invalidated_at TIMESTAMP
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  session_type TEXT NOT NULL, -- 'interactive' | 'orchestrator_generator' | 'orchestrator_execution'
  parent_trace_id UUID REFERENCES task_traces(id),
  system_prompt TEXT NOT NULL,
  user_id UUID REFERENCES users(id), -- NULL for autonomous sessions
  created_at TIMESTAMP NOT NULL
);

-- Snapshots for rollback
CREATE TABLE snapshots (
  id UUID PRIMARY KEY,
  tiles_state JSONB NOT NULL,
  execution_history_content TEXT,
  created_at TIMESTAMP NOT NULL
);

-- Session messages
CREATE TABLE session_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### Service Layer

```typescript
// Task trace management
class TaskTraceService {
  async create(rootTask: Coordinates, userId: string): Promise<TaskTrace>
  async addStep(traceId: string, step: Omit<TraceStep, 'id'>): Promise<TraceStep>
  async rollbackToStep(traceId: string, stepId: string): Promise<Session>
  async getTimeline(traceId: string): Promise<TaskTrace>
}

// Snapshot management
class SnapshotService {
  async capture(tiles: Tile[], executionHistory: string): Promise<Snapshot>
  async restore(snapshotId: string): Promise<void>
}

// Session orchestration
class SessionOrchestrator {
  async executeHexframePlan(coordinates: string, userId: string): Promise<Session>
  async spawnSubtask(parentSession: Session, taskCoords: string): Promise<Session>
}
```

### Execution Flow (Paid Tier)

```typescript
async function executeHexframePlan(coordinates: string, userId: string) {
  // Create trace
  const trace = await taskTraceService.create(coordinates, userId)

  // Level 0: hexecute (non-agentic, instant)
  const level1Prompt = await mcp.hexecute({ taskCoords: coordinates })
  await trace.addStep({
    type: 'hexecute',
    prompt: level1Prompt,
    tilesSnapshot: await snapshotService.capture(/* relevant tiles */)
  })

  // Level 1: Generate orchestrator (agentic, background)
  const orchestratorGenSession = await createSession({
    type: 'orchestrator_generator',
    parentTrace: trace.id,
    systemPrompt: level1Prompt,
    autonomous: true
  })

  const level2Prompt = await orchestratorGenSession.run()
  await trace.addStep({
    type: 'orchestrator_generated',
    prompt: level2Prompt,
    sessionId: orchestratorGenSession.id,
    tilesSnapshot: await snapshotService.capture(/* updated tiles */)
  })

  // Level 2: User interactive session
  const userSession = await createSession({
    type: 'orchestrator_execution',
    parentTrace: trace.id,
    systemPrompt: level2Prompt,
    userId: userId
  })

  await trace.addStep({
    type: 'orchestrator_execution',
    sessionId: userSession.id,
    tilesSnapshot: await snapshotService.capture(/* current state */)
  })

  return userSession
}
```

## Why Three Levels?

### Level 0: hexecute (Free)
- **Purpose**: Structure extraction from tiles
- **Cost**: Zero API credits
- **Speed**: Instant (<100ms)
- **Logic**: Pure concatenation and formatting

### Level 1: Orchestrator Generation (One-time cost)
- **Purpose**: Intelligent initialization and adaptation
- **Cost**: ~1-2k tokens input, ~2-4k tokens output
- **Speed**: 2-5 seconds
- **Value**: Creates execution history, adapts orchestration to context

### Level 2: User Execution (Main work)
- **Purpose**: Run the actual plan
- **Cost**: Variable (user's actual work)
- **Benefit**: Clean session, autonomous subtasks, easy rewind

**Key insight**: Paying once (Level 1) to generate a great orchestrator saves costs during execution (Level 2) by enabling efficient subtask isolation and rollback.

## Design Philosophy

### Self-Hosting
The orchestrator is generated by Hexframe itself. This:
- Enables user customization of orchestration patterns
- Allows rapid iteration (edit prompts, not code)
- Validates that Hexframe formalism is useful for meta-system description

### Observability First
Complex AI executions are hard to debug. Task Trace makes every step transparent:
- What prompt was used?
- What was the context at that moment?
- What decisions were made?

### Graceful Degradation
Free tier (Claude Code) gets core functionality without Task Trace. Paid tier (hexframe.ai) gets professional execution experience.

## Future Enhancements

### Free Tier
- **Custom MCP server** (`hexframe-orchestrator`) to automate session spawning
- **Local Task Trace** stored in SQLite or JSON files
- **CLI command** to view trace: `hexframe trace show <trace-id>`

### Paid Tier
- **Branch-and-merge** for parallel experimentation
- **Trace comparison** to see differences between execution attempts
- **Collaborative traces** where multiple users can observe/contribute
- **Trace templates** for common execution patterns
- **Cost analytics** showing API usage per step
- **Auto-retry** with different prompts when steps fail

## Related Concepts

- **Execution History**: Tile at direction -6 storing task progress (internal to orchestrator)
- **Task Trace**: User-facing observability layer capturing entire execution (this document)
- **Session**: Individual chat context (can be user-interactive or autonomous)
- **Hexecute**: MCP tool that generates prompts from tile hierarchies

## Questions & Answers

**Q: Why not just use execution history tile for everything?**

A: Execution history is part of the Hexframe formalism (stored in tiles, visible to orchestrator). Task Trace is infrastructure (database, UI, rollback). They serve different purposes:
- Execution history: Task state for orchestrator
- Task Trace: Debugging and control for users

**Q: Can I share a Task Trace?**

A: (Paid tier) Yes, traces can be shared with read-only links for collaboration or support requests.

**Q: What happens to invalidated steps after rollback?**

A: They remain in the trace (marked `invalidated_at`) for reference but don't affect current execution. You can view "what went wrong" by comparing valid vs invalidated branches.

**Q: Can I export a Task Trace?**

A: (Planned) Yes, export to JSON for archival or analysis. Useful for documenting how complex decisions were made.