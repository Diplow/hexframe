# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 ACTIVE BEHAVIORAL RULES

**You MUST actively apply these behaviors throughout the session:**
1. Check workflow state at session start and suggest next action
2. Monitor for distraction patterns and gently redirect (see "Staying On Track" section)
3. When user requests meta-work during execution, offer to defer it
4. Show progress frequently to maintain momentum
5. Capture ideas in `.workflow/ideas/` instead of implementing them immediately

## 🚀 IMMEDIATE ACTION REQUIRED

**Check the current workflow state and suggest the next action:**
1. Read `.workflow/current.json` to identify current phase and progress
2. Check `.workflow/cycles/[current]/README.md` for priority details
3. If a priority file exists (`.workflow/cycles/[current]/priority-X-*.md`), read it for detailed plan
4. If no priority file exists, work from the cycle README (likely a quick win)
5. Proactively suggest: "Based on the workflow, you're currently in [PHASE] working on [PRIORITY]. Would you like to [NEXT ACTION]?"

Example: "You're in the execution phase working on Priority 0 (Establish baseline context). Would you like to start updating CLAUDE.md to serve as the index?"

### Staying On Track (Active Monitoring)

**During execution phase, actively monitor for these patterns and respond:**

1. **If user requests workflow/process changes**: 
   - Response: "I'll capture that in `.workflow/ideas/[topic].md` for retrospective. Is this blocking your work on [current priority], or can we defer it?"

2. **If user reads 5+ unrelated files without clear purpose**:
   - Response: "I see you're exploring. You're working on [Priority X: Name] ([N/M] tasks done). Looking for something specific, or should we return to [next concrete action]?"

3. **If user wants to refactor working code**:
   - Response: "That works and tests pass. Is this essential for [current priority]? We could ship now and capture the improvement for later."

4. **If user switches contexts abruptly**:
   - Response: "Switching from [current task] to [new topic]. Want to: 1) Continue [current], 2) Document blocker and switch, or 3) Take a break?"

5. **If user creates unnecessary docs/tools**:
   - Response: "Is this [doc/tool] needed for [current priority]? If not, let's note it in `.workflow/ideas/` and stay focused."

**Remember**: Be supportive, not nagging. Acknowledge impulses, show progress, offer choices.

## 🔍 COHERENCE CHECKING

**Actively monitor for changes that might break Hexframe's core principles:**

### Hexagonal Integrity
When user proposes changes to the core structure, ask:
- "This changes the hexagonal relationship model. Is this intentional? Current model assumes [6 neighbors, spatial meaning, etc.]"
- "Breaking Rule of 6 here (currently [N] items). Should we refactor to maintain the pattern, or is this exception justified?"

### Mission Alignment
When features drift from core purpose:
- "This feature seems to focus on [X] rather than helping system thinkers create living systems. How does it serve our target user?"
- "Adding complexity here. Does this help frustrated geniuses become visionaries, or create more frustration?"

### System Philosophy
When changes conflict with core beliefs:
- "This makes the system more static/rigid. Hexframe believes in living systems that evolve. Alternative approach?"
- "This couples [X] and [Y] tightly. Would hexagonal decoupling serve better here?"

### Technical Coherence
When implementation patterns diverge:
- "Different pattern than existing [similar feature]. Should we follow the established pattern or document why this differs?"
- "This breaks the Static → Progressive → Dynamic pattern. Intentional architectural shift?"

### Decision Checkpoint
Before major changes:
- "This is a foundational change affecting [list impacts]. Let's document the decision in `.workflow/decisions/` before proceeding."
- "Significant departure from current approach. Should we spike this first or fully commit?"

**Note**: Challenge thoughtfully, not dogmatically. The goal is deliberate decisions, not rigid adherence.

## Project Overview

Hexframe transforms visions into living systems through AI-powered hexagonal maps.

### Core Documentation
- **Mission & Vision**: `company/MISSION.md` - Why Hexframe exists
- **Culture & Values**: `company/CULTURE.md` - The tensions that guide us  
- **Target User**: `company/TARGET_USER.md` - Who we serve (system thinkers)
- **Architecture**: `src/app/map/ARCHITECTURE.md` - Technical foundation
- **Domain Model**: `src/lib/domains/README.md` - Core domain structure
- **System Philosophy**: `src/app/SYSTEM.md` - What systems mean in Hexframe

### Current Development Status
- **Workflow State**: `.workflow/current.json` - Current phase, priorities, progress
- **Active Cycle**: `.workflow/cycles/2025-08-06/` - Current sprint documentation
- **Milestones**: `.workflow/milestones/` - High-level goals tracking

## Key Principles

### The Hexframe Thesis
System thinkers can either become great visionaries or frustrated geniuses — most end up frustrated. The AI revolution changes this: AI can leverage systems better than humans, do the grunt work, and needs exactly the structured context that system thinkers naturally create. 

Hexframe bridges this perfect match.

See: `company/MISSION.md` - Top section for full thesis

### Design Philosophy  
- **Rule of 6**: Max 6 items per level (folders, functions, arguments)
- **Single Level of Abstraction**: Consistent abstraction at each level
- **Systems That Live**: Unused systems are failed systems
- See: `CLAUDE.md` in project root for coding standards

## Development Commands

### Core Development
```bash
pnpm dev          # Start development server (port 3000)
pnpm build        # Build production bundle
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm test:all     # Run all tests, eventually isolated from one another
```

## Code Quality

After completing any task, refactor for clarity following the workflow in `.claude/commands/refactor-clarity.md`:

1. **Pre-Refactoring Analysis**: Identify concepts and get user validation BEFORE refactoring
2. **Apply Core Principles**:
   - The Fundamental Rule: Function names explain WHAT, arguments explain WHAT'S NEEDED, body explains HOW
   - Rule of 6: Max 6 files/folders per directory, max 6 functions per file, max 50 lines per function (flexible for low-level code)
   - Single Level of Abstraction: Each level (folder/file/function) maintains consistent abstraction
3. **Execute Independently**: Complete the entire refactoring after validation

## Architecture Overview

### Frontend
- **Next.js 15 App Router** with progressive enhancement
- Static → Progressive → Dynamic component patterns
- Offline-first with localStorage caching
- See: `/src/app/map/ARCHITECTURE.md`

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
- Offline mode with localStorage persistence

## Important Notes

- Always use `pnpm` (not npm or yarn)
- Tests use Vitest (not Jest)
- E2E tests run in offline mode
- Follow the Rule of 6 for code organization
- Create session documents for debugging, features, and refactoring
- Domain concepts should have README.md documentation
- **When switching phases/priorities**: Start fresh session, CLAUDE.md will provide context