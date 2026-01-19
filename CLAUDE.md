# CLAUDE.md

This file provides guidance to AI agents and developpers when working with code in this repository.

## 📚 HIERARCHICAL DOCUMENTATION NAVIGATION

**When understanding any part of the codebase, read documentation hierarchically:**

1. **Start here** with the root CLAUDE.md for project overview
2. **Navigate to relevant subsystem** README.md files:
   - `src/lib/domains/README.md` - For business logic and data persistence
   - `src/app/map/README.md` - For frontend/UI questions
   - `src/server/README.md` - For backend/API questions
3. **Drill deeper** into specific subsystem README.md files as needed
4. **Read before acting** - Always read the relevant README.md before modifying code

Each README.md should contain:
- **Mental Model**: How to think about this subsystem
- **Responsibilities**: What this subsystem handles
- **Subsystems**: Child components and their purposes

## Project Overview

Hexframe transforms visions into living systems through AI-powered hexagonal maps.

### Core Documentation
- **Mission & Vision**: `docs/company/MISSION.md` - Why Hexframe exists
- **Culture & Values**: `docs/company/CULTURE.md` - The tensions that guide us  
- **Target User**: `docs/company/TARGET_USER.md` - Who we serve (system thinkers)
- **Main page**: `src/app/map/README.md` - The interface (web page) to the HexFrame system
- **Domain Model**: `src/lib/domains/README.md` - Core domain structure
- **System Philosophy**: `src/app/SYSTEM.md` - What systems mean in Hexframe

## Key Principles

### The Hexframe Thesis
System thinkers can either become great visionaries or frustrated geniuses — most end up frustrated. The AI revolution changes this: AI can leverage systems better than humans, do the grunt work, and needs exactly the structured context that system thinkers naturally create. 

## Development Commands

### Core Development
```bash
pnpm check:lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm test         # Run all tests with AI-friendly JSON output
pnpm check:deadcode
pnpm check:architecture
pnpm check:ruleof6
```

## Code Quality

### Architecture Enforcement
Use `pnpm check:architecture` to validate architectural boundaries and coding standards. See `scripts/checks/architecture/README.md` for comprehensive documentation on rules, error types, and AI-friendly filtering commands.

### Dead Code Detection
Use `pnpm check:deadcode [path]` to identify unused exports, files, and transitive dead code. See `scripts/checks/deadcode/README.md` for detection logic and AI-friendly JSON filtering commands. Always review before removing - false positives can occur with dynamic imports and framework patterns.

## Architecture Overview

### Frontend
- **Next.js 15 App Router** with progressive enhancement
- Static → Progressive → Dynamic component patterns
- localStorage caching for performance
- See: `/src/app/map/README.md`

### Backend
- **tRPC** for type-safe API
- Server-side caching and optimizations
- See: `/src/server/README.md`

### Domain Layer
- **Domain-Driven Design** in `/src/lib/domains/`
- Clear boundaries between mapping, IAM, and other domains
- See: `/src/lib/domains/README.md`

### Data Layer
- **Drizzle ORM + PostgreSQL**
- Migrations in `/drizzle/migrations/`
- localStorage for performance caching

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