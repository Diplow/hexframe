# /implementation Command

The `/implementation` command automates the implementation of features based on issue documentation with a focus on TDD principles.

## Usage
```
/implementation #issue-number
```

## Process

### 1. Read Issue Documentation
- Load the priority file from current cycle: `.workflow/cycles/[current]/<priority>-issue.md`
- Extract problem statement, expected behavior, and test specifications
- Identify architecture and integration points

### 2. Create Implementation Plan
- Follow TDD principles when tests are documented
- Start with type definitions and interfaces
- Ensure tests can properly fail before implementation
- Plan incremental commits after each passing test

### 3. TDD Implementation Flow
1. **Create Types/Interfaces** - Define contracts so tests can import them
2. **Write/Run Tests** - Verify tests fail with expected errors
3. **Implement Features** - Make tests pass incrementally
4. **Lint & Typecheck** - Run `pnpm check:lint` and `pnpm typecheck` regularly
5. **Debug & Log** - Use debug logging when tests don't pass
6. **Document Changes** - Update architecture docs if needed

### 4. Quality Checks
- Run `pnpm check:lint` after each component
- Run `pnpm typecheck` to catch type errors
- Run relevant tests frequently for feedback
- Check `pnpm build` when implementation is complete

### 5. Pull Request Creation
Once all checks pass:
- Create PR from feature branch to develop
- Include summary of changes
- Link to issue number
- Request feedback

## Implementation Guidelines

### Commit Strategy
- Commit after each new test passes
- Use descriptive commit messages
- Include test names in commit messages
- Document architecture decisions

### Error Handling
- If tests fail unexpectedly, add debug logging
- If architecture needs changes, document in issue
- Update outdated documentation immediately

### Tools to Use
- `pnpm test` - Run specific test files
- `pnpm check:lint` - Check code style
- `pnpm typecheck` - Verify types
- `pnpm build` - Final validation
- Debug logging - When tests won't pass

## Example Workflow
```
1. /implementation #65
2. Read issue file
3. Create ChatProvider types
4. Write ChatProvider tests (verify they fail)
5. Implement ChatProvider (make tests pass)
6. Commit: "feat: implement ChatProvider with tests"
7. Run pnpm check:lint, fix issues
8. Continue with next component...
9. Final: pnpm build
10. Create PR
```