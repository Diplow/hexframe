# Priority 0 - Task 3: Remove Offline Mode

## Issue

The offline mode implementation in Hexframe is non-functional and causing confusion. It was originally added to support E2E testing and provide offline capabilities, but:

1. **It doesn't actually work offline** - The system still requires server connections for most operations
2. **It creates confusion** - Users see offline indicators but the system doesn't behave as expected
3. **It complicates the codebase** - Multiple auth contexts, conditional logic, and test-specific code paths
4. **It's blocking real features** - The complexity makes it harder to implement actual offline support later

The decision has been made to remove offline mode entirely rather than fix it, as it's not a priority for the current product focus.

## Context

### Current Implementation Overview

The offline mode is deeply integrated into several parts of the system:

#### 1. Authentication Layer
- `src/contexts/OfflineAuthContext.tsx` - Complete offline auth provider with localStorage
- `src/contexts/UnifiedAuthContext.tsx` - Wrapper that switches between offline and online auth (better-auth)
- `src/contexts/AuthContext.tsx` - The real auth context using better-auth
- Offline mode detection via URL params, localStorage, or network status

#### 2. UI Components
- `src/app/map/_components/offline-indicator.tsx` - Visual indicator for offline mode
- `src/app/map/_components/MapPageContent.tsx` - Conditionally uses offline auth
- Various components check offline status for behavior changes

#### 3. Cache System
- `src/app/map/Cache/_hooks/use-offline-mode.ts` - Hook for offline detection
- `src/app/map/Cache/provider.tsx` - Cache provider with offline support
- `src/app/map/Cache/Sync/sync-engine.ts` - Sync engine that handles offline state
- Cache uses localStorage when offline, server when online

#### 4. Testing Infrastructure
- `tests/e2e/` folder - Contains offline test fixtures and setup (to be deleted)
- `config/playwright.config.ts` - Playwright config with offline settings
- Note: E2E tests are not currently in use and will be removed entirely

#### 5. Configuration
- `.env.production.example` - Has offline-related environment variables
- Various README and documentation files mention offline capabilities

### Why It Was Added

1. **E2E Testing** - To run tests without a database/server dependency
2. **Progressive Enhancement** - Part of the static → progressive → dynamic architecture
3. **Offline-First Dream** - Vision of a fully functional offline system

### Why It Failed

1. **Incomplete Implementation** - Only auth and basic cache work offline
2. **Server Dependencies** - Most features still require server calls
3. **Sync Complexity** - Offline/online sync was never properly implemented
4. **E2E Tests Not Used** - E2E tests are not currently being used, making offline mode unnecessary

## Solution

### Removal Strategy

We need to carefully remove offline mode while preserving the functionality that actually works:

#### Phase 1: Identify What to Keep
- [x] localStorage cache for performance (not for offline)
- [x] Any legitimate offline detection for error handling

#### Phase 2: Remove Core Offline Components
- [ ] Delete `OfflineAuthContext.tsx`
- [ ] Simplify `UnifiedAuthContext.tsx` to only use better-auth's `AuthContext`
- [ ] Remove `offline-indicator.tsx` component
- [ ] Remove `use-offline-mode.ts` hook

#### Phase 3: Update Cache System
- [ ] Remove offline conditionals from cache provider
- [ ] Keep localStorage for performance caching
- [ ] Remove offline-specific sync logic
- [ ] Ensure cache always expects server availability

#### Phase 4: Remove E2E Infrastructure
- [ ] Delete entire `tests/e2e/` folder
- [ ] Remove E2E-related scripts from package.json
- [ ] Remove Playwright configuration
- [ ] Remove E2E-related dependencies if any

#### Phase 5: Clean Documentation
- [ ] Remove offline references from README files
- [ ] Update architecture docs
- [ ] Remove offline env variables
- [ ] Update any user-facing docs
- [x] Remove Clerk package (no longer used, replaced by better-auth)

### Implementation Plan

1. **Start with auth** - Remove OfflineAuthContext and simplify UnifiedAuthContext
2. **Update UI** - Remove offline indicators and conditionals
3. **Fix cache** - Keep localStorage for performance, remove offline logic
4. **Delete E2E** - Remove entire E2E test infrastructure
5. **Clean up** - Documentation, configs, and any remaining references

### Testing Strategy

- Run unit tests after each major removal to catch breaks early
- Verify localStorage still works for performance caching
- Ensure no console errors during normal usage
- Note: No E2E tests to maintain as they're being removed

### Risks

1. **Hidden Dependencies** - Some features might unexpectedly rely on offline code
2. **Performance Regression** - Need to keep localStorage caching working
3. **User Confusion** - If any users relied on partial offline functionality

### Success Criteria

- [ ] No "offline" references in production code (except error handling)
- [ ] No E2E test infrastructure remaining
- [ ] localStorage still used for performance caching
- [ ] No console errors during normal usage
- [ ] Cleaner, simpler codebase
- [ ] Authentication only goes through better-auth