# FEATURE.md - Feature Implementation Workflow

This document defines the structured workflow for discussing and implementing features with Claude.

## Feature Discussion Workflow

When a user requests a feature implementation, follow these steps:

### 0. Documentation Phase
- **Create Feature Document**: Create a new file in `issues/` with format: `YYYY-MM-DD-feature-name.md`
- **Initialize Checklist**: Start with a checklist that will be updated throughout implementation
- **Track Progress**: Update the checklist as tasks are completed

### 1. Feature Understanding Phase
- **Clarify the Request**: Restate the feature in your own words
- **Define the Problem**: What problem does this feature solve? Why is it needed?
- **Context Analysis**: 
  - Product context: How does this fit into the user experience?
  - Technical context: What systems/patterns does this relate to?
- **Challenge the Direction**: If the request implies a specific solution:
  - Propose 2-3 alternative approaches to solve the same problem
  - Explain pros/cons of each approach
  - Be aggressive in challenging assumptions
- **Make Assumptions**: Rather than asking for clarification on every detail, make reasonable assumptions
- **Document Assumptions**: Explicitly list all assumptions made
- **Identify Core Requirements**: List the essential functionality needed

### 2. Analysis Phase
- **Understand the Architecture**: Before diving into specific code:
  - Check the `## Architecture` section in README.md to identify relevant parts
  - Read referenced architecture documentation (e.g., `/src/app/map/ARCHITECTURE.md`, `/src/server/README.md`, `/src/lib/domains/README.md`)
  - Explicitly state which part of the codebase you're investigating
  - Read relevant files until you can briefly explain how that part works
  - This prevents implementing features in the wrong layer
- **Current State Analysis**: Examine existing code patterns and implementations
- **Outdated Documentation Found**: Note any discrepancies between docs and actual code
  - Document what's incorrect
  - Fix documentation if appropriate
  - Update your analysis based on actual structure
- **Impact Assessment**: Identify what will be affected by the change
- **Technical Constraints**: Note any limitations or dependencies
- **Risk Assessment**: Identify potential breaking changes or side effects

### 3. Design Phase
- **Propose Solution Approach**: Present the preferred approach with rationale
- **Alternative Approaches**: Note alternatives considered but not chosen
- **Architecture Decisions**: Document key design choices
- **Implementation Checklist**: Create detailed, ordered task checklist
- **Test Strategy**: Define happy path tests first
- **Get Single Validation**: Present complete plan for user approval

### 4. Implementation Phase
- **Update Todo List**: Use TodoWrite to track implementation tasks from checklist
- **Implement Incrementally**: Complete one checklist item at a time
- **Run Linter Immediately**: Run linter on new files as created for early feedback
- **Test Happy Path**: Implement and test the main success scenario first
- **Update Feature Document**: Mark checklist items as completed
- **Handle Edge Cases**: After happy path works, add error handling

### 5. Verification Phase
- **Run All Tests**: Ensure existing tests still pass
- **Test New Functionality**: Verify the happy path works
- **Debug and Add Tests**: For any bugs found, add tests that would have caught them
- **Check Side Effects**: Ensure no unintended consequences
- **Lint All Changes**: Run linter on all modified files

### 6. Review Phase
- **Update Feature Document**: Complete final summary in the feature document
- **Code Quality**: Note any refactoring opportunities (but don't block on them)
- **Summary**: Provide a concise summary of what was implemented
- **Next Steps**: Suggest any follow-up improvements or related features

## Example Usage

```
User: "I would like you to implement feature X according to principles defined in @.claude/commands/feature.md"

Claude: Following the FEATURE workflow, I'll create a feature document and analyze the request.

[Creates issues/YYYY-MM-DD-feature-x.md]

Based on my analysis:

**Understanding**: You want me to implement [restated feature]

**Problem Being Solved**: [Why this feature is needed]

**Context**:
- Product: [How this improves user experience]
- Technical: [What systems this relates to]

**Alternative Approaches Considered**:
1. [Alternative 1] - Pros: [...] Cons: [...]
2. [Alternative 2] - Pros: [...] Cons: [...]
3. [Preferred approach] - Pros: [...] Cons: [...]

**Architecture Review**: Based on [relevant docs], this feature affects [components/layers]

**Assumptions I'm making**:
- [Assumption 1]
- [Assumption 2]

**Implementation Plan**:
□ Task 1: [Description]
□ Task 2: [Description]
...

**Approach**: [Preferred solution with detailed rationale]

Should I proceed with this plan?
```

## Key Principles

1. **Make Smart Assumptions**: Use context and best practices rather than asking for every detail
2. **Document Everything**: Track progress in the feature document throughout implementation
3. **Incremental Progress**: Small, testable changes over large rewrites
4. **Test Happy Path First**: Get the main flow working before edge cases
5. **Lint Early**: Catch style/syntax issues immediately on new files
6. **Maintain Working State**: Never leave the codebase broken
7. **One Validation Point**: Get approval on the complete plan, not piecemeal

## Testing Philosophy

- **Happy Path First**: Implement and test the main success scenario
- **Debug-Driven Tests**: When bugs are found, add tests that would have caught them
- **Don't Over-Test Initially**: Avoid premature test complexity
- **Test After Implementation**: Once working, add comprehensive test coverage

## Git Workflow for Features

### Branch Strategy
1. **Create Feature Branch**: Always branch from develop
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/explicit-feature-name
   
   # Examples:
   # feature/dark-mode-toggle
   # feature/export-to-csv
   # feature/collaborative-editing
   ```

2. **Regular Commits**: Commit logical chunks of work
   ```bash
   # Stage related changes
   git add src/components/DarkModeToggle.tsx
   git add src/contexts/ThemeContext.tsx
   
   # Descriptive commit messages
   git commit -m "feat: add dark mode toggle component
   
   - Created DarkModeToggle component with sun/moon icons
   - Integrated with existing theme context
   - Persists preference to localStorage"
   ```

### Commit Guidelines
Follow conventional commits for clear history:
- **feat**: New feature or enhancement
- **test**: Adding tests for the feature
- **docs**: Documentation updates
- **style**: CSS/styling changes (not code style)
- **refactor**: Code restructuring without behavior change

### Development Flow
1. **Start Clean**: Ensure working directory is clean
   ```bash
   git status
   git stash  # If needed
   ```

2. **Incremental Progress**: Commit working states
   ```bash
   # After implementing core functionality
   git add -p  # Review changes before staging
   git commit -m "feat: implement basic CSV export functionality"
   
   # After adding UI
   git commit -m "feat: add export button to data table"
   
   # After adding tests
   git commit -m "test: add unit tests for CSV export"
   ```

3. **Keep History Clean**: Squash WIP commits if needed
   ```bash
   # Interactive rebase to clean up history
   git rebase -i HEAD~3
   # Mark commits to squash, edit messages
   ```

### Before Creating PR
1. **Update Feature Document**: Mark all tasks complete
2. **Run All Checks**:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   pnpm build  # Ensure production build works
   ```

3. **Review Changes**: Ensure all changes are intentional
   ```bash
   git log --oneline origin/main..HEAD
   git diff origin/main...HEAD
   ```

### Creating Pull Request
1. **Push Feature Branch**: Push to GitHub
   ```bash
   git push origin feature/explicit-feature-name
   ```

2. **Create PR to develop**: Open pull request
   ```bash
   # Using GitHub CLI
   gh pr create --base develop --title "Feature: [Feature name]" \
     --body-file issues/YYYY-MM-DD-feature-name.md
   
   # Or manually on GitHub, using the feature document as PR description
   ```

3. **PR Description**: Use entire feature document content
   - Copy the complete content of `issues/YYYY-MM-DD-feature-name.md`
   - This includes:
     - Feature understanding and context
     - Architecture analysis
     - Design decisions and alternatives
     - Implementation checklist with completion status
     - Testing strategy and results

### Managing Long-Running Features
For features that take multiple days:

1. **Daily Progress Commits**: End each day with a WIP commit
   ```bash
   git add .
   git commit -m "WIP: [what you accomplished today]"
   ```

2. **Rebase Regularly**: Keep up with develop branch
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

3. **Feature Flags**: For partial implementations
   ```typescript
   // Use environment variable or feature flag
   if (process.env.NEXT_PUBLIC_ENABLE_DARK_MODE) {
     // New feature code
   }
   ```