# Plan Quality Fix Command

You are a code quality orchestrator that continuously improves folder quality through automated child command dispatch.

## Mission

Analyze a folder's quality violations and execute focused fixes through specialist child agents until all errors are eliminated or maximum iterations reached.

**Fully Automated**: This command runs iteratively, dispatching appropriate child commands and updating context until the folder is clean or problems are detected with the fixing process.

## Process

### Initial Setup

**Read Check Documentation** (once at start):
- `scripts/checks/deadcode/README.md` 
- `scripts/checks/architecture/README.md`
- `scripts/checks/ruleof6/README.md`

### Automated Iteration Loop

Execute the following cycle up to 10 iterations or until all quality checks pass:

#### 1. Pre-Quality Check

Ensure basic code standards before proceeding:

```bash
pnpm check:lint && pnpm typecheck
```

If these fail, stop and report the issues.

#### 2. Git History Review

Analyze recent commits to track progress:

```bash
git log --oneline -10 [folder]
```

#### 3. Sequential Quality Assessment

Run checks **in priority order** and stop at first category with errors:

```bash
pnpm check:dead-code [folder]    # Priority 1: Stop here if errors found
pnpm check:architecture [folder] # Priority 2: Only if dead code is clean  
pnpm check:rule-of-6 [folder]    # Priority 3: Only if architecture is clean
```

If all checks pass, declare victory and exit.

**Volume Check**: If total violations exceed 20, break the loop and recommend starting with a focused subfolder instead (see Subfolder Strategy below).

#### 5. Analysis & Child Dispatch

**Verify Check Results**: Review violations for false positives or check script bugs.

**Create/Update Context**: Generate `[folder]/CONTEXT.md` with:

```markdown  
# Quality Fix Context: [Folder Name] - Iteration [N]

## Folder Responsibilities
[Describe the primary purpose and responsibilities of this folder]

## Subsystem Architecture  
[Explain how different subsystems/components in this folder work together]

## Previous Quality Fix Commits
- [commit-hash]: [commit message]

## Current Target: [deadcode/architecture/ruleof6]

### Target Violations
- [List specific violations to fix in this session]
- [Group related violations that should be fixed together]

### Files to Modify
- [List specific files that need changes]
- [Note any interdependencies between changes]

### Verification Steps
1. `pnpm check:lint` - Must pass
2. `pnpm typecheck` - Must pass  
3. `pnpm check:[target-type] [folder]` - Must show improvement
```

**Dispatch Child Agent**: Use the Task tool to invoke the appropriate child command:
- `fix-deadcode` for dead code violations
- `fix-architecture` for architecture violations  
- `fix-ruleof6` for Rule of 6 violations

#### 6. Monitor Child Results

After child completes:
- Verify the child made progress (fewer violations)
- If child failed to improve violations, stop and report the problem
- If child succeeded, continue to next iteration

### Termination Conditions

Stop the iteration loop when:
1. **Success**: All quality checks pass
2. **Max iterations**: 10 iterations reached
3. **Child failure**: Child agent fails to improve violations
4. **Lint/typecheck failure**: Basic code standards broken
5. **Too many violations**: >20 violations found (recommend subfolder approach)

### Subfolder Strategy

When violations exceed 20, identify the best subfolder candidate:

1. **Check for identified subsystems**: Look for folders with `dependencies.json`, `README.md`, or `ARCHITECTURE.md`
2. **Analyze violation distribution**: Find subfolders with moderate violation counts (5-15) 
3. **Avoid extremes**: Skip subfolders with too few violations (<5) or too many (>15)

**Recommendation format**:
```
Too many violations found (N total). Recommend starting with focused subfolder:

Suggested target: [folder]/[subfolder-name]
- Estimated violations: [count]
- Reasoning: [identified subsystem/moderate complexity/etc.]
- Command: Run plan-quality-fix on [folder]/[subfolder-name] first

After completing this subfolder, return to full folder cleanup.
```

### Final Report

Provide summary of:
- Total iterations performed
- Violations fixed per category
- Final quality status
- Any remaining issues or recommendations

## Key Principles

- **Automated orchestration**: Continuously dispatch child agents until completion
- **Sequential priority**: Dead code → Architecture → Rule of 6 (later fixes create earlier issues)  
- **Progress verification**: Each child must improve violations or process stops
- **Context preservation**: Track progress and architecture understanding across iterations
- **Fail-safe limits**: Maximum 10 iterations to prevent infinite loops

## Success Criteria

Command succeeds when:
1. All quality checks pass (dead code, architecture, Rule of 6)
2. Each child agent makes measurable progress on violations
3. Basic code standards maintained throughout (lint + typecheck)
4. Context and architecture understanding documented for future reference