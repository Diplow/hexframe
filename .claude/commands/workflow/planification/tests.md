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

### 2. Test-Driven Development (TDD) Approach
When using the `/tests` command, follow TDD principles:
1. **Write tests FIRST** - All tests should fail initially
2. **Create shells** - Interfaces, types, and empty implementations
3. **Make tests pass** - Implement functionality one test at a time
4. **Refactor** - Clean up code while keeping tests green

### 3. Test Categories
For each issue, plan tests across these categories:
- **Unit Tests**: Individual component/function behavior
- **Integration Tests**: Component interactions
- **Visual/Snapshot Tests**: UI consistency (when applicable)
- **Performance Tests**: Response times, render performance (when needed)

Note: E2E tests are currently not supported in the testing environment.

### 4. Test Coverage Strategy
- **Happy Path**: Primary use cases work correctly
- **Edge Cases**: Boundary conditions and limits
- **Error Handling**: Graceful failure scenarios
- **Accessibility**: Keyboard navigation, screen readers
- **Cross-browser**: Compatibility testing needs

## Documentation

### Issue File Update
Update the issue file in current cycle (`.workflow/cycles/[current]/<priority>-issue.md`) by adding or updating the `## Tests` section with:
- Test categories and strategy
- Specific test cases planned
- Coverage goals
- Testing tools and patterns to use

## Best Practices

1. **Test First**: Always write tests before implementation when using `/tests` command
2. **Red-Green-Refactor**: Follow TDD cycle - failing test → passing test → clean code
3. **One Test at a Time**: Implement just enough code to make each test pass
4. **Behavior Focus**: Test user-visible behavior, not implementation
5. **Descriptive Names**: Test names should explain what and why
6. **Isolated Tests**: Each test should be independent
7. **Fast Feedback**: Prioritize fast-running tests
8. **Maintainable**: Avoid brittle selectors and timing issues
9. **Coverage Goals**: Aim for high coverage of critical paths

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

### TDD Example Pattern
```typescript
// Step 1: Write failing test
describe('EventBus', () => {
  it('should emit events to registered listeners', () => {
    const eventBus = new EventBus(); // Will fail - EventBus not implemented
    const listener = vi.fn();
    
    eventBus.on('test.event', listener);
    eventBus.emit({ type: 'test.event', payload: { data: 'test' } });
    
    expect(listener).toHaveBeenCalledWith({ type: 'test.event', payload: { data: 'test' } });
  });
});

// Step 2: Create minimal implementation to make test pass
class EventBus {
  private listeners = new Map<string, Set<Function>>();
  
  on(eventType: string, listener: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }
  
  emit(event: { type: string; [key: string]: any }) {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
}

// Step 3: Refactor while keeping tests green
```

## Testing Tools Reference

### Unit/Integration Testing
- **Vitest**: Test runner (not Jest)
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **@testing-library/user-event**: User interactions

### Testing Tools
- **Vitest**: Test runner with vi.fn() for mocks
- **React Testing Library**: Component testing
- **MSW**: API mocking for integration tests
- **@testing-library/user-event**: User interaction simulation

### Commands
```bash
pnpm test:unit          # Run unit tests
pnpm test:integration   # Run integration tests
./scripts/run-tests.sh  # Run all tests
./scripts/run-tests.sh -w # Watch mode for TDD
./scripts/run-tests.sh --ui # UI mode for debugging
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
   git add .workflow/cycles/*/priority-*.md
   git commit -m "test: add test plan for priority"
   git push
   ```

## Integration with Workflow

- See `.claude/commands/README.md` for complete workflow
