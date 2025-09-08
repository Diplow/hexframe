# Dead Code Checker

Detects unused exports, imports, functions, and variables in TypeScript/JavaScript codebases using AST parsing for accuracy.

## Usage

### Command Line
```bash
# Check entire src directory
pnpm check:dead-code

# Check specific path
pnpm check:dead-code src/app/map

# Direct execution
python3 scripts/checks/deadcode/main.py [path]
```

### Help
```bash
python3 scripts/checks/deadcode/main.py --help
```

## Output

The checker generates two types of output:

1. **JSON Report** (`test-results/dead-code-check.json`) - Detailed machine-readable results
2. **Console Summary** - Human-readable summary with statistics and recommendations

### Console Output Example
```
🕵️  Checking for dead code in src...
⏱️  Completed in 2.34 seconds

📊 Dead Code Analysis Summary:
==================================================================
• Total errors: 5
• Total warnings: 12
• Files analyzed: 234

🔍 By issue type:
  📤 Unused Export: 8
  📥 Unused Import: 7
  💀 Unused Symbol: 2

📁 Most problematic files:
  • src/utils/helpers.ts: 3 issues
  • src/components/Button.tsx: 2 issues

🎯 Top actionable recommendations:
  • (5×) Remove unused import 'React' to clean up the file
  • (3×) Remove unused export 'formatDate' or confirm it's needed for external consumption

📋 Detailed results:
----------------------------------------------------------------------
Full report: test-results/dead-code-check.json

🤖 AI-friendly filtering commands:
  # Get all errors: jq '.issues[] | select(.severity == "error")' test-results/dead-code-check.json
  # Get all warnings: jq '.issues[] | select(.severity == "warning")' test-results/dead-code-check.json
  # Get by type: jq '.issues[] | select(.type == "unused_export")' test-results/dead-code-check.json
  # Get by file: jq '.issues[] | select(.file | contains("FILENAME"))' test-results/dead-code-check.json
  # Get summary: jq '.summary' test-results/dead-code-check.json
```

## Issue Types

### 1. Unused Export (`unused_export`)
- **Severity**: Warning
- **Description**: Exported symbols that are never imported elsewhere
- **Example**: `export const unusedHelper = () => {}`

### 2. Unused Import (`unused_import`)
- **Severity**: Warning  
- **Description**: Imported symbols that are never used in the file
- **Example**: `import { unused } from './utils'`

### 3. Unused Symbol (`unused_symbol`)
- **Severity**: Error
- **Description**: Local functions, variables, classes that are defined but never used
- **Example**: `const unusedVariable = 42`

## Configuration

### Exception Patterns
Create a `.dead-code-ignore` file in the project root to exclude files/patterns:

```
# Comment lines start with #
src/env.mjs
**/__tests__/**
**/*.test.ts
**/*.test.tsx
**/*.spec.ts
**/*.spec.tsx
**/*.stories.ts
**/*.stories.tsx
**/types.ts
**/index.ts
```

### Default Exceptions
If no `.dead-code-ignore` file exists, these patterns are excluded by default:
- Environment configuration files (`src/env.mjs`)
- Test files (`**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`)
- Storybook files (`**/*.stories.*`)
- Type definition files (`**/types.ts`)
- Index files (`**/index.ts`)

## JSON Output Format

The JSON report includes:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "target_path": "src",
  "execution_time": 2.34,
  "files_analyzed": 234,
  "summary": {
    "total_errors": 5,
    "total_warnings": 12,
    "by_type": {
      "unused_export": 8,
      "unused_import": 7,
      "unused_symbol": 2
    },
    "by_file": {
      "src/utils/helpers.ts": 3,
      "src/components/Button.tsx": 2
    },
    "by_recommendation": {
      "Remove unused import": 7,
      "Remove unused export": 5
    }
  },
  "issues": [
    {
      "type": "unused_import",
      "severity": "warning",
      "message": "Unused import 'React'",
      "file": "src/components/Button.tsx",
      "line": 1,
      "recommendation": "Remove unused import 'React' to clean up the file",
      "symbol_name": "React"
    }
  ]
}
```

## AI-Friendly Filtering

Use `jq` to filter the JSON output for specific needs:

```bash
# Get all errors only
jq '.issues[] | select(.severity == "error")' test-results/dead-code-check.json

# Get all unused exports
jq '.issues[] | select(.type == "unused_export")' test-results/dead-code-check.json

# Get issues in specific file
jq '.issues[] | select(.file | contains("Button"))' test-results/dead-code-check.json

# Get file:line format for easy navigation
jq -r '.issues[] | "\(.file):\(.line) \(.type): \(.message)"' test-results/dead-code-check.json

# Get summary statistics
jq '.summary' test-results/dead-code-check.json
```

## Integration

### CI/CD
The checker exits with:
- **Code 0**: No errors (warnings are allowed)
- **Code 1**: Errors found

### Package Scripts
```json
{
  "scripts": {
    "check:dead-code": "python3 scripts/check-dead-code.py",
    "check:quality": "pnpm check:dead-code && pnpm check:architecture"
  }
}
```

## Limitations

- Uses regex-based parsing (not full AST) for performance
- May miss complex usage patterns
- Type-only imports are treated specially (often intentionally unused)
- Some framework patterns (Next.js pages) have built-in exceptions

## Development

The checker is organized into modules:
- `models.py` - Data structures and types
- `checker.py` - Core detection logic  
- `reporter.py` - Output formatting and JSON generation
- `main.py` - CLI entry point