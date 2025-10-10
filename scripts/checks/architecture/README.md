# Architecture Checker

The Architecture Checker enforces subsystem boundaries with clear interfaces and hierarchical independence.

## Overview

This tool validates that subsystems are properly documented, have explicit dependency declarations, and maintain encapsulation through index.ts interfaces. Subsystems serve as navigable entry points for understanding the codebase at a high level, with relative independence from each other and hierarchical relationships where child subsystems are only known within their parent.

## Usage

```bash
# Check entire src directory (default)
python3 scripts/check-architecture.py

# Check specific directory
python3 scripts/check-architecture.py src/app/map

# Show help
python3 scripts/check-architecture.py --help
```

## Architecture Rules

### 1. Complexity Requirements

**Folders over 1000 lines need (ERROR):**
- `dependencies.json` - Declares allowed imports and child subsystems
- `README.md` - Documents purpose, mental model, responsibilities, and subsystems

**Folders over 500 lines should have (WARNING):**
- `README.md` - Basic documentation

**Custom thresholds:**
- Create `.architecture-exceptions` file in project root or parent directory
- Format: `path/to/folder: 2000  # Justification required`
- Use sparingly with clear reasoning

### 2. Import Boundaries

**External files cannot import directly into subsystems:**
- ❌ `import { Foo } from '~/lib/domains/mapping/services/foo'`
- ✅ `import { Foo } from '~/lib/domains/mapping/services'` (via index.ts)

**Subsystems must expose API through index.ts:**
- Each subsystem needs `index.ts` that reexports internal modules
- External imports must go through the index, not directly to files
- Child subsystems are only known within their parent subsystem
- Enforces hierarchical encapsulation and relative independence

### 3. Domain Structure

**Domain services are restricted:**
- Services can only be imported by API/server code
- Frontend code cannot import services directly
- Services must be in `/services/` directories with proper `dependencies.json`

**Domain organization:**
- `_objects/` - Domain models and entities
- `_repositories/` - Data access interfaces  
- `services/` - Business logic (API/server only)
- `infrastructure/` - Implementation details
- `utils/` - Pure utility functions

### 4. Dependency Management

**All imports must be declared in dependencies.json:**
```json
{
  "allowed": ["~/lib/utils", "~/server/db"],
  "allowedChildren": ["react", "next/navigation"],
  "subsystems": ["./services", "./infrastructure"],
  "exceptions": {
    "~/legacy/old-system": "TEMPORARY: Remove when migration complete (Q2 2024)"
  }
}
```

**Three dependency arrays:**
- `allowed` - Dependencies specific to this subsystem (use `~/` absolute paths)
- `allowedChildren` - Dependencies that cascade to child subsystems (use sparingly for truly ubiquitous dependencies like `react`)
- `subsystems` - Declared child subsystems (relative paths like `./Cache`)

**Optional exceptions object:**
- Documents architectural violations with justification
- Use for temporary technical debt with clear resolution plan

**Path requirements:**
- Use absolute paths with `~/` prefix in `allowed` and `allowedChildren`
- Use relative paths like `./childname` only in `subsystems` array
- No `../` paths anywhere

### 5. Reexport Boundaries

**Index.ts files can only reexport:**
- Internal files within same subsystem
- Declared child subsystems
- External libraries (not other subsystems)

### 6. Naming Conflicts

**No file/folder naming conflicts:**
- Cannot have both `foo.ts` and `foo/` directory
- Move file contents to `foo/index.ts` instead

## Error Types

| Type | Description | Recommendation |
|------|-------------|----------------|
| `complexity` | Missing documentation files | Create missing files: dependencies.json, README.md |
| `import_boundary` | Direct imports bypassing index.ts | Use subsystem interface via index.ts |
| `domain_import` | Services imported by non-API code | Move import to API/server or refactor to utility |
| `domain_structure` | Invalid domain organization | Follow domain structure pattern |
| `subsystem_structure` | Missing subsystem declarations | Add child to parent's subsystems array |
| `dependency_format` | Invalid path formats | Use absolute paths with ~/ prefix |
| `redundancy` | Duplicate dependency declarations | Remove redundant entries |
| `nonexistent_dependency` | Dependency pointing to non-existent path | Remove or create missing path |
| `reexport_boundary` | Invalid reexports | Remove external reexports |
| `file_conflict` | File/folder naming conflicts | Move to directory structure |

## Quick Filters for AI Agents

The tool outputs structured JSON to `test-results/architecture-check.json` for automated processing.

### Filter by Error Type
```bash
# All import boundary violations
jq '.errors[] | select(.type == "import_boundary")' test-results/architecture-check.json

# All domain import violations  
jq '.errors[] | select(.type == "domain_import")' test-results/architecture-check.json

# All complexity issues
jq '.errors[] | select(.type == "complexity")' test-results/architecture-check.json
```

### Filter by Subsystem
```bash
# All errors in mapping domain
jq '.errors[] | select(.subsystem | contains("mapping"))' test-results/architecture-check.json

# All errors in specific subsystem
jq '.errors[] | select(.subsystem | contains("src/app/map/Canvas"))' test-results/architecture-check.json
```

### Filter by Recommendation
```bash
# All "add to allowed" recommendations
jq '.errors[] | select(.recommendation | contains("Add"))' test-results/architecture-check.json

# All "create file" recommendations
jq '.errors[] | select(.recommendation | contains("Create"))' test-results/architecture-check.json

# All "use index" recommendations  
jq '.errors[] | select(.recommendation | contains("index.ts"))' test-results/architecture-check.json
```

### Filter by Severity
```bash
# Errors only
jq '.errors[] | select(.severity == "error")' test-results/architecture-check.json

# Warnings only
jq '.errors[] | select(.severity == "warning")' test-results/architecture-check.json
```

### Summary Information
```bash
# Get summary statistics
jq '.summary' test-results/architecture-check.json

# Count errors by type
jq '.summary.by_type' test-results/architecture-check.json

# Count errors by subsystem
jq '.summary.by_subsystem' test-results/architecture-check.json

# Count by recommendation type
jq '.summary.by_recommendation' test-results/architecture-check.json
```

### Human Readable Output
```bash
# File:line format for IDE integration
jq -r '.errors[] | "\(.file // "unknown"):\(.line // 0) \(.type): \(.message | split("\n")[0])"' test-results/architecture-check.json

# Just error messages
jq -r '.errors[].message' test-results/architecture-check.json

# Recommendations only
jq -r '.errors[].recommendation' test-results/architecture-check.json | sort | uniq -c | sort -nr
```

## Integration

The architecture checker is integrated into:
- **CI/CD Pipeline:** Runs on every PR via GitHub Actions
- **Development Workflow:** Available via `pnpm check:architecture [path]`
- **Claude Commands:** Use `/plan-quality-fix` to analyze violations and `/fix-architecture` to execute fixes

**No pre-commit hooks** - violations are caught in CI and fixed with AI assistance.

For development guidance, see the main project documentation in `/CLAUDE.md`.