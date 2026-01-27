"""CLI entry point for the subsystem tree dump utility."""

import argparse
import sys
from pathlib import Path

from discovery import build_tree
from renderer import render_ascii, render_json


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Dump the subsystem hierarchy as ASCII tree or JSON."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="src",
        help="Root path to scan for subsystems (default: src)",
    )
    parser.add_argument(
        "--format",
        choices=["ascii", "json"],
        default="ascii",
        help="Output format (default: ascii)",
    )
    return parser.parse_args()


def main() -> None:
    """Discover subsystems and render the tree."""
    args = parse_args()
    target_path = Path(args.path)

    if not target_path.exists():
        print(f"Error: path '{target_path}' does not exist", file=sys.stderr)
        sys.exit(1)

    root = build_tree(target_path)
    if root is None:
        print(f"No subsystems found under '{target_path}'", file=sys.stderr)
        sys.exit(1)

    if args.format == "json":
        print(render_json(root))
    else:
        print(render_ascii(root))


if __name__ == "__main__":
    main()
