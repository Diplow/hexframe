# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hexframe is a visual framework for building and sharing AI-powered systems through hierarchical hexagonal maps. It transforms complex AI interactions from "prompt engineering" into "context architecture" - allowing users to visually build, compose, and share structured AI workflows.

Core philosophy: Where human intent meets AI capability through strategic mapping.

## Development Commands

### Core Development
```bash
pnpm dev          # Start development server (port 3000)
pnpm build        # Build production bundle
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
```

### Testing
```bash
./scripts/run-tests.sh    # Run all tests (uses Vitest, not Jest)
./scripts/run-tests.sh -w # Watch mode
./scripts/run-tests.sh --ui # UI mode
pnpm test:unit    # Unit tests only
pnpm test:integration # Integration tests only
pnpm test         # Always use pnpm test to run tests
pnpm storybook    # Component development with Storybook
```

## Code Quality

After completing any task, refactor for clarity following the workflow in `.claude/commands/refactor-clarity.md`:

1. **Pre-Refactoring Analysis**: Identify concepts and get user validation BEFORE refactoring
2. **Apply Core Principles**:
   - The Fundamental Rule: Function names explain WHAT, arguments explain WHAT'S NEEDED, body explains HOW
   - Rule of 6: Max 6 files/folders per directory, max 6 functions per file, max 50 lines per function (flexible for low-level code)
   - Single Level of Abstraction: Each level (folder/file/function) maintains consistent abstraction
3. **Execute Independently**: Complete the entire refactoring after validation

### E2E Testing (Offline UI Tests)

E2E tests run in offline mode using localStorage-based caching. They verify UI behavior without server dependencies.

#### Running E2E Tests

```bash
# Prerequisites: Dev server must be running
pnpm dev                      # Start dev server on port 3000

# Run tests
pnpm test:e2e:ui             # Opens Playwright UI for interactive test debugging
pnpm test:e2e                # Runs all E2E tests in terminal (offline mode)
pnpm test:e2e:debug          # Debug mode with Playwright inspector
pnpm test:e2e:headed         # Run tests with visible browser window
```

**Note**: Tests use offline mode with localStorage persistence. No server/database required beyond the dev server.

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

## Development Workflows

### 1. Debugging Workflow (`.claude/commands/debug.md`)

When debugging issues:

1. **Create Debug Session**: Use `/issue` command to create issue documentation
2. **Understand Architecture**: Check README files before investigating
3. **Make Assumptions**: Make working assumptions rather than asking for clarification
4. **Fix Linter Errors**: Immediately fix any linter errors in investigated files
5. **Use E2E Tests**: For UI issues, use `pnpm test:e2e:debug`
6. **Add Tests**: Write tests that would have caught the bug
7. **Consider Refactoring**: Complex bugs often hide in complex code

### 2. Feature Implementation (`.claude/commands/feature.md`)

When implementing new features:

1. **Create Feature Doc**: Use `/issue` command to create issue documentation
2. **Understanding Phase**: Clarify requirements, define problem, challenge assumptions
3. **Analysis Phase**: Study architecture, check existing patterns
4. **Design Phase**: Propose solution with alternatives
5. **Implementation**: Incremental changes, test happy path first
6. **Verification**: Review and ensure quality

### 3. Refactoring for Clarity (`.claude/commands/refactor-clarity.md`)

The project follows the "Rule of 6" - consistent with Hexframe's hexagonal structure:

#### The Fundamental Rule
- **Function Name**: Explains WHAT it does
- **Arguments**: Explain WHAT'S NEEDED
- **Function Body**: Explains HOW it does it

#### Rule of 6 Structure
- **Folders**: Max 6 child folders + 6 files per directory
- **Files**: Max 6 functions per file (prefix internal functions with "_")
- **Functions**: Max 50 lines (flexible for low-level code)
- **Arguments**: Max 3 arguments, or 1 object with max 6 keys

#### Refactoring Process
1. **Create Session**: Use `/refactor` command for clarity refactoring
2. **Pre-Analysis**: Identify existing and new domain concepts
3. **Validation**: Get user approval on new concepts BEFORE refactoring
4. **Execute**: Complete the entire refactoring independently

## Key Concepts

### Hexframe Structure
- **Tile**: Hexagonal unit representing a single concept/task
- **Frame**: Expanded tile with 1 center + up to 6 child tiles
- **Map**: View centered on a tile showing its descendants
- **System**: Complete hierarchical structure

### Spatial Meaning
- **Opposite tiles**: Represent tensions or complementary aspects
- **Neighboring tiles**: Natural connections and collaborators
- **Center tile**: Unifies surrounding concepts

### Visual Composition
- **Tool Tiles**: LLMs, APIs, databases as reusable components
- **Drag-to-Center**: Compose tiles to create new systems
- **Drag-to-Neighbor**: Augment tiles with capabilities
- **CollaborativeMaps**: Templates for multi-agent orchestration

## Best Practices

1. **Make Smart Assumptions**: Proceed with reasonable assumptions rather than blocking on questions
2. **Test Happy Path First**: Get basic functionality working before edge cases
3. **Lint Early and Often**: Fix linter errors immediately when found
4. **Document Intent**: Use clear naming that reveals purpose
5. **Maintain Abstraction Levels**: Keep consistent abstraction at each level
6. **Use Existing Patterns**: Check similar code before implementing new patterns

## Common Tasks

### Running the Development Environment
```bash
./scripts/start-database.sh   # Start PostgreSQL container
pnpm db:migrate              # Run database migrations
pnpm dev                     # Start development server
```

### Running Tests
```bash
pnpm test:all                # Always run pnpm test:all instead of pnpm test
pnpm test:unit               # Unit tests only
pnpm test:integration        # Integration tests only
pnpm test:e2e                # E2E tests (requires dev server)
```

### Code Quality Checks
```bash
pnpm lint                    # ESLint checks
pnpm typecheck              # TypeScript checks
pnpm build                  # Full production build
```

## Important Notes

- Always use `pnpm` (not npm or yarn)
- Tests use Vitest (not Jest)
- E2E tests run in offline mode
- Follow the Rule of 6 for code organization
- Create session documents for debugging, features, and refactoring
- Domain concepts should have README.md documentation