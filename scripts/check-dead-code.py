#!/usr/bin/env python3
"""
Dead Code Detection Script - Backward Compatibility Wrapper

This script maintains backward compatibility while using the new modular architecture.
For new development, use scripts/checks/deadcode/main.py directly.

Usage:
    python3 scripts/check-dead-code.py [path]
    pnpm check:dead-code [path]
"""

import sys
import os

# Add the checks directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'checks'))

from deadcode.main import main

if __name__ == "__main__":
    main()