# Priority 0: Fix Critical Bugs

## Implementation Approach
**TASK-BY-TASK IMPLEMENTATION**: Due to the critical nature, we will:
1. For each task: Plan → Implement immediately
2. Each task gets its own branch from develop
3. Merge each task to develop upon completion
4. No waiting for full priority completion

### Branch Strategy
**IMPORTANT**: Before creating each branch, always pull latest develop:
```bash
git checkout develop
git pull origin develop
git checkout -b [branch-name]
```

- Task 1: `p0-test-output`
- Task 2: `p0-coderabbit-feedback`
- Task 3: `p0-remove-offline`
- Task 4: `p0-fix-swap-bug`
- Task 5: `p0-focus-management`
- Task 6: `p0-widget-close`

## Context
Critical bugs that break core user flows and block system adoption. These must be fixed before users can reliably use Hexframe systems.

## Specific Issues
1. **Test output verbosity** - Configure concise test output for AI parsing
2. **CodeRabbit PR #95 feedback** - Address all comments from https://github.com/Diplow/hexframe/pull/95
3. **Remove offline mode** - Non-functional offline mode causing confusion
4. **Swap state bug** - After swapping items A and B, if B had no child it keeps A's children before reload
5. **Focus management** - ctrl+enter with many widgets has incoherent focus changes
6. **Widget close** - Close button in new child widgets does nothing

## Success Criteria
- [ ] Test output is concise and AI-parseable
- [ ] All CodeRabbit feedback addressed
- [ ] All offline mode references removed from codebase
- [ ] Swap operations maintain consistent state
- [ ] Focus follows user intent predictably
- [ ] All widgets close cleanly without memory leaks
- [ ] No console errors during normal usage
- [ ] Existing functionality works reliably

## Impact
**High** - These bugs directly block users from creating and managing living systems. Without reliable basic operations, users can't trust the system for important work.

## Dependencies
- Enables all other priorities by providing a stable foundation
- Required before sharing features (Priority 2) to avoid sharing broken experiences

## Estimated Effort
**Medium** - Bug fixing requires investigation time but solutions should be straightforward once root causes are identified.

## Implementation Notes
- Start with reproducible test cases
- Focus on state management patterns
- Ensure proper cleanup in component lifecycle
- Add tests that would have caught these bugs

## Tasks to Complete

### Task 1: Configure Test Output
- Make test output concise for AI parsing

### Task 2: Address CodeRabbit Feedback
- Fix issues from PR #95: https://github.com/Diplow/hexframe/pull/95

### Task 3: Remove Offline Mode
- Remove non-functional offline mode from codebase

### Task 4: Fix Swap State Bug
- After swapping items A and B, if B had no child it keeps A's children before reload

### Task 5: Fix Focus Management  
- ctrl+enter with many widgets has incoherent focus changes

### Task 6: Fix Widget Close
- Close button in new child widgets does nothing