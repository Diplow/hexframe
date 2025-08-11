# /architecture Command

## Purpose
Document the technical architecture for implementing a solution. This optional but recommended follow-up to `/solution` provides the mental model for thinking about the feature, including both pre-existing architecture and planned changes.

## Command Syntax
```
/architecture #<issue-number>
```

## Prerequisites
- Issue must exist with `/issue` command
- Context must be gathered with `/context` command  
- Solution must be designed with `/solution` command
- Understanding of current and future architecture

## Architecture Documentation Process

### 1. Review Foundation
- Load issue, context, and solution documentation
- Understand the selected solution approach
- Identify architectural patterns to follow
- Consider system-wide implications

### 2. Document Current Architecture
- **Component Structure**: How things are organized now
- **Data Flow**: How information moves through the system
- **State Management**: Where and how state is stored
- **Integration Points**: Where new code will connect

### 3. Define New Architecture
- **New Components**: What will be created
- **Modified Components**: What will change
- **Data Model**: New state and data structures
- **Event Flow**: How interactions will work

### 4. Create Mental Model
- **Conceptual Diagram**: High-level view of the system
- **Key Abstractions**: Core concepts to understand
- **Patterns to Follow**: Architectural decisions to maintain
- **Boundaries**: Clear interfaces between components

## Documentation Structure

### Issue File Update
Add or update the `## Architecture` section in the issue file (`.workflow/cycles/[current]/<priority>-issue.md`):

```markdown
## Architecture

### Current State
[Description of relevant existing architecture]

### New Components
[List and describe new architectural elements]

### Modified Components
[List and describe changes to existing elements]

### Data Flow
[How data moves through the feature]

### Mental Model
[Conceptual description of how to think about this feature]

### Key Patterns
[Architectural patterns that must be followed]
```

### GitHub Comment
Post the architecture section as a comment on the GitHub issue:

```markdown
*I am an AI assistant acting on behalf of @<username>*

## Architecture Design Complete

[Paste the Architecture section here]
```

## Best Practices

1. **Think in Layers**: Separate concerns clearly
2. **Respect Patterns**: Follow existing architectural decisions
3. **Define Boundaries**: Clear interfaces between components
4. **Consider Scale**: Design for current and future needs
5. **Document Trade-offs**: Explain architectural compromises
6. **Visual When Helpful**: Use ASCII diagrams for clarity

## Example Architectural Patterns

### Component Hierarchy
```
PageComponent
├── LayoutWrapper
│   ├── Navigation
│   └── MainContent
│       ├── FeatureProvider
│       │   ├── FeatureComponent
│       │   └── FeatureControls
│       └── DataProvider
```

### Data Flow
```
User Action → UI Component → Hook → Context → State → UI Update
     ↓                                    ↓
Side Effect ← API Call ← ← ← ← ← ← ← Service
```

### State Architecture
```
Global State (Context)
├── UI State (local)
├── Domain State (shared)
└── Cache State (performance)
```

## Common Architectural Decisions

### When to Create New Context
- Shared state across multiple components
- Complex state logic
- Need for global updates

### When to Use Local State
- Component-specific UI state
- Temporary form data
- Animation/transition states

### When to Create New Hooks
- Reusable business logic
- Complex side effects
- Cross-cutting concerns

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