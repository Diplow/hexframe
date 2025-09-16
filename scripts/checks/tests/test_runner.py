#!/usr/bin/env python3
"""
Test runner for TypeScript checker test suite.

Provides utilities to run tests with different configurations
and generate detailed reports.
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path
from typing import List, Optional


def run_tests(
    test_path: Optional[str] = None,
    verbose: bool = False,
    coverage: bool = False,
    pattern: Optional[str] = None
) -> int:
    """
    Run the test suite with the specified options.

    Args:
        test_path: Specific test file or directory to run
        verbose: Enable verbose output
        coverage: Generate coverage report
        pattern: Pattern to match test names

    Returns:
        Exit code (0 for success, non-zero for failure)
    """
    # Base pytest command
    cmd = ['python', '-m', 'pytest']

    # Add path if specified
    if test_path:
        cmd.append(test_path)
    else:
        # Run all tests in the tests directory
        cmd.append(str(Path(__file__).parent))

    # Add verbosity
    if verbose:
        cmd.append('-v')

    # Add pattern matching
    if pattern:
        cmd.extend(['-k', pattern])

    # Add coverage if requested
    if coverage:
        cmd.extend([
            '--cov=architecture',
            '--cov=deadcode',
            '--cov=ruleof6',
            '--cov=shared',
            '--cov-report=term-missing',
            '--cov-report=html:htmlcov'
        ])

    # Add other useful options
    cmd.extend([
        '--tb=short',  # Shorter traceback format
        '--strict-markers',  # Strict marker validation
        '--disable-warnings',  # Reduce noise from warnings
    ])

    print(f"Running: {' '.join(cmd)}")
    return subprocess.call(cmd)


def run_specific_checker_tests(checker: str, verbose: bool = False) -> int:
    """
    Run tests for a specific checker.

    Args:
        checker: Name of the checker ('architecture', 'deadcode', 'ruleof6', 'shared')
        verbose: Enable verbose output

    Returns:
        Exit code
    """
    if checker == 'shared':
        test_path = 'test_shared_parser.py'
    else:
        test_path = f'{checker}/tests/'

    return run_tests(test_path=test_path, verbose=verbose)


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(description='Run TypeScript checker tests')
    parser.add_argument('test_path', nargs='?', help='Specific test file or directory')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('-c', '--coverage', action='store_true', help='Generate coverage report')
    parser.add_argument('-k', '--pattern', help='Pattern to match test names')
    parser.add_argument('--checker', choices=['architecture', 'deadcode', 'ruleof6', 'shared'],
                      help='Run tests for specific checker only')

    args = parser.parse_args()

    # Change to the tests directory
    os.chdir(Path(__file__).parent)

    if args.checker:
        exit_code = run_specific_checker_tests(args.checker, args.verbose)
    else:
        exit_code = run_tests(args.test_path, args.verbose, args.coverage, args.pattern)

    sys.exit(exit_code)


if __name__ == '__main__':
    main()