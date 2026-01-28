# CLAUDE.md

This file provides guidance to AI agents and developpers when working with code in this repository.

## Subsystem Architecture

The codebase is organized into ~80 **subsystems** — directories containing a `dependencies.json` file. Each subsystem has:
- `dependencies.json` — declares allowed imports and subsystem type
- `index.ts` — public API (all external imports must go through this)
- `README.md` — mental model, responsibilities, child subsystems

**Architectural constraints** (enforced by `pnpm check:architecture`):
- Import only through a subsystem's `index.ts`, never reach into internals
- Only import dependencies declared in `dependencies.json`
- No cross-domain imports (domains are isolated)
- Subsystems exceeding 1000 LoC must have a `README.md`

**Discovery:**
```bash
pnpm subsystem-tree                          # ASCII tree with types and LoC
pnpm subsystem-tree -- --format json         # JSON output
pnpm subsystem-tree -- src/lib/domains       # Subtree only
```

### Workflow: Feature Planning

1. Run `pnpm subsystem-tree` to map the landscape
2. Identify impacted subsystems, read each one's `README.md`
3. Structure the plan with one step per impacted subsystem
4. When delegating a step to a subagent (Task tool), include the subsystem's `README.md` content as context in the prompt
5. Check `index.ts` exports and `dependencies.json` before writing code
6. Consider whether new subsystems should be introduced (Rule of 6 exceeded, >1000 LoC, natural boundary)

### Workflow: Impact Analysis

1. Read the changed subsystem's `index.ts` to see public surface
2. Grep for consumers: `grep -rn "from.*~/path/to/subsystem['\"]" src --include="*.ts" --include="*.tsx"` (reliable because architecture enforcement forces all imports through `index.ts`)
3. Group results by subsystem, check transitive impact

### Workflow: New Subsystem Introduction

When to create: >6 files (Rule of 6), >1000 LoC, natural concern boundary.

Checklist:
1. Create `dependencies.json` with type and allowed dependencies
2. Create `index.ts` as the public API
3. Create `README.md` with mental model, responsibilities, and subsystems
4. Add to parent's `"subsystems"` array in its `dependencies.json`
5. Run `pnpm check:architecture` to validate

### Rule of 6

The codebase follows the **Rule of 6** for consistent organization (enforced by `pnpm check:ruleof6`):

- **Subsystems**: Max 6 declared child subsystems per parent. Group related children into a router subsystem.
- **Files**: Max 6 functions per file. Move extras to other files. Prefix internal functions with `_`.
- **Functions**: Max 50 lines (warning), 100 lines (error). Refactor into max 6 function calls at the same abstraction level.
- **Arguments**: Max 6 arguments per function, or 1 object with max 6 keys at the same abstraction level.

Custom thresholds via `.ruleof6-exceptions` files:
```
# Function-specific: file:function:threshold
src/path/file.ts:complexFunction: 150  # Justification for exception

# File-specific: file:threshold
src/path/file.ts: 10  # Justification for exception
```

## Product Presentation

*Structure your expertise. Let AI execute.*

Hexframe lets you teach AI how to decompose tasks the way you would — and then executes them automatically.

The core experience:

1. **Create** — Break goals into subtasks, top-down, until each is simple enough to trust AI with. Attach context where needed. Let AI help you structure.

2. **Activate** — Run your system. Hexframe orchestrates subagents for each tile, delivering the right context. When something fails, you see exactly where. Refine and run again.

3. **Share** — Publish systems for others to use, fork, and build upon. Learn from systems others have built.

4. **Compose** — Combine systems: reuse context across tiles, use systems as tools, build on what exists.

5. **Monitor** — Track which systems are used, which work well, and which need attention. The portfolio view.

The structure you maintain — your Hexframe — is a living map of your expertise. It captures how you think about decomposing problems, what context matters, and where you trust AI. It evolves as you learn.

Your expertise becomes executable, not just documented.

### Create

Creating a Hexframe is about externalizing your expertise into a structure AI can execute.

The core actions:
1. **Decompose** — Break goals into subtasks, top-down, until each is simple enough to delegate
2. **Get help** — Let AI propose decompositions that you review and refine
3. **Attach context** — Add constraints, examples, and reference materials where needed

The result is a hierarchy of tiles where:
- Each tile represents a unit of work
- Parent tiles orchestrate, leaf tiles execute
- Context flows down from ancestors to descendants

Your expertise lives in the structure: what you chose to decompose, where you stopped, what context you attached, and how you organized it all.

### Activate

Activating a Hexframe turns your structure into execution.

The core actions:
1. **Run** — Point at a tile and execute. Hexframe orchestrates subagents automatically.
2. **Observe** — Watch agents work through your structure, see progress tile by tile
3. **Refine** — When something fails, see exactly where. Fix that tile. Run again.

What makes this powerful:
- The hierarchy IS the orchestration — no separate workflow to maintain
- Context flows automatically — each agent sees what's relevant based on position
- Failures are localized — you know exactly which tile to fix

The feedback loop (run → fail → refine → run) is how your Hexframe gets better over time. Each failure teaches you something about what the AI needed that wasn't there.

### Share

Your Hexframe doesn't have to stay private. You can share systems with others.

What sharing enables:
- **Publish** — Make a system public so others can discover and use it
- **Fork** — Others can copy your system and adapt it to their needs
- **Learn** — Browse systems others have built to learn new approaches
- **Collaborate** — Work together on shared systems with your team

Why this matters:
- Expertise becomes transferable — not just to AI, but to other people
- Good structures get reused — you don't have to start from scratch
- Patterns emerge — the community discovers what works

Your Hexframe is your expertise made visible. Sharing it means others can benefit from how you think about problems.

### Compose

Systems can build on other systems. This is composition.

How composition works in Hexframe:
- **Reuse context** — Attach the same context to multiple tiles without duplicating it
- **Systems as tools** — Give an agent access to another system it can invoke when needed
- **Build on existing systems** — Reference or extend systems you or others have built

Why this matters:
- You don't rebuild from scratch — leverage what already works
- Specialized systems stay focused — they do one thing well
- Complex capabilities emerge — from combining simple, well-defined systems

Example: A "code review" system might compose a "style checker" system, a "security scanner" system, and a "best practices" context — each maintained separately, combined at runtime.

### Monitor

As you build more systems, you need visibility into the whole portfolio.

What monitoring shows you:
- **Usage** — Which systems are being activated, how often
- **Health** — Which systems succeed vs. fail frequently
- **Maintenance** — Which systems haven't been updated, may be stale
- **Impact** — Which systems deliver the most value

Why this matters:
- Focus attention where it counts — improve high-use, high-failure systems first
- Prune what's unused — keep your Hexframe clean and navigable
- See patterns — understand which approaches work across your systems

When browsing other users' systems:
- See which systems are actively used — active usage signals trustworthiness
- Distinguish maintained systems from abandoned experiments
- Make informed decisions about which systems to fork or build upon

Monitor is the portfolio view. Activate is one system at a time. Monitor is all systems at once — yours and others'.

### Core Documentation

- **Culture & Values**: `docs/company/CULTURE.md` - The tensions that guide us
- **Main page**: `src/app/map/README.md` - The interface (web page) to the HexFrame system
- **Domain Model**: `src/lib/domains/README.md` - Core domain structure 

## Development Commands

### Core Development
```bash
pnpm check:lint           # Run ESLint
pnpm typecheck            # TypeScript type checking
pnpm test                 # Run all tests with AI-friendly JSON output
pnpm check:architecture   # Validate subsystem boundaries
pnpm check:ruleof6        # Check Rule of 6 compliance
pnpm subsystem-tree       # Show subsystem hierarchy with types and LoC
```

## Code Quality

### Architecture Enforcement
Use `pnpm check:architecture` to validate architectural boundaries and coding standards. See `scripts/checks/architecture/README.md` for comprehensive documentation on rules, error types, and AI-friendly filtering commands.

### Subsystem Navigation
Use `pnpm subsystem-tree` to visualize the full subsystem hierarchy. Every directory with a `dependencies.json` is a subsystem with enforced boundaries. See `scripts/checks/architecture/README.md` for options (JSON output, subtree filtering).

## Architecture Overview

**Tech stack:** Next.js 15 App Router, tRPC, Drizzle ORM + PostgreSQL, Vitest.

| Root Subsystem | Type | Role | Key README |
|----------------|------|------|------------|
| `src/app/` | app | Next.js pages and UI components | `src/app/map/README.md` |
| `src/lib/` | router | Domain layer (DDD) | `src/lib/domains/README.md` |
| `src/server/` | router | tRPC API, cross-domain orchestration | `src/server/README.md` |

The domain layer (`src/lib/domains/`) contains isolated domains (mapping, IAM, agentic, etc.) with no cross-domain imports. Each domain follows DDD patterns with services, repositories, and infrastructure layers.

## Tile Hierarchy Architecture

### The Fundamental Rule: Leaf or Parent, Never Both

A tile is either a **leaf** (does concrete work) or a **parent** (orchestrates children). Never both.

- **Leaf Tile**: Has no subtask children (directions 1-6). Its content describes WHAT to do and WHY. An agent executes it in one session.
- **Parent Tile**: Has subtask children. The agent's only job is orchestration — run each child in order. The tile's content (if any) is context for human reviewers, not agent instructions.

This clean separation eliminates ambiguity about what an agent should do when executing a tile.

### Tile Types (MapItemType)

Every tile has a semantic type that guides agent behavior. The system supports both built-in enum types and custom string types.

#### Built-in Types
- **USER**: Root tile for each user's map. The only tile type that can have no parent. Exactly one per user, at the center of their map.
- **ORGANIZATIONAL**: Structural grouping tiles (e.g., "Plans", "Interests"). Used for navigation and categorization. Always visible to help orient users and agents.
- **CONTEXT**: Reference material tiles to explore on-demand (default for new tiles). Background knowledge that agents should explore when relevant, not preload eagerly.
- **SYSTEM**: Executable capability tiles that can be invoked like a skill. Agents can invoke these via hexecute when needed.

#### Custom Types
Beyond built-in types, arbitrary string values can be used as custom item types (e.g., "template", "project", "workflow"). This enables domain-specific semantic classification.

**Reserved types**: The `user` type is reserved for system-created root tiles and cannot be used via API.

**Type utilities** (in `src/lib/domains/mapping/infrastructure/map-item/item-type-utils.ts`):
- `isBuiltInItemType()` - Type guard for MapItemType enum values
- `isReservedItemType()` - Check if type is reserved
- `isCustomItemType()` - Check if type is custom (non-built-in)

**Migration note**: Previously there was only USER and BASE. BASE has been split into ORGANIZATIONAL, CONTEXT, and SYSTEM for semantic agent behavior. Tiles with null itemType should be treated as unclassified legacy tiles.

### Direction Values
- **Positive 1-6**: Subtask children (decomposed work units)
- **Negative -1 to -6**: Context children (reference materials, constraints, templates)
- **Direction 0**: Hexplan (execution state and progress tracking)

### Key Characteristics
- Tiles can have BOTH subtask and context children simultaneously
- Path example: `[1, -3, 4]` = NW → ContextE → SE (mixed hierarchy)
- Context children stored as direct children with negative direction values
- UX: Context expansion controlled by boolean toggle (not per-tile)

### Implementation Layers
All layers support negative directions consistently:
- **Utils**: Direction enum includes negative values (-1 to -6)
- **Types**: Parameter schemas validate negative directions
- **Services**: Context queries filter by negative direction
- **Repositories**: Database queries handle negative path values
- **Infrastructure**: PostgreSQL stores negative integers in path arrays

See `UBIQUITOUS.md` for complete terminology and `src/lib/domains/mapping/README.md` for domain implementation details.

## AI Orchestration: Hexplan-Driven Autonomous Execution

Hexframe's core innovation is making hierarchical knowledge **executable** through the `hexecute` system. See [docs/features/HEXFRAME_PROMPT.md](docs/features/HEXFRAME_PROMPT.md) for full specification.

### The Hexframe Execution Philosophy

Hexframe enables **autonomous execution with structured human control**. This differs fundamentally from conversational AI interaction:

| Conversational Approach | Hexframe Approach |
|------------------------|-------------------|
| Chat back-and-forth with agent | Define system structure, let it run autonomously |
| Hope the agent interprets correctly | Place instructions at the exact right location |
| Interrupt to course-correct | Edit the hexplan, agent adapts on next step |
| Context lost between sessions | Hexplan persists, agent resumes from state |

**The workflow:**
1. Define your system as a hierarchy of tasks with context
2. Run `hexecute` — agent works autonomously through subtasks
3. Monitor progress by reading hexplan tiles at direction-0
4. To adjust: stop the agent, edit the relevant hexplan tile, restart
5. Agent reads its hexplan, skips completed steps, continues from current state

**Why this works:** System thinkers naturally decompose problems hierarchically. Hexframe makes that decomposition the control interface — you edit structure, not chat history.

### Divide and Conquer Prompting

The `hexecute` tool transforms any tile into a structured XML prompt using tile hierarchy:

**Prompt structure from tile anatomy:**
- `<context>`: Context children (-1 to -6) provide reference materials, constraints, templates
- `<subtasks>`: Subtask children (1-6) are work units to divide into subagents
- `<task>`: Tile's own title (goal) and content (requirements)
- `<hexplan>`: Direction-0 child tracks execution state and guides agent decisions

**Key insight:** System thinkers already decompose hierarchically. Hexframe makes that decomposition directly executable — no prompt engineering required.

**Implementation:** The `buildPrompt()` function in `src/lib/domains/agentic/services/prompt-executor.service.ts` deterministically generates XML from tile coordinates.

### Hexplan Tiles: The Control Interface

**Direction-0 tiles are the hexplan layer:** Each task stores its execution state at `[...path, 0]`:
- Tile `[1, 3]` → hexplan at `[1, 3, 0]`
- Root tile `[]` → hexplan at `[0]`

**The hexplan serves two audiences:**
1. **For agents**: Tracks what's done, what's next, and any user adjustments
2. **For humans**: Provides visibility into task progress for review and course-correction

**Hexplan content differs by tile type:**
- **Parent tile hexplan**: List of subtasks to execute in order (can be generated programmatically from children)
- **Leaf tile hexplan**: Agent's plan to complete the concrete work

**Status markers (agent-written tokens):**

When agents update hexplan tiles via `updateItem`, they MUST use these exact emoji-prefixed tokens:
- 🟡 STARTED — Task execution began
- ✅ COMPLETED — Task finished successfully
- 🔴 BLOCKED — Task stuck, needs human intervention

Steps without a prefix are considered pending (📋). The 📋 emoji is for display/human use only — agents don't write it.

**Human-in-the-loop control:**
- Read `[1, 0]` to see top-level progress
- Edit any hexplan to adjust the approach
- Mark steps as completed to skip them
- Add instructions — agent incorporates them on next run

**Implementation:** The MCP `hexecute` tool reads hexplan tiles and includes them in prompts. Agents update using standard `updateItem` calls.

## Important Notes
- Always use `pnpm` (not npm or yarn)
- Tests use Vitest (not Jest)
- Never use pnpm dev to check something is working. just run pnpm check:lint typecheck check:quality test
- **Import Rules**: Always use absolute imports with `~/` prefix instead of relative imports (`./` or `../`). This is enforced by ESLint `no-restricted-imports` rule for better maintainability and consistency.