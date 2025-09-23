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

## 🚀 IMMEDIATE ACTION REQUIRED

**Check the current workflow state and suggest the next action:**
1. Read `.workflow/current.json` to identify current phase and progress
2. Check `.workflow/cycles/[current]/README.md` for priority details
3. If a priority file exists (`.workflow/cycles/[current]/priority-X-*.md`), read it for detailed plan
4. If no priority file exists, work from the cycle README (likely a quick win)
5. Proactively suggest: "Based on the workflow, you're currently in [PHASE] working on [PRIORITY]. Would you like to [NEXT ACTION]?"

Example: "You're in the execution phase working on Priority 0 (Establish baseline context). Would you like to start updating X?

## Project Overview

Hexframe transforms visions into living systems through AI-powered hexagonal maps.

### Core Documentation
- **Mission & Vision**: `company/MISSION.md` - Why Hexframe exists
- **Culture & Values**: `company/CULTURE.md` - The tensions that guide us  
- **Target User**: `company/TARGET_USER.md` - Who we serve (system thinkers)
- **Main page**: `src/app/map/README.md` - The interface (web page) to the HexFrame system
- **Domain Model**: `src/lib/domains/README.md` - Core domain structure
- **System Philosophy**: `src/app/SYSTEM.md` - What systems mean in Hexframe

### Current Development Status
- **Workflow State**: `.workflow/current.json` - Current phase, priorities, progress
- **Active Cycle**: `.workflow/cycles/2025-08-07/` - Current sprint documentation
- **Milestones**: `.workflow/milestones/` - High-level goals tracking

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

## Important Notes
- Always use `pnpm` (not npm or yarn)
- Tests use Vitest (not Jest)
- Never use pnpm dev to check something is working. just run pnpm check:lint typecheck check:quality test
- **Import Rules**: Always use absolute imports with `~/` prefix instead of relative imports (`./` or `../`). This is enforced by ESLint `no-restricted-imports` rule for better maintainability and consistency.