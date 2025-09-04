# Retrospective Notes - Cycle 2 Preparation

## AI Workflow Improvements
- **Issue**: AI goes too fast through priorities without pausing for discussion
- **Solution**: After proposing each priority plan, AI should pause and ask "Does this priority plan look good, or would you like to adjust any details?" before proceeding
- **Note**: Currently users must refuse proposals to discuss, which is too disruptive
- **VSCode Edit Issue**: When editing priority files in VSCode then accepting in Claude, it seems to override VSCode edits (may need to save first?)

## GitHub Flow Fixes Needed
- **Current Issue**: Creating branches from current feature branch instead of develop
- **Proposed Workflow**:
  1. Start new branch from develop for each priority
  2. Merge priority branch to develop when complete
  3. Merge develop to main after each priority (triggers CodeRabbit review)
- **Benefits**: Clean history, proper reviews, no tangled branches

## MCP Server Clarifications
- **Not Readonly**: MCP server should have write capabilities (especially for Priority 4)
- **Priority Evolution**: Can start with read in early priorities, add write later

## Offline Mode Decision
- **Decision**: Remove offline mode entirely for now
- **Rationale**: Not actually working, causing confusion
- **Action**: Incorporated into Priority 0 (tech debt cleanup)
- **Future**: Can reintroduce if E2E testing needs it

## Privacy Requirements
- **AI Context Isolation**: Private tiles must be completely isolated from AI context unless AI is working for the owner
- **Implementation**: Server-side filtering before AI context, clear boundaries
- **Added to**: Priority 2 documentation

## Test Output Issues
- **Problem**: Tests are way too verbose even when passing
- **Impact**: Hard for AI to process output, sometimes misses results from all test suites
- **Example**: `pnpm test:all` runs multiple suites, output can exceed AI's ability to parse
- **Solution Needed**: Configure test runners for concise output, especially in CI/AI contexts
- **Consider**: Different verbosity levels for different contexts (dev vs CI vs AI)

## Discovered Technical Debt: useEffect Anti-Pattern in AI Chat Integration
- **Investigation Date**: 2025-08-08
- **Current Implementation**: 
  - Two AI integration files exist: `ChatAIIntegration.tsx` (unused) and `useAIChatIntegration.ts` (active)
  - Active implementation uses `useEffect` to watch for new messages and trigger AI calls
  - This is a classic anti-pattern: using effects as event handlers
- **Problems Identified**:
  1. **Race conditions**: Relies on mutation state to prevent duplicate API calls
  2. **Unnecessary re-runs**: Effect runs on every state change, not just new messages
  3. **Hidden business logic**: AI triggering buried in side effect, hard to test
  4. **Confusing code**: `@ai` prefix no longer required but still referenced in welcome message
- **Correct Approach**: Event-driven pattern where message submission directly triggers AI
- **Recommendation for Next Cycle**:
  - Refactor to explicit event handler in message submission flow
  - Remove `useEffect` watching pattern
  - Create proper tests for AI message handling
  - Update welcome message to reflect current behavior (all messages go to AI)
- **Immediate Action Taken**: Removed unused `ChatAIIntegration.tsx` file

## MCP Context Strategy: Colors for Semantic Grouping
- **Planning Date**: 2025-09-04
- **Context**: During Priority 2 planning, explored how to provide contextual tile data to AI
- **Key Insight**: Colors could serve as semantic boundaries for context inclusion
- **Future Vision**:
  - Tiles tagged with same colors work together (e.g., all workflow phases = "blue")
  - When asking a "blue" tile, automatically include all other "blue" tiles within relationship distance
  - Elegant solution to composition problem without complex mechanics
  - Cross-cutting concerns could have multiple colors
- **Implementation Path**:
  - Phase 1: Basic context heuristic (ancestors + siblings)
  - Phase 2: Add color-based context grouping
  - Phase 3: Allow tiles to specify context needs via metadata
- **Value**: Makes tile relationships semantic rather than just hierarchical, enabling true system composition