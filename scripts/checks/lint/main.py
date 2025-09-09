#!/usr/bin/env python3
"""
Main entry point for ESLint checking with structured output.

Usage:
    python3 scripts/checks/lint/main.py [options] [path]
    pnpm check:lint [options] [path]

Options:
    --verbose       Show detailed file-by-file breakdown
    --json-only     Output only JSON, no console output
    --by-rule       Group console output by rule instead of by file
    --errors-only   Show only errors, not warnings
    --rule RULE     Filter results to show only issues from specific rule
    --help, -h      Show this help message

Examples:
    # Check all source files
    python3 scripts/checks/lint/main.py
    
    # Check specific directory with verbose output
    python3 scripts/checks/lint/main.py --verbose src/app/map
    
    # Show only errors
    python3 scripts/checks/lint/main.py --errors-only
    
    # Group results by rule
    python3 scripts/checks/lint/main.py --by-rule
    
    # Filter to specific rule
    python3 scripts/checks/lint/main.py --rule no-restricted-imports
    
    # JSON output only (for CI/CD)
    python3 scripts/checks/lint/main.py --json-only
"""

import argparse
import sys
from pathlib import Path

# Add the current directory to Python path for relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from runner import ESLintRunner
from parser import ESLintParser
from reporter import LintReporter


def create_argument_parser() -> argparse.ArgumentParser:
    """Create and configure the argument parser."""
    parser = argparse.ArgumentParser(
        description="Run ESLint with structured output analysis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                # Check all source files
  %(prog)s --verbose src/app/map         # Check specific directory
  %(prog)s --errors-only                 # Show only errors
  %(prog)s --by-rule                     # Group by rule
  %(prog)s --rule no-restricted-imports  # Filter specific rule
  %(prog)s --json-only                   # JSON output only
        """
    )
    
    parser.add_argument(
        'path',
        nargs='?',
        default='src',
        help='Path to lint (default: src)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed file-by-file breakdown'
    )
    
    parser.add_argument(
        '--json-only',
        action='store_true',
        help='Output only JSON, no console output'
    )
    
    parser.add_argument(
        '--by-rule',
        action='store_true',
        help='Group console output by rule instead of by file'
    )
    
    parser.add_argument(
        '--errors-only',
        action='store_true',
        help='Show only errors, not warnings'
    )
    
    parser.add_argument(
        '--rule',
        metavar='RULE_ID',
        help='Filter results to show only issues from specific rule'
    )
    
    parser.add_argument(
        '--output',
        metavar='FILE',
        default='test-results/lint-check.json',
        help='JSON output file path (default: test-results/lint-check.json)'
    )
    
    return parser


def main():
    """Main entry point for ESLint checking."""
    parser = create_argument_parser()
    args = parser.parse_args()
    
    # Handle help
    if len(sys.argv) == 1:
        # No arguments, run with defaults
        pass
    
    # Initialize components
    project_root = Path(__file__).parent.parent.parent.parent
    runner = ESLintRunner(project_root)
    eslint_parser = ESLintParser(project_root)
    reporter = LintReporter(args.output)
    
    # Check ESLint availability
    available, message = runner.check_eslint_available()
    if not available:
        if not args.json_only:
            reporter.display_execution_error(message)
        sys.exit(1)
    
    # Run ESLint
    success, eslint_data, error_message = runner.run_with_json_output(args.path)
    
    if not success:
        if not args.json_only:
            reporter.display_execution_error(error_message)
        sys.exit(1)
    
    # Parse results
    results = eslint_parser.parse_json_output(eslint_data)
    eslint_parser.post_process_results(results)
    
    # Apply filters if specified
    if args.errors_only or args.rule:
        results = eslint_parser.filter_results(
            results,
            errors_only=args.errors_only,
            rule_filter=args.rule
        )
    
    # Report results
    if results.has_issues():
        success = reporter.report_results(
            results,
            verbose=args.verbose,
            json_only=args.json_only,
            by_rule=args.by_rule
        )
    else:
        # No issues found
        if not args.json_only:
            reporter.display_no_issues_message()
        
        # Still write JSON report for consistency
        reporter._write_json_report(results)
        success = True
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()