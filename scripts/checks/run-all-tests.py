#!/usr/bin/env python3
"""
Comprehensive test runner for all TypeScript checker tests.

Runs tests across all checkers and provides detailed reporting
with coverage information and performance metrics.
"""

import sys
import os
import time
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple


def run_command(cmd: List[str], cwd: Path = None) -> Tuple[int, str, str]:
    """Run a command and return exit code, stdout, stderr."""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=cwd or Path.cwd()
    )
    return result.returncode, result.stdout, result.stderr


def run_checker_tests(checker: str, verbose: bool = False) -> Dict[str, any]:
    """Run tests for a specific checker and return results."""
    print(f"\n🔍 Testing {checker} checker...")
    start_time = time.time()

    if checker == 'shared':
        # Run shared parser tests
        test_file = 'tests/test_shared_parser.py'
    elif checker == 'regression':
        # Run regression tests
        test_file = 'tests/test_regression.py'
    else:
        # Run checker-specific tests
        test_file = f'{checker}/tests/'

    # Try pytest first, fall back to direct execution
    try:
        cmd = ['python3', '-m', 'pytest', test_file, '-v' if verbose else '-q']
        exit_code, stdout, stderr = run_command(cmd)
    except FileNotFoundError:
        # Pytest not available, try direct test execution
        if checker == 'shared':
            cmd = ['python3', 'tests/test_shared_parser.py']
        elif checker == 'ruleof6':
            cmd = ['python3', 'ruleof6/tests/test_typescript_parsing.py']
        else:
            print(f"  ❌ No test runner available for {checker}")
            return {
                'checker': checker,
                'success': False,
                'duration': 0,
                'error': 'No test runner available'
            }

        exit_code, stdout, stderr = run_command(cmd)

    duration = time.time() - start_time

    if exit_code == 0:
        print(f"  ✅ {checker} tests passed ({duration:.2f}s)")
        success = True
        error = None
    else:
        print(f"  ❌ {checker} tests failed ({duration:.2f}s)")
        success = False
        error = stderr or stdout

    return {
        'checker': checker,
        'success': success,
        'duration': duration,
        'error': error,
        'output': stdout
    }


def run_quick_validation():
    """Run a quick validation of each checker."""
    print("\n🚀 Quick validation of each checker...")

    checkers_to_test = [
        ('shared', 'TypeScript parser'),
        ('architecture', 'Architecture boundaries'),
        ('deadcode', 'Dead code detection'),
        ('ruleof6', 'Rule of 6 complexity')
    ]

    for checker, description in checkers_to_test:
        print(f"\n📋 Testing {description}...")

        # Test basic functionality by running checker on a simple file
        if checker == 'shared':
            # Test parser directly
            test_code = '''
import sys
sys.path.insert(0, ".")
from shared.typescript_parser import TypeScriptParser
from pathlib import Path

parser = TypeScriptParser()
content = "import { test } from './test'; export function test() {}"
imports = parser.extract_imports(content, Path("test.ts"))
exports = parser.extract_exports(content, Path("test.ts"))
print(f"✓ Found {len(imports)} imports and {len(exports)} exports")
            '''
        else:
            # Test checker on empty directory
            test_code = f'''
import sys
sys.path.insert(0, ".")
from {checker}.checker import {checker.title()}Checker
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory() as temp_dir:
    checker = {checker.title()}Checker(temp_dir)
    results = checker.check() if hasattr(checker, 'check') else checker.run_all_checks()
    print(f"✓ {checker} checker completed successfully")
            '''

        try:
            exit_code, stdout, stderr = run_command(['python3', '-c', test_code])
            if exit_code == 0:
                print(f"  ✅ {description} - OK")
                if stdout.strip():
                    print(f"    {stdout.strip()}")
            else:
                print(f"  ❌ {description} - Failed")
                if stderr:
                    print(f"    Error: {stderr.strip()}")
        except Exception as e:
            print(f"  ⚠️  {description} - Error: {e}")


def check_dependencies():
    """Check if required dependencies are available."""
    print("🔧 Checking dependencies...")

    # Check Python version
    if sys.version_info < (3, 8):
        print("  ⚠️  Python 3.8+ recommended")
    else:
        print(f"  ✅ Python {sys.version_info.major}.{sys.version_info.minor}")

    # Check for pytest
    try:
        exit_code, _, _ = run_command(['python3', '-m', 'pytest', '--version'])
        if exit_code == 0:
            print("  ✅ pytest available")
        else:
            print("  ⚠️  pytest not available (will use fallback test runners)")
    except FileNotFoundError:
        print("  ⚠️  pytest not available (will use fallback test runners)")

    # Check if we're in the right directory
    current_dir = Path.cwd()
    if not (current_dir / 'shared' / 'typescript_parser.py').exists():
        print(f"  ⚠️  Run from scripts/checks directory, currently in: {current_dir}")
        return False

    print("  ✅ Ready to run tests")
    return True


def main():
    """Main test runner."""
    print("🧪 TypeScript Checker Test Suite")
    print("=" * 50)

    # Check dependencies first
    if not check_dependencies():
        sys.exit(1)

    # Parse arguments
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    quick_only = '--quick' in sys.argv
    coverage = '--coverage' in sys.argv

    if quick_only:
        run_quick_validation()
        return

    # Run comprehensive tests
    checkers = ['shared', 'regression', 'architecture', 'deadcode', 'ruleof6']
    results = []

    total_start = time.time()

    for checker in checkers:
        result = run_checker_tests(checker, verbose)
        results.append(result)

    total_duration = time.time() - total_start

    # Print summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)

    passed = 0
    failed = 0

    for result in results:
        if result['success']:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ FAIL"
            failed += 1

        print(f"{status} {result['checker']:12} ({result['duration']:.2f}s)")

        if not result['success'] and result['error']:
            # Show first few lines of error
            error_lines = result['error'].split('\n')[:3]
            for line in error_lines:
                if line.strip():
                    print(f"     {line}")

    print(f"\nResults: {passed} passed, {failed} failed")
    print(f"Total time: {total_duration:.2f}s")

    if failed > 0:
        print("\n❌ Some tests failed. Run with --verbose for details.")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")

    # Optionally run quick validation
    if not quick_only:
        run_quick_validation()


if __name__ == '__main__':
    main()