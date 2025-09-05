#!/usr/bin/env python3
"""
Main entry point for architecture checking.

Usage:
    python3 scripts/checks/architecture/main.py [path]
    pnpm check:architecture [path]
"""

import sys

from .checker import ArchitectureChecker
from .reporter import ArchitectureReporter


def main():
    """Main entry point for architecture checking."""
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
    
    # Run checks
    checker = ArchitectureChecker(target_path)
    results = checker.run_all_checks()
    
    # Report results
    reporter = ArchitectureReporter()
    success = reporter.report_results(results)
    
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()