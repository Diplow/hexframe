# /tests Command

## Purpose
Document the testing strategy and specific test cases for an issue implementation. This ensures comprehensive test coverage is planned before coding begins, following TDD (Test-Driven Development) principles where appropriate.

## Command Syntax
```
/tests #<issue-number>
```

## Prerequisites
- Issue must exist with `/issue` command
- Context must be gathered with `/context` command
- Solution must be designed with `/solution` command
- Understanding of the chosen solution approach

## Test Planning Process

### 1. Review Solution
- Load issue, context, and solution documentation
- Understand the chosen implementation approach
- Identify key components and behaviors to test
- Consider edge cases and error scenarios

### 2. Test Categories
For each issue, plan tests across these categories:
- **Unit Tests**: Individual component/function behavior
- **Integration Tests**: Component interactions
- **E2E Tests**: User workflows and scenarios
- **Visual/Snapshot Tests**: UI consistency (when applicable)
- **Performance Tests**: Response times, render performance (when needed)

### 3. Test Coverage Strategy
- **Happy Path**: Primary use cases work correctly
- **Edge Cases**: Boundary conditions and limits
- **Error Handling**: Graceful failure scenarios
- **Accessibility**: Keyboard navigation, screen readers
- **Cross-browser**: Compatibility testing needs

## Documentation

### Issue Abstract
Update the issue file (`/issues/YYYY-MM-DD-<slug>-<issue-number>.md`) by adding or updating the `## Tests` section:

### Issue Log
Append to the log file (`/issues/YYYY-MM-DD-<slug>-<issue-number>.log.md`):

## Best Practices

1. **Test First**: Plan tests before implementation when possible
2. **Behavior Focus**: Test user-visible behavior, not implementation
3. **Descriptive Names**: Test names should explain what and why
4. **Isolated Tests**: Each test should be independent
5. **Fast Feedback**: Prioritize fast-running tests
6. **Maintainable**: Avoid brittle selectors and timing issues
7. **Coverage Goals**: Aim for high coverage of critical paths

## Test Patterns

### Unit Test Patterns
```typescript
describe('ComponentName', () => {
  it('should handle user interaction', () => {
    // Arrange: Set up component and mocks
    // Act: Simulate user action
    // Assert: Verify expected outcome
  });
});
```

### Integration Test Patterns
```typescript
describe('Feature Integration', () => {
  it('should coordinate between components', () => {
    // Render component tree
    // Trigger action in one component
    // Verify effect in another component
  });
});
```

### E2E Test Patterns
```typescript
test('user workflow', async ({ page }) => {
  // Navigate to feature
  // Perform user actions
  // Assert on final state
  // Check for accessibility
});
```

## Testing Tools Reference

### Unit/Integration Testing
- **Vitest**: Test runner (not Jest)
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **@testing-library/user-event**: User interactions

### E2E Testing
- **Playwright**: E2E test framework
- **Offline mode**: Tests run without server dependencies
- **localStorage**: State persistence in tests

### Commands
```bash
pnpm test:unit          # Run unit tests
pnpm test:integration   # Run integration tests
pnpm test:e2e          # Run E2E tests (requires dev server)
pnpm test:e2e:ui       # E2E tests with UI
./scripts/run-tests.sh  # Run all tests
```

## GitHub Synchronization

After completing test planning:

1. **Post to GitHub Issue**:
   ```
   *I am an AI assistant acting on behalf of @<username>*
   
   ## Test Plan Complete
   
   [Paste the Tests section here]
   ```

2. **Commit and Push**:
   ```bash
   git add issues/YYYY-MM-DD-*.md issues/YYYY-MM-DD-*.log.md
   git commit -m "test: add test plan for issue #<number>"
   git push
   ```

## Integration with Workflow

- See `.claude/commands/README.md` for complete workflow
