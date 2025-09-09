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
| **Directory Items** | 6 items | Error | Maximum files/folders per directory |
| **Functions per File** | 6 functions | Error | Maximum function definitions per file |
| **Function Lines** | 50 lines | Warning | Recommended maximum lines per function |
| **Function Lines** | 100 lines | Error | Hard limit for function length |
| **Function Arguments** | 3 args | Error | Maximum function parameters |
| **Object Parameters** | 6 keys | Warning | Maximum keys in object parameters |

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
      "type": "directory_items",
      "severity": "error",
      "message": "Directory 'components' has 8 items (max 6)",
      "file": "src/components",
      "recommendation": "Group related items into subdirectories...",
      "context": {
        "item_count": 8,
        "items": ["Button.tsx", "Input.tsx", "..."]
      }
    }
  ]
}
```

## AI-Friendly Analysis

The JSON report supports detailed analysis through `jq` filtering:

```bash
# Get all errors
jq '.violations[] | select(.severity == "error")' test-results/rule-of-6-check.json

# Get summary statistics
jq '.summary' test-results/rule-of-6-check.json

# Get violations by type
jq '.violations[] | select(.type == "function_lines")' test-results/rule-of-6-check.json

# Get violations by path pattern
jq '.violations[] | select(.file | contains("components"))' test-results/rule-of-6-check.json

# Count violations by type
jq -r '.violations[].type' test-results/rule-of-6-check.json | sort | uniq -c

# Get top directories with most items
jq '.violations[] | select(.type == "directory_items") | {path: .file, count: .context.item_count}' test-results/rule-of-6-check.json | sort_by(.count) | reverse

# Get functions with most lines
jq '.violations[] | select(.type == "function_lines") | {function: .context.function_name, file: .file, lines: .context.line_count}' test-results/rule-of-6-check.json | sort_by(.lines) | reverse
```

## Rules Applied

The checker enforces the following thresholds:

| Rule | Threshold | Type | Description |
|------|-----------|------|-------------|
| **directory_items** | 6 items | Error | Maximum files/folders per directory |
| **functions_per_file** | 6 functions | Error | Maximum function definitions per file |
| **function_lines_warning** | 50 lines | Warning | Recommended maximum lines per function |
| **function_lines_error** | 100 lines | Error | Hard limit for function length |
| **function_args** | 3 arguments | Error | Maximum function parameters |
| **object_keys** | 6 keys | Warning | Maximum keys in object parameters |

## Configuration

### Exception Patterns
Customize ignored patterns in `.rule-of-6-ignore`:

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