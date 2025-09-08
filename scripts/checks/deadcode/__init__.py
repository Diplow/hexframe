"""
Dead code checking module.

Provides tools for detecting unused exports, imports, and symbols in TypeScript/JavaScript codebases.
"""

from .checker import DeadCodeChecker
from .reporter import DeadCodeReporter
from .models import CheckResults, DeadCodeIssue, DeadCodeType, Severity

__all__ = [
    "DeadCodeChecker",
    "DeadCodeReporter", 
    "CheckResults",
    "DeadCodeIssue",
    "DeadCodeType",
    "Severity"
]