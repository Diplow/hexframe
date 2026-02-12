"""Thin entry point for subsystem-tree invocation from package.json."""

import sys
from pathlib import Path

# Strip leading '--' that pnpm passes when using `pnpm subsystem-tree -- args`
if len(sys.argv) > 1 and sys.argv[1] == "--":
    sys.argv = [sys.argv[0]] + sys.argv[2:]

# Add this directory to sys.path so `architecture` package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from architecture.tree.main import main

if __name__ == "__main__":
    main()
