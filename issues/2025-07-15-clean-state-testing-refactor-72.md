# Issue: Clean State Testing Refactor with Event Bus and Logging

**Date**: 2025-07-15
**Status**: Open
**Tags**: #refactor #testing #tech #enhancement #high
**GitHub Issue**: #72
**Branch**: issue-72-clean-state-testing-refactor

## Problem Statement
The codebase needs a comprehensive cleanup to achieve a clean state with all tests passing, no linting errors, and up-to-date documentation. Tests need to be reworked to properly utilize the recently built logging system and event bus system. Currently, components may have side effects on other components through various mechanisms, making testing difficult and behavior unpredictable.

## User Impact
- Developers experience flaky or failing tests that don't reflect actual behavior
- Test maintenance is difficult due to complex inter-component dependencies
- Code quality issues make it harder to add new features confidently
- Debugging is challenging without proper event flow visibility
- useEffect patterns may be causing unexpected behaviors

## Steps to Reproduce
1. Run `pnpm test:all` - observe failing tests
2. Run `pnpm lint:color` - observe linting errors
3. Review test files - notice lack of event bus mocking patterns
4. Check component implementations - find useEffects with side effects
5. Run E2E tests - no visibility into event flow

## Environment
- Development environment
- All developers affected
- Frequency: Ongoing development friction

## Technical Goals
- Rework tests to mock events and verify component reactions
- Ensure event bus is the only way for components to affect each other
- Create E2E tests that validate behavior via event bus and logs observation
- Remove problematic useEffects in favor of simpler solutions
- Fix all linting errors
- Update documentation to reflect new patterns

## Related Issues
- Previous testing improvements
- Event bus implementation
- Logging system implementation