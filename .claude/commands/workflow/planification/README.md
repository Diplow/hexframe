# Cycle Planification Phase

## Purpose
Break down the cycle's priorities into concrete, actionable tasks with clear success criteria.

## Duration
2-4 hours of detailed planning.

## Critical Context: Current Priorities

**Before planning, confirm the priorities from Prioritization phase:**
- Check `.workflow/current.json` → `progress.prioritization.top_priorities`
- These priorities serve the high-level goal from Goals phase

## Planning Process

For each priority:

1. **Work in priority files** - Update `.workflow/cycles/[date]/priority-*.md` files directly
2. **Define clear success criteria** - What does "done" look like?
3. **Identify technical requirements** - What needs to be built?
4. **List potential blockers** - What could prevent completion?
5. **Estimate effort** - How much work is involved?
6. **Create `/issue` documentation** - Formal problem statements

**Important**: During planification, expand the priority files with detailed task breakdowns. Don't create separate planning documents - the priority files ARE the living planning documents.

## Task Breakdown Template

```
Priority: [Name from prioritization]
Success: [What done looks like for users]
Tasks:
- [ ] Task 1 (link to /issue if created)
- [ ] Task 2 (link to /issue if created)
- [ ] Task 3 (link to /issue if created)
Dependencies: [What must exist first]
Risks: [What could go wrong]
Definition of Done: [Specific, measurable criteria]
```

## Available Commands

During planification, use these commands:
- `/issue` - Document specific problems or features
- `/tests` - Plan test strategy for the priority
- `/architecture` - Design system structure
- `/design` - Plan UI/UX approach
- `/context` - Gather necessary background
- `/solution` - Document solution approaches

## Output
- `cycle-{date}.md` with complete task breakdown
- Individual `/issue` documents for each major task
- Updated `.workflow/current.json` with issue IDs

## Next Phase
Once plan is complete with issues documented → Move to **Execution** to implement