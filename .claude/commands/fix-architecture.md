# Fix Architecture Command

You are an architecture compliance specialist. Your job is to fix architectural boundary violations and structural issues based on the analysis in CONTEXT.md.

## Mission

Execute the architecture fixes planned by `plan-quality-fix`, ensuring proper subsystem boundaries, dependencies, and architectural patterns are established.

## Prerequisites

- CONTEXT.md exists in the target folder with architecture analysis
- `pnpm check:lint && pnpm typecheck && pnpm check:deadcode [folder]` passes
- Git working directory is clean

## Process

### 1. Read Documentation & Context

First, read relevant documentation:
- `scripts/checks/deadcode/README.md` - Understand dead code detection for file/folder conflicts
- `scripts/checks/architecture/README.md` - Understand rules, error types, and requirements

Then read `[folder]/CONTEXT.md` to understand:
- Target violations to fix in this session
- Files to modify and their interdependencies
- Architectural context and subsystem structure

Also read the dependency schema:
- `schemas/dependencies.schema.json` - Understand proper format for dependencies.json files

### 2. Execute Architecture Fixes

Work through violations in this **architectural priority order**:

#### A. File/Folder Conflicts (First - Often Hide Dead Code)
**Analyze both implementations carefully to determine which contains current/correct functionality. Merge if both are needed, remove dead code versions, consolidate to directory structure, and update imports.**

**Critical**: Examine implementations rather than blindly moving files - one version may be dead code.

#### B. Dependency Declarations (Second - Mechanical but Requires Thought)
**Fix dependencies.json format while minimizing surface exposure. Use absolute paths, declare imports in allowed array, add child subsystems only for real architectural boundaries, use exceptions sparingly for documented violations.**

**Key Principle**: Minimize surface exposure - don't leak internal implementation details.

#### C. Import Boundary Violations (Third - Can Hide Complexity)
**Create missing index.ts files with minimal cohesive interfaces, update import statements to use subsystem boundaries. Assess if fixes create tighter coupling and document complexity increases in commit message.**

**Warning**: Fixing import boundaries can sometimes increase coupling. Acknowledge this trade-off.

#### D. Complexity Requirements (Last - Major Architectural Decisions)
**Subsystem creation usually involves refactoring, not just documentation**:

1. **Reflect on the folder's true architectural role**:
   - Does this represent a coherent domain concept or responsibility?
   - Should this be a real subsystem that appears in architectural discussions?
   - Even if the folder "accidentally" became a good boundary, consciously decide if it should be a subsystem

2. **Most often, create NEW subsystems through refactoring**:
   - Extract related functionality into a new dedicated subsystem folder
   - Move cohesive responsibilities from the current folder into the new subsystem
   - Establish clear interfaces between the original folder and new subsystem
   - Update dependencies and imports to reflect the new structure
   - **Key benefit**: This naturally reduces the parent folder's line count, solving the complexity violation through proper architectural separation

3. **Only occasionally, promote existing folder to subsystem**:
   - Rare case where the folder already represents a perfect subsystem boundary
   - Still requires conscious architectural decision and reflection
   - Add `README.md`, `dependencies.json`, and `ARCHITECTURE.md` to formalize it

**Critical**: Creating a subsystem is a significant architectural decision that usually involves refactoring code structure, not just adding documentation files.

### 3. Incremental Verification

After each major change:

```bash
pnpm check:lint && pnpm typecheck && pnpm check:deadcode [folder]
```

Fix any issues immediately before proceeding.

### 4. Final Validation

Run full verification suite:

```bash
pnpm check:lint
pnpm typecheck
pnpm check:deadcode [folder]
pnpm check:architecture [folder]  # Should show improvement
```

### 5. Git Commit

Create a single focused commit:

```bash
git add [modified-files]
git commit -m "refactor: fix architecture violations in [folder-name]

- Add [count] missing dependencies.json files
- Create [count] subsystem index.ts interfaces
- Fix [count] import boundary violations
- Resolve [count] file/folder conflicts

🤖 Generated with Claude Code"
```

## Error Recovery

If verification fails after changes:
1. Check specific TypeScript errors for import path issues
2. Verify dependencies.json syntax matches schema
3. Ensure all reexports are properly typed
4. Use `git checkout -- [file]` to revert problematic changes
5. Make smaller, incremental changes

## Success Criteria

- All target violations from CONTEXT.md are addressed
- `pnpm check:lint && pnpm typecheck && pnpm check:deadcode [folder]` passes
- `pnpm check:architecture [folder]` shows measurable improvement
- Single clean commit with descriptive message
- No functionality broken, only architectural structure improved
- New dependencies.json files follow schema exactly

## Exception Handling Strategy

When no good architectural solution exists, document exceptions rather than force poor abstractions:

**For complexity thresholds** ✅ **Now Available**:
Create `.architecture-exceptions` file in project root or any parent directory:
```
# Folder-level complexity exceptions with higher thresholds
src/complex-legacy-folder: 2000  # Justified because [specific reason]
src/payments/legacy-processor: 1500  # Legacy system pending Q2 2024 rewrite

# Comments explaining reasoning are required
# TODO items encouraged for planning refactor timeline
```

The architecture checker will:
- Walk up directory tree to find the most specific exception file
- Apply custom threshold instead of default 1000/500 limits
- Report exception usage in console: `🔧 Using custom thresholds from .architecture-exceptions`
- Include exception details in JSON output with `custom_threshold`, `exception_source`, and `justification`
- Validate that paths exist and require justification comments

**For import violations**: Use `exceptions` in dependencies.json:
```json
{
  "exceptions": {
    "~/legacy/old-system": "TEMPORARY: Remove when migration complete (Q1 2024)"
  }
}
```

**Principle**: Better to explicitly acknowledge exceptions with clear reasoning than force inappropriate architectural solutions.

## Key Principles

- **Schema compliance**: Dependencies.json must follow schema exactly
- **Incremental progress**: Fix one violation type at a time
- **Interface preservation**: Maintain existing public APIs
- **Clear boundaries**: Establish proper subsystem encapsulation
- **Exception transparency**: Document architectural exceptions rather than hide complexity