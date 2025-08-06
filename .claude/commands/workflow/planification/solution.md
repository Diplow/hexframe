# /solution Command

## Purpose
Design and document solution approaches for an issue after context has been gathered. The goal is to explore multiple implementation paths, evaluate tradeoffs, and recommend the best approach based on the codebase context and user requirements.

## Command Syntax
```
/solution #<issue-number>
```

## Prerequisites
- Issue must exist with `/issue` command
- Context must be gathered with `/context` command
- Understanding of current implementation from context analysis

## Solution Design Process

### 1. Review Context
- Load issue and context documentation
- Understand problem constraints
- Review architectural patterns identified
- Consider user requirements and expected behavior

### 2. Solution Exploration
- **Generate Multiple Approaches**: Always provide at least 2-3 viable solutions
- **Consider Patterns**: Use existing patterns when possible, introduce new ones thoughtfully
- **Think Incrementally**: Prefer solutions that can be implemented in stages
- **Evaluate Complexity**: Balance feature completeness with implementation effort

### 3. Technical Analysis
For each solution:
- **Implementation Path**: High-level steps required
- **Components Affected**: Which files/components need changes
- **New Components**: What needs to be created
- **Integration Points**: How it fits with existing architecture

### 4. Tradeoff Evaluation
- **User Experience**: How each solution affects usability
- **Development Effort**: Time and complexity estimates
- **Maintenance**: Long-term maintainability
- **Performance**: Runtime and bundle size impacts
- **Extensibility**: Future enhancement possibilities

## Documentation

### Issue File Update
Update the issue file (`/issues/YYYY-MM-DD-<slug>-<issue-number>.md`) by adding or updating the `## Solution` section with a structured format that captures:
- Multiple solution approaches
- Technical analysis for each
- Tradeoff evaluation
- Recommended approach with rationale

## Best Practices

1. **Multiple Options**: Always provide at least 2-3 viable solutions
2. **Clear Tradeoffs**: Be explicit about pros/cons of each approach
3. **Concrete Steps**: Provide actionable implementation paths
4. **Use Context**: Solutions should build on context analysis findings
5. **Consider Phases**: Break complex solutions into implementable phases
6. **Think Holistically**: Consider UX, performance, and maintenance
7. **Reference Code**: Include specific file paths and component names
8. **Stay Practical**: Balance ideal solutions with pragmatic constraints

## Solution Patterns

### Common Solution Structures

**Progressive Enhancement**:
- Start with minimal viable solution
- Add features incrementally
- Each phase delivers value

**Feature Toggle**:
- Implement alongside existing code
- Use feature flags for gradual rollout
- Easy rollback if issues arise

**Adapter Pattern**:
- Create abstraction layer
- Implement new behavior behind interface
- Swap implementations without breaking changes

**Composition Pattern**:
- Build from small, focused components
- Combine for complex behavior
- Maintains single responsibility

## GitHub Synchronization

After completing solution design:

1. **Post to GitHub Issue**: 
   ```
   *I am an AI assistant acting on behalf of @<username>*
   
   ## Solution Design Complete
   
   [Paste the Solution section here]
   ```

2. **Commit and Push**:
   ```bash
   git add issues/YYYY-MM-DD-*.md
   git commit -m "feat: add solution design for issue #<number>"
   git push
   ```

## Integration with Workflow

- See `.claude/commands/README.md` for complete workflow
