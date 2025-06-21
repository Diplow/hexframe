# DEBUG.md

This file provides debugging principles and workflow for Claude to follow when investigating and resolving issues in the codebase.

## Core Debugging Principles

### 1. Understand Before Acting
- Always reproduce and understand the issue before attempting fixes
- Read error messages carefully and trace their origins
- Identify the root cause, not just symptoms
- **Understand the Architecture**: Before diving into specific code:
  - Check the `## Architecture` section in README.md to identify relevant parts of the codebase
  - Read referenced architecture documentation (e.g., `/src/app/map/ARCHITECTURE.md`, `/src/server/README.md`, `/src/lib/domains/README.md`)
  - Explicitly state which part of the codebase you're investigating
  - Read relevant files until you can briefly explain how that part is supposed to work
  - This architectural understanding prevents fixing symptoms in the wrong layer

### 2. Systematic Investigation
- Start with the most likely causes based on error messages
- Use appropriate debugging tools (console.log, debugger, test isolation)
- Verify assumptions with actual code execution
- **Fix linter errors immediately**: If investigating files with linter errors, fix them first to ensure clean baseline
- **Run targeted tests**: Use `pnpm test <directory>` to run tests for the area you're investigating
- **Use E2E debugging**: Run `pnpm test:e2e:debug` to see the actual user flow and identify where issues occur
- **Add temporary logging**: Insert console.log statements to trace execution (remember to remove after)
- **Create reproduction tests**: Write a new E2E test that reproduces the issue for systematic debugging

### 3. Minimal Changes
- Make the smallest possible change to fix the issue
- Avoid refactoring or improvements while debugging
- One fix at a time - don't bundle multiple fixes
- **Exception**: If struggling to find the bug, consider clarity refactoring
  - Complex, unclear code often hides bugs
  - See `.claude/commands/refactor-clarity.md` for systematic approach
  - Sometimes making code clearer reveals the issue immediately

### 4. Verification
- Always verify the fix actually resolves the issue
- Check for side effects or regressions
- Run related tests to ensure nothing else broke

## Debugging Workflow

1. **Start Debug Session**
   - Create a new file in `issues/` with format: `YYYY-MM-DD-explicit-title.md`
   - Begin with a brief architectural overview of where you understand the bug to be located
   - Document your progression throughout the debugging session

2. **Reproduce the Issue**
   - Get exact steps to reproduce
   - Confirm the issue exists in the current codebase
   - Document the expected vs actual behavior

3. **Clean the Investigation Area**
   - Run `pnpm lint` on affected files and fix any errors
   - Run `pnpm typecheck` to ensure no type issues
   - Run `pnpm test` for the specific directory to check existing tests

4. **Gather Information**
   - Collect error messages, stack traces, logs
   - Run `pnpm test:e2e:debug` to observe the actual flow
   - Add temporary console.log statements with clear prefixes
   - Create an E2E test that reproduces the issue

5. **Form Hypothesis**
   - Based on evidence, form a theory about the cause
   - Identify what needs to be tested to confirm/reject the hypothesis
   - Write specific test cases to validate your theory
   - If code complexity is hindering understanding:
     - Consider applying REFACTOR_CLARITY.md first
     - Clear code makes bugs more visible

6. **Test and Fix**
   - Test the hypothesis with minimal code changes
   - Use the reproduction test to verify the fix works
   - Remove all temporary logging and test IDs
   - Ensure all tests pass before finalizing

7. **Verify and Document**
   - Confirm the fix resolves the original issue
   - Run full test suite: `pnpm test` and `pnpm test:e2e`
   - Document what was wrong and why the fix works
   - Update the debug session file with the final resolution
   - **Add missing test coverage**:
     - If you can think of a test that would have caught this bug, add it
     - This prevents regression and improves the test suite
     - Name it clearly: `test('should handle [specific case that was broken]')`
     - Even if you already wrote a reproduction test, clean it up and keep it

## Specific Debugging Techniques

### Code Quality First
- **Fix linter errors**: Run `pnpm lint` on files you're investigating and fix all issues
- **Type check**: Run `pnpm typecheck` to ensure no type errors mask the real issue
- **Clean baseline**: A clean codebase makes debugging easier and prevents false leads

### For Test Failures
- **Isolate the test**: Run specific test file with `pnpm test path/to/test.ts`
- **Use test UI**: Run `pnpm test:ui` for interactive debugging
- **Add temporary logs**: Insert console.log in both test and implementation
- **Check test environment**: Verify setup/teardown and mock configurations
- **Write minimal reproduction**: Create simplest test case that reproduces issue

### For UI/Interaction Issues
- **E2E Debug Mode**: `pnpm test:e2e:debug` shows browser and step execution
- **E2E UI Mode**: `pnpm test:e2e:ui` for interactive test debugging
- **Create reproduction test**: Write E2E test that reproduces the exact issue:
  ```typescript
  test('edit button should appear on owned tiles', async ({ page }) => {
    await page.goto('/map');
    await page.waitForSelector('.hex-tile');
    const editButton = page.locator('[data-testid="edit-button"]');
    await expect(editButton).toBeVisible();
  });
  ```
- **Add data-testid**: Temporarily add test IDs to components for easier selection
- **Screenshot debugging**: Use `await page.screenshot()` in E2E tests

### For Runtime Errors
- **Stack trace analysis**: Read full error stack to identify exact failure point
- **Temporary logging**: Add console.log with descriptive prefixes:
  ```typescript
  console.log('[DEBUG ItemButtons] Props:', { item, permissions });
  console.log('[DEBUG ItemButtons] Edit visible?', shouldShowEdit);
  ```
- **Component tree logging**: Log at multiple levels to trace data flow
- **Browser DevTools**: Use debugger statements and breakpoints

### For State Management Issues
- **Log state changes**: Add logging to reducers/actions
- **Trace data flow**: Follow data from source to component
- **Check initial state**: Verify correct initialization
- **Monitor updates**: Log when and why state changes

### When Stuck on Complex Bugs
- **Consider clarity refactoring**: If the bug persists despite investigation
  - Complex code often conceals bugs
  - Follow `.claude/commands/refactor-clarity.md` guidelines
  - Apply the Fundamental Rule: name → what, arguments → what's needed, body → how
  - Use Rule of 6 to break down complexity
  - Often the bug becomes obvious once code is clear
- **Look for code smells**:
  - Functions doing multiple things (violates single responsibility)
  - Unclear variable/function names
  - Deep nesting or complex conditionals
  - Missing abstractions for repeated patterns

### For Environment Issues
- **Port checks**: Ensure required ports are free (3000, 3001, 3002)
- **Database state**: Check if test data exists
- **Service health**: Verify all services are running
- **Environment variables**: Confirm all required vars are set

## Communication During Debugging

- Explain each step of the investigation
- Share findings as they emerge
- Ask for clarification when needed
- Summarize the root cause and fix clearly

## Debug Session Documentation

Each debug session file (`prompts/bugs/YYYY-MM-DD-explicit-title.md`) should include:

### Initial Section
- **Issue Description**: Clear statement of the problem
- **Working Assumption**: Make a best guess about the issue rather than asking for clarification
  - State your assumption clearly
  - Explain the reasoning
  - Note that you'll expand investigation if the assumption proves incorrect
- **Architectural Context**: Based on README.md architecture section, identify:
  - Which layer(s) are affected (Frontend/Backend/Domain/Data)
  - Specific components or modules involved
  - Brief explanation of how this part should work
- **Outdated Documentation Found**: Note any discrepancies between docs and actual code
  - Document what's incorrect
  - Fix documentation if appropriate
  - Update your investigation based on actual structure

### Investigation Log
- **Reproduction Steps**: Exact commands/actions to reproduce
- **Error Messages**: Full error messages and stack traces
- **Hypothesis**: Current theory about the cause
- **Tests Performed**: What was tried and the results

### Resolution
- **Root Cause**: Clear explanation of what was wrong
- **Fix Applied**: What changes were made and why
- **Verification**: How the fix was verified
- **Tests Added**: New tests that prevent regression
  - List any tests added that would have caught this bug
  - Include test file paths and test names
- **Side Effects**: Any other impacts or considerations

## Essential Commands for Debugging

### Quality Checks
```bash
pnpm lint              # Fix linting errors in investigated files
pnpm typecheck         # Ensure no type errors
pnpm test <directory>  # Run tests for specific area
```

### Test Debugging
```bash
pnpm test:unit         # Run unit tests only
pnpm test:integration  # Run integration tests only
pnpm test:ui           # Interactive test UI (Vitest)
```

### E2E Debugging
```bash
pnpm test:e2e:ui       # Interactive Playwright UI
pnpm test:e2e:debug    # Run with visible browser
pnpm test:e2e:headed   # Run with browser window
E2E_MODE=ci pnpm test:e2e  # Test on CI port (3002)
```

### Creating Tests
```bash
# Create new E2E test file
echo "test('reproduce issue', async ({ page }) => {
  // Test implementation
});" > tests/e2e/scenarios/debug-issue.spec.ts
```

## Best Practices for Temporary Debug Code

### Console Logging
- **Use descriptive prefixes**: `[DEBUG ComponentName]` to easily find and remove later
- **Log at entry/exit points**: Track function calls and returns
- **Log state and props**: Understand what data components receive
- **Remove before committing**: Search for `[DEBUG` to find all temporary logs

### Test IDs
- **Prefix with debug-**: `data-testid="debug-edit-button"`
- **Document in test**: Comment why the test ID was added
- **Remove after fixing**: Unless it improves test maintainability

### Reproduction Tests
- **Always keep tests that would have caught the bug**: Don't just fix the bug, prevent it from returning
- **Clean up and commit**: Transform debug tests into proper test cases
- **Name clearly**: `test('should handle [specific case that was broken]')` or `test('regression: edit button visibility with permissions')`
- **Document the issue**: Link to the debug session file in a comment
- **Think broadly**: Consider related edge cases that might have similar issues

## Example Debug Session

See `prompts/bugs/2025-06-09-edit-button-missing-on-tile.md` for a reference example that demonstrates:
- Making a working assumption about the issue
- Understanding architecture before investigating
- Identifying and fixing outdated documentation
- Focusing investigation based on architectural understanding

## Git Workflow for Debugging

### Branch Management
1. **Create Debug Branch**: Based on develop or current feature branch
   ```bash
   # From develop branch (most common)
   git checkout develop
   git pull origin develop
   git checkout -b fix/explicit-description-of-issue
   
   # OR from a feature branch if fixing a bug in that feature
   git checkout feature/current-feature
   git pull origin feature/current-feature
   git checkout -b fix/issue-in-feature
   
   # Examples:
   # fix/edit-button-not-showing-on-owned-tiles
   # fix/database-connection-timeout
   # fix/test-flakiness-in-auth-flow
   ```

2. **Keep Commits Focused**: One commit per logical fix
   ```bash
   # Stage only files related to the fix
   git add src/components/ItemButtons.tsx
   git add tests/e2e/scenarios/edit-button.spec.ts
   
   # Clear commit message explaining what and why
   git commit -m "fix: show edit button for owned tiles

   The permission check was incorrectly comparing user.id as number
   with item.createdBy as string, causing the edit button to never
   appear. Fixed by ensuring consistent string comparison.
   
   Added E2E test to prevent regression."
   ```

3. **Separate Concerns**: If you find unrelated issues while debugging
   ```bash
   # Stash your debug work
   git stash
   
   # Fix the unrelated issue on a separate branch
   git checkout -b fix/unrelated-linting-errors
   # ... make fixes ...
   git commit -m "chore: fix linting errors in ItemButtons component"
   
   # Return to your debug work
   git checkout fix/original-issue
   git stash pop
   ```

### Commit Guidelines for Bug Fixes
- **fix**: For bug fixes that users would notice
- **test**: For adding missing test coverage
- **chore**: For cleanup like fixing lints, removing debug code

### Before Committing
1. **Remove Debug Code**: Search and remove temporary debugging
   ```bash
   # Check for debug console logs
   grep -r "\[DEBUG" src/
   grep -r "console.log" src/
   
   # Check for debug test IDs
   grep -r "debug-" src/
   ```

2. **Verify Tests Pass**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

3. **Review Changes**: Ensure only relevant changes are included
   ```bash
   git diff --staged
   ```

### Creating Pull Request
1. **Push Branch**: Push your fix branch to GitHub
   ```bash
   git push origin fix/explicit-description-of-issue
   ```

2. **Create PR**: Open pull request to base branch (develop or feature)
   ```bash
   # Using GitHub CLI
   gh pr create --base develop --title "Fix: [Brief description]" \
     --body-file prompts/bugs/YYYY-MM-DD-explicit-title.md
   
   # Or manually on GitHub, using the debug session file content as PR description
   ```

3. **PR Description**: Copy content from your debug session file
   - The entire content of `prompts/bugs/YYYY-MM-DD-explicit-title.md` becomes the PR description
   - This includes:
     - Issue description and reproduction steps
     - Investigation log and hypothesis
     - Root cause analysis
     - Fix applied and verification
     - Tests added to prevent regression