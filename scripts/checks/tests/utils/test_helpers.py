"""
Test helper utilities for TypeScript checker tests.

Provides utilities for creating test projects, running checkers,
and asserting test results consistently across all test suites.
"""

import os
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Union, Any
from contextlib import contextmanager

# Import checker modules
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from architecture.checker import ArchitectureChecker
from deadcode.checker import DeadCodeChecker
from ruleof6.checker import RuleOf6Checker
from shared.typescript_parser import TypeScriptParser


@contextmanager
def create_test_project(files: Dict[str, str], base_name: str = "test_project"):
    """
    Create a temporary test project with the given files.

    Args:
        files: Dictionary mapping file paths to file contents
        base_name: Name for the temporary directory

    Yields:
        Path: Path to the temporary project directory

    Example:
        with create_test_project({
            "src/index.ts": "export const foo = 'bar';",
            "src/utils.ts": "export function helper() {}"
        }) as project_path:
            # Run tests on project_path
            pass
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


def create_temp_files(files: Dict[str, str], temp_dir: Optional[Path] = None) -> Path:
    """
    Create temporary files without automatic cleanup.
    Use this when you need to inspect files after test completion.

    Args:
        files: Dictionary mapping file paths to file contents
        temp_dir: Optional existing directory to use

    Returns:
        Path: Path to the directory containing the files
    """
    if temp_dir is None:
        temp_dir = Path(tempfile.mkdtemp(prefix="test_files_"))

    for file_path, content in files.items():
        full_path = temp_dir / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding='utf-8')

    return temp_dir


def run_checker(checker_type: str, path: Union[str, Path], **kwargs) -> Any:
    """
    Run a specific checker on the given path.

    Args:
        checker_type: Type of checker ('architecture', 'deadcode', 'ruleof6', 'parser')
        path: Path to check
        **kwargs: Additional arguments to pass to the checker

    Returns:
        Check results from the specified checker

    Raises:
        ValueError: If checker_type is not recognized
    """
    path = Path(path)

    if checker_type == 'architecture':
        checker = ArchitectureChecker(str(path))
        return checker.run_all_checks()
    elif checker_type == 'deadcode':
        checker = DeadCodeChecker(str(path))
        return checker.check()
    elif checker_type == 'ruleof6':
        checker = RuleOf6Checker(str(path))
        return checker.check()
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
        # Dead code results have issues list
        flagged_files = {issue.file_path for issue in results.issues}
    elif checker_type == 'ruleof6':
        # Rule of 6 results have violations list
        flagged_files = {violation.file_path for violation in results.violations}
    else:
        raise ValueError(f"Unknown checker type for assertion: {checker_type}")

    for expected_file in expected_clean:
        expected_path = Path(expected_file)
        assert expected_path not in flagged_files, f"File {expected_file} was flagged but should be clean"


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
    # This could be expanded to load from YAML/JSON fixture definitions
    # For now, return common test patterns

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
        found_issues = [f"{issue.symbol_name} in {issue.file_path}" for issue in results.issues]
    elif checker_type == 'ruleof6':
        found_issues = [violation.message for violation in results.violations]
    else:
        raise ValueError(f"Unknown checker type for assertion: {checker_type}")

    for expected in expected_issues:
        assert any(expected in found for found in found_issues), \
            f"Expected issue '{expected}' not found in: {found_issues}"