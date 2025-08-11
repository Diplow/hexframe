# Next Cycle Prioritization Phase

## Purpose
Decide what to focus on in the upcoming cycle based on impact, dependencies, and feasibility.

## Duration
1-2 hours of focused decision-making.

## Critical Context: Current High-Level Goal

**Before prioritizing:**
1. Review the current goal from `.workflow/current.json` → `progress.goals`
2. Check the backlog in `.workflow/backlog/` for all available work:
   - `bugs.md` - Known issues to fix
   - `features.md` - New capabilities to add
   - `ux.md` - Experience improvements
   - `tech-debt.md` - Technical cleanup

Every priority should directly serve the current goal. Ask: "How does this help systems stay alive through actual use?"

## Prioritization Framework

Consider each potential priority through these lenses:

- **Impact**: What will most advance your mission?
- **Dependencies**: What unblocks other work?
- **User Need**: What pain points are most urgent?
- **Feasibility**: What can realistically be completed in one cycle?

## Selecting from Backlog

1. **Review all categories** in `.workflow/backlog/`:
   - Start with bugs that block users
   - Consider features that unlock new workflows
   - Look for quick UX wins
   - Evaluate tech debt by risk

2. **Mix priority types** for a balanced cycle:
   - 1-2 user-facing improvements
   - 1 technical foundation piece
   - Quick wins to maintain momentum

## Selection Criteria

For each candidate, evaluate:
1. How directly does it enable the current high-level goal?
2. What other work does it enable?
3. How many users will benefit immediately?
4. Can we ship something meaningful this cycle?

## Output
Prioritized list of 2-4 objectives for the cycle, documented in the workflow state.

## AI Collaboration Note
1. **Present each priority individually** and pause for feedback
2. **Ask explicitly**: "Does this priority documentation look good, or would you like to adjust any details?"
3. **Wait for confirmation** before moving to the next priority
4. **Allow refinement** without requiring proposal rejection

This ensures collaborative prioritization rather than rushed planning.

## Important: Backlog vs Priority Files
- **Backlog files** (`.workflow/backlog/`): Generic pool of all potential work
- **Priority files** (`.workflow/cycles/[date]/priority-*.md`): Selected work for current cycle
- **Key rule**: Once items are selected from backlog into priority files, ALL updates go to the priority files
- **Never update backlog** after prioritization - those remain as the general pool for future cycles
- **Priority files are living documents** that evolve during planning and execution

## Next Phase
Once priorities are set → Move to **Planification** to break them down into actionable tasks