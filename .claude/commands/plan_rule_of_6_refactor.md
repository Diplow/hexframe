# plan_rule_of_6_refactor

Systematically analyze Rule of 6 violations and create a comprehensive refactoring plan.

## Usage
```
plan_rule_of_6_refactor [target_folder]
```

If no target folder is specified, analyze the entire codebase and suggest starting points.

## Your Mission

You are a **Cognitive Load Architect** tasked with creating a detailed refactoring plan to bring code into compliance with the Rule of 6. Your goal is NOT to mechanically split code, but to **reveal and strengthen the natural architecture** that's struggling to emerge from overly complex structures.

## The Rule of 6 Philosophy

The Rule of 6 is based on **Miller's Law** - humans can effectively handle 5±2 items in working memory. This isn't about arbitrary limits, it's about:

1. **Cognitive Load Management**: Code that fits in a developer's head
2. **Emergent Architecture**: Natural boundaries become visible when forced to organize
3. **Single Level of Abstraction**: Each level should have consistent complexity
4. **Meaningful Groupings**: Related concepts naturally cluster together

### The Rules

| Rule | Threshold | Why |
|------|-----------|-----|
| **Directory Items** | 6 items | Forces logical grouping of related files |
| **Functions per File** | 6 functions | Ensures single responsibility per file |
| **Function Lines** | 50 lines (warn), 100 (error) | Maintains readable, testable units |
| **Function Arguments** | 3 args | Prevents parameter explosion |
| **Object Parameters** | 6 keys | Keeps interfaces manageable |

## Your Process

### Step 1: Assess Complexity Hierarchy

First, run the Rule of 6 checker on the target folder:
```bash
pnpm check:ruleof6 [target_folder]
```

If the target is too complex (>20 violations), identify less complex subfolders to tackle first:
- List all subfolders with their violation counts
- Recommend starting with folders that have 5-15 violations
- Explain why bottom-up refactoring creates stronger foundations

### Step 2: Understand the Domain

Before proposing any changes, deeply understand what you're refactoring:

1. **Read Architecture Documentation**:
   - Check for `ARCHITECTURE.md` in the folder and parent folders
   - Look for `README.md` files explaining the domain
   - Examine `dependencies.json` to understand relationships

2. **Analyze the Code's Purpose**:
   - What problem does this code solve?
   - Who are the consumers of this code?
   - What are the main workflows/use cases?
   - What are the core abstractions?

3. **Identify Natural Boundaries**:
   - Look for hidden subsystems trying to emerge
   - Find concepts that always change together
   - Spot interfaces between different concerns

### Step 3: Refactoring Strategy

#### Order of Operations (CRITICAL)
Always refactor in this sequence to minimize disruption:

1. **Fix Function Length Violations First**
   - Breaking large functions creates more functions
   - Reveals hidden abstractions and responsibilities
   - Makes the next steps clearer

2. **Fix Functions per File Second**
   - Now you have more functions to organize
   - Group related functions into new files
   - Creates clearer module boundaries

3. **Fix Directory Items Last**
   - Now you have more files to organize
   - Group related modules into subdirectories
   - Reveals the higher-level architecture

#### For Each Violation Type

**Large Functions (>100 lines)**:
- Identify distinct phases or responsibilities
- Extract helper functions with descriptive names
- Look for loops that could be separate functions
- Find conditional blocks that represent different strategies

**Too Many Functions per File**:
- Group by data they operate on
- Group by layer (UI, business logic, data access)
- Group by feature or use case
- Extract utility functions to dedicated modules

**Too Many Items in Directory**:
- Group by feature/domain concept
- Separate by architectural layer
- Extract shared utilities
- Consider extracting subsystems

### Step 4: Architectural Analysis

Critically evaluate whether the current structure makes responsibilities hard to isolate:

1. **Coupling Analysis**:
   - Are unrelated concepts forced together?
   - Do changes ripple through multiple files?
   - Are there circular dependencies?

2. **Cohesion Analysis**:
   - Are related concepts scattered across files?
   - Do files have clear, single purposes?
   - Are interfaces well-defined?

3. **Subsystem Identification**:
   - Could parts of this folder become independent subsystems?
   - What would their public interfaces be?
   - How would they communicate?

### Step 5: Create REFACTOR_PLAN.md

Generate a detailed plan with this structure:

```markdown
# Rule of 6 Refactoring Plan: [Target Folder]

## Executive Summary
- Current violations: X errors, Y warnings
- Estimated effort: Z hours
- Risk level: Low/Medium/High
- Recommended approach: [Bottom-up from subfolder X / Direct refactoring / Architectural redesign]

## Domain Understanding

### Purpose
[What this code does and why it exists]

### Consumers
[Who uses this code and how]

### Core Concepts
[Key abstractions and their relationships]

## Current State Analysis

### Violation Summary
[Table of violations by type with counts]

### Architectural Issues
[Problems with current structure that make refactoring harder]

### Hidden Subsystems
[Potential subsystems that could be formalized]

## Refactoring Strategy

### Phase 1: Function Length Refactoring
[Detailed plan for each large function]

### Phase 2: File Organization
[How to split files with too many functions]

### Phase 3: Directory Structure
[New folder structure with rationale]

## Proposed Architecture

### New Directory Structure
```
folder/
├── subsystem-a/       # [Responsibility]
│   ├── core/          # [Core business logic]
│   ├── types/         # [Type definitions]
│   └── index.ts       # [Public API]
├── subsystem-b/       # [Responsibility]
└── shared/            # [Shared utilities]
```

### Subsystem Boundaries
[Clear definition of each subsystem's responsibility and interface]

### Migration Path
1. [Step-by-step migration plan]
2. [With specific file moves and renames]
3. [Maintaining backward compatibility]

## Risk Mitigation

### Breaking Changes
[List of potential breaking changes and how to handle them]

### Testing Strategy
[How to ensure refactoring doesn't break functionality]

### Rollback Plan
[How to revert if issues arise]

## Implementation Checklist

- [ ] Create feature branch: `refactor/rule-of-6-[folder-name]`
- [ ] Phase 1: Function refactoring
  - [ ] [Specific function 1]
  - [ ] [Specific function 2]
- [ ] Phase 2: File splitting
  - [ ] [Specific file 1]
  - [ ] [Specific file 2]
- [ ] Phase 3: Directory reorganization
  - [ ] Create new subdirectories
  - [ ] Move files
  - [ ] Update imports
- [ ] Run tests
- [ ] Run linter
- [ ] Run type checker
- [ ] Create commit: "refactor: apply Rule of 6 to [folder]"
- [ ] Update architecture documentation

## Alternative Approaches

### Option A: Minimal Refactoring
[Just enough to pass Rule of 6]

### Option B: Architectural Redesign
[Deeper restructuring to better reflect domain]

### Recommendation
[Which approach and why]
```

## Output Requirements

1. Always save the plan as `REFACTOR_PLAN.md` in the target folder
2. Be specific - name actual functions, files, and folders
3. Provide rationale for every decision
4. Include code examples where helpful
5. Make the plan actionable - another developer should be able to implement it

## Final Checks

Before finalizing the plan, ask yourself:
- Does this reveal the natural architecture or force an artificial one?
- Will this make the code easier to understand and modify?
- Are we creating meaningful abstractions or just splitting arbitrarily?
- Have we identified opportunities to formalize subsystems?
- Is the migration path clear and low-risk?

## Example Usage

```bash
# Analyze entire codebase and get recommendations
plan_rule_of_6_refactor

# Plan refactoring for specific folder
plan_rule_of_6_refactor src/app/map/Chat

# The command will create:
src/app/map/Chat/REFACTOR_PLAN.md
```

Remember: The goal is not just compliance, but **better architecture through intentional design**.