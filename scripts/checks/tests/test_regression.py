"""
Regression tests for known bugs and edge cases in TypeScript parsing.

These tests capture specific patterns that have caused issues in the past
or are likely to cause problems due to regex-based parsing limitations.
"""

import pytest
from pathlib import Path

from utils.test_helpers import get_fixture_content, run_checker
from shared.typescript_parser import TypeScriptParser


class TestParsingRegressions:
    """Test suite for parsing regression cases."""

    def setup_method(self):
        """Set up parser instance for each test."""
        self.parser = TypeScriptParser()

    def test_template_literal_imports_not_detected(self):
        """
        Regression test: Template literals containing import-like syntax
        should not be detected as real imports.
        """
        content = get_fixture_content("template_literal_import", "regression")
        imports = self.parser.extract_imports(content, Path("test.ts"))

        # Should only find the real import, not the ones in template literals
        real_imports = [imp for imp in imports if imp.name == 'realFunction']
        assert len(real_imports) == 1

        # Should NOT find fake imports from template literals
        fake_imports = [imp for imp in imports if 'fake' in imp.name.lower()]
        assert len(fake_imports) == 0, f"Found fake imports in templates: {fake_imports}"

    def test_comments_and_strings_ignored(self):
        """
        Regression test: Imports and exports in comments and strings
        should not be detected.
        """
        content = get_fixture_content("comment_and_string_confusion", "regression")
        imports = self.parser.extract_imports(content, Path("test.ts"))
        exports = self.parser.extract_exports(content, Path("test.ts"))

        # Should only find real imports
        real_imports = [imp for imp in imports if imp.name == 'realUtil']
        assert len(real_imports) == 1

        # Should NOT find commented imports
        fake_imports = [imp for imp in imports if 'fake' in imp.name.lower()]
        assert len(fake_imports) == 0, f"Found imports in comments/strings: {fake_imports}"

        # Should only find real exports
        real_exports = [exp for exp in exports if exp.name == 'realValue']
        assert len(real_exports) == 1

        # Should NOT find commented exports
        fake_exports = [exp for exp in exports if 'fake' in exp.name.lower() or 'commented' in exp.name.lower()]
        assert len(fake_exports) == 0, f"Found exports in comments/strings: {fake_exports}"

    def test_complex_multiline_imports(self):
        """
        Regression test: Complex multi-line imports with comments
        and unusual formatting should be parsed correctly.
        """
        content = get_fixture_content("complex_multiline_imports", "regression")
        imports = self.parser.extract_imports(content, Path("test.ts"))

        # Should find all the real imports
        import_names = {imp.name for imp in imports}

        # Check for key imports from the fixture
        expected_imports = {
            'Component', 'useState', 'useEffect', 'useCallback',
            'Button', 'Input', 'Select',
            'helper', 'utility',
            'verylongfunctionname'  # From the extremely long import
        }

        missing_imports = expected_imports - import_names
        assert len(missing_imports) == 0, f"Missing imports: {missing_imports}"

        # Check type imports are correctly identified
        type_imports = {imp.name for imp in imports if imp.import_type == 'type'}
        expected_type_imports = {'ComponentProps', 'ReactNode', 'ButtonProps', 'HelperType'}

        missing_type_imports = expected_type_imports - type_imports
        assert len(missing_type_imports) == 0, f"Missing type imports: {missing_type_imports}"

    def test_export_edge_cases(self):
        """
        Regression test: Complex export patterns including re-exports,
        conditional exports, and unusual syntax.
        """
        content = get_fixture_content("export_edge_cases", "regression")
        exports = self.parser.extract_exports(content, Path("test.ts"))

        export_names = {exp.name for exp in exports}

        # Should find various export types
        expected_exports = {
            'config', 'handlers', 'complexArrow', 'genericFunction',
            'ComplexClass', 'a', 'b', 'c'
        }

        found_exports = expected_exports & export_names
        assert len(found_exports) >= 3, f"Expected more exports, found: {export_names}"

        # Should find re-exports
        reexports = [exp for exp in exports if exp.is_reexport]
        assert len(reexports) > 0, "Should find re-export patterns"

    def test_jsx_with_embedded_syntax(self):
        """
        Regression test: JSX containing string literals with import/export
        syntax should not confuse the parser.
        """
        content = """
import React from 'react';

export function CodeDisplay() {
  const exampleCode = "import { Component } from 'react';";

  return (
    <div>
      <pre>{`
        import { useState } from 'react';
        export default App;
      `}</pre>
      <code>export const value = 'test';</code>
    </div>
  );
}
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.tsx"))
        exports = self.parser.extract_exports(content, Path("test.tsx"))

        # Should only find the real import
        assert len(imports) == 1
        assert imports[0].name == 'React'

        # Should only find the real export
        real_exports = [exp for exp in exports if exp.name == 'CodeDisplay']
        assert len(real_exports) == 1

    def test_malformed_import_statements(self):
        """
        Regression test: Parser should handle malformed import statements
        gracefully without crashing.
        """
        malformed_content = """
        // Incomplete imports
        import { incomplete
        import from 'nowhere';
        import { } from;
        import 'missing-semicolon'

        // Valid import for comparison
        import { valid } from './valid';

        // Broken exports
        export {
        export const broken =
        export function incomplete(

        // Valid export for comparison
        export const working = 'value';
        """.strip()

        # Should not crash
        try:
            imports = self.parser.extract_imports(malformed_content, Path("test.ts"))
            exports = self.parser.extract_exports(malformed_content, Path("test.ts"))

            # Should find at least the valid ones
            valid_imports = [imp for imp in imports if imp.name == 'valid']
            assert len(valid_imports) == 1

            valid_exports = [exp for exp in exports if exp.name == 'working']
            assert len(valid_exports) == 1

        except Exception as e:
            pytest.fail(f"Parser crashed on malformed input: {e}")

    def test_nested_braces_in_imports(self):
        """
        Regression test: Nested braces in imports (like object destructuring)
        should be handled correctly.
        """
        content = """
import {
  Config,
  type { NestedType, AnotherNested },
  utility
} from './module';

import {
  helper,
  type ComplexType<T extends { nested: { deep: string } }>
} from './complex';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))

        import_names = {imp.name for imp in imports}
        expected_names = {'Config', 'NestedType', 'AnotherNested', 'utility', 'helper', 'ComplexType'}

        # Should handle nested braces and find all imports
        found_count = len(expected_names & import_names)
        assert found_count >= 4, f"Expected to find more imports with nested braces, found: {import_names}"

    def test_function_detection_edge_cases(self):
        """
        Regression test: Function detection should handle edge cases
        like methods, arrow functions, and complex signatures.
        """
        content = """
// Regular function
function regularFunc() {}

// Arrow function assigned to const
const arrowFunc = () => {};

// Method in object
const obj = {
  method() {},
  arrowMethod: () => {},
  ['computed' + 'Name']() {}
};

// Class methods
class MyClass {
  method() {}
  static staticMethod() {}
  async asyncMethod() {}
  private privateMethod() {}
  get getter() { return ''; }
  set setter(value: string) {}
}

// Complex function signatures
function complexFunc<T extends Base>(
  param1: string,
  param2: T,
  param3: (x: T) => boolean = defaultProcessor
): Promise<T[]> {
  return Promise.resolve([]);
}

// Function in string (should NOT be detected)
const codeString = "function fakeFunc() {}";

// Function in comment (should NOT be detected)
// function commentedFunc() {}
        """.strip()

        functions = self.parser.extract_functions(content, Path("test.ts"))
        function_names = {func.name for func in functions}

        # Should find real functions
        expected_functions = {
            'regularFunc', 'arrowFunc', 'method', 'arrowMethod',
            'staticMethod', 'asyncMethod', 'privateMethod',
            'complexFunc'
        }

        found_functions = expected_functions & function_names
        assert len(found_functions) >= 5, f"Expected more functions, found: {function_names}"

        # Should NOT find functions in strings or comments
        fake_functions = {'fakeFunc', 'commentedFunc'}
        found_fake = fake_functions & function_names
        assert len(found_fake) == 0, f"Found fake functions: {found_fake}"


class TestErrorRecovery:
    """Test parser error recovery and resilience."""

    def setup_method(self):
        """Set up parser instance for each test."""
        self.parser = TypeScriptParser()

    def test_parser_handles_large_files(self):
        """
        Regression test: Parser should handle large files without
        excessive memory usage or timeouts.
        """
        # Generate a large file
        lines = []
        for i in range(500):  # 500 imports/exports
            lines.append(f"import {{ item{i} }} from './module{i}';")
            lines.append(f"export const value{i} = {i};")
            lines.append(f"function func{i}() {{ return {i}; }}")
            lines.append("")  # Add spacing

        large_content = '\n'.join(lines)

        try:
            imports = self.parser.extract_imports(large_content, Path("large.ts"))
            exports = self.parser.extract_exports(large_content, Path("large.ts"))
            functions = self.parser.extract_functions(large_content, Path("large.ts"))

            # Should process all items
            assert len(imports) == 500
            assert len(exports) == 500
            assert len(functions) == 500

        except Exception as e:
            pytest.fail(f"Parser failed on large file: {e}")

    def test_unicode_and_special_characters(self):
        """
        Regression test: Parser should handle Unicode characters
        and special symbols in identifiers.
        """
        content = """
import { café, naïve, 测试 } from './unicode';
export const émoji = '🚀';
export function validUnicode测试() {
  return 'unicode function';
}

// Edge case: Unicode in strings should not break parsing
const message = '导入 { test } from "test";';
        """.strip()

        try:
            imports = self.parser.extract_imports(content, Path("test.ts"))
            exports = self.parser.extract_exports(content, Path("test.ts"))
            functions = self.parser.extract_functions(content, Path("test.ts"))

            # Should handle Unicode gracefully
            assert len(imports) >= 1
            assert len(exports) >= 1
            assert len(functions) >= 1

        except Exception as e:
            pytest.fail(f"Parser failed on Unicode content: {e}")

    def test_deeply_nested_structures(self):
        """
        Regression test: Parser should handle deeply nested code structures
        without stack overflow or infinite loops.
        """
        # Create deeply nested object/function structure
        nested_content = "export const deeply = {\n"
        for i in range(20):  # 20 levels of nesting
            nested_content += "  " * i + f"level{i}: {{\n"
        for i in range(19, -1, -1):
            nested_content += "  " * i + "},\n"
        nested_content += "};"

        try:
            exports = self.parser.extract_exports(nested_content, Path("test.ts"))
            assert len(exports) >= 1

        except Exception as e:
            pytest.fail(f"Parser failed on deeply nested structure: {e}")