# Refactor for Clarity Guide

This guide provides principles and practices for refactoring code to improve clarity and readability.

## The Fundamental Rule

For any function:
- **The name** is enough to understand **what it does**
- **The arguments** are enough to understand **what it needs** to do what it does
- **The content** is enough to understand **how it does** what it does with what it needs

This creates a clear hierarchy of understanding:
1. Read the name → Know the purpose
2. Read the signature → Know the dependencies
3. Read the body → Know the implementation

## The Hexframe Code Structure

Apply the hexframe's hierarchical model to code organization:

- **Folder = Frame**: Contains max 6 child folders + max 6 files
  - Child folders represent child Tiles
  - One primary file (e.g., page.tsx, index.ts) acts as the CenterTile
  - Other files (layout.tsx, README.md, types.ts) are metadata "inside" the CenterTile
- **File = Tile**: Contains max 6 functions
- **Function = Child Tile**: Contains max 50 lines (relaxed from 6)
- **Arguments = Child Properties**: Max 6 arguments (prefer 3, or 1 object with max 6 keys)
- **Line = Leaf Tile**: Single responsibility statement

This creates consistent depth and breadth limits throughout the codebase, mirroring the visual hierarchy of hexframe maps.

**Key insight**: Just as a Frame has a CenterTile with surrounding children, a folder has a primary file (its center) with supporting metadata files that are "composed" with it (like layout.tsx composing with page.tsx).

### Benefits of the Rule of 6:
- Prevents overwhelming complexity at any level
- Forces decomposition and better organization
- Makes navigation predictable and intuitive
- Aligns code structure with the hexframe mental model

## Core Principles

### 1. Naming is Communication
- Use descriptive, intention-revealing names
- Avoid abbreviations and acronyms
- Names should answer "what" and "why", not "how"

### 2. Establish Domain Language
- When complexity reveals important concepts, they need precise definitions
- Complex naming decisions should be validated with the team/user
- Document new terms in the relevant domain or component README (e.g., `src/app/map/Canvas/README.md`)
- Refactoring is the perfect time to identify missing domain concepts

**Signs a concept needs definition:**
- Multiple functions/files dealing with the same complex idea
- Difficulty naming something clearly in a few words
- Repeated explanatory comments about the same concept
- Confusion or ambiguity in code reviews

### 3. Single Responsibility
- Each function/component should do one thing well
- If you need "and" to describe what it does, it's doing too much

### 4. Reduce Cognitive Load
- Minimize the amount of context needed to understand code
- Make dependencies explicit
- Group related functionality together

### 5. Know Your Domains
- Read domain README files to understand capabilities
- Only use domains that have documentation (README.md)
- Reuse existing concepts before creating new ones
- Link to domain capabilities rather than reimplementing

## Practical Guidelines

### Function Refactoring
- Extract complex conditions into well-named boolean functions
- Replace magic numbers/strings with named constants
- Keep functions short (follow the 50-line rule from CLAUDE.md)

### Component Refactoring
- Separate concerns: UI, logic, and data fetching
- Extract reusable patterns into custom hooks or utilities
- Use composition over complex conditional rendering

### Data Flow Clarity
- Make data transformations explicit and traceable
- Avoid hidden side effects
- Prefer immutable operations

## Examples

### Applying the Fundamental Rule

**Good Example:**
```typescript
// Name tells you WHAT: gets a color
// Arguments tell you WHAT IT NEEDS: coordinates
// Body tells you HOW: (implementation details)
getColor(coords)
```

**Needs Refactoring:**
```typescript
// This function violates the rule - it does too many things
async function StaticCreateItemForm({...}: Props) {
  // 1. Formats display strings
  // 2. Calculates colors
  // 3. Fetches hierarchy data
  // 4. Transforms data
  // 5. Renders UI
  // The name doesn't tell us it's doing all these things!
}
```

**Better Approach:**
```typescript
// Each function does one thing, clearly named
async function fetchHierarchyData(rootItemId: string) { ... }
function formatCoordinatesDisplay(coords: HexCoord): string { ... }
function buildTileData(items: MapItemAPIContract[]): Record<string, TileData> { ... }
function CreateItemForm({hierarchy, displayCoords, ...}: Props) { ... }
```

### Applying the Rule of 6 to Arguments

**Too Many Arguments:**
```typescript
// BAD: Too many arguments
function createTile(id: string, name: string, x: number, y: number, 
                   color: string, size: number, parentId: string, 
                   description: string) { ... }
```

**Good: Group into Logical Objects (max 6 keys each):**
```typescript
interface TileConfig {
  name: string;
  description: string;
  color: string;
  size: number;
}

interface TilePosition {
  id: string;
  x: number;
  y: number;
  parentId: string;
}

// Now max 2 arguments, each object has max 6 properties
function createTile(config: TileConfig, position: TilePosition) { ... }
```

**Even Better: Single Object When All Related:**
```typescript
interface CreateTileParams {
  id: string;
  name: string;
  position: { x: number; y: number };  // Nested objects count as 1 key
  appearance: { color: string; size: number };
  relationships: { parentId: string };
  metadata: { description: string };
}

// Single argument with clear structure (6 top-level keys)
function createTile(params: CreateTileParams) { ... }
```

### Applying the Hexframe Structure

**Current Structure (violates Rule of 6):**
```
create/
  create-item.tsx (269 lines, 1 giant function)
```

**Refactored Structure:**
```
create/
  # Primary file (CenterTile)
  page.tsx (main component, <50 lines)
  
  # Metadata files (inside CenterTile, max 6)
  layout.tsx (composes with page.tsx)
  types.ts (type definitions)
  validation.utils.ts (validation logic)
  
  # Child folders (child Tiles, max 6)
  _components/
    form-fields.tsx
    submit-button.tsx
  _hooks/
    use-hierarchy.ts
    use-coordinates.ts
  _utils/
    data-fetcher.ts
    formatters.ts
```

Each folder is a Frame with its own CenterTile (primary file) and supporting metadata. The structure mirrors hexframe's visual hierarchy.

### Identifying Concepts During Refactoring

Looking at `create-item.tsx`, we see opportunities to use existing concepts:
```typescript
// Line 33-34: Coordinate formatting
// CURRENT: Manual string concatenation
const coordsDisplay = `${targetCoords.userId},${targetCoords.groupId}:${targetCoords.path.join(",")}`;
const coordId = CoordSystem.createId(targetCoords);

// BETTER: Both operations use existing CoordSystem
const coordId = CoordSystem.createId(targetCoords);
const coordsDisplay = coordId; // CoordSystem.createId already formats properly!

// Line 96: Hierarchy building
// CURRENT: Using existing utility
hierarchy = _getParentHierarchy(coordId, items);
// This is already using the right domain concept!

// Lines 62-94: Data transformation
// This is a gap - no existing transformer from MapItemContract to TileData
// This might need to become a new domain concept
```

## Handling Rule of 6 Violations

When you exceed the limits:

### Too many items in a folder (>6 folders + >6 files)
- Remember: Up to 6 child folders AND up to 6 files is acceptable
- Child folders are like child Tiles
- Files are metadata belonging to the folder's CenterTile
- If exceeding either limit:
  - Group related folders into subfolders
  - Extract common files into a shared module
  - Consider if the folder is doing too much

### Too many functions in a file (>6)
- Split into multiple files by responsibility
- Prefix internal/helper functions with "_"
- Move utilities to a separate utils file

### Function too long (>50 lines)
- Extract logical blocks into separate functions
- Look for repeated patterns to abstract
- Consider if the function has multiple responsibilities

### Too many arguments (>6, ideally >3)
- Group related arguments into an object
- Ensure the object has max 6 keys
- Consider if some arguments should be configuration options
- Use clear property names that maintain the "what it needs" clarity

## Exceptions to the Rules

### The 50-Line Exception

The 50-line limit can be exceeded when:

1. **Low-level implementation details** - The deeper in the abstraction hierarchy, the more lines are acceptable
2. **Simple, sequential operations** - When the function does one clear thing with straightforward steps
3. **Creating abstraction would reduce clarity** - When extracting would create confusing indirection
4. **AI-handleable complexity** - When the entire function is simple enough for AI to understand and modify as a unit

**Example of Acceptable Longer Function:**
```typescript
// This is fine at 70+ lines because it's low-level DOM manipulation
// Each step is clear and extracting would create unnecessary abstraction
function _renderHexagonalGrid(canvas: HTMLCanvasElement, tiles: Tile[]) {
  const ctx = canvas.getContext('2d');
  // ... 70 lines of straightforward canvas drawing operations
  // Each line does one simple thing, extraction adds no value
}
```

**Key Principle**: The abstraction level determines flexibility:
- **High-level orchestration**: Strict 50-line limit (coordinates other functions)
- **Mid-level business logic**: Moderate flexibility (up to 75 lines if clear)
- **Low-level implementation**: Most flexibility (up to 100 lines if sequential)

This mirrors hexframe philosophy: Once you reach a level simple enough for AI to handle atomically, further decomposition may reduce rather than improve clarity.

## Pre-Refactoring Analysis

### Step 1: Start Refactor Session
- Create a new file in current cycle: `.workflow/cycles/[current]/refactor-<title>.md`
- Begin with identifying the code to refactor and its current state
- Document your pre-refactoring analysis as you discover concepts
- Update the file with user feedback and validation

### Step 2: Discover Existing Domain Concepts
Before creating new concepts, understand what already exists:

1. **Read domain README files** - Only consider domains with documentation
   - Check `src/lib/domains/*/README.md` files
   - If no README exists, ignore that domain during refactoring
   - READMEs explain the domain's architecture and available capabilities
   - Example: `mapping` domain README details CoordSystem in utils, MapContract types, etc.

2. **Look for existing implementations** of your needed concept:
   ```typescript
   // BAD: Creating new concept that already exists
   const coordsDisplay = CoordinateFormatter.toDisplayString(coords);
   
   // GOOD: Using existing domain concept
   const coordsDisplay = CoordSystem.createId(coords);
   ```

### Step 3: Identify gaps and new concepts
After understanding what exists:
1. **Core responsibilities** not covered by existing domains
2. **Repeated patterns** that might need names
3. **Complex concepts** currently expressed inline
4. **Domain terms** that appear but aren't defined

### Present findings to user BEFORE refactoring:
```
"I'm about to refactor create-item.tsx. 

From reading domain READMEs, I'll use these existing concepts:
- From mapping domain (has README):
  - CoordSystem (utils/hex-coordinates.ts) for coordinate operations
  - MapItemContract (types/contracts.ts) for data structures
  - mapItemDomainToContractAdapter patterns
- From app/map utilities:
  - _getParentHierarchy for hierarchy traversal

New concepts that might need definition:
1. TileDataTransformer - converts MapItemContract to TileData format
   (Gap: mapping domain has Contract→Domain adapters but not Contract→TileData)
2. HierarchyRenderer - manages visual hierarchy display logic

Should these new concepts be added to UBIQUITOUS.md?"
```

### Step 4: Document and Validate
Document your findings in the refactor session file and present to the user for validation.

### After validation, proceed with the complete refactoring independently

## Refactor Session Documentation

Each refactor session file (`.workflow/cycles/[current]/refactor-<title>.md`) should include:

### Initial Section
- **Target Code**: File(s) to be refactored and current line count
- **Refactoring Goal**: Clear statement of what needs improvement
- **Current State Analysis**: Brief description of current code structure and issues

### Pre-Refactoring Analysis
- **Existing Domain Concepts Found**: List of reusable concepts from documented domains
- **New Concepts Identified**: Potential new domain concepts that need naming
- **Structural Issues**: Rule of 6 violations, clarity problems, etc.
- **Proposed Changes**: High-level plan for the refactoring

### User Validation
- **Concepts Approved**: Which new concepts were validated for documentation
- **Documentation Location**: Which README file(s) will contain the new concepts
- **Naming Decisions**: Any specific naming choices made with user
- **Scope Adjustments**: Any changes to the refactoring scope

### Post-Refactoring Summary
- **Changes Applied**: Summary of structural and naming changes
- **Concepts Introduced**: New domain concepts added to the codebase
- **Before/After Metrics**: Line counts, function counts, clarity improvements
- **Future Considerations**: Any follow-up refactoring opportunities identified

## Refactoring Workflow

### Step 1: Pre-Refactoring Analysis
1. Create refactor session file in `.workflow/cycles/[current]/refactor-<title>.md`
2. Analyze the code to identify responsibilities and patterns
3. Document findings in the refactor session file
4. List potential domain concepts that need naming
5. Present findings to user for validation
6. Update the refactor session file with user feedback
7. Get approval on which concepts should be documented in the relevant README

### Step 2: Execute Refactoring
1. Apply all validated concepts consistently
2. Follow the Fundamental Rule and Rule of 6
3. Maintain single levels of abstraction
4. Complete the entire refactoring independently

### Step 3: Post-Refactoring Review
Ask yourself:
1. Would a new developer understand this immediately?
2. Are the intentions clear from the names alone?
3. Is there any "clever" code that could be simpler?
4. Are there any implicit assumptions that should be explicit?
5. Does the structure follow the Rule of 6?
6. Can I read function names and understand the entire flow?
7. Did I apply all validated domain concepts consistently?

## Git Workflow for Refactoring

### Branch Management
1. **Create Refactor Branch**: Based on develop or current feature branch
   ```bash
   # From develop branch (for general refactoring)
   git checkout develop
   git pull origin develop
   git checkout -b refactor/explicit-description
   
   # OR from a feature branch (if refactoring within that feature)
   git checkout feature/current-feature
   git pull origin feature/current-feature
   git checkout -b refactor/clarity-in-feature
   
   # Examples:
   # refactor/create-item-clarity
   # refactor/apply-rule-of-6-to-components
   # refactor/extract-domain-concepts
   ```

2. **Commit Strategy**: Group related changes logically
   ```bash
   # Structural changes first
   git add src/app/map/create/
   git commit -m "refactor: restructure create-item into Rule of 6 layout
   
   - Split 269-line component into 6 focused functions
   - Created _components, _hooks, and _utils folders
   - Each file now has max 6 functions"
   
   # Then concept extraction
   git add src/lib/domains/mapping/
   git commit -m "refactor: extract TileDataTransformer domain concept
   
   - Added transformer for MapItemContract to TileData
   - Reused existing CoordSystem utilities
   - Documented in mapping domain README"
   ```

### Safe Refactoring Practices
1. **Test First**: Ensure tests pass before refactoring
   ```bash
   pnpm test
   pnpm test:e2e
   git commit -m "test: add tests to cover refactoring scope"
   ```

2. **Incremental Changes**: Refactor in small, verifiable steps
   ```bash
   # Step 1: Extract without changing behavior
   git commit -m "refactor: extract coordinate formatting logic"
   
   # Step 2: Improve naming
   git commit -m "refactor: rename functions for clarity"
   
   # Step 3: Apply Rule of 6
   git commit -m "refactor: split large functions per Rule of 6"
   ```

3. **Verify No Behavior Changes**: Run tests after each commit
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

### Documentation Updates
```bash
# Update relevant README with new concepts
git add src/app/map/Canvas/README.md
git commit -m "docs: add optimistic update concepts to Canvas documentation"

# Update domain READMEs
git add src/lib/domains/mapping/README.md
git commit -m "docs: document new transformer utilities in mapping domain"
```

### Creating Pull Request
1. **Push Refactor Branch**: Push to GitHub
   ```bash
   git push origin refactor/explicit-description
   ```

2. **Create PR**: Open pull request to base branch
   ```bash
   # To develop (if refactoring from develop)
   gh pr create --base develop --title "Refactor: [Description]" \
     --body-file .workflow/cycles/[current]/refactor-title.md
   
   # To feature branch (if refactoring within feature)
   gh pr create --base feature/current-feature --title "Refactor: [Description]" \
     --body-file .workflow/cycles/[current]/refactor-title.md
   ```

3. **PR Description**: Use entire refactor document
   - Copy complete content of `.workflow/cycles/[current]/refactor-title.md`
   - This includes:
     - Pre-refactoring analysis
     - Domain concepts identified
     - User validation received
     - Changes applied
     - Metrics and improvements

### Managing Large Refactors
For refactors spanning multiple files:

1. **Feature Branch Protection**: Keep refactor isolated
   ```bash
   # Create tracking issue
   git commit --allow-empty -m "refactor: tracking issue for large refactor
   
   Scope:
   - [ ] Refactor component A
   - [ ] Refactor component B
   - [ ] Update documentation"
   ```

2. **Stacked Commits**: One commit per logical change
   ```bash
   # Use interactive rebase to organize commits
   git rebase -i origin/main
   ```

3. **Regular Rebasing**: Keep up with base branch
   ```bash
   git fetch origin
   git rebase origin/develop  # or origin/feature/current-feature
   # Resolve conflicts carefully to maintain refactor integrity
   ```