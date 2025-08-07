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