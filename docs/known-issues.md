# Known Issues

## Vitest 3.0 + Storybook Experimental Addon Compatibility

**Issue**: When running tests in CI, some Storybook tests fail with the error:
```
Error: Vitest failed to find the current suite. This is a bug in Vitest. Please, open an issue with reproduction.
```

**Affected Tests**:
- `src/app/map/not-found.stories.tsx`
- `src/app/home/_components/loading-states.stories.tsx`

**Root Cause**: This is a known compatibility issue between Vitest 3.0 and `@storybook/experimental-addon-test`. See:
- https://github.com/storybookjs/storybook/issues/30308
- https://github.com/vitest-dev/vitest/issues/6556

**Workaround**: 
1. The test isolation script (`scripts/run-tests-isolated.sh`) automatically excludes these problematic tests when running in CI environment (when `CI=true`).
2. The vitest workspace configuration also skips Storybook tests entirely in CI to avoid the issue.
3. Tests run normally in local development environment.

**Long-term Solution**: 
- Wait for a fix in either Vitest or Storybook experimental addon
- Consider migrating to the newer Vitest addon for Storybook when stable
- Or downgrade to a compatible version combination

**Impact**: Minimal - only affects 2 Storybook story test files that test visual components. All unit, integration, and E2E tests run normally.