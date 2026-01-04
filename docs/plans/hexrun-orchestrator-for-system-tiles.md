# Plan: Hexrun Orchestrator for SYSTEM Tile @-Mentions

## Goal
When a user @-mentions a SYSTEM tile in the chat, trigger a hexrun-style orchestration instead of direct hexecute execution. The agent should orchestrate the execution loop using MCP tools.

## Current Flow (To Be Changed for SYSTEM Tiles)

```
User types: @my-system-tile do something
  ↓
useMessageHandling detects @mention
  ↓
executeTask(coordId, instruction, discussion)
  ↓
/api/stream/execute-task SSE endpoint
  ↓
hexecute builds prompt from tile hierarchy
  ↓
Prompt sent directly to LLM, response streamed
```

**Problem**: This flow executes the hexecute prompt directly, which is appropriate for USER tiles (conversational) but not for SYSTEM tiles (task execution requiring orchestration).

## Target Flow for SYSTEM Tiles

```
User types: @my-system-tile do something
  ↓
useMessageHandling detects @mention
  ↓
executeTask(coordId, instruction, discussion)
  ↓
/api/stream/execute-task SSE endpoint
  ↓
Backend detects itemType === SYSTEM
  ↓
Build HEXRUN_ORCHESTRATOR prompt instead of hexecute prompt
  ↓
Orchestrator prompt sent to LLM
  ↓
Agent uses MCP tools (hexecute, updateItem) to orchestrate execution
```

## Implementation Steps

### Step 1: Create HEXRUN_ORCHESTRATOR Template

**File:** `src/lib/domains/agentic/templates/_hexrun-orchestrator-template.ts`

Create a new template that instructs the agent to orchestrate hexrun execution:

```typescript
export interface HexrunOrchestratorTemplateData {
  taskCoords: string
  taskTitle: string
  instruction: string
  mcpServerName: string
  hasDiscussion: boolean
  discussion: string
}

export const HEXRUN_ORCHESTRATOR_INTRO = `<hexrun-orchestrator>
You are orchestrating the execution of a SYSTEM tile using the hexrun pattern.

Your job is to execute the task step-by-step using MCP tools until completion or a blocker is encountered.
</hexrun-orchestrator>`

export const HEXRUN_ORCHESTRATOR_TEMPLATE = `{{{orchestratorIntro}}}

<task-info>
<title>{{{taskTitle}}}</title>
<coords>{{{taskCoords}}}</coords>
{{#instruction}}
<instruction>{{{instruction}}}</instruction>
{{/instruction}}
</task-info>
{{#hasDiscussion}}

<discussion>
Previous messages in this conversation:

{{{discussion}}}
</discussion>
{{/hasDiscussion}}

<execution-protocol>
Execute this loop until complete or blocked:

1. **Get the next step**: Call \`mcp__{{{mcpServerName}}}__hexecute\` with taskCoords="{{{taskCoords}}}"

2. **Check the response**:
   - If \`<hexplan-status>COMPLETE</hexplan-status>\` → Report success to user
   - If \`<hexplan-status>BLOCKED</hexplan-status>\` → Report blocker to user
   - Otherwise → Continue to step 3

3. **Execute the step**: Follow the \`<execution-instructions>\` in the hexecute response.
   The instructions will tell you to execute ONE step (the first 📋 step in the hexplan).

4. **Update the hexplan**: After completing the step, update the hexplan tile to mark the step as ✅ COMPLETED or 🔴 BLOCKED.

5. **Repeat**: Go back to step 1 until complete.

**Important**:
- Execute one step at a time
- Always update the hexplan after each step
- Stop immediately if you encounter a blocker
- Report progress to the user as you go
</execution-protocol>`
```

### Step 2: Add Orchestrator to Template Registry

**File:** `src/lib/domains/agentic/templates/_prompt-builder.ts`

Update `_getTemplateByItemType` to return the orchestrator template for SYSTEM tiles when in "orchestrated" mode:

```typescript
// Add a new function or modify existing logic
function _shouldUseOrchestrator(itemType: MapItemType, hasUserMessage: boolean): boolean {
  // Use orchestrator for SYSTEM tiles when triggered via @-mention (has userMessage)
  return itemType === MapItemType.SYSTEM && hasUserMessage
}
```

### Step 3: Update buildPrompt to Support Orchestrator Mode

**File:** `src/lib/domains/agentic/templates/_prompt-builder.ts`

Modify `buildPrompt` to detect when to use the orchestrator:

```typescript
export function buildPrompt(data: PromptData): string {
  // For SYSTEM tiles with userMessage (from @-mention), use orchestrator
  if (data.itemType === MapItemType.SYSTEM && data.userMessage) {
    return _buildOrchestratorPrompt(data)
  }

  // Otherwise, use existing template logic
  const template = _getTemplateByItemType(data.itemType)
  // ... rest of existing logic
}

function _buildOrchestratorPrompt(data: PromptData): string {
  const templateData: HexrunOrchestratorTemplateData = {
    taskCoords: data.task.coords,
    taskTitle: data.task.title,
    instruction: data.userMessage ?? '',
    mcpServerName: data.mcpServerName,
    hasDiscussion: _hasContent(data.discussion),
    discussion: data.discussion ?? ''
  }

  return Mustache.render(HEXRUN_ORCHESTRATOR_TEMPLATE, templateData)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
```

### Step 4: Ensure MCP Tools Are Available

The streaming endpoint already has access to MCP tools via the agentic service. Verify that hexecute and updateItem MCP tools work correctly when called by the agent during orchestration.

### Step 5: Update Tests

**Files:**
- `src/lib/domains/agentic/utils/__tests__/prompt-builder.test.ts` - Add tests for orchestrator mode
- Create new test file for orchestrator template if needed

## Key Design Decisions

### Why Agent-Driven Orchestration?

1. **Simpler architecture**: No server-side loop needed
2. **Consistent with hexrun command**: Same pattern used by Claude Code
3. **User visibility**: User sees agent's reasoning and progress in real-time
4. **Interruptible**: User can stop at any point
5. **Flexible**: Agent can adapt to unexpected situations

### Orchestrator vs Direct Hexecute

| Aspect | Orchestrator (SYSTEM) | Direct Hexecute (USER) |
|--------|----------------------|------------------------|
| Execution | Multi-step loop | Single response |
| Agent role | Orchestrator | Conversational assistant |
| MCP usage | Heavy (hexecute, updateItem) | Light (optional) |
| Progress | Step-by-step updates | Single response |

### Template Selection Logic

```
If itemType === USER:
  → Use USER_TEMPLATE (conversational)

If itemType === SYSTEM:
  If has userMessage (from @-mention):
    → Use HEXRUN_ORCHESTRATOR (task orchestration)
  Else (direct hexecute call, e.g., from hexrun command):
    → Use SYSTEM_TEMPLATE (single step execution)
```

## Files to Modify

| File | Action |
|------|--------|
| `src/lib/domains/agentic/templates/_hexrun-orchestrator-template.ts` | Create (new file) |
| `src/lib/domains/agentic/templates/_prompt-builder.ts` | Add orchestrator logic |
| `src/lib/domains/agentic/templates/index.ts` | Export orchestrator types |
| `src/lib/domains/agentic/utils/__tests__/prompt-builder.test.ts` | Add orchestrator tests |

## Verification Checklist

- [ ] @-mentioning a USER tile still works (conversational flow)
- [ ] @-mentioning a SYSTEM tile triggers orchestrator prompt
- [ ] Orchestrator prompt includes task coords, instruction, and discussion
- [ ] Agent can successfully call hexecute MCP tool during orchestration
- [ ] Agent can update hexplan tiles during orchestration
- [ ] Execution stops on COMPLETE or BLOCKED status
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] ESLint passes

## Notes

- The orchestrator template is simpler than hexrun.md because it doesn't need subagent spawning (that's a Claude Code feature not available in web UI)
- The agent executes steps directly rather than spawning subagents
- Sync agent step is omitted for simplicity in v1 - can be added later if needed
- Discussion context is included so the agent knows the conversation history
