# Priority 0.5: Document All Subsystems for Architectural Clarity

## Why This Matters
The architectural clarity gained from documenting all subsystems will significantly improve development efficiency. With clear boundaries and documented interfaces, AI assistants can work more effectively within each subsystem, and developers can quickly understand the system's structure.

## Overall Goal
Create comprehensive documentation for all major subsystems using the architect-documentation.md prompt, establishing clear boundaries and dependencies that can be reviewed using the architecture-reviewer.md prompt.

## Task Breakdown

### Task 0: Merge Current Work
- **Branch**: Current branch (feat/inngest-queue-integration)
- **Actions**:
  1. Commit current Cache subsystem improvements
  2. Create PR to develop
  3. Address CodeRabbit review comments
  4. Merge to develop
  5. Create PR from develop to main
  6. Merge to main
- **Why**: Prevent massive PR later and establish clean baseline

### Task 1: Document map/Canvas Subsystem
- **Branch**: `docs/canvas-subsystem`
- **Path**: `src/app/map/Canvas`
- **Expected outputs**:
  - README.md (mental model)
  - ARCHITECTURE.md (structure)
  - interface.ts (public API)
  - dependencies.json (allowed imports)
- **Key questions**: 
  - How does Canvas interact with Cache?
  - What's the boundary with Tile components?

### Task 2: Document map/Chat Subsystem
- **Branch**: `docs/chat-subsystem`
- **Path**: `src/app/map/Chat`
- **Expected outputs**: Same 4 files
- **Key questions**:
  - How does Chat use the EventBus?
  - What's the interface with AI/Agentic services?

### Task 3: Document map/Hierarchy Subsystem
- **Branch**: `docs/hierarchy-subsystem`
- **Path**: `src/app/map/Hierarchy`
- **Expected outputs**: Same 4 files
- **Key questions**:
  - How does it consume Cache data?
  - What's its responsibility vs Canvas?

### Task 4: Document Map Page Subsystem
- **Branch**: `docs/map-page-subsystem`
- **Path**: `src/app/map` (the page level)
- **Expected outputs**: Same 4 files
- **Key questions**:
  - How does it compose Canvas, Chat, Cache, Hierarchy?
  - Where does EventBus get instantiated?
  - What's the initialization sequence?
- **Note**: This is the orchestration layer that ties everything together

### Task 5: Document Mapping Domain
- **Branch**: `docs/mapping-domain`
- **Path**: `src/lib/domains/mapping`
- **Expected outputs**: Same 4 files
- **Key questions**:
  - What's the public interface for the domain?
  - Which subsystems should access what?

### Task 6: Document IAM Domain
- **Branch**: `docs/iam-domain`  
- **Path**: `src/lib/domains/iam`
- **Expected outputs**: Same 4 files
- **Key questions**:
  - How does authentication flow through the system?
  - What depends on IAM?

### Task 7: Document Agentic Domain
- **Branch**: `docs/agentic-domain`
- **Path**: `src/lib/domains/agentic`
- **Expected outputs**: Same 4 files
- **Key questions**:
  - How does it consume Cache state?
  - What's the boundary with Chat?

## Success Criteria
After completing all tasks:
1. Every major subsystem has clear documentation
2. Dependencies are explicit and justified
3. An AI can understand each subsystem in isolation
4. We can generate a Mermaid diagram showing all subsystem relationships
5. The architecture-reviewer.md prompt can validate boundaries

## Execution Strategy
- Create separate branch for each task
- Small, focused PRs for each subsystem
- Use the architect-documentation.md prompt consistently
- Review with architecture-reviewer.md before merging
- Build up the full system picture incrementally

## Expected Outcome
A fully documented architecture where:
- Subsystem boundaries are clear
- Dependencies are explicit
- The "map page" orchestration layer is properly documented as the composition point
- Future developers (human or AI) can quickly understand and work within boundaries