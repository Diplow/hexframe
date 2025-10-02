# Rule of 6 Checker Test Suite

This directory contains test cases for the Rule of 6 checker, specifically focusing on TypeScript parsing functionality to prevent regressions.

## Test Structure

### `typescript/`
Contains TypeScript test files that cover various parsing scenarios:

- **`simple-function.tsx`** - Tests basic function line counting (should trigger 50+ line warning)
- **`very-long-function.tsx`** - Tests error detection for functions over 100 lines
- **`string-with-braces.tsx`** - Tests handling of braces within strings (the original bug)
- **`react-component-with-complex-strings.tsx`** - Tests complex React component patterns
- **`multiple-functions.tsx`** - Tests file with exactly 6 functions (at the limit)
- **`too-many-functions.tsx`** - Tests file with 7 functions (should trigger error)

### `test_typescript_parsing.py`
Test runner that validates the parser correctly detects violations and integrates with the checker.

## Running Tests

```bash
cd scripts/checks/ruleof6/tests
python3 test_typescript_parsing.py
```

## Key Bugs Prevented

### Original Parser Bug
The parser previously failed to correctly detect function boundaries due to:
1. **String literal confusion**: Braces inside strings (like `'{{template}}'`) were counted as code braces
2. **Single file handling**: The checker couldn't process individual files, only directories
3. **False positives**: Function calls were detected as function declarations

### Fixed Issues
- ✅ String-aware brace counting ignores braces in strings, template literals, and comments
- ✅ Individual file processing for targeted checks
- ✅ Improved pattern matching to distinguish declarations from calls
- ✅ Multiline parameter handling for complex function signatures

## Test Coverage

| Test Case | Purpose | Expected Result |
|-----------|---------|----------------|
| `simple-function.tsx` | Basic line counting | 1 warning (>50 lines) |
| `very-long-function.tsx` | Error detection | 1 error (>100 lines) |
| `string-with-braces.tsx` | String handling | No violations |
| `react-component-with-complex-strings.tsx` | Complex syntax | No violations* |
| `multiple-functions.tsx` | Function count limit | No violations |
| `too-many-functions.tsx` | Function count violation | 1 error (>6 functions) |

*Note: The complex React component test currently passes due to parser limitations with very complex syntax, but it serves as a regression test for basic string handling.

## Adding New Tests

To add a new test case:

1. Create a `.tsx` file in the `typescript/` directory
2. Add the test case to `test_typescript_parsing.py` with expected violations
3. Run the test suite to verify behavior

## Integration with CI

This test suite ensures that modifications to the TypeScript parser don't break existing functionality. It should be run whenever:
- The parser logic changes
- New syntax patterns are added
- Bug fixes are implemented