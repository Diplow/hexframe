# Workflow Backlog

This backlog contains all identified work items, bugs, and improvements for Hexframe. It serves as the input for the prioritization phase of each workflow cycle.

## Categories

- **[bugs.md](./bugs.md)** - Known bugs that affect user experience
- **[features.md](./features.md)** - New features and improvements to existing functionality  
- **[ux.md](./ux.md)** - User experience improvements and polish
- **[tech-debt.md](./tech-debt.md)** - Technical improvements, refactoring, and infrastructure

## How to Use

1. **During Research Phase**: Add new items discovered through testing
2. **During Prioritization Phase**: Review all items and select top priorities for the cycle
3. **During Execution**: Reference for context but stay focused on selected priorities
4. **During Retrospective**: Note completed items and add newly discovered issues

## Adding Items

When adding new backlog items:
- Be specific about the problem or opportunity
- Add context about why it matters
- Note any dependencies or blockers
- Consider which category it belongs to

## Priority Hints

Not all items are equal. Consider:
- **User Impact**: Does this block users or just annoy them?
- **System Integrity**: Does this threaten the hexagonal model or core philosophy?
- **Technical Risk**: Will this get harder if we wait?
- **Quick Wins**: Can this be fixed in < 30 minutes?

## Core Value Alignment

Each item is tagged with which Hexframe value it advances:
- **[Create]** - Helps users create systems capturing experience
- **[Share]** - Enables sharing systems for discussion and forking
- **[Compose]** - Supports composing systems together
- **[Activate]** - Keeps systems alive through actual use
- **[Monitor]** - Tracks which systems are used and shape behavior

Prioritize items that advance underserved values or unlock blocked capabilities.