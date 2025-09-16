#!/usr/bin/env python3
"""
Command-line interface for Rule of 6 checking.

Entry point for the Rule of 6 checker with enhanced reporting and AI integration.
"""

import sys
import argparse
from pathlib import Path

# Add the parent directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from checker import RuleOf6Checker
from reporter import RuleOf6Reporter


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser for Rule of 6 checker."""
    parser = argparse.ArgumentParser(
        description="Rule of 6 Enforcement - Validates adherence to the Rule of 6 architecture principle",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scripts/checks/ruleof6/cli.py                    # Check src/ directory
  python3 scripts/checks/ruleof6/cli.py src/app           # Check specific directory
  pnpm check:ruleof6                                      # Via package.json script
  pnpm check:ruleof6 src/components                       # Check specific path

Rule of 6 Principles:
  • Max 6 domain folders + 6 domain files per directory (generic infrastructure excluded)
  • Max 6 functions per file
  • Max 50 lines per function (warning), 100+ lines (error)
  • Max 3 arguments per function (or 1 object with max 6 keys)
  
Excluded from count (generic infrastructure):
  • Generic folders: docs/, types/, utils/, components/, hooks/, __tests__/, etc.
  • Generic files: README.md, index.ts, page.tsx, *.config.*, *.test.*, etc.

IMPORTANT: Avoid creating meaningless abstractions to satisfy the rules.
Focus on logical groupings, clear responsibilities, and semantic meaning.
        """
    )
    
    parser.add_argument(
        "path",
        nargs="?",
        default="src",
        help="Path to check for Rule of 6 violations (default: src)"
    )
    
    parser.add_argument(
        "--output",
        "-o",
        default="test-results/rule-of-6-check.json",
        help="Output file for detailed JSON report (default: test-results/rule-of-6-check.json)"
    )
    
    parser.add_argument(
        "--ai-summary",
        action="store_true",
        help="Generate AI-friendly summary for automated processing"
    )
    
    parser.add_argument(
        "--quiet",
        "-q",
        action="store_true",
        help="Reduce output verbosity"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="Rule of 6 Checker v2.0.0"
    )
    
    return parser


def main():
    """Main entry point for Rule of 6 checking."""
    parser = create_parser()
    args = parser.parse_args()
    
    # Validate target path
    target_path = Path(args.path)
    if not target_path.exists():
        print(f"❌ Error: Path '{target_path}' does not exist", file=sys.stderr)
        sys.exit(1)
    
    # Initialize checker and reporter
    checker = RuleOf6Checker(str(target_path))
    reporter = RuleOf6Reporter(args.output)
    
    try:
        # Run all checks
        results = checker.run_all_checks()
        
        # Report results
        if args.ai_summary:
            # Generate AI-friendly summary
            summary = reporter.generate_ai_friendly_summary(results)
            print(summary)
        elif not args.quiet:
            # Full console report
            success = reporter.report_results(results)
        else:
            # Quiet mode - minimal output
            success = reporter.report_results(results)
            if results.has_errors():
                print(f"❌ Rule of 6 violations found: {len(results.errors)} errors, {len(results.warnings)} warnings")
                print(f"📄 Details: {reporter.output_file}")
            else:
                print("✅ Rule of 6 checks passed!")
        
        # Exit with appropriate code
        sys.exit(0 if not results.has_errors() else 1)
        
    except KeyboardInterrupt:
        print("\n⏹️  Rule of 6 check interrupted", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"❌ Unexpected error during Rule of 6 check: {e}", file=sys.stderr)
        sys.exit(1)


def print_philosophy():
    """Print the Rule of 6 philosophy for educational purposes."""
    philosophy = """
📏 The Rule of 6 Philosophy

The Rule of 6 is not about arbitrary limits - it's about cognitive load management
and creating systems that humans can understand and maintain effectively.

Why 6?
• Human working memory can effectively handle 5±2 items
• 6 items allow for meaningful groupings without overwhelming complexity
• Forces intentional design decisions rather than accidental complexity

What it promotes:
✅ Clear hierarchical organization
✅ Single level of abstraction per construct
✅ Meaningful groupings and responsibilities
✅ Readable and maintainable code

What it prevents:
❌ Accidental complexity accumulation
❌ Deeply nested directory structures
❌ God functions and classes
❌ Parameter explosion

CRITICAL: Meaningful Abstraction vs. Arbitrary Splitting

❌ BAD: Creating empty wrapper functions just to reduce line count
❌ BAD: Splitting coherent logic across multiple files artificially
❌ BAD: Creating unnecessary intermediate directories

✅ GOOD: Identifying natural conceptual boundaries
✅ GOOD: Grouping related functionality together
✅ GOOD: Creating abstractions that represent domain concepts

Remember: The goal is better design, not just smaller numbers.
    """
    print(philosophy)


if __name__ == "__main__":
    main()