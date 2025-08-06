# /context Command

## Purpose
Gather and document relevant codebase context for an issue without proposing solutions. The goal is to build a clear mental model of the current implementation, specifically focused on the areas and concerns raised by the issue. This targeted understanding ensures we fully comprehend what exists before considering changes.

This context will be handed over to future steps in the workflow (solution design, architecture decisions, implementation), providing them with a solid foundation of understanding.

## Command Syntax
```
/context #<issue-number>
```

## Context Gathering Process

### 1. Read Issue Documentation
- Load the issue file from `/issues/YYYY-MM-DD-*.md`
- Understand the problem statement and user impact
- Identify the domains and components mentioned

### 2. Architecture Analysis
- **Understand the Architecture**: 
  - Check README.md files in relevant directories
  - Read architecture documentation (e.g., `/src/app/map/ARCHITECTURE.md`, `/src/server/README.md`, `/src/lib/domains/README.md`)
  - Identify which layers and components are involved
  - Map the conceptual model to the implementation

### 3. Documentation Review
- **Find Relevant Documentation**:
  - Check for README files in affected directories
  - Look for architecture documentation
  - Review any existing API documentation
  - Find inline documentation and comments

- **Verify Documentation Accuracy**:
  - Compare documentation claims with actual implementation
  - Note any discrepancies or outdated information
  - Identify undocumented areas that need explanation

### 4. Current State Analysis
- **Code Investigation**:
  - Examine current implementations in affected areas
  - Identify existing patterns and conventions
  - Note current terminology usage
  - Document actual vs expected behavior

- **Dependency Mapping**:
  - What depends on the affected code?
  - What does the affected code depend on?
  - Cross-domain interactions

## Documentation

### Issue File Update
The issue file (`/issues/YYYY-MM-DD-<slug>-<issue-number>.md`) should already exist from the `/issue` command. This step will add or update the `## Context` section with the following structure:

```markdown
## Context

*I am an AI assistant acting on behalf of @<username>*

### Existing Documentation
Lists all relevant documentation found and verifies accuracy:
- **README Files**: Location and summary of each README
- **Architecture Docs**: Relevant architectural documentation
- **Documentation vs Reality**: What matches (✅), what's outdated (❌), what's missing (📝)

### Domain Overview
High-level understanding of the domain/area affected by the issue:
- Architecture and design patterns
- Core concepts and principles
- How this area fits into the larger system

### Key Components
The main building blocks relevant to the issue:
- Component names and their responsibilities
- How they interact with each other
- Which components are most affected

### Implementation Details
Current code structure and patterns:
- **File Organization**: How code is structured in directories
- **Naming Conventions**: Current terminology and patterns
- **Design Patterns**: Repository, Service, Factory, etc.
- **Data Flow**: How data moves through the system
```

### Dependencies and Integration
- **Internal Dependencies**: What this code depends on
- **External Consumers**: What depends on this code
- **API Contracts**: How this is exposed to other parts
- **Database Schema**: Relevant tables and relationships

## Best Practices

1. **No Solutions**: Focus on understanding, not fixing
2. **Be Thorough**: Check all relevant documentation
3. **Verify Claims**: Don't trust docs blindly - check actual code
4. **Use References**: Include file paths and line numbers
5. **Stay Objective**: Document what IS, not what SHOULD BE
6. **Create Missing Docs**: If documentation doesn't exist for involved parts, create it in the context
7. **Build Mental Model**: Goal is to provide complete understanding of the code involved
8. **Use Correct Language**: Pay meticulous attention to using the right terminology as defined in relevant README files - this ensures consistency and clarity

## GitHub Synchronization

After completing the context analysis:

1. **Post to GitHub Issue**: Copy the entire `## Context` section from the issue file and post it as a comment on the GitHub issue. Start the comment with:
   ```
   *I am an AI assistant acting on behalf of @<username>*
   
   ## Context Analysis Complete
   
   [Paste the Context section here]
   ```

2. **Commit and Push**: Commit the issue file with a descriptive message:
   ```bash
   git add issues/YYYY-MM-DD-*.md
   git commit -m "feat: add context analysis for issue #<number>"
   git push
   ```

This ensures the GitHub issue discussion stays synchronized with the local documentation.

## Integration with Workflow

- See `.claude/commands/README.md` for complete workflow