#!/usr/bin/env python3
"""
Main entry point for architecture checking.

Usage:
    python3 scripts/checks/architecture/main.py [path]
    pnpm check:architecture [path]
"""

import sys
import argparse

from .checker import ArchitectureChecker
from .reporter import ArchitectureReporter


def main():
    """Main entry point for architecture checking."""
    parser = argparse.ArgumentParser(description="Check architecture boundaries and complexity requirements")
    parser.add_argument('target_path', nargs='?', default='src', help='Target directory to check (default: src)')
    parser.add_argument('--show-errors', action='store_true', help='Show detailed error output')
    parser.add_argument('--format', choices=['console', 'json'], default='console', help='Output format')
    parser.add_argument('--include-warnings', action='store_true', help='Include warnings in output (default: errors only)')
    
    # Handle legacy flags
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h', 'help']:
        parser.print_help()
        sys.exit(0)
    
    args = parser.parse_args()
    
    # Run checks
    checker = ArchitectureChecker(args.target_path)
    results = checker.run_all_checks()
    
    # Filter out warnings if not requested
    if not args.include_warnings:
        results.warnings = []
    
    # Report results
    reporter = ArchitectureReporter()
    success = reporter.report_results(results, show_errors=args.show_errors, format_type=args.format)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()