# /architecture Command

## Purpose
Document how the solution will affect subsystem boundaries and interfaces. This command focuses on precisely defining what subsystems will change, what new subsystems (if any) will be created, and most importantly, how the interfaces between subsystems will evolve. The goal is to maintain clear subsystem boundaries that allow each subsystem to be understood and modified in isolation.

## Command Syntax
```
/architecture #<issue-number>
```

## Prerequisites
- Issue must exist with `/issue` command
- Context must be gathered with `/context` command  
- Solution must be designed with `/solution` command
- Understanding of existing subsystem boundaries

## Architecture Documentation Process

### 1. Review Foundation
- Load issue, context, and solution documentation
- Understand the selected solution approach
- Identify existing subsystem boundaries
- Review current interface definitions (`interface.ts` files)

### 2. Analyze Subsystem Impact
- **Affected Subsystems**: Which existing subsystems will be modified?
- **New Subsystems**: Will any new subsystems be created?
- **Interface Changes**: How will `interface.ts` files change?
- **Dependency Changes**: Will `dependencies.json` need updates?

### 3. Document Interface Evolution
For each affected subsystem:
- **Current Interface**: What does it expose now?
- **Modified Interface**: What will it expose after changes?
- **New Dependencies**: What new external dependencies will it need?
- **Breaking Changes**: Will existing consumers be affected?

### 4. Define Subsystem Boundaries
- **Clear Boundaries**: Each subsystem should have a clear responsibility
- **Minimal Coupling**: Interfaces should be as narrow as possible
- **No Leaky Abstractions**: Internal implementation details stay internal
- **Documented Contracts**: All inter-subsystem communication is explicit

## Documentation Structure

### Issue File Update
Add or update the `## Architecture` section in the issue file (`.workflow/cycles/[current]/<priority>-issue.md`):

```markdown
## Architecture

### Subsystem Changes Overview
- **Modified Subsystems**: [List of existing subsystems that will change]
- **New Subsystems**: [Any new subsystems to be created, or "None"]
- **Unchanged Subsystems**: [Subsystems that interact but won't change]

### [Subsystem Name] Changes
For each affected subsystem:

#### Interface Changes
```typescript
// Current interface.ts
export interface ICurrentSubsystem {
  existingMethod(): void
}

// After changes
export interface IModifiedSubsystem {
  existingMethod(): void
  newMethod?(): void  // NEW: Purpose
}
```

#### Dependency Changes
```json
// Current dependencies.json
{
  "allowed": ["existing-dep"]
}

// After changes
{
  "allowed": ["existing-dep", "new-dep"]  // NEW: new-dep for X functionality
}
```

#### Internal Changes
- New components (internal, not exposed)
- Modified components (internal refactoring)
- Data flow changes within subsystem

### Cross-Subsystem Interfaces
[Document any new or modified communication between subsystems]

### Subsystem Boundary Diagram
[ASCII diagram showing subsystem relationships and interfaces]

### Key Architectural Decisions
- Why these subsystem boundaries?
- Why these interface changes?
- Trade-offs in coupling vs cohesion
```

### GitHub Comment
Post the architecture section as a comment on the GitHub issue:

```markdown
*I am an AI assistant acting on behalf of @<username>*

## Architecture Design Complete

[Paste the Architecture section here]
```

## Best Practices

1. **Document What IS**: Show actual subsystem boundaries, not ideal ones
2. **Interfaces Are Contracts**: Every change to `interface.ts` is a breaking change
3. **Dependencies Are Explicit**: All external imports must be in `dependencies.json`
4. **Internal vs External**: Keep internal implementation hidden from interface
5. **Minimize Coupling**: Prefer narrow, focused interfaces
6. **Think in Subsystems**: Each subsystem should be independently understandable
7. **Visual Boundaries**: Use diagrams to show subsystem relationships

## Example Subsystem Documentation

### Subsystem Boundary Example
```
┌─────────────────────────────────────────────────────────┐
│                     Chat Subsystem                       │
│  interface.ts: IChatSubsystem                           │
│  dependencies.json: ["@/lib/domains/agentic", "react"]  │
│                                                          │
│  Internal Structure (not exposed):                      │
│  ├── Timeline/                                          │
│  ├── Widgets/                                           │
│  └── _hooks/                                            │
└─────────────────────────┬───────────────────────────────┘
                          │ IChatSubsystem
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Agentic Domain                        │
│  interface.ts: IAgenticService, ILLMRepository          │
│  dependencies.json: ["openrouter", "inngest"]           │
└──────────────────────────────────────────────────────────┘
```

### Interface Evolution Example
```typescript
// BEFORE: Chat/interface.ts
export interface IChatSubsystem {
  sendMessage(content: string): void
}

// AFTER: Chat/interface.ts  
export interface IChatSubsystem {
  sendMessage(content: string): void
  onThinkingProgress?(progress: number): void  // NEW: Optional callback
}
```

### Dependency Change Example
```json
// BEFORE: Chat/dependencies.json
{
  "allowed": [
    "@/lib/domains/agentic",
    "react"
  ]
}

// AFTER: Chat/dependencies.json
{
  "allowed": [
    "@/lib/domains/agentic",
    "react",
    "@/app/map/Canvas"  // NEW: For AI scanning animation
  ]
}
```

## Common Architectural Decisions

### When to Create a New Subsystem
- Distinct domain responsibility (e.g., authentication, payments)
- Could be extracted as a separate package
- Has clear consumers and providers
- Manages its own state and lifecycle

### When to Keep Within Existing Subsystem
- Tightly coupled to existing functionality
- Only used by one subsystem
- Implementation detail of a larger feature
- Would create circular dependencies if extracted

### When to Modify interface.ts
- New functionality needed by external consumers
- Breaking changes that require versioning
- Exposing previously internal functionality
- Creating new integration points

### When to Update dependencies.json
- Adding new external library
- Importing from another subsystem
- Removing unused dependencies
- Documenting exception cases

## Integration with Workflow

The `/architecture` command should be run:
1. After `/solution` to detail technical approach
2. Before implementation begins
3. When solution requires architectural changes
4. To document mental models for complex features

## Next Steps
After `/architecture`, you can:
- Start implementation with clear mental model
- Create design documents if needed
- Begin breaking down into specific tasks
- Review with team for architectural alignment

See `.claude/commands/README.md` for complete workflow.

ARGUMENTS: #<issue-number>