# Dead Code Checker

## Why Remove Dead Code?

Dead code increases bundle size, maintenance burden, and cognitive load. It can hide bugs, mislead developers about actual dependencies, and slow down refactoring efforts.

## How Dead Code is Identified

This script uses regex-based AST parsing to detect:

1. **Unused Exports** - Exported symbols never imported elsewhere
2. **Unused Local Symbols** - Functions/variables defined but never used 
3. **Dead Files** - Files where all exports are unused
4. **Dead Folders** - Directories where all files are dead
5. **Transitive Dead Code** - Code only used by other dead code

The checker analyzes all files in `src/` to build a complete dependency graph, then reports issues only for the target path.

## Usage

```bash
pnpm check:dead-code [path]           # Check specific path
python3 scripts/checks/deadcode/main.py --help
```

Output: Console summary + `test-results/dead-code-check.json`

## AI-Friendly Commands

```bash
# Get all issues
jq '.issues[]' test-results/dead-code-check.json

# Get by type  
jq '.issues[] | select(.type == "unused_export")' test-results/dead-code-check.json

# Get file locations
jq -r '.issues[] | "\(.file_path):\(.line_number) \(.message)"' test-results/dead-code-check.json

# Get summary stats
jq '.summary' test-results/dead-code-check.json
```

## Important: False Positives

**Always review before removing code.** Dead code detection can have false positives:
- Dynamic imports or reflection patterns
- Framework conventions (Next.js pages)
- Build-time or test-only usage
- Type definitions used only for constraints

**Best Practice:** Make dead code removal a dedicated commit to isolate changes and enable easy reversal if issues arise.

## Configuration

Create `.deadcode-ignore` to exclude patterns:
```
src/env.mjs
**/*.test.*
**/*.stories.*
```