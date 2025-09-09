# ESLint Check Tool

A Python-based ESLint wrapper that provides structured analysis and reporting of linting issues with clear breakdowns by file, folder, and rule type.

## Features

- **Structured Output**: Clear breakdown of issues by directory, file, and rule
- **Multiple View Modes**: Group results by files or by rules
- **Filtering Options**: Show only errors, filter by specific rules
- **JSON Export**: Machine-readable output for CI/CD integration
- **Verbose Details**: Optional detailed file-by-file breakdown
- **Statistics**: Summary stats, top violating rules, most affected files

## Usage

### Basic Usage

```bash
# Check all source files
python3 scripts/checks/lint/main.py

# Or use npm script (when added to package.json)
pnpm check:lint
```

### Options

```bash
# Check specific directory with verbose output
python3 scripts/checks/lint/main.py --verbose src/app/map

# Show only errors (no warnings)
python3 scripts/checks/lint/main.py --errors-only

# Group results by rule instead of by file
python3 scripts/checks/lint/main.py --by-rule

# Filter to show only issues from a specific rule
python3 scripts/checks/lint/main.py --rule no-restricted-imports

# JSON output only (useful for CI/CD)
python3 scripts/checks/lint/main.py --json-only

# Custom JSON output file
python3 scripts/checks/lint/main.py --output custom-lint-report.json
```

### Command Line Options

- `path` - Path to lint (default: `src`)
- `--verbose` - Show detailed file-by-file breakdown
- `--json-only` - Output only JSON, no console output
- `--by-rule` - Group console output by rule instead of by file
- `--errors-only` - Show only errors, not warnings
- `--rule RULE_ID` - Filter results to show only issues from specific rule
- `--output FILE` - JSON output file path (default: `test-results/lint-check.json`)
- `--help, -h` - Show help message

## Sample Output

### Default Output (Grouped by Files/Directories)

```
==================================================
ESLint Check Results
==================================================

Summary:
  Total Issues: 287
  Errors: 287
  Warnings: 0
  Files Affected: 142/200

Top Rule Violations:
   1. no-restricted-imports: 245 violations (245 errors, 98 files)
   2. @typescript-eslint/no-unsafe-assignment: 42 violations (42 errors, 24 files)

Issues by Directory:
   1. src/app/map/Cache/: 87 issues (87 errors, 45 files)
   2. src/app/map/Canvas/: 32 issues (32 errors, 18 files)
   3. src/lib/domains/: 28 issues (28 errors, 15 files)

Most Affected Files:
   1. src/app/map/Cache/State/index.ts: 12 issues (12 errors)
   2. src/app/map/Cache/Handlers/navigation-handler.ts: 8 issues (8 errors)

Run with --verbose for detailed file-by-file breakdown
```

### By-Rule Output

```
==================================================
ESLint Check Results (Grouped by Rule)
==================================================

Summary:
  Total Issues: 287
  Errors: 287
  Warnings: 0
  Files Affected: 142/200
  Rules Violated: 5

📋 no-restricted-imports
   Total: 245 violations in 98 files
   Severity: 245 errors
   
📋 @typescript-eslint/no-unsafe-assignment
   Total: 42 violations in 24 files
   Severity: 42 errors

Run with --verbose to see affected files for each rule
```

### Verbose Output

Shows detailed file-by-file breakdown with issues grouped by rule within each file, including line numbers and specific error messages.

## JSON Output

The tool generates a detailed JSON report at `test-results/lint-check.json` (configurable) containing:

- Summary statistics
- Complete file-by-file results with all issue details
- Directory-level aggregated statistics
- Rule-level aggregated statistics
- Timestamp and tool metadata

### JSON Structure

```json
{
  "timestamp": "2025-01-09T10:30:00.000Z",
  "tool": "eslint",
  "summary": {
    "total_issues": 287,
    "total_errors": 287,
    "total_warnings": 0,
    "total_files": 200,
    "files_with_issues": 142
  },
  "files": [
    {
      "path": "src/app/layout.tsx",
      "issues": [
        {
          "rule": "no-restricted-imports",
          "message": "Relative imports are not allowed. Use absolute imports with '~/' prefix instead.",
          "severity": "error",
          "line": 1,
          "column": 1
        }
      ],
      "error_count": 1,
      "warning_count": 0
    }
  ],
  "directory_stats": { ... },
  "rule_stats": { ... }
}
```

## Integration

### CI/CD Integration

```bash
# In CI pipeline, use --json-only to avoid console noise
python3 scripts/checks/lint/main.py --json-only --errors-only

# Check exit code (0 = no errors, 1 = errors found)
echo $?
```

### Package.json Integration

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "check:lint": "python3 scripts/checks/lint/main.py",
    "check:lint:verbose": "python3 scripts/checks/lint/main.py --verbose",
    "check:lint:errors": "python3 scripts/checks/lint/main.py --errors-only"
  }
}
```

### Quality Check Integration

Include in your quality check suite:

```json
{
  "scripts": {
    "check:quality": "pnpm check:dead-code && pnpm check:architecture && pnpm check:rule-of-6 && pnpm check:lint"
  }
}
```

## Architecture

The tool consists of several modules:

- `runner.py` - Executes ESLint with proper environment setup
- `parser.py` - Parses ESLint JSON output into structured data models
- `models.py` - Data structures for issues, files, directories, and rules
- `reporter.py` - Formats output for console and JSON
- `main.py` - Command-line interface and orchestration

## Dependencies

- Python 3.7+
- Node.js and pnpm (for ESLint execution)
- ESLint configured in your project

## Troubleshooting

### Environment Variables

If you encounter environment validation errors, the tool automatically sets `SKIP_ENV_VALIDATION=true` when running ESLint.

### ESLint Configuration

Ensure your project has:
- `package.json` with a `lint` script
- ESLint configured (`.eslintrc.cjs`, `eslint.config.js`, etc.)
- All necessary ESLint dependencies installed

### JSON Output Issues

If JSON parsing fails, check:
- ESLint is properly configured
- No syntax errors in your configuration
- ESLint dependencies are installed