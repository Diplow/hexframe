"""
Fixed test helper utilities that work with the actual checker APIs.

Provides utilities for creating test projects, running checkers,
and asserting test results consistently across all test suites.
"""

import os
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Union, Any
from contextlib import contextmanager

# Import checker modules with proper path handling
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from architecture.checker import ArchitectureChecker
from deadcode.checker import DeadCodeChecker
from shared.typescript_parser import TypeScriptParser


def import_ruleof6_checker():
    """Import RuleOf6Checker with proper path handling."""
    original_cwd = os.getcwd()
    try:
        # Change to ruleof6 directory for relative imports
        ruleof6_path = os.path.join(os.path.dirname(__file__), '../..', 'ruleof6')
        os.chdir(ruleof6_path)
        sys.path.insert(0, '.')

        from checker import RuleOf6Checker
        return RuleOf6Checker
    finally:
        os.chdir(original_cwd)


@contextmanager
def create_test_project(files: Dict[str, str], base_name: str = "test_project"):
    """
    Create a temporary test project with the given files.

    Args:
        files: Dictionary mapping file paths to file contents
        base_name: Name for the temporary directory

    Yields:
        Path: Path to the temporary project directory
    """
    temp_dir = tempfile.mkdtemp(prefix=f"{base_name}_")
    project_path = Path(temp_dir)

    try:
        # Create all files and their directories
        for file_path, content in files.items():
            full_path = project_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding='utf-8')

        yield project_path

    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)


def run_checker(checker_type: str, path: Union[str, Path], **kwargs) -> Any:
    """
    Run a specific checker on the given path.

    Args:
        checker_type: Type of checker ('architecture', 'deadcode', 'ruleof6', 'parser')
        path: Path to check
        **kwargs: Additional arguments to pass to the checker

    Returns:
        Check results from the specified checker
    """
    path = Path(path)

    if checker_type == 'architecture':
        checker = ArchitectureChecker(str(path))
        return checker.run_all_checks()

    elif checker_type == 'deadcode':
        checker = DeadCodeChecker(str(path))
        return checker.run_all_checks()

    elif checker_type == 'ruleof6':
        RuleOf6Checker = import_ruleof6_checker()
        checker = RuleOf6Checker(str(path))
        return checker.run_all_checks()

    elif checker_type == 'parser':
        parser = TypeScriptParser()
        if path.is_file():
            content = path.read_text(encoding='utf-8')
            return {
                'imports': parser.extract_imports(content, path),
                'exports': parser.extract_exports(content, path),
                'symbols': parser.extract_symbols(content, path),
                'functions': parser.extract_functions(content, path)
            }
        else:
            raise ValueError("Parser checker requires a file path, not directory")

    else:
        raise ValueError(f"Unknown checker type: {checker_type}")


def assert_no_false_positives(results: Any, expected_clean: List[str], checker_type: str):
    """
    Assert that the checker doesn't flag files that should be clean.

    Args:
        results: Results from a checker
        expected_clean: List of file paths that should not have issues
        checker_type: Type of checker for result interpretation
    """
    if checker_type == 'architecture':
        # Architecture results have errors list
        flagged_files = {error.file_path for error in results.errors}
    elif checker_type == 'deadcode':
        # Dead code results - get all issues
        all_issues = results.get_all_issues()
        flagged_files = {issue.file_path for issue in all_issues}
    elif checker_type == 'ruleof6':
        # Rule of 6 results - get all violations
        all_violations = results.get_all_violations()
        flagged_files = {violation.file_path for violation in all_violations}
    else:
        raise ValueError(f"Unknown checker type for assertion: {checker_type}")

    for expected_file in expected_clean:
        expected_path = Path(expected_file)
        assert expected_path not in flagged_files, f"File {expected_file} was flagged but should be clean"


def assert_checker_finds_issues(results: Any, expected_issues: List[str], checker_type: str):
    """
    Assert that the checker finds specific expected issues.

    Args:
        results: Results from a checker
        expected_issues: List of issue descriptions or patterns to find
        checker_type: Type of checker for result interpretation
    """
    if checker_type == 'architecture':
        found_issues = [error.message for error in results.errors]
    elif checker_type == 'deadcode':
        all_issues = results.get_all_issues()
        found_issues = [f"{issue.symbol_name} in {issue.file_path}" for issue in all_issues]
    elif checker_type == 'ruleof6':
        all_violations = results.get_all_violations()
        found_issues = [violation.message for violation in all_violations]
    else:
        raise ValueError(f"Unknown checker type for assertion: {checker_type}")

    for expected in expected_issues:
        assert any(expected in found for found in found_issues), \
            f"Expected issue '{expected}' not found in: {found_issues}"


def get_fixture_content(fixture_name: str, fixture_type: str = "basic") -> str:
    """
    Load content from a test fixture file.

    Args:
        fixture_name: Name of the fixture file (without extension)
        fixture_type: Type of fixture ('basic', 'edge_cases', 'real_world', 'regression')

    Returns:
        Content of the fixture file
    """
    fixture_path = Path(__file__).parent.parent / "fixtures" / fixture_type / f"{fixture_name}.ts"

    if not fixture_path.exists():
        # Try .tsx extension
        fixture_path = fixture_path.with_suffix('.tsx')

    if not fixture_path.exists():
        # Try .js extension
        fixture_path = fixture_path.with_suffix('.js')

    if not fixture_path.exists():
        raise FileNotFoundError(f"Fixture file not found: {fixture_name} in {fixture_type}")

    return fixture_path.read_text(encoding='utf-8')


def create_fixture_project(fixture_name: str) -> Dict[str, str]:
    """
    Create a project structure from a fixture definition.

    Args:
        fixture_name: Name of the fixture project definition

    Returns:
        Dictionary mapping file paths to contents
    """
    if fixture_name == "simple_project":
        return {
            "src/index.ts": """
export const VERSION = '1.0.0';
export function main() {
    console.log('Hello, world!');
}
            """.strip(),
            "src/utils.ts": """
export function helper(input: string): string {
    return input.toUpperCase();
}

export function unused() {
    return 'this function is never used';
}
            """.strip(),
            "src/types.ts": """
export interface User {
    name: string;
    email: string;
}

export type Status = 'active' | 'inactive';
            """.strip()
        }

    elif fixture_name == "complex_imports":
        return {
            "src/index.ts": """
import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import type { User, Status } from './types';
import * as utils from './utils';
import { helper as helperFunction } from './utils';

export default function App() {
    const [users, setUsers] = useState<User[]>([]);
    return <div>App</div>;
}
            """.strip(),
            "src/types.ts": """
export interface User {
    name: string;
    email: string;
}

export type Status = 'active' | 'inactive';
            """.strip(),
            "src/utils.ts": """
export function helper(input: string): string {
    return input.toUpperCase();
}

export const config = {
    apiUrl: 'https://api.example.com'
};
            """.strip()
        }

    else:
        raise ValueError(f"Unknown fixture project: {fixture_name}")


def test_all_checkers_basic():
    """Run a basic test of all checkers to verify they work."""
    print("🧪 Testing all checkers with basic functionality...")

    results = {}

    # Test shared parser
    try:
        parser = TypeScriptParser()
        content = "import { test } from './test'; export function test() {}"
        imports = parser.extract_imports(content, Path("test.ts"))
        exports = parser.extract_exports(content, Path("test.ts"))
        results['parser'] = f"✅ Found {len(imports)} imports, {len(exports)} exports"
    except Exception as e:
        results['parser'] = f"❌ Error: {e}"

    # Test other checkers with temporary projects
    files = {
        "src/test.ts": "export function test() { return 'test'; }",
        "src/utils.ts": "export function helper() { return 'help'; }"
    }

    with create_test_project(files) as project_path:
        # Test architecture checker
        try:
            arch_results = run_checker('architecture', project_path / 'src')
            results['architecture'] = f"✅ {len(arch_results.errors)} errors, {len(arch_results.warnings)} warnings"
        except Exception as e:
            results['architecture'] = f"❌ Error: {e}"

        # Test deadcode checker
        try:
            dead_results = run_checker('deadcode', project_path / 'src')
            all_issues = dead_results.get_all_issues()
            results['deadcode'] = f"✅ {len(all_issues)} issues found"
        except Exception as e:
            results['deadcode'] = f"❌ Error: {e}"

        # Test ruleof6 checker
        try:
            rule_results = run_checker('ruleof6', project_path / 'src')
            all_violations = rule_results.get_all_violations()
            results['ruleof6'] = f"✅ {len(all_violations)} violations found"
        except Exception as e:
            results['ruleof6'] = f"❌ Error: {e}"

    # Print results
    for checker, result in results.items():
        print(f"  {checker}: {result}")

    return all("✅" in result for result in results.values())