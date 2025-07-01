# Claude Commands

This directory contains custom commands for Claude Code to enhance development workflows.

## Issue Management Workflow

The issue management system follows a structured three-phase workflow. All commands work with a single document file (`/issues/YYYY-MM-DD-<slug-title>-<issue-number>.md`) that gets progressively completed. Each time a section is added, it's also posted as a comment on the GitHub issue.

### Phase 1: Planning 📋
1. `/issue` - Document the problem from user perspective (required)
2. `/context #<issue>` - Gather codebase context and READMEs (required)
3. `/solution #<issue>` - Document solution approach and strategy (required)
   - `/security_plan #<issue>` - Deep security analysis (optional)
   - `/ux_design_plan #<issue>` - Detailed UX/UI specifications (optional)
   - `/tests_plan #<issue>` - Comprehensive test strategy (optional)
4. `/archi #<issue>` - Document architecture decisions and patterns (required)

### Phase 2: Implementation 🛠️
5. `/tests_impl #<issue>` - Implement tests first for TDD (optional but recommended)
6. `/issue_impl #<issue> [branch]` - Execute the implementation (required)

### Phase 3: Review 📝
7. `/refactor <file_path>` - Refactor for clarity following Rule of 6 (optional)
8. `/document <branch>` - Update all relevant documentation (required)
9. `/retro #<issue>` - Capture learnings and insights (optional)

### Workflow Commands

#### 1. /issue
Creates an issue documenting WHAT is wrong from a user/product perspective.
- Creates file: `/issues/2025-01-19-offline-save-failure-124.md`
- Creates GitHub issue #124
- Posts initial problem statement as first comment

**Usage:**
```
/issue <description> [#tag1 #tag2 ...]
```

**Example:**
```
/issue Users cannot save work offline #bug #offline #data #critical
```

#### 2. /context
Adds technical and product context to the issue document.
- Appends "## Context" section to the document
- Posts the context section as a GitHub comment

**Usage:**
```
/context #<issue-number>
```

#### 3. /solution
Documents the proposed solution approach.
- Appends "## Solution" section to the document
- Posts the solution section as a GitHub comment

**Usage:**
```
/solution #<issue-number>
```

#### 4. /archi
Documents architecture decisions and design patterns.
- Appends "## Architecture" section to the document
- Posts the architecture section as a GitHub comment

**Usage:**
```
/archi #<issue-number>
```

#### 5. /issue_impl
Executes the implementation based on all documented context.
- Reads the complete document for context
- Implements the solution
- Updates document with "## Implementation" section
- Posts implementation summary as a GitHub comment

**Usage:**
```
/issue_impl #<issue-number> [branch-name]
```

#### 6. /document
Updates all relevant documentation after implementation.
- Appends "## Documentation Updates" section
- Posts documentation changes as a GitHub comment

**Usage:**
```
/document <branch-name>
```

### Example Workflow

```bash
# Phase 1: Planning 📋
/issue Users cannot save work offline #bug #offline #critical
/context #124
/solution #124
/security_plan #124  # (optional if security concerns exist)
/archi #124

# Phase 2: Implementation 🛠️
/tests_impl #124     # (optional for TDD)
/issue_impl #124

# Phase 3: Review 📝
/refactor src/lib/offline-storage.ts  # (optional for clarity)
/document issue-124-offline-save
/retro #124                          # (optional for learnings)
```

### Specialized Commands

These commands extend `/solution` for specific needs:

- `/security_plan #<issue>` - Deep dive into security implications
- `/ux_design_plan #<issue>` - Detailed UX/UI specifications with mockups
- `/tests_plan #<issue>` - Comprehensive test strategy and coverage

## Other Available Commands

### /refactor
Refactors a file for clarity according to the principles in `.claude/commands/refactor-clarity.md`.

**Usage:**
```
/refactor <file_path>
```

**Example:**
```
/refactor src/app/map/create/create-item.tsx
```

**What it does:**
1. Creates a refactor session document
2. Analyzes the code for clarity issues and Rule of 6 violations
3. Identifies existing domain concepts to reuse
4. Proposes new concepts that need definition
5. Presents findings for validation
6. Executes the complete refactoring after approval
7. Documents the results

## Adding New Commands

To add a new command:
1. Create a `.js` file in this directory (e.g., `mycommand.js`)
2. Make it executable: `chmod +x mycommand.js`
3. Create a corresponding `.md` file documenting the command
4. Update this README with the new command

## Command Structure

Commands should:
- Parse arguments from `process.argv`
- Validate inputs
- Generate clear instructions for Claude
- Output to console for Claude to read