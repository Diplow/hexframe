# TypeScript Checker Test Suite

A comprehensive test suite for the Python-based TypeScript code checkers (architecture, deadcode, ruleof6) with extensive coverage and regression testing.

## Overview

This test suite provides:
- **Comprehensive parser testing** - Tests for the shared TypeScript parser with edge cases
- **Real-world patterns** - Test fixtures based on actual Hexframe codebase patterns
- **Regression testing** - Captures known bugs and edge cases that regex parsing might miss
- **Integration testing** - Tests checkers with realistic project structures
- **Performance testing** - Ensures checkers work on large codebases

## Structure

```
tests/
├── README.md                    # This file
├── conftest.py                  # Pytest configuration and shared fixtures
├── test_runner.py               # Custom test runner with coverage
├── test_shared_parser.py        # Comprehensive TypeScript parser tests
├── test_regression.py           # Regression tests for known issues
├── fixtures/                    # Test TypeScript/JavaScript files
│   ├── basic/                   # Simple test cases
│   ├── edge_cases/              # Complex syntax patterns
│   ├── real_world/              # Patterns from Hexframe codebase
│   └── regression/              # Bug reproduction cases
└── utils/                       # Test helper utilities
    ├── __init__.py
    └── test_helpers.py          # Shared test infrastructure

architecture/tests/
└── test_architecture_checker.py # Architecture boundary tests

deadcode/tests/
└── test_deadcode_checker.py     # Dead code detection tests

ruleof6/tests/
├── test_comprehensive_ruleof6.py # Comprehensive Rule of 6 tests
└── test_typescript_parsing.py    # Original parser tests (existing)
```

## Running Tests

### Quick Test Run
```bash
# Run all tests
cd scripts/checks
python3 tests/test_runner.py

# Run specific checker tests
python3 tests/test_runner.py --checker shared
python3 tests/test_runner.py --checker architecture
python3 tests/test_runner.py --checker deadcode
python3 tests/test_runner.py --checker ruleof6
```

### With Coverage
```bash
python3 tests/test_runner.py --coverage
```

### Using pytest directly
```bash
# Install pytest first (if not available)
pip install pytest pytest-cov

# Run with pytest
python3 -m pytest tests/ -v
python3 -m pytest tests/test_shared_parser.py -v
python3 -m pytest architecture/tests/ -v
```

## Test Categories

### 1. TypeScript Parser Tests (`test_shared_parser.py`)

Tests the shared TypeScript parser that all checkers depend on:

- **Import parsing**: Named, default, namespace, type-only imports
- **Export parsing**: All export types, re-exports, barrel files
- **Symbol detection**: Functions, classes, interfaces, variables
- **Edge cases**: Comments, strings, JSX, generics, decorators
- **Performance**: Large files, complex syntax
- **Error handling**: Malformed code, Unicode

**Key regression tests**:
- Template literals with import-like syntax
- Multi-line imports with comments
- Complex generic functions
- JSX with embedded code strings

### 2. Architecture Checker Tests (`architecture/tests/`)

Tests architectural boundary enforcement:

- **Subsystem boundaries**: Cross-subsystem import violations
- **Domain isolation**: Domain boundary enforcement
- **Import patterns**: Absolute vs relative imports
- **Rule of 6**: Complexity rule violations
- **Barrel files**: Re-export pattern handling

**Real-world scenarios**:
- Hexframe-like widget structure
- Domain-driven design patterns
- Mixed violation detection

### 3. Dead Code Tests (`deadcode/tests/`)

Tests unused code detection:

- **Unused exports**: Functions, variables, types
- **Unused imports**: Imported but unused symbols
- **Transitive dead code**: Code only used by dead code
- **Cross-file tracking**: Reference chains across files
- **React patterns**: Component usage detection

**Complex scenarios**:
- Dynamic imports (challenging for regex parsing)
- Barrel file re-exports
- Complex dependency chains

### 4. Rule of 6 Tests (`ruleof6/tests/`)

Tests Rule of 6 complexity enforcement:

- **Function count**: Files with too many functions
- **Function length**: Functions that are too long
- **Argument count**: Functions with too many parameters
- **Directory structure**: Directories with too many items

**Edge cases**:
- Nested functions and closures
- React component patterns
- String literals containing function-like syntax
- Complex TypeScript syntax

### 5. Regression Tests (`test_regression.py`)

Tests for specific bugs and edge cases:

- **Template literals**: Import/export syntax in strings
- **Comments**: Avoiding parsing commented code
- **Complex syntax**: Generics, decorators, complex patterns
- **Performance**: Large files, deeply nested structures
- **Error recovery**: Malformed code handling

## Test Fixtures

### Basic Fixtures (`fixtures/basic/`)
Simple, clear examples for basic functionality testing.

### Edge Case Fixtures (`fixtures/edge_cases/`)
Complex TypeScript syntax that stresses the parser:
- Generic functions with constraints
- Decorator usage
- Complex JSX patterns
- Union and intersection types

### Real-World Fixtures (`fixtures/real_world/`)
Patterns extracted from the actual Hexframe codebase:
- Widget component structure
- Shared component patterns
- Database schema definitions

### Regression Fixtures (`fixtures/regression/`)
Specific patterns that have caused bugs:
- Template literals with code-like strings
- Multi-line imports with unusual formatting
- Comments and strings containing import/export syntax

## Test Helpers

The `utils/test_helpers.py` module provides:

- **`create_test_project()`**: Create temporary projects with file structures
- **`run_checker()`**: Run any checker with consistent interface
- **`assert_no_false_positives()`**: Ensure clean code isn't flagged
- **`assert_checker_finds_issues()`**: Verify specific issues are detected
- **`get_fixture_content()`**: Load test fixture files

## Benefits for Future TypeScript Port

This test suite provides a solid foundation for a future TypeScript port:

1. **Behavioral specification**: Tests document expected behavior clearly
2. **Regression prevention**: Comprehensive edge case coverage
3. **Performance benchmarks**: Large codebase testing
4. **Real-world validation**: Tests against actual Hexframe patterns

The tests can be used to verify that a TypeScript implementation produces the same results as the Python version, ensuring a safe migration path.

## Known Limitations

The current Python regex-based parsing has limitations that the tests document:

1. **Dynamic imports**: May not be detected correctly
2. **Complex string escaping**: Edge cases in string parsing
3. **Conditional compilation**: Preprocessor-like patterns
4. **Generated code**: Machine-generated patterns

These limitations are documented in the tests and would be resolved by moving to TypeScript's AST-based parsing.

## Contributing

When adding new tests:

1. **Use the test helpers**: Leverage the shared infrastructure
2. **Add fixtures**: Create reusable test files in appropriate categories
3. **Document bugs**: Add regression tests for any bugs found
4. **Test edge cases**: Complex syntax patterns and error conditions
5. **Performance test**: Ensure changes don't degrade performance

## Test Coverage Goals

- **90%+ code coverage** across all checkers
- **Zero false positives** on Hexframe codebase
- **Comprehensive edge case coverage** for regex parsing
- **Performance testing** for large projects (1000+ files)
- **Clear regression tests** for each known bug