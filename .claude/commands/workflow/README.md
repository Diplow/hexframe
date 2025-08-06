# /workflow Command

## Purpose
Track and guide through the Hexframe development workflow, maintaining context across sessions and ensuring deliberate progress through each phase.

## Command Syntax
```
/workflow [phase] [action]
```

Examples:
- `/workflow` - Show current workflow status
- `/workflow next` - Move to next phase
- `/workflow goals` - Jump to specific phase
- `/workflow update` - Update current phase progress

## Workflow Phases

### 1. High Level Goals
**Purpose**: Define or review the fundamental objectives
**Duration**: Rarely changes, quick review
**Key Questions**:
- What change are we trying to create?
- What does success look like?
- Are our goals still aligned with our mission?

**Output**: `goals.md` updated with any refinements

### 2. Next Cycle Prioritization
**Purpose**: Decide what to focus on in the upcoming cycle
**Duration**: 1-2 hours
**Key Questions**:
- What will have the most impact?
- What blocks other progress?
- What do users need most urgently?
- What can realistically be completed?

**Output**: Prioritized list of objectives for the cycle

### 3. Cycle Planification
**Purpose**: Break down priorities into actionable tasks
**Duration**: 2-4 hours
**Key Questions**:
- What specific tasks will achieve our objectives?
- What are the dependencies?
- What could go wrong?
- What's our definition of done?

**Connects to**: `/issue` command for detailed problem statements
**Output**: `cycle-{date}.md` with task breakdown

### 4. Cycle Execution
**Purpose**: Do the actual work
**Duration**: Days to weeks (longest phase)
**Key Activities**:
- Implement features
- Fix bugs
- Write tests
- Document changes

**Stay-on-track Support**: AI actively helps maintain focus by:
- Detecting drift from current priority
- Deferring non-blocking improvements
- Capturing ideas without immediate action
- These behaviors are defined in CLAUDE.md

**Connects to**: Various implementation commands (`/implementation`, `/refactor`, etc.)
**Output**: Completed work, updated documentation

### 5. Cycle Retrospective
**Purpose**: Learn from what happened
**Duration**: 1-2 hours
**Key Questions**:
- What went well?
- What was harder than expected?
- What did we learn?
- What should we change next cycle?

**Output**: `retro-{date}.md` with insights

### 6. User Research
**Purpose**: Understand user needs and validate direction
**Duration**: Variable (may be skipped or brief)
**Key Activities**:
- Use the product yourself
- Gather feedback
- Document pain points
- Identify opportunities

**Output**: `research-{date}.md` with findings

## Workflow State File

The workflow state is tracked in `.workflow/current.json`:

```json
{
  "current_phase": "cycle_execution",
  "phase_started": "2025-08-05T21:37:58Z",  // Use: date -u +"%Y-%m-%dT%H:%M:%SZ"
  "cycle_number": 3,
  "cycle_theme": "LLM Integration",
  "progress": {
    "goals": {
      "last_reviewed": "2025-01-01",
      "status": "stable"
    },
    "prioritization": {
      "completed": "2025-01-14",
      "top_priorities": ["LLM chat", "System activation", "User onboarding"]
    },
    "planification": {
      "completed": "2025-01-15",
      "issue_ids": ["#90", "#91", "#92"]
    },
    "execution": {
      "started": "2025-01-15",
      "completed_tasks": 12,
      "total_tasks": 20,
      "blockers": []
    },
    "retrospective": {
      "scheduled": "2025-01-29"
    },
    "research": {
      "last_conducted": "2025-01-10",
      "next_planned": "after_cycle"
    }
  },
  "history": [
    {
      "cycle": 2,
      "completed": "2025-01-01",
      "theme": "Foundation Architecture"
    }
  ]
}
```

## Implementation Guide

When `/workflow` is invoked:

1. **Read State**: Load `.workflow/current.json`
2. **Assess Phase**: Determine current phase and progress
3. **Guide Action**: Based on phase, either:
   - Show status and next steps
   - Provide phase-specific prompts
   - Transition to next phase
   - Update progress

## Workflow Modification Handling

When user requests workflow changes during execution:

1. **Quick fixes** (typos, clarifications): Apply immediately
2. **Structural changes** (new phases, major reorganization): Defer to retrospective
3. **New ideas**: Capture in `.workflow/ideas/` for next prioritization
4. **If unsure**: Ask "Is this blocking current work or can it wait for retrospective?"

The workflow should evolve, but not at the expense of getting work done.

## Phase Transitions

### Automatic Triggers
- Goals → Prioritization: When goals are reviewed
- Prioritization → Planification: When priorities are set
- Planification → Execution: When plan is complete
- Execution → Retrospective: When cycle tasks complete
- Retrospective → Research/Goals: Based on findings

### Manual Override
User can jump to any phase with `/workflow [phase]`

## Integration with Other Commands

- **During Planification**: Automatically invoke `/issue` for each priority
- **During Execution**: Reference relevant `/implementation`, `/refactor` commands
- **After Retrospective**: May trigger `/refactor` based on learnings

## Example Session

```
User: /workflow