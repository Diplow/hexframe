"""
Comprehensive tests for the shared TypeScript parser.

Tests all parsing functionality including imports, exports, symbols,
and functions with various TypeScript/JavaScript syntax patterns.
"""

import pytest
from pathlib import Path
from typing import List, Dict

from utils.test_helpers import create_test_project, run_checker
from shared.typescript_parser import TypeScriptParser, Import, Export, Symbol, FunctionInfo


class TestTypeScriptParser:
    """Test suite for TypeScriptParser functionality."""

    def setup_method(self):
        """Set up parser instance for each test."""
        self.parser = TypeScriptParser()

    def test_simple_named_imports(self):
        """Test parsing of simple named imports."""
        content = """
import { foo, bar } from './utils';
import { baz } from './types';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))

        assert len(imports) == 3
        assert imports[0].name == 'foo'
        assert imports[0].from_path == './utils'
        assert imports[0].import_type == 'named'
        assert imports[1].name == 'bar'
        assert imports[2].name == 'baz'
        assert imports[2].from_path == './types'

    def test_default_imports(self):
        """Test parsing of default imports."""
        content = """
import React from 'react';
import Component from './Component';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))

        assert len(imports) == 2
        assert imports[0].name == 'React'
        assert imports[0].from_path == 'react'
        assert imports[0].import_type == 'default'

    def test_namespace_imports(self):
        """Test parsing of namespace imports."""
        content = """
import * as React from 'react';
import * as utils from './utils';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))

        assert len(imports) == 2
        assert imports[0].name == 'React'
        assert imports[0].import_type == 'namespace'
        assert imports[1].name == 'utils'

    def test_type_only_imports(self):
        """Test parsing of type-only imports."""
        content = """
import type { User, Status } from './types';
import { type Config, helper } from './utils';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))

        assert len(imports) == 3
        assert imports[0].name == 'User'
        assert imports[0].import_type == 'type'
        assert imports[1].name == 'Status'
        assert imports[1].import_type == 'type'
        assert imports[2].name == 'Config'
        assert imports[2].import_type == 'type'

    def test_aliased_imports(self):
        """Test parsing of imports with aliases."""
        content = """
import { foo as bar, baz } from './utils';
import { originalName as newName } from './types';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))

        assert len(imports) == 3
        assert imports[0].name == 'bar'
        assert imports[0].original_name == 'foo'
        assert imports[1].name == 'baz'
        assert imports[1].original_name is None
        assert imports[2].name == 'newName'
        assert imports[2].original_name == 'originalName'

    def test_multiline_imports(self):
        """Test parsing of multi-line import statements."""
        content = """
import {
    Component,
    useState,
    useEffect,
    type ComponentProps
} from 'react';

import {
    Button,
    Input,
    type ButtonProps
} from '~/components/ui';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))

        assert len(imports) == 6
        names = [imp.name for imp in imports]
        assert 'Component' in names
        assert 'useState' in names
        assert 'useEffect' in names
        assert 'ComponentProps' in names
        assert 'Button' in names
        assert 'Input' in names

        # Check type imports are correctly identified
        type_imports = [imp for imp in imports if imp.import_type == 'type']
        assert len(type_imports) == 2
        assert 'ComponentProps' in [imp.name for imp in type_imports]
        assert 'ButtonProps' in [imp.name for imp in type_imports]

    def test_simple_named_exports(self):
        """Test parsing of simple named exports."""
        content = """
export const VERSION = '1.0.0';
export function helper() {}
export class MyClass {}
export interface User {}
export type Status = 'active' | 'inactive';
        """.strip()

        exports = self.parser.extract_exports(content, Path("test.ts"))

        assert len(exports) == 5
        export_names = [exp.name for exp in exports]
        assert 'VERSION' in export_names
        assert 'helper' in export_names
        assert 'MyClass' in export_names
        assert 'User' in export_names
        assert 'Status' in export_names

        # Check export types
        version_export = next(exp for exp in exports if exp.name == 'VERSION')
        assert version_export.export_type == 'const'

        helper_export = next(exp for exp in exports if exp.name == 'helper')
        assert helper_export.export_type == 'function'

    def test_default_exports(self):
        """Test parsing of default exports."""
        content = """
export default function Component() {}

const helper = () => {};
export default helper;

export default class MyClass {}
        """.strip()

        exports = self.parser.extract_exports(content, Path("test.ts"))

        default_exports = [exp for exp in exports if exp.export_type == 'default']
        assert len(default_exports) >= 1  # At least one default export should be found

    def test_reexports(self):
        """Test parsing of re-exports."""
        content = """
export { foo, bar } from './utils';
export { default as Component } from './Component';
export * from './types';
export * as helpers from './helpers';
        """.strip()

        exports = self.parser.extract_exports(content, Path("test.ts"))

        reexports = [exp for exp in exports if exp.is_reexport]
        assert len(reexports) >= 2  # Should find reexports

        # Check specific reexport patterns
        named_reexports = [exp for exp in reexports if exp.name in ['foo', 'bar']]
        assert len(named_reexports) >= 1

    def test_function_detection(self):
        """Test detection of function declarations."""
        content = """
function regularFunction() {
    return 'hello';
}

export function exportedFunction(param: string): string {
    return param.toUpperCase();
}

const arrowFunction = () => {
    console.log('arrow');
};

export const exportedArrow = (x: number) => x * 2;

class MyClass {
    method() {
        return 'method';
    }

    static staticMethod() {
        return 'static';
    }
}
        """.strip()

        functions = self.parser.extract_functions(content, Path("test.ts"))

        function_names = [func.name for func in functions]
        assert 'regularFunction' in function_names
        assert 'exportedFunction' in function_names
        assert 'arrowFunction' in function_names
        assert 'exportedArrow' in function_names
        assert 'method' in function_names
        assert 'staticMethod' in function_names

    def test_function_argument_counting(self):
        """Test counting of function arguments for Rule of 6."""
        content = """
function noArgs() {}
function oneArg(a: string) {}
function twoArgs(a: string, b: number) {}
function threeArgs(a: string, b: number, c: boolean) {}
function manyArgs(a: string, b: number, c: boolean, d: object, e: any, f: unknown) {}

const arrowNoArgs = () => {};
const arrowOneArg = (x: number) => x;
const arrowManyArgs = (a: string, b: number, c: boolean, d: object) => {};
        """.strip()

        functions = self.parser.extract_functions(content, Path("test.ts"))

        # Check argument counts
        no_args = next(func for func in functions if func.name == 'noArgs')
        assert no_args.arg_count == 0

        one_arg = next(func for func in functions if func.name == 'oneArg')
        assert one_arg.arg_count == 1

        many_args = next(func for func in functions if func.name == 'manyArgs')
        assert many_args.arg_count == 6

    def test_symbol_detection(self):
        """Test detection of various symbol types."""
        content = """
const constant = 'value';
let variable = 42;
var oldStyle = true;

function myFunction() {}
class MyClass {}
interface MyInterface {}
type MyType = string;

enum MyEnum {
    VALUE1,
    VALUE2
}
        """.strip()

        symbols = self.parser.extract_symbols(content, Path("test.ts"))

        symbol_names = [sym.name for sym in symbols]
        assert 'constant' in symbol_names
        assert 'variable' in symbol_names
        assert 'oldStyle' in symbol_names
        assert 'myFunction' in symbol_names
        assert 'MyClass' in symbol_names
        assert 'MyInterface' in symbol_names
        assert 'MyType' in symbol_names

    def test_complex_typescript_syntax(self, edge_case_typescript):
        """Test parsing of complex TypeScript syntax."""
        content = edge_case_typescript

        # Test that parser doesn't crash on complex syntax
        imports = self.parser.extract_imports(content, Path("test.ts"))
        exports = self.parser.extract_exports(content, Path("test.ts"))
        functions = self.parser.extract_functions(content, Path("test.ts"))
        symbols = self.parser.extract_symbols(content, Path("test.ts"))

        # Should find exports even in complex code
        export_names = [exp.name for exp in exports]
        assert 'process' in export_names
        assert 'config' in export_names
        assert 'TestComponent' in export_names
        assert 'complexFunction' in export_names

    def test_jsx_syntax(self):
        """Test parsing of JSX syntax patterns."""
        content = """
import React from 'react';

export function Component({ title, children }: ComponentProps) {
    return (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    );
}

export const Button = ({ onClick, label }: ButtonProps) => (
    <button onClick={onClick}>
        {label}
    </button>
);
        """.strip()

        functions = self.parser.extract_functions(content, Path("test.tsx"))
        exports = self.parser.extract_exports(content, Path("test.tsx"))

        function_names = [func.name for func in functions]
        assert 'Component' in function_names
        assert 'Button' in function_names

        export_names = [exp.name for exp in exports]
        assert 'Component' in export_names
        assert 'Button' in export_names

    def test_line_number_tracking(self):
        """Test that line numbers are correctly tracked."""
        content = """line 1
import { foo } from './utils';
line 3
export const bar = 'value';
line 5
function helper() {
    // function body
    return 'result';
}
line 10""".strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))
        exports = self.parser.extract_exports(content, Path("test.ts"))
        functions = self.parser.extract_functions(content, Path("test.ts"))

        # Check line numbers
        assert imports[0].line_number == 2
        assert exports[0].line_number == 4
        assert functions[0].line_start == 6

    def test_comments_and_strings(self):
        """Test that parser handles comments and strings correctly."""
        content = """
// This is a comment with import keyword
/* Block comment with export keyword */

const codeInString = "import { fake } from 'fake'";
const templateLiteral = \`export const fake = 'fake'\`;

// Real import
import { real } from './real';

/* Real export */
export const realValue = 'real';
        """.strip()

        imports = self.parser.extract_imports(content, Path("test.ts"))
        exports = self.parser.extract_exports(content, Path("test.ts"))

        # Should only find real imports/exports, not ones in comments or strings
        assert len(imports) == 1
        assert imports[0].name == 'real'

        assert len(exports) == 1
        assert exports[0].name == 'realValue'

    def test_parser_error_handling(self):
        """Test that parser handles malformed code gracefully."""
        malformed_content = """
        import { incomplete
        export const broken =
        function malformed(
        """.strip()

        # Parser should not crash on malformed code
        try:
            imports = self.parser.extract_imports(malformed_content, Path("test.ts"))
            exports = self.parser.extract_exports(malformed_content, Path("test.ts"))
            functions = self.parser.extract_functions(malformed_content, Path("test.ts"))
            symbols = self.parser.extract_symbols(malformed_content, Path("test.ts"))

            # Results may be empty or partial, but shouldn't crash
            assert isinstance(imports, list)
            assert isinstance(exports, list)
            assert isinstance(functions, list)
            assert isinstance(symbols, list)

        except Exception as e:
            pytest.fail(f"Parser crashed on malformed code: {e}")

    def test_large_file_performance(self):
        """Test parser performance on large files."""
        # Generate a large file with many imports/exports
        lines = []
        for i in range(1000):
            lines.append(f"import {{ item{i} }} from './module{i}';")
            lines.append(f"export const value{i} = {i};")
            lines.append(f"function func{i}() {{ return {i}; }}")

        large_content = '\n'.join(lines)

        # Test that parser can handle large files without excessive memory usage
        try:
            imports = self.parser.extract_imports(large_content, Path("large.ts"))
            exports = self.parser.extract_exports(large_content, Path("large.ts"))
            functions = self.parser.extract_functions(large_content, Path("large.ts"))

            # Should find all items
            assert len(imports) == 1000
            assert len(exports) == 1000
            assert len(functions) == 1000

        except Exception as e:
            pytest.fail(f"Parser failed on large file: {e}")


class TestParserIntegration:
    """Integration tests for parser with real file scenarios."""

    def test_with_simple_project(self, simple_ts_project):
        """Test parser integration with a simple TypeScript project."""
        results = run_checker('parser', simple_ts_project / 'src' / 'index.ts')

        assert 'imports' in results
        assert 'exports' in results
        assert 'symbols' in results
        assert 'functions' in results

    def test_with_complex_imports_project(self, complex_imports_project):
        """Test parser integration with complex import patterns."""
        results = run_checker('parser', complex_imports_project / 'src' / 'index.ts')

        imports = results['imports']
        exports = results['exports']

        # Should find various import types
        import_types = {imp.import_type for imp in imports}
        assert 'default' in import_types
        assert 'named' in import_types
        assert 'namespace' in import_types

    def test_cross_file_parsing(self):
        """Test parsing multiple files in a project."""
        files = {
            "src/index.ts": """
import { helper } from './utils';
import type { User } from './types';

export function main() {
    return helper('test');
}
            """.strip(),
            "src/utils.ts": """
export function helper(input: string): string {
    return input.toUpperCase();
}

export const CONFIG = { debug: true };
            """.strip(),
            "src/types.ts": """
export interface User {
    name: string;
    email: string;
}

export type Status = 'active' | 'inactive';
            """.strip()
        }

        with create_test_project(files) as project_path:
            parser = TypeScriptParser()

            # Parse all files
            for file_path in project_path.rglob("*.ts"):
                content = file_path.read_text()

                imports = parser.extract_imports(content, file_path)
                exports = parser.extract_exports(content, file_path)
                functions = parser.extract_functions(content, file_path)
                symbols = parser.extract_symbols(content, file_path)

                # All parsing should succeed
                assert isinstance(imports, list)
                assert isinstance(exports, list)
                assert isinstance(functions, list)
                assert isinstance(symbols, list)