#!/usr/bin/env python3
"""
Main entry point for dead code checking.

Usage:
    python3 scripts/checks/deadcode/main.py [path]
    pnpm check:dead-code [path]
"""

import sys

from .checker import DeadCodeChecker
from .reporter import DeadCodeReporter


def main():
    """Main entry point for dead code checking."""
    # Handle help flag
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h', 'help']:
        from pathlib import Path
        readme_path = Path(__file__).parent / "README.md"
        if readme_path.exists():
            with open(readme_path, 'r') as f:
                print(f.read())
        else:
            print(__doc__)
        sys.exit(0)
    
    target_path = sys.argv[1] if len(sys.argv) > 1 else "src"
    
    print(f"🕵️  Checking for dead code in {target_path}...")
    
    # Run checks
    checker = DeadCodeChecker(target_path)
    results = checker.run_all_checks()
    
    print(f"⏱️  Completed in {results.execution_time:.2f} seconds")
    
    # Report results
    reporter = DeadCodeReporter()
    success = reporter.report_results(results)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()