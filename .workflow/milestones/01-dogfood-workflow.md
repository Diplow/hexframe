# Milestone 1: Dogfood the Workflow System Through HexFrame Integration

## The Goal
Complete the transition from file-based workflow to HexFrame tiles, proving that systems can stay alive through AI-readable structure and actual daily use.

## Why This Matters

### The System Thinker's Dream
We've built a workflow system that should guide development. But like all systems created by system thinkers, it risks dying unused. This milestone tests whether we can break that pattern by making the workflow system native to HexFrame itself.

### The Innovation: Spatial Workflow Management
Instead of scattered files, workflow lives in HexFrame tiles that AI can naturally read and update:
- Workflow structure visible as hexagonal map
- Current state maintained in tiles, not files
- AI gets milestone context when working on priorities
- Progress tracked through tile updates, not file changes

## Success Criteria

1. **Complete Migration**: All `.workflow/` files replaced by HexFrame tiles
2. **MCP Integration**: Claude can read/update workflow through MCP tools
3. **Executable Prompts**: Key workflows accessible via `@tile` syntax and MCP
4. **Living System**: Workflow state stays current through natural usage
5. **Transparent Process**: Development progress visible and trackable

## HexFrame Value Demonstration

This milestone proves HexFrame's core value propositions:

### 1. Executable Prompt Library
- **@deploy**: Production deployment automation (merge develop→main, create issues, archive cycle)
- **@context**: Get structured context for current priority (milestone + cycle + priority details)
- **@health**: System aliveness metrics (MCP usage, prompt execution frequency)
- **@expert**: HexFrame system creation expertise (how to make systems that live)

### 2. Structured Data Access
- **HexFrame UI**: Visual workflow navigation for humans
- **MCP Integration**: Programmatic access for AI agents
- **Progressive Context**: Right information at right abstraction level

### 3. System Composability
- Named tiles become reusable components
- Systems can reference other systems
- Import/customize workflow patterns across users

### 4. Aliveness Metrics
- Track which prompts get executed
- Monitor MCP API usage patterns
- Measure system engagement vs abandonment

## Concrete Workflow Structure

Simplified hierarchy optimized for solo development with AI context:

```
Goals (Center)
├─ 1. Current Milestone
│   ├─ 1.1. Current Cycle
│   │   ├─ 1.1.1. Priority 1
│   │   ├─ 1.1.2. Priority 2
│   │   ├─ 1.1.3. Priority 3
│   │   ├─ 1.1.4. Priority 4
│   │   └─ 1.1.5. Bonus
│   ├─ 1.2. Next Cycle
│   ├─ 1.3. Backlog (milestone)
│   └─ 1.4. Archive
├─ 2. Next Milestone
├─ 3. Backlog (global)
└─ 4. Milestones Archive
```

**Context Hierarchy**: Goals > Milestone > Cycle > Priority
- Each level provides necessary context for the next
- AI agents get progressive context building
- Human navigation follows natural decision paths

## Implementation Features

### @ Syntax for Executable Prompts
- **Chat Interface**: `@deploy` executes deployment workflow
- **MCP Tool**: `hexframe:ask(coordinates, question)` for programmatic access
- **Named Systems**: Compose multiple tiles into named, executable systems

### Automation Ready
- **Cycle Completion**: Automated GitHub issue creation, merge, documentation
- **State Transitions**: Move completed cycles to archive automatically
- **Metrics Collection**: Track system usage and prompt execution

## Validation Strategy

### Week 1: Structure & Migration
- Create Goals tile with 4 children (milestone, next milestone, backlog, archive)
- Populate Current Milestone > Current Cycle > Priorities
- Implement `@` syntax for key prompts (@deploy, @context, @health)
- Update CLAUDE.md to use MCP instead of file reading

### Week 2: Daily Workflow Usage
- Use tile-based workflow for actual development
- Execute priorities using AI guidance from tile context
- Track prompt usage and system engagement
- Validate automation works (cycle completion, archiving)

### Week 3: Refinement & Metrics
- Optimize tile organization based on usage patterns
- Implement aliveness metrics and reporting
- Document lessons for next milestone
- Prepare transition to Jay system architecture

## Success Metrics

- **Zero `.workflow/` files**: All state lives in tiles
- **AI Effectiveness**: Claude accurately guides development using tile context
- **Prompt Usage**: @deploy, @context executed regularly in actual development
- **System Evolution**: Workflow structure improves through practice

## The Meta-Demonstration

This milestone becomes HexFrame's first success story:
- **Living System**: Workflow that stays current through use, not neglect
- **AI Integration**: Spatial organization drives AI understanding
- **Executable Documentation**: Systems that work, not just describe
- **Recursive Development**: Using HexFrame to build HexFrame

Success here validates the foundation for Milestone 2's Jay system and full AI orchestration platform.