#!/usr/bin/env python3
"""
Architecture Boundary Check - Backward Compatibility Wrapper

This script maintains backward compatibility while using the new modular architecture.
For new development, use scripts/checks/architecture/main.py directly.

Usage:
    python3 scripts/check-architecture.py [path]
    pnpm check:architecture [path]
"""

import sys
import os

# Add the checks directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'checks'))

from architecture.main import main

if __name__ == "__main__":
    main()