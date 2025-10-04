# Cycle Execution Phase

## Purpose
Do the actual work - implement features, fix bugs, write tests, document changes.

## Duration
Days to weeks - the longest phase of the cycle.

## Critical Context: Current Plan

**Before executing, review the plan from Planification phase:**
- Check `cycle-{date}.md` for task breakdown
- Check `.workflow/current.json` → `progress.planification.issue_ids`
- Remember: Every task serves the priorities, which serve the high-level goal

## Execution Check-in

Regular progress assessment:

- **Tasks completed**: X/Y from the plan
- **Current focus**: [Active task/issue]
- **Blockers**: [Any impediments]
- **Next action**: [Immediate next step]

Key questions:
- Are you on track with the plan?
- Do priorities need adjustment based on discoveries?
- Any unexpected technical challenges?
- Is the work still serving the high-level goal?

## Available Commands

During execution, use these commands:
- `/implementation` - Code implementation guidance
- `/refactor` - Improve code quality
- `/refactor-clarity` - Apply Rule of 6 refactoring
- `/walkthrough` - Document how things work

## Staying Focused

The AI will help you stay on track by:
- Detecting when you're drifting from current priority
- Suggesting whether to defer meta-work to retrospective
- Capturing ideas without acting on them immediately
- Providing gentle reminders about current goals

These behaviors are defined in CLAUDE.md and applied automatically.

## Daily Practice

1. Check current task in workflow state
2. Use appropriate execution command
3. Update progress in workflow state
4. Note any blockers or discoveries
5. Prepare for next task

## Output
- Completed code changes
- Updated documentation
- Test coverage
- Progress updates in `.workflow/current.json`

## Next Phase
When cycle tasks are complete → Move to **Retrospective** to learn from the cycle