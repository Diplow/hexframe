# Rule of 6 Checker

A comprehensive code quality tool that enforces the **Rule of 6** architecture principle to maintain cognitive simplicity and clear code organization.

## Philosophy

The Rule of 6 is not about arbitrary limits—it's about **cognitive load management** and creating systems that humans can understand and maintain effectively.

### Why 6?
- **Human working memory** can effectively handle 5±2 items (Miller's Law)
- **6 items** allow for meaningful groupings without overwhelming complexity
- **Forces intentional design** decisions rather than accidental complexity growth

### What it Promotes ✅
- Clear hierarchical organization
- Single level of abstraction per construct
- Meaningful groupings and responsibilities
- Readable and maintainable code

### What it Prevents ❌
- Accidental complexity accumulation
- Deeply nested directory structures
- God functions and classes
- Parameter explosion

## Rules Enforced

| Rule | Threshold | Severity | Description |
|------|-----------|----------|-------------|
| **Domain Folders** | 6 folders | Error | Maximum domain folders per directory (generic excluded) |
| **Domain Files** | 6 files | Error | Maximum domain files per directory (generic excluded) |
| **Directory Items** | 6 items | Error | Maximum files/folders per directory (legacy rule) |
| **Functions per File** | 6 functions | Error | Maximum function definitions per file |
| **Function Lines** | 50 lines | Warning | Recommended maximum lines per function |
| **Function Lines** | 100 lines | Error | Hard limit for function length |
| **Function Arguments** | 3 args | Error | Maximum function parameters |
| **Object Parameters** | 6 keys | Warning | Maximum keys in object parameters |

**Note**: All thresholds can be customized using `.ruleof6-exceptions` files (see [Exception Handling](#exception-handling) below).

### Generic Infrastructure (Excluded from Domain Counting)

The new domain-aware Rule of 6 excludes common infrastructure patterns from the count, allowing you to focus on meaningful domain abstractions:

#### Generic Folders (Always Allowed):
- `docs/`, `doc/` - Documentation
- `types/` - Type definitions  
- `utils/` - Utilities
- `components/` - UI components
- `hooks/` - React hooks
- `__tests__/`, `tests/` - Testing
- `fixtures/` - Test fixtures
- `mocks/` - Mock data/functions
- `stories/` - Storybook files

#### Generic Files (Always Allowed):
- `dependencies.json` - Subsystem dependencies
- `README.md` - Documentation
- `index.ts`, `index.tsx` - Re-exports
- `page.tsx` - Next.js pages
- `layout.tsx` - Next.js layouts
- `loading.tsx` - Next.js loading components
- `error.tsx` - Next.js error boundaries
- `not-found.tsx` - Next.js 404 pages
- `*.config.js/ts` - Configuration files
- `*.stories.tsx/ts` - Storybook files
- `*.test.tsx/ts` - Test files
- `*.spec.tsx/ts` - Test files

#### Example Valid Structure:
```
src/app/map/Canvas/
├── docs/                    # ← Generic (excluded)
├── types/                   # ← Generic (excluded)
├── utils/                   # ← Generic (excluded)
├── components/              # ← Generic (excluded)
├── hooks/                   # ← Generic (excluded)
├── dependencies.json        # ← Generic (excluded)
├── README.md               # ← Generic (excluded)
├── index.ts                # ← Generic (excluded)
├── Tile/                   # ← Domain folder (1/6)
├── LifeCycle/              # ← Domain folder (2/6)
├── Interaction/            # ← Domain folder (3/6)
├── canvas.tsx              # ← Domain file (1/6)
├── frame.tsx               # ← Domain file (2/6)
└── context.tsx             # ← Domain file (3/6)
```

This structure is **valid** because:
- Domain folders: 3 (≤ 6) ✅
- Domain files: 3 (≤ 6) ✅
- Generic infrastructure is excluded from count

## Usage

### Command Line

```bash
# Check src directory (default)
python3 scripts/checks/ruleof6/cli.py

# Check specific directory
python3 scripts/checks/ruleof6/cli.py src/components

# Generate AI-friendly summary
python3 scripts/checks/ruleof6/cli.py --ai-summary

# Quiet mode (minimal output)
python3 scripts/checks/ruleof6/cli.py --quiet
```

### Package Scripts

```bash
# Via package.json (recommended)
pnpm check:ruleof6

# Check specific path
pnpm check:ruleof6 src/app
```

## Output

### Console Output
The checker provides concise console output with:
- **Summary statistics** (total errors/warnings)
- **Top 10 violations** ordered by severity and impact
- **Reference to detailed JSON report**

### JSON Report
Detailed machine-readable report saved to `test-results/rule-of-6-check.json`:

```json
{
  "timestamp": "2024-01-01T12:00:00",
  "target_path": "src",
  "execution_time": 1.23,
  "summary": {
    "total_errors": 5,
    "total_warnings": 3,
    "by_type": {
      "directory_items": 2,
      "function_lines": 3
    }
  },
  "violations": [
    {
      "type": "directory_domain_folders",
      "severity": "error",
      "message": "Directory 'components' has 8 domain folders (max 6)",
      "file": "src/components",
      "recommendation": "Group related domain folders into subdirectories...",
      "context": {
        "domain_folder_count": 8,
        "domain_file_count": 3,
        "total_items": 15,
        "domain_folders": ["Button", "Input", "Form", "..."],
        "domain_files": ["theme.ts", "constants.ts", "helpers.ts"],
        "excluded_generic_folders": ["docs", "types", "utils", "hooks"],
        "excluded_generic_files": ["README.md", "index.ts"],
        "domain_items": "Button, Input, Form, Modal, Dropdown, ...",
        "generic_items_excluded": "docs, types, utils, hooks, README.md, index.ts"
      }
    }
  ]
}
```

## AI-Friendly Analysis

The JSON report supports detailed analysis through `jq` filtering:

### Basic Filtering

```bash
# Get all errors
jq '.violations[] | select(.severity == "error")' test-results/rule-of-6-check.json

# Get summary statistics
jq '.summary' test-results/rule-of-6-check.json

# Get violations by type  
jq '.violations[] | select(.type == "function_lines")' test-results/rule-of-6-check.json
jq '.violations[] | select(.type == "directory_domain_folders")' test-results/rule-of-6-check.json
jq '.violations[] | select(.type == "directory_domain_files")' test-results/rule-of-6-check.json

# Get violations by path pattern
jq '.violations[] | select(.file | contains("components"))' test-results/rule-of-6-check.json

# Count violations by type
jq -r '.violations[].type' test-results/rule-of-6-check.json | sort | uniq -c
```

### Exception-Aware Filtering

```bash
# Get violations using custom thresholds (exceptions)
jq '.violations[] | select(.exception_source != null)' test-results/rule-of-6-check.json

# Get violations using default thresholds only
jq '.violations[] | select(.exception_source == null)' test-results/rule-of-6-check.json

# Show exception summary
jq '.rules_applied.exceptions' test-results/rule-of-6-check.json

# Compare custom vs default thresholds
jq '.violations[] | select(.custom_threshold != null) | {file: .file, function: .context.function_name, custom: .custom_threshold, default: .default_threshold}' test-results/rule-of-6-check.json
```

### Advanced Analysis

```bash
# Get top directories with most items
jq '.violations[] | select(.type == "directory_items") | {path: .file, count: .context.item_count}' test-results/rule-of-6-check.json | sort_by(.count) | reverse

# Get functions with most lines (including custom threshold info)
jq '.violations[] | select(.type == "function_lines") | {function: .context.function_name, file: .file, lines: .context.line_count, custom_threshold: .custom_threshold}' test-results/rule-of-6-check.json | sort_by(.lines) | reverse

# Find functions exceeding custom thresholds
jq '.violations[] | select(.type == "function_lines" and .custom_threshold != null) | {function: .context.function_name, file: .file, actual: .context.line_count, limit: .custom_threshold, justification: .exception_source}' test-results/rule-of-6-check.json

# Analyze domain vs generic item distribution
jq '.violations[] | select(.type == "directory_domain_folders" or .type == "directory_domain_files") | {path: .file, domain_folders: .context.domain_folder_count, domain_files: .context.domain_file_count, generic_folders: (.context.excluded_generic_folders | length), generic_files: (.context.excluded_generic_files | length), total: .context.total_items}' test-results/rule-of-6-check.json

# Find directories with high generic-to-domain ratios (might indicate over-abstraction)
jq '.violations[] | select(.type == "directory_domain_folders" or .type == "directory_domain_files") | {path: .file, domain_count: (.context.domain_folder_count + .context.domain_file_count), generic_count: ((.context.excluded_generic_folders | length) + (.context.excluded_generic_files | length)), ratio: ((((.context.excluded_generic_folders | length) + (.context.excluded_generic_files | length)) | tonumber) / ((.context.domain_folder_count + .context.domain_file_count) | tonumber))} | select(.ratio > 1)' test-results/rule-of-6-check.json
```

## Rules Applied

The checker enforces the following thresholds:

| Rule | Threshold | Type | Description |
|------|-----------|------|-------------|
| **domain_folders** | 6 folders | Error | Maximum domain folders per directory (generic excluded) |
| **domain_files** | 6 files | Error | Maximum domain files per directory (generic excluded) |
| **directory_items** | 6 items | Error | Maximum files/folders per directory (legacy rule) |
| **functions_per_file** | 6 functions | Error | Maximum function definitions per file |
| **function_lines_warning** | 50 lines | Warning | Recommended maximum lines per function |
| **function_lines_error** | 100 lines | Error | Hard limit for function length |
| **function_args** | 3 arguments | Error | Maximum function parameters |
| **object_keys** | 6 keys | Warning | Maximum keys in object parameters |

## Exception Handling

### Custom Thresholds via `.ruleof6-exceptions` Files

The Rule of 6 checker supports custom thresholds for cases where meaningful refactoring isn't possible without creating artificial abstractions. This allows you to **document complexity explicitly** rather than hide it behind poor abstractions.

#### Exception File Format

Create `.ruleof6-exceptions` files with this format:

```
# Function-specific exceptions with custom thresholds
src/math/hex-calculations.ts:calculatePoints: 150  # Mathematical algorithm
src/legacy/parser.ts:parseComplexFormat: 200     # Legacy format parser  
src/api/routes.ts:createRoute: 5                 # Framework requirement (args)

# Directory-specific exceptions  
src/components/forms: 12  # Cohesive form component library
src/utils/math: 8         # Mathematical utility collection

# Justification comments are required for good practice
# TODO: Refactor calculatePoints when we upgrade the math library
```

#### Exception Types Supported

**Function complexity exceptions** (line count):
```
<file-path>:<function-name>: <line-threshold>  # justification
```

**Directory exceptions** (item count):
```
<directory-path>: <item-threshold>  # justification
```

#### File Location Strategy

- Exception files are discovered by walking up from the target directory to the project root
- More specific (closer) exception files take precedence
- Multiple exception files can be used at different directory levels

#### Validation Requirements

The checker **validates all exception rules**:

- ✅ **Files must exist**: Exception references non-existent files will cause errors
- ✅ **Functions must exist**: Function-specific exceptions are validated against actual code
- ✅ **Directories must exist**: Directory paths are verified
- ✅ **Justification recommended**: Warnings for missing justification comments

**Example validation error**:
```
Exception validation failed:
Exception references non-existent function 'calculateHexPoints' in src/math/calculations.ts
```

#### Console Output Enhancement

Violations using custom thresholds are clearly marked:

```
📐 Rule of 6: 2 errors, 1 warnings
🎯 Loaded 5 custom thresholds from 2 files

📏 Too Many Lines in Functions
=============================
 1. ❌ Function 'calculatePoints' has 180 lines (custom limit 150) 🎯
     src/math/calculations.ts:42
     Custom threshold (150) vs default (100)
```

#### JSON Report Enhancement

Custom threshold information is included in JSON reports:

```json
{
  "violations": [
    {
      "type": "function_lines",
      "severity": "error", 
      "message": "Function exceeds custom threshold (180 lines, limit 150)",
      "file": "src/math/calculations.ts",
      "exception_source": ".ruleof6-exceptions",
      "custom_threshold": 150,
      "default_threshold": 100,
      "actual_count": 180
    }
  ],
  "rules_applied": {
    "exceptions": {
      "exception_files_loaded": [".ruleof6-exceptions"],
      "directory_exceptions": 2,
      "function_exceptions": 3,
      "total_exceptions": 5
    }
  }
}
```

#### Exception Philosophy

**Use exceptions for**:
- Mathematical algorithms that require sequential logic
- Framework-imposed patterns (e.g., route handlers with many parameters)
- Legacy code with planned refactoring timelines
- Cohesive domain collections (e.g., form components that belong together)

**Don't use exceptions for**:
- Avoiding refactoring that would improve code quality
- Creating artificial permission to write complex code
- Hiding complexity that could be meaningfully abstracted

**Principle**: Better to explicitly acknowledge complexity with clear reasoning than create meaningless abstractions that reduce code clarity.

## Configuration

### Legacy Exception Patterns (Ignored Files)
Customize completely ignored patterns in `.rule-of-6-ignore`:

```
# Test directories (often have many test files)
**/__tests__/**
**/*.test.ts
**/*.spec.ts

# Database schema (many table definitions)
src/server/db/schema/**

# Generated code
**/generated/**
```

**Note**: `.rule-of-6-ignore` completely skips files, while `.ruleof6-exceptions` allows custom thresholds with validation.

## The CRITICAL Distinction: Meaningful vs. Meaningless Abstractions

### ❌ WRONG: Meaningless Abstractions

Don't create artificial splits just to satisfy the rule:

```typescript
// BAD: Meaningless wrapper just to reduce line count
function processUserData(user: User) {
  validateUser(user);
  transformUser(user);
  saveUser(user);
}

// BAD: Artificial directory splitting
src/
  components/
    buttons/
      primary/
        PrimaryButton.tsx  // Only file in directory
```

### ✅ RIGHT: Meaningful Abstractions

Create abstractions that represent real domain concepts:

```typescript
// GOOD: Each function has clear semantic meaning
function authenticateUser(credentials: LoginCredentials): Promise<User>
function authorizeUserAction(user: User, action: Action): boolean
function auditUserActivity(user: User, activity: Activity): void

// GOOD: Logical grouping by domain concerns
src/
  components/
    auth/           # Authentication-related components
    navigation/     # Navigation components  
    forms/         # Form components
```

## Refactoring Strategies

### Directory Violations
**Problem**: Directory has too many items
**Solutions**:
1. **Group by domain**: Related functionality together
2. **Separate by layer**: UI components, business logic, utilities
3. **Extract by feature**: Feature-specific subdirectories

### Function Violations
**Problem**: Function too long or too many functions per file
**Solutions**:
1. **Extract by responsibility**: Single responsibility per function
2. **Create domain services**: Business logic extraction
3. **Use composition**: Combine smaller, focused functions

### Parameter Violations
**Problem**: Too many function arguments
**Solutions**:
1. **Group related parameters**: Create meaningful parameter objects
2. **Use configuration objects**: Options pattern for complex setup
3. **Extract to methods**: Object-oriented approach for stateful operations

## Integration

### CI/CD Integration
The checker exits with code 1 when errors are found, making it suitable for build pipelines:

```yaml
# GitHub Actions example
- name: Check Rule of 6
  run: pnpm check:ruleof6
```

### Pre-commit Hooks
Add to `.husky/pre-commit`:

```bash
#!/bin/sh
pnpm check:ruleof6
```

## Architecture

The checker follows a modular architecture:

```
scripts/checks/ruleof6/
├── __init__.py     # Package exports
├── cli.py          # Command-line interface
├── checker.py      # Main orchestration
├── models.py       # Data structures
├── scanner.py      # File/directory scanning
├── parser.py       # TypeScript parsing
├── reporter.py     # Result reporting
└── README.md       # This file
```

## Remember

> **The Rule of 6 promotes better design, not just smaller numbers.**

The goal is to create more maintainable, understandable code by forcing intentional design decisions. Don't game the system with meaningless abstractions—embrace the constraint to find better architectural solutions.