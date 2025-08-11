# /issue Command

## Purpose
Document problems from a user/product perspective without technical investigation. Focus on WHAT is wrong, not HOW to fix it.

## Command Syntax
```
/issue <description> [branch-name] [#tag1 #tag2 ...]
```

## Product Context
The `/issue` command creates a structured problem statement that:
- Captures the problem from the user's perspective
- Documents impact on workflows
- Provides clear reproduction steps
- Serves as the foundation for all subsequent work

For technical issues (bugs, performance, etc.), this includes meta-technical context - what the user experiences, not implementation details.

## Problem Statement Structure

### User Impact
- Who is affected?
- What can't they do?
- How critical is this to their workflow?
- What workarounds exist (if any)?

### Reproducing the Issue
- Clear step-by-step instructions
- Expected vs actual behavior
- Environment/context where it occurs
- Frequency and conditions

## Tags

### Type Tags (choose one)
- `#bug` - Something isn't working
- `#feature` - New functionality request
- `#enhancement` - Improvement to existing functionality
- `#refactor` - Code improvement without changing functionality
- `#docs` - Documentation updates

### Domain Tags (choose relevant)
- `#tech` - Technical implementation
- `#design` - UI/UX considerations
- `#architecture` - System design
- `#product` - Product strategy
- `#performance` - Speed and optimization
- `#security` - Security concerns
- `#accessibility` - A11y improvements

### Component Tags (project-specific)
- `#tiles` - Tile system
- `#auth` - Authentication
- `#map` - Map visualization
- `#hierarchy` - Hierarchical structure
- `#api` - API/backend
- `#database` - Data layer
- `#testing` - Test coverage

### Priority Tags
- `#critical` - Blocks core functionality
- `#high` - Important but not blocking
- `#medium` - Normal priority
- `#low` - Nice to have

## Workflow

### 1. Issue File Creation
Creates the issue file in the current cycle directory:
- **Issue file**: `.workflow/cycles/[current]/<priority-name>-issue.md`
- Current cycle path is read from `.workflow/current.json` → `planification.cycle_plan`
- For technical priorities, this becomes the planning document
- Links to current milestone and priority context

Example:
```bash
# Read current cycle from workflow state
CYCLE_PATH=$(jq -r '.progress.planification.cycle_plan' .workflow/current.json | sed 's|/README.md||')
ISSUE_FILE="${CYCLE_PATH}/priority-auth-tiles-issue.md"
```

Initial issue file content:
```markdown
# Issue: <Title>

**Date**: YYYY-MM-DD
**Status**: Open
**Tags**: #bug #tech #tiles #high
**Milestone**: [Reference current from .workflow/current.json]
**Priority**: [Which cycle priority does this serve]
**GitHub Issue**: #<number>
**Branch**: issue-<number>-<slug-title>

## Problem Statement
<User's description focused on WHAT is wrong>

## Context
- **Current Cycle**: [Link to .workflow/cycles/current/README.md]
- **Serves Priority**: [Which priority from the cycle]
- **Why This Matters**: [How it connects to milestone]

## User Impact
- Who is affected?
- What can't they do?
- How critical is this to their workflow?

## Steps to Reproduce
1. [Step one]
2. [Step two]
3. [Step three]

## Environment
- Browser/OS: [if relevant]
- User role: [if relevant]
- Frequency: [always/sometimes/rarely]

## Related Issues
- [Links to related issues based on tags]
```

### File Management Strategy
- **Issue file**: Updated with each command to reflect current state
- Each command adds or updates relevant sections
- GitHub comments post the updated sections

### 2. Branch Creation
Automatically creates: `issue-<number>-<slug-title>`
- Branches from develop
- commits the issue file to the branch

### 3. GitHub Issue Creation
Uses the GitHub MCP (`mcp__github__create_issue`) to:
- Create issue with same title
- Add labels matching tags (converts #tag to GitHub labels)
- Post the complete issue markdown as the body
- Get the repository owner/name from: `git remote -v`
- Update the local file with the GitHub issue number

**Important**: When posting comments to GitHub issues, always start with:
```
*I am an AI assistant acting on behalf of @<username>*
```
This ensures transparency about AI-generated content.

## Tag Auto-Suggestion

### Keywords → Tags Mapping
- "not working", "broken", "error" → `#bug`
- "new", "add", "create" → `#feature`
- "slow", "performance", "optimize" → `#performance`
- "auth", "login", "permission" → `#auth`
- "tile", "hexagon" → `#tiles`
- "UI", "visual", "style" → `#design`
- "refactor", "clean up" → `#refactor`

## Examples

### Bug Report
```
/issue Auth tiles not responding to clicks on mobile devices #bug #auth #tiles #mobile #high
```

### Feature Request
```
/issue Add dark mode support to improve accessibility #feature #accessibility #design #medium
```

### Performance Issue
```
/issue Map rendering slows down with 100+ tiles #bug #performance #map #high
```

## Best Practices

1. **Be Specific**: Clear, descriptive titles help with searchability
2. **User Focus**: Describe what users experience, not technical assumptions
3. **Complete Information**: Include all reproduction steps upfront
4. **Appropriate Tags**: Use tags to help route and prioritize work
5. **No Solutions**: Save technical analysis for later commands

## Integration with Other Commands

When subsequent commands are used, they update the issue file:

### Issue File Updates
- **Update relevant sections** - Replace or append to existing sections
- **Maintain structure** - Consistent section organization
- **Progressive completion** - Each command fills in more detail

For example:
- `/context` adds the "## Context" section
- `/solution` adds the "## Solution" section  
- `/architecture` adds the "## Architecture" section
- Each command posts its section to GitHub as a comment

## Next Steps
After creating an issue with `/issue`, use:
- `/context #<issue>` - Gather technical context
- `/solution #<issue>` - Design solution approach
- `/archi #<issue>` - Document architecture decisions
- See `.claude/commands/README.md` for complete workflow