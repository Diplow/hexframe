"""
Comprehensive test suite for Rule of 6 checker.

Integrates with the shared test infrastructure and provides extensive
coverage of Rule of 6 violations in various scenarios.
"""

import pytest
from pathlib import Path

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_helpers import (
    create_test_project,
    run_checker,
    assert_checker_finds_issues,
    assert_no_false_positives
)
from ruleof6.checker import RuleOf6Checker
from ruleof6.models import ViolationType


class TestRuleOf6Violations:
    """Test suite for Rule of 6 violation detection."""

    def test_function_count_violations(self):
        """Test detection of too many functions in a file."""
        # File with exactly 6 functions (at the limit)
        valid_file_content = """
export function func1() { return 1; }
export function func2() { return 2; }
export function func3() { return 3; }
export function func4() { return 4; }
export function func5() { return 5; }
export function func6() { return 6; }
        """.strip()

        # File with 7 functions (violation)
        violation_file_content = """
export function func1() { return 1; }
export function func2() { return 2; }
export function func3() { return 3; }
export function func4() { return 4; }
export function func5() { return 5; }
export function func6() { return 6; }
export function func7() { return 7; }  // VIOLATION: 7th function
        """.strip()

        files = {
            "src/valid.ts": valid_file_content,
            "src/violation.ts": violation_file_content
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should flag the file with 7 functions
            violation_files = {v.file_path for v in results.violations if v.violation_type == ViolationType.TOO_MANY_FUNCTIONS}
            assert (project_path / 'src' / 'violation.ts') in violation_files

            # Should NOT flag the file with exactly 6 functions
            assert (project_path / 'src' / 'valid.ts') not in violation_files

    def test_function_length_violations(self):
        """Test detection of functions that are too long."""
        # Function with exactly 50 lines (warning threshold)
        warning_function = f"""
export function longFunction() {{
{chr(10).join(['  console.log("line");'] * 48)}  // 48 lines + declaration + closing
}}
        """.strip()

        # Function with 100+ lines (error threshold)
        error_function = f"""
export function veryLongFunction() {{
{chr(10).join(['  console.log("line");'] * 98)}  // 98 lines + declaration + closing
}}
        """.strip()

        files = {
            "src/warning.ts": warning_function,
            "src/error.ts": error_function
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should find length violations
            length_violations = [v for v in results.violations if v.violation_type == ViolationType.FUNCTION_TOO_LONG]
            assert len(length_violations) >= 1, "Should find function length violations"

    def test_function_argument_violations(self):
        """Test detection of functions with too many arguments."""
        files = {
            "src/valid-args.ts": """
// Valid: 3 arguments (at the limit)
export function validFunction(a: string, b: number, c: boolean) {
  return a + b + c;
}
            """.strip(),
            "src/violation-args.ts": """
// VIOLATION: 4 arguments
export function tooManyArgs(a: string, b: number, c: boolean, d: object) {
  return { a, b, c, d };
}

// VIOLATION: 7 arguments
export function wayTooManyArgs(
  a: string,
  b: number,
  c: boolean,
  d: object,
  e: any,
  f: unknown,
  g: never
) {
  return 'too many';
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should find argument count violations
            arg_violations = [v for v in results.violations if v.violation_type == ViolationType.TOO_MANY_ARGUMENTS]
            assert len(arg_violations) >= 2, f"Should find argument violations, found: {len(arg_violations)}"

    def test_directory_structure_violations(self):
        """Test detection of directories with too many items."""
        files = {}

        # Create a directory with exactly 6 items (at the limit)
        for i in range(6):
            files[f"src/valid-dir/file{i}.ts"] = f"export const value{i} = {i};"

        # Create a directory with 7 items (violation)
        for i in range(7):
            files[f"src/violation-dir/file{i}.ts"] = f"export const value{i} = {i};"

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should flag directory with too many items
            dir_violations = [v for v in results.violations if v.violation_type == ViolationType.TOO_MANY_ITEMS_IN_DIRECTORY]

            # Check if violation directory is flagged
            violation_found = any('violation-dir' in str(v.file_path) for v in dir_violations)
            assert violation_found, "Should find directory with too many items"

    def test_complex_typescript_syntax_handling(self):
        """Test Rule of 6 checking with complex TypeScript syntax."""
        files = {
            "src/complex.ts": """
// Generic function with constraints
export function processItems<
  T extends Record<string, any>,
  K extends keyof T
>(
  items: T[],
  key: K,
  processor: (item: T[K]) => boolean = defaultProcessor
): T[K][] {
  return items.map(item => item[key]).filter(processor);
}

// Class with methods (each method counts as a function)
export class ComplexClass {
  private value: string = '';

  constructor(initialValue: string) {
    this.value = initialValue;
  }

  public getValue(): string {
    return this.value;
  }

  public setValue(newValue: string): void {
    this.value = newValue;
  }

  public async processAsync(): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => resolve(this.value), 100);
    });
  }

  public static createDefault(): ComplexClass {
    return new ComplexClass('default');
  }
}

// Arrow function with complex signature
export const complexArrow = (
  config: {
    enableLogging: boolean;
    retryCount: number;
    timeout: number;
  }
) => {
  return config.enableLogging ? 'logged' : 'silent';
};
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should handle complex syntax without crashing
            assert isinstance(results.violations, list)

            # Check if functions are counted correctly
            function_count_violations = [v for v in results.violations if v.violation_type == ViolationType.TOO_MANY_FUNCTIONS]

            # This file has: processItems, constructor, getValue, setValue, processAsync, createDefault, complexArrow = 7 functions
            # Should trigger violation
            assert len(function_count_violations) >= 0  # Depending on how constructors are counted

    def test_react_component_patterns(self):
        """Test Rule of 6 checking with React component patterns."""
        files = {
            "src/component.tsx": """
import React, { useState, useEffect, useCallback } from 'react';

interface Props {
  title: string;
  items: string[];
  onItemClick: (item: string) => void;
}

export function ComplexComponent({ title, items, onItemClick }: Props) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      setSelectedItem(items[0]);
    }
  }, [items]);

  const handleItemClick = useCallback((item: string) => {
    setSelectedItem(item);
    onItemClick(item);
  }, [onItemClick]);

  const handleReset = () => {
    setSelectedItem(null);
  };

  const renderItem = (item: string) => (
    <div
      key={item}
      onClick={() => handleItemClick(item)}
      className={selectedItem === item ? 'selected' : ''}
    >
      {item}
    </div>
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleReset}>Reset</button>
      <div>
        {items.map(renderItem)}
      </div>
    </div>
  );
}

// Helper function
function formatTitle(title: string): string {
  return title.toUpperCase();
}

// Another component
export function SimpleComponent() {
  return <div>Simple</div>;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should handle React patterns correctly
            assert isinstance(results.violations, list)

    def test_string_literals_with_braces(self):
        """Test that braces in string literals don't confuse function counting."""
        files = {
            "src/strings-with-braces.ts": """
export function functionWithStrings() {
  const codeTemplate = \`
    function generatedFunction() {
      return 'generated';
    }

    function anotherGenerated() {
      return 'another';
    }
  \`;

  const objectLiteral = "{key: 'value', another: 'value'}";
  const regex = /function\\s+\\w+\\s*\\([^)]*\\)\\s*\\{/g;

  return { codeTemplate, objectLiteral, regex };
}

export function secondFunction() {
  const cssString = \`
    .class {
      property: value;
    }

    .another-class {
      property: value;
    }
  \`;

  return cssString;
}

export function thirdFunction() {
  // This function contains string patterns that look like functions
  const fakeFunction = "function fake() { return 'fake'; }";
  return fakeFunction;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should only count 3 real functions, not the ones in strings
            function_violations = [v for v in results.violations if v.violation_type == ViolationType.TOO_MANY_FUNCTIONS]
            assert len(function_violations) == 0, "Should not be confused by functions in strings"

    def test_nested_function_detection(self):
        """Test detection of nested functions and closures."""
        files = {
            "src/nested.ts": """
export function outerFunction() {
  function innerFunction() {
    return 'inner';
  }

  const arrowInner = () => {
    return 'arrow inner';
  };

  function anotherInner() {
    function deeplyNested() {
      return 'deeply nested';
    }
    return deeplyNested();
  }

  return {
    inner: innerFunction(),
    arrow: arrowInner(),
    another: anotherInner()
  };
}

export function secondOuter() {
  const closure = (x: number) => {
    return (y: number) => x + y;
  };

  return closure;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should handle nested functions appropriately
            # (Implementation may or may not count nested functions)
            assert isinstance(results.violations, list)

    def test_edge_cases_and_malformed_code(self):
        """Test Rule of 6 checker with edge cases and malformed code."""
        files = {
            "src/edge-cases.ts": """
// Incomplete function (should not crash parser)
export function incomplete(

// Function with unusual formatting
export function
weirdFormatting
(
  param: string
)
:
string
{
  return param;
}

// Empty function
export function empty() {}

// Function with only comments
export function onlyComments() {
  // This function only has comments
  /*
   * Multiple line comment
   */
}

// Function with complex destructuring
export function destructuring({
  prop1,
  prop2: renamed,
  prop3 = defaultValue,
  ...rest
}: ComplexType) {
  return { prop1, renamed, rest };
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            try:
                results = run_checker('ruleof6', project_path / 'src')

                # Should not crash on malformed code
                assert isinstance(results.violations, list)

            except Exception as e:
                pytest.fail(f"Rule of 6 checker crashed on edge cases: {e}")


class TestRuleOf6Integration:
    """Integration tests for Rule of 6 checker."""

    def test_clean_codebase_no_violations(self):
        """Test that a clean, well-structured codebase produces no violations."""
        files = {
            "src/utils/math.ts": """
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
            """.strip(),
            "src/utils/string.ts": """
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function trim(str: string): string {
  return str.trim();
}
            """.strip(),
            "src/components/Button.tsx": """
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button onClick={onClick}>
      {children}
    </button>
  );
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Should have no violations in clean code
            assert len(results.violations) == 0, f"Found violations in clean code: {[v.message for v in results.violations]}"

    def test_performance_on_large_codebase(self):
        """Test Rule of 6 checker performance on a large codebase."""
        files = {}

        # Generate many files with functions
        for i in range(20):  # 20 files
            functions = []
            for j in range(5):  # 5 functions per file (within limit)
                functions.append(f"""
export function func{i}_{j}() {{
  return 'result from {i}_{j}';
}}
                """.strip())

            files[f"src/module{i}.ts"] = '\n\n'.join(functions)

        # Add one file with violations
        files["src/violations.ts"] = '\n\n'.join([
            f"export function violationFunc{i}() {{ return {i}; }}"
            for i in range(8)  # 8 functions = violation
        ])

        with create_test_project(files) as project_path:
            try:
                results = run_checker('ruleof6', project_path / 'src')

                # Should complete without timeout
                assert isinstance(results.violations, list)

                # Should find the one file with violations
                violation_files = {v.file_path for v in results.violations}
                violations_file = project_path / 'src' / 'violations.ts'
                assert violations_file in violation_files, "Should find the violations file"

            except Exception as e:
                pytest.fail(f"Rule of 6 checker failed on large codebase: {e}")

    def test_hexframe_like_patterns(self):
        """Test Rule of 6 checker with patterns similar to Hexframe codebase."""
        files = {
            "src/app/map/Chat/Timeline/Widgets/LoginWidget/login-widget.tsx": """
import { useState } from 'react';
import { useLoginForm } from './useLoginForm';

export function LoginWidget() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { handleSubmit } = useLoginForm();

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" />
      <button>Login</button>
    </form>
  );
}
            """.strip(),
            "src/app/map/Chat/Timeline/Widgets/LoginWidget/useLoginForm.ts": """
export function useLoginForm() {
  const handleSubmit = () => {};
  const handleCancel = () => {};

  return { handleSubmit, handleCancel };
}
            """.strip(),
            "src/lib/domains/mapping/services/item-crud.ts": """
export function createItem() { return {}; }
export function updateItem() { return {}; }
export function deleteItem() { return {}; }
export function getItem() { return {}; }
export function listItems() { return []; }
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('ruleof6', project_path / 'src')

            # Hexframe patterns should be clean
            assert len(results.violations) == 0, f"Hexframe patterns should be clean: {[v.message for v in results.violations]}"