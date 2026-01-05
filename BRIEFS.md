# Hexframe Public Launch - Feature Briefs

Target planning task: `debughexframe:fZRHqrORpUkoV14TRmtW0GA5kFV7UN0X,0:6`

## Priority Order

| Priority | Brief | Name | Status |
|----------|-------|------|--------|
| 1 | **B** | Streaming Infrastructure | ✅ Implemented |
| 2 | **A** | Chat Architecture Unification | 🔄 In Progress |
| 3 | **C** | Multi-task Tab System | Pending (depends on A) |
| 4 | **D** | Execution Transparency | Pending (depends on B) |
| 5 | **E** | Usage Credits & Billing | Pending (parallel track) |

### Brief A Sub-briefs

| Order | Brief | Name | Status |
|-------|-------|------|--------|
| 1 | A.1 | Tile Type Taxonomy | Pending |
| 2 | A.2 | Hexecute Three Modes | Pending |
| 3 | A.3 | User Tile Context Structure | Pending |
| 4 | A.4 | Chat Unification | Pending |

---

## Brief B: Real-time Streaming Infrastructure ✅

**Status**: Implemented

**What was delivered**:
- SSE streaming from `executeTask` endpoint
- Typed events: assistant messages, tool calls, tile mutations
- Frontend handlers update chat UI and map cache in real-time

**Why it was first**: Foundational infrastructure. Briefs C, D depend on streaming being in place.

---

## Brief A: Chat Architecture Unification

**Task**: Unify chat to always use `executeTask`, treating the user's root tile as their primary task.

**Current State**: Two chat paths exist - `generateResponse` (generic chat) and `executeTask` (task-specific). This creates confusion and maintenance burden.

**Target State**:
- Remove `generateResponse` entirely
- Every chat message runs `hexecute` on a task:
  - **Default**: User's root tile `[]` - the "meta-task" of helping the user build their system
  - **@-mentioned**: Specific tile coordinates
- Root tile's hexplan (direction-0) tracks user's overall journey/goals
- Agent name: "Your Hexframe" (generic for now, personalization later)

**Sub-briefs** (in implementation order):

| Order | Sub-brief | Name | Dependencies |
|-------|-----------|------|--------------|
| 1 | A.1 | Tile Type Taxonomy | None |
| 2 | A.2 | Hexecute User Mode | A.1 |
| 3 | A.3 | User Hexplan Structure | A.2 |
| 4 | A.4 | New User Onboarding | A.3 |
| 5 | A.5 | Chat Unification | A.4 |

---

### Brief A.1: Tile Type Taxonomy

**Task**: Add explicit tile type classification to enable type-aware agent behavior.

**Current State**: All tiles are implicitly treated the same. No distinction between organizational structure, reference context, and executable systems.

**Target State**:
- New `itemType` field on tiles with values:
  - `organizational` - Structural grouping (e.g., "Plans", "Interests")
  - `context` - Reference material to explore on-demand (e.g., "Hexframe" project docs)
  - `system` - Executable capability to invoke like a skill

**Technical Scope**:
1. **Schema**: Add `itemType` column to items table (nullable, defaults to `null` for existing tiles)
2. **API**: Expose `itemType` in all tile CRUD operations
3. **Migration**: Existing tiles get `itemType: null` (treated as unclassified)
4. **UI**: Add type selector when creating/editing tiles

**Agent Behavior by Type**:
| Type | Agent sees it as | Agent behavior |
|------|------------------|----------------|
| `organizational` | Navigation structure | Always visible, helps orient |
| `context` | Background knowledge | Explore when relevant, don't preload content |
| `system` | Callable skill | Can invoke via hexecute when needed |
| `null` (unclassified) | Legacy tile | Infer from structure/content |

**Documentation**:
- Update `CLAUDE.md` tile hierarchy section with type taxonomy
- Update `UBIQUITOUS.md` with tile type definitions
- Add inline comments to schema file

---

### Brief A.2: Hexecute Three Modes

**Task**: Modify `hexecute` to generate different prompts based on tile type.

**Current State**: `hexecute` generates task-focused prompts optimized for system execution. Same structure regardless of tile.

**Target State**: Three distinct modes based on `itemType`:

| Mode | Triggered by | Purpose |
|------|--------------|---------|
| **System mode** (current) | `itemType: 'system'` | Execute a task with subtasks |
| **User mode** (new) | Root tile (`path = []`) | Personal assistant with hexframe awareness |
| **Context mode** (new) | `itemType: 'context'` | Informal discussion with context "in mind" |

**System Mode** (existing behavior):
```xml
<context><!-- Context children (-1 to -6) --></context>
<subtasks><!-- Subtask children (1-6) --></subtasks>
<task><!-- Tile goal and requirements --></task>
<hexplan><!-- Execution state --></hexplan>
```

**User Mode** (root tile):
```xml
<hexframe_structure>
  <!-- Top-level tiles with types, summaries -->
</hexframe_structure>

<available_systems>
  <!-- System tiles the agent can invoke -->
</available_systems>

<user_context>
  <!-- Context children: tone, hexframe presentation, memory -->
</user_context>

<hexplan>
  <!-- Meta context guidelines: how to manage context tiles -->
</hexplan>
```

**Context Mode** (context tiles):
```xml
<context_overview>
  <!-- This tile's content as background knowledge -->
</context_overview>

<context_tools>
  <!-- Children tiles as "tools" to drill into specific context -->
</context_tools>

<conversation>
  <!-- Informal discussion, agent has this context "in mind" -->
</conversation>
```

**Key difference**: In context mode, children are **tools to retrieve specific context**, not subtasks to execute. The conversation is informal exploration, not task execution.

**Technical Scope**:
1. Add mode detection in `prompt-executor.service.ts`:
   - `path = []` → user mode
   - `itemType === 'context'` → context mode
   - `itemType === 'system'` or default → system mode
2. Create `buildUserModePrompt()` and `buildContextModePrompt()` functions
3. Context mode treats children as queryable context sources

**Documentation**:
- Update `docs/features/HEXFRAME_PROMPT.md` with all three modes
- Add examples distinguishing mode behaviors

---

### Brief A.3: User Tile Context Structure

**Task**: Define the default context tiles and hexplan for user root tiles.

**Current State**: No standard context structure for user tiles. Agent has no guidance on what it can/cannot modify.

**Target State**: User root tiles have:
1. **Default context tiles** (`[-1]` to `[-3]`) with specific purposes
2. **Hexplan** as meta-guidelines for context management

**Default Context Tiles**:

| Direction | Name | Purpose | Agent can edit? |
|-----------|------|---------|-----------------|
| `[-1]` | Tone | Communication style preferences | No (user-controlled) |
| `[-2]` | Hexframe Presentation | What Hexframe is, how to explain it | No (system-provided) |
| `[-3]` | Memory | Agent's working memory of the user | **Yes** |

**Tone (`[-1]`)** - User-controlled:
```markdown
# Communication Preferences

- Concise, direct responses
- Technical depth when relevant
- No emojis unless requested
```

**Hexframe Presentation (`[-2]`)** - System-provided:
```markdown
# About Hexframe

Hexframe transforms visions into living systems through AI-powered hexagonal maps.

You are the user's Hexframe agent. You help them:
- Organize their thinking into executable structures
- Build systems that can run autonomously
- Navigate and leverage their existing hexframe
```

**Memory (`[-3]`)** - Agent-maintained:
```markdown
# Working Memory

## About This User
- [Agent adds observations here]

## Current Focus
- [What they're working on]

## Key Preferences
- [Learned preferences beyond Tone]
```

**Hexplan (`[0]`) as Meta-Guidelines**:
```markdown
# Context Management Guidelines

## Editable Context
You may update the Memory tile ([-3]) to remember:
- User preferences and working style
- Current projects and focus areas
- Important context from conversations

## Protected Context
Do NOT modify:
- Tone ([-1]): User controls their communication preferences
- Hexframe Presentation ([-2]): System-provided, defines your role

## When to Update Memory
- User explicitly asks you to remember something
- Significant insight about user's goals or preferences
- Context that will be useful in future sessions
```

**Key Principle**: The hexplan doesn't navigate the hexframe—it governs how the agent manages its own context. The agent explores the hexframe structure directly.

**Technical Scope**:
1. Create default context tiles on user registration
2. Create default hexplan with meta-guidelines
3. System mode for Memory tile allows agent edits

**Future Enhancement** (not in scope):
- `[-4]` History tile: Last updates, usage patterns, activity timeline

**Documentation**:
- Create `docs/features/USER_CONTEXT.md` with tile purposes and examples
- Update `CLAUDE.md` with context management rules

---

### Brief A.4: Chat Unification

**Task**: Remove `generateResponse` and route all chat through `executeTask` with mode-aware hexecute.

**Current State**: Two code paths - `generateResponse` (generic chat) and `executeTask` (task execution). Favorites execute tiles but don't consider tile type.

**Target State**:
- Single code path: all messages go through `executeTask`
- Default target: user's root tile `[]` (user mode)
- Favorites redirect to the appropriate hexecute mode based on tile type

**Favorite Behavior by Tile Type**:
| Tile Type | Hexecute Mode | Behavior |
|-----------|---------------|----------|
| `system` | System mode | Current behavior - execute task |
| `context` | Context mode | Informal chat with context in mind |
| `organizational` | User mode (scoped) | Navigate that subtree |
| Root tile | User mode | Personal assistant |

**Technical Scope**:
1. **Remove `generateResponse`**: Delete endpoint and related code
2. **Update chat frontend**: Always call `executeTask` with root coords as default
3. **Favorite execution**: Pass tile type to hexecute, let it choose mode
4. **Mode routing**: hexecute selects prompt builder based on `itemType`

**Migration**:
- Existing users: no data migration needed, just behavior change
- Their root context tiles created on first interaction (from A.3)
- Favorites continue working, now with mode-appropriate behavior

**Documentation**:
- Update API docs to remove `generateResponse`
- Update `src/server/README.md` with unified architecture
- Document mode selection logic in `docs/features/HEXFRAME_PROMPT.md`

---

## Brief C: Multi-task Tab System

**Task**: Add tabbed interface where each task has its own chat session.

**Current State**: Single chat panel, no concept of parallel task sessions.

**Target State (v1 - ephemeral)**:
- Chat panel has tabs
- Starting a new task (clicking "Execute" on a tile, or @-mentioning) opens a new tab
- Each tab has its own Claude SDK session
- Multiple tabs can run simultaneously
- Tabs are ephemeral (lost on page reload) for v1

**Future (v2)**:
- Persistent tabs across sessions
- Usage-based billing per tab/session

**Dependencies**: Requires Brief B (streaming) to show live execution per tab.

---

## Brief D: Execution Transparency

**Task**: Expose context management and subagent execution logs.

**Current State**: No visibility into context size or subagent activity.

**Target State**:

### 1. Context Management
- Display current context size (tokens used / limit)
- `/compact` command to summarize and reduce context

### 2. Subagent Inspection
- Execution log stored per task (append-only)
- Log entries: messages, tool calls, results
- UI: expandable log viewer that streams new entries
- Nested view for subagent → sub-subagent hierarchies

**Key Insight**: "Live inspection" = "most recent log entry streaming in". No separate live vs past modes.

**Dependencies**: Requires Brief B (streaming) to stream log entries.

---

## Brief E: Usage Credits & Billing

**Task**: Implement usage-based billing with credit system.

**Current State**: No billing. API costs absorbed during beta.

**Target State**:
- Users have a credit balance
- Credit deducted based on Anthropic API usage (tokens consumed)
- Stripe integration for purchasing credits
- Usage visibility in UI

**Exploration Required**:
- **Billing models**: Pre-paid credits vs post-paid usage vs subscription + overage?
- **Credit granularity**: 1 credit = X tokens? Or dollar-based (1 credit = $0.01)?
- **Stripe best practices**: Stripe Billing vs custom credit ledger? Metered billing?
- **Usage tracking**: Track at which level? Per message? Per task execution? Per session?
- **Rate limiting**: What happens when credits run out mid-execution?
- **Transparency**: How do we show cost-per-action to users?

**Key Decisions Needed**:
- Pricing model (credits vs dollars vs subscription tiers)
- Where to store credit balance (Stripe vs database)
- How to handle the beta → paid transition for early users

**Note**: Can be developed in parallel with other briefs. Not a blocker for launch with trusted beta users.

---

## Original Feature List Reference

1. Chat unification (generateResponse → executeTask) → **Brief A**
2. Live tile updates via MCP → **Brief B**
3. Tab system for tasks → **Brief C**
4. Context size & /compact command → **Brief D**
5. Subagent inspection → **Brief D**
6. Streaming from executeTask → **Brief B**
7. Tool call widgets (hexframe ops, subagent calls) → **Brief B**
