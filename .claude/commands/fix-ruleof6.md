# Fix Rule of 6 Command

You are a Rule of 6 enforcement specialist. Your job is to fix cognitive complexity violations through intelligent refactoring based on the analysis in CONTEXT.md.

## Mission

Execute Rule of 6 fixes planned by `plan-quality-fix`, reducing cognitive load through meaningful abstractions and proper organization while avoiding over-engineering.

## Prerequisites

- CONTEXT.md exists in the target folder with Rule of 6 analysis
- `pnpm check:lint && pnpm typecheck && pnpm check:deadcode [folder] && pnpm check:architecture [folder]` passes
- Git working directory is clean

## Process

### 1. Read Documentation & Context

First, read relevant documentation:
- `scripts/checks/deadcode/README.md` - Understand dead code detection (refactoring may create dead code)
- `scripts/checks/architecture/README.md` - Understand architectural boundaries (refactoring may affect them)
- `scripts/checks/ruleof6/README.md` - Understand philosophy, rules, and violation types

Then read `[folder]/CONTEXT.md` to understand:
- Target violations to fix in this session
- Files to modify and their interdependencies
- Architectural context for making refactoring decisions

### Understanding Domain-Aware Rule of 6

**New Behavior**: The Rule of 6 now separates domain items from generic infrastructure:

**Generic Infrastructure (Excluded from Count)**:
- **Folders**: docs/, types/, utils/, components/, hooks/, __tests__/, tests/, fixtures/, mocks/, stories/
- **Files**: README.md, index.ts/tsx, page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx, *.config.*, *.test.*, *.spec.*, *.stories.*, dependencies.json

**Domain Items (Count Toward Rule of 6)**:
- Business logic folders and files
- Feature-specific modules
- Domain-specific abstractions

**Example**: A directory with 15 total items might only have 4 domain items (within limits) if the other 11 are generic infrastructure.

**Impact on Refactoring**: Focus refactoring efforts on organizing domain items meaningfully rather than moving generic infrastructure files around.

### 2. Execute Rule of 6 Fixes

Work through violations in **impact and safety order**:

#### A. Directory Items (First - Organizational)
**Group related domain items into meaningful subdirectories based on domain responsibility, not arbitrary criteria.**

**Note**: Generic infrastructure (docs/, types/, utils/, hooks/, README.md, index.ts, *.test.*, etc.) is automatically excluded from the Rule of 6 count. Focus on organizing domain-specific folders and files that represent meaningful business abstractions.

#### B. Functions per File (Second - Extract Cohesive Modules)
**Move related functions to focused modules based on domain responsibility or shared purpose, not arbitrary technical patterns.**

#### C. Large Functions (Third - Careful Extraction)  
**Extract functions only when they have multiple clear responsibilities at different abstraction levels. Keep intact when function performs sequential steps at consistent abstraction level.**

#### D. Function Arguments (Last - Parameter Objects)  
**Group related parameters into cohesive objects when they represent the same domain concept and would naturally be passed together.**

### 3. ✅ ESSENTIAL: Incremental Verification

**💡 VALIDATE AFTER EACH FILE MOVE OR MAJOR EXTRACTION**

After each major refactoring (especially file moves or function extractions):

```bash
pnpm typecheck  # Quick check for broken imports first
```

If typecheck passes, run full validation:
```bash
pnpm check:lint && pnpm typecheck && pnpm check:deadcode [folder] && pnpm check:architecture [folder]
```

**Why this works**: TypeScript immediately catches broken import paths from file moves, making issues easy to spot and fix before they accumulate.

### 4. Final Validation

Run full verification suite:

```bash
pnpm check:lint
pnpm typecheck
pnpm check:deadcode [folder]     # Refactoring may create dead code
pnpm check:architecture [folder]  # Refactoring may affect boundaries
pnpm check:ruleof6 [folder]      # Should show improvement (note: updated command name)
```

### 5. Git Commit

Create a single focused commit:

```bash
git add [modified-files]
git commit -m "refactor: fix Rule of 6 violations in [folder-name]

- Organize [count] domain folders/files into meaningful groups
- Extract [count] functions into focused modules  
- Refactor [count] functions with parameter objects
- Split [count] large functions with clear responsibilities

Note: Generic infrastructure (docs/, utils/, *.test.*) excluded from count

🤖 Generated with Claude Code"
```

## Refactoring Decision Framework

### For Directory Organization
**Focus on domain items only** - generic infrastructure is automatically excluded. Group domain items by natural business boundaries (business domain, feature areas, domain concepts) rather than arbitrary splits. Don't create subdirectories just to move generic files like README.md or index.ts.

### For Function Extraction  
Extract only when function has multiple clear responsibilities or mixes abstraction levels. Keep intact for sequential implementation details at consistent abstraction level.

### For Parameter Reduction
Create parameter objects when parameters belong to same domain concept and would naturally be passed together. Keep separate when parameters represent different concerns or are used independently.

## Error Recovery

If verification fails after refactoring:
1. Check for broken import paths from file moves
2. Verify new parameter objects don't break existing calls
3. Ensure extracted functions maintain proper typing
4. Use `git checkout -- [file]` to revert problematic changes
5. Make smaller, more focused refactors

## Success Criteria

- All target violations from CONTEXT.md are addressed
- All verification steps pass (lint, typecheck, deadcode, architecture, rule-of-6)
- Single clean commit with descriptive message
- Code is more readable and maintainable, not just compliant
- No artificial abstractions or over-engineering introduced
- Refactoring creates meaningful improvements to code organization

## Exception Handling Strategy

When no meaningful refactoring solution exists, use the **built-in exception handling system** to document complexity rather than create artificial abstractions:

**Create `.ruleof6-exceptions` file** with custom thresholds:
```
# Function-specific exceptions with custom thresholds
src/math/hex-calculations.ts:calculatePoints: 150  # Mathematical algorithm
src/legacy/parser.ts:parseComplexFormat: 200     # Legacy format parser

# Directory-specific exceptions
src/components/forms: 12  # Cohesive form component library

# Justification: Low-level mathematical functions with sequential logic
# Breaking apart would reduce clarity and create artificial abstractions
# TODO: Refactor when math library is updated
```

**Validation Features**:
- ✅ **Automatic validation**: Exception files are validated against actual code
- ✅ **Function existence**: Function-specific exceptions verify the function exists
- ✅ **Directory existence**: Directory paths are validated
- ✅ **Console output**: Custom thresholds are clearly marked with 🎯 indicator
- ✅ **JSON metadata**: Exception source and thresholds included in reports

**Exception Philosophy**:
- Use for mathematical algorithms requiring sequential logic
- Use for framework-imposed patterns (e.g., route handlers)
- Use for cohesive domain collections that belong together
- Don't use to avoid beneficial refactoring
- Don't use to create artificial permission for complex code

**Principle**: Better to explicitly acknowledge complexity with clear reasoning than create meaningless abstractions that reduce code clarity.

## Key Principles

- **Cognitive load reduction**: Make code easier for humans to understand
- **Meaningful abstractions**: Only create abstractions that add real value
- **Domain-driven organization**: Group by business domain, not arbitrary criteria  
- **Single responsibility**: Each extracted unit should have one clear purpose
- **Preserve functionality**: Refactor structure, never behavior
- **Exception transparency**: Document complexity exceptions rather than hide them with poor abstractions