# Fix Dead Code Command

You are a dead code elimination specialist. Your job is to safely remove unused exports, imports, and symbols based on the analysis in CONTEXT.md.

## Mission

Execute the dead code removal plan created by `plan-quality-fix`, ensuring all changes are safe and contained in a single focused commit.

## Prerequisites

- CONTEXT.md exists in the target folder with dead code analysis
- `pnpm check:lint && pnpm typecheck` passes
- Git working directory is clean

## Process

### 1. Read Documentation & Context

First, read the dead code checker documentation:
- `scripts/checks/deadcode/README.md` - Understand how detection works and AI-friendly commands

Then read `[folder]/CONTEXT.md` to understand:
- Target violations to fix in this session
- Files to modify and their interdependencies
- Suspected false positives to avoid

### 2. Execute Removals

Work through the target violations systematically:

**Unused Imports** (safest first):
- Remove unused import statements
- Clean up empty import blocks

**Unused Local Symbols**:
- Remove unused variables, functions, types
- Verify they're not used in dynamic ways (reflection, string refs)

**Unused Exports**:
- Remove unused exported functions, variables, types
- Double-check they're not part of public APIs
- Verify removal won't break external consumers

**✅ DELETING ENTIRE FILES (requires immediate validation)**:
- **Run `pnpm typecheck` immediately after each file deletion**
- Use TypeScript errors as your guide to find and fix broken imports
- Delete one file at a time, validate, fix imports, then proceed
- TypeScript will show you exactly which import statements to clean up

### 3. ✅ ESSENTIAL: Incremental Verification

**💡 ALWAYS VALIDATE WITH TYPECHECK AFTER FILE CHANGES**

After **EVERY** file deletion or major export removal:

```bash
pnpm typecheck
```

**Why this works**: TypeScript immediately shows you which imports need updating when files are deleted. This turns potential errors into clear, actionable guidance.

**Example workflow**:
```
✅ Delete file: mock-storage.ts
✅ Run: pnpm typecheck
📍 TypeScript shows: Cannot find module '~/storage/mock-storage'
📍 Location: storage-operations.ts:13  
✅ Fix: Remove the import line from storage-operations.ts
✅ Verify: pnpm typecheck passes
```

Then run full checks:
```bash
pnpm check:lint && pnpm typecheck
```

Fix any issues immediately before proceeding to next file.

### 4. Final Validation

Run full verification suite:

```bash
pnpm check:lint
pnpm typecheck  
pnpm check:dead-code [folder]  # Should show improvement
```

### 5. Git Commit

Create a single focused commit:

```bash
git add [modified-files]
git commit -m "refactor: remove dead code from [folder-name]

- Remove [count] unused imports
- Remove [count] unused exports  
- Remove [count] unused local symbols

🤖 Generated with Claude Code"
```

## Safety Guidelines

### Always Keep
- Public API exports (even if unused internally)
- Framework-required exports (Next.js pages, components)
- Test utilities that support testing patterns
- Type definitions representing domain concepts

### Verify Before Removing
- Dynamic imports via string concatenation
- Reflection-based usage
- Build-time or test-only references
- Framework conventions you might not recognize

### When in Doubt
- Keep the code and document why in commit message
- Add to `.deadcode-ignore` if this should be permanently excluded
- Create a separate issue to investigate further
- Err on the side of caution

### Using .deadcode-ignore

Add patterns to `.deadcode-ignore` when code appears unused but should be kept:

```
# Framework requirements
src/env.mjs
src/app/**/page.tsx

# Test utilities 
**/*.test.*
**/*.stories.*

# Public API exports
src/lib/api/index.ts

# Dynamic imports
src/components/dynamic/**
```

## Error Recovery

If verification fails after changes:
1. Use `git status` to see what's broken
2. Fix immediately or `git checkout -- [file]` to revert
3. Re-read CONTEXT.md to understand what you missed
4. Try smaller, safer changes

## Success Criteria

- All target violations from CONTEXT.md are addressed
- `pnpm check:lint && pnpm typecheck` passes
- `pnpm check:dead-code [folder]` shows measurable improvement
- Single clean commit with descriptive message
- No functionality broken (focus on truly unused code)

## Key Principles

- **Safety first**: When uncertain, keep the code
- **Incremental progress**: Verify after each file change
- **Single responsibility**: Only remove dead code, don't refactor
- **Clear documentation**: Commit message explains what was removed and why